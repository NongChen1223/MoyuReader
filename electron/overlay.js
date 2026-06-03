const overlayElement = document.getElementById('app')
const contentElement = document.getElementById('content')
const chapterToggleButton = document.getElementById('chapter-toggle-button')
const chapterPanel = document.getElementById('chapter-panel')
const chapterList = document.getElementById('chapter-list')
const prevButton = document.getElementById('prev-button')
const nextButton = document.getElementById('next-button')
const closeButton = document.getElementById('close-button')
const camouflageButton = document.getElementById('camouflage-button')
const appearanceButton = document.getElementById('appearance-button')
const appearancePanel = document.getElementById('appearance-panel')
const appearanceCloseButton = document.getElementById('appearance-close-button')
const fontSizeInput = document.getElementById('font-size-input')
const fontWeightInput = document.getElementById('font-weight-input')
const lineHeightInput = document.getElementById('line-height-input')
const textColorInput = document.getElementById('text-color-input')
const fontSizeLabel = document.getElementById('font-size-label')
const fontWeightLabel = document.getElementById('font-weight-label')
const lineHeightLabel = document.getElementById('line-height-label')
const opacityInput = document.getElementById('opacity-input')
const progressInput = document.getElementById('progress-input')
const progressLabel = document.getElementById('progress-label')
const resizeHandle = document.getElementById('resize-handle')
const resizeEdges = Array.from(document.querySelectorAll('[data-resize-direction]'))

const state = {
  currentChapter: 0,
  chapters: [],
  progress: 0,
  opacity: 0.3,
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.8,
  textColor: '#f4f7fc',
  theme: 'dark',
  camouflageEnabled: false,
  isProgrammaticScroll: false,
  readingLocationFrame: 0,
  chromeVisible: false,
  chromeTimer: 0,
  boundaryCooldownUntil: 0,
  chapterPanelOpen: false,
  appearancePanelOpen: false,
  dragSession: null,
  isDragging: false,
  resizeSession: null,
  isResizing: false,
  isDraggingProgress: false,
  isDraggingOpacity: false,
  lastContentHtml: '',
  lastOpacityInputAt: 0,
  lastUserScrollAt: 0,
  userControlsPosition: false,
}

const CHROME_HIDE_DELAY_MS = 2200
const BOUNDARY_SWITCH_COOLDOWN_MS = 420
const DRAG_THRESHOLD_PX = 3
const TOP_REVEAL_HEIGHT = 92
const BOTTOM_REVEAL_HEIGHT = 78
const SCROLLBAR_HIT_WIDTH = 16
const MIN_OVERLAY_WIDTH = 520
const MIN_OVERLAY_HEIGHT = 220
const EDGE_RESIZE_WIDTH = 18
const USER_SCROLL_POSITION_GUARD_MS = 1000
const OPACITY_INPUT_GUARD_MS = 900

function emitAction(action) {
  window.moyuOverlay?.emitAction(action)
}

function releaseExternalPositionGuard() {
  state.userControlsPosition = false
}

function lockExternalPositionGuard() {
  state.userControlsPosition = true
  state.lastUserScrollAt = Date.now()
}

function clampUnitInterval(value) {
  return Math.max(0, Math.min(1, Number(value || 0)))
}

function setChromeVisible(visible) {
  state.chromeVisible = visible
  overlayElement.classList.toggle('chrome-visible', visible)
}

function clearChromeTimer() {
  if (!state.chromeTimer) {
    return
  }

  window.clearTimeout(state.chromeTimer)
  state.chromeTimer = 0
}

function scheduleChromeHide(delay = CHROME_HIDE_DELAY_MS) {
  clearChromeTimer()
  state.chromeTimer = window.setTimeout(() => {
    state.chromeTimer = 0
    if (state.chapterPanelOpen || state.appearancePanelOpen || state.isDragging || state.isResizing) {
      return
    }

    setChromeVisible(false)
  }, delay)
}

function bumpChromeVisibility() {
  setChromeVisible(true)
  scheduleChromeHide()
}

function updateChromeByPointer(event) {
  if (state.chapterPanelOpen || state.appearancePanelOpen || state.isDragging || state.isResizing) {
    setChromeVisible(true)
    clearChromeTimer()
    return
  }

  const rect = overlayElement.getBoundingClientRect()
  const localY = event.clientY - rect.top
  const inTopRegion = localY <= TOP_REVEAL_HEIGHT
  const inBottomRegion = localY >= rect.height - BOTTOM_REVEAL_HEIGHT

  setChromeVisible(inTopRegion || inBottomRegion)
  updateEdgeResizeCursor(event)
}

function setChapterPanelOpen(open) {
  state.chapterPanelOpen = open
  chapterPanel.hidden = !open
  chapterToggleButton.setAttribute('aria-expanded', open ? 'true' : 'false')
  if (open) {
    setAppearancePanelOpen(false)
    bumpChromeVisibility()
    scrollActiveChapterIntoView()
    return
  }

  scheduleChromeHide(480)
}

function setAppearancePanelOpen(open) {
  state.appearancePanelOpen = open
  appearancePanel.hidden = !open
  appearanceButton.classList.toggle('is-active', open)
  if (open) {
    setChapterPanelOpen(false)
    bumpChromeVisibility()
    return
  }

  scheduleChromeHide(480)
}

function renderChapterOptions(chapters, currentChapter) {
  chapterList.innerHTML = ''

  chapters.forEach((title, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `chapter-list-button${index === currentChapter ? ' is-active' : ''}`
    button.dataset.chapterIndex = String(index)
    button.role = 'option'
    button.setAttribute('aria-selected', index === currentChapter ? 'true' : 'false')
    button.textContent = title || `第 ${index + 1} 章`
    chapterList.appendChild(button)
  })

  updateChapterToggleLabel()
}

function updateChapterToggleLabel() {
  const currentTitle = state.chapters[state.currentChapter] || `第 ${state.currentChapter + 1} 章`
  chapterToggleButton.textContent = currentTitle
  chapterToggleButton.title = currentTitle
}

function scrollActiveChapterIntoView() {
  const activeElement = chapterList.querySelector('.chapter-list-button.is-active')
  activeElement?.scrollIntoView({ block: 'nearest' })
}

function syncContentOpacity(opacity) {
  document.documentElement.style.setProperty('--content-opacity', String(opacity))
}

function shouldIgnoreIncomingOpacity(opacity) {
  const nextOpacity = Number(opacity)
  if (!Number.isFinite(nextOpacity)) {
    return true
  }

  const isSameOpacity = Math.abs(nextOpacity - state.opacity) < 0.001
  if (isSameOpacity) {
    return false
  }

  return state.isDraggingOpacity || Date.now() - state.lastOpacityInputAt < OPACITY_INPUT_GUARD_MS
}

function applyOpacity(opacity, options = {}) {
  const nextOpacity = clampUnitInterval(opacity)
  if (options.fromRemote && shouldIgnoreIncomingOpacity(nextOpacity)) {
    return
  }

  state.opacity = nextOpacity
  opacityInput.value = String(nextOpacity)
  syncContentOpacity(nextOpacity)
}

function syncContentColor(color) {
  document.documentElement.style.setProperty('--content-color', color || 'rgba(244,247,252,0.98)')
}

function rgbToHex(red, green, blue) {
  return [red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Number(value || 0))).toString(16).padStart(2, '0'))
    .join('')
    .replace(/^/, '#')
}

function normalizeHexColor(value, fallback = '#f4f7fc') {
  const source = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(source)) {
    return source
  }

  return fallback
}

function applyAppearance(appearance = {}, options = {}) {
  const nextFontSize = Math.max(12, Math.min(32, Number(appearance.fontSize || state.fontSize)))
  const nextFontWeight = Math.max(
    300,
    Math.min(900, Number(appearance.fontWeight || state.fontWeight))
  )
  const nextLineHeight = Math.max(1, Math.min(3, Number(appearance.lineHeight || state.lineHeight)))
  const nextTextColor = normalizeHexColor(appearance.textColor, state.textColor)

  state.fontSize = nextFontSize
  state.fontWeight = nextFontWeight
  state.lineHeight = nextLineHeight
  state.textColor = nextTextColor

  contentElement.style.fontSize = `${nextFontSize}px`
  contentElement.style.fontWeight = String(nextFontWeight)
  contentElement.style.lineHeight = String(nextLineHeight)
  syncContentColor(nextTextColor)

  fontSizeInput.value = String(nextFontSize)
  fontWeightInput.value = String(nextFontWeight)
  lineHeightInput.value = String(nextLineHeight)
  textColorInput.value = nextTextColor
  fontSizeLabel.textContent = `字号 ${Math.round(nextFontSize)}px`
  fontWeightLabel.textContent = `字重 ${Math.round(nextFontWeight)}`
  lineHeightLabel.textContent = `行高 ${nextLineHeight.toFixed(1)}`

  if (options.emit) {
    emitAction({
      type: 'appearance',
      value: {
        fontSize: nextFontSize,
        fontWeight: nextFontWeight,
        lineHeight: nextLineHeight,
        textColor: nextTextColor,
      },
    })
  }
}

function updateProgressLabel(progress) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)))
  progressInput.value = String(safeProgress)
  progressLabel.textContent = `${Math.round(safeProgress)}%`
}

function getChapterSections() {
  return Array.from(contentElement.querySelectorAll('[data-overlay-chapter-index]'))
}

function resolveReadingLocation() {
  const sections = getChapterSections()
  if (sections.length === 0) {
    return { chapterIndex: state.currentChapter, progress: Number(progressInput.value || 0) / 100 }
  }

  const containerRect = contentElement.getBoundingClientRect()
  const anchorY = containerRect.top + containerRect.height * 0.18
  let activeSection = sections[0]

  for (const section of sections) {
    const rect = section.getBoundingClientRect()
    if (rect.top <= anchorY) {
      activeSection = section
    } else {
      break
    }
  }

  const rect = activeSection.getBoundingClientRect()
  const sectionHeight = Math.max(rect.height, 1)
  const progress = Math.max(0, Math.min(1, (anchorY - rect.top) / sectionHeight))
  const chapterIndex = Number(activeSection.getAttribute('data-overlay-chapter-index') || state.currentChapter)
  return { chapterIndex, progress }
}

function publishReadingLocation() {
  if (state.readingLocationFrame) {
    window.cancelAnimationFrame(state.readingLocationFrame)
  }

  state.readingLocationFrame = window.requestAnimationFrame(() => {
    state.readingLocationFrame = 0
    const readingLocation = resolveReadingLocation()
    state.currentChapter = readingLocation.chapterIndex
    updateChapterSelection()
    if (!state.isDraggingProgress) {
      updateProgressLabel(readingLocation.progress * 100)
    }
    window.moyuOverlay?.updateReadingLocation(readingLocation)
  })
}

function publishReadingLocationNow() {
  const readingLocation = resolveReadingLocation()
  state.currentChapter = readingLocation.chapterIndex
  updateChapterSelection()
  if (!state.isDraggingProgress) {
    updateProgressLabel(readingLocation.progress * 100)
  }
  window.moyuOverlay?.updateReadingLocation(readingLocation)
}

function updateChapterSelection() {
  updateChapterToggleLabel()
  const canPrev = state.currentChapter > 0
  const canNext = state.currentChapter < state.chapters.length - 1
  prevButton.disabled = !canPrev
  nextButton.disabled = !canNext
  const buttons = chapterList.querySelectorAll('.chapter-list-button')
  buttons.forEach((button) => {
    const chapterIndex = Number(button.dataset.chapterIndex || 0)
    const isActive = chapterIndex === state.currentChapter
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-selected', isActive ? 'true' : 'false')
  })
}

function scrollToReadingLocation(chapterIndex, progress) {
  const section = contentElement.querySelector(`[data-overlay-chapter-index="${chapterIndex}"]`)
  if (!section) {
    return
  }

  state.isProgrammaticScroll = true
  const targetTop =
    section.offsetTop + section.offsetHeight * Math.max(0, Math.min(1, Number(progress || 0)))
  contentElement.scrollTo({
    top: Math.max(0, targetTop - contentElement.clientHeight * 0.18),
    behavior: 'auto',
  })
  window.setTimeout(() => {
    state.isProgrammaticScroll = false
    publishReadingLocation()
  }, 60)
}

function clampProgressValue(value) {
  return Math.max(0, Math.min(100, Number(value || 0)))
}

function extractRenderableContent(html) {
  const source = String(html || '').trim()
  if (!source) {
    return ''
  }

  if (typeof DOMParser === 'undefined') {
    return source
  }

  const parsed = new DOMParser().parseFromString(source, 'text/html')
  const article = parsed.querySelector('article')
  if (article) {
    return article.outerHTML
  }

  return parsed.body?.innerHTML || source
}

function canTriggerBoundarySwitch() {
  return Date.now() >= state.boundaryCooldownUntil
}

function markBoundarySwitchTriggered() {
  state.boundaryCooldownUntil = Date.now() + BOUNDARY_SWITCH_COOLDOWN_MS
}

function getResizeDirection(event) {
  const rect = overlayElement.getBoundingClientRect()
  const nearLeft = event.clientX - rect.left <= EDGE_RESIZE_WIDTH
  const nearRight = rect.right - event.clientX <= EDGE_RESIZE_WIDTH
  const nearTop = event.clientY - rect.top <= EDGE_RESIZE_WIDTH
  const nearBottom = rect.bottom - event.clientY <= EDGE_RESIZE_WIDTH

  if (nearTop && nearLeft) {
    return 'top-left'
  }

  if (nearTop && nearRight) {
    return 'top-right'
  }

  if (nearBottom && nearLeft) {
    return 'bottom-left'
  }

  if (nearBottom && nearRight) {
    return 'bottom-right'
  }

  if (nearLeft) {
    return 'left'
  }

  if (nearRight) {
    return 'right'
  }

  if (nearTop) {
    return 'top'
  }

  if (nearBottom) {
    return 'bottom'
  }

  return null
}

function getCursorForResizeDirection(direction) {
  if (direction === 'top-left' || direction === 'bottom-right') {
    return 'nwse-resize'
  }

  if (direction === 'top-right' || direction === 'bottom-left') {
    return 'nesw-resize'
  }

  if (direction === 'left' || direction === 'right') {
    return 'ew-resize'
  }

  if (direction === 'top' || direction === 'bottom') {
    return 'ns-resize'
  }

  return ''
}

function updateEdgeResizeCursor(event) {
  if (state.isDragging || state.chapterPanelOpen || state.appearancePanelOpen) {
    overlayElement.style.cursor = ''
    return
  }

  const direction = getResizeDirection(event)
  overlayElement.style.cursor = getCursorForResizeDirection(direction)
}

function shouldStartOverlayDrag(event) {
  if (!(event.target instanceof HTMLElement)) {
    return false
  }

  if (
    event.button !== 0 ||
    state.isResizing ||
    event.target.closest('a, button, input, select, textarea, .chapter-panel, .appearance-panel, .resize-edge')
  ) {
    return false
  }

  if (event.target.closest('.overlay-content')) {
    const rect = contentElement.getBoundingClientRect()
    const inVerticalScrollbar = event.clientX >= rect.right - SCROLLBAR_HIT_WIDTH
    const inHorizontalScrollbar = event.clientY >= rect.bottom - SCROLLBAR_HIT_WIDTH
    if (inVerticalScrollbar || inHorizontalScrollbar) {
      return false
    }
  }

  return true
}

function stopDragSession() {
  if (!state.dragSession) {
    return
  }

  window.removeEventListener('pointermove', handleContentDragMove)
  window.removeEventListener('pointerup', handleContentDragEnd)
  window.removeEventListener('pointercancel', handleContentDragEnd)
  contentElement.classList.remove('is-dragging')
  window.moyuOverlay?.endDrag()
  state.dragSession = null
  state.isDragging = false
  scheduleChromeHide(260)
}

function restoreReadingLocation(readingLocation) {
  if (!readingLocation) {
    return
  }

  scrollToReadingLocation(readingLocation.chapterIndex, readingLocation.progress)
}

function handleContentDragMove(event) {
  if (!state.dragSession) {
    return
  }

  const deltaX = event.screenX - state.dragSession.startScreenX
  const deltaY = event.screenY - state.dragSession.startScreenY

  if (!state.dragSession.started) {
    if (Math.abs(deltaX) < DRAG_THRESHOLD_PX && Math.abs(deltaY) < DRAG_THRESHOLD_PX) {
      return
    }

    state.dragSession.started = true
    state.isDragging = true
    contentElement.classList.add('is-dragging')
    setChromeVisible(true)
    clearChromeTimer()
    window.moyuOverlay?.startDrag({
      screenX: state.dragSession.startScreenX,
      screenY: state.dragSession.startScreenY,
    })
  }

  window.moyuOverlay?.dragMove({
    screenX: event.screenX,
    screenY: event.screenY,
  })
  event.preventDefault()
}

function handleContentDragEnd() {
  stopDragSession()
}

function beginOverlayDrag(event) {
  if (!shouldStartOverlayDrag(event)) {
    return
  }

  state.dragSession = {
    started: false,
    startScreenX: event.screenX,
    startScreenY: event.screenY,
  }
  window.addEventListener('pointermove', handleContentDragMove)
  window.addEventListener('pointerup', handleContentDragEnd)
  window.addEventListener('pointercancel', handleContentDragEnd)
}

function stopResizeSession() {
  if (!state.resizeSession) {
    return
  }

  try {
    state.resizeSession.target?.releasePointerCapture?.(state.resizeSession.pointerId)
  } catch {
    // Pointer capture can already be released by Chromium when the pointer leaves.
  }
  window.removeEventListener('pointermove', handleResizeMove)
  window.removeEventListener('pointerup', handleResizeEnd)
  window.removeEventListener('pointercancel', handleResizeEnd)
  document.documentElement.style.cursor = ''
  overlayElement.style.cursor = ''
  state.resizeSession = null
  state.isResizing = false
  scheduleChromeHide(260)
}

function handleResizeMove(event) {
  if (!state.resizeSession) {
    return
  }

  const deltaX = event.screenX - state.resizeSession.startScreenX
  const deltaY = event.screenY - state.resizeSession.startScreenY
  const direction = state.resizeSession.direction
  const nextBounds = { ...state.resizeSession.startBounds }

  if (direction.includes('right')) {
    nextBounds.width = Math.max(MIN_OVERLAY_WIDTH, state.resizeSession.startBounds.width + deltaX)
  }

  if (direction.includes('bottom')) {
    nextBounds.height = Math.max(MIN_OVERLAY_HEIGHT, state.resizeSession.startBounds.height + deltaY)
  }

  if (direction.includes('left')) {
    const wantedWidth = state.resizeSession.startBounds.width - deltaX
    nextBounds.width = Math.max(MIN_OVERLAY_WIDTH, wantedWidth)
    nextBounds.x =
      state.resizeSession.startBounds.x +
      (state.resizeSession.startBounds.width - nextBounds.width)
  }

  if (direction.includes('top')) {
    const wantedHeight = state.resizeSession.startBounds.height - deltaY
    nextBounds.height = Math.max(MIN_OVERLAY_HEIGHT, wantedHeight)
    nextBounds.y =
      state.resizeSession.startBounds.y +
      (state.resizeSession.startBounds.height - nextBounds.height)
  }

  window.moyuOverlay?.setBounds({
    x: Math.round(nextBounds.x),
    y: Math.round(nextBounds.y),
    width: Math.round(nextBounds.width),
    height: Math.round(nextBounds.height),
  })
  event.preventDefault()
}

function handleResizeEnd() {
  stopResizeSession()
}

async function beginResize(event, direction = getResizeDirection(event)) {
  if (event.button !== 0) {
    return
  }

  if (!direction) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (state.dragSession) {
    stopDragSession()
  }

  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {
    // Transparent frameless windows may reject capture near the edge; resize still works via window listeners.
  }

  const bounds = await window.moyuOverlay?.getBounds?.()
  if (!bounds) {
    return
  }

  state.resizeSession = {
    pointerId: event.pointerId,
    target: event.currentTarget,
    startScreenX: event.screenX,
    startScreenY: event.screenY,
    startBounds: bounds,
    direction,
  }
  state.isResizing = true
  const cursor = getCursorForResizeDirection(direction)
  document.documentElement.style.cursor = cursor
  overlayElement.style.cursor = cursor
  setChromeVisible(true)
  clearChromeTimer()
  window.addEventListener('pointermove', handleResizeMove)
  window.addEventListener('pointerup', handleResizeEnd)
  window.addEventListener('pointercancel', handleResizeEnd)
}

function scrollContentBy(deltaY) {
  const previousScrollTop = contentElement.scrollTop
  const maxScrollTop = Math.max(0, contentElement.scrollHeight - contentElement.clientHeight)
  const nextScrollTop = Math.max(0, Math.min(maxScrollTop, previousScrollTop + deltaY))

  if (nextScrollTop !== previousScrollTop) {
    contentElement.scrollTop = nextScrollTop
    lockExternalPositionGuard()
    publishReadingLocation()
    return true
  }

  return false
}

window.moyuOverlay?.onState((payload) => {
  if (payload.type === 'content') {
    const nextHtml = extractRenderableContent(payload.html)
    if (nextHtml !== state.lastContentHtml) {
      const previousReadingLocation = resolveReadingLocation()
      contentElement.innerHTML = nextHtml
      state.lastContentHtml = nextHtml
      releaseExternalPositionGuard()
      window.requestAnimationFrame(() => {
        restoreReadingLocation(previousReadingLocation)
      })
    }

    syncContentColor(payload.textColor)
    document.documentElement.dataset.theme = payload.theme || 'dark'
    state.theme = payload.theme || 'dark'
    applyAppearance({
      fontSize: payload.fontSize || 16,
      fontWeight: payload.fontWeight || 400,
      lineHeight: payload.lineHeight || 1.8,
      textColor: payload.textColor || rgbToHex(payload.red, payload.green, payload.blue),
    })
    applyOpacity(payload.opacity || state.opacity, { fromRemote: true })
    publishReadingLocation()
    return
  }

  if (payload.type === 'opacity') {
    applyOpacity(payload.opacity || state.opacity, { fromRemote: true })
    return
  }

  if (payload.type === 'controls') {
    state.chapters = Array.isArray(payload.chapters) ? payload.chapters : []
    state.currentChapter = Number(payload.currentChapter || 0)
    state.camouflageEnabled = Boolean(payload.camouflageEnabled)
    renderChapterOptions(state.chapters, state.currentChapter)
    applyOpacity(payload.opacity || state.opacity, { fromRemote: true })
    camouflageButton.textContent = state.camouflageEnabled ? '挂件开' : '挂件关'
    if (!state.isDraggingProgress) {
      updateProgressLabel(payload.progress || 0)
    }
    updateChapterSelection()
    return
  }

  if (payload.type === 'position') {
    if (state.isDraggingProgress) {
      return
    }

    if (
      state.userControlsPosition ||
      Date.now() - state.lastUserScrollAt < USER_SCROLL_POSITION_GUARD_MS
    ) {
      return
    }

    scrollToReadingLocation(payload.chapterIndex, payload.progress)
  }
})

chapterToggleButton.addEventListener('click', (event) => {
  event.stopPropagation()
  setChapterPanelOpen(!state.chapterPanelOpen)
})

appearanceButton.addEventListener('click', (event) => {
  event.stopPropagation()
  setAppearancePanelOpen(!state.appearancePanelOpen)
})

appearanceCloseButton.addEventListener('click', (event) => {
  event.stopPropagation()
  setAppearancePanelOpen(false)
})

chapterList.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return
  }

  const button = target.closest('.chapter-list-button')
  if (!(button instanceof HTMLButtonElement)) {
    return
  }

  const chapterIndex = Number(button.dataset.chapterIndex || 0)
  state.currentChapter = chapterIndex
  updateChapterSelection()
  setChapterPanelOpen(false)
  releaseExternalPositionGuard()
  emitAction({ type: 'chapter', chapterIndex })
})

document.addEventListener('mousedown', (event) => {
  if (state.chapterPanelOpen && !chapterPanel.contains(event.target) && event.target !== chapterToggleButton) {
    setChapterPanelOpen(false)
  }

  if (
    state.appearancePanelOpen &&
    !appearancePanel.contains(event.target) &&
    event.target !== appearanceButton
  ) {
    setAppearancePanelOpen(false)
  }
})

appearancePanel.addEventListener(
  'wheel',
  (event) => {
    // 外观面板内容超过窗口高度时，滚轮只滚动面板自身，避免触发正文滚动或章节切换。
    event.stopPropagation()
  },
  { passive: true }
)

contentElement.addEventListener('click', () => {
  bumpChromeVisibility()
})

contentElement.addEventListener('scroll', () => {
  if (state.isProgrammaticScroll) {
    return
  }

  lockExternalPositionGuard()
  publishReadingLocation()
})

overlayElement.addEventListener(
  'wheel',
  (event) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('.overlay-header, .overlay-footer, .chapter-panel, .appearance-panel')
    ) {
      return
    }

    updateChromeByPointer(event)
    const didScroll = scrollContentBy(event.deltaY)
    event.preventDefault()
    event.stopPropagation()

    if (didScroll) {
      return
    }

    if (!canTriggerBoundarySwitch()) {
      return
    }

    const nearTop = contentElement.scrollTop <= 2
    const nearBottom =
      contentElement.scrollTop + contentElement.clientHeight >= contentElement.scrollHeight - 2

    if (event.deltaY < 0 && nearTop) {
      markBoundarySwitchTriggered()
      releaseExternalPositionGuard()
      emitAction({ type: 'prev' })
      return
    }

    if (event.deltaY > 0 && nearBottom) {
      markBoundarySwitchTriggered()
      releaseExternalPositionGuard()
      emitAction({ type: 'next' })
    }
  },
  { passive: false }
)

window.addEventListener('resize', () => {
  publishReadingLocation()
})

overlayElement.addEventListener('pointermove', (event) => {
  updateChromeByPointer(event)
})

overlayElement.addEventListener('pointerdown', (event) => {
  const direction = getResizeDirection(event)
  if (direction) {
    void beginResize(event, direction)
    return
  }

  beginOverlayDrag(event)
})

overlayElement.addEventListener('pointerenter', (event) => {
  updateChromeByPointer(event)
})

overlayElement.addEventListener('mouseleave', () => {
  if (state.chapterPanelOpen || state.appearancePanelOpen) {
    return
  }

  overlayElement.style.cursor = ''
  scheduleChromeHide(240)
})

resizeHandle.addEventListener('pointerdown', (event) => {
  void beginResize(event, 'bottom-right')
})

resizeEdges.forEach((edge) => {
  edge.addEventListener('pointerdown', (event) => {
    event.stopPropagation()
    const direction = edge.getAttribute('data-resize-direction')
    void beginResize(event, direction)
  })
})

prevButton.addEventListener('click', () => {
  if (prevButton.disabled) {
    return
  }
  releaseExternalPositionGuard()
  emitAction({ type: 'prev' })
})
nextButton.addEventListener('click', () => {
  if (nextButton.disabled) {
    return
  }
  releaseExternalPositionGuard()
  emitAction({ type: 'next' })
})
closeButton.addEventListener('click', () => {
  publishReadingLocationNow()
  emitAction({ type: 'close' })
})
camouflageButton.addEventListener('click', () =>
  emitAction({ type: 'camouflage', value: state.camouflageEnabled ? 0 : 1 })
)
opacityInput.addEventListener('input', () => {
  const value = Number(opacityInput.value || 0.3)
  state.lastOpacityInputAt = Date.now()
  applyOpacity(value)
  emitAction({ type: 'opacity', value })
})

opacityInput.addEventListener('pointerdown', () => {
  state.isDraggingOpacity = true
  state.lastOpacityInputAt = Date.now()
})

opacityInput.addEventListener('pointerup', () => {
  state.isDraggingOpacity = false
  state.lastOpacityInputAt = Date.now()
})

opacityInput.addEventListener('change', () => {
  state.isDraggingOpacity = false
  state.lastOpacityInputAt = Date.now()
  applyOpacity(Number(opacityInput.value || state.opacity))
})

fontSizeInput.addEventListener('input', () => {
  applyAppearance({ fontSize: Number(fontSizeInput.value || state.fontSize) }, { emit: true })
})

fontWeightInput.addEventListener('input', () => {
  applyAppearance({ fontWeight: Number(fontWeightInput.value || state.fontWeight) }, { emit: true })
})

lineHeightInput.addEventListener('input', () => {
  applyAppearance({ lineHeight: Number(lineHeightInput.value || state.lineHeight) }, { emit: true })
})

textColorInput.addEventListener('input', () => {
  applyAppearance({ textColor: textColorInput.value })
})

textColorInput.addEventListener('change', () => {
  applyAppearance({ textColor: textColorInput.value }, { emit: true })
  window.moyuOverlay?.setColorPickerActive?.(false)
})

textColorInput.addEventListener('blur', () => {
  applyAppearance({ textColor: textColorInput.value }, { emit: true })
  window.moyuOverlay?.setColorPickerActive?.(false)
})

textColorInput.addEventListener('pointerdown', () => {
  window.moyuOverlay?.setColorPickerActive?.(true)
})

textColorInput.addEventListener('focus', () => {
  window.moyuOverlay?.setColorPickerActive?.(true)
})

progressInput.addEventListener('input', () => {
  state.isDraggingProgress = true
  lockExternalPositionGuard()
  const value = clampProgressValue(progressInput.value)
  progressLabel.textContent = `${Math.round(value)}%`
  scrollToReadingLocation(Number(state.currentChapter || 0), value / 100)
  emitAction({
    type: 'position',
    chapterIndex: Number(state.currentChapter || 0),
    value: value / 100,
  })
})

progressInput.addEventListener('pointerdown', () => {
  state.isDraggingProgress = true
  lockExternalPositionGuard()
})

progressInput.addEventListener('pointerup', () => {
  state.isDraggingProgress = false
  publishReadingLocation()
})

progressInput.addEventListener('change', () => {
  state.isDraggingProgress = false
  lockExternalPositionGuard()
  publishReadingLocation()
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (state.chapterPanelOpen) {
      setChapterPanelOpen(false)
      return
    }

    if (state.appearancePanelOpen) {
      setAppearancePanelOpen(false)
      return
    }

    publishReadingLocationNow()
    emitAction({ type: 'close' })
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'arrowleft') {
    event.preventDefault()
    releaseExternalPositionGuard()
    emitAction({ type: 'prev' })
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'arrowright') {
    event.preventDefault()
    releaseExternalPositionGuard()
    emitAction({ type: 'next' })
  }
})

window.addEventListener('beforeunload', () => {
  clearChromeTimer()
  stopDragSession()
  stopResizeSession()
  if (state.readingLocationFrame) {
    window.cancelAnimationFrame(state.readingLocationFrame)
    state.readingLocationFrame = 0
  }
  publishReadingLocation()
  window.moyuOverlay?.notifyVisible({ visible: false })
})

window.addEventListener('focus', () => {
  bumpChromeVisibility()
  window.moyuOverlay?.notifyVisible({ visible: true })
})

setChromeVisible(false)

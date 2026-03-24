import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type {
  CamouflageWidgetPosition,
  Novel,
  ReaderContentBlock,
  SearchResult,
} from '@/types'
import { useNovelStore } from '@/stores/novelStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getPersistedBossOpacity } from '@/stores/settingsStore'
import { useWindowStore } from '@/stores/windowStore'
import { useLibraryStore } from '@/stores/libraryStore'
import ReadingAppearanceControls from '@/components/features/ReadingAppearanceControls'
import CamouflagePendant from '@/components/features/CamouflagePendant'
import Slider from '@/components/common/Slider'
import {
  ConsumeDesktopReaderOverlayActions,
  DisableStealthMode,
  GetDesktopReaderOverlayReadingLocation,
  EnableStealthMode,
  HideDesktopReaderOverlay,
  IsDesktopReaderOverlayVisible,
  MoveDesktopReaderOverlayToReadingLocation,
  OnMouseEnter,
  OnMouseLeave,
  SetOpacity,
  ShowDesktopReaderOverlay,
  SupportsDesktopReaderOverlay,
  UpdateDesktopReaderOverlay,
  UpdateDesktopReaderOverlayOpacity,
  UpdateDesktopReaderOverlayControls,
} from '@/wailsjs/go/services/WindowService'
import { EventsOn } from '@/wailsjs/runtime/runtime'
import {
  getChapterContentPayload,
  openNovel,
  saveReadingProgress,
  searchNovel,
  setCurrentChapter,
} from '@/services/novelBridge'
import { useBossMode } from '@/hooks/useBossMode'
import { useClickOutside } from '@/hooks/useClickOutside'
import {
  buildHighlightedHtml,
  buildDesktopOverlayChaptersMarkup,
  buildDesktopOverlayMarkup,
  buildDesktopOverlayPreviewMarkup,
  buildDesktopOverlayPreviewText,
  calculateProgressFromPosition,
  CONTENT_CHUNK_CLASS_NAME,
  findChapterIndexByPosition,
  isRichChapterContent,
  mapNovelToBook,
  normalizeNovel,
  resolveReaderFontFamily,
} from '@/utils/novel'
import { matchesShortcut } from '@/utils/shortcuts'
import styles from './Reader.module.scss'

function isPickerCancelled(error: unknown) {
  return error instanceof Error && error.message.includes('未选择文件')
}

function parseHexColor(value: string) {
  const normalized = value.trim()
  const hex = normalized.startsWith('#') ? normalized.slice(1) : normalized

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      red: parseInt(hex[0] + hex[0], 16),
      green: parseInt(hex[1] + hex[1], 16),
      blue: parseInt(hex[2] + hex[2], 16),
    }
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16),
      green: parseInt(hex.slice(2, 4), 16),
      blue: parseInt(hex.slice(4, 6), 16),
    }
  }

  return { red: 34, green: 34, blue: 34 }
}

const MIN_STEALTH_OPACITY = 0.02
const MAX_STEALTH_OPACITY = 1
const CAMOUFLAGE_ANIMATION_MS = 240
const CAMOUFLAGE_WIDGET_WIDTH = 156
const CAMOUFLAGE_WIDGET_HEIGHT = 92
const CAMOUFLAGE_VIEWPORT_PADDING = 16

type CamouflageStage = 'expanded' | 'collapsing' | 'collapsed' | 'expanding'

function clampStealthOpacity(value: number) {
  return Math.max(MIN_STEALTH_OPACITY, Math.min(MAX_STEALTH_OPACITY, Number(value || 0)))
}

function opacityToTransparencySliderValue(opacity: number) {
  return Number((MIN_STEALTH_OPACITY + MAX_STEALTH_OPACITY - clampStealthOpacity(opacity)).toFixed(2))
}

function transparencySliderValueToOpacity(value: number) {
  return clampStealthOpacity(MIN_STEALTH_OPACITY + MAX_STEALTH_OPACITY - Number(value || 0))
}

function setReaderStealthRoot(enabled: boolean) {
  document.documentElement.classList.toggle('reader-stealth-active', enabled)
  document.body.classList.toggle('reader-stealth-active', enabled)
  document.getElementById('root')?.classList.toggle('reader-stealth-active', enabled)
}

interface DesktopOverlayAction {
  type: 'prev' | 'next' | 'chapter' | 'opacity' | 'close' | 'camouflage' | 'position'
  chapterIndex?: number
  value?: number
}

function clampUnitInterval(value: number) {
  return Math.max(0, Math.min(1, Number(value || 0)))
}

const CHAPTER_WINDOW_BEFORE = 2
const CHAPTER_WINDOW_AFTER = 3
const DESKTOP_OVERLAY_PREFETCH_AHEAD = {
  text: 12,
  epub: 6,
  pdf: 2,
}
const READING_ANCHOR_RATIO = 0.18
const BOUNDARY_CHAPTER_SWITCH_COOLDOWN_MS = 420

interface LoadedChapter {
  index: number
  content: string
  isRichContent: boolean
  blocks: ReaderContentBlock[]
}

interface PendingChapterScroll {
  chapterIndex: number
  chapterScrollProgress: number
  behavior: ScrollBehavior
  align?: 'anchor' | 'bottom'
}

interface ReadingLocation {
  chapterIndex: number
  chapterScrollProgress: number
}

interface ReaderRouteState {
  filePath?: string
  activateBossMode?: boolean
  returnDirectoryId?: string
}

interface ChapterWindowRange {
  start: number
  end: number
}

interface ReaderChapterListProps {
  chapters: Novel['chapters']
  loadedChapters: LoadedChapter[]
  format?: string
  searchKeyword: string
  isAppendingChapters: boolean
  chapterSectionRefs: MutableRefObject<Record<number, HTMLElement | null>>
}

interface ReaderContentChunkProps {
  html: string
  estimatedHeight: number
}

const DESKTOP_OVERLAY_MAX_CHAPTERS = {
  text: 3,
  epub: 2,
  pdf: 2,
}
const DESKTOP_OVERLAY_MAX_BLOCKS = {
  text: 48,
  epub: 18,
  pdf: 12,
}
const DESKTOP_OVERLAY_MAX_CHARS = {
  text: 18000,
  epub: 9000,
  pdf: 7000,
}
const DESKTOP_OVERLAY_MAX_IMAGES = {
  text: 0,
  epub: 3,
  pdf: 2,
}

const ReaderContentChunk = memo(function ReaderContentChunk({
  html,
  estimatedHeight,
}: ReaderContentChunkProps) {
  return (
    <div
      className={CONTENT_CHUNK_CLASS_NAME}
      style={{
        containIntrinsicSize: `${Math.max(estimatedHeight, 1)}px auto`,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

const ReaderChapterList = memo(function ReaderChapterList({
  chapters,
  loadedChapters,
  format,
  searchKeyword,
  isAppendingChapters,
  chapterSectionRefs,
}: ReaderChapterListProps) {
  const chapterRenderItems = useMemo(
    () =>
      loadedChapters.map((chapter) => {
        const chapterMeta = chapters[chapter.index]
        const chapterIsRichContent = chapter.isRichContent || format === '.epub'
        const chunks = chapter.blocks.map((block) =>
          block.type === 'html' ? block.content : buildHighlightedHtml(block.content, searchKeyword)
        )

        return {
          index: chapter.index,
          title: chapterMeta?.title,
          isRichContent: chapterIsRichContent,
          chunks,
          estimatedHeights: chapter.blocks.map((block) => block.estimatedHeight),
        }
      }),
    [chapters, format, loadedChapters, searchKeyword]
  )

  return (
    <>
      {chapterRenderItems.map((chapter) => (
        <section
          key={`${chapter.title || '正文'}-${chapter.index}`}
          ref={(element) => {
            chapterSectionRefs.current[chapter.index] = element
          }}
          className={styles.chapterSection}
        >
          {chapter.title && <h2 className={styles.chapterTitle}>{chapter.title}</h2>}
          <div className={`${styles.text} ${chapter.isRichContent ? styles.epubText : ''}`}>
            {chapter.chunks.map((chunk, chunkIndex) => (
              <ReaderContentChunk
                key={`${chapter.index}-${chunkIndex}`}
                html={chunk}
                estimatedHeight={chapter.estimatedHeights[chunkIndex] || 420}
              />
            ))}
          </div>
        </section>
      ))}

      {isAppendingChapters && <div className={styles.inlineLoading}>下一章已在路上...</div>}
    </>
  )
})

function deriveChapterProgressFromOverall(novel: Novel, chapterIndex: number) {
  const chapter = novel.chapters[chapterIndex]
  const totalLength = novel.contentLength || novel.content.length
  if (!chapter || totalLength <= 0) {
    return 0
  }

  const absoluteProgress = clampUnitInterval(Number(novel.readProgress || 0) / 100)
  const absolutePosition = Math.round(absoluteProgress * Math.max(totalLength, 1))
  const chapterLength = Math.max(chapter.endPos - chapter.startPos, 1)

  return clampUnitInterval((absolutePosition - chapter.startPos) / chapterLength)
}

function getDesktopOverlayPrefetchAhead(format: string) {
  if (format === '.pdf') {
    return DESKTOP_OVERLAY_PREFETCH_AHEAD.pdf
  }

  if (format === '.epub') {
    return DESKTOP_OVERLAY_PREFETCH_AHEAD.epub
  }

  return DESKTOP_OVERLAY_PREFETCH_AHEAD.text
}

function getDesktopOverlayRenderLimits(format: string) {
  if (format === '.pdf') {
    return {
      maxChapters: DESKTOP_OVERLAY_MAX_CHAPTERS.pdf,
      maxBlocks: DESKTOP_OVERLAY_MAX_BLOCKS.pdf,
      maxChars: DESKTOP_OVERLAY_MAX_CHARS.pdf,
      maxImages: DESKTOP_OVERLAY_MAX_IMAGES.pdf,
    }
  }

  if (format === '.epub') {
    return {
      maxChapters: DESKTOP_OVERLAY_MAX_CHAPTERS.epub,
      maxBlocks: DESKTOP_OVERLAY_MAX_BLOCKS.epub,
      maxChars: DESKTOP_OVERLAY_MAX_CHARS.epub,
      maxImages: DESKTOP_OVERLAY_MAX_IMAGES.epub,
    }
  }

  return {
    maxChapters: DESKTOP_OVERLAY_MAX_CHAPTERS.text,
    maxBlocks: DESKTOP_OVERLAY_MAX_BLOCKS.text,
    maxChars: DESKTOP_OVERLAY_MAX_CHARS.text,
    maxImages: DESKTOP_OVERLAY_MAX_IMAGES.text,
  }
}

function selectDesktopOverlayChapters(
  chapters: LoadedChapter[],
  focusChapterIndex: number,
  format: string
) {
  if (chapters.length === 0) {
    return []
  }

  const orderedChapters = [...chapters].sort((left, right) => left.index - right.index)
  const focusIndex = Math.max(
    0,
    orderedChapters.findIndex((chapter) => chapter.index === focusChapterIndex)
  )

  // 富文本模式（epub/pdf）优先保证“当前章 + 下一章”始终都在，
  // 避免滚到章末时因为章节集合缺失下一章而无法继续下滚。
  if (format === '.epub' || format === '.pdf') {
    const selected: LoadedChapter[] = []

    const currentChapter = orderedChapters[focusIndex]
    if (currentChapter) {
      selected.push(currentChapter)
    }

    const nextChapter = orderedChapters[focusIndex + 1]
    if (nextChapter) {
      selected.push(nextChapter)
    }

    const { maxChapters } = getDesktopOverlayRenderLimits(format)
    const previousChapter = orderedChapters[focusIndex - 1]
    if (previousChapter && selected.length < maxChapters) {
      selected.unshift(previousChapter)
    }

    return selected.sort((left, right) => left.index - right.index)
  }

  const { maxBlocks, maxChapters } = getDesktopOverlayRenderLimits(format)
  const selectedChapters: LoadedChapter[] = []
  let totalBlocks = 0
  let nextCursor = focusIndex
  let prevCursor = focusIndex - 1

  while (selectedChapters.length < maxChapters) {
    let pickedChapter: LoadedChapter | null = null

    if (nextCursor < orderedChapters.length) {
      pickedChapter = orderedChapters[nextCursor]
      nextCursor += 1
    } else if (prevCursor >= 0) {
      pickedChapter = orderedChapters[prevCursor]
      prevCursor -= 1
    }

    if (!pickedChapter) {
      break
    }

    const blockCount = Math.max(pickedChapter.blocks.length, 1)
    if (selectedChapters.length > 0 && totalBlocks + blockCount > maxBlocks) {
      if (prevCursor >= 0 && nextCursor >= orderedChapters.length) {
        break
      }

      continue
    }

    selectedChapters.push(pickedChapter)
    totalBlocks += blockCount

    if (prevCursor >= 0 && selectedChapters.length < maxChapters && totalBlocks < maxBlocks) {
      const previousChapter = orderedChapters[prevCursor]
      const previousBlockCount = Math.max(previousChapter.blocks.length, 1)
      if (totalBlocks + previousBlockCount <= maxBlocks || selectedChapters.length === 0) {
        selectedChapters.unshift(previousChapter)
        totalBlocks += previousBlockCount
        prevCursor -= 1
      }
    }
  }

  return selectedChapters.sort((left, right) => left.index - right.index)
}

function buildDesktopOverlayChapterPreview(chapter: LoadedChapter, format: string) {
  if (chapter.isRichContent || format === '.epub' || format === '.pdf') {
    return chapter.content
  }

  const { maxChars, maxImages } = getDesktopOverlayRenderLimits(format)
  const previewSegments: string[] = []
  let remainingChars = maxChars
  let remainingImages = maxImages

  for (const block of chapter.blocks) {
    if (remainingChars <= 0 && remainingImages <= 0) {
      break
    }

    const nextSegment = buildDesktopOverlayPreviewMarkup(
      block.content,
      block.type === 'html',
      {
        maxLength: remainingChars,
        maxImages: remainingImages,
      }
    )
    if (!nextSegment.trim()) {
      continue
    }

    previewSegments.push(nextSegment)
    remainingChars -= Array.from(buildDesktopOverlayPreviewText(nextSegment, true, remainingChars)).length
    const imageMatches = nextSegment.match(/<img\b/gi)
    remainingImages -= imageMatches?.length || 0
  }

  if (previewSegments.length > 0) {
    return previewSegments.join('')
  }

  return buildDesktopOverlayPreviewMarkup(chapter.content, chapter.isRichContent, {
    maxLength: maxChars,
    maxImages,
  })
}

function getChapterWindowRange(
  focusChapterIndex: number,
  totalChapters: number
): ChapterWindowRange {
  if (totalChapters <= 0) {
    return { start: 0, end: 0 }
  }

  return {
    start: Math.max(0, focusChapterIndex - CHAPTER_WINDOW_BEFORE),
    end: Math.min(totalChapters - 1, focusChapterIndex + CHAPTER_WINDOW_AFTER),
  }
}

function clampCamouflageRatio(value: number) {
  return Math.max(0, Math.min(1, Number(value || 0)))
}

function normalizeCamouflageWidgetPosition(position: CamouflageWidgetPosition) {
  return {
    x: clampCamouflageRatio(position.x),
    y: clampCamouflageRatio(position.y),
  }
}

function getCamouflageTravelSize() {
  if (typeof window === 'undefined') {
    return { x: 1, y: 1 }
  }

  return {
    x: Math.max(
      window.innerWidth - CAMOUFLAGE_WIDGET_WIDTH - CAMOUFLAGE_VIEWPORT_PADDING * 2,
      1
    ),
    y: Math.max(
      window.innerHeight - CAMOUFLAGE_WIDGET_HEIGHT - CAMOUFLAGE_VIEWPORT_PADDING * 2,
      1
    ),
  }
}

function buildCamouflageWidgetStyle(position: CamouflageWidgetPosition): CSSProperties {
  const normalized = normalizeCamouflageWidgetPosition(position)

  return {
    left: `calc(${CAMOUFLAGE_VIEWPORT_PADDING}px + ${normalized.x} * (100vw - ${CAMOUFLAGE_WIDGET_WIDTH}px - ${CAMOUFLAGE_VIEWPORT_PADDING * 2}px))`,
    top: `calc(${CAMOUFLAGE_VIEWPORT_PADDING}px + ${normalized.y} * (100vh - ${CAMOUFLAGE_WIDGET_HEIGHT}px - ${CAMOUFLAGE_VIEWPORT_PADDING * 2}px))`,
  }
}

function buildCamouflageTransformOrigin(position: CamouflageWidgetPosition) {
  const normalized = normalizeCamouflageWidgetPosition(position)

  return `calc(${CAMOUFLAGE_VIEWPORT_PADDING}px + ${normalized.x} * (100vw - ${CAMOUFLAGE_WIDGET_WIDTH}px - ${CAMOUFLAGE_VIEWPORT_PADDING * 2}px) + ${CAMOUFLAGE_WIDGET_WIDTH / 2}px) calc(${CAMOUFLAGE_VIEWPORT_PADDING}px + ${normalized.y} * (100vh - ${CAMOUFLAGE_WIDGET_HEIGHT}px - ${CAMOUFLAGE_VIEWPORT_PADDING * 2}px) + ${CAMOUFLAGE_WIDGET_HEIGHT / 2}px)`
}

function hasWailsRuntimeEvents() {
  if (typeof window === 'undefined') {
    return false
  }

  const runtime = (window as Window & {
    runtime?: { EventsOnMultiple?: unknown }
  }).runtime

  return typeof runtime?.EventsOnMultiple === 'function'
}

function logDesktopOverlayDebug(...args: unknown[]) {
  console.info('[desktop-overlay]', ...args)
}

/**
 * Reader 阅读器页面
 * 小说阅读的主界面
 */
export default function Reader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentNovel, setCurrentNovel, patchCurrentNovel, addNovel, updateReadProgress } =
    useNovelStore()
  const {
    fontSize,
    fontFamily,
    lineHeight,
    backgroundColor,
    textColor,
    pageWidth,
    bossModeType,
    bossRevealDelay,
    bossHideDelay,
    bossOpacity,
    bossCamouflageEnabled,
    bossCamouflageWidgetPosition,
    keyboardShortcuts,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setPageWidth,
    setBackgroundColor,
    setTextColor,
    setBossModeType,
    setBossRevealDelay,
    setBossHideDelay,
    setBossOpacity,
    setBossCamouflageEnabled,
    setBossCamouflageWidgetPosition,
  } = useSettingsStore()
  const { opacity, isStealthMode, setOpacity, setStealthMode } = useWindowStore()
  const { upsertBook, updateProgressByFilePath } = useLibraryStore()

  const [showSidebar, setShowSidebar] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showAppearancePanel, setShowAppearancePanel] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([])
  const [loadingChapterIndexes, setLoadingChapterIndexes] = useState<number[]>([])
  const [boundaryLoadingDirection, setBoundaryLoadingDirection] = useState<'prev' | 'next' | null>(null)
  const [supportsDesktopOverlay, setSupportsDesktopOverlay] = useState(false)
  const [camouflageStage, setCamouflageStage] = useState<CamouflageStage>('expanded')
  const [camouflageWidgetPosition, setCamouflageWidgetPosition] = useState<CamouflageWidgetPosition>(
    normalizeCamouflageWidgetPosition(bossCamouflageWidgetPosition)
  )
  const [isDraggingCamouflageWidget, setIsDraggingCamouflageWidget] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const chapterListRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<number | null>(null)
  const scrollTickingRef = useRef(false)
  const chapterWindowMaintainTimerRef = useRef<number | null>(null)
  const appearancePanelRef = useRef<HTMLDivElement>(null)
  const bossPanelRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const chapterLoadRevisionRef = useRef(0)
  const chapterLoadPromisesRef = useRef<Map<number, Promise<LoadedChapter>>>(new Map())
  const chapterContentMapRef = useRef<Map<number, LoadedChapter>>(new Map())
  const loadedChaptersRef = useRef<LoadedChapter[]>([])
  const currentNovelRef = useRef(currentNovel)
  const chapterSectionRefs = useRef<Record<number, HTMLElement | null>>({})
  const chapterItemRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const chapterWindowRangeRef = useRef<ChapterWindowRange | null>(null)
  const pendingChapterScrollRef = useRef<PendingChapterScroll | null>(null)
  const skipNextScrollSyncRef = useRef(false)
  const boundaryChapterLoadingRef = useRef(false)
  const boundaryChapterCooldownUntilRef = useRef(0)
  const overlayReadingLocationRef = useRef<PendingChapterScroll | null>(null)
  const overlayReadingSaveTimerRef = useRef<number | null>(null)
  const overlayActionPollingRef = useRef(false)
  const camouflageTimerRef = useRef<number | null>(null)
  const camouflageDragCleanupRef = useRef<(() => void) | null>(null)
  const camouflageDragFrameRef = useRef<number | null>(null)
  const camouflageDragLatestPositionRef = useRef<CamouflageWidgetPosition | null>(null)
  const bossOpacityPersistTimerRef = useRef<number | null>(null)
  const overlayOpacityFrameRef = useRef<number | null>(null)
  const overlayOpacityQueuedValueRef = useRef<number | null>(null)
  const overlayOpacityLastSentRef = useRef<number | null>(null)
  const overlayOpacityRevisionRef = useRef(0)
  const overlayOpacityInFlightRef = useRef(false)
  const useDesktopOverlay = supportsDesktopOverlay
  const isWebviewStealthMode = isStealthMode && !useDesktopOverlay
  const bossMode = useBossMode({
    isStealthMode: isWebviewStealthMode,
    bossModeType,
    revealDelay: bossRevealDelay,
    hideDelay: bossHideDelay,
  })

  const currentChapter =
    currentNovel && currentNovel.chapters.length > 0
      ? currentNovel.chapters[currentNovel.currentChapter]
      : null
  const currentLoadedChapter =
    currentNovel
      ? loadedChapters.find((chapter) => chapter.index === currentNovel.currentChapter) || null
      : null
  const currentChapterProgressPercent = currentNovel
    ? deriveChapterProgressFromOverall(currentNovel, currentNovel.currentChapter) * 100
    : 0
  const currentChapterContent = currentLoadedChapter?.content || ''
  const isRichContent = Boolean(
    currentLoadedChapter?.isRichContent ||
      currentNovel?.format === '.epub' ||
      isRichChapterContent(currentChapterContent)
  )
  const isLoadingChapter = loadingChapterIndexes.length > 0
  const isInitialChapterLoading = loadedChapters.length === 0 && isLoadingChapter
  const isAppendingChapters = loadedChapters.length > 0 && isLoadingChapter
  const desktopOverlayChapters = useMemo(() => {
    if (!currentNovel || loadedChapters.length === 0) {
      return []
    }

    return selectDesktopOverlayChapters(
      loadedChapters,
      currentNovel.currentChapter,
      currentNovel.format
    )
  }, [currentNovel, loadedChapters])
  const overlayChapterMarkup = useMemo(() => {
    if (!currentNovel || desktopOverlayChapters.length === 0) {
      return buildDesktopOverlayMarkup(
        currentChapter?.title,
        Boolean(isRichContent) ? currentChapterContent : buildDesktopOverlayPreviewMarkup(
          currentChapterContent,
          false,
          {
            maxLength: getDesktopOverlayRenderLimits(currentNovel?.format || '').maxChars,
            maxImages: getDesktopOverlayRenderLimits(currentNovel?.format || '').maxImages,
          }
        ),
        Boolean(isRichContent)
      )
    }

    return buildDesktopOverlayChaptersMarkup(
      desktopOverlayChapters.map((chapter) => ({
        chapterIndex: chapter.index,
        title: currentNovel.chapters[chapter.index]?.title,
        content: buildDesktopOverlayChapterPreview(chapter, currentNovel.format),
        contentIsHtml: true,
      }))
    )
  }, [
    currentChapter?.title,
    currentChapterContent,
    currentNovel?.filePath,
    desktopOverlayChapters,
    isRichContent,
  ])
  const overlayChapterTitlesSignature = currentNovel
    ? currentNovel.chapters.map((chapter) => chapter.title).join('\u0000')
    : ''
  const routeState = (location.state as ReaderRouteState | null) ?? null
  const pendingRouteFilePath = routeState?.filePath?.trim() || ''
  const isSwitchingRouteNovel = Boolean(
    pendingRouteFilePath && currentNovel?.filePath !== pendingRouteFilePath
  )
  const activeStealthOpacity = clampStealthOpacity(
    isStealthMode ? opacity : bossOpacity
  )
  const displayOpacity = isWebviewStealthMode
    ? bossMode.isConcealed
      ? Math.min(activeStealthOpacity, 0.04)
      : activeStealthOpacity
    : 1
  const shouldActivateBossMode = Boolean(routeState?.activateBossMode)
  const returnDirectoryId = routeState?.returnDirectoryId
  const contentStyle: CSSProperties = {
    maxWidth: `${pageWidth}%`,
    fontSize: `${fontSize}px`,
    fontFamily: resolveReaderFontFamily(fontFamily),
    lineHeight,
  }

const isCamouflageFeatureActive = isWebviewStealthMode && bossCamouflageEnabled
const showCamouflageWidget =
  isCamouflageFeatureActive &&
  (camouflageStage === 'collapsed' || camouflageStage === 'expanding')
const readerShellStyle = isCamouflageFeatureActive
  ? ({
      transformOrigin: buildCamouflageTransformOrigin(camouflageWidgetPosition),
    } as CSSProperties)
  : undefined
const camouflageWidgetStyle = buildCamouflageWidgetStyle(camouflageWidgetPosition)
const readerShellClassName = `${styles.readerShell} ${
  camouflageStage === 'collapsing' ? styles.readerShellCollapsing : ''
} ${camouflageStage === 'expanding' ? styles.readerShellExpanding : ''}`
const camouflageWidgetClassName = `${styles.camouflageWidget} ${
  camouflageStage === 'collapsed'
    ? styles.camouflageWidgetVisible
    : camouflageStage === 'expanding'
    ? styles.camouflageWidgetLeaving
    : ''
}`

  const currentChapterOverlayMarkup = currentNovel
    ? buildDesktopOverlayMarkup(
        currentChapter?.title,
        Boolean(isRichContent)
          ? currentChapterContent
          : buildDesktopOverlayPreviewMarkup(
              currentChapterContent,
              false,
              {
                maxLength: getDesktopOverlayRenderLimits(currentNovel.format).maxChars,
                maxImages: getDesktopOverlayRenderLimits(currentNovel.format).maxImages,
              }
            ),
        Boolean(isRichContent)
      )
    : buildDesktopOverlayMarkup(null, '', false)

  useClickOutside(bossPanelRef, isWebviewStealthMode && bossMode.isPanelOpen, () => {
    bossMode.closePanel()
  })
  useClickOutside(appearancePanelRef, showAppearancePanel, () => {
    setShowAppearancePanel(false)
  })
  useClickOutside(sidebarRef, showSidebar, () => {
    setShowSidebar(false)
  })

  // 把当前章节正文、字体和文字颜色同步到原生桌面浮窗，用于摸鱼模式渲染正文。
  const syncDesktopOverlay = async (nextOpacity = activeStealthOpacity) => {
    if (!useDesktopOverlay || !currentNovel) {
      return
    }

    logDesktopOverlayDebug('sync content', {
      loadedChapterIndexes: loadedChaptersRef.current.map((chapter) => chapter.index),
      opacity: nextOpacity,
    })

    const { red, green, blue } = parseHexColor(textColor)
    const readingLocation =
      overlayReadingLocationRef.current && isStealthMode
        ? {
            chapterIndex: overlayReadingLocationRef.current.chapterIndex,
            chapterScrollProgress: overlayReadingLocationRef.current.chapterScrollProgress,
          }
        : resolveReaderReadingLocation()

    await UpdateDesktopReaderOverlay(
      overlayChapterMarkup,
      Math.round(fontSize),
      lineHeight,
      nextOpacity,
      red,
      green,
      blue
    )
    overlayOpacityLastSentRef.current = nextOpacity

    // 仅当本次正文集合不包含当前阅读章时才做位置校准，
    // 避免用户在摸鱼浮窗手动滚动时被主阅读区位置“拉回”。
    if (!readingLocation) {
      return
    }

    const hasReadingChapter = desktopOverlayChapters.some(
      (chapter) => chapter.index === readingLocation.chapterIndex
    )

    if (!hasReadingChapter) {
      await syncDesktopOverlayReadingLocation(readingLocation)
    }
  }

  // 同步浮窗顶部/底部控制区需要的章节列表、当前章节和透明度状态。
  const syncDesktopOverlayControls = async (nextOpacity = activeStealthOpacity) => {
    const novel = currentNovelRef.current
    if (!useDesktopOverlay || !novel) {
      return
    }

    if (novel.chapters.length === 0) {
      return
    }

    logDesktopOverlayDebug('sync controls', {
      currentChapter: novel.currentChapter,
      chapterProgress: currentChapterProgressPercent,
      opacity: nextOpacity,
      camouflageEnabled: bossCamouflageEnabled,
    })

    const chapterTitles = novel.chapters.map((chapter) => chapter.title)
    await UpdateDesktopReaderOverlayControls(
      JSON.stringify(chapterTitles),
      novel.currentChapter,
      deriveChapterProgressFromOverall(novel, novel.currentChapter) * 100,
      nextOpacity,
      bossCamouflageEnabled
    )
  }

  const clearBossOpacityPersistTimer = () => {
    if (bossOpacityPersistTimerRef.current === null) {
      return
    }

    window.clearTimeout(bossOpacityPersistTimerRef.current)
    bossOpacityPersistTimerRef.current = null
  }

  const flushBossOpacityPersist = (nextOpacity: number) => {
    clearBossOpacityPersistTimer()
    setBossOpacity(nextOpacity)
  }

  const scheduleBossOpacityPersist = (nextOpacity: number) => {
    clearBossOpacityPersistTimer()
    bossOpacityPersistTimerRef.current = window.setTimeout(() => {
      bossOpacityPersistTimerRef.current = null
      setBossOpacity(nextOpacity)
    }, 120)
  }

  const clearChapterWindowMaintainTimer = () => {
    if (chapterWindowMaintainTimerRef.current === null) {
      return
    }

    window.clearTimeout(chapterWindowMaintainTimerRef.current)
    chapterWindowMaintainTimerRef.current = null
  }

  const clearOverlayReadingSaveTimer = () => {
    if (overlayReadingSaveTimerRef.current === null) {
      return
    }

    window.clearTimeout(overlayReadingSaveTimerRef.current)
    overlayReadingSaveTimerRef.current = null
  }

  const resetDesktopOverlayOpacitySync = () => {
    overlayOpacityRevisionRef.current += 1

    if (overlayOpacityFrameRef.current !== null) {
      window.cancelAnimationFrame(overlayOpacityFrameRef.current)
      overlayOpacityFrameRef.current = null
    }

    overlayOpacityQueuedValueRef.current = null
    overlayOpacityLastSentRef.current = null
  }

  const flushDesktopOverlayOpacitySync = async (revision: number) => {
    if (overlayOpacityInFlightRef.current || revision !== overlayOpacityRevisionRef.current) {
      return
    }

    overlayOpacityInFlightRef.current = true

    try {
      while (
        revision === overlayOpacityRevisionRef.current &&
        overlayOpacityQueuedValueRef.current !== null
      ) {
        const nextOpacity = overlayOpacityQueuedValueRef.current
        overlayOpacityQueuedValueRef.current = null

        if (
          overlayOpacityLastSentRef.current !== null &&
          Math.abs(overlayOpacityLastSentRef.current - nextOpacity) < 0.001
        ) {
          continue
        }

        await UpdateDesktopReaderOverlayOpacity(nextOpacity)

        if (revision !== overlayOpacityRevisionRef.current) {
          return
        }

        overlayOpacityLastSentRef.current = nextOpacity
      }
    } catch (error) {
      console.error('同步桌面浮窗透明度失败:', error)
    } finally {
      overlayOpacityInFlightRef.current = false

      if (
        revision !== overlayOpacityRevisionRef.current ||
        overlayOpacityQueuedValueRef.current === null ||
        overlayOpacityFrameRef.current !== null
      ) {
        return
      }

      overlayOpacityFrameRef.current = window.requestAnimationFrame(() => {
        overlayOpacityFrameRef.current = null
        void flushDesktopOverlayOpacitySync(revision)
      })
    }
  }

  const scheduleDesktopOverlayOpacitySync = (nextOpacity: number) => {
    overlayOpacityQueuedValueRef.current = nextOpacity
    const revision = overlayOpacityRevisionRef.current

    if (overlayOpacityFrameRef.current !== null) {
      return
    }

    overlayOpacityFrameRef.current = window.requestAnimationFrame(() => {
      overlayOpacityFrameRef.current = null
      void flushDesktopOverlayOpacitySync(revision)
    })
  }

  const resetLoadedChapterState = () => {
    chapterLoadRevisionRef.current += 1
    clearChapterWindowMaintainTimer()
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    chapterLoadPromisesRef.current = new Map()
    chapterContentMapRef.current = new Map()
    loadedChaptersRef.current = []
    chapterSectionRefs.current = {}
    chapterWindowRangeRef.current = null
    pendingChapterScrollRef.current = null
    skipNextScrollSyncRef.current = false
    boundaryChapterLoadingRef.current = false
    boundaryChapterCooldownUntilRef.current = 0
    setBoundaryLoadingDirection(null)
    overlayReadingLocationRef.current = null
    setLoadedChapters([])
    setLoadingChapterIndexes([])
    return chapterLoadRevisionRef.current
  }

  const syncLoadedChaptersFromMap = () => {
    const orderedChapters = Array.from(chapterContentMapRef.current.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([, chapterPayload]) => chapterPayload)

    loadedChaptersRef.current = orderedChapters
    setLoadedChapters(orderedChapters)
  }

  const upsertLoadedChapter = (chapterPayload: LoadedChapter) => {
    const activeWindowRange = chapterWindowRangeRef.current
    if (
      activeWindowRange &&
      (chapterPayload.index < activeWindowRange.start || chapterPayload.index > activeWindowRange.end)
    ) {
      return
    }

    chapterContentMapRef.current.set(chapterPayload.index, chapterPayload)
    syncLoadedChaptersFromMap()
  }

  const ensureChapterLoaded = async (
    novelFilePath: string,
    chapterIndex: number,
    expectedRevision = chapterLoadRevisionRef.current
  ) => {
    const cachedContent = chapterContentMapRef.current.get(chapterIndex)
    if (cachedContent !== undefined) {
      return cachedContent
    }

    const inflightPromise = chapterLoadPromisesRef.current.get(chapterIndex)
    if (inflightPromise) {
      return inflightPromise
    }

    setLoadingChapterIndexes((previous) =>
      previous.includes(chapterIndex) ? previous : [...previous, chapterIndex]
    )

    const loadPromise = getChapterContentPayload(novelFilePath, chapterIndex)
      .then((payload) => {
        if (
          expectedRevision !== chapterLoadRevisionRef.current ||
          currentNovelRef.current?.filePath !== novelFilePath
        ) {
          return {
            index: chapterIndex,
            content: payload.content,
            isRichContent: payload.isRichContent,
            blocks: payload.blocks,
          }
        }

        const nextChapter: LoadedChapter = {
          index: chapterIndex,
          content: payload.content,
          isRichContent: payload.isRichContent,
          blocks: payload.blocks,
        }

        upsertLoadedChapter(nextChapter)
        return nextChapter
      })
      .catch((error) => {
        console.error('加载章节内容失败:', error)
        throw error
      })
      .finally(() => {
        chapterLoadPromisesRef.current.delete(chapterIndex)

        if (expectedRevision !== chapterLoadRevisionRef.current) {
          return
        }

        setLoadingChapterIndexes((previous) =>
          previous.filter((value) => value !== chapterIndex)
        )
      })

    chapterLoadPromisesRef.current.set(chapterIndex, loadPromise)
    return loadPromise
  }

  const pruneLoadedChaptersToRange = (
    range: ChapterWindowRange,
    options?: { preserveLocation?: boolean }
  ) => {
    const currentReadingLocation =
      options?.preserveLocation !== false ? resolveCurrentReadingLocation() : null
    const nextEntries = Array.from(chapterContentMapRef.current.entries()).filter(
      ([chapterIndex]) => chapterIndex >= range.start && chapterIndex <= range.end
    )

    if (nextEntries.length === chapterContentMapRef.current.size) {
      return
    }

    chapterContentMapRef.current = new Map(nextEntries)
    chapterSectionRefs.current = Object.fromEntries(
      Object.entries(chapterSectionRefs.current).filter(([chapterIndex]) => {
        const numericIndex = Number(chapterIndex)
        return numericIndex >= range.start && numericIndex <= range.end
      })
    )

    if (
      currentReadingLocation &&
      currentReadingLocation.chapterIndex >= range.start &&
      currentReadingLocation.chapterIndex <= range.end
    ) {
      pendingChapterScrollRef.current = {
        chapterIndex: currentReadingLocation.chapterIndex,
        chapterScrollProgress: currentReadingLocation.chapterScrollProgress,
        behavior: 'auto',
      }
    }

    syncLoadedChaptersFromMap()
  }

  const ensureChapterWindow = async (
    focusChapterIndex: number,
    options?: { preserveLocation?: boolean; expectedRevision?: number }
  ) => {
    const novel = currentNovelRef.current
    if (!novel || novel.chapters.length === 0) {
      return
    }

    const expectedRevision = options?.expectedRevision ?? chapterLoadRevisionRef.current
    if (expectedRevision !== chapterLoadRevisionRef.current) {
      return
    }

    const range = getChapterWindowRange(focusChapterIndex, novel.chapters.length)
    chapterWindowRangeRef.current = range

    const chaptersToLoad: number[] = []
    for (let chapterIndex = range.start; chapterIndex <= range.end; chapterIndex += 1) {
      if (!chapterContentMapRef.current.has(chapterIndex)) {
        chaptersToLoad.push(chapterIndex)
      }
    }

    try {
      await Promise.all(
        chaptersToLoad.map((chapterIndex) =>
          ensureChapterLoaded(novel.filePath, chapterIndex, expectedRevision)
        )
      )

      if (expectedRevision !== chapterLoadRevisionRef.current) {
        return
      }

      pruneLoadedChaptersToRange(range, {
        preserveLocation: options?.preserveLocation,
      })
    } catch (error) {
      console.error('维护章节渲染窗口失败:', error)
    }
  }

  const getChapterMetrics = (contentElement: HTMLDivElement, chapterIndex: number) => {
    const chapterElement = chapterSectionRefs.current[chapterIndex]
    if (!chapterElement) {
      return null
    }
    const top = chapterElement.offsetTop

    return {
      top,
      bottom: top + chapterElement.offsetHeight,
      height: Math.max(chapterElement.offsetHeight, 1),
    }
  }

  const resolveCurrentReadingLocation = () => {
    const contentElement = contentRef.current
    const visibleChapters = loadedChaptersRef.current

    if (!contentElement || visibleChapters.length === 0) {
      return null
    }

    const readingAnchor =
      contentElement.scrollTop + contentElement.clientHeight * READING_ANCHOR_RATIO
    let activeChapterIndex = visibleChapters[0].index
    let activeChapterTop = 0
    let activeChapterHeight = 1

    for (const chapter of visibleChapters) {
      const metrics = getChapterMetrics(contentElement, chapter.index)
      if (!metrics) {
        continue
      }

      if (readingAnchor < metrics.top) {
        break
      }

      activeChapterIndex = chapter.index
      activeChapterTop = metrics.top
      activeChapterHeight = metrics.height

      if (readingAnchor < metrics.bottom) {
        break
      }
    }

    return {
      chapterIndex: activeChapterIndex,
      chapterScrollProgress: clampUnitInterval(
        (readingAnchor - activeChapterTop) / activeChapterHeight
      ),
    }
  }

  const applyReadingProgressState = (
    chapterIndex: number,
    chapterScrollProgress: number,
    options?: { updateTimestamp?: boolean }
  ) => {
    const novel = currentNovelRef.current
    if (!novel) {
      return null
    }

    const nextProgress = calculateProgressFromPosition(
      novel,
      chapterIndex,
      chapterScrollProgress
    )
    const nextLastReadTime = options?.updateTimestamp ? Date.now() : novel.lastReadTime

    currentNovelRef.current = {
      ...novel,
      currentChapter: chapterIndex,
      readProgress: nextProgress,
      lastReadTime: nextLastReadTime,
    }
    patchCurrentNovel((activeNovel) =>
      activeNovel.filePath !== novel.filePath
        ? activeNovel
        : {
            ...activeNovel,
            currentChapter: chapterIndex,
            readProgress: nextProgress,
            lastReadTime: nextLastReadTime,
          }
    )

    if (options?.updateTimestamp) {
      updateReadProgress(novel.filePath, nextProgress)
      updateProgressByFilePath(novel.filePath, {
        progress: nextProgress,
        lastReadTime: nextLastReadTime,
      })
    }

    return nextProgress
  }

  const resolveReaderReadingLocation = (): ReadingLocation | null => {
    const readingLocation = resolveCurrentReadingLocation()
    if (readingLocation) {
      return readingLocation
    }

    const novel = currentNovelRef.current
    if (!novel || novel.chapters.length === 0) {
      return null
    }

    const chapterIndex = Math.max(0, Math.min(novel.currentChapter, novel.chapters.length - 1))
    return {
      chapterIndex,
      chapterScrollProgress: deriveChapterProgressFromOverall(novel, chapterIndex),
    }
  }

  const syncDesktopOverlayReadingLocation = async (readingLocation = resolveReaderReadingLocation()) => {
    if (!useDesktopOverlay || !readingLocation) {
      return
    }

    logDesktopOverlayDebug('sync overlay position', readingLocation)
    await MoveDesktopReaderOverlayToReadingLocation(
      readingLocation.chapterIndex,
      readingLocation.chapterScrollProgress
    )
  }

  const captureDesktopOverlayReadingLocation = async () => {
    if (!useDesktopOverlay) {
      return null
    }

    try {
      const rawPayload = await GetDesktopReaderOverlayReadingLocation()
      if (!rawPayload) {
        return null
      }

      const payload = JSON.parse(rawPayload) as {
        chapterIndex?: number
        progress?: number
      }

      if (
        typeof payload.chapterIndex !== 'number' ||
        typeof payload.progress !== 'number'
      ) {
        return null
      }

      const readingLocation = {
        chapterIndex: payload.chapterIndex,
        chapterScrollProgress: clampUnitInterval(payload.progress),
      }
      rememberOverlayReadingLocation(
        readingLocation.chapterIndex,
        readingLocation.chapterScrollProgress
      )
      logDesktopOverlayDebug('capture overlay position', readingLocation)
      return readingLocation
    } catch (error) {
      console.error('读取摸鱼模式阅读位置失败:', error)
      return null
    }
  }

  const syncActiveChapterFromReadingLocation = (
    readingLocation = resolveCurrentReadingLocation()
  ) => {
    const activeNovel = currentNovelRef.current
    if (!readingLocation || !activeNovel) {
      return null
    }

    if (readingLocation.chapterIndex === activeNovel.currentChapter) {
      return readingLocation
    }

    currentNovelRef.current = {
      ...activeNovel,
      currentChapter: readingLocation.chapterIndex,
    }
    patchCurrentNovel((novel) =>
      novel.filePath !== activeNovel.filePath
        ? novel
        : {
            ...novel,
            currentChapter: readingLocation.chapterIndex,
          }
    )

    return readingLocation
  }

  const tryApplyPendingChapterScroll = () => {
    const contentElement = contentRef.current
    const pendingScroll = pendingChapterScrollRef.current

    if (!contentElement || !pendingScroll) {
      return false
    }

    const metrics = getChapterMetrics(contentElement, pendingScroll.chapterIndex)
    if (!metrics) {
      return false
    }

    const anchorOffset = contentElement.clientHeight * READING_ANCHOR_RATIO
    const targetTop =
      pendingScroll.align === 'bottom'
        ? Math.max(metrics.bottom - contentElement.clientHeight, 0)
        : Math.max(
            metrics.top + metrics.height * pendingScroll.chapterScrollProgress - anchorOffset,
            0
          )

    contentElement.scrollTo({
      top: targetTop,
      behavior: pendingScroll.behavior,
    })
    pendingChapterScrollRef.current = null
    return true
  }

  const rememberOverlayReadingLocation = (
    chapterIndex: number,
    chapterScrollProgress: number
  ) => {
    logDesktopOverlayDebug('remember position', {
      chapterIndex,
      chapterScrollProgress,
    })
    overlayReadingLocationRef.current = {
      chapterIndex,
      chapterScrollProgress: clampUnitInterval(chapterScrollProgress),
      behavior: 'auto',
    }
    const novel = currentNovelRef.current
    if (novel) {
      const nextProgress = calculateProgressFromPosition(novel, chapterIndex, chapterScrollProgress)
      const currentProgress = Number(novel.readProgress || 0)
      const shouldSyncReaderState =
        chapterIndex !== novel.currentChapter || Math.abs(currentProgress - nextProgress) >= 0.05

      if (shouldSyncReaderState) {
        applyReadingProgressState(chapterIndex, chapterScrollProgress)
      }
    }

    clearOverlayReadingSaveTimer()
    overlayReadingSaveTimerRef.current = window.setTimeout(() => {
      overlayReadingSaveTimerRef.current = null
      void persistReadingProgress(chapterIndex, chapterScrollProgress)
    }, 260)

  }

  const flushOverlayReadingLocation = async (options?: { syncReaderView?: boolean }) => {
    const pendingLocation = overlayReadingLocationRef.current
    if (!pendingLocation) {
      return
    }

    clearOverlayReadingSaveTimer()
    overlayReadingLocationRef.current = null

    logDesktopOverlayDebug('flush position', {
      chapterIndex: pendingLocation.chapterIndex,
      chapterScrollProgress: pendingLocation.chapterScrollProgress,
      syncReaderView: Boolean(options?.syncReaderView),
    })

    if (options?.syncReaderView) {
      await moveToReadingLocation(
        pendingLocation.chapterIndex,
        pendingLocation.chapterScrollProgress,
        {
          preferSmooth: false,
        }
      )
      return
    }

    await persistReadingProgress(
      pendingLocation.chapterIndex,
      pendingLocation.chapterScrollProgress
    )
  }

  // 统一保存阅读进度，同时更新阅读页状态和书架展示所依赖的数据。
  const persistReadingProgress = async (chapterIndex: number, chapterScrollProgress: number) => {
    const novel = currentNovelRef.current
    if (!novel) {
      return
    }

    const progress = calculateProgressFromPosition(novel, chapterIndex, chapterScrollProgress)

    try {
      await saveReadingProgress(novel.filePath, chapterIndex, 0, progress)
    } catch (error) {
      console.error('保存阅读进度失败:', error)
    }

    applyReadingProgressState(chapterIndex, chapterScrollProgress, { updateTimestamp: true })
  }

  // 执行章节切换或搜索跳转，并尽量保留章节内对应的滚动百分比。
  const moveToReadingLocation = async (
    chapterIndex: number,
    chapterScrollProgress: number,
    options?: { preferSmooth?: boolean; forceReloadWindow?: boolean }
  ) => {
    const novel = currentNovelRef.current
    if (!novel || novel.chapters.length === 0) {
      return
    }

    const nextChapterIndex = Math.max(0, Math.min(chapterIndex, novel.chapters.length - 1))
    const nextScrollProgress = clampUnitInterval(chapterScrollProgress)

    try {
      clearChapterWindowMaintainTimer()
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      await setCurrentChapter(novel.filePath, nextChapterIndex)
      currentNovelRef.current = {
        ...novel,
        currentChapter: nextChapterIndex,
      }
      patchCurrentNovel((activeNovel) =>
        activeNovel.filePath !== novel.filePath
          ? activeNovel
          : {
              ...activeNovel,
              currentChapter: nextChapterIndex,
            }
      )
      setShowSidebar(false)

      const alreadyLoaded =
        !options?.forceReloadWindow && chapterContentMapRef.current.has(nextChapterIndex)
      pendingChapterScrollRef.current = {
        chapterIndex: nextChapterIndex,
        chapterScrollProgress: nextScrollProgress,
        behavior:
          alreadyLoaded && options?.preferSmooth !== false ? 'smooth' : 'auto',
        align: nextScrollProgress >= 1 ? 'bottom' : 'anchor',
      }

      if (alreadyLoaded) {
        requestAnimationFrame(() => {
          tryApplyPendingChapterScroll()
        })
      } else {
        const nextRevision = resetLoadedChapterState()
        chapterWindowRangeRef.current = {
          start: nextChapterIndex,
          end: nextChapterIndex,
        }
        pendingChapterScrollRef.current = {
          chapterIndex: nextChapterIndex,
          chapterScrollProgress: nextScrollProgress,
          behavior: 'auto',
          align: nextScrollProgress >= 1 ? 'bottom' : 'anchor',
        }

        if (contentRef.current) {
          contentRef.current.scrollTop = 0
        }

        await ensureChapterLoaded(novel.filePath, nextChapterIndex, nextRevision)
        if (nextRevision !== chapterLoadRevisionRef.current) {
          return
        }
      }

      skipNextScrollSyncRef.current = true
      await persistReadingProgress(nextChapterIndex, nextScrollProgress)

      if (useDesktopOverlay && useWindowStore.getState().isStealthMode) {
        await syncDesktopOverlayControls()
      }
    } catch (error) {
      pendingChapterScrollRef.current = null
      console.error('跳转阅读位置失败:', error)
    }
  }


const clearCamouflageTimers = () => {
  if (camouflageTimerRef.current) {
    window.clearTimeout(camouflageTimerRef.current)
    camouflageTimerRef.current = null
  }
}

const closeTransientPanels = () => {
  setShowSidebar(false)
  setShowSearch(false)
  setShowAppearancePanel(false)
  bossMode.closePanel()
}

// 鼠标移出阅读方块后，把整个摸鱼阅读框收纳为一个小挂件。
const startCamouflageCollapse = () => {
  if (!isCamouflageFeatureActive || camouflageStage !== 'expanded') {
    return
  }

  clearCamouflageTimers()
  closeTransientPanels()
  setCamouflageStage('collapsing')
  camouflageTimerRef.current = window.setTimeout(() => {
    bossMode.concealImmediately()
    setCamouflageStage('collapsed')
  }, CAMOUFLAGE_ANIMATION_MS)
}

// 挂件双击后恢复阅读框，章节、滚动位置和透明度都保持原样。
const restoreCamouflageReader = () => {
  if (!isCamouflageFeatureActive || camouflageStage !== 'collapsed') {
    return
  }

  if (isDraggingCamouflageWidget) {
    return
  }

  clearCamouflageTimers()
  setCamouflageStage('expanding')
  bossMode.revealImmediately()
  camouflageTimerRef.current = window.setTimeout(() => {
    setCamouflageStage('expanded')
  }, CAMOUFLAGE_ANIMATION_MS)
}

// 挂件支持拖拽，位置会持久化到设置里，方便下次继续使用。
  const handleCamouflageWidgetPointerDown = (
  event: ReactPointerEvent<HTMLButtonElement>
) => {
  if (event.button !== 0) {
    return
  }

  setIsDraggingCamouflageWidget(true)

  const startX = event.clientX
  const startY = event.clientY
  const startPosition = camouflageWidgetPosition
  let latestPosition = startPosition
  let moved = false

  const cleanup = () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', finishDrag)
    window.removeEventListener('pointercancel', finishDrag)
    camouflageDragCleanupRef.current = null
    if (camouflageDragFrameRef.current !== null) {
      window.cancelAnimationFrame(camouflageDragFrameRef.current)
      camouflageDragFrameRef.current = null
    }
    setIsDraggingCamouflageWidget(false)

    if (moved) {
      if (camouflageDragLatestPositionRef.current) {
        setCamouflageWidgetPosition(camouflageDragLatestPositionRef.current)
      }
      setBossCamouflageWidgetPosition(latestPosition)
    }

    camouflageDragLatestPositionRef.current = null
  }

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const travelSize = getCamouflageTravelSize()
    const deltaX = (moveEvent.clientX - startX) / travelSize.x
    const deltaY = (moveEvent.clientY - startY) / travelSize.y

    latestPosition = normalizeCamouflageWidgetPosition({
      x: startPosition.x + deltaX,
      y: startPosition.y + deltaY,
    })
    moved =
      moved ||
      Math.abs(moveEvent.clientX - startX) > 3 ||
      Math.abs(moveEvent.clientY - startY) > 3
    camouflageDragLatestPositionRef.current = latestPosition

    if (camouflageDragFrameRef.current !== null) {
      return
    }

    camouflageDragFrameRef.current = window.requestAnimationFrame(() => {
      camouflageDragFrameRef.current = null
      if (!camouflageDragLatestPositionRef.current) {
        return
      }

      setCamouflageWidgetPosition(camouflageDragLatestPositionRef.current)
    })
  }

  const finishDrag = () => {
    cleanup()
  }

  camouflageDragCleanupRef.current = cleanup
  event.preventDefault()
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', finishDrag)
  window.addEventListener('pointercancel', finishDrag)
}

const handleReaderShellMouseEnter = () => {
  if (isCamouflageFeatureActive && camouflageStage === 'collapsing') {
    clearCamouflageTimers()
    setCamouflageStage('expanded')
  }

  bossMode.handlePointerEnter()
  void OnMouseEnter()
}

const handleReaderShellMouseLeave = () => {
  void OnMouseLeave()

  if (isCamouflageFeatureActive) {
    startCamouflageCollapse()
    return
  }

  bossMode.handlePointerLeave()
}

const handleToggleCamouflage = () => {
  const nextEnabled = !bossCamouflageEnabled
  setBossCamouflageEnabled(nextEnabled)

  if (!nextEnabled) {
    clearCamouflageTimers()
    bossMode.revealImmediately()
    setCamouflageStage('expanded')
    setIsDraggingCamouflageWidget(false)
  }
}

  const handleOpenFile = async () => {
    try {
      const openedNovel = await openNovel('')
      const normalizedNovel = normalizeNovel(openedNovel)
      setCurrentNovel(normalizedNovel)
      addNovel(normalizedNovel)
      upsertBook(mapNovelToBook(normalizedNovel))
    } catch (error) {
      if (!isPickerCancelled(error)) {
        console.error('打开文件失败:', error)
      }
    }
  }

  useEffect(() => {
    if (!pendingRouteFilePath) {
      return
    }

    const nextRouteState: ReaderRouteState = {
      ...(routeState?.activateBossMode ? { activateBossMode: true } : {}),
      ...(returnDirectoryId ? { returnDirectoryId } : {}),
    }

    if (currentNovel?.filePath === pendingRouteFilePath) {
      navigate(location.pathname, {
        replace: true,
        state: Object.keys(nextRouteState).length > 0 ? nextRouteState : null,
      })
      return
    }

    let disposed = false

    const openRouteNovel = async () => {
      try {
        const openedNovel = await openNovel(pendingRouteFilePath)
        if (disposed) {
          return
        }

        const normalizedNovel = normalizeNovel(openedNovel)
        setCurrentNovel(normalizedNovel)
        addNovel(normalizedNovel)
        navigate(location.pathname, {
          replace: true,
          state: Object.keys(nextRouteState).length > 0 ? nextRouteState : null,
        })
      } catch (error) {
        if (disposed) {
          return
        }

        console.error('打开阅读内容失败:', error)
        navigate('/home', { replace: true })
      }
    }

    void openRouteNovel()

    return () => {
      disposed = true
    }
  }, [
    addNovel,
    currentNovel?.filePath,
    location.pathname,
    navigate,
    pendingRouteFilePath,
    returnDirectoryId,
    routeState?.activateBossMode,
    setCurrentNovel,
  ])

  const handleChapterChange = async (chapterIndex: number) => {
    if (!currentNovelRef.current) {
      return
    }

    await moveToReadingLocation(chapterIndex, 0, {
      preferSmooth: false,
      forceReloadWindow: true,
    })
  }

  const handlePrevChapter = () => {
    const novel = currentNovelRef.current
    if (!novel || novel.currentChapter <= 0) {
      return
    }

    void handleChapterChange(novel.currentChapter - 1)
  }

  const handleNextChapter = () => {
    const novel = currentNovelRef.current
    if (!novel) {
      return
    }

    if (novel.currentChapter >= novel.chapters.length - 1) {
      return
    }

    void handleChapterChange(novel.currentChapter + 1)
  }

  const handleSearch = async () => {
    if (!searchKeyword.trim() || !currentNovel) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchNovel(currentNovel.filePath, searchKeyword.trim(), false)
      setSearchResults(results || [])
    } catch (error) {
      console.error('搜索失败:', error)
    }
  }

  const jumpToSearchResult = async (result: SearchResult) => {
    if (!currentNovel) {
      return
    }

    const chapterIndex = findChapterIndexByPosition(currentNovel.chapters, result.position)
    const chapter = currentNovel.chapters[chapterIndex]
    const chapterLength = Math.max(chapter.endPos - chapter.startPos, 1)
    const localProgress = (result.position - chapter.startPos) / chapterLength

    setShowSearch(false)
    await moveToReadingLocation(chapterIndex, localProgress, {
      preferSmooth: false,
      forceReloadWindow: true,
    })
  }

  const handleBoundaryChapterLoad = async (direction: 'prev' | 'next') => {
    const novel = currentNovelRef.current
    if (!novel || boundaryChapterLoadingRef.current) {
      return
    }

    const targetChapterIndex =
      direction === 'next' ? novel.currentChapter + 1 : novel.currentChapter - 1
    if (targetChapterIndex < 0 || targetChapterIndex >= novel.chapters.length) {
      return
    }

    boundaryChapterLoadingRef.current = true
    boundaryChapterCooldownUntilRef.current = Date.now() + BOUNDARY_CHAPTER_SWITCH_COOLDOWN_MS
    setBoundaryLoadingDirection(direction)

    try {
      await moveToReadingLocation(targetChapterIndex, direction === 'next' ? 0 : 1, {
        preferSmooth: false,
        forceReloadWindow: true,
      })
    } finally {
      boundaryChapterLoadingRef.current = false
      setBoundaryLoadingDirection(null)
    }
  }

  const handleChapterProgressChange = async (nextPercent: number) => {
    const novel = currentNovelRef.current
    if (!novel) {
      return
    }

    await moveToReadingLocation(novel.currentChapter, nextPercent / 100, {
      preferSmooth: false,
      forceReloadWindow: true,
    })
  }

  // 在普通阅读和摸鱼模式之间切换，同时处理桌面浮窗与 WebView 内透明阅读两套实现。
  const handleToggleStealthMode = async () => {
    const nextStealthMode = !isStealthMode
    const rememberedBossOpacity = getPersistedBossOpacity(useSettingsStore.getState().bossOpacity)

    try {
      if (useDesktopOverlay) {
        if (nextStealthMode) {
          const { red, green, blue } = parseHexColor(textColor)
          const currentReadingLocation = resolveReaderReadingLocation()
          resetDesktopOverlayOpacitySync()
          setBossOpacity(rememberedBossOpacity)
          overlayReadingLocationRef.current = null

          if (currentReadingLocation) {
            applyReadingProgressState(
              currentReadingLocation.chapterIndex,
              currentReadingLocation.chapterScrollProgress,
              { updateTimestamp: true }
            )
          }

          await ShowDesktopReaderOverlay(
            currentChapterOverlayMarkup,
            Math.round(fontSize),
            lineHeight,
            rememberedBossOpacity,
            red,
            green,
            blue
          )
          await syncDesktopOverlayControls(rememberedBossOpacity)
          await syncDesktopOverlayReadingLocation(currentReadingLocation)
          overlayOpacityLastSentRef.current = rememberedBossOpacity
          setStealthMode(true)
          setOpacity(rememberedBossOpacity)
          setShowSearch(false)
          setShowSidebar(false)
          bossMode.closePanel()
        } else {
          flushBossOpacityPersist(useWindowStore.getState().opacity)
          resetDesktopOverlayOpacitySync()
          await captureDesktopOverlayReadingLocation()
          await HideDesktopReaderOverlay()
          setStealthMode(false)
          setOpacity(1)
          bossMode.closePanel()
          await flushOverlayReadingLocation({ syncReaderView: true })
        }

        return
      }

      if (nextStealthMode) {
        resetDesktopOverlayOpacitySync()
        setBossOpacity(rememberedBossOpacity)
        await EnableStealthMode()
        await SetOpacity(rememberedBossOpacity)
        setStealthMode(true)
        setOpacity(rememberedBossOpacity)
        bossMode.revealImmediately()
      } else {
        flushBossOpacityPersist(useWindowStore.getState().opacity)
        resetDesktopOverlayOpacitySync()
        await DisableStealthMode()
        setStealthMode(false)
        setOpacity(1)
        bossMode.closePanel()
      }
    } catch (error) {
      console.error('切换摸鱼模式失败:', error)
    }
  }

  const handleOpacityChange = async (
    value: number,
    options?: { desktopOverlayAlreadyApplied?: boolean }
  ) => {
    const nextOpacity = clampStealthOpacity(value)

    try {
      setOpacity(nextOpacity)
      scheduleBossOpacityPersist(nextOpacity)
      bossMode.bumpPanelTimer()

      if (useDesktopOverlay && isStealthMode) {
        if (!options?.desktopOverlayAlreadyApplied) {
          scheduleDesktopOverlayOpacitySync(nextOpacity)
        }
        return
      }

      resetDesktopOverlayOpacitySync()
      await SetOpacity(nextOpacity)
    } catch (error) {
      console.error('设置透明度失败:', error)
    }
  }

  const handleReturnHome = async () => {
    if (isStealthMode) {
      try {
        flushBossOpacityPersist(useWindowStore.getState().opacity)
        if (useDesktopOverlay) {
          resetDesktopOverlayOpacitySync()
          await captureDesktopOverlayReadingLocation()
          await HideDesktopReaderOverlay()
          await flushOverlayReadingLocation()
        } else {
          resetDesktopOverlayOpacitySync()
          await DisableStealthMode()
        }
        setStealthMode(false)
        setOpacity(1)
      } catch (error) {
        console.error('退出摸鱼模式失败:', error)
      }
    }

    navigate(returnDirectoryId ? `/home?directory=${encodeURIComponent(returnDirectoryId)}` : '/home')
  }


useEffect(() => {
  setCamouflageWidgetPosition(
    normalizeCamouflageWidgetPosition(bossCamouflageWidgetPosition)
  )
}, [bossCamouflageWidgetPosition.x, bossCamouflageWidgetPosition.y])

useEffect(() => {
  if (isCamouflageFeatureActive) {
    return
  }

  clearCamouflageTimers()
  if (camouflageDragCleanupRef.current) {
    camouflageDragCleanupRef.current()
  }
  setIsDraggingCamouflageWidget(false)

  if (camouflageStage !== 'expanded') {
    bossMode.revealImmediately()
    setCamouflageStage('expanded')
  }
}, [camouflageStage, isCamouflageFeatureActive])

  useEffect(
    () => () => {
      clearCamouflageTimers()
      clearBossOpacityPersistTimer()
      clearChapterWindowMaintainTimer()
      resetDesktopOverlayOpacitySync()
      if (camouflageDragCleanupRef.current) {
        camouflageDragCleanupRef.current()
      }
  },
  []
)

  useEffect(() => {
    currentNovelRef.current = currentNovel
  }, [currentNovel])

  useEffect(() => {
    loadedChaptersRef.current = loadedChapters
  }, [loadedChapters])

  useEffect(() => {
    if (!currentNovel) {
      resetLoadedChapterState()
      setSearchResults([])
      return
    }

    const initialChapterIndex = currentNovel.currentChapter || 0
    const initialChapterProgress = deriveChapterProgressFromOverall(
      currentNovel,
      initialChapterIndex
    )
    const nextRevision = resetLoadedChapterState()

    pendingChapterScrollRef.current = {
      chapterIndex: initialChapterIndex,
      chapterScrollProgress: initialChapterProgress,
      behavior: 'auto',
    }

    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }

    void ensureChapterLoaded(currentNovel.filePath, initialChapterIndex, nextRevision)
      .catch((error) => {
        if (nextRevision === chapterLoadRevisionRef.current) {
          console.error('初始化章节内容失败:', error)
        }
      })
  }, [currentNovel?.filePath])

  useEffect(() => {
    if (!pendingChapterScrollRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      tryApplyPendingChapterScroll()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [loadedChapters, fontSize, lineHeight, pageWidth])

  useEffect(() => {
    if (!showSidebar || !currentNovel) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const activeChapterIndex =
        currentNovelRef.current?.currentChapter ?? currentNovel.currentChapter
      chapterItemRefs.current[activeChapterIndex]?.scrollIntoView({
        block: 'center',
        behavior: 'auto',
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [showSidebar, currentNovel?.filePath, currentNovel?.currentChapter])

  useEffect(() => {
    if (!useDesktopOverlay || !isStealthMode || !currentNovel) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return
      }

      const preloadDesktopOverlayChapters = async () => {
        const prefetchAhead = getDesktopOverlayPrefetchAhead(currentNovel.format)
        const targetChapterIndex = Math.min(
          currentNovel.chapters.length - 1,
          currentNovel.currentChapter + prefetchAhead
        )

        for (
          let chapterIndex = currentNovel.currentChapter;
          chapterIndex <= targetChapterIndex;
          chapterIndex += 1
        ) {
          if (cancelled) {
            return
          }

          try {
            await ensureChapterLoaded(currentNovel.filePath, chapterIndex)
          } catch (error) {
            if (!cancelled) {
              console.error('预加载摸鱼模式后续章节失败:', error)
            }
            return
          }
        }
      }

      void preloadDesktopOverlayChapters()
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    useDesktopOverlay,
    isStealthMode,
    currentNovel?.filePath,
    currentNovel?.currentChapter,
    currentNovel?.format,
  ])

  useEffect(() => {
    let disposed = false

    const detectDesktopOverlay = async () => {
      try {
        const supported = await SupportsDesktopReaderOverlay()
        if (!disposed) {
          setSupportsDesktopOverlay(Boolean(supported))
        }
      } catch {
        if (!disposed) {
          setSupportsDesktopOverlay(false)
        }
      }
    }

    void detectDesktopOverlay()

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    if (!currentNovel || !shouldActivateBossMode || isStealthMode) {
      return
    }

    void handleToggleStealthMode()
    navigate(location.pathname, {
      replace: true,
      state: returnDirectoryId ? { returnDirectoryId } : null,
    })
  }, [
    currentNovel,
    handleToggleStealthMode,
    isStealthMode,
    location.pathname,
    navigate,
    returnDirectoryId,
    shouldActivateBossMode,
  ])

  useEffect(() => {
    setReaderStealthRoot(isWebviewStealthMode)

    return () => {
      setReaderStealthRoot(false)
    }
  }, [isWebviewStealthMode])

  useEffect(() => {
    return () => {
      setReaderStealthRoot(false)
      clearOverlayReadingSaveTimer()

      const windowState = useWindowStore.getState()
      if (!windowState.isStealthMode && windowState.opacity === 1) {
        return
      }

      flushBossOpacityPersist(windowState.opacity)
      resetDesktopOverlayOpacitySync()
      windowState.setStealthMode(false)
      windowState.setOpacity(1)

      if (useDesktopOverlay) {
        void HideDesktopReaderOverlay().catch((error) => {
          console.error('清理桌面浮窗失败:', error)
        })
        return
      }

      void DisableStealthMode().catch((error) => {
        console.error('清理阅读摸鱼模式失败:', error)
      })
    }
  }, [useDesktopOverlay])

  useEffect(() => {
    if (!showAppearancePanel) {
      return
    }

    if (isWebviewStealthMode || !bossMode.isChromeVisible) {
      setShowAppearancePanel(false)
    }
  }, [bossMode.isChromeVisible, isWebviewStealthMode, showAppearancePanel])

  useEffect(() => {
    if (!useDesktopOverlay || !isStealthMode || !currentNovel) {
      return
    }

    void syncDesktopOverlay()
  }, [
    fontSize,
    currentNovel?.filePath,
    lineHeight,
    overlayChapterMarkup,
    textColor,
    useDesktopOverlay,
    isStealthMode,
  ])

  useEffect(() => {
    if (!useDesktopOverlay || !isStealthMode || !currentNovel) {
      return
    }

    void syncDesktopOverlayControls()
  }, [
    currentNovel?.filePath,
    bossCamouflageEnabled,
    overlayChapterTitlesSignature,
    useDesktopOverlay,
    isStealthMode,
  ])

  useEffect(() => {
    if (!useDesktopOverlay) {
      return
    }

    const syncOverlayState = async () => {
      try {
        const isOverlayVisible = await IsDesktopReaderOverlayVisible()
        if (isOverlayVisible || !useWindowStore.getState().isStealthMode) {
          return
        }

        flushBossOpacityPersist(useWindowStore.getState().opacity)
        resetDesktopOverlayOpacitySync()
        await captureDesktopOverlayReadingLocation()
        await HideDesktopReaderOverlay()
        setStealthMode(false)
        setOpacity(1)
        bossMode.closePanel()
        await flushOverlayReadingLocation({ syncReaderView: true })
      } catch (error) {
        console.error('同步桌面浮窗状态失败:', error)
      }
    }

    const handleWindowReturn = () => {
      if (document.hidden) {
        return
      }

      void syncOverlayState()
    }

    window.addEventListener('focus', handleWindowReturn)
    document.addEventListener('visibilitychange', handleWindowReturn)

    return () => {
      window.removeEventListener('focus', handleWindowReturn)
      document.removeEventListener('visibilitychange', handleWindowReturn)
    }
  }, [bossMode, setOpacity, setStealthMode, useDesktopOverlay])

  useEffect(() => {
    if (!useDesktopOverlay || !isStealthMode) {
      return
    }

    const timer = window.setInterval(() => {
      if (overlayActionPollingRef.current) {
        return
      }

      overlayActionPollingRef.current = true
      void ConsumeDesktopReaderOverlayActions()
        .then(async (rawPayload) => {
          if (!rawPayload) {
            return
          }

          let actions: DesktopOverlayAction[] = []
          try {
            actions = JSON.parse(rawPayload) as DesktopOverlayAction[]
          } catch (error) {
            console.error('解析原生浮窗动作失败:', error)
            return
          }

          logDesktopOverlayDebug('consume actions', actions)

          for (const action of actions) {
            if (action.type === 'prev') {
              handlePrevChapter()
            } else if (action.type === 'next') {
              handleNextChapter()
            } else if (action.type === 'chapter' && typeof action.chapterIndex === 'number') {
              await handleChapterChange(action.chapterIndex)
            } else if (
              action.type === 'position' &&
              typeof action.chapterIndex === 'number' &&
              typeof action.value === 'number'
            ) {
              rememberOverlayReadingLocation(
                action.chapterIndex,
                clampUnitInterval(action.value)
              )
            } else if (action.type === 'opacity' && typeof action.value === 'number') {
              await handleOpacityChange(action.value, {
                desktopOverlayAlreadyApplied: true,
              })
            } else if (action.type === 'camouflage') {
              setBossCamouflageEnabled(Boolean(action.value))
            } else if (action.type === 'close') {
              flushBossOpacityPersist(useWindowStore.getState().opacity)
              resetDesktopOverlayOpacitySync()
              await captureDesktopOverlayReadingLocation()
              await HideDesktopReaderOverlay()
              setStealthMode(false)
              setOpacity(1)
              bossMode.closePanel()
              await flushOverlayReadingLocation({ syncReaderView: true })
            }
          }
        })
        .catch((error) => {
          console.error('读取原生浮窗动作失败:', error)
        })
        .finally(() => {
          overlayActionPollingRef.current = false
        })
    }, 120)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    bossMode,
    currentNovel,
    handleChapterChange,
    handleOpacityChange,
    handleNextChapter,
    handlePrevChapter,
    isStealthMode,
    setOpacity,
    setStealthMode,
    useDesktopOverlay,
  ])

  useEffect(() => {
    if (!hasWailsRuntimeEvents()) {
      return
    }

    const offStealthMode = EventsOn('window:stealthMode', (enabled: boolean) => {
      setStealthMode(Boolean(enabled))
    })
    const offOpacity = EventsOn('window:opacity', (nextOpacity: number) => {
      const normalizedOpacity = clampStealthOpacity(Number(nextOpacity))
      setOpacity(normalizedOpacity)
      if (useWindowStore.getState().isStealthMode && Number(nextOpacity) < 1) {
        scheduleBossOpacityPersist(normalizedOpacity)
      }
    })

    return () => {
      offStealthMode()
      offOpacity()
    }
  }, [setOpacity, setStealthMode])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (matchesShortcut(event, keyboardShortcuts.prevChapter) && !isTypingTarget) {
        event.preventDefault()
        handlePrevChapter()
      } else if (matchesShortcut(event, keyboardShortcuts.nextChapter) && !isTypingTarget) {
        event.preventDefault()
        handleNextChapter()
      } else if (matchesShortcut(event, keyboardShortcuts.openSearch)) {
        event.preventDefault()
        setShowSearch(true)
      } else if (matchesShortcut(event, keyboardShortcuts.toggleBossMode) && !isTypingTarget) {
        event.preventDefault()
        void handleToggleStealthMode()
      } else if (matchesShortcut(event, keyboardShortcuts.goHome) && !isTypingTarget) {
        event.preventDefault()
        void handleReturnHome()
      } else if (matchesShortcut(event, keyboardShortcuts.quickHide) && isStealthMode) {
        event.preventDefault()
        setShowSearch(false)
        setShowSidebar(false)
        setShowAppearancePanel(false)

        if (isCamouflageFeatureActive) {
          startCamouflageCollapse()
          return
        }

        bossMode.concealImmediately()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [bossMode, bossOpacity, currentNovel, handleReturnHome, isStealthMode, keyboardShortcuts])

  useEffect(() => {
    const contentElement = contentRef.current
    if (!contentElement || !currentNovel) {
      return
    }

    const handleScroll = () => {
      if (scrollTickingRef.current) {
        return
      }

      scrollTickingRef.current = true
      window.requestAnimationFrame(() => {
        scrollTickingRef.current = false

        if (skipNextScrollSyncRef.current) {
          skipNextScrollSyncRef.current = false
          return
        }

        const readingLocation = syncActiveChapterFromReadingLocation()
        if (!readingLocation) {
          return
        }

        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current)
        }

        saveTimerRef.current = window.setTimeout(() => {
          const latestReadingLocation = resolveCurrentReadingLocation()
          if (!latestReadingLocation) {
            return
          }

          void persistReadingProgress(
            latestReadingLocation.chapterIndex,
            latestReadingLocation.chapterScrollProgress
          )
        }, 240)
      })
    }

    const handleWheel = (event: WheelEvent) => {
      if (boundaryChapterLoadingRef.current) {
        event.preventDefault()
        return
      }

      if (Date.now() < boundaryChapterCooldownUntilRef.current) {
        event.preventDefault()
        return
      }

      const novel = currentNovelRef.current
      if (!novel) {
        return
      }

      const atTop = contentElement.scrollTop <= 2
      const atBottom =
        contentElement.scrollTop + contentElement.clientHeight >= contentElement.scrollHeight - 2

      if (event.deltaY > 0 && atBottom && novel.currentChapter < novel.chapters.length - 1) {
        event.preventDefault()
        void handleBoundaryChapterLoad('next')
      } else if (event.deltaY < 0 && atTop && novel.currentChapter > 0) {
        event.preventDefault()
        void handleBoundaryChapterLoad('prev')
      }
    }

    contentElement.addEventListener('scroll', handleScroll, { passive: true })
    contentElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      contentElement.removeEventListener('scroll', handleScroll)
      contentElement.removeEventListener('wheel', handleWheel)
      scrollTickingRef.current = false
      clearOverlayReadingSaveTimer()
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [currentNovel?.filePath, loadedChapters.length])

  if (isSwitchingRouteNovel || (!currentNovel && pendingRouteFilePath)) {
    return (
      <div className={styles.empty}>
        <p>正在打开阅读内容...</p>
      </div>
    )
  }

  if (!currentNovel) {
    return (
      <div className={styles.empty}>
        <p>请先从书架导入或打开一本小说</p>
        <button onClick={handleOpenFile} className={styles.openButton}>
          打开小说文件
        </button>
      </div>
    )
  }


return (
  <div
    className={`${styles.reader} ${isWebviewStealthMode ? styles.stealthMode : ''}`}
    style={{
      backgroundColor: isWebviewStealthMode ? 'transparent' : backgroundColor,
      color: textColor,
    }}
  >
    {(!isCamouflageFeatureActive || camouflageStage !== 'collapsed') && (
      <div
        className={readerShellClassName}
        style={readerShellStyle}
        onMouseEnter={handleReaderShellMouseEnter}
        onMouseLeave={handleReaderShellMouseLeave}
        onMouseMove={bossMode.bumpPanelTimer}
        onContextMenu={bossMode.handleContextMenu}
      >
        <div
          className={`${styles.toolbar} ${
            !bossMode.isChromeVisible ? styles.chromeHidden : ''
          }`}
        >
          <div className={styles.toolbarLeft}>
            <button
              type="button"
              onClick={() => void handleReturnHome()}
              className={`${styles.toolbarButton} ${styles.backButton}`}
              title={returnDirectoryId ? '返回目录' : '返回书架'}
            >
              <span>{returnDirectoryId ? '返回目录' : '返回书架'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSidebar((value) => !value)}
              className={styles.toolbarButton}
              title="目录"
            >
              目录
            </button>
            <div className={styles.chapterMeta}>
              <span className={styles.chapterInfo}>
                {currentChapter?.title || '正文'} ({currentNovel.currentChapter + 1} /{' '}
                {currentNovel.chapters.length})
              </span>
              <span className={styles.bookInfo}>{currentNovel.title}</span>
            </div>
          </div>
          <div className={styles.toolbarCenter}>
            <button
              type="button"
              onClick={handlePrevChapter}
              className={styles.toolbarButton}
              disabled={currentNovel.currentChapter <= 0}
              title="上一章"
            >
              上一章
            </button>
            <button
              type="button"
              onClick={handleNextChapter}
              className={styles.toolbarButton}
              disabled={currentNovel.currentChapter >= currentNovel.chapters.length - 1}
              title="下一章"
            >
              下一章
            </button>
          </div>

          <div className={styles.toolbarRight}>
            {!isWebviewStealthMode && (
              <div ref={appearancePanelRef} className={styles.toolbarPopover}>
                <button
                  type="button"
                  onClick={() => setShowAppearancePanel((value) => !value)}
                  className={`${styles.toolbarButton} ${
                    showAppearancePanel ? styles.active : ''
                  }`}
                  title="阅读外观"
                >
                  外观
                </button>
                {showAppearancePanel && bossMode.isChromeVisible && (
                  <div className={styles.appearancePanel}>
                    <div className={styles.appearancePanelHeader}>
                      <span>阅读外观</span>
                      <button
                        type="button"
                        onClick={() => setShowAppearancePanel(false)}
                        className={styles.panelCloseButton}
                      >
                        收起
                      </button>
                    </div>
                    <div className={styles.appearancePanelBody}>
                      <ReadingAppearanceControls
                        variant="panel"
                        fontSize={fontSize}
                        fontFamily={fontFamily}
                        lineHeight={lineHeight}
                        pageWidth={pageWidth}
                        backgroundColor={backgroundColor}
                        textColor={textColor}
                        onFontSizeChange={setFontSize}
                        onFontFamilyChange={setFontFamily}
                        onLineHeightChange={setLineHeight}
                        onPageWidthChange={setPageWidth}
                        pageWidthCommitOnRelease
                        onBackgroundColorChange={setBackgroundColor}
                        onTextColorChange={setTextColor}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className={styles.toolbarButton}
              title="搜索 (Ctrl+F)"
            >
              搜索
            </button>
            <button
              type="button"
              onClick={() => void handleToggleStealthMode()}
              className={`${styles.toolbarButton} ${isStealthMode ? styles.active : ''}`}
              title="摸鱼模式"
            >
              {isStealthMode ? '退出摸鱼' : '摸鱼模式'}
            </button>
            {isWebviewStealthMode && (
              <button
                type="button"
                onClick={handleToggleCamouflage}
                className={`${styles.toolbarButton} ${
                  bossCamouflageEnabled ? styles.active : ''
                }`}
                title="收纳伪装"
              >
                收纳伪装
              </button>
            )}
            {isWebviewStealthMode && (
              <input
                type="range"
                min="0.02"
                max="1"
                step="0.02"
                value={opacityToTransparencySliderValue(activeStealthOpacity)}
                onChange={(event) =>
                  handleOpacityChange(transparencySliderValueToOpacity(Number(event.target.value)))
                }
                className={styles.opacitySlider}
                title="内容透明度"
              />
            )}
          </div>
        </div>
        {showSidebar && bossMode.isChromeVisible && (
          <aside ref={sidebarRef} className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h3>目录</h3>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className={styles.closeButton}
              >
                关闭
              </button>
            </div>
            <div ref={chapterListRef} className={styles.chapterList}>
              {currentNovel.chapters.map((chapter, index) => (
                <button
                  key={`${chapter.title}-${chapter.index}`}
                  ref={(element) => {
                    chapterItemRefs.current[index] = element
                  }}
                  className={`${styles.chapterItem} ${
                    index === currentNovel.currentChapter ? styles.active : ''
                  }`}
                  onClick={() => void handleChapterChange(index)}
                >
                  <span className={styles.chapterItemTitle}>{chapter.title}</span>
                  <span className={styles.chapterItemMeta}>{chapter.wordCount} 字</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {showSearch && bossMode.isChromeVisible && (
          <aside className={styles.searchPanel}>
            <div className={styles.searchHeader}>
              <h3>全文搜索</h3>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className={styles.closeButton}
              >
                关闭
              </button>
            </div>
            <div className={styles.searchInput}>
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="输入搜索关键字"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSearch()
                  }
                }}
              />
              <button type="button" onClick={() => void handleSearch()} className={styles.searchButton}>
                搜索
              </button>
            </div>
            <div className={styles.searchResults}>
              <p>{searchResults.length > 0 ? `找到 ${searchResults.length} 个匹配` : '暂无结果'}</p>
              {searchResults.map((result, index) => {
                const chapterIndex = findChapterIndexByPosition(
                  currentNovel.chapters,
                  result.position
                )
                const chapterTitle = currentNovel.chapters[chapterIndex]?.title || '正文'

                return (
                  <button
                    key={`${result.position}-${index}`}
                    className={styles.searchResultItem}
                    onClick={() => void jumpToSearchResult(result)}
                  >
                    <span className={styles.searchResultMeta}>
                      {chapterTitle} · 第 {result.line} 行
                    </span>
                    <span className={styles.searchResultText}>{result.context}</span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}

        <div
          ref={contentRef}
          className={`${styles.content} ${
            bossMode.isConcealed ? styles.contentConcealed : ''
          }`}
          style={contentStyle}
        >
          <div className={styles.contentBody} style={{ opacity: displayOpacity }}>
            {boundaryLoadingDirection === 'prev' && (
              <div className={styles.inlineLoading}>正在回到上一章末尾...</div>
            )}
            {isInitialChapterLoading ? (
              <div className={styles.loading}>章节内容加载中...</div>
            ) : (
              <ReaderChapterList
                chapters={currentNovel.chapters}
                loadedChapters={loadedChapters}
                format={currentNovel.format}
                searchKeyword={searchKeyword}
                isAppendingChapters={isAppendingChapters}
                chapterSectionRefs={chapterSectionRefs}
              />
            )}
            {boundaryLoadingDirection === 'next' && (
              <div className={styles.inlineLoading}>下一章加载中...</div>
            )}
          </div>
        </div>

        {isWebviewStealthMode && bossMode.isConcealed && (
          <div className={styles.concealedHint}>悬停唤出阅读内容</div>
        )}

        {isWebviewStealthMode && bossMode.isPanelOpen && (
          <div
            ref={bossPanelRef}
            className={styles.bossPanel}
            style={{
              left: `${Math.min(bossMode.panelPosition.x, window.innerWidth - 260)}px`,
              top: `${Math.min(bossMode.panelPosition.y, window.innerHeight - 280)}px`,
            }}
            onMouseEnter={bossMode.bumpPanelTimer}
            onMouseMove={bossMode.bumpPanelTimer}
          >
            <div className={styles.bossPanelHeader}>
              <span>隐身控制</span>
              <button
                type="button"
                onClick={bossMode.closePanel}
                className={styles.panelCloseButton}
              >
                收起
              </button>
            </div>

            <div className={styles.bossPanelSection}>
              <span className={styles.bossPanelLabel}>当前模式</span>
              <div className={styles.segmented}>
                <button
                  className={`${styles.segmentButton} ${
                    bossModeType === 'basic' ? styles.segmentActive : ''
                  }`}
                  onClick={() => setBossModeType('basic')}
                >
                  基础
                </button>
                <button
                  className={`${styles.segmentButton} ${
                    bossModeType === 'full' ? styles.segmentActive : ''
                  }`}
                  onClick={() => setBossModeType('full')}
                >
                  完全
                </button>
              </div>
            </div>

            <div className={styles.bossPanelSection}>
              <span className={styles.bossPanelLabel}>
                内容透明度 {opacityToTransparencySliderValue(activeStealthOpacity).toFixed(2)}
              </span>
              <input
                type="range"
                min="0.02"
                max="1"
                step="0.02"
                value={opacityToTransparencySliderValue(activeStealthOpacity)}
                onChange={(event) =>
                  handleOpacityChange(transparencySliderValueToOpacity(Number(event.target.value)))
                }
                className={styles.panelSlider}
              />
            </div>

            <div className={styles.bossPanelSection}>
              <span className={styles.bossPanelLabel}>唤出延迟 {bossRevealDelay}ms</span>
              <input
                type="range"
                min="0"
                max="400"
                step="20"
                value={bossRevealDelay}
                onChange={(event) => setBossRevealDelay(Number(event.target.value))}
                className={styles.panelSlider}
              />
            </div>

            <div className={styles.bossPanelSection}>
              <span className={styles.bossPanelLabel}>隐藏延迟 {bossHideDelay}ms</span>
              <input
                type="range"
                min="80"
                max="1200"
                step="40"
                value={bossHideDelay}
                onChange={(event) => setBossHideDelay(Number(event.target.value))}
                className={styles.panelSlider}
              />
            </div>

            <div className={styles.bossPanelActions}>
              <button
                type="button"
                className={styles.panelActionButton}
                onClick={handleToggleCamouflage}
              >
                {bossCamouflageEnabled ? '关闭收纳伪装' : '开启收纳伪装'}
              </button>
              <button
                type="button"
                className={styles.panelActionButton}
                onClick={() => bossMode.pinVisible(!bossMode.isForceVisible)}
              >
                {bossMode.isForceVisible ? '取消常显' : '锁定常显'}
              </button>
              <button
                type="button"
                className={styles.panelActionButton}
                onClick={bossMode.concealImmediately}
              >
                立即隐藏
              </button>
              <button
                type="button"
                className={styles.panelActionButton}
                onClick={() => void handleToggleStealthMode()}
              >
                退出模式
              </button>
            </div>
          </div>
        )}

        <footer
          className={`${styles.footer} ${
            !bossMode.isChromeVisible ? styles.chromeHidden : ''
          }`}
        >
          <Slider
            min={0}
            max={100}
            step={1}
            value={currentChapterProgressPercent}
            onChange={(value) => {
              void handleChapterProgressChange(value)
            }}
            commitOnRelease
            showValue={false}
            className={styles.readerProgressSlider}
          />
          <div className={styles.progressInfo}>
            <span>章节进度 {Math.round(currentChapterProgressPercent)}%</span>
            <span>章节 {currentNovel.currentChapter + 1} / {currentNovel.chapters.length}</span>
            <span>{currentChapter?.wordCount || 0} 字</span>
          </div>
        </footer>
      </div>
    )}

    {showCamouflageWidget && (
      <CamouflagePendant
        className={camouflageWidgetClassName}
        style={camouflageWidgetStyle}
        title="伪装中"
        subtitle={isDraggingCamouflageWidget ? '拖动挂件位置' : '双击展开阅读框'}
        dragging={isDraggingCamouflageWidget}
        onDoubleClick={restoreCamouflageReader}
        onPointerDown={handleCamouflageWidgetPointerDown}
      />
    )}
  </div>
)

}

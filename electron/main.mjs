import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const rendererDevUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'
const rendererDistPath = path.join(repoRoot, 'frontend', 'dist', 'index.html')
const overlayHtmlPath = path.join(__dirname, 'overlay.html')
const serverPort = Number(process.env.MOYUREADER_SERVER_PORT || 18767)
const serverBaseUrl = `http://127.0.0.1:${serverPort}`

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {BrowserWindow | null} */
let overlayWindow = null
/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null
const windowState = {
  opacity: 1,
  isStealthMode: false,
  isDesktopOverlayVisible: false,
}
// 浮窗自身维护的最小状态，用于和主阅读页做低频同步。
const overlayState = {
  actionQueue: [],
  readingLocation: {
    chapterIndex: 0,
    progress: 0,
  },
  content: null,
  controls: null,
  dragSession: null,
}

function resetOverlayActionQueue() {
  overlayState.actionQueue = []
}

function resetOverlayState(options = {}) {
  const preserveReadingLocation = Boolean(options.preserveReadingLocation)
  resetOverlayActionQueue()
  if (!preserveReadingLocation) {
    overlayState.readingLocation = {
      chapterIndex: 0,
      progress: 0,
    }
  }
  overlayState.content = null
  overlayState.controls = null
  overlayState.dragSession = null
}

function resolveOverlayReadableTextColor(red, green, blue) {
  const normalizedRed = Number(red || 0)
  const normalizedGreen = Number(green || 0)
  const normalizedBlue = Number(blue || 0)
  const luminance =
    (0.299 * normalizedRed + 0.587 * normalizedGreen + 0.114 * normalizedBlue) / 255

  if (luminance < 0.62) {
    return 'rgba(244,247,252,0.98)'
  }

  return `rgba(${normalizedRed}, ${normalizedGreen}, ${normalizedBlue}, 1)`
}

function writeOverlayDebugSnapshot(name, payload) {
  try {
    const debugDir = path.join(repoRoot, '.debug')
    fs.mkdirSync(debugDir, { recursive: true })
    const filePath = path.join(debugDir, name)
    fs.writeFileSync(filePath, String(payload || ''), 'utf8')
  } catch (error) {
    console.error('写入浮窗调试文件失败:', error)
  }
}

function normalizeOverlayContentPayload(payload) {
  const html = String(payload?.html ?? payload?.text ?? '')

  return {
    ...payload,
    html,
  }
}

function emitRendererEvent(channel, payload) {
  mainWindow?.webContents.send(`desktop:event:${channel}`, payload)
}

function sendOverlayState(payload) {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return
  }

  overlayWindow.webContents.send('overlay:state', payload)
}

function enqueueOverlayAction(action) {
  if (action?.type === 'opacity') {
    const nextOpacity = Math.max(0.02, Math.min(1, Number(action.value || windowState.opacity)))
    windowState.opacity = nextOpacity
    if (overlayState.content) {
      overlayState.content.opacity = nextOpacity
    }
    if (overlayState.controls) {
      overlayState.controls.opacity = nextOpacity
    }
    sendOverlayState({
      type: 'opacity',
      opacity: nextOpacity,
    })
  }

  emitRendererEvent('desktopOverlay:actions', [action])

  if (action?.type === 'close') {
    resetOverlayActionQueue()
    void hideOverlayWindow({ preserveState: true })
    return
  }

  const previousAction = overlayState.actionQueue[overlayState.actionQueue.length - 1]
  if (previousAction && previousAction.type === action.type && action.type === 'opacity') {
    overlayState.actionQueue[overlayState.actionQueue.length - 1] = action
    return
  }

  if (
    previousAction &&
    previousAction.type === action.type &&
    action.type === 'position' &&
    previousAction.chapterIndex === action.chapterIndex
  ) {
    overlayState.actionQueue[overlayState.actionQueue.length - 1] = action
    return
  }

  overlayState.actionQueue.push(action)
}

async function ensureOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }

  overlayWindow = new BrowserWindow({
    width: 620,
    height: 320,
    minWidth: 520,
    minHeight: 220,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    fullscreenable: false,
    skipTaskbar: true,
    title: '墨鱼阅读器摸鱼浮窗',
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
    windowState.isDesktopOverlayVisible = false
    resetOverlayActionQueue()
  })

  overlayWindow.on('show', () => {
    windowState.isDesktopOverlayVisible = true
  })

  overlayWindow.on('hide', () => {
    windowState.isDesktopOverlayVisible = false
  })

  overlayWindow.on('focus', () => {
    windowState.isDesktopOverlayVisible = true
  })

  overlayWindow.on('blur', () => {
    windowState.isDesktopOverlayVisible = Boolean(overlayWindow?.isVisible())
  })

  await overlayWindow.loadFile(overlayHtmlPath)
  return overlayWindow
}

async function hideOverlayWindow(options = {}) {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    windowState.isDesktopOverlayVisible = false
    if (!options.preserveState) {
      resetOverlayState({ preserveReadingLocation: true })
    }
    return
  }

  overlayWindow.hide()
  windowState.isDesktopOverlayVisible = false
  if (!options.preserveState) {
    resetOverlayState({ preserveReadingLocation: true })
  }

  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
    mainWindow.show()
    mainWindow.focus()
  }
}

async function waitForServerReady() {
  const maxAttempts = 80

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${serverBaseUrl}/health`)
      if (response.ok) {
        return
      }
    } catch {
      // Ignore and retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Go API 服务启动超时')
}

function startGoServer() {
  if (serverProcess) {
    return
  }

  const serverBinary = process.env.MOYUREADER_SERVER_BIN
  const command = serverBinary || 'go'
  const args = serverBinary
    ? ['--port', String(serverPort)]
    : ['run', './cmd/moyureader-server', '--port', String(serverPort)]

  serverProcess = spawn(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      MOYUREADER_SERVER_PORT: String(serverPort),
    },
    stdio: 'inherit',
  })

  serverProcess.on('exit', (code) => {
    serverProcess = null
    if (!app.isQuitting && code !== 0) {
      console.error(`Go API 服务异常退出，code=${code ?? 'null'}`)
    }
  })
}

async function callServer(endpoint, init = {}) {
  const response = await fetch(`${serverBaseUrl}${endpoint}`, {
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  })

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `请求失败: ${response.status}`)
  }

  return payload.data
}

async function createMainWindow() {
  startGoServer()
  await waitForServerReady()

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    backgroundColor: '#00ffffff',
    title: '墨鱼阅读器',
    transparent: true,
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (!app.isPackaged) {
    await mainWindow.loadURL(rendererDevUrl)
  } else {
    await mainWindow.loadFile(rendererDistPath)
  }

  mainWindow.webContents.once('did-finish-load', () => {
    emitRendererEvent('app:ready', {
      serverBaseUrl,
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('hide', () => {
    if (windowState.isStealthMode && overlayWindow?.isVisible()) {
      return
    }

    void hideOverlayWindow({ preserveState: true })
  })

  mainWindow.on('minimize', () => {
    if (windowState.isStealthMode && overlayWindow?.isVisible()) {
      return
    }

    void hideOverlayWindow({ preserveState: true })
  })
}

function registerIpcHandlers() {
  ipcMain.on('overlay:action', (_event, action) => {
    if (action && typeof action === 'object') {
      enqueueOverlayAction(action)
    }
  })
  ipcMain.on('overlay:reading-location', (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      return
    }

    const chapterIndex = Number(payload.chapterIndex || 0)
    const progress = Math.max(0, Math.min(1, Number(payload.progress || 0)))
    overlayState.readingLocation = { chapterIndex, progress }
  })
  ipcMain.on('overlay:visible', (_event, payload) => {
    windowState.isDesktopOverlayVisible = Boolean(payload?.visible)
  })
  ipcMain.on('overlay:startDrag', (_event, payload) => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !payload || typeof payload !== 'object') {
      return
    }

    overlayState.dragSession = {
      startBounds: overlayWindow.getBounds(),
      startScreenX: Number(payload.screenX || 0),
      startScreenY: Number(payload.screenY || 0),
    }
  })
  ipcMain.on('overlay:dragMove', (_event, payload) => {
    if (
      !overlayWindow ||
      overlayWindow.isDestroyed() ||
      !overlayState.dragSession ||
      !payload ||
      typeof payload !== 'object'
    ) {
      return
    }

    const deltaX = Number(payload.screenX || 0) - overlayState.dragSession.startScreenX
    const deltaY = Number(payload.screenY || 0) - overlayState.dragSession.startScreenY
    overlayWindow.setBounds({
      x: Math.round(overlayState.dragSession.startBounds.x + deltaX),
      y: Math.round(overlayState.dragSession.startBounds.y + deltaY),
      width: overlayState.dragSession.startBounds.width,
      height: overlayState.dragSession.startBounds.height,
    })
  })
  ipcMain.on('overlay:endDrag', () => {
    overlayState.dragSession = null
  })
  ipcMain.handle('overlay:getBounds', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return null
    }

    return overlayWindow.getBounds()
  })
  ipcMain.handle('overlay:setBounds', (_event, bounds) => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !bounds || typeof bounds !== 'object') {
      return
    }

    const currentBounds = overlayWindow.getBounds()
    overlayWindow.setBounds({
      x: Number.isFinite(bounds.x) ? Math.round(bounds.x) : currentBounds.x,
      y: Number.isFinite(bounds.y) ? Math.round(bounds.y) : currentBounds.y,
      width: Number.isFinite(bounds.width)
        ? Math.max(520, Math.round(bounds.width))
        : currentBounds.width,
      height: Number.isFinite(bounds.height)
        ? Math.max(220, Math.round(bounds.height))
        : currentBounds.height,
    })
  })

  ipcMain.handle('desktop:app:getConfig', () => callServer('/api/config'))
  ipcMain.handle('desktop:app:setDataDir', (_event, dataDir) =>
    callServer('/api/config/data-dir', {
      method: 'POST',
      body: JSON.stringify({ dataDir }),
    })
  )
  ipcMain.handle('desktop:app:selectDataDir', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: '选择应用数据目录',
      properties: ['openDirectory', 'createDirectory'],
    })

    return result.canceled ? '' : result.filePaths[0] || ''
  })
  ipcMain.handle('desktop:app:selectNovelFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: '选择小说文件',
      properties: ['openFile'],
      filters: [
        {
          name: '支持的文件',
          extensions: ['txt', 'epub', 'pdf', 'mobi', 'azw3'],
        },
      ],
    })

    return result.canceled ? '' : result.filePaths[0] || ''
  })

  ipcMain.handle('desktop:novel:open', (_event, filePath) =>
    callServer('/api/novels/open', {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    })
  )
  ipcMain.handle('desktop:novel:saveReadingProgress', (_event, payload) =>
    callServer('/api/novels/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  )
  ipcMain.handle('desktop:novel:setCurrentChapter', (_event, payload) =>
    callServer('/api/novels/current-chapter', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  )
  ipcMain.handle('desktop:novel:search', (_event, payload) =>
    callServer('/api/novels/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  )
  ipcMain.handle('desktop:novel:getChapterContentPayload', (_event, payload) =>
    callServer('/api/novels/chapter-content', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  )

  ipcMain.handle('desktop:progress:delete', (_event, filePath) =>
    callServer(`/api/progress?filePath=${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    })
  )

  ipcMain.handle('desktop:window:supportsDesktopReaderOverlay', () => process.platform === 'darwin')
  ipcMain.handle('desktop:window:showDesktopReaderOverlay', async (_event, payload) => {
    const win = await ensureOverlayWindow()
    const normalizedPayload = normalizeOverlayContentPayload(payload)
    resetOverlayActionQueue()
    overlayState.content = normalizedPayload
    writeOverlayDebugSnapshot('overlay-last-sent.html', normalizedPayload.html)
    writeOverlayDebugSnapshot(
      'overlay-last-sent.json',
      JSON.stringify(
        {
          fontSize: normalizedPayload?.fontSize,
          lineHeight: normalizedPayload?.lineHeight,
          opacity: normalizedPayload?.opacity,
          red: normalizedPayload?.red,
          green: normalizedPayload?.green,
          blue: normalizedPayload?.blue,
          htmlLength: normalizedPayload.html.length,
        },
        null,
        2
      )
    )
    windowState.isStealthMode = true
    win.showInactive()
    win.setAlwaysOnTop(true, 'screen-saver')
    sendOverlayState({
      type: 'content',
      ...normalizedPayload,
      textColor: resolveOverlayReadableTextColor(
        normalizedPayload.red,
        normalizedPayload.green,
        normalizedPayload.blue
      ),
    })
    if (overlayState.controls) {
      sendOverlayState({
        type: 'controls',
        ...overlayState.controls,
      })
    }
    sendOverlayState({
      type: 'position',
      chapterIndex: overlayState.readingLocation.chapterIndex,
      progress: overlayState.readingLocation.progress,
    })
    windowState.isDesktopOverlayVisible = true
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.hide()
    }
    emitRendererEvent('window:stealthMode', true)
  })
  ipcMain.handle('desktop:window:updateDesktopReaderOverlay', async (_event, payload) => {
    const normalizedPayload = normalizeOverlayContentPayload(payload)
    overlayState.content = normalizedPayload
    writeOverlayDebugSnapshot('overlay-last-sent.html', normalizedPayload.html)
    sendOverlayState({
      type: 'content',
      ...normalizedPayload,
      textColor: resolveOverlayReadableTextColor(
        normalizedPayload.red,
        normalizedPayload.green,
        normalizedPayload.blue
      ),
    })
  })
  ipcMain.handle('desktop:window:updateDesktopReaderOverlayOpacity', async (_event, opacity) => {
    windowState.opacity = Math.max(0.02, Math.min(1, Number(opacity || 1)))
    if (overlayState.content) {
      overlayState.content.opacity = windowState.opacity
      sendOverlayState({
        type: 'opacity',
        opacity: windowState.opacity,
      })
    }
  })
  ipcMain.handle('desktop:window:updateDesktopReaderOverlayControls', async (_event, payload) => {
    let chapters = []
    try {
      chapters = JSON.parse(payload.chaptersJSON || '[]')
    } catch {
      chapters = []
    }

    overlayState.controls = {
      chapters,
      currentChapter: payload.currentChapter,
      progress: payload.progress,
      opacity: payload.opacity,
      camouflageEnabled: payload.camouflageEnabled,
    }
    sendOverlayState({
      type: 'controls',
      ...overlayState.controls,
    })
  })
  ipcMain.handle('desktop:window:consumeDesktopReaderOverlayActions', () => {
    if (overlayState.actionQueue.length === 0) {
      return ''
    }

    const actions = JSON.stringify(overlayState.actionQueue)
    overlayState.actionQueue = []
    return actions
  })
  ipcMain.handle('desktop:window:getDesktopReaderOverlayReadingLocation', () =>
    JSON.stringify(overlayState.readingLocation)
  )
  ipcMain.handle('desktop:window:moveDesktopReaderOverlayToReadingLocation', async (_event, payload) => {
    sendOverlayState({
      type: 'position',
      chapterIndex: payload.chapterIndex,
      progress: payload.progress,
    })
  })
  ipcMain.handle('desktop:window:hideDesktopReaderOverlay', () => {
    return hideOverlayWindow()
  })
  ipcMain.handle('desktop:window:isDesktopReaderOverlayVisible', () => windowState.isDesktopOverlayVisible)
  ipcMain.handle('desktop:window:enableStealthMode', () => {
    windowState.isStealthMode = true
    mainWindow?.setAlwaysOnTop(true)
    emitRendererEvent('window:stealthMode', true)
  })
  ipcMain.handle('desktop:window:disableStealthMode', () => {
    windowState.isStealthMode = false
    mainWindow?.setAlwaysOnTop(false)
    mainWindow?.setOpacity(1)
    windowState.opacity = 1
    void hideOverlayWindow()
    emitRendererEvent('window:stealthMode', false)
    emitRendererEvent('window:opacity', 1)
  })
  ipcMain.handle('desktop:window:setOpacity', (_event, opacity) => {
    const nextOpacity = Math.max(0.02, Math.min(1, Number(opacity || 1)))
    windowState.opacity = nextOpacity
    mainWindow?.setOpacity(nextOpacity)
    emitRendererEvent('window:opacity', nextOpacity)
  })
  ipcMain.handle('desktop:window:onMouseEnter', () => {
    emitRendererEvent('window:mouseEnter', true)
  })
  ipcMain.handle('desktop:window:onMouseLeave', () => {
    emitRendererEvent('window:mouseLeave', true)
  })
}

app.on('before-quit', () => {
  app.isQuitting = true
  void hideOverlayWindow({ preserveState: false })
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})

app.whenReady().then(async () => {
  registerIpcHandlers()
  await createMainWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import type {
  AppBridge,
  DesktopBridge,
  DesktopEventName,
  EventBridge,
  NovelBridge,
  ProgressBridge,
  WindowBridge,
} from './contracts'

type ElectronDesktopApi = {
  app: AppBridge
  novel: NovelBridge
  progress: ProgressBridge
  window: WindowBridge
  events: {
    on: <T = unknown>(
      eventName: DesktopEventName,
      listener: (payload: T) => void
    ) => () => void
  }
}

declare global {
  interface Window {
    moyuDesktop?: ElectronDesktopApi
  }
}

function getElectronDesktopApi() {
  const api = window.moyuDesktop
  if (!api) {
    throw new Error('Electron bridge 不可用')
  }

  return api
}

const app: AppBridge = {
  getConfig() {
    return getElectronDesktopApi().app.getConfig()
  },
  selectDataDir() {
    return getElectronDesktopApi().app.selectDataDir()
  },
  setDataDir(dataDir) {
    return getElectronDesktopApi().app.setDataDir(dataDir)
  },
  selectNovelFile() {
    return getElectronDesktopApi().app.selectNovelFile()
  },
  showItemInFolder(filePath) {
    return getElectronDesktopApi().app.showItemInFolder(filePath)
  },
}

const novel: NovelBridge = {
  openNovel(filePath) {
    return getElectronDesktopApi().novel.openNovel(filePath)
  },
  saveReadingProgress(filePath, chapterIndex, position, progress) {
    return getElectronDesktopApi().novel.saveReadingProgress(
      filePath,
      chapterIndex,
      position,
      progress
    )
  },
  setCurrentChapter(filePath, chapterIndex) {
    return getElectronDesktopApi().novel.setCurrentChapter(filePath, chapterIndex)
  },
  searchNovel(filePath, keyword, caseSensitive) {
    return getElectronDesktopApi().novel.searchNovel(filePath, keyword, caseSensitive)
  },
  getChapterContentPayload(filePath, chapterIndex) {
    return getElectronDesktopApi().novel.getChapterContentPayload(filePath, chapterIndex)
  },
}

const progress: ProgressBridge = {
  deleteProgress(filePath) {
    return getElectronDesktopApi().progress.deleteProgress(filePath)
  },
}

const windowBridge: WindowBridge = {
  supportsDesktopReaderOverlay() {
    return getElectronDesktopApi().window.supportsDesktopReaderOverlay()
  },
  showDesktopReaderOverlay(
    text,
    fontSize,
    fontWeight,
    lineHeight,
    opacity,
    red,
    green,
    blue,
    theme,
    backgroundColor
  ) {
    return getElectronDesktopApi().window.showDesktopReaderOverlay(
      text,
      fontSize,
      fontWeight,
      lineHeight,
      opacity,
      red,
      green,
      blue,
      theme,
      backgroundColor
    )
  },
  updateDesktopReaderOverlay(
    text,
    fontSize,
    fontWeight,
    lineHeight,
    opacity,
    red,
    green,
    blue,
    theme,
    backgroundColor
  ) {
    return getElectronDesktopApi().window.updateDesktopReaderOverlay(
      text,
      fontSize,
      fontWeight,
      lineHeight,
      opacity,
      red,
      green,
      blue,
      theme,
      backgroundColor
    )
  },
  updateDesktopReaderOverlayOpacity(opacity) {
    return getElectronDesktopApi().window.updateDesktopReaderOverlayOpacity(opacity)
  },
  updateDesktopReaderOverlayControls(
    chaptersJSON,
    currentChapter,
    progressValue,
    opacity,
    camouflageEnabled,
    camouflagePetKind,
    camouflageWanderEnabled,
    camouflageRestoreTrigger
  ) {
    return getElectronDesktopApi().window.updateDesktopReaderOverlayControls(
      chaptersJSON,
      currentChapter,
      progressValue,
      opacity,
      camouflageEnabled,
      camouflagePetKind,
      camouflageWanderEnabled,
      camouflageRestoreTrigger
    )
  },
  consumeDesktopReaderOverlayActions() {
    return getElectronDesktopApi().window.consumeDesktopReaderOverlayActions()
  },
  getDesktopReaderOverlayReadingLocation() {
    return getElectronDesktopApi().window.getDesktopReaderOverlayReadingLocation()
  },
  moveDesktopReaderOverlayToReadingLocation(chapterIndex, progressValue) {
    return getElectronDesktopApi().window.moveDesktopReaderOverlayToReadingLocation(
      chapterIndex,
      progressValue
    )
  },
  hideDesktopReaderOverlay(options) {
    return getElectronDesktopApi().window.hideDesktopReaderOverlay(options)
  },
  isDesktopReaderOverlayVisible() {
    return getElectronDesktopApi().window.isDesktopReaderOverlayVisible()
  },
  enableStealthMode() {
    return getElectronDesktopApi().window.enableStealthMode()
  },
  disableStealthMode() {
    return getElectronDesktopApi().window.disableStealthMode()
  },
  setOpacity(opacity) {
    return getElectronDesktopApi().window.setOpacity(opacity)
  },
  onMouseEnter() {
    return getElectronDesktopApi().window.onMouseEnter()
  },
  onMouseLeave() {
    return getElectronDesktopApi().window.onMouseLeave()
  },
}

const events: EventBridge = {
  on(eventName, listener) {
    return getElectronDesktopApi().events.on(eventName, listener)
  },
}

export const electronBridge: DesktopBridge = {
  app,
  novel,
  progress,
  window: windowBridge,
  events,
}

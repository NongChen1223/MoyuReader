const { contextBridge, ipcRenderer } = require('electron')

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload)
}

contextBridge.exposeInMainWorld('moyuDesktop', {
  app: {
    getConfig: () => invoke('desktop:app:getConfig'),
    selectDataDir: () => invoke('desktop:app:selectDataDir'),
    setDataDir: (dataDir) => invoke('desktop:app:setDataDir', dataDir),
    selectNovelFile: () => invoke('desktop:app:selectNovelFile'),
    showItemInFolder: (filePath) => invoke('desktop:app:showItemInFolder', filePath),
  },
  novel: {
    openNovel: (filePath) => invoke('desktop:novel:open', filePath),
    saveReadingProgress: (filePath, chapterIndex, position, progress) =>
      invoke('desktop:novel:saveReadingProgress', {
        filePath,
        chapterIndex,
        position,
        progress,
      }),
    setCurrentChapter: (filePath, chapterIndex) =>
      invoke('desktop:novel:setCurrentChapter', {
        filePath,
        chapterIndex,
      }),
    searchNovel: (filePath, keyword, caseSensitive = false) =>
      invoke('desktop:novel:search', {
        filePath,
        keyword,
        caseSensitive,
      }),
    getChapterContentPayload: (filePath, chapterIndex) =>
      invoke('desktop:novel:getChapterContentPayload', {
        filePath,
        chapterIndex,
      }),
  },
  progress: {
    deleteProgress: (filePath) => invoke('desktop:progress:delete', filePath),
  },
  window: {
    supportsDesktopReaderOverlay: () => invoke('desktop:window:supportsDesktopReaderOverlay'),
    showDesktopReaderOverlay: (
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
    ) =>
      invoke('desktop:window:showDesktopReaderOverlay', {
        text,
        fontSize,
        fontWeight,
        lineHeight,
        opacity,
        red,
        green,
        blue,
        theme,
        backgroundColor,
      }),
    updateDesktopReaderOverlay: (
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
    ) =>
      invoke('desktop:window:updateDesktopReaderOverlay', {
        text,
        fontSize,
        fontWeight,
        lineHeight,
        opacity,
        red,
        green,
        blue,
        theme,
        backgroundColor,
      }),
    updateDesktopReaderOverlayOpacity: (opacity) =>
      invoke('desktop:window:updateDesktopReaderOverlayOpacity', opacity),
    updateDesktopReaderOverlayControls: (
      chaptersJSON,
      currentChapter,
      progress,
      opacity,
      camouflageEnabled,
      camouflagePetKind,
      camouflageWanderEnabled,
      camouflageRestoreTrigger
    ) =>
      invoke('desktop:window:updateDesktopReaderOverlayControls', {
        chaptersJSON,
        currentChapter,
        progress,
        opacity,
        camouflageEnabled,
        camouflagePetKind,
        camouflageWanderEnabled,
        camouflageRestoreTrigger,
      }),
    consumeDesktopReaderOverlayActions: () =>
      invoke('desktop:window:consumeDesktopReaderOverlayActions'),
    getDesktopReaderOverlayReadingLocation: () =>
      invoke('desktop:window:getDesktopReaderOverlayReadingLocation'),
    moveDesktopReaderOverlayToReadingLocation: (chapterIndex, progress) =>
      invoke('desktop:window:moveDesktopReaderOverlayToReadingLocation', {
        chapterIndex,
        progress,
      }),
    hideDesktopReaderOverlay: (options) =>
      invoke('desktop:window:hideDesktopReaderOverlay', options),
    isDesktopReaderOverlayVisible: () =>
      invoke('desktop:window:isDesktopReaderOverlayVisible'),
    enableStealthMode: () => invoke('desktop:window:enableStealthMode'),
    disableStealthMode: () => invoke('desktop:window:disableStealthMode'),
    setOpacity: (opacity) => invoke('desktop:window:setOpacity', opacity),
    onMouseEnter: () => invoke('desktop:window:onMouseEnter'),
    onMouseLeave: () => invoke('desktop:window:onMouseLeave'),
  },
  events: {
    on(eventName, listener) {
      const channel = `desktop:event:${eventName}`
      const wrappedListener = (_event, payload) => {
        listener(payload)
      }

      ipcRenderer.on(channel, wrappedListener)
      return () => {
        ipcRenderer.removeListener(channel, wrappedListener)
      }
    },
  },
})

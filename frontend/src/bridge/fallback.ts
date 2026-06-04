import type { DesktopBridge } from './contracts'

function rejectUnavailable(feature: string): Promise<never> {
  return Promise.reject(new Error(`${feature} 暂不可用：当前未运行在受支持的桌面宿主中`))
}

export const fallbackBridge: DesktopBridge = {
  app: {
    getConfig() {
      return rejectUnavailable('读取应用配置')
    },
    selectDataDir() {
      return rejectUnavailable('选择应用数据目录')
    },
    setDataDir() {
      return rejectUnavailable('更新应用数据目录')
    },
    selectNovelFile() {
      return rejectUnavailable('选择小说文件')
    },
    showItemInFolder() {
      return rejectUnavailable('打开文件所在目录')
    },
  },
  novel: {
    openNovel() {
      return rejectUnavailable('打开小说')
    },
    saveReadingProgress() {
      return rejectUnavailable('保存阅读进度')
    },
    setCurrentChapter() {
      return rejectUnavailable('同步章节')
    },
    searchNovel() {
      return rejectUnavailable('搜索小说')
    },
    getChapterContentPayload() {
      return rejectUnavailable('获取章节内容')
    },
  },
  progress: {
    deleteProgress() {
      return rejectUnavailable('删除阅读进度')
    },
  },
  window: {
    supportsDesktopReaderOverlay() {
      return Promise.resolve(false)
    },
    showDesktopReaderOverlay() {
      return rejectUnavailable('桌面浮窗阅读')
    },
    updateDesktopReaderOverlay() {
      return rejectUnavailable('桌面浮窗阅读')
    },
    updateDesktopReaderOverlayOpacity() {
      return rejectUnavailable('桌面浮窗阅读')
    },
    updateDesktopReaderOverlayControls() {
      return rejectUnavailable('桌面浮窗阅读')
    },
    consumeDesktopReaderOverlayActions() {
      return Promise.resolve('')
    },
    getDesktopReaderOverlayReadingLocation() {
      return Promise.resolve('')
    },
    moveDesktopReaderOverlayToReadingLocation() {
      return rejectUnavailable('桌面浮窗阅读')
    },
    hideDesktopReaderOverlay() {
      return Promise.resolve()
    },
    isDesktopReaderOverlayVisible() {
      return Promise.resolve(false)
    },
    enableStealthMode() {
      return Promise.resolve()
    },
    disableStealthMode() {
      return Promise.resolve()
    },
    setOpacity() {
      return Promise.resolve()
    },
    onMouseEnter() {
      return Promise.resolve()
    },
    onMouseLeave() {
      return Promise.resolve()
    },
  },
  events: {
    on() {
      return () => undefined
    },
  },
}

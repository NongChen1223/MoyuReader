import type { AppConfig, ChapterContentPayload, Novel, SearchResult } from '@/types'

export type DesktopEventName =
  | 'app:ready'
  | 'window:opacity'
  | 'window:stealthMode'
  | 'window:mouseEnter'
  | 'window:mouseLeave'
  | 'desktopOverlay:actions'

export interface WindowBridge {
  supportsDesktopReaderOverlay(): Promise<boolean>
  showDesktopReaderOverlay(
    text: string,
    fontSize: number,
    fontWeight: number,
    lineHeight: number,
    opacity: number,
    red: number,
    green: number,
    blue: number,
    theme: 'light' | 'dark' | 'sepia',
    backgroundColor: string
  ): Promise<void>
  updateDesktopReaderOverlay(
    text: string,
    fontSize: number,
    fontWeight: number,
    lineHeight: number,
    opacity: number,
    red: number,
    green: number,
    blue: number,
    theme: 'light' | 'dark' | 'sepia',
    backgroundColor: string
  ): Promise<void>
  updateDesktopReaderOverlayOpacity(opacity: number): Promise<void>
  updateDesktopReaderOverlayControls(
    chaptersJSON: string,
    currentChapter: number,
    progress: number,
    opacity: number,
    camouflageEnabled: boolean,
    camouflagePetKind: 'dog' | 'cat',
    camouflageWanderEnabled: boolean,
    camouflageRestoreTrigger: 'click' | 'doubleClick' | 'hover' | 'shortcut'
  ): Promise<void>
  consumeDesktopReaderOverlayActions(): Promise<string>
  getDesktopReaderOverlayReadingLocation(): Promise<string>
  moveDesktopReaderOverlayToReadingLocation(
    chapterIndex: number,
    progress: number
  ): Promise<void>
  hideDesktopReaderOverlay(options?: { revealMainWindow?: boolean }): Promise<void>
  isDesktopReaderOverlayVisible(): Promise<boolean>
  enableStealthMode(): Promise<void>
  disableStealthMode(): Promise<void>
  setOpacity(opacity: number): Promise<void>
  onMouseEnter(): Promise<void>
  onMouseLeave(): Promise<void>
}

export interface NovelBridge {
  openNovel(filePath: string): Promise<Novel>
  saveReadingProgress(
    filePath: string,
    chapterIndex: number,
    position: number,
    progress: number
  ): Promise<void>
  setCurrentChapter(filePath: string, chapterIndex: number): Promise<void>
  searchNovel(
    filePath: string,
    keyword: string,
    caseSensitive?: boolean
  ): Promise<SearchResult[]>
  getChapterContentPayload(
    filePath: string,
    chapterIndex: number
  ): Promise<ChapterContentPayload>
}

export interface ProgressBridge {
  deleteProgress(filePath: string): Promise<void>
}

export interface AppBridge {
  getConfig(): Promise<AppConfig>
  selectDataDir(): Promise<string>
  setDataDir(dataDir: string): Promise<AppConfig>
  selectNovelFile(): Promise<string>
}

export interface EventBridge {
  on<T = unknown>(eventName: DesktopEventName, listener: (payload: T) => void): () => void
}

export interface DesktopBridge {
  app: AppBridge
  novel: NovelBridge
  progress: ProgressBridge
  window: WindowBridge
  events: EventBridge
}

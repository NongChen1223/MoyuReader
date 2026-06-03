import { useFixWailsDrag } from './useFixWailsDrag'

/**
 * 桌面端拖拽区刷新入口。
 * 这里保留对历史实现的复用，避免在迁移期改动现有样式变量。
 */
export function useDesktopDrag() {
  useFixWailsDrag()
}

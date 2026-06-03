import { useEffect } from 'react'

/**
 * 修复桌面端窗口拖拽在隐藏后重新显示时失效的问题
 *
 * 问题：当窗口隐藏后再显示，Chromium 渲染引擎不会正确刷新拖拽区域
 * 解决方案：监听窗口可见性变化，强制刷新拖拽区域的 CSS 属性
 *
 * 使用方法：
 * ```tsx
 * import { useDesktopDrag } from './hooks/useDesktopDrag'
 *
 * function App() {
 *   useDesktopDrag()
 *   return <div>...</div>
 * }
 * ```
 */
export function useFixWailsDrag() {
  useEffect(() => {
    /**
     * 刷新拖拽区域
     * 通过重新设置 app-region 属性来强制 Chromium 重新识别拖拽区域
     */
    const refreshDraggableRegions = () => {
      // 查找所有可能的拖拽区域元素
      const selectors = [
        '[class*="header"]',
        '[class*="Header"]',
        '.header',
        'header',
      ]

      const elements = new Set<HTMLElement>()

      // 收集所有匹配的元素
      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            if (el instanceof HTMLElement) {
              elements.add(el)
            }
          })
        } catch {
          // 忽略无效选择器
        }
      })

      // 对每个元素刷新拖拽属性
      elements.forEach(element => {
        const currentStyle = window.getComputedStyle(element)
        const hasAppRegion =
          currentStyle.getPropertyValue('--wails-draggable') === 'drag' ||
          currentStyle.getPropertyValue('app-region') === 'drag'

        if (
          hasAppRegion ||
          element.classList.contains('header') ||
          element.tagName.toLowerCase() === 'header'
        ) {

          // 先设置为 no-drag
          element.style.setProperty('--wails-draggable', 'no-drag')
          element.style.setProperty('app-region', 'no-drag')

          // 强制重排
          void element.offsetHeight

          // 恢复为 drag
          element.style.setProperty('--wails-draggable', 'drag')
          element.style.setProperty('app-region', 'drag')

          // 延迟清除 inline style，让 CSS 类样式接管
          setTimeout(() => {
            element.style.removeProperty('--wails-draggable')
            element.style.removeProperty('app-region')
          }, 10)
        }
      })
    }

    // 监听窗口焦点事件
    const handleFocus = () => {
      setTimeout(refreshDraggableRegions, 100)
    }

    // 监听可见性变化
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(refreshDraggableRegions, 100)
      }
    }

    // 监听页面显示事件（从后台返回）
    const handlePageShow = () => {
      setTimeout(refreshDraggableRegions, 100)
    }

    // 添加事件监听
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    // 首次加载时也刷新一次
    setTimeout(refreshDraggableRegions, 200)

    // 清理
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])
}

import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useDesktopDrag } from './hooks/useDesktopDrag'

/**
 * App 根组件。
 * 负责挂载全局路由，并在桌面端刷新拖拽区域。
 */
export default function App() {
  useDesktopDrag()
  return <RouterProvider router={router} />
}

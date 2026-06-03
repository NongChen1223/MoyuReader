import type { DesktopBridge } from './contracts'
import { electronBridge } from './electron'
import { fallbackBridge } from './fallback'

function resolveBridge(): DesktopBridge {
  if (typeof window !== 'undefined' && window.moyuDesktop) {
    return electronBridge
  }

  return fallbackBridge
}

export const desktopBridge = resolveBridge()

export * from './contracts'

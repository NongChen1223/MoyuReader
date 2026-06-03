import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BossReadingAppearance,
  CamouflageWidgetPosition,
  ReadingSettings,
  ShortcutAction,
  ShortcutMap,
} from '@/types'
import { DEFAULT_SHORTCUTS } from '@/utils/shortcuts'

const MIN_PAGE_WIDTH_PERCENT = 55
const MAX_PAGE_WIDTH_PERCENT = 100
const LEGACY_MIN_PAGE_WIDTH_PX = 400
const LEGACY_MAX_PAGE_WIDTH_PX = 1200
const SETTINGS_STORAGE_NAME = 'moyureader-settings'
const DEFAULT_CAMOUFLAGE_WIDGET_POSITION: CamouflageWidgetPosition = {
  x: 0.84,
  y: 0.16,
}
const DEFAULT_BOSS_READING_APPEARANCE: BossReadingAppearance = {
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.8,
  textColor: '#E8EAF0',
}

export function normalizePageWidth(value: number) {
  const numericValue = Number(value || 0)

  // 兼容旧版本保存的 px 值，按原范围映射到百分比。
  if (numericValue > MAX_PAGE_WIDTH_PERCENT) {
    const legacyRatio =
      (Math.min(Math.max(numericValue, LEGACY_MIN_PAGE_WIDTH_PX), LEGACY_MAX_PAGE_WIDTH_PX) -
        LEGACY_MIN_PAGE_WIDTH_PX) /
      (LEGACY_MAX_PAGE_WIDTH_PX - LEGACY_MIN_PAGE_WIDTH_PX)

    return Math.round(
      MIN_PAGE_WIDTH_PERCENT +
        legacyRatio * (MAX_PAGE_WIDTH_PERCENT - MIN_PAGE_WIDTH_PERCENT)
    )
  }

  return Math.min(
    MAX_PAGE_WIDTH_PERCENT,
    Math.max(MIN_PAGE_WIDTH_PERCENT, Math.round(numericValue))
  )
}

function clampUnitInterval(value: number) {
  return Math.max(0, Math.min(1, Number(value || 0)))
}

function normalizeCamouflageWidgetPosition(
  value?: Partial<CamouflageWidgetPosition>
): CamouflageWidgetPosition {
  return {
    x: clampUnitInterval(value?.x ?? DEFAULT_CAMOUFLAGE_WIDGET_POSITION.x),
    y: clampUnitInterval(value?.y ?? DEFAULT_CAMOUFLAGE_WIDGET_POSITION.y),
  }
}

interface SettingsState extends ReadingSettings {
  bossMode: boolean
  bossOpacity: number
  keyboardShortcuts: ShortcutMap
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  setFontWeight: (weight: number) => void
  setLineHeight: (height: number) => void
  setBackgroundColor: (color: string) => void
  setTextColor: (color: string) => void
  setPageWidth: (width: number) => void
  setTheme: (theme: 'light' | 'dark' | 'sepia') => void
  setBossModeType: (bossModeType: 'basic' | 'full') => void
  setBossRevealDelay: (delay: number) => void
  setBossHideDelay: (delay: number) => void
  setBossCamouflageEnabled: (enabled: boolean) => void
  setBossCamouflageWidgetPosition: (position: CamouflageWidgetPosition) => void
  setBossReadingAppearance: (appearance: Partial<BossReadingAppearance>) => void
  setBossMode: (enabled: boolean) => void
  setBossOpacity: (opacity: number) => void
  setKeyboardShortcut: (action: ShortcutAction, shortcut: string) => void
  resetKeyboardShortcuts: () => void
  resetSettings: () => void
}

const defaultSettings: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'system',
  fontWeight: 400,
  lineHeight: 1.8,
  backgroundColor: '#ffffff',
  textColor: '#333333',
  pageWidth: 78,
  theme: 'light',
  bossModeType: 'basic',
  bossRevealDelay: 80,
  bossHideDelay: 260,
  bossCamouflageEnabled: false,
  bossCamouflageWidgetPosition: DEFAULT_CAMOUFLAGE_WIDGET_POSITION,
  bossReadingAppearance: DEFAULT_BOSS_READING_APPEARANCE,
}

const defaultBossSettings = {
  bossMode: false,
  bossOpacity: 0.3,
}

function normalizeBossOpacity(value: number) {
  return Math.max(0.02, Math.min(1, Number(value || 0.3)))
}

function normalizeFontWeight(value: number) {
  return Math.max(300, Math.min(900, Math.round(Number(value || 400) / 100) * 100))
}

function normalizeBossReadingAppearance(
  value?: Partial<BossReadingAppearance>
): BossReadingAppearance {
  return {
    fontSize: Math.max(
      12,
      Math.min(32, Math.round(Number(value?.fontSize ?? DEFAULT_BOSS_READING_APPEARANCE.fontSize)))
    ),
    fontWeight: normalizeFontWeight(
      value?.fontWeight ?? DEFAULT_BOSS_READING_APPEARANCE.fontWeight
    ),
    lineHeight: Math.max(
      1,
      Math.min(3, Number(value?.lineHeight ?? DEFAULT_BOSS_READING_APPEARANCE.lineHeight))
    ),
    textColor: /^#[0-9a-fA-F]{6}$/.test(value?.textColor || '')
      ? String(value?.textColor).toUpperCase()
      : DEFAULT_BOSS_READING_APPEARANCE.textColor,
  }
}

// 从持久化配置中读取上一次摸鱼模式使用的透明度，避免重新进入时出现视觉跳变。
export function getPersistedBossOpacity(fallback = defaultBossSettings.bossOpacity) {
  if (typeof window === 'undefined') {
    return normalizeBossOpacity(fallback)
  }

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_NAME)
    if (!rawValue) {
      return normalizeBossOpacity(fallback)
    }

    const parsed = JSON.parse(rawValue) as {
      state?: { bossOpacity?: number }
    }

    return normalizeBossOpacity(parsed.state?.bossOpacity ?? fallback)
  } catch {
    return normalizeBossOpacity(fallback)
  }
}

/**
 * 阅读设置状态管理
 * 管理字体、行高、页宽等阅读相关设置
 * 使用 localStorage 持久化设置
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      ...defaultBossSettings,
      keyboardShortcuts: DEFAULT_SHORTCUTS,

      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontWeight: (fontWeight) => set({ fontWeight: normalizeFontWeight(fontWeight) }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
      setTextColor: (textColor) => set({ textColor }),
      setPageWidth: (pageWidth) => set({ pageWidth: normalizePageWidth(pageWidth) }),
      setTheme: (theme) => set({ theme }),
      setBossModeType: (bossModeType) => set({ bossModeType }),
      setBossRevealDelay: (bossRevealDelay) => set({ bossRevealDelay }),
      setBossHideDelay: (bossHideDelay) => set({ bossHideDelay }),
      setBossCamouflageEnabled: (bossCamouflageEnabled) => set({ bossCamouflageEnabled }),
      setBossCamouflageWidgetPosition: (bossCamouflageWidgetPosition) =>
        set({
          bossCamouflageWidgetPosition: normalizeCamouflageWidgetPosition(
            bossCamouflageWidgetPosition
          ),
        }),
      setBossReadingAppearance: (bossReadingAppearance) =>
        set((state) => ({
          bossReadingAppearance: normalizeBossReadingAppearance({
            ...state.bossReadingAppearance,
            ...bossReadingAppearance,
          }),
        })),
      setBossMode: (bossMode) => set({ bossMode }),
      setBossOpacity: (bossOpacity) => set({ bossOpacity: normalizeBossOpacity(bossOpacity) }),
      setKeyboardShortcut: (action, shortcut) =>
        set((state) => ({
          keyboardShortcuts: {
            ...state.keyboardShortcuts,
            [action]: shortcut,
          },
        })),
      resetKeyboardShortcuts: () => set({ keyboardShortcuts: DEFAULT_SHORTCUTS }),

      resetSettings: () =>
        set({
          ...defaultSettings,
          ...defaultBossSettings,
          keyboardShortcuts: DEFAULT_SHORTCUTS,
        }),
    }),
    {
      name: SETTINGS_STORAGE_NAME,
      merge: (persistedState, currentState) => {
        const typedPersistedState = (persistedState || {}) as Partial<SettingsState>

        return {
          ...currentState,
          ...typedPersistedState,
          bossOpacity: normalizeBossOpacity(
            typedPersistedState.bossOpacity ?? currentState.bossOpacity
          ),
          pageWidth: normalizePageWidth(
            typedPersistedState.pageWidth ?? currentState.pageWidth
          ),
          fontWeight: normalizeFontWeight(
            typedPersistedState.fontWeight ?? currentState.fontWeight
          ),
          bossCamouflageEnabled: Boolean(
            typedPersistedState.bossCamouflageEnabled ?? currentState.bossCamouflageEnabled
          ),
          bossCamouflageWidgetPosition: normalizeCamouflageWidgetPosition(
            typedPersistedState.bossCamouflageWidgetPosition ??
              currentState.bossCamouflageWidgetPosition
          ),
          bossReadingAppearance: normalizeBossReadingAppearance(
            typedPersistedState.bossReadingAppearance ??
              currentState.bossReadingAppearance
          ),
        }
      },
    }
  )
)

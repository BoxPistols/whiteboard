import type { StateCreator } from 'zustand'
import type { CanvasStore } from '../store'

// Canvas 背景のテーマ別デフォルト色。theme 切替に連動させる判定にも使う。
// テーマ系の定数なので themeSlice に集約し、store.ts からは re-export して後方互換を維持する。
export const DARK_CANVAS_BG = '#1f2937'
export const LIGHT_CANVAS_BG = '#f5f5f5'

const THEME_KEY = 'twb-theme'
const CANVAS_BG_KEY = 'twb-canvas-bg'

// テーマ（light/dark）とキャンバス背景色のスライス。store.ts(モノリス)からの段階的分割。
export interface ThemeSlice {
  theme: 'light' | 'dark'
  canvasBackground: string
  toggleTheme: () => void
  loadSavedTheme: () => void
  setCanvasBackground: (color: string) => void
  loadSavedCanvasBackground: () => void
}

export const createThemeSlice: StateCreator<CanvasStore, [], [], ThemeSlice> = (set, get) => ({
  theme: 'dark',
  canvasBackground: DARK_CANVAS_BG,
  toggleTheme: () => {
    const { theme: currentTheme, canvasBackground: currentBg } = get()
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'

    if (typeof window !== 'undefined') {
      // Force clean then apply target to avoid stale class on hydration edge cases
      document.documentElement.classList.remove('dark')
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      }
      localStorage.setItem(THEME_KEY, newTheme)
    }

    // カスタム色が未設定（＝どちらかのデフォルト値のまま）の場合のみ、新テーマのデフォルトへ連動
    const isDefaultBg = currentBg === DARK_CANVAS_BG || currentBg === LIGHT_CANVAS_BG
    const nextBg = newTheme === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG
    if (isDefaultBg && currentBg !== nextBg) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CANVAS_BG_KEY, nextBg)
        } catch (e) {
          console.error('Failed to save canvas background:', e)
        }
      }
      set({ theme: newTheme, canvasBackground: nextBg })
      return
    }

    set({ theme: newTheme })
  },
  loadSavedTheme: () => {
    if (typeof window === 'undefined') return

    // Avoid double application: remove both then add needed
    document.documentElement.classList.remove('dark')

    const savedTheme = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null
    // デフォルトはダークモード
    const theme: 'light' | 'dark' = savedTheme || 'dark'

    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    }

    set({ theme })
  },
  setCanvasBackground: (color) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CANVAS_BG_KEY, color)
      } catch (e) {
        console.error('Failed to save canvas background:', e)
      }
    }
    set({ canvasBackground: color })
  },
  loadSavedCanvasBackground: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(CANVAS_BG_KEY)
    // 保存値があればそれを優先。未保存時は現在テーマのデフォルト色に揃える
    const fallback = get().theme === 'light' ? LIGHT_CANVAS_BG : DARK_CANVAS_BG
    set({ canvasBackground: saved || fallback })
  },
})

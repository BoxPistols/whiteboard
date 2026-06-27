import type { StateCreator } from 'zustand'
import type { CanvasStore } from '../store'

const STORAGE_KEY = 'twb-style-defaults'

// 新規オブジェクト作成時に引き継ぐスタイル既定値。
export interface StyleDefaults {
  fill: string
  stroke: string
  strokeWidth: number
  textFill: string
  // 付箋の背景色（前回選択したカラーを引き継ぐ）
  stickyColor: string
}

// スタイル既定値のスライス。store.ts(モノリス)からの段階的分割。
export interface StyleDefaultsSlice {
  styleDefaults: StyleDefaults
  setStyleDefaults: (defaults: Partial<StyleDefaults>) => void
  loadSavedStyleDefaults: () => void
}

export const createStyleDefaultsSlice: StateCreator<CanvasStore, [], [], StyleDefaultsSlice> = (
  set,
  get
) => ({
  // theme 非依存のため中立色で初期化、使用時にテーマ別色へ補正
  styleDefaults: {
    fill: 'rgba(107, 114, 128, 0.5)',
    stroke: '#6B7280',
    strokeWidth: 0,
    textFill: '',
    stickyColor: '#FEF3B5',
  },
  setStyleDefaults: (defaults) => {
    const merged = { ...get().styleDefaults, ...defaults }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch (e) {
        console.error('Failed to save style defaults:', e)
      }
    }
    set({ styleDefaults: merged })
  },
  loadSavedStyleDefaults: () => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const raw = JSON.parse(saved) as unknown
      if (!raw || typeof raw !== 'object') return
      // 汚染された localStorage を弾くため、各フィールドを明示的に型検証してマージ
      const sanitized: Partial<StyleDefaults> = {}
      const obj = raw as Record<string, unknown>
      if (typeof obj.fill === 'string') sanitized.fill = obj.fill
      if (typeof obj.stroke === 'string') sanitized.stroke = obj.stroke
      if (typeof obj.strokeWidth === 'number' && Number.isFinite(obj.strokeWidth)) {
        sanitized.strokeWidth = obj.strokeWidth
      }
      if (typeof obj.textFill === 'string') sanitized.textFill = obj.textFill
      if (typeof obj.stickyColor === 'string') sanitized.stickyColor = obj.stickyColor
      set({
        styleDefaults: {
          ...get().styleDefaults,
          ...sanitized,
        },
      })
    } catch (e) {
      console.error('Failed to load style defaults:', e)
    }
  },
})

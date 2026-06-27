import type { StateCreator } from 'zustand'
import type { CanvasStore } from '../store'

// グリッド表示/スナップ設定のスライス。store.ts(モノリス)からの段階的分割の第一弾。
export interface GridSlice {
  gridEnabled: boolean
  gridSize: number
  gridColor: string
  gridOpacity: number
  gridSnapEnabled: boolean
  toggleGrid: () => void
  setGridSize: (size: number) => void
  setGridColor: (color: string) => void
  setGridOpacity: (opacity: number) => void
  toggleGridSnap: () => void
  loadSavedGridSettings: () => void
}

type GridState = Pick<
  GridSlice,
  'gridEnabled' | 'gridSize' | 'gridColor' | 'gridOpacity' | 'gridSnapEnabled'
>

// グリッド設定をlocalStorageに保存するヘルパー
const persistGridSettings = (state: GridState) => {
  if (typeof window === 'undefined') return
  try {
    const settings = {
      enabled: state.gridEnabled,
      size: state.gridSize,
      color: state.gridColor,
      opacity: state.gridOpacity,
      snapEnabled: state.gridSnapEnabled,
    }
    localStorage.setItem('twb-grid-settings', JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save grid settings:', error)
  }
}

export const createGridSlice: StateCreator<CanvasStore, [], [], GridSlice> = (set, get) => ({
  gridEnabled: false,
  gridSize: 10,
  gridColor: '#888888',
  gridOpacity: 20,
  gridSnapEnabled: false,
  toggleGrid: () => {
    set({ gridEnabled: !get().gridEnabled })
    persistGridSettings(get())
  },
  setGridSize: (size) => {
    set({ gridSize: Math.max(5, Math.min(100, size)) })
    persistGridSettings(get())
  },
  setGridColor: (color) => {
    set({ gridColor: color })
    persistGridSettings(get())
  },
  setGridOpacity: (opacity) => {
    set({ gridOpacity: Math.max(5, Math.min(100, opacity)) })
    persistGridSettings(get())
  },
  toggleGridSnap: () => {
    set({ gridSnapEnabled: !get().gridSnapEnabled })
    persistGridSettings(get())
  },
  loadSavedGridSettings: () => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('twb-grid-settings')
      if (saved) {
        const settings = JSON.parse(saved) as {
          enabled: boolean
          size: number
          color: string
          opacity: number
          snapEnabled?: boolean
        }
        set({
          gridEnabled: settings.enabled ?? false,
          gridSize: settings.size ?? 10,
          gridColor: settings.color ?? '#888888',
          gridOpacity: settings.opacity ?? 20,
          gridSnapEnabled: settings.snapEnabled ?? false,
        })
      }
    } catch (e) {
      console.error('Failed to load grid settings:', e)
    }
  },
})

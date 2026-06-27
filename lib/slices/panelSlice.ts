import type { StateCreator } from 'zustand'
import type { CanvasStore } from '../store'

// 左右パネルの表示/幅のスライス。store.ts(モノリス)からの段階的分割。
export interface PanelSlice {
  showLeftPanel: boolean
  showRightPanel: boolean
  leftPanelWidth: number
  rightPanelWidth: number
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setLeftPanelWidth: (width: number) => void
  setRightPanelWidth: (width: number) => void
}

// パネル幅のクランプ範囲
const LEFT_PANEL_MIN = 200
const LEFT_PANEL_MAX = 400
const RIGHT_PANEL_MIN = 250
const RIGHT_PANEL_MAX = 500

export const createPanelSlice: StateCreator<CanvasStore, [], [], PanelSlice> = (set) => ({
  showLeftPanel: true,
  showRightPanel: true,
  leftPanelWidth: 224, // 56 * 4 = w-56
  rightPanelWidth: 288, // 72 * 4 = w-72
  toggleLeftPanel: () => set((state) => ({ showLeftPanel: !state.showLeftPanel })),
  toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),
  setLeftPanelWidth: (width) =>
    set({ leftPanelWidth: Math.max(LEFT_PANEL_MIN, Math.min(width, LEFT_PANEL_MAX)) }),
  setRightPanelWidth: (width) =>
    set({ rightPanelWidth: Math.max(RIGHT_PANEL_MIN, Math.min(width, RIGHT_PANEL_MAX)) }),
})

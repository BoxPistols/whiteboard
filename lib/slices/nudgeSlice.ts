import type { StateCreator } from 'zustand'
import type { CanvasStore } from '../store'

const STORAGE_KEY = 'twb-nudge-amount'

// 矢印キー移動量（ナッジ）設定のスライス。store.ts(モノリス)からの段階的分割。
// 実際の移動アクション moveSelectedObject は fabric 依存のため store.ts に残し、
// nudgeAmount は get() 経由で参照する（theme/panel と同じ slice-state 参照パターン）。
export interface NudgeSlice {
  nudgeAmount: number
  setNudgeAmount: (amount: number) => void
  loadSavedNudgeAmount: () => void
}

export const createNudgeSlice: StateCreator<CanvasStore, [], [], NudgeSlice> = (set) => ({
  nudgeAmount: 10,
  setNudgeAmount: (amount) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, String(amount))
      } catch (e) {
        console.error('Failed to save nudge amount:', e)
      }
    }
    set({ nudgeAmount: amount })
  },
  loadSavedNudgeAmount: () => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const amount = parseInt(saved, 10)
        if (!isNaN(amount) && amount > 0) {
          set({ nudgeAmount: amount })
        }
      }
    } catch (e) {
      console.error('Failed to load nudge amount:', e)
    }
  },
})

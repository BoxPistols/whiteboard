import type { StateCreator } from 'zustand'
import type { ShortcutConfig, ShortcutModifiers } from '@/types'
import { DEFAULT_SHORTCUTS } from '../shortcuts'
import type { CanvasStore } from '../store'

const STORAGE_KEY = 'twb-shortcuts'

// ショートカット設定/モーダル表示のスライス。store.ts(モノリス)からの段階的分割。
export interface ShortcutsSlice {
  shortcuts: ShortcutConfig[]
  showShortcutsModal: boolean
  setShowShortcutsModal: (show: boolean) => void
  updateShortcut: (id: string, newKey: string, modifiers: ShortcutModifiers) => void
  resetShortcuts: () => void
  loadSavedShortcuts: () => void
}

export const createShortcutsSlice: StateCreator<CanvasStore, [], [], ShortcutsSlice> = (
  set,
  get
) => ({
  shortcuts: DEFAULT_SHORTCUTS,
  showShortcutsModal: false,
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  updateShortcut: (id, newKey, modifiers) => {
    const shortcuts = get().shortcuts.map((shortcut) =>
      shortcut.id === id ? { ...shortcut, customKey: newKey, modifiers } : shortcut
    )

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        const customShortcuts = shortcuts
          .filter((s) => s.customKey)
          .map((s) => ({ id: s.id, customKey: s.customKey, modifiers: s.modifiers }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customShortcuts))
      } catch (e) {
        console.error('Failed to save shortcuts:', e)
      }
    }

    set({ shortcuts })
  },
  resetShortcuts: () => {
    // localStorageからカスタムショートカットを削除
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (e) {
        console.error('Failed to remove shortcuts:', e)
      }
    }

    // デフォルトに戻す
    set({ shortcuts: DEFAULT_SHORTCUTS })
  },
  loadSavedShortcuts: () => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const customShortcuts = JSON.parse(saved) as {
          id: string
          customKey: string
          modifiers: ShortcutModifiers
        }[]
        const shortcuts = DEFAULT_SHORTCUTS.map((shortcut) => {
          const custom = customShortcuts.find((c) => c.id === shortcut.id)
          return custom
            ? { ...shortcut, customKey: custom.customKey, modifiers: custom.modifiers }
            : shortcut
        })
        set({ shortcuts })
      }
    } catch (e) {
      console.error('Failed to load shortcuts:', e)
    }
  },
})

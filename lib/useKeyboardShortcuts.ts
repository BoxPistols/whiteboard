import { useEffect } from 'react'
import type { Tool, ShortcutConfig } from '@/types'
import { matchesShortcut } from './shortcuts'

interface UseKeyboardShortcutsProps {
  shortcuts: ShortcutConfig[]
  setSelectedTool: (tool: Tool) => void
  deleteSelectedObject?: () => void
  duplicateSelectedObject?: () => void
  copySelectedObject?: () => void
  pasteObject?: () => void
  groupObjects?: () => void
  ungroupObjects?: () => void
  resetZoom?: () => void
  resetView?: () => void
  zoomToFit?: () => void
  zoomToSelection?: () => void
  bringToFront?: () => void
  sendToBack?: () => void
  bringForward?: () => void
  sendBackward?: () => void
  showShortcuts?: () => void
  moveSelectedObject?: (direction: 'up' | 'down' | 'left' | 'right', useNudge: boolean) => void
  undo?: () => void
  redo?: () => void
}

export const useKeyboardShortcuts = ({
  shortcuts,
  setSelectedTool,
  deleteSelectedObject,
  duplicateSelectedObject,
  copySelectedObject,
  pasteObject,
  groupObjects,
  ungroupObjects,
  resetZoom,
  resetView,
  zoomToFit,
  zoomToSelection,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  showShortcuts,
  moveSelectedObject,
  undo,
  redo,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキスト入力中は無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // ショートカット設定から該当するものを検索
      const matchedShortcut = shortcuts.find((s) => matchesShortcut(e, s))

      if (!matchedShortcut) return

      // アクションに基づいて処理を実行
      const action = matchedShortcut.action

      // ツール切り替え
      if (action.startsWith('setTool:')) {
        const tool = action.replace('setTool:', '') as Tool
        e.preventDefault()
        setSelectedTool(tool)
        return
      }

      // ナッジ（矢印キー移動）
      if (action.startsWith('nudge:')) {
        if (moveSelectedObject) {
          e.preventDefault()
          const parts = action.split(':')
          const direction = parts[1] as 'up' | 'down' | 'left' | 'right'
          const useNudge = parts[2] === 'big'
          moveSelectedObject(direction, useNudge)
        }
        return
      }

      // その他のアクション
      switch (action) {
        case 'undo':
          if (undo) {
            e.preventDefault()
            undo()
          }
          break
        case 'redo':
          if (redo) {
            e.preventDefault()
            redo()
          }
          break
        case 'copy':
          if (copySelectedObject) {
            e.preventDefault()
            copySelectedObject()
          }
          break
        case 'paste':
          // ペースト処理はCanvas.tsxのhandlePasteで統合処理される
          // (画像ペーストと内部クリップボードペーストの両方に対応)
          // ここでe.preventDefault()を呼ばないことで、ブラウザのネイティブpasteイベントを許可
          break
        case 'duplicate':
          if (duplicateSelectedObject) {
            e.preventDefault()
            duplicateSelectedObject()
          }
          break
        case 'delete':
          if (deleteSelectedObject) {
            e.preventDefault()
            deleteSelectedObject()
          }
          break
        case 'group':
          if (groupObjects) {
            e.preventDefault()
            groupObjects()
          }
          break
        case 'ungroup':
          if (ungroupObjects) {
            e.preventDefault()
            ungroupObjects()
          }
          break
        case 'bringToFront':
          if (bringToFront) {
            e.preventDefault()
            bringToFront()
          }
          break
        case 'sendToBack':
          if (sendToBack) {
            e.preventDefault()
            sendToBack()
          }
          break
        case 'resetZoom':
          if (resetZoom) {
            e.preventDefault()
            resetZoom()
          }
          break
        case 'resetView':
          if (resetView) {
            e.preventDefault()
            resetView()
          }
          break
        case 'zoomToFit':
          if (zoomToFit) {
            e.preventDefault()
            zoomToFit()
          }
          break
        case 'zoomToSelection':
          if (zoomToSelection) {
            e.preventDefault()
            zoomToSelection()
          }
          break
        case 'showShortcuts':
          if (showShortcuts) {
            e.preventDefault()
            showShortcuts()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    shortcuts,
    setSelectedTool,
    deleteSelectedObject,
    duplicateSelectedObject,
    copySelectedObject,
    pasteObject,
    groupObjects,
    ungroupObjects,
    resetZoom,
    resetView,
    zoomToFit,
    zoomToSelection,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    showShortcuts,
    moveSelectedObject,
    undo,
    redo,
  ])
}

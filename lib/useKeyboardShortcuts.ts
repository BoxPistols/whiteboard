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
  zoomToFit?: () => void
  zoomToSelection?: () => void
  bringToFront?: () => void
  sendToBack?: () => void
  showShortcuts?: () => void
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
  zoomToFit,
  zoomToSelection,
  bringToFront,
  sendToBack,
  showShortcuts,
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

      // その他のアクション
      switch (action) {
        case 'copy':
          if (copySelectedObject) {
            e.preventDefault()
            copySelectedObject()
          }
          break
        case 'paste':
          if (pasteObject) {
            e.preventDefault()
            pasteObject()
          }
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
    zoomToFit,
    zoomToSelection,
    bringToFront,
    sendToBack,
    showShortcuts,
  ])
}

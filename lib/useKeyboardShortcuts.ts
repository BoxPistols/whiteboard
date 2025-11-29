import { useEffect } from 'react'
import type { Tool } from '@/types'

interface UseKeyboardShortcutsProps {
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
}

export const useKeyboardShortcuts = ({
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
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキスト入力中は無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const key = e.key.toLowerCase()

      // Figmaショートカット
      // Cmd/Ctrl + キー のショートカット（先にチェック）
      if (e.metaKey || e.ctrlKey) {
        switch (key) {
          case 'd':
            if (duplicateSelectedObject) {
              e.preventDefault()
              duplicateSelectedObject()
            }
            return
          case 'c':
            if (copySelectedObject) {
              e.preventDefault()
              copySelectedObject()
            }
            return
          case 'v':
            if (pasteObject) {
              e.preventDefault()
              pasteObject()
            }
            return
          case 'g':
            if (e.shiftKey && ungroupObjects) {
              // Cmd/Ctrl+Shift+G: グループ解除
              e.preventDefault()
              ungroupObjects()
            } else if (groupObjects) {
              // Cmd/Ctrl+G: グループ化
              e.preventDefault()
              groupObjects()
            }
            return
          case ']':
            if (e.shiftKey && bringToFront) {
              // Cmd/Ctrl+Shift+]: 最前面へ
              e.preventDefault()
              bringToFront()
            }
            return
          case '[':
            if (e.shiftKey && sendToBack) {
              // Cmd/Ctrl+Shift+[: 最背面へ
              e.preventDefault()
              sendToBack()
            }
            return
        }
        return
      }

      // 単独キーのショートカット
      switch (key) {
        case 'v':
          // V: 選択ツール (Move)
          setSelectedTool('select')
          break
        case 'r':
          // R: 矩形ツール
          setSelectedTool('rectangle')
          break
        case 'o':
          // O: 楕円ツール
          setSelectedTool('circle')
          break
        case 'l':
          if (e.shiftKey) {
            // Shift+L: 矢印ツール (Figma標準)
            setSelectedTool('arrow')
          } else {
            // L: 線ツール
            setSelectedTool('line')
          }
          break
        case 't':
          // T: テキストツール
          setSelectedTool('text')
          break
        case 'p':
          // P: ペンシルツール
          setSelectedTool('pencil')
          break
        case 'delete':
        case 'backspace':
          if (deleteSelectedObject) {
            deleteSelectedObject()
            e.preventDefault()
          }
          break
        case '0':
          if (e.shiftKey && resetZoom) {
            // Shift+0: 100%ズーム
            e.preventDefault()
            resetZoom()
          }
          break
        case '1':
          if (e.shiftKey && zoomToFit) {
            // Shift+1: 画面に合わせて表示
            e.preventDefault()
            zoomToFit()
          }
          break
        case '2':
          if (e.shiftKey && zoomToSelection) {
            // Shift+2: 選択範囲にズーム
            e.preventDefault()
            zoomToSelection()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
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
  ])
}

import { useEffect } from 'react'
import type { Tool } from '@/types'

interface UseKeyboardShortcutsProps {
  setSelectedTool: (tool: Tool) => void
  deleteSelectedObject?: () => void
  duplicateSelectedObject?: () => void
}

export const useKeyboardShortcuts = ({
  setSelectedTool,
  deleteSelectedObject,
  duplicateSelectedObject,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキスト入力中は無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Figmaショートカット
      switch (e.key.toLowerCase()) {
        case 'v':
          setSelectedTool('select')
          break
        case 'r':
          setSelectedTool('rectangle')
          break
        case 'o':
          setSelectedTool('circle')
          break
        case 'l':
          setSelectedTool('line')
          break
        case 'a':
          setSelectedTool('arrow')
          break
        case 't':
          setSelectedTool('text')
          break
        case 'p':
          setSelectedTool('pencil')
          break
        case 'delete':
        case 'backspace':
          if (deleteSelectedObject) {
            deleteSelectedObject()
            e.preventDefault()
          }
          break
        case 'd':
          if ((e.metaKey || e.ctrlKey) && duplicateSelectedObject) {
            e.preventDefault()
            duplicateSelectedObject()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectedTool, deleteSelectedObject, duplicateSelectedObject])
}

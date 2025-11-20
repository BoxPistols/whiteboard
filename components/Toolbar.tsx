'use client'

import { useState, useEffect } from 'react'
import { useCanvasStore } from '@/lib/store'
import type { Tool } from '@/types'
import ExportImportControls from './ExportImportControls'
import {
  SelectIcon,
  RectangleIcon,
  CircleIcon,
  LineIcon,
  ArrowIcon,
  TextIcon,
  PencilIcon,
  SunIcon,
  MoonIcon,
} from '@/components/icons'

const tools: {
  id: Tool
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'select', label: '選択', icon: SelectIcon },
  { id: 'rectangle', label: '矩形', icon: RectangleIcon },
  { id: 'circle', label: '円', icon: CircleIcon },
  { id: 'line', label: '線', icon: LineIcon },
  { id: 'arrow', label: '矢印', icon: ArrowIcon },
  { id: 'text', label: 'テキスト', icon: TextIcon },
  { id: 'pencil', label: '鉛筆', icon: PencilIcon },
]

export default function Toolbar() {
  const { selectedTool, setSelectedTool, theme, toggleTheme, loadSavedTheme, resetAll } =
    useCanvasStore()

  useEffect(() => {
    // Load saved theme from localStorage after mount (prevents hydration mismatch)
    loadSavedTheme()
  }, [loadSavedTheme])

  const handleReset = () => {
    if (window.confirm('全てのデータをリセットしますか？この操作は取り消せません。')) {
      resetAll()
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold mr-3 text-gray-900 dark:text-gray-100">
            Figma Clone
          </h1>
          <div className="flex gap-0.5">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`p-1.5 rounded transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={tool.label}
                  aria-label={tool.label}
                >
                  <Icon />
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportControls />
          <button
            onClick={handleReset}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            title="全てのデータをリセット"
            aria-label="全てのデータをリセット"
          >
            ALL Reset
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
            aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}

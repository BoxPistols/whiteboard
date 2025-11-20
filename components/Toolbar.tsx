'use client'

import { useState, useEffect } from 'react'
import { useCanvasStore } from '@/lib/store'
import type { Tool } from '@/types'
import ExportImportControls from './ExportImportControls'
import MobileHelpModal from './MobileHelpModal'
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
  const [showHelp, setShowHelp] = useState(false)

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
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 md:px-3 py-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 md:gap-2">
          <h1 className="text-sm md:text-base font-semibold mr-1 md:mr-3 text-gray-900 dark:text-gray-100">
            Figma Clone
          </h1>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`p-2 md:p-1.5 rounded transition-colors touch-manipulation ${
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
        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden sm:block">
            <ExportImportControls />
          </div>
          <button
            onClick={handleReset}
            className="hidden sm:block px-2 md:px-3 py-1 text-xs md:text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors touch-manipulation"
            title="全てのデータをリセット"
            aria-label="全てのデータをリセット"
          >
            ALL Reset
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 md:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors touch-manipulation"
            title="ヘルプ"
            aria-label="ヘルプを表示"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 md:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors touch-manipulation"
            title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
            aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
      <MobileHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

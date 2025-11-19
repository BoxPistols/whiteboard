'use client'

import { useState, useEffect } from 'react'
import { useCanvasStore } from '@/lib/store'
import type { Tool } from '@/types'
import {
  SelectIcon,
  RectangleIcon,
  CircleIcon,
  LineIcon,
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
  { id: 'text', label: 'テキスト', icon: TextIcon },
  { id: 'pencil', label: '鉛筆', icon: PencilIcon },
]

export default function Toolbar() {
  const { selectedTool, setSelectedTool } = useCanvasStore()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleDarkMode = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
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
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          title={isDark ? 'ライトモード' : 'ダークモード'}
          aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  )
}

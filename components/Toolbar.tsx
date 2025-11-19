'use client'

import { useCanvasStore } from '@/lib/store'
import type { Tool } from '@/types'

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: '選択', icon: '⬆️' },
  { id: 'rectangle', label: '矩形', icon: '⬜' },
  { id: 'circle', label: '円', icon: '⭕' },
  { id: 'line', label: '線', icon: '📏' },
  { id: 'text', label: 'テキスト', icon: '📝' },
  { id: 'pencil', label: '鉛筆', icon: '✏️' },
]

export default function Toolbar() {
  const { selectedTool, setSelectedTool } = useCanvasStore()

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold mr-4">Figma Clone</h1>
        <div className="flex gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`px-4 py-2 rounded hover:bg-gray-100 transition-colors ${
                selectedTool === tool.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-white text-gray-700'
              }`}
              title={tool.label}
            >
              <span className="text-lg">{tool.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

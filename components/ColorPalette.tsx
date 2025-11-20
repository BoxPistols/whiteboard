'use client'

import { useState, useEffect } from 'react'
import { defaultColorTokens, type ColorToken, categoryLabels } from '@/lib/colorTokens'

interface ColorPaletteProps {
  onColorSelect: (color: string) => void
  currentColor?: string
  label?: string
}

export default function ColorPalette({ onColorSelect, currentColor, label }: ColorPaletteProps) {
  const [colorTokens, setColorTokens] = useState<ColorToken[]>(defaultColorTokens)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['blue', 'gray']))
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')

  // localStorageからカスタムカラーを読み込み
  useEffect(() => {
    const savedCustomColors = localStorage.getItem('custom-colors')
    if (savedCustomColors) {
      try {
        const customColors = JSON.parse(savedCustomColors) as ColorToken[]
        setColorTokens([...defaultColorTokens, ...customColors])
      } catch (e) {
        console.error('Failed to load custom colors', e)
      }
    }
  }, [])

  // カテゴリー別にカラーをグループ化
  const groupedColors = colorTokens.reduce(
    (acc, token) => {
      if (!acc[token.category]) {
        acc[token.category] = []
      }
      acc[token.category].push(token)
      return acc
    },
    {} as Record<string, ColorToken[]>
  )

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleAddCustomColor = () => {
    const newToken: ColorToken = {
      name: `Custom ${customColor}`,
      value: customColor,
      category: 'custom',
    }

    const customColors = colorTokens.filter((t) => t.category === 'custom')
    customColors.push(newToken)

    // localStorageに保存
    localStorage.setItem('custom-colors', JSON.stringify(customColors))

    setColorTokens([...colorTokens, newToken])
    setShowCustomInput(false)

    // すぐに色を適用
    onColorSelect(customColor)
  }

  const handleRemoveCustomColor = (colorValue: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const updatedTokens = colorTokens.filter(
      (t) => !(t.category === 'custom' && t.value === colorValue)
    )
    setColorTokens(updatedTokens)

    const customColors = updatedTokens.filter((t) => t.category === 'custom')
    localStorage.setItem('custom-colors', JSON.stringify(customColors))
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 px-1">
          {label}
        </label>
      )}

      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 p-1">
        {/* よく使う色（上位10色） */}
        <div className="mb-2">
          <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 px-1 mb-1">
            よく使う色
          </div>
          <div className="grid grid-cols-10 gap-0.5">
            {colorTokens.slice(0, 10).map((token) => (
              <button
                key={token.value}
                onClick={() => onColorSelect(token.value)}
                className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                  currentColor === token.value
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: token.value }}
                title={token.name}
                aria-label={`${token.name}を選択`}
              />
            ))}
          </div>
        </div>

        {/* カテゴリー別カラー */}
        {Object.entries(groupedColors).map(([category, tokens]) => (
          <div key={category} className="mb-1">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs"
            >
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                {categoryLabels[category as ColorToken['category']]} ({tokens.length})
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {expandedCategories.has(category) ? '▼' : '▶'}
              </span>
            </button>

            {expandedCategories.has(category) && (
              <div className="grid grid-cols-10 gap-0.5 px-1 py-1">
                {tokens.map((token) => (
                  <div key={token.value} className="relative group">
                    <button
                      onClick={() => onColorSelect(token.value)}
                      className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                        currentColor === token.value
                          ? 'border-blue-500 ring-1 ring-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: token.value }}
                      title={token.name}
                      aria-label={`${token.name}を選択`}
                    />
                    {category === 'custom' && (
                      <button
                        onClick={(e) => handleRemoveCustomColor(token.value, e)}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="削除"
                        aria-label={`${token.name}を削除`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* カスタムカラー追加 */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="カスタムカラーを追加"
            >
              + カスタムカラー追加
            </button>
          ) : (
            <div className="space-y-1 px-1">
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  aria-label="カスタムカラーを選択"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="flex-1 px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="#000000"
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleAddCustomColor}
                  className="flex-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  aria-label="カスタムカラーを追加"
                >
                  追加
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
                  aria-label="キャンセル"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

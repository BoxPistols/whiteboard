'use client'

import { useState, useEffect, useRef } from 'react'
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

// ハンバーガーメニューアイコン
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

// 閉じるアイコン
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function Toolbar() {
  const {
    selectedTool,
    setSelectedTool,
    theme,
    toggleTheme,
    loadSavedTheme,
    resetAll,
    canvasBackground,
    setCanvasBackground,
    loadSavedCanvasBackground,
    zoom,
    setZoom,
  } = useCanvasStore()
  const [showHelp, setShowHelp] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load saved theme and canvas background from localStorage after mount
    loadSavedTheme()
    loadSavedCanvasBackground()
  }, [loadSavedTheme, loadSavedCanvasBackground])

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside as unknown as EventListener)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside as unknown as EventListener)
    }
  }, [mobileMenuOpen])

  const handleReset = () => {
    if (window.confirm('全てのデータをリセットしますか？この操作は取り消せません。')) {
      resetAll()
    }
  }

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool)
    setMobileMenuOpen(false)
  }

  const handleZoomIn = () => {
    setZoom(Math.min(200, zoom + 25))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(10, zoom - 25))
  }

  // 現在選択されているツールのアイコンを取得
  const SelectedToolIcon = tools.find((t) => t.id === selectedTool)?.icon || SelectIcon

  return (
    <div className="bg-gray-900 md:bg-white md:dark:bg-gray-900 border-b border-gray-700 md:border-gray-200 md:dark:border-gray-700 px-2 md:px-3 py-1.5">
      <div className="flex items-center justify-between">
        {/* 左側: タイトル + ツール */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* モバイル: ハンバーガーメニュー */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded hover:bg-gray-800 text-gray-300 transition-colors touch-manipulation"
              aria-label="メニュー"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            {/* モバイルドロップダウンメニュー */}
            {mobileMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                {/* ツール選択 */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  ツール
                </div>
                {tools.map((tool) => {
                  const Icon = tool.icon
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors touch-manipulation ${
                        selectedTool === tool.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon />
                      <span className="text-sm">{tool.label}</span>
                    </button>
                  )
                })}

                {/* 区切り線 */}
                <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

                {/* その他のアクション */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  アクション
                </div>
                <div className="px-3 py-2">
                  <ExportImportControls />
                </div>
                <button
                  onClick={() => {
                    handleReset()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors touch-manipulation"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                  <span className="text-sm">全てリセット</span>
                </button>
              </div>
            )}
          </div>

          {/* モバイル: 現在のツールを表示 */}
          <div className="md:hidden flex items-center gap-1">
            <div className="p-1.5 rounded bg-blue-900 text-blue-400">
              <SelectedToolIcon />
            </div>
            <span className="text-xs text-gray-400">
              {tools.find((t) => t.id === selectedTool)?.label}
            </span>
          </div>

          {/* デスクトップ: タイトル */}
          <h1 className="hidden md:block text-sm md:text-base font-semibold mr-1 md:mr-3 text-gray-900 dark:text-gray-100">
            Figma Clone
          </h1>

          {/* デスクトップ: ツールバー */}
          <div className="hidden md:flex gap-0.5">
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

        {/* 右側: ズームコントロール + その他ボタン */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* ズームコントロール（モバイル表示） */}
          <div className="flex items-center gap-0.5 mr-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-gray-800 md:hover:bg-gray-100 md:dark:hover:bg-gray-800 text-gray-300 md:text-gray-700 md:dark:text-gray-300 transition-colors touch-manipulation"
              title="ズームアウト"
              aria-label="ズームアウト"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <span className="text-xs text-gray-400 md:text-gray-600 md:dark:text-gray-400 min-w-[36px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-gray-800 md:hover:bg-gray-100 md:dark:hover:bg-gray-800 text-gray-300 md:text-gray-700 md:dark:text-gray-300 transition-colors touch-manipulation"
              title="ズームイン"
              aria-label="ズームイン"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>

          {/* デスクトップのみ: エクスポート・インポート */}
          <div className="hidden md:block">
            <ExportImportControls />
          </div>
          <button
            onClick={handleReset}
            className="hidden md:block px-2 md:px-3 py-1 text-xs md:text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors touch-manipulation"
            title="全てのデータをリセット"
            aria-label="全てのデータをリセット"
          >
            ALL Reset
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 md:p-1.5 rounded hover:bg-gray-800 md:hover:bg-gray-100 md:dark:hover:bg-gray-800 text-gray-300 md:text-gray-700 md:dark:text-gray-300 transition-colors touch-manipulation"
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
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
          </button>
          {/* デスクトップ: Canvas背景色切り替えボタン */}
          <button
            onClick={() =>
              setCanvasBackground(canvasBackground === '#1f2937' ? '#f5f5f5' : '#1f2937')
            }
            className="hidden md:flex p-2 md:p-1.5 rounded border border-gray-200 dark:border-gray-700 transition-colors touch-manipulation"
            title="Canvas背景色を切替"
            aria-label="Canvas背景色を切替"
            style={{ backgroundColor: canvasBackground }}
          >
            <span className="block w-4 h-4 rounded" style={{ backgroundColor: canvasBackground }} />
          </button>
          {/* モバイル: Canvas背景色切り替え（太陽/月アイコン） */}
          <button
            onClick={() =>
              setCanvasBackground(canvasBackground === '#1f2937' ? '#f5f5f5' : '#1f2937')
            }
            className="md:hidden p-2 rounded hover:bg-gray-800 text-gray-300 transition-colors touch-manipulation"
            title={canvasBackground === '#1f2937' ? 'Canvasをライトに' : 'Canvasをダークに'}
            aria-label={
              canvasBackground === '#1f2937' ? 'Canvasをライトモードに' : 'Canvasをダークモードに'
            }
          >
            {canvasBackground === '#1f2937' ? <SunIcon /> : <MoonIcon />}
          </button>
          {/* デスクトップ: テーマ切り替えボタン */}
          <button
            onClick={toggleTheme}
            className="hidden md:block p-2 md:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors touch-manipulation"
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

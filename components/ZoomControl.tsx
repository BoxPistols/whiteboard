'use client'

import { useState, useRef, useEffect } from 'react'
import { useCanvasStore, MIN_ZOOM, MAX_ZOOM } from '@/lib/store'

// Figma 風のズームコントロール: ±ステッパー + クリックで開くポップオーバー
// （正確な % 入力 / プリセット / 画面に合わせる / 選択範囲にズーム / 100%）
const ZOOM_PRESETS = [50, 100, 200] as const
const ZOOM_STEP = 25

export default function ZoomControl() {
  const zoom = useCanvasStore((s) => s.zoom)
  const setZoom = useCanvasStore((s) => s.setZoom)
  const zoomToFit = useCanvasStore((s) => s.zoomToFit)
  const zoomToSelection = useCanvasStore((s) => s.zoomToSelection)
  const resetView = useCanvasStore((s) => s.resetView)
  const selectedObjectId = useCanvasStore((s) => s.selectedObjectId)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 外側クリック / Escape で閉じる
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // 開いたら入力欄に現在値をセットしてフォーカス
  useEffect(() => {
    if (open) {
      setDraft(String(zoom))
      // フォーカスは描画後に
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [open, zoom])

  const commitDraft = () => {
    const parsed = parseInt(draft, 10)
    if (!Number.isNaN(parsed)) setZoom(parsed) // setZoom 側で MIN/MAX にクランプ
    setDraft(String(useCanvasStore.getState().zoom))
  }

  const stepperBtn =
    'p-1.5 rounded hover:bg-gray-800 md:hover:bg-gray-100 md:dark:hover:bg-gray-800 text-gray-300 md:text-gray-700 md:dark:text-gray-300 transition-colors touch-manipulation'

  return (
    <div ref={containerRef} className="relative flex items-center gap-0.5 mr-1">
      <button
        onClick={() => setZoom(zoom - ZOOM_STEP)}
        className={stepperBtn}
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

      <button
        onClick={() => setOpen((v) => !v)}
        className="px-1.5 py-0.5 text-xs rounded text-gray-300 md:text-gray-700 md:dark:text-gray-300 hover:bg-gray-800 md:hover:bg-gray-100 md:dark:hover:bg-gray-800 min-w-[44px] text-center transition-colors touch-manipulation tabular-nums"
        title="ズーム設定"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {zoom}%
      </button>

      <button
        onClick={() => setZoom(zoom + ZOOM_STEP)}
        className={stepperBtn}
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

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-1 w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 p-2"
        >
          {/* 正確な % 入力 */}
          <div className="flex items-center gap-1 px-1 pb-2">
            <input
              ref={inputRef}
              type="number"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitDraft()
                  setOpen(false)
                }
              }}
              onBlur={commitDraft}
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 tabular-nums"
              aria-label="ズーム率（%）"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
          </div>

          {/* プリセット */}
          <div className="flex gap-1 px-1 pb-2">
            {ZOOM_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setZoom(p)
                  setOpen(false)
                }}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors tabular-nums ${
                  zoom === p
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

          {/* アクション */}
          <button
            role="menuitem"
            onClick={() => {
              zoomToFit()
              setOpen(false)
            }}
            className="w-full px-2 py-1.5 text-left text-sm rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            画面に合わせる
          </button>
          <button
            role="menuitem"
            disabled={!selectedObjectId}
            onClick={() => {
              zoomToSelection()
              setOpen(false)
            }}
            className="w-full px-2 py-1.5 text-left text-sm rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            選択範囲にズーム
          </button>
          <button
            role="menuitem"
            onClick={() => {
              resetView()
              setOpen(false)
            }}
            className="w-full px-2 py-1.5 text-left text-sm rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            位置をリセット（100%）
          </button>
        </div>
      )}
    </div>
  )
}

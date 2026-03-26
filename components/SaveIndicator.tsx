'use client'

import { useEffect, useState } from 'react'
import { useCanvasStore } from '@/lib/store'

export default function SaveIndicator() {
  const saveStatus = useCanvasStore((s) => s.saveStatus)
  const saveError = useCanvasStore((s) => s.saveError)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (saveStatus === 'error') {
      setShowError(true)
    }
  }, [saveStatus, saveError])

  if (!showError || saveStatus !== 'error') return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4">
      <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="flex-1 text-sm">
          <p className="font-semibold">保存に失敗しました</p>
          <p className="mt-1 opacity-90">
            {saveError || 'データを保存できませんでした。作業内容をエクスポートしてバックアップしてください。'}
          </p>
        </div>
        <button
          onClick={() => setShowError(false)}
          className="flex-shrink-0 p-1 hover:bg-red-500 rounded transition-colors"
          aria-label="閉じる"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

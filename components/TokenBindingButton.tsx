'use client'

import { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/lib/store'
import { PROP_ALLOWED_TYPES, TOKEN_LABELS, type BindableProp } from '@/lib/tokens/tokenConstants'

// 鎖（リンク）アイコン
function LinkIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// プロパティ（fill/stroke/strokeWidth/fontSize）をデザイントークンへバインドするボタン + ドロップダウン。
// 型に合うトークンのみ候補表示。バインド中はトークン名、参照先欠番は orphan 表示。
export default function TokenBindingButton({
  prop,
  boundTokenId,
}: {
  prop: BindableProp
  boundTokenId?: string
}) {
  const tokensData = useCanvasStore((s) => s.tokensData)
  const bindObjectProperty = useCanvasStore((s) => s.bindObjectProperty)
  const unbindObjectProperty = useCanvasStore((s) => s.unbindObjectProperty)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const allowed = PROP_ALLOWED_TYPES[prop]
  const candidates = tokensData.tokens.filter((t) => allowed.includes(t.type))
  const boundToken = boundTokenId ? tokensData.tokens.find((t) => t.id === boundTokenId) : undefined
  const isOrphan = !!boundTokenId && !boundToken
  const collectionName = (id: string) => tokensData.collections.find((c) => c.id === id)?.name ?? ''

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={TOKEN_LABELS.bindToToken}
        aria-label={TOKEN_LABELS.bindToToken}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          boundToken ? 'bg-blue-50 dark:bg-blue-900/30' : ''
        }`}
      >
        <LinkIcon active={!!boundToken} />
      </button>
      {boundToken && (
        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 truncate max-w-[90px]">
          {boundToken.name}
        </span>
      )}
      {isOrphan && (
        <span
          className="text-[10px] text-red-500 truncate max-w-[110px]"
          title={TOKEN_LABELS.missingToken}
        >
          {TOKEN_LABELS.missingToken}
        </span>
      )}

      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 py-1">
          {boundTokenId && (
            <button
              type="button"
              onClick={() => {
                unbindObjectProperty(prop)
                setOpen(false)
              }}
              className="w-full text-left px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {TOKEN_LABELS.unbind}
            </button>
          )}
          {candidates.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-gray-400">{TOKEN_LABELS.tokens}: 0</div>
          ) : (
            candidates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  bindObjectProperty(prop, t.id)
                  setOpen(false)
                }}
                className={`w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  t.id === boundTokenId
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-mono">{t.name}</span>
                <span className="ml-1 text-gray-400">{collectionName(t.collectionId)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

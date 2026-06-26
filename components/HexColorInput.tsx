'use client'

import { useEffect, useState } from 'react'

// #rgb / #rrggbb（# 省略可）を許容
const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function normalize(input: string): string | null {
  const v = input.trim()
  if (!HEX_RE.test(v)) return null
  let hex = v.startsWith('#') ? v.slice(1) : v
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return '#' + hex.toLowerCase()
}

// スウォッチ横に置くインライン HEX 入力。入力中はドラフト保持し、Enter/blur で確定。
// 不正値は元の値へ戻す。外部からの値変更（カラーピッカー操作等）は同期する。
export default function HexColorInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (hex: string) => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    const normalized = normalize(draft)
    if (normalized) {
      onChange(normalized)
      setDraft(normalized)
    } else {
      setDraft(value) // 不正入力は破棄して元へ戻す
    }
  }

  return (
    <input
      type="text"
      value={draft}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
      }}
      onBlur={commit}
      aria-label="HEX カラー"
      className={
        className ??
        'w-full px-2 py-1 text-xs font-mono uppercase border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }
    />
  )
}

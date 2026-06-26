'use client'

import type { InputHTMLAttributes } from 'react'

const DEFAULT_CLASS =
  'w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'value'
> & {
  value: number
  onValueChange: (value: number) => void
}

// type=number の共通入力。
// - フォーカス中のホイールで値が勝手に変わる事故を onWheel blur で抑止（プロジェクト共通規約）。
// - 空入力などで parseInt が NaN になった場合は onValueChange を呼ばず、不正値の混入を防ぐ。
export default function NumberInput({
  value,
  onValueChange,
  className,
  ...rest
}: NumberInputProps) {
  return (
    <input
      type="number"
      className={className ?? DEFAULT_CLASS}
      value={value}
      onChange={(e) => {
        const parsed = parseInt(e.target.value, 10)
        if (!Number.isNaN(parsed)) onValueChange(parsed)
      }}
      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
      {...rest}
    />
  )
}

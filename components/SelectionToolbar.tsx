'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import AlignmentPanel from './AlignmentPanel'

// 選択範囲に追従するフローティングツールバーの状態（画面座標）。
// x = bbox 中央, y = アンカー（above なら bbox 上端 / below なら下端）。
export interface SelectionToolbarState {
  x: number
  y: number
  below: boolean
}

export interface SelectionToolbarHandle {
  setState: (s: SelectionToolbarState | null) => void
}

interface SelectionToolbarProps {
  onAlignLeft: () => void
  onAlignCenter: () => void
  onAlignRight: () => void
  onAlignTop: () => void
  onAlignMiddle: () => void
  onAlignBottom: () => void
  onDistributeHorizontal: () => void
  onDistributeVertical: () => void
}

const GAP = 8

// 選択範囲の上（画面端なら下）に整列ツールバーを表示する。
// store を経由せず ref 経由で位置/表示を更新するため、ドラッグ中の高頻度更新でも
// このコンポーネントだけ再描画し、Canvas を再描画させない。
const SelectionToolbar = forwardRef<SelectionToolbarHandle, SelectionToolbarProps>(
  function SelectionToolbar(props, ref) {
    const [state, setState] = useState<SelectionToolbarState | null>(null)
    useImperativeHandle(ref, () => ({ setState }), [])

    if (!state) return null

    return (
      <div
        className="pointer-events-auto absolute z-10"
        style={{
          left: state.x,
          top: state.y,
          transform: state.below
            ? `translate(-50%, ${GAP}px)`
            : `translate(-50%, calc(-100% - ${GAP}px))`,
        }}
      >
        <AlignmentPanel {...props} />
      </div>
    )
  }
)

export default SelectionToolbar

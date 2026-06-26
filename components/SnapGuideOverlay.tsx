'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { ScreenGuide } from '@/lib/snapping'

export interface SnapGuideOverlayHandle {
  setGuides: (guides: ScreenGuide[]) => void
}

// スマートスナップのガイド線を描く軽量オーバーレイ。
// store を経由せず ref 経由で更新することで、ドラッグ中の高頻度更新でも
// Canvas など他コンポーネントを再描画させない（このコンポーネントだけ再描画）。
const SnapGuideOverlay = forwardRef<SnapGuideOverlayHandle>(function SnapGuideOverlay(_props, ref) {
  const [guides, setGuides] = useState<ScreenGuide[]>([])
  useImperativeHandle(ref, () => ({ setGuides }), [])

  if (guides.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    >
      {guides.map((g, i) => (
        <line
          key={i}
          x1={g.x1}
          y1={g.y1}
          x2={g.x2}
          y2={g.y2}
          stroke="#F24E1E"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
    </svg>
  )
})

export default SnapGuideOverlay

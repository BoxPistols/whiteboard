// オブジェクト間のスマートスナップ計算（Figma 風の整列スナップ＋ガイド線）。
// 純粋関数として fabric から切り離し、ユニットテスト可能にしている。

// スナップのしきい値（画面 px）。シーン座標では zoom で割って使う。
export const SNAP_THRESHOLD_PX = 6

export interface SnapBox {
  left: number
  top: number
  width: number
  height: number
}

// ガイド線（シーン座標）。v=縦線(x 固定), h=横線(y 固定)。start/end は線の伸びる範囲。
export interface SnapGuide {
  orientation: 'v' | 'h'
  pos: number
  start: number
  end: number
}

// 画面座標に変換済みのガイド線（オーバーレイ SVG 用）
export interface ScreenGuide {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SnapResult {
  dx: number
  dy: number
  guides: SnapGuide[]
}

// 整列基準: 左/中央/右（X）、上/中央/下（Y）
function xEdges(b: SnapBox): number[] {
  return [b.left, b.left + b.width / 2, b.left + b.width]
}
function yEdges(b: SnapBox): number[] {
  return [b.top, b.top + b.height / 2, b.top + b.height]
}

/**
 * active を others に整列スナップするための (dx, dy) とガイド線を計算する。
 * X 軸 / Y 軸は独立に、最も近い整列（しきい値以内）を1つずつ採用する。
 * @param threshold シーン座標でのしきい値（= 画面 px / zoom）
 */
export function computeSnap(active: SnapBox, others: SnapBox[], threshold: number): SnapResult {
  const axs = xEdges(active)
  const ays = yEdges(active)

  let bestX: { delta: number; pos: number; other: SnapBox } | null = null
  let bestY: { delta: number; pos: number; other: SnapBox } | null = null

  for (const o of others) {
    for (const ox of xEdges(o)) {
      for (const ax of axs) {
        const delta = ox - ax
        const ad = Math.abs(delta)
        if (ad <= threshold && (!bestX || ad < Math.abs(bestX.delta))) {
          bestX = { delta, pos: ox, other: o }
        }
      }
    }
    for (const oy of yEdges(o)) {
      for (const ay of ays) {
        const delta = oy - ay
        const ad = Math.abs(delta)
        if (ad <= threshold && (!bestY || ad < Math.abs(bestY.delta))) {
          bestY = { delta, pos: oy, other: o }
        }
      }
    }
  }

  const dx = bestX ? bestX.delta : 0
  const dy = bestY ? bestY.delta : 0

  const guides: SnapGuide[] = []
  if (bestX) {
    // 縦ガイド: 移動後の active と相手の y 範囲を内包する線にする
    const aTop = active.top + dy
    const aBottom = active.top + active.height + dy
    guides.push({
      orientation: 'v',
      pos: bestX.pos,
      start: Math.min(aTop, bestX.other.top),
      end: Math.max(aBottom, bestX.other.top + bestX.other.height),
    })
  }
  if (bestY) {
    const aLeft = active.left + dx
    const aRight = active.left + active.width + dx
    guides.push({
      orientation: 'h',
      pos: bestY.pos,
      start: Math.min(aLeft, bestY.other.left),
      end: Math.max(aRight, bestY.other.left + bestY.other.width),
    })
  }

  return { dx, dy, guides }
}

/**
 * シーン座標のガイド線を、ビューポート（zoom + パン量）を使って画面座標の線分へ変換する。
 */
export function toScreenGuides(
  guides: SnapGuide[],
  zoom: number,
  panX: number,
  panY: number
): ScreenGuide[] {
  return guides.map((g) => {
    if (g.orientation === 'v') {
      const x = g.pos * zoom + panX
      return { x1: x, y1: g.start * zoom + panY, x2: x, y2: g.end * zoom + panY }
    }
    const y = g.pos * zoom + panY
    return { x1: g.start * zoom + panX, y1: y, x2: g.end * zoom + panX, y2: y }
  })
}

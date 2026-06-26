import { describe, it, expect } from 'vitest'
import { computeSnap, toScreenGuides } from '../snapping'
import type { SnapBox } from '../snapping'

describe('computeSnap', () => {
  it('snaps edges to another object when within threshold and emits a vertical guide', () => {
    const active: SnapBox = { left: 103, top: 50, width: 40, height: 40 }
    const other: SnapBox = { left: 100, top: 200, width: 40, height: 40 }
    const r = computeSnap(active, [other], 6)
    expect(r.dx).toBe(-3) // 100 - 103
    expect(r.dy).toBe(0) // 縦に離れているので y は揃わない
    expect(r.guides.some((g) => g.orientation === 'v' && g.pos === 100)).toBe(true)
  })

  it('does not snap (and emits no guide) when no edge is within the threshold', () => {
    // どの整列基準同士も 6px より離れているように配置する
    const active: SnapBox = { left: 120, top: 50, width: 40, height: 40 }
    const other: SnapBox = { left: 200, top: 300, width: 40, height: 40 }
    const r = computeSnap(active, [other], 6)
    expect(r.dx).toBe(0)
    expect(r.dy).toBe(0)
    expect(r.guides).toHaveLength(0)
  })

  it('picks the closest alignment among multiple candidates', () => {
    const active: SnapBox = { left: 104, top: 0, width: 10, height: 10 }
    const o1: SnapBox = { left: 100, top: 100, width: 10, height: 10 } // 左端 delta -4
    const o2: SnapBox = { left: 105, top: 100, width: 10, height: 10 } // 左端 delta +1（より近い）
    const r = computeSnap(active, [o1, o2], 6)
    expect(Math.abs(r.dx)).toBe(1)
  })

  it('snaps both axes (center alignment) for overlapping boxes', () => {
    const other: SnapBox = { left: 100, top: 100, width: 100, height: 100 }
    const active: SnapBox = { left: 102, top: 103, width: 100, height: 100 }
    const r = computeSnap(active, [other], 6)
    expect(r.dx).toBe(-2)
    expect(r.dy).toBe(-3)
    expect(r.guides).toHaveLength(2) // 縦・横ガイド
  })
})

describe('toScreenGuides', () => {
  it('converts a vertical scene guide to screen coordinates via zoom + pan', () => {
    const screen = toScreenGuides([{ orientation: 'v', pos: 100, start: 50, end: 150 }], 2, 10, 20)
    // x = 100*2+10 = 210, y1 = 50*2+20 = 120, y2 = 150*2+20 = 320
    expect(screen[0]).toEqual({ x1: 210, y1: 120, x2: 210, y2: 320 })
  })

  it('converts a horizontal scene guide to screen coordinates', () => {
    const screen = toScreenGuides([{ orientation: 'h', pos: 80, start: 0, end: 200 }], 1, 5, 7)
    // y = 80+7 = 87, x1 = 0+5 = 5, x2 = 200+5 = 205
    expect(screen[0]).toEqual({ x1: 5, y1: 87, x2: 205, y2: 87 })
  })
})

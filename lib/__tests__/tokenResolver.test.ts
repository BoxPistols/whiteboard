import { describe, it, expect } from 'vitest'
import type { fabric } from 'fabric'
import {
  resolveToken,
  coerceForProp,
  applyResolvedValue,
  resolveTokensOnCanvas,
} from '../tokens/tokenResolver'
import type { TokensData } from '../tokens/tokenTypes'

const data: TokensData = {
  version: 1,
  modes: [
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
  ],
  collections: [{ id: 'c1', name: 'Brand', modeIds: ['light', 'dark'] }],
  tokens: [
    {
      id: 't-fill',
      name: 'brand/primary',
      collectionId: 'c1',
      type: 'color',
      values: { light: '#ffffff', dark: '#000000' },
    },
    {
      id: 't-size',
      name: 'space/sm',
      collectionId: 'c1',
      type: 'dimension',
      values: { light: 4, dark: 8 },
    },
    // light のみ定義（fallback 確認用）
    {
      id: 't-partial',
      name: 'partial',
      collectionId: 'c1',
      type: 'color',
      values: { light: '#abcabc' },
    },
  ],
}

// 最小限の fabric オブジェクトモック
function mockObj(init: Partial<fabric.Object> & { data?: fabric.Object['data'] }) {
  const o = {
    type: 'rect',
    dirty: false,
    ...init,
    set(key: string, value: unknown) {
      ;(this as Record<string, unknown>)[key] = value
      return this
    },
  }
  return o as unknown as fabric.Object
}

describe('resolveToken', () => {
  it('指定モードの値を返す', () => {
    expect(resolveToken(data, 't-fill', 'light')).toBe('#ffffff')
    expect(resolveToken(data, 't-fill', 'dark')).toBe('#000000')
    expect(resolveToken(data, 't-size', 'dark')).toBe(8)
  })

  it('モードに値が無ければコレクション先頭モードへフォールバック', () => {
    // t-partial は dark 未定義 → collection 先頭(light)へ
    expect(resolveToken(data, 't-partial', 'dark')).toBe('#abcabc')
  })

  it('存在しないトークンは undefined（orphan）', () => {
    expect(resolveToken(data, 'missing', 'light')).toBeUndefined()
  })
})

describe('coerceForProp', () => {
  it('色プロパティは文字列を維持', () => {
    expect(coerceForProp('#fff', 'fill')).toBe('#fff')
    expect(coerceForProp('#fff', 'stroke')).toBe('#fff')
  })
  it('dimension/number は数値へ（"4px" は parseFloat）', () => {
    expect(coerceForProp(4, 'strokeWidth')).toBe(4)
    expect(coerceForProp('4px', 'strokeWidth')).toBe(4)
    expect(coerceForProp('12.5rem', 'fontSize')).toBe(12.5)
  })
  it('数値化できない値は 0', () => {
    expect(coerceForProp('abc', 'strokeWidth')).toBe(0)
  })
})

describe('applyResolvedValue', () => {
  it('色は base 色と baseTheme を同期する', () => {
    const obj = mockObj({ type: 'rect', data: { id: 'o1' } })
    applyResolvedValue(obj, 'fill', '#123456', 'dark')
    expect(obj.fill).toBe('#123456')
    expect(obj.data?.baseFill).toBe('#123456')
    expect(obj.data?.baseTheme).toBe('dark')
    expect(obj.dirty).toBe(true)
  })

  it('fontSize は非テキストには適用しない', () => {
    const rect = mockObj({ type: 'rect', data: { id: 'o2' } })
    applyResolvedValue(rect, 'fontSize', 20, 'light')
    expect((rect as unknown as { fontSize?: number }).fontSize).toBeUndefined()

    const text = mockObj({ type: 'i-text', data: { id: 'o3' } })
    applyResolvedValue(text, 'fontSize', 20, 'light')
    expect((text as unknown as { fontSize?: number }).fontSize).toBe(20)
  })
})

describe('resolveTokensOnCanvas', () => {
  function mockCanvas(objects: fabric.Object[]) {
    let rendered = false
    return {
      getObjects: () => objects,
      requestRenderAll: () => {
        rendered = true
      },
      get rendered() {
        return rendered
      },
    } as unknown as fabric.Canvas & { rendered: boolean }
  }

  it('tokenRefs を持つオブジェクトのみ解決し、無いものは触らない', () => {
    const bound = mockObj({
      type: 'rect',
      fill: '#old',
      data: { id: 'b', tokenRefs: { fill: 't-fill' } },
    })
    const plain = mockObj({ type: 'rect', fill: '#keep', data: { id: 'p' } })
    const canvas = mockCanvas([bound, plain])

    const changed = resolveTokensOnCanvas(canvas, data, 'dark', 'dark')
    expect(changed).toBe(true)
    expect(bound.fill).toBe('#000000') // dark モードの値
    expect(plain.fill).toBe('#keep') // 未バインドは不変
  })

  it('orphan 参照（削除済みトークン）は既存値を維持する', () => {
    const orphan = mockObj({
      type: 'rect',
      fill: '#keep',
      data: { id: 'o', tokenRefs: { fill: 'deleted' } },
    })
    const canvas = mockCanvas([orphan])
    const changed = resolveTokensOnCanvas(canvas, data, 'light', 'light')
    expect(changed).toBe(false)
    expect(orphan.fill).toBe('#keep')
  })
})

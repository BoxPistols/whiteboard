import { describe, it, expect } from 'vitest'
import { exportToDTCG, importFromDTCG } from '../tokens/dtcg'
import type { TokensData } from '../tokens/tokenTypes'

const sample: TokensData = {
  version: 1,
  modes: [
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
  ],
  collections: [{ id: 'c1', name: 'Brand', modeIds: ['light', 'dark'] }],
  tokens: [
    {
      id: 't1',
      name: 'brand/primary',
      collectionId: 'c1',
      type: 'color',
      values: { light: '#ffffff', dark: '#000000' },
    },
    {
      id: 't2',
      name: 'space/sm',
      collectionId: 'c1',
      type: 'dimension',
      values: { light: 4, dark: 8 },
    },
  ],
}

// トークンID は import で再採番されるため、比較対象から除外して正規化する
function normalize(d: TokensData) {
  const collName = (id: string) => d.collections.find((c) => c.id === id)?.name
  return {
    modes: d.modes,
    collections: d.collections.map((c) => ({ name: c.name, modeIds: c.modeIds })),
    tokens: d.tokens
      .map((t) => ({
        name: t.name,
        type: t.type,
        collection: collName(t.collectionId),
        values: t.values,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

describe('DTCG export/import', () => {
  it('ロスレス roundtrip（ID を除く）', () => {
    const dtcg = exportToDTCG(sample)
    const back = importFromDTCG(dtcg)
    expect(normalize(back)).toEqual(normalize(sample))
  })

  it('export は DTCG 形状（$type/$value/$extensions, コレクショングループ）になる', () => {
    const dtcg = exportToDTCG(sample) as Record<string, Record<string, Record<string, unknown>>>
    // メタ
    expect((dtcg.$extensions as Record<string, unknown>)['com.whiteboard.tokens']).toBeDefined()
    // コレクション名のグループ → パスネスト → リーフ
    const leaf = dtcg.Brand.brand.primary as {
      $type: string
      $value: string
      $extensions: Record<string, unknown>
    }
    expect(leaf.$type).toBe('color')
    expect(leaf.$value).toBe('#ffffff') // 先頭モード(light)
    expect((leaf.$extensions['com.whiteboard.modeValues'] as Record<string, unknown>).dark).toBe(
      '#000000'
    )
  })

  it('モード欠損トークンは欠損モードを補完する（light のみ → dark へ複製）', () => {
    // $extensions を持たない最小 DTCG（$value のみ）
    const minimal = {
      Imported: {
        only: { $type: 'color', $value: '#abcdef' },
      },
    }
    const data = importFromDTCG(minimal)
    const tok = data.tokens.find((t) => t.name === 'only')!
    expect(tok.type).toBe('color')
    // 既定モード（light/dark）両方に値が入る
    expect(tok.values.light).toBe('#abcdef')
    expect(tok.values.dark).toBe('#abcdef')
    // コレクションは "Imported" として作られる
    expect(data.collections.some((c) => c.name === 'Imported')).toBe(true)
  })

  it('部分モード($extensions に light のみ)も全モードへ補完', () => {
    const dtcg = {
      Brand: {
        partial: {
          $type: 'color',
          $value: '#111111',
          $extensions: { 'com.whiteboard.modeValues': { light: '#111111' } },
        },
      },
      $extensions: {
        'com.whiteboard.tokens': {
          version: 1,
          modes: [
            { id: 'light', name: 'Light' },
            { id: 'dark', name: 'Dark' },
          ],
          collections: [{ id: 'c1', name: 'Brand', modeIds: ['light', 'dark'] }],
        },
      },
    }
    const data = importFromDTCG(dtcg)
    const tok = data.tokens.find((t) => t.name === 'partial')!
    expect(tok.values.light).toBe('#111111')
    expect(tok.values.dark).toBe('#111111') // 補完
  })
})

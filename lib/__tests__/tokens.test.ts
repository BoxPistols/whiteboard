import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../store'
import {
  createEmptyTokensData,
  TOKENS_STORAGE_KEY,
  MODE_LIGHT,
  MODE_DARK,
} from '../tokens/tokenConstants'

// tokensSlice の回帰テスト。合成済みストア経由で CRUD・永続化・サニタイズロードを検証。
// localStorage は tests/setup.ts が beforeEach で Map バックのモックに差し替える。

const reset = () => {
  useCanvasStore.setState({ tokensData: createEmptyTokensData(), tokensVersion: 0 })
}

describe('TokensSlice', () => {
  beforeEach(reset)

  it('初期状態は既定コレクション1件 + light/dark モード + トークン0件', () => {
    const { tokensData } = useCanvasStore.getState()
    expect(tokensData.version).toBe(1)
    expect(tokensData.collections).toHaveLength(1)
    expect(tokensData.modes.map((m) => m.id)).toEqual([MODE_LIGHT, MODE_DARK])
    expect(tokensData.tokens).toHaveLength(0)
  })

  it('addToken は全モードに値をシードし version を bump、localStorage に保存', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({ name: 'brand/primary', collectionId, type: 'color' })

    const { tokensData, tokensVersion } = useCanvasStore.getState()
    expect(tokensData.tokens).toHaveLength(1)
    const tok = tokensData.tokens[0]
    expect(tok.name).toBe('brand/primary')
    expect(Object.keys(tok.values).sort()).toEqual([MODE_DARK, MODE_LIGHT].sort())
    expect(tokensVersion).toBe(1)

    const saved = JSON.parse(localStorage.getItem(TOKENS_STORAGE_KEY)!)
    expect(saved.tokens[0].name).toBe('brand/primary')
  })

  it('addToken は明示 values を尊重する', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({
      name: 'c',
      collectionId,
      type: 'color',
      values: { [MODE_LIGHT]: '#fff', [MODE_DARK]: '#000' },
    })
    const tok = useCanvasStore.getState().tokensData.tokens[0]
    expect(tok.values[MODE_LIGHT]).toBe('#fff')
    expect(tok.values[MODE_DARK]).toBe('#000')
  })

  it('updateToken は値を更新する', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({ name: 'c', collectionId, type: 'color' })
    const id = useCanvasStore.getState().tokensData.tokens[0].id
    useCanvasStore.getState().updateToken(id, {
      name: 'renamed',
      values: { [MODE_LIGHT]: '#123456', [MODE_DARK]: '#222' },
    })
    const tok = useCanvasStore.getState().tokensData.tokens[0]
    expect(tok.name).toBe('renamed')
    expect(tok.values[MODE_LIGHT]).toBe('#123456')
  })

  it('removeToken はトークンを削除する', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({ name: 'c', collectionId, type: 'color' })
    const id = useCanvasStore.getState().tokensData.tokens[0].id
    useCanvasStore.getState().removeToken(id)
    expect(useCanvasStore.getState().tokensData.tokens).toHaveLength(0)
  })

  it('removeCollection は配下トークンもまとめて削除する', () => {
    const { addCollection } = useCanvasStore.getState()
    addCollection('Spacing')
    const spacing = useCanvasStore
      .getState()
      .tokensData.collections.find((c) => c.name === 'Spacing')!
    useCanvasStore.getState().addToken({ name: 's-1', collectionId: spacing.id, type: 'dimension' })
    expect(useCanvasStore.getState().tokensData.tokens).toHaveLength(1)

    useCanvasStore.getState().removeCollection(spacing.id)
    expect(
      useCanvasStore.getState().tokensData.collections.find((c) => c.id === spacing.id)
    ).toBeUndefined()
    expect(useCanvasStore.getState().tokensData.tokens).toHaveLength(0)
  })

  it('addMode は全コレクションへモードを足し、各トークンに値をシードする', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({
      name: 'c',
      collectionId,
      type: 'color',
      values: { [MODE_LIGHT]: '#abc', [MODE_DARK]: '#def' },
    })
    useCanvasStore.getState().addMode('High Contrast')

    const { tokensData } = useCanvasStore.getState()
    expect(tokensData.modes).toHaveLength(3)
    const newMode = tokensData.modes[2]
    // 全コレクションが新モードを保持
    expect(tokensData.collections.every((c) => c.modeIds.includes(newMode.id))).toBe(true)
    // トークンに新モードの値がシードされる（先頭モードの値をコピー）
    expect(tokensData.tokens[0].values[newMode.id]).toBe('#abc')
  })

  it('removeMode は値も消すが、最後の1モードは保護する', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({ name: 'c', collectionId, type: 'color' })
    useCanvasStore.getState().removeMode(MODE_DARK)

    let { tokensData } = useCanvasStore.getState()
    expect(tokensData.modes.map((m) => m.id)).toEqual([MODE_LIGHT])
    expect(MODE_DARK in tokensData.tokens[0].values).toBe(false)

    // 最後の1モードは消えない
    useCanvasStore.getState().removeMode(MODE_LIGHT)
    tokensData = useCanvasStore.getState().tokensData
    expect(tokensData.modes).toHaveLength(1)
  })

  it('loadSavedTokens は妥当な保存値を復元する', () => {
    const collectionId = useCanvasStore.getState().tokensData.collections[0].id
    useCanvasStore.getState().addToken({ name: 'persisted', collectionId, type: 'color' })
    // ストアをリセットしてからロード
    reset()
    expect(useCanvasStore.getState().tokensData.tokens).toHaveLength(0)
    useCanvasStore.getState().loadSavedTokens()
    expect(useCanvasStore.getState().tokensData.tokens[0].name).toBe('persisted')
  })

  it('loadSavedTokens は壊れた/バージョン不一致の保存値を無視する', () => {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify({ version: 999, foo: 'bar' }))
    useCanvasStore.getState().loadSavedTokens()
    // 既定の空データのまま（壊れた値で上書きしない）
    expect(useCanvasStore.getState().tokensData.collections).toHaveLength(1)

    localStorage.setItem(TOKENS_STORAGE_KEY, 'not-json{')
    useCanvasStore.getState().loadSavedTokens()
    expect(useCanvasStore.getState().tokensData.collections).toHaveLength(1)
  })
})

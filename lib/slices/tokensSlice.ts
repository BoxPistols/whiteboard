import type { StateCreator } from 'zustand'
import type { CanvasStore } from '../store'
import type { TokensData, DesignToken, TokenType, TokenValue, ModeId } from '../tokens/tokenTypes'
import {
  TOKENS_STORAGE_KEY,
  TOKENS_DATA_VERSION,
  createEmptyTokensData,
  TOKEN_TYPE_DEFAULT_VALUE,
} from '../tokens/tokenConstants'

// デザイントークンのレジストリ（ボード全体・localStorage 永続化）のスライス。
// 解決レイヤー（tokenResolver）は別モジュール。ここは純粋なレジストリ CRUD のみ。
export interface TokensSlice {
  tokensData: TokensData
  // 変更のたびに +1。Canvas 側の再解決エフェクトのトリガーに使う（履歴/保存は汚さない）
  tokensVersion: number
  addCollection: (name: string) => void
  removeCollection: (id: string) => void
  renameCollection: (id: string, name: string) => void
  addMode: (name: string) => void
  removeMode: (id: ModeId) => void
  addToken: (input: {
    name: string
    collectionId: string
    type: TokenType
    values?: Record<ModeId, TokenValue>
  }) => void
  updateToken: (id: string, updates: Partial<Omit<DesignToken, 'id'>>) => void
  removeToken: (id: string) => void
  setTokensData: (data: TokensData) => void
  loadSavedTokens: () => void
}

// localStorage へ保存（SSR ガード + try/catch、他スライスと同パターン）
const persistTokens = (data: TokensData) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save tokens:', e)
  }
}

// 汚染された localStorage を弾くための最小バリデーション
const isValidTokensData = (raw: unknown): raw is TokensData => {
  if (!raw || typeof raw !== 'object') return false
  const d = raw as Record<string, unknown>
  return (
    d.version === TOKENS_DATA_VERSION &&
    Array.isArray(d.collections) &&
    Array.isArray(d.tokens) &&
    Array.isArray(d.modes)
  )
}

export const createTokensSlice: StateCreator<CanvasStore, [], [], TokensSlice> = (set, get) => {
  // 共通: 新しい TokensData を確定し、永続化 + version bump
  const commit = (next: TokensData) => {
    persistTokens(next)
    set({ tokensData: next, tokensVersion: get().tokensVersion + 1 })
  }

  return {
    tokensData: createEmptyTokensData(),
    tokensVersion: 0,
    addCollection: (name) => {
      const { tokensData } = get()
      const collection = {
        id: crypto.randomUUID(),
        name,
        modeIds: tokensData.modes.map((m) => m.id),
      }
      commit({ ...tokensData, collections: [...tokensData.collections, collection] })
    },
    removeCollection: (id) => {
      const { tokensData } = get()
      commit({
        ...tokensData,
        collections: tokensData.collections.filter((c) => c.id !== id),
        // コレクション削除時は配下トークンも削除（孤児トークン防止）
        tokens: tokensData.tokens.filter((t) => t.collectionId !== id),
      })
    },
    renameCollection: (id, name) => {
      const { tokensData } = get()
      commit({
        ...tokensData,
        collections: tokensData.collections.map((c) => (c.id === id ? { ...c, name } : c)),
      })
    },
    addMode: (name) => {
      const { tokensData } = get()
      const modeId = crypto.randomUUID()
      const firstMode = tokensData.modes[0]?.id
      commit({
        ...tokensData,
        modes: [...tokensData.modes, { id: modeId, name }],
        // 全コレクションに新モードを追加
        collections: tokensData.collections.map((c) => ({
          ...c,
          modeIds: [...c.modeIds, modeId],
        })),
        // 各トークンに新モードの値をシード（先頭モードの値をコピー＝orphan undefined を避ける）
        tokens: tokensData.tokens.map((t) => ({
          ...t,
          values: {
            ...t.values,
            [modeId]:
              firstMode !== undefined ? t.values[firstMode] : TOKEN_TYPE_DEFAULT_VALUE[t.type],
          },
        })),
      })
    },
    removeMode: (id) => {
      const { tokensData } = get()
      // 最後の1モードは残す（全消し防止）
      if (tokensData.modes.length <= 1) return
      commit({
        ...tokensData,
        modes: tokensData.modes.filter((m) => m.id !== id),
        collections: tokensData.collections.map((c) => ({
          ...c,
          modeIds: c.modeIds.filter((mid) => mid !== id),
        })),
        tokens: tokensData.tokens.map((t) => {
          const { [id]: _removed, ...rest } = t.values
          return { ...t, values: rest }
        }),
      })
    },
    addToken: ({ name, collectionId, type, values }) => {
      const { tokensData } = get()
      // 値未指定時は全モードに型デフォルトをシード
      const seeded: Record<ModeId, TokenValue> =
        values ??
        Object.fromEntries(tokensData.modes.map((m) => [m.id, TOKEN_TYPE_DEFAULT_VALUE[type]]))
      const token: DesignToken = {
        id: crypto.randomUUID(),
        name,
        collectionId,
        type,
        values: seeded,
      }
      commit({ ...tokensData, tokens: [...tokensData.tokens, token] })
    },
    updateToken: (id, updates) => {
      const { tokensData } = get()
      commit({
        ...tokensData,
        tokens: tokensData.tokens.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })
    },
    removeToken: (id) => {
      const { tokensData } = get()
      commit({ ...tokensData, tokens: tokensData.tokens.filter((t) => t.id !== id) })
    },
    setTokensData: (data) => {
      // DTCG インポート等の一括置換
      commit(data)
    },
    loadSavedTokens: () => {
      if (typeof window === 'undefined') return
      try {
        const saved = localStorage.getItem(TOKENS_STORAGE_KEY)
        if (!saved) return
        const raw = JSON.parse(saved) as unknown
        if (!isValidTokensData(raw)) return
        // version bump はしない（ロードは「変更」ではない）
        set({ tokensData: raw })
      } catch (e) {
        console.error('Failed to load tokens:', e)
      }
    },
  }
}

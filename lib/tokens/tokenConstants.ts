import type { TokensData, TokenType } from './tokenTypes'

// 永続化キー（ボード全体。trivial サイズなので localStorage で十分）
export const TOKENS_STORAGE_KEY = 'twb-tokens'

// スキーマバージョン
export const TOKENS_DATA_VERSION = 1 as const

// 既定モード（テーマ light/dark に対応）
export const MODE_LIGHT = 'light'
export const MODE_DARK = 'dark'

// 既定コレクション ID
export const DEFAULT_COLLECTION_ID = 'default'

// トークンが取りうるプロパティ（オブジェクト側の参照キー）
export const BINDABLE_PROPS = ['fill', 'stroke', 'strokeWidth', 'fontSize'] as const
export type BindableProp = (typeof BINDABLE_PROPS)[number]

// プロパティ別に許可するトークン型（fill/stroke=color、strokeWidth/fontSize=dimension/number）
export const PROP_ALLOWED_TYPES: Record<BindableProp, TokenType[]> = {
  fill: ['color'],
  stroke: ['color'],
  strokeWidth: ['dimension', 'number'],
  fontSize: ['dimension', 'number'],
}

// i18n 対象ラベル（ハードコード禁止のため定数化）
export const TOKEN_TYPE_LABELS: Record<TokenType, string> = {
  color: 'カラー',
  dimension: 'サイズ',
  number: '数値',
}

export const TOKEN_LABELS = {
  panelTitle: 'デザイントークン',
  collections: 'コレクション',
  modes: 'モード',
  tokens: 'トークン',
  addCollection: 'コレクション追加',
  addMode: 'モード追加',
  addToken: 'トークン追加',
  rename: '名前変更',
  remove: '削除',
  close: '閉じる',
  name: '名前',
  type: '種別',
  value: '値',
  bindToToken: 'トークン参照にする',
  unbind: '参照を解除',
  missingToken: '参照先のトークンが見つかりません',
  exportDTCG: 'DTCG エクスポート',
  importDTCG: 'DTCG インポート',
  newCollectionName: '新しいコレクション',
  newModeName: '新しいモード',
  newTokenName: 'new-token',
} as const

// 既定の各型のデフォルト値（新規トークン作成時の初期値）
export const TOKEN_TYPE_DEFAULT_VALUE: Record<TokenType, string | number> = {
  color: '#6B7280',
  dimension: 0,
  number: 0,
}

// 空の初期データ（既定コレクション + light/dark モード、トークンは空）
export const createEmptyTokensData = (): TokensData => ({
  version: TOKENS_DATA_VERSION,
  modes: [
    { id: MODE_LIGHT, name: 'Light' },
    { id: MODE_DARK, name: 'Dark' },
  ],
  collections: [{ id: DEFAULT_COLLECTION_ID, name: 'Default', modeIds: [MODE_LIGHT, MODE_DARK] }],
  tokens: [],
})

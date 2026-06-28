// Variables / デザイントークンの型定義（W3C DTCG 準拠の概念をランタイム表現に落としたもの）。
// 永続化はボード全体（localStorage）。ネストした DTCG 形状は import/export 時のみ materialize する。

// サポートするトークン型（DTCG の $type に対応）
export type TokenType = 'color' | 'dimension' | 'number'

// モード識別子。今は 'light' | 'dark'（テーマ連動）だが将来拡張可能なため string
export type ModeId = string

// トークン値（色は文字列、dimension/number は number か '4px' 等の文字列）
export type TokenValue = string | number

// 単一のデザイントークン。値はモード別に保持する
export interface DesignToken {
  id: string // 安定 ID（crypto.randomUUID）。参照は ID で持ち、リネームしても壊れない
  name: string // DTCG-safe なパス名（例: 'brand/primary'）
  collectionId: string
  type: TokenType
  values: Record<ModeId, TokenValue> // モードごとの具体値
  description?: string
}

// トークンの束（コレクション）
export interface TokenCollection {
  id: string
  name: string // 'Brand Colors' / 'Spacing' 等
  modeIds: ModeId[] // このコレクションが定義するモード
}

// モード定義（light / dark 等）
export interface TokenMode {
  id: ModeId
  name: string
}

// 永続化される全体ブロブ
export interface TokensData {
  version: 1 // スキーマバージョン。後方互換の検知・移行に使う
  collections: TokenCollection[]
  tokens: DesignToken[]
  modes: TokenMode[] // light/dark をシード
}

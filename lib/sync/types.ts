import type { PageData } from '../storage'

// クラウド同期の provider 非依存な型定義。
// OneDrive(MS Graph) を第一実装に、同じインターフェースで Google Drive 等を後から追加できる。

// 1ボード = 1 JSON ファイル（AppFolder/whiteboard/<boardId>.json）。
export interface BoardSnapshot {
  boardId: string
  pages: PageData[]
  // 楽観ロック用の版数（push のたびに +1）。リモートでは ETag 等にマップする。
  rev: number
  // 最終更新時刻（epoch ms）。表示・タイブレーク用。rev が権威。
  lastModified: number
}

// リモート上のメタ情報（本文を落とさず版数だけ確認する用途）
export interface RemoteMeta {
  rev: number
  lastModified: number
}

export type SyncMode = 'manual' | 'auto'

export type SyncState =
  | 'unconfigured' // MS_CLIENT_ID 未設定
  | 'signed-out'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'error'

// クラウドプロバイダの抽象。MSAL/Graph 等の実装はこの背後に閉じ込める。
export interface CloudProvider {
  readonly id: string // 'onedrive' 等
  // ビルド時に client id 等が注入されているか（未設定なら UI は「未設定」を表示）
  isConfigured(): boolean
  isSignedIn(): boolean
  signIn(): Promise<void>
  signOut(): Promise<void>
  // AppFolder の <boardId>.json のメタ（無ければ null）
  getMeta(boardId: string): Promise<RemoteMeta | null>
  download(boardId: string): Promise<BoardSnapshot | null>
  // 楽観ロック付き push。リモートが expectedRev と異なる場合は競合として reject する実装を期待。
  upload(snapshot: BoardSnapshot, expectedRev: number | null): Promise<RemoteMeta>
  list(): Promise<string[]> // 既存ボードID一覧
}

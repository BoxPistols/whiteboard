// 楽観ロック（rev ベース）の同期判定。純粋関数なのでユニットテストで全分岐を検証できる。
//
// モデル: クライアントは「最後にリモートと一致させた版数」を baseRev として保持する。
// - リモートが baseRev のまま       → ローカルが dirty なら upload、そうでなければ in-sync(noop)
// - リモートが baseRev より進んでいる → ローカルが dirty なら conflict、そうでなければ download
// - リモートが存在しない             → 初回 upload
// rev が権威。lastModified は表示・タイブレーク用途のみ。

export interface SyncInputs {
  localRev: number // 現在のローカル版数
  localDirty: boolean // baseRev 以降にローカル変更があるか
  baseRev: number | null // 最後にリモートと一致させた版数（null = 未同期）
  remoteRev: number | null // リモートの現在版数（null = リモートにファイル無し）
}

export type SyncDecision =
  | { action: 'upload'; reason: 'no-remote' | 'local-ahead' }
  | { action: 'download'; reason: 'remote-ahead' | 'initial-pull' }
  | { action: 'conflict'; reason: 'diverged' | 'unsynced-both' }
  | { action: 'noop'; reason: 'in-sync' }

export function decideSync({ localDirty, baseRev, remoteRev }: SyncInputs): SyncDecision {
  // リモートにファイルが無い → 初回アップロード
  if (remoteRev === null) {
    return { action: 'upload', reason: 'no-remote' }
  }

  // リモートはあるが一度も同期していない
  if (baseRev === null) {
    // ローカルにも未保存変更がある → 両者独立に存在 = 競合
    if (localDirty) return { action: 'conflict', reason: 'unsynced-both' }
    return { action: 'download', reason: 'initial-pull' }
  }

  // リモートが我々の base から進んでいる
  if (remoteRev > baseRev) {
    if (localDirty) return { action: 'conflict', reason: 'diverged' }
    return { action: 'download', reason: 'remote-ahead' }
  }

  // リモートは base のまま（remoteRev <= baseRev）。巻き戻りは competing-writer の異常だが
  // 安全側に倒し、ローカル変更があれば upload、無ければ in-sync とする。
  if (localDirty) return { action: 'upload', reason: 'local-ahead' }
  return { action: 'noop', reason: 'in-sync' }
}

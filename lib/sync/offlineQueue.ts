// オフラインキュー: ネット切断中に発生した「push 待ち」ボードIDを保持し、復帰時に再送する。
// ボードごとに最新状態だけを push すれば良いため、キューは boardId の集合（重複排除）で十分。
// localStorage に永続化し、リロードを跨いで pending を保持する。

const STORAGE_KEY = 'twb-sync-queue'

// テスト容易性のため Storage を注入可能にする（既定はブラウザの localStorage）。
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface OfflineQueue {
  enqueue(boardId: string): void
  remove(boardId: string): void
  list(): string[]
  has(boardId: string): boolean
  clear(): void
}

function read(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(storage: StorageLike, ids: string[]): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to persist sync queue:', e)
  }
}

export function createOfflineQueue(storage?: StorageLike): OfflineQueue {
  const store: StorageLike | null =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : null)

  // SSR 等で storage が無い場合はメモリのみ（永続化なし）で動作
  let memory: string[] = store ? read(store) : []

  const persist = () => {
    if (store) write(store, memory)
  }

  return {
    enqueue(boardId) {
      if (!memory.includes(boardId)) {
        memory = [...memory, boardId]
        persist()
      }
    },
    remove(boardId) {
      if (memory.includes(boardId)) {
        memory = memory.filter((id) => id !== boardId)
        persist()
      }
    },
    list() {
      return [...memory]
    },
    has(boardId) {
      return memory.includes(boardId)
    },
    clear() {
      memory = []
      persist()
    },
  }
}

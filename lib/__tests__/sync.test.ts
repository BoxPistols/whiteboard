import { describe, it, expect } from 'vitest'
import { decideSync } from '../sync/conflict'
import { createOfflineQueue } from '../sync/offlineQueue'

describe('decideSync (楽観ロック判定)', () => {
  it('リモート無し → 初回 upload', () => {
    expect(decideSync({ localRev: 1, localDirty: true, baseRev: null, remoteRev: null })).toEqual({
      action: 'upload',
      reason: 'no-remote',
    })
  })

  it('未同期 + リモート有り + ローカル変更あり → conflict', () => {
    expect(decideSync({ localRev: 2, localDirty: true, baseRev: null, remoteRev: 5 })).toEqual({
      action: 'conflict',
      reason: 'unsynced-both',
    })
  })

  it('未同期 + リモート有り + ローカル変更なし → download(initial-pull)', () => {
    expect(decideSync({ localRev: 0, localDirty: false, baseRev: null, remoteRev: 5 })).toEqual({
      action: 'download',
      reason: 'initial-pull',
    })
  })

  it('リモートが進んでいる + ローカル変更あり → conflict(diverged)', () => {
    expect(decideSync({ localRev: 4, localDirty: true, baseRev: 3, remoteRev: 7 })).toEqual({
      action: 'conflict',
      reason: 'diverged',
    })
  })

  it('リモートが進んでいる + ローカル変更なし → download(remote-ahead)', () => {
    expect(decideSync({ localRev: 3, localDirty: false, baseRev: 3, remoteRev: 7 })).toEqual({
      action: 'download',
      reason: 'remote-ahead',
    })
  })

  it('リモート=base + ローカル変更あり → upload(local-ahead)', () => {
    expect(decideSync({ localRev: 4, localDirty: true, baseRev: 3, remoteRev: 3 })).toEqual({
      action: 'upload',
      reason: 'local-ahead',
    })
  })

  it('リモート=base + ローカル変更なし → noop(in-sync)', () => {
    expect(decideSync({ localRev: 3, localDirty: false, baseRev: 3, remoteRev: 3 })).toEqual({
      action: 'noop',
      reason: 'in-sync',
    })
  })
})

// Map バックの StorageLike モック
function mockStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

describe('OfflineQueue', () => {
  it('enqueue は重複排除し list で取得できる', () => {
    const q = createOfflineQueue(mockStorage())
    q.enqueue('a')
    q.enqueue('a')
    q.enqueue('b')
    expect(q.list()).toEqual(['a', 'b'])
    expect(q.has('a')).toBe(true)
    expect(q.has('c')).toBe(false)
  })

  it('remove / clear が機能する', () => {
    const q = createOfflineQueue(mockStorage())
    q.enqueue('a')
    q.enqueue('b')
    q.remove('a')
    expect(q.list()).toEqual(['b'])
    q.clear()
    expect(q.list()).toEqual([])
  })

  it('localStorage を跨いで永続化される', () => {
    const storage = mockStorage()
    const q1 = createOfflineQueue(storage)
    q1.enqueue('board-1')
    q1.enqueue('board-2')
    // 同じ storage から作り直すと pending が復元される
    const q2 = createOfflineQueue(storage)
    expect(q2.list()).toEqual(['board-1', 'board-2'])
  })
})

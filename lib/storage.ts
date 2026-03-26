// IndexedDBベースのページデータ永続化
// localStorageの5MB制限を回避するため、大容量のcanvasDataをIndexedDBに保存する

import type { Layer } from '@/types'

const DB_NAME = 'twb-whiteboard'
const DB_VERSION = 1
const STORE_NAME = 'pages'

export interface PageData {
  id: string
  name: string
  canvasData: string | null
  layers: Layer[]
  notes?: string
}

// 保存状態
export type SaveStatus = 'saved' | 'saving' | 'error'

// 保存状態変更リスナー
type SaveStatusListener = (status: SaveStatus, error?: string) => void
const listeners = new Set<SaveStatusListener>()

export function onSaveStatusChange(listener: SaveStatusListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyStatus(status: SaveStatus, error?: string) {
  listeners.forEach((fn) => fn(status, error))
}

// IndexedDBが使えるか判定
let indexedDBAvailable: boolean | null = null

async function checkIndexedDB(): Promise<boolean> {
  if (indexedDBAvailable !== null) return indexedDBAvailable

  if (typeof window === 'undefined' || !window.indexedDB) {
    indexedDBAvailable = false
    return false
  }

  try {
    const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('__twb_test__', 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    testDB.close()
    indexedDB.deleteDatabase('__twb_test__')
    indexedDBAvailable = true
    return true
  } catch {
    indexedDBAvailable = false
    return false
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

// --- localStorageフォールバック ---

function saveToLocalStorage(pages: PageData[]): void {
  localStorage.setItem('twb-pages', JSON.stringify(pages))
}

function loadFromLocalStorage(): PageData[] | null {
  try {
    const saved = localStorage.getItem('twb-pages')
    if (!saved) return null
    const pages = JSON.parse(saved) as PageData[]
    return pages.length > 0 ? pages : null
  } catch {
    return null
  }
}

// --- IndexedDB操作 ---

async function saveToIndexedDB(pages: PageData[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  store.clear()
  for (const page of pages) {
    store.put(page)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      // IndexedDB保存成功後、localStorageの旧データを削除して容量を解放
      try {
        localStorage.removeItem('twb-pages')
      } catch {
        // 無視
      }
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

async function loadFromIndexedDB(): Promise<PageData[] | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const pages = request.result as PageData[]
      resolve(pages.length > 0 ? pages : null)
    }
    request.onerror = () => reject(request.error)
  })
}

// --- 公開API ---

// ページデータを保存（IndexedDB → localStorage フォールバック、リトライ付き）
export async function savePagesToDB(pages: PageData[]): Promise<void> {
  notifyStatus('saving')

  const canUseIDB = await checkIndexedDB()

  if (canUseIDB) {
    // IndexedDBに保存（最大2回リトライ）
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await saveToIndexedDB(pages)
        notifyStatus('saved')
        return
      } catch (error) {
        lastError = error
        // DB接続が壊れた場合はリセットしてリトライ
        dbPromise = null
      }
    }

    // IndexedDB3回失敗 → localStorageにフォールバック
    console.warn('IndexedDB save failed, falling back to localStorage:', lastError)
    try {
      saveToLocalStorage(pages)
      notifyStatus('saved')
      return
    } catch (lsError) {
      // 両方失敗
      const msg =
        lsError instanceof DOMException && lsError.name === 'QuotaExceededError'
          ? 'ストレージ容量が不足しています。不要なページや画像を削除してください。'
          : '保存に失敗しました。ブラウザのストレージ設定を確認してください。'
      notifyStatus('error', msg)
      throw lsError
    }
  }

  // IndexedDB使用不可 → localStorageのみ
  try {
    saveToLocalStorage(pages)
    notifyStatus('saved')
  } catch (error) {
    const msg =
      error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'ストレージ容量が不足しています。不要なページや画像を削除してください。'
        : '保存に失敗しました。ブラウザのストレージ設定を確認してください。'
    notifyStatus('error', msg)
    throw error
  }
}

// ページデータを読み込む（IndexedDB → localStorage フォールバック）
export async function loadPagesFromDB(): Promise<PageData[] | null> {
  const canUseIDB = await checkIndexedDB()

  if (canUseIDB) {
    try {
      const pages = await loadFromIndexedDB()
      if (pages) return pages
    } catch {
      // IndexedDB読み込み失敗 → localStorageにフォールバック
    }
  }

  return loadFromLocalStorage()
}

// localStorageからIndexedDBへの移行
export async function migrateToIndexedDB(): Promise<PageData[] | null> {
  if (typeof window === 'undefined') return null

  try {
    const pages = loadFromLocalStorage()
    if (!pages) return null

    const canUseIDB = await checkIndexedDB()
    if (canUseIDB) {
      // IndexedDBに保存（成功すればlocalStorageからも削除される）
      await saveToIndexedDB(pages)
    }
    return pages
  } catch {
    // 移行失敗してもlocalStorageのデータはそのまま残る
    return loadFromLocalStorage()
  }
}

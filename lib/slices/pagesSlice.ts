import type { StateCreator } from 'zustand'
import type { Layer } from '@/types'
import type { CanvasStore } from '../store'
import {
  savePagesToDB,
  loadPagesFromDB,
  migrateToIndexedDB,
  onSaveStatusChange,
  type SaveStatus,
} from '../storage'
import { type Page, CANVAS_SERIALIZE_PROPS } from '../storeHelpers'

export const defaultPageId = 'page-1'

// デフォルトのページデータ
export const defaultPages = (): Page[] => [
  { id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] },
]

// ページ管理（複数ページ + 永続化 + 初期化）のスライス。store.ts(モノリス)からの段階的分割。
// canvasData は IndexedDB（lib/storage.ts）へ非同期保存。fabricCanvas/layers/history は
// get()/set() 経由で参照する。
export interface PagesSlice {
  pages: Page[]
  currentPageId: string
  // canvas が実際にロード済みのページID。setCurrentPage の保存ガードに使う
  // （currentPageId は切替で即変わるが canvas 内容は非同期ロード完了まで旧ページのまま）
  loadedPageId: string | null
  // ページ初期化完了フラグ（IndexedDB読み込み完了まで自動保存を抑制）
  pagesInitialized: boolean
  // 初期化処理が開始済みか（同期ガード）。pagesInitialized は await 後にしか true に
  // ならず StrictMode の二重実行を弾けないため、開始時点で即立てる同期フラグを別に持つ
  pagesInitStarted: boolean
  // 保存状態
  saveStatus: SaveStatus
  saveError: string | null
  addPage: (name: string) => void
  removePage: (id: string) => void
  setCurrentPage: (id: string) => void
  setLoadedPageId: (id: string | null) => void
  updatePageNotes: (id: string, notes: string) => void
  updatePageData: (id: string, canvasData: string, layers: Layer[]) => void
  initializePages: () => Promise<void>
}

export const createPagesSlice: StateCreator<CanvasStore, [], [], PagesSlice> = (set, get) => ({
  pages: defaultPages(),
  currentPageId: defaultPageId,
  loadedPageId: null,
  pagesInitialized: false,
  pagesInitStarted: false,
  saveStatus: 'saved' as SaveStatus,
  saveError: null,
  addPage: (name) => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      name,
      canvasData: null,
      layers: [],
    }
    const updatedPages = [...get().pages, newPage]

    if (typeof window !== 'undefined') {
      savePagesToDB(updatedPages).catch((error) => {
        console.error('Failed to save pages:', error)
      })
    }

    set({ pages: updatedPages })
  },
  removePage: (id) => {
    const state = get()
    const updatedPages = state.pages.filter((page) => page.id !== id)
    const newCurrentPageId =
      state.currentPageId === id && state.pages.length > 1
        ? state.pages.find((p) => p.id !== id)!.id
        : state.currentPageId

    if (typeof window !== 'undefined') {
      savePagesToDB(updatedPages).catch((error) => {
        console.error('Failed to save pages:', error)
      })
    }

    set({ pages: updatedPages, currentPageId: newCurrentPageId })
  },
  setCurrentPage: (id) => {
    const { fabricCanvas, currentPageId, layers, loadedPageId } = get()

    // 切り替え前に現在のページデータを即座に保存（デバウンス中の変更を失わないため）。
    // ただし canvas が現在ページの内容を保持しているとき（loadedPageId === currentPageId）
    // のみ保存する。高速切替(A→B→A)中は canvas がまだ旧ページを表示しているため、
    // 無条件に保存すると別ページの内容で誤上書きしデータが壊れる。
    if (fabricCanvas && currentPageId !== id && loadedPageId === currentPageId) {
      const json = JSON.stringify(fabricCanvas.toJSON(CANVAS_SERIALIZE_PROPS))
      get().updatePageData(currentPageId, json, layers)
    }

    // ページ切り替え時は履歴をクリア
    set({ currentPageId: id, history: [], historyIndex: -1 })
  },
  setLoadedPageId: (id) => set({ loadedPageId: id }),
  updatePageNotes: (id, notes) => {
    const updatedPages = get().pages.map((page) => (page.id === id ? { ...page, notes } : page))

    if (typeof window !== 'undefined') {
      savePagesToDB(updatedPages).catch((error) => {
        console.error('Failed to save page notes:', error)
      })
    }

    set({ pages: updatedPages })
  },
  updatePageData: (id, canvasData, layers) => {
    const updatedPages = get().pages.map((page) =>
      page.id === id ? { ...page, canvasData, layers } : page
    )

    if (typeof window !== 'undefined') {
      savePagesToDB(updatedPages).catch((error) => {
        console.error('Failed to save pages:', error)
      })
    }

    set({ pages: updatedPages })
  },
  initializePages: async () => {
    if (typeof window === 'undefined') return
    // 二重初期化防止（React StrictMode対策）。pagesInitialized は await 完了後に
    // しか true にならず、StrictMode の2回目マウントを同期で弾けない（リスナー多重登録・
    // 二重読込の原因）。開始時点で即立てる同期フラグ pagesInitStarted で確実に弾く。
    if (get().pagesInitStarted) return
    set({ pagesInitStarted: true })

    // 保存状態リスナーを登録（pagesInitStarted ガードにより初回のみ実行される）
    onSaveStatusChange((status, error) => {
      set({ saveStatus: status, saveError: error || null })
    })

    try {
      // まずIndexedDBから読み込む
      let pages = await loadPagesFromDB()

      // IndexedDBに無い場合、localStorageから移行を試みる
      if (!pages) {
        pages = await migrateToIndexedDB()
      }

      if (pages && pages.length > 0) {
        const currentPageId = get().currentPageId
        const currentPage = pages.find((p) => p.id === currentPageId)
        set({
          pages,
          layers: currentPage?.layers || [],
          pagesInitialized: true,
        })
      } else {
        set({ pagesInitialized: true })
      }
    } catch (error) {
      console.error('Failed to initialize pages from IndexedDB:', error)
      // 初期化失敗でもフラグを立てて自動保存を有効化（デフォルトページで動作継続）
      set({ pagesInitialized: true })
    }
  },
})

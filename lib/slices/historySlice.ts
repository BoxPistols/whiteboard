import type { StateCreator } from 'zustand'
import type { Layer } from '@/types'
import type { CanvasStore } from '../store'
import { CANVAS_SERIALIZE_PROPS } from '../storeHelpers'
import { DARK_CANVAS_BG, LIGHT_CANVAS_BG } from './themeSlice'

const MAX_HISTORY_LENGTH = 5
// 履歴全体のメモリ上限。これを超えたら古いスナップショットを破棄する（OOM 対策）
const MAX_HISTORY_BYTES = 30 * 1024 * 1024 // 30MB
// 単一スナップショットがこのサイズを超える場合は履歴記録をスキップ（巨大画像ペースト直後など）
const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024 // 10MB

// Undo/Redo用の履歴スナップショット
interface HistorySnapshot {
  canvasJSON: string
  layers: Layer[]
}

// Undo/Redo 履歴のスライス。store.ts(モノリス)からの段階的分割（fabric 依存）。
// 履歴はメモリ内のみ保持（永続化しない）。
export interface HistorySlice {
  history: HistorySnapshot[]
  historyIndex: number
  isUndoRedoAction: boolean
  saveHistory: () => void
  clearHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

// undo/redo 共通: 指定インデックスの履歴スナップショットを canvas/layers へ適用する。
// 両者は guard と index 計算以外が完全に同一だったため一本化（store-duplicated-logic）。
const applyHistorySnapshot = (
  get: () => CanvasStore,
  set: (partial: Partial<CanvasStore>) => void,
  newIndex: number
) => {
  const { fabricCanvas, history } = get()
  if (!fabricCanvas) return
  const snapshot = history[newIndex]

  set({ isUndoRedoAction: true })

  fabricCanvas.loadFromJSON(JSON.parse(snapshot.canvasJSON), () => {
    // loadFromJSON が保存時点の背景を復元するため、現在のユーザー設定を再適用
    const { canvasBackground: bg, theme: t } = get()
    fabricCanvas.setBackgroundColor(bg || (t === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG), () =>
      fabricCanvas.renderAll()
    )
    set({
      layers: [...snapshot.layers],
      historyIndex: newIndex,
      isUndoRedoAction: false,
      selectedObjectId: null,
      selectedLayerIds: [],
      selectedObjectProps: null,
    })
  })
}

export const createHistorySlice: StateCreator<CanvasStore, [], [], HistorySlice> = (set, get) => ({
  history: [],
  historyIndex: -1,
  isUndoRedoAction: false,
  saveHistory: () => {
    const { fabricCanvas, layers, history, historyIndex, isUndoRedoAction } = get()
    if (!fabricCanvas || isUndoRedoAction) return

    // 巨大画像を含む canvas では toJSON / stringify が失敗・OOM することがあるため
    // 履歴記録は best-effort に留め、失敗してもアプリは継続させる
    let canvasJSON: string
    try {
      canvasJSON = JSON.stringify(fabricCanvas.toJSON(CANVAS_SERIALIZE_PROPS))
    } catch (e) {
      console.warn('Failed to snapshot canvas for history:', e)
      return
    }

    // スナップショット単体が大きすぎる場合は履歴に積まない（巨大画像ペースト等）。
    // Undo を諦める代わりにアプリの安定性を優先する
    if (canvasJSON.length > MAX_SNAPSHOT_BYTES) {
      console.warn(
        `Skipping history snapshot: canvas size ${(canvasJSON.length / 1024 / 1024).toFixed(1)}MB exceeds limit`
      )
      return
    }

    // 同一内容の連続スナップショットは積まない。
    // add/remove 系操作は「object:added/removed のデバウンスリスナー」と
    // 「アクション内の明示 saveHistory()」の双方から呼ばれ二重記録され、
    // Undo を1回押しても見た目が変わらず2回押す必要が生じていた。
    // canvas 内容(canvasJSON)とレイヤー(layers)が共に直前と同一なら no-op として無視する。
    // layers はストア全体でイミュータブル更新されるため、JSON.stringify せず
    // 長さ＋要素の参照比較（浅い比較）で等価判定できる（大量レイヤー時の負荷を回避）。
    const prev = history[historyIndex]
    const layersUnchanged =
      !!prev && prev.layers.length === layers.length && prev.layers.every((l, i) => l === layers[i])
    if (prev && prev.canvasJSON === canvasJSON && layersUnchanged) {
      return
    }

    const snapshot: HistorySnapshot = {
      canvasJSON,
      layers: [...layers],
    }

    // 現在位置より後の履歴を削除
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)

    // 件数キャップ
    while (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift()
    }

    // バイト数キャップ（合計が閾値超なら古いものから捨てる）
    let totalBytes = newHistory.reduce((sum, s) => sum + s.canvasJSON.length, 0)
    while (newHistory.length > 1 && totalBytes > MAX_HISTORY_BYTES) {
      const dropped = newHistory.shift()
      if (dropped) totalBytes -= dropped.canvasJSON.length
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  undo: () => {
    const { historyIndex } = get()
    if (historyIndex <= 0) return
    applyHistorySnapshot(get, set, historyIndex - 1)
  },
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    applyHistorySnapshot(get, set, historyIndex + 1)
  },
  clearHistory: () => {
    set({ history: [], historyIndex: -1 })
  },
  canUndo: () => {
    const { historyIndex } = get()
    return historyIndex > 0
  },
  canRedo: () => {
    const { history, historyIndex } = get()
    return historyIndex < history.length - 1
  },
})

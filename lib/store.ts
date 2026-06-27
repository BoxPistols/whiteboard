import { create } from 'zustand'
import type { Tool, Layer } from '@/types'
import type { fabric } from 'fabric'
import { savePagesToDB, loadPagesFromDB, migrateToIndexedDB, onSaveStatusChange } from './storage'
import type { SaveStatus } from './storage'
import { createGridSlice, type GridSlice } from './slices/gridSlice'
import { createShortcutsSlice, type ShortcutsSlice } from './slices/shortcutsSlice'
import { createPanelSlice, type PanelSlice } from './slices/panelSlice'
import {
  createThemeSlice,
  type ThemeSlice,
  DARK_CANVAS_BG,
  LIGHT_CANVAS_BG,
} from './slices/themeSlice'
import {
  createStyleDefaultsSlice,
  type StyleDefaultsSlice,
  type StyleDefaults,
} from './slices/styleDefaultsSlice'
import { createNudgeSlice, type NudgeSlice } from './slices/nudgeSlice'
import {
  type Page,
  CANVAS_SERIALIZE_PROPS,
  persistLayersToStorage,
  flattenLayerTree,
  nextFolderName,
  getDescendantIds,
  syncFabricZOrder,
  findFabricObject,
  findStickyPartnerOnCanvas,
  computeObjectsBoundingBox,
  getCanvasData,
} from './storeHelpers'

// 共有ヘルパー由来の公開シンボルは後方互換のため store からも re-export
export { CANVAS_SERIALIZE_PROPS }
export type { Page }

// Canvas 背景のテーマ別デフォルト色は themeSlice に定義。後方互換のため store からも re-export
export { DARK_CANVAS_BG, LIGHT_CANVAS_BG }

// `#rgb` / `#rrggbb` / `rgb(..)` から輝度を推定しダーク背景か判定
// autoInvertText で「現在の背景は暗いか？」を決めるためだけの簡易実装
export const isBackgroundDark = (color: string): boolean => {
  if (!color) return true
  const c = color.trim().toLowerCase()
  let r = 0
  let g = 0
  let b = 0
  if (c.startsWith('#')) {
    const hex = c.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    } else {
      return true
    }
  } else if (c.startsWith('rgb')) {
    const nums = c.match(/\d+(\.\d+)?/g)
    if (!nums || nums.length < 3) return true
    r = Number(nums[0])
    g = Number(nums[1])
    b = Number(nums[2])
  } else {
    return true
  }
  // ITU-R BT.601 相当の輝度。0.5 を閾値にダーク判定
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

// autoInvertText は「既定色（白/黒系）」のテキストだけを反転対象にする
const isDefaultTextColor = (fill: string): boolean => {
  const c = fill.trim().toLowerCase()
  return (
    c === '#000000' ||
    c === '#000' ||
    c === 'black' ||
    c === '#ffffff' ||
    c === '#fff' ||
    c === 'white'
  )
}

export interface ObjectProperties {
  fill?: string
  stroke?: string
  strokeWidth?: number
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
  isArrow?: boolean
}

// 新規作成シェイプに適用されるスタイル既定値（localStorage に永続化）
// shape 用 fill と text 用 fill は用途が異なる（半透明 vs 単色）ため別持ちにする
// StyleDefaults 型は styleDefaultsSlice に定義。後方互換のため store からも re-export
export type { StyleDefaults }

// Undo/Redo用の履歴スナップショット
interface HistorySnapshot {
  canvasJSON: string
  layers: Layer[]
}

// Page 型は storeHelpers に定義（上部で import 済み）

export interface CanvasStore
  extends GridSlice,
    ShortcutsSlice,
    PanelSlice,
    ThemeSlice,
    StyleDefaultsSlice,
    NudgeSlice {
  selectedTool: Tool
  selectedObjectId: string | null
  // レイヤーパネルの複数選択（Cmd/Shift+クリック）。単一選択時も常に同期する
  selectedLayerIds: string[]
  layers: Layer[]
  zoom: number
  fabricCanvas: fabric.Canvas | null
  selectedObjectProps: ObjectProperties | null
  clipboard: fabric.Object | null
  // 付箋ペア用クリップボード（bg/text 両方を保持）
  stickyClipboard: { bg: fabric.Object; text: fabric.Object } | null
  pages: Page[]
  currentPageId: string
  // テーマ/キャンバス背景（theme/canvasBackground）は ThemeSlice（extends）で提供
  // パネル表示/幅（showLeftPanel/showRightPanel/leftPanelWidth/rightPanelWidth）は PanelSlice（extends）で提供
  // ショートカット設定（shortcuts/showShortcutsModal）は ShortcutsSlice（extends）で提供
  // ナッジ設定（nudgeAmount）は NudgeSlice（extends）で提供
  // Undo/Redo履歴
  history: HistorySnapshot[]
  historyIndex: number
  isUndoRedoAction: boolean
  // ページ初期化完了フラグ（IndexedDB読み込み完了まで自動保存を抑制）
  pagesInitialized: boolean
  // 初期化処理が開始済みか（同期ガード）。pagesInitialized は await 後にしか true に
  // ならず StrictMode の二重実行を弾けないため、開始時点で即立てる同期フラグを別に持つ
  pagesInitStarted: boolean
  // canvas が実際にロード済みのページID。setCurrentPage の保存ガードに使う
  // （currentPageId は切替で即変わるが canvas 内容は非同期ロード完了まで旧ページのまま）
  loadedPageId: string | null
  // 保存状態
  saveStatus: SaveStatus
  saveError: string | null
  // グリッド設定は GridSlice（extends）で提供
  // 最後に使ったスタイル（styleDefaults）は StyleDefaultsSlice（extends）で提供
  // 複製モード（Alt+ドラッグ用インジケーター）
  duplicateMode: boolean
  // テキスト色を背景色に応じて自動反転する設定（既定色のみ対象、カスタム色は触らない）
  autoInvertText: boolean
  setSelectedTool: (tool: Tool) => void
  setSelectedObjectId: (id: string | null) => void
  setSelectedLayerIds: (ids: string[]) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  // 複数レイヤーを一括削除（子孫含む）
  removeLayers: (ids: string[]) => void
  // 選択中レイヤーを新規フォルダにまとめる
  groupLayersIntoFolder: (layerIds: string[], name?: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  updateLayerName: (id: string, name: string) => void
  reorderLayers: (startIndex: number, endIndex: number) => void
  moveLayer: (layerId: string, targetParentId: string | null, targetIndex: number) => void
  toggleLayerExpanded: (id: string) => void
  updateLayerChildren: (parentId: string, childIds: string[]) => void
  createFolder: (name?: string) => void
  setZoom: (zoom: number) => void
  setZoomValue: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomToSelection: () => void
  resetZoom: () => void
  resetView: () => void
  setFabricCanvas: (canvas: fabric.Canvas | null) => void
  setSelectedObjectProps: (props: ObjectProperties | null) => void
  updateObjectProperty: (key: keyof ObjectProperties, value: number | string) => void
  setClipboard: (obj: fabric.Object | null) => void
  setStickyClipboard: (pair: { bg: fabric.Object; text: fabric.Object } | null) => void
  addPage: (name: string) => void
  removePage: (id: string) => void
  setCurrentPage: (id: string) => void
  setLoadedPageId: (id: string | null) => void
  updatePageNotes: (id: string, notes: string) => void
  updatePageData: (id: string, canvasData: string, layers: Layer[]) => void
  // パネル関連アクション（toggleLeftPanel/toggleRightPanel/setLeftPanelWidth/setRightPanelWidth）は PanelSlice（extends）で提供
  setLayers: (layers: Layer[]) => void
  // テーマ関連アクション（toggleTheme/loadSavedTheme/setCanvasBackground/loadSavedCanvasBackground）は ThemeSlice（extends）で提供
  resetAll: () => void
  // ショートカット関連アクション（updateShortcut/resetShortcuts/loadSavedShortcuts/setShowShortcutsModal）は ShortcutsSlice（extends）で提供
  // ナッジ関連アクション（setNudgeAmount/loadSavedNudgeAmount）は NudgeSlice（extends）で提供
  // moveSelectedObject は fabric 依存のため store に残置（nudgeAmount は get() 経由で参照）
  moveSelectedObject: (direction: 'up' | 'down' | 'left' | 'right', useNudge: boolean) => void
  // Undo/Redo関連
  saveHistory: () => void
  clearHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  // グリッド関連アクションは GridSlice（extends）で提供
  // スタイル既定値アクション（setStyleDefaults/loadSavedStyleDefaults）は StyleDefaultsSlice（extends）で提供
  // 複製モード
  setDuplicateMode: (on: boolean) => void
  // 選択オブジェクトを複製（Toolbar/ショートカット両対応）
  duplicateSelected: () => void
  // テキスト自動反転
  setAutoInvertText: (on: boolean) => void
  loadSavedAutoInvertText: () => void
  applyAutoInvertText: () => void
  // ページデータの非同期初期化（IndexedDBから読み込み）
  initializePages: () => Promise<void>
}

// 旧プレフィックスから新プレフィックスへのlocalStorageキー移行（モジュールレベルで一度だけ実行）
const migrateLocalStorageKeys = () => {
  if (typeof window === 'undefined') return
  try {
    const OLD_PREFIX = 'figma-clone-'
    const NEW_PREFIX = 'twb-'
    // 移行済みフラグ
    if (localStorage.getItem('twb-migrated')) return
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(OLD_PREFIX)) {
        const newKey = NEW_PREFIX + key.slice(OLD_PREFIX.length)
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, localStorage.getItem(key)!)
        }
      }
    }
    localStorage.setItem('twb-migrated', '1')
  } catch {
    // テスト環境等でlocalStorageが未初期化の場合は無視
  }
}
migrateLocalStorageKeys()

const defaultPageId = 'page-1'

// デフォルトのページデータ
const defaultPages = (): Page[] => [
  { id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] },
]

// 画像を多用するページでは1スナップショットが数MBに達するため、メモリ枯渇によるクラッシュを防ぐ目的で控えめに
const MAX_HISTORY_LENGTH = 5
// 履歴全体のメモリ上限。これを超えたら古いスナップショットを破棄する（OOM 対策）
const MAX_HISTORY_BYTES = 30 * 1024 * 1024 // 30MB
// 単一スナップショットがこのサイズを超える場合は履歴記録をスキップ（巨大画像ペースト直後など）
const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024 // 10MB

// 共有ヘルパー（persistLayersToStorage / flattenLayerTree / nextFolderName /
// getDescendantIds / syncFabricZOrder / findFabricObject / findStickyPartnerOnCanvas /
// CANVAS_SERIALIZE_PROPS）は storeHelpers.ts に集約（上部で import 済み）

// ズーム率の下限/上限（%）。Figma 同様に広いレンジを許可する。
export const MIN_ZOOM = 2
export const MAX_ZOOM = 800

// computeObjectsBoundingBox / getCanvasData は storeHelpers.ts に集約（上部で import 済み）

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

export const useCanvasStore = create<CanvasStore>((set, get, store) => ({
  // グリッド設定スライス（gridEnabled/Size/Color/Opacity/Snap + 関連アクション）を合成
  ...createGridSlice(set, get, store),
  // ショートカット設定スライス（shortcuts/showShortcutsModal + 関連アクション）を合成
  ...createShortcutsSlice(set, get, store),
  // パネル表示/幅スライス（showLeftPanel/showRightPanel/leftPanelWidth/rightPanelWidth + 関連アクション）を合成
  ...createPanelSlice(set, get, store),
  // テーマ/キャンバス背景スライス（theme/canvasBackground + 関連アクション）を合成
  ...createThemeSlice(set, get, store),
  // スタイル既定値スライス（styleDefaults + 関連アクション）を合成
  ...createStyleDefaultsSlice(set, get, store),
  // ナッジ設定スライス（nudgeAmount + 関連アクション）を合成
  ...createNudgeSlice(set, get, store),
  selectedTool: 'select',
  selectedObjectId: null,
  selectedLayerIds: [],
  layers: [],
  zoom: 100,
  fabricCanvas: null,
  selectedObjectProps: null,
  clipboard: null,
  stickyClipboard: null,
  pages: defaultPages(),
  currentPageId: defaultPageId,
  // テーマの初期値・アクションは createThemeSlice で提供
  // パネルの初期値・アクションは createPanelSlice で提供
  // ショートカットの初期値・アクションは createShortcutsSlice で提供
  // ナッジの初期値・アクションは createNudgeSlice で提供
  // Undo/Redo履歴
  history: [],
  historyIndex: -1,
  isUndoRedoAction: false,
  // ページ初期化完了フラグ
  pagesInitialized: false,
  pagesInitStarted: false,
  loadedPageId: null,
  // 保存状態
  saveStatus: 'saved' as SaveStatus,
  saveError: null,
  // グリッド設定の初期値・アクションは createGridSlice で提供
  // スタイル既定値の初期値・アクションは createStyleDefaultsSlice で提供
  duplicateMode: false,
  // デフォルト ON（既定色テキストのみ背景に応じて自動反転）
  autoInvertText: true,
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),
  removeLayers: (ids) =>
    set((state) => {
      const { fabricCanvas } = get()
      if (ids.length === 0) return {}

      // 削除対象（指定IDとその子孫すべて）をまとめて収集し、1回のsetで処理する
      const allIdsToRemove = new Set<string>()
      ids.forEach((id) => {
        allIdsToRemove.add(id)
        getDescendantIds(id, state.layers).forEach((descId) => allIdsToRemove.add(descId))
      })

      // Canvasオブジェクトを一括削除（FRAMEはCanvas上にないのでスキップ）
      if (fabricCanvas) {
        // 削除前にactiveを破棄し、stale な activeSelection を残さない
        fabricCanvas.discardActiveObject()
        allIdsToRemove.forEach((removeId) => {
          const layer = state.layers.find((l) => l.id === removeId)
          if (!layer || layer.type === 'FRAME') return
          const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
          if (obj) fabricCanvas.remove(obj)
        })
        fabricCanvas.renderAll()
      }

      // レイヤー配列から除去しつつ、親のchildrenからも除去
      let updatedLayers = state.layers.filter((l) => !allIdsToRemove.has(l.id))
      updatedLayers = updatedLayers.map((l) =>
        l.children?.some((cid) => allIdsToRemove.has(cid))
          ? { ...l, children: l.children.filter((cid) => !allIdsToRemove.has(cid)) }
          : l
      )

      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)

      // 選択中オブジェクトが削除対象なら selectedObjectId/Props も合わせてクリア
      const removedObjectIds = new Set(
        state.layers.filter((l) => allIdsToRemove.has(l.id)).map((l) => l.objectId)
      )
      const clearSelected = !!state.selectedObjectId && removedObjectIds.has(state.selectedObjectId)

      return {
        ...persistLayersToStorage(state, updatedLayers, canvasData, 'batch layer removal'),
        selectedLayerIds: [],
        ...(clearSelected ? { selectedObjectId: null, selectedObjectProps: null } : {}),
      }
    }),
  setClipboard: (obj) => set({ clipboard: obj }),
  setStickyClipboard: (pair) => set({ stickyClipboard: pair }),
  addLayer: (layer) =>
    set((state) => {
      const { fabricCanvas } = get()
      const updatedLayers = [...state.layers, layer]
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer addition')
    }),
  removeLayer: (id) =>
    set((state) => {
      const { fabricCanvas } = get()

      // 削除対象のIDリスト（自分自身＋子孫すべて）
      const idsToRemove = [id, ...getDescendantIds(id, state.layers)]

      // Canvasからもオブジェクトを削除（子孫含む、FRAMEはCanvas上にオブジェクトがないのでスキップ）
      if (fabricCanvas) {
        for (const removeId of idsToRemove) {
          const layer = state.layers.find((l) => l.id === removeId)
          if (!layer || layer.type === 'FRAME') continue
          const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
          if (obj) {
            fabricCanvas.remove(obj)
          }
        }
        fabricCanvas.renderAll()
      }

      // 親のchildrenからも除去
      const removedLayer = state.layers.find((l) => l.id === id)
      let updatedLayers = state.layers.filter((l) => !idsToRemove.includes(l.id))
      if (removedLayer?.parentId) {
        updatedLayers = updatedLayers.map((l) => {
          if (l.id === removedLayer.parentId && l.children) {
            return { ...l, children: l.children.filter((cid) => cid !== id) }
          }
          return l
        })
      }

      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer removal')
    }),
  toggleLayerVisibility: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === id)
      if (!layer) return {}

      const newVisible = !layer.visible
      // グループの場合は子孫もカスケード
      const descendantIds = getDescendantIds(id, state.layers)
      const idsToUpdate = [id, ...descendantIds]

      const updatedLayers = state.layers.map((l) =>
        idsToUpdate.includes(l.id) ? { ...l, visible: newVisible } : l
      )

      // Fabric.jsオブジェクトの表示/非表示を切り替え（FRAMEはCanvas上にないのでスキップ）
      if (fabricCanvas) {
        for (const updateId of idsToUpdate) {
          const targetLayer = state.layers.find((l) => l.id === updateId)
          if (!targetLayer || targetLayer.type === 'FRAME') continue

          const obj = findFabricObject(fabricCanvas, targetLayer.objectId)
          if (obj) {
            obj.visible = newVisible
            // 付箋 bg と text は同じレイヤーに属さないが、視覚的に一体なので
            // visibility を相棒にも伝播
            const partner = findStickyPartnerOnCanvas(fabricCanvas, obj)
            if (partner) partner.visible = newVisible
          }
        }
        fabricCanvas.renderAll()
      }

      // 可視状態は fabric の既定 toJSON に乗るが、canvasData を更新しないと
      // リロード時に旧 visible が復元される。新しい canvas 状態を再シリアライズして保存。
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer visibility change')
    }),
  toggleLayerLock: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === id)
      if (!layer) return {}

      const newLockState = !layer.locked
      // グループの場合は子孫もカスケード
      const descendantIds = getDescendantIds(id, state.layers)
      const idsToUpdate = [id, ...descendantIds]

      if (fabricCanvas) {
        const lockProps = {
          lockMovementX: newLockState,
          lockMovementY: newLockState,
          lockRotation: newLockState,
          lockScalingX: newLockState,
          lockScalingY: newLockState,
          hasControls: !newLockState,
          selectable: !newLockState,
          evented: !newLockState,
        }
        for (const updateId of idsToUpdate) {
          const targetLayer = state.layers.find((l) => l.id === updateId)
          if (!targetLayer || targetLayer.type === 'FRAME') continue

          const obj = findFabricObject(fabricCanvas, targetLayer.objectId)
          if (obj) {
            obj.set(lockProps)
            // 付箋 bg と text は同じレイヤーに属さないが、一体で操作できるよう
            // lock 状態を相棒にも伝播
            const partner = findStickyPartnerOnCanvas(fabricCanvas, obj)
            if (partner) partner.set(lockProps)
            if (newLockState && fabricCanvas.getActiveObject() === obj) {
              fabricCanvas.discardActiveObject()
            }
          }
        }
        fabricCanvas.renderAll()
      }

      const updatedLayers = state.layers.map((l) =>
        idsToUpdate.includes(l.id) ? { ...l, locked: newLockState } : l
      )

      // ロック系プロパティ(selectable/evented/lock*)は CANVAS_SERIALIZE_PROPS により
      // canvasData へ round-trip する。新しい canvas 状態を再シリアライズして保存。
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer lock change')
    }),
  updateLayerName: (id, name) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, name } : layer
      )
      return persistLayersToStorage(state, updatedLayers, undefined, 'layer name change')
    }),
  reorderLayers: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.layers)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)

      // Fabric.jsでのオブジェクトの描画順序も更新
      const { fabricCanvas } = get()
      if (fabricCanvas) {
        syncFabricZOrder(fabricCanvas, result)
        fabricCanvas.renderAll()
      }

      // z-order は canvasData のオブジェクト配列順そのもの。canvasData を更新しないと
      // 新しい並び順とシリアライズ済み順序がズレてリロードで巻き戻る。
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, result, canvasData, 'layer reorder')
    }),
  moveLayer: (layerId, targetParentId, targetIndex) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === layerId)
      if (!layer) return {}

      // 自分自身や自分の子孫の中には移動できない
      if (targetParentId) {
        const descendantIds = getDescendantIds(layerId, state.layers)
        if (targetParentId === layerId || descendantIds.includes(targetParentId)) {
          return {}
        }
      }

      let updatedLayers = [...state.layers]

      // 1. 旧親のchildrenからlayerIdを除去
      if (layer.parentId) {
        updatedLayers = updatedLayers.map((l) => {
          if (l.id === layer.parentId && l.children) {
            return { ...l, children: l.children.filter((cid) => cid !== layerId) }
          }
          return l
        })
      }

      // 2. 移動元レイヤーのparentIdを更新
      updatedLayers = updatedLayers.map((l) => {
        if (l.id === layerId) {
          return { ...l, parentId: targetParentId || undefined }
        }
        return l
      })

      // 3. 新親のchildrenにlayerIdを挿入
      if (targetParentId) {
        updatedLayers = updatedLayers.map((l) => {
          if (l.id === targetParentId) {
            const currentChildren = (l.children || []).filter((cid) => cid !== layerId)
            const insertIdx = targetIndex < 0 ? currentChildren.length : targetIndex
            const newChildren = [...currentChildren]
            newChildren.splice(insertIdx, 0, layerId)
            return { ...l, children: newChildren, expanded: true }
          }
          return l
        })
      }

      // 4. 全体の配列順序もツリーの表示順に合わせて並べ替え
      // 兄弟間の順序をtargetIndexに基づいて更新
      const siblings = targetParentId
        ? updatedLayers.filter((l) => l.parentId === targetParentId && l.id !== layerId)
        : updatedLayers.filter((l) => !l.parentId && l.id !== layerId)

      const insertIdx = targetIndex < 0 ? siblings.length : Math.min(targetIndex, siblings.length)
      siblings.splice(insertIdx, 0, updatedLayers.find((l) => l.id === layerId)!)

      // 配列全体をツリー順に再構成
      const reordered: Layer[] = []
      const rootLayers = updatedLayers.filter((l) => !l.parentId)
      // ルートの順序をsiblingsで更新（targetParentIdがnullの場合）
      const orderedRoots = targetParentId === null ? siblings : rootLayers

      function reorderTraverse(currentLayerId: string) {
        const l = updatedLayers.find((x) => x.id === currentLayerId)
        if (!l) return
        reordered.push(l)
        // 子の順序
        const childrenOrder =
          targetParentId === currentLayerId
            ? siblings
            : updatedLayers.filter((x) => x.parentId === currentLayerId)
        childrenOrder.forEach((child) => reorderTraverse(child.id))
      }
      orderedRoots.forEach((root) => reorderTraverse(root.id))

      // reorderedに含まれなかったレイヤーも追加（安全対策）
      const reorderedIds = new Set(reordered.map((l) => l.id))
      const remaining = updatedLayers.filter((l) => !reorderedIds.has(l.id))
      const finalLayers = [...reordered, ...remaining]

      // 5. fabric.jsのz-orderをツリーの深さ優先走査順に同期
      if (fabricCanvas) {
        syncFabricZOrder(fabricCanvas, flattenLayerTree(finalLayers))
        fabricCanvas.renderAll()
      }

      // z-order を canvasData に反映（更新しないとリロードでスタッキングが巻き戻る）
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, finalLayers, canvasData, 'layer move')
    }),
  toggleLayerExpanded: (id) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, expanded: !layer.expanded } : layer
      )
      return persistLayersToStorage(state, updatedLayers, undefined, 'layer expanded state')
    }),
  updateLayerChildren: (parentId, childIds) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) => {
        if (layer.id === parentId) {
          return { ...layer, children: childIds }
        }
        if (childIds.includes(layer.id)) {
          return { ...layer, parentId }
        }
        return layer
      })
      return persistLayersToStorage(state, updatedLayers, undefined, 'layer children')
    }),
  createFolder: (name) =>
    set((state) => {
      const folderId = crypto.randomUUID()
      const folderLayer: Layer = {
        id: folderId,
        name: name || nextFolderName(state.layers),
        visible: true,
        locked: false,
        objectId: folderId,
        type: 'FRAME',
        children: [],
        expanded: true,
      }
      const updatedLayers = [folderLayer, ...state.layers]
      return persistLayersToStorage(state, updatedLayers, undefined, 'folder creation')
    }),
  groupLayersIntoFolder: (layerIds, name) =>
    set((state) => {
      if (!layerIds || layerIds.length === 0) return {}
      const { fabricCanvas } = get()
      const idSet = new Set(layerIds)

      // 別の選択レイヤーの子孫は親ごと移動されるので除外（二重移動防止）
      // while条件で cur と cur.parentId を確認し、非null断言を避ける
      const isDescendantOfSelected = (id: string): boolean => {
        let cur = state.layers.find((l) => l.id === id)
        while (cur && cur.parentId) {
          // parentId をconstに取り出し、クロージャ内での型の絞り込みを保つ
          const parentId = cur.parentId
          if (idSet.has(parentId)) return true
          cur = state.layers.find((l) => l.id === parentId)
        }
        return false
      }
      const targets = layerIds.filter((id) => !isDescendantOfSelected(id))
      if (targets.length === 0) return {}
      const targetSet = new Set(targets)

      // フォルダは最初の選択レイヤーの親階層に配置する
      const firstLayer = state.layers.find((l) => l.id === targets[0])
      const folderParentId = firstLayer?.parentId

      const folderId = crypto.randomUUID()
      const folderLayer: Layer = {
        id: folderId,
        name: name || nextFolderName(state.layers),
        visible: true,
        locked: false,
        objectId: folderId,
        type: 'FRAME',
        parentId: folderParentId ?? undefined,
        children: [...targets],
        expanded: true,
      }

      // 選択レイヤーの parentId を folderId に変更し、旧親 children からは除去
      let updatedLayers = state.layers.map((l) => {
        if (targetSet.has(l.id)) return { ...l, parentId: folderId }
        if (l.children?.some((cid) => targetSet.has(cid))) {
          return { ...l, children: l.children.filter((cid) => !targetSet.has(cid)) }
        }
        return l
      })

      // 新親の children にフォルダを追加
      if (folderParentId) {
        updatedLayers = updatedLayers.map((l) =>
          l.id === folderParentId
            ? { ...l, children: [...(l.children || []), folderId], expanded: true }
            : l
        )
      }

      // 表示順は配列順に依存するため、フォルダを最初の選択レイヤーの位置へ挿入
      const firstIdx = updatedLayers.findIndex((l) => l.id === targets[0])
      updatedLayers.splice(Math.max(firstIdx, 0), 0, folderLayer)

      // 非連続レイヤーのグループ化で表示順が変わるため、Fabric.jsのz-orderを
      // ツリーの深さ優先走査順に同期する（moveLayerと同じ手法）
      if (fabricCanvas) {
        syncFabricZOrder(fabricCanvas, flattenLayerTree(updatedLayers))
        fabricCanvas.renderAll()
      }

      // グループ化で z-order が変わるため canvasData も更新（リロードで巻き戻さない）
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return {
        ...persistLayersToStorage(state, updatedLayers, canvasData, 'group into folder'),
        selectedLayerIds: [folderId],
        selectedObjectId: folderId,
      }
    }),
  setZoom: (zoom) => {
    const { fabricCanvas } = get()
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    if (fabricCanvas) {
      // Figma 同様にビューポート中心を固定してズームする。
      // fabricCanvas.setZoom は origin(0,0) 基準で内容が左上へ寄るため使わない。
      // store は fabric を type-only import しているため new fabric.Point は使えない。
      // zoomToPoint は point.x/point.y のみ参照するので素のオブジェクトで十分。
      const center = { x: fabricCanvas.getWidth() / 2, y: fabricCanvas.getHeight() / 2 }
      fabricCanvas.zoomToPoint(center as fabric.Point, clamped / 100)
      fabricCanvas.renderAll()
    }
    set({ zoom: Math.round(clamped) })
  },
  // 数値表示のみ更新（fabric への再適用はしない）。
  // ホイールズームは zoomToPoint でカーソル位置基準に既に適用済みのため、
  // setZoom を使うと origin(0,0) 基準で再適用され二重がけになる。それを避ける用途。
  setZoomValue: (zoom) => set({ zoom }),
  // キーボード/ボタンからのズームイン・アウト（setZoom はビューポート中心基準＋クランプ済み）
  zoomIn: () => get().setZoom(get().zoom + 25),
  zoomOut: () => get().setZoom(get().zoom - 25),
  zoomToFit: () => {
    const { fabricCanvas } = get()
    if (!fabricCanvas) return

    const canvasWidth = fabricCanvas.getWidth()
    const canvasHeight = fabricCanvas.getHeight()

    // すべてのオブジェクトを取得して範囲を計算
    const objects = fabricCanvas.getObjects()
    if (objects.length === 0) {
      get().resetZoom()
      return
    }

    const { width: groupWidth, height: groupHeight } = computeObjectsBoundingBox(objects)

    // 適切なズームレベルを計算（余白10%）
    const zoomX = (canvasWidth * 0.9) / groupWidth
    const zoomY = (canvasHeight * 0.9) / groupHeight
    const zoom = Math.min(zoomX, zoomY) * 100

    get().setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)))
  },
  zoomToSelection: () => {
    const { fabricCanvas, selectedObjectId } = get()
    if (!fabricCanvas || !selectedObjectId) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    const canvasWidth = fabricCanvas.getWidth()
    const canvasHeight = fabricCanvas.getHeight()

    // オブジェクトのバウンディングボックスを取得（現在のtransformを考慮）
    const bound = activeObject.getBoundingRect()
    const objectCenterX = bound.left + bound.width / 2
    const objectCenterY = bound.top + bound.height / 2

    // 適切なズームレベルを計算（余白20%）
    const zoomX = (canvasWidth * 0.8) / bound.width
    const zoomY = (canvasHeight * 0.8) / bound.height
    let zoom = Math.min(zoomX, zoomY) * 100
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

    // オブジェクトを中心にビューポートを移動（オブジェクト自体は動かさない）
    const zoomLevel = zoom / 100
    const vpCenterX = canvasWidth / 2
    const vpCenterY = canvasHeight / 2

    // 現在のビューポート座標でのオブジェクト中心を計算
    const currentVpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
    const currentZoom = currentVpt[0]
    // 画面座標からキャンバス座標に変換
    const objCanvasX = (objectCenterX - currentVpt[4]) / currentZoom
    const objCanvasY = (objectCenterY - currentVpt[5]) / currentZoom

    // 新しいパン位置を計算（オブジェクトがビューポート中央に来るように）
    const panX = vpCenterX - objCanvasX * zoomLevel
    const panY = vpCenterY - objCanvasY * zoomLevel

    fabricCanvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, panX, panY])
    set({ zoom: Math.round(zoom) })
    fabricCanvas.renderAll()
  },
  resetZoom: () => {
    const { fabricCanvas } = get()
    if (fabricCanvas) {
      // ビューポートのtransformをリセット（初期位置に戻す）
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    }
    get().setZoom(100)
  },
  // 全体俯瞰（すべてのオブジェクトが見えるようにズームと位置を調整）
  resetView: () => {
    const { fabricCanvas } = get()
    if (!fabricCanvas) return

    // まずビューポートをリセット
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])

    const objects = fabricCanvas.getObjects()
    if (objects.length === 0) {
      // オブジェクトがない場合は100%表示
      get().setZoom(100)
      return
    }

    const canvasWidth = fabricCanvas.getWidth()
    const canvasHeight = fabricCanvas.getHeight()

    // オブジェクト全体が収まるようにズームと位置を調整
    const {
      width: groupWidth,
      height: groupHeight,
      centerX,
      centerY,
    } = computeObjectsBoundingBox(objects)

    // 適切なズームレベルを計算（余白10%）
    const zoomX = (canvasWidth * 0.9) / groupWidth
    const zoomY = (canvasHeight * 0.9) / groupHeight
    let zoom = Math.min(zoomX, zoomY) * 100

    // resetView は俯瞰用途のため 100% を上限（拡大しない）。zoomToFit とは意図的に異なる。
    zoom = Math.min(zoom, 100)
    zoom = Math.max(zoom, 10)

    // オブジェクトを中央に配置
    const vpCenterX = canvasWidth / 2
    const vpCenterY = canvasHeight / 2

    const zoomLevel = zoom / 100
    const panX = vpCenterX - centerX * zoomLevel
    const panY = vpCenterY - centerY * zoomLevel

    fabricCanvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, panX, panY])
    set({ zoom: Math.round(zoom) })
    fabricCanvas.renderAll()
  },
  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  setSelectedObjectProps: (props) => set({ selectedObjectProps: props }),
  setLayers: (layers) => {
    // 重複排除：同じidを持つレイヤーを削除
    const seenIds = new Set<string>()
    const uniqueLayers = layers.filter((layer) => {
      if (seenIds.has(layer.id)) {
        return false
      }
      seenIds.add(layer.id)
      return true
    })
    set({ layers: uniqueLayers })
  },
  updateObjectProperty: (key, value) => {
    const { fabricCanvas, selectedObjectId, selectedObjectProps, theme } = get()
    if (!fabricCanvas) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // fill/stroke 変更時にテーマ追従用の元色(baseFill/baseStroke)と baseTheme を data へ記録する。
    // 3箇所で重複していたロジックを集約（theme はこのクロージャから参照）。
    const applyBaseColorData = (
      obj: fabric.Object,
      patch: { baseFill?: string; baseStroke?: string }
    ) => {
      const currentData = obj.data || { id: crypto.randomUUID() }
      obj.set({ data: { ...currentData, ...patch, baseTheme: theme } })
    }

    // 単一オブジェクトのプロパティを更新するヘルパー関数
    const updateSingleObject = (obj: fabric.Object) => {
      // 矢印（Path）の場合、fillとstrokeを連動させる
      if (obj.data?.type === 'arrow' && (key === 'fill' || key === 'stroke')) {
        const colorValue = value as string
        obj.set('fill', colorValue)
        obj.set('stroke', colorValue)
        obj.dirty = true

        applyBaseColorData(obj, { baseFill: colorValue, baseStroke: colorValue })
      } else if (
        obj.type === 'group' &&
        (key === 'fill' || key === 'stroke' || key === 'strokeWidth')
      ) {
        // Groupオブジェクトの場合、子要素のプロパティを更新
        const group = obj as fabric.Group
        const items = group.getObjects()
        items.forEach((item) => {
          if (key === 'fill') item.set('fill', value as string)
          else if (key === 'stroke') item.set('stroke', value as string)
          else if (key === 'strokeWidth') item.set('strokeWidth', value as number)
          item.dirty = true
        })
        obj.dirty = true

        // 色が変更された場合、baseColorとbaseThemeを更新
        if (key === 'fill' || key === 'stroke') {
          applyBaseColorData(obj, {
            ...(key === 'fill' && { baseFill: value as string }),
            ...(key === 'stroke' && { baseStroke: value as string }),
          })
        }
      } else if (key === 'width' || key === 'height') {
        // 幅と高さはスケールを考慮して設定
        if (key === 'width' && obj.width) {
          obj.scaleX = (value as number) / obj.width
        } else if (key === 'height' && obj.height) {
          obj.scaleY = (value as number) / obj.height
        }
      } else {
        // 色や他のプロパティを直接設定
        if (key === 'fill') obj.set('fill', value as string)
        else if (key === 'stroke') obj.set('stroke', value as string)
        else if (key === 'strokeWidth') obj.set('strokeWidth', value as number)
        else if (key === 'opacity') obj.set('opacity', value as number)
        else if (key === 'left') obj.set('left', value as number)
        else if (key === 'top') obj.set('top', value as number)

        // 色が変更された場合、baseColorとbaseThemeを更新
        if (key === 'fill' || key === 'stroke') {
          applyBaseColorData(obj, {
            ...(key === 'fill' && { baseFill: value as string }),
            ...(key === 'stroke' && { baseStroke: value as string }),
          })
        }
      }

      obj.setCoords()
      obj.dirty = true
    }

    // 複数選択の場合、すべてのオブジェクトを更新
    if (activeObject.type === 'activeSelection') {
      const selection = activeObject as fabric.ActiveSelection
      const objects = selection.getObjects()
      objects.forEach((obj) => {
        updateSingleObject(obj)
      })
    } else {
      // 単一選択の場合
      updateSingleObject(activeObject)
    }

    // 変更を反映
    activeObject.setCoords()
    activeObject.dirty = true
    fabricCanvas.requestRenderAll()

    // 最後に使ったスタイルを記憶（次回の新規作成で引き継ぎ）
    // テキストの fill は shape の fill と別枠で保存する
    if (key === 'fill' && typeof value === 'string') {
      const isText =
        activeObject.type === 'i-text' ||
        activeObject.type === 'text' ||
        activeObject.type === 'textbox'
      get().setStyleDefaults(isText ? { textFill: value } : { fill: value })
    } else if (key === 'stroke' && typeof value === 'string') {
      get().setStyleDefaults({ stroke: value })
    } else if (key === 'strokeWidth' && typeof value === 'number') {
      get().setStyleDefaults({ strokeWidth: value })
    }

    // 自動保存は object:modified 経由（500ms デバウンス）に委譲する。
    // ここで毎回 toJSON すると、スライダードラッグ等の連続呼び出しで巨大 JSON を
    // 大量にアロケートし OOM／クラッシュの原因になっていた
    fabricCanvas.fire('object:modified', { target: activeObject })

    // ストアのプロパティも即座に更新
    if (selectedObjectProps) {
      const updatedProps = { ...selectedObjectProps, [key]: value }

      // width/heightが変更された場合、scaleも更新
      if (key === 'width' && activeObject.width) {
        updatedProps.scaleX = (value as number) / activeObject.width
      } else if (key === 'height' && activeObject.height) {
        updatedProps.scaleY = (value as number) / activeObject.height
      }

      set({ selectedObjectProps: updatedProps })
    }
  },
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
  // パネル関連アクション（toggleLeftPanel/toggleRightPanel/setLeftPanelWidth/setRightPanelWidth）は createPanelSlice で提供
  // テーマ関連アクション（toggleTheme/loadSavedTheme/setCanvasBackground/loadSavedCanvasBackground）は createThemeSlice で提供
  resetAll: () => {
    const { fabricCanvas } = get()

    // キャンバスをクリア
    if (fabricCanvas) {
      fabricCanvas.clear()
      fabricCanvas.renderAll()
    }

    // 初期状態のページデータ
    const initialPages = [{ id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] }]

    if (typeof window !== 'undefined') {
      savePagesToDB(initialPages).catch((error) => {
        console.error('Failed to save reset state:', error)
      })
    }

    // ストアを初期状態にリセット
    set({
      selectedTool: 'select',
      selectedObjectId: null,
      selectedLayerIds: [],
      layers: [],
      zoom: 100,
      selectedObjectProps: null,
      clipboard: null,
      pages: initialPages,
      currentPageId: defaultPageId,
    })
  },
  // ショートカット関連アクション（setShowShortcutsModal/updateShortcut/resetShortcuts/loadSavedShortcuts）は createShortcutsSlice で提供
  // ナッジ関連アクション（setNudgeAmount/loadSavedNudgeAmount）は createNudgeSlice で提供
  moveSelectedObject: (direction, useNudge) => {
    const { fabricCanvas, nudgeAmount, selectedObjectProps } = get()
    if (!fabricCanvas) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // 移動量を決定（通常は1px、Shift押下時はnudgeAmount）
    const moveAmount = useNudge ? nudgeAmount : 1

    let deltaX = 0
    let deltaY = 0

    switch (direction) {
      case 'up':
        deltaY = -moveAmount
        break
      case 'down':
        deltaY = moveAmount
        break
      case 'left':
        deltaX = -moveAmount
        break
      case 'right':
        deltaX = moveAmount
        break
    }

    // 現在の位置を取得
    const currentLeft = activeObject.left || 0
    const currentTop = activeObject.top || 0

    // 新しい位置を設定
    activeObject.set({
      left: currentLeft + deltaX,
      top: currentTop + deltaY,
    })

    activeObject.setCoords()
    fabricCanvas.requestRenderAll()
    fabricCanvas.fire('object:modified', { target: activeObject })

    // ストアのプロパティも更新
    if (selectedObjectProps) {
      set({
        selectedObjectProps: {
          ...selectedObjectProps,
          left: currentLeft + deltaX,
          top: currentTop + deltaY,
        },
      })
    }
  },
  // Undo/Redo関連
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
  // グリッド関連アクション（toggleGrid/setGridSize/Color/Opacity/Snap）は createGridSlice で提供
  // スタイル既定値アクション（setStyleDefaults/loadSavedStyleDefaults）は createStyleDefaultsSlice で提供
  setDuplicateMode: (on) => set({ duplicateMode: on }),
  setAutoInvertText: (on) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('twb-auto-invert-text', on ? '1' : '0')
      } catch (e) {
        console.error('Failed to save auto-invert-text:', e)
      }
    }
    set({ autoInvertText: on })
    // トグル直後に既存テキストへ反映（ON 化時に反転、OFF 化時は何もしない）
    if (on) get().applyAutoInvertText()
  },
  loadSavedAutoInvertText: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('twb-auto-invert-text')
    if (saved === null) return
    set({ autoInvertText: saved === '1' })
  },
  applyAutoInvertText: () => {
    const { fabricCanvas, autoInvertText, canvasBackground, theme } = get()
    if (!fabricCanvas || !autoInvertText) return
    const bg = canvasBackground || (theme === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG)
    const bgIsDark = isBackgroundDark(bg)
    const targetColor = bgIsDark ? '#ffffff' : '#000000'
    let changed = false
    fabricCanvas.getObjects().forEach((obj) => {
      const type = obj.type
      if (type !== 'i-text' && type !== 'text' && type !== 'textbox') return
      const fill = typeof obj.fill === 'string' ? obj.fill.toLowerCase() : ''
      // 既定色（白/黒）のみ対象。ユーザーが任意色を選んだテキストは触らない
      if (!isDefaultTextColor(fill)) return
      if (fill === targetColor) return
      obj.set('fill', targetColor)
      obj.dirty = true
      changed = true
    })
    if (changed) fabricCanvas.requestRenderAll()
  },
  duplicateSelected: () => {
    const { fabricCanvas } = get()
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return
    // activeSelection はクローンが壊れるため未対応（個別選択の後に実行してもらう）
    if (activeObject.type === 'activeSelection') return
    // 元オブジェクトの z-index を控えて、複製を直上に挿入する
    const originalIndex = fabricCanvas.getObjects().indexOf(activeObject)
    activeObject.clone((cloned: fabric.Object) => {
      const objectId = crypto.randomUUID()
      const layerId = crypto.randomUUID()
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
        data: { ...cloned.data, id: objectId },
        selectable: true,
        evented: true,
      })
      fabricCanvas.add(cloned)
      if (originalIndex >= 0) {
        fabricCanvas.moveTo(cloned, originalIndex + 1)
      }
      fabricCanvas.setActiveObject(cloned)
      fabricCanvas.renderAll()

      const { layers: currentLayers } = get()
      const originalObjectId = activeObject.data?.id
      const originalLayer = currentLayers.find((l) => l.objectId === originalObjectId)
      if (originalLayer) {
        get().addLayer({
          id: layerId,
          name: `${originalLayer.name} copy`,
          visible: true,
          locked: false,
          objectId,
          type: originalLayer.type,
          parentId: originalLayer.parentId,
        })
      }
      set({ selectedObjectId: objectId })
      // saveHistory は canvas の object:added リスナー経由で自動記録されるため明示呼び出し不要
    })
  },
  // loadSavedGridSettings は createGridSlice で提供
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
}))

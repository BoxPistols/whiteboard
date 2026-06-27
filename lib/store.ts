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
import { type Page, CANVAS_SERIALIZE_PROPS } from './storeHelpers'
import { createViewportSlice, type ViewportSlice, MIN_ZOOM, MAX_ZOOM } from './slices/viewportSlice'
import { createLayersSlice, type LayersSlice } from './slices/layersSlice'
import { createHistorySlice, type HistorySlice } from './slices/historySlice'

// 共有ヘルパー由来の公開シンボルは後方互換のため store からも re-export
export { CANVAS_SERIALIZE_PROPS }
export type { Page }
// ズーム定数は viewportSlice に定義。後方互換のため store からも re-export
export { MIN_ZOOM, MAX_ZOOM }

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

// HistorySnapshot 型・Undo/Redo は historySlice に定義
// Page 型は storeHelpers に定義（上部で import 済み）

export interface CanvasStore
  extends GridSlice,
    ShortcutsSlice,
    PanelSlice,
    ThemeSlice,
    StyleDefaultsSlice,
    NudgeSlice,
    ViewportSlice,
    LayersSlice,
    HistorySlice {
  selectedTool: Tool
  selectedObjectId: string | null
  // レイヤー状態（layers/selectedLayerIds）は LayersSlice（extends）で提供
  // ズーム状態（zoom）は ViewportSlice（extends）で提供
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
  // Undo/Redo履歴状態（history/historyIndex/isUndoRedoAction）は HistorySlice（extends）で提供
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
  // レイヤー関連アクション（setSelectedLayerIds/addLayer/removeLayer/removeLayers/groupLayersIntoFolder/toggleLayerVisibility/toggleLayerLock/updateLayerName/reorderLayers/moveLayer/toggleLayerExpanded/updateLayerChildren/createFolder/setLayers）は LayersSlice（extends）で提供
  // ズーム/ビューポートアクション（setZoom/setZoomValue/zoomIn/zoomOut/zoomToFit/zoomToSelection/resetZoom/resetView）は ViewportSlice（extends）で提供
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
  // setLayers は LayersSlice（extends）で提供
  // テーマ関連アクション（toggleTheme/loadSavedTheme/setCanvasBackground/loadSavedCanvasBackground）は ThemeSlice（extends）で提供
  resetAll: () => void
  // ショートカット関連アクション（updateShortcut/resetShortcuts/loadSavedShortcuts/setShowShortcutsModal）は ShortcutsSlice（extends）で提供
  // ナッジ関連アクション（setNudgeAmount/loadSavedNudgeAmount）は NudgeSlice（extends）で提供
  // moveSelectedObject は fabric 依存のため store に残置（nudgeAmount は get() 経由で参照）
  moveSelectedObject: (direction: 'up' | 'down' | 'left' | 'right', useNudge: boolean) => void
  // Undo/Redo関連アクション（saveHistory/clearHistory/undo/redo/canUndo/canRedo）は HistorySlice（extends）で提供
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
// 履歴上限定数（MAX_HISTORY_LENGTH/BYTES/SNAPSHOT_BYTES）は historySlice に定義

// 共有ヘルパー（persistLayersToStorage / flattenLayerTree / nextFolderName / getDescendantIds /
// syncFabricZOrder / findFabricObject / findStickyPartnerOnCanvas / computeObjectsBoundingBox /
// getCanvasData）は storeHelpers.ts に集約。各スライス（layers/viewport）が直接 import する。
// store.ts が直接使うのは Page / CANVAS_SERIALIZE_PROPS のみ（上部で import 済み）。
// ズーム定数（MIN_ZOOM/MAX_ZOOM）は viewportSlice に定義（上部で import + re-export 済み）

// applyHistorySnapshot（undo/redo 共通処理）は historySlice に内包

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
  // ズーム/ビューポートスライス（zoom + 関連アクション）を合成
  ...createViewportSlice(set, get, store),
  // レイヤーツリー操作スライス（layers/selectedLayerIds + 関連アクション）を合成
  ...createLayersSlice(set, get, store),
  // Undo/Redo 履歴スライス（history/historyIndex/isUndoRedoAction + 関連アクション）を合成
  ...createHistorySlice(set, get, store),
  selectedTool: 'select',
  selectedObjectId: null,
  // layers/selectedLayerIds 初期値・アクションは createLayersSlice で提供
  // zoom 初期値・アクションは createViewportSlice で提供
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
  // Undo/Redo履歴の初期値・アクションは createHistorySlice で提供
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
  // レイヤー関連アクション（setSelectedLayerIds/addLayer/removeLayer(s)/group/toggle*/update*/reorder/move/createFolder/setLayers）は createLayersSlice で提供
  setClipboard: (obj) => set({ clipboard: obj }),
  setStickyClipboard: (pair) => set({ stickyClipboard: pair }),
  // ズーム/ビューポートアクション（setZoom/setZoomValue/zoomIn/zoomOut/zoomToFit/zoomToSelection/resetZoom/resetView）は createViewportSlice で提供
  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  setSelectedObjectProps: (props) => set({ selectedObjectProps: props }),
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
  // Undo/Redo関連アクション（saveHistory/clearHistory/undo/redo/canUndo/canRedo）は createHistorySlice で提供
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

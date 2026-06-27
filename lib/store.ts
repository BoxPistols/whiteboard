import { create } from 'zustand'
import type { Tool, Layer } from '@/types'
import type { fabric } from 'fabric'
import { savePagesToDB } from './storage'
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
import { type Page, CANVAS_SERIALIZE_PROPS, isBackgroundDark } from './storeHelpers'
import { createViewportSlice, type ViewportSlice, MIN_ZOOM, MAX_ZOOM } from './slices/viewportSlice'
import { createLayersSlice, type LayersSlice } from './slices/layersSlice'
import { createHistorySlice, type HistorySlice } from './slices/historySlice'
import { createPagesSlice, type PagesSlice, defaultPageId } from './slices/pagesSlice'
import { createObjectOpsSlice, type ObjectOpsSlice } from './slices/objectOpsSlice'

// 共有ヘルパー由来の公開シンボルは後方互換のため store からも re-export
export { CANVAS_SERIALIZE_PROPS }
export type { Page }
// ズーム定数は viewportSlice に定義。後方互換のため store からも re-export
export { MIN_ZOOM, MAX_ZOOM }

// Canvas 背景のテーマ別デフォルト色は themeSlice に定義。後方互換のため store からも re-export
export { DARK_CANVAS_BG, LIGHT_CANVAS_BG }

// isBackgroundDark は storeHelpers に定義。後方互換のため store からも re-export
// （useCanvasEvents / テストの import を温存）。isDefaultTextColor は objectOpsSlice に内包
export { isBackgroundDark }

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
    HistorySlice,
    PagesSlice,
    ObjectOpsSlice {
  selectedTool: Tool
  selectedObjectId: string | null
  // レイヤー状態（layers/selectedLayerIds）は LayersSlice（extends）で提供
  // ズーム状態（zoom）は ViewportSlice（extends）で提供
  fabricCanvas: fabric.Canvas | null
  selectedObjectProps: ObjectProperties | null
  clipboard: fabric.Object | null
  // 付箋ペア用クリップボード（bg/text 両方を保持）
  stickyClipboard: { bg: fabric.Object; text: fabric.Object } | null
  // ページ状態（pages/currentPageId/loadedPageId/pagesInitialized/pagesInitStarted/saveStatus/saveError）は PagesSlice（extends）で提供
  // テーマ/キャンバス背景（theme/canvasBackground）は ThemeSlice（extends）で提供
  // パネル表示/幅（showLeftPanel/showRightPanel/leftPanelWidth/rightPanelWidth）は PanelSlice（extends）で提供
  // ショートカット設定（shortcuts/showShortcutsModal）は ShortcutsSlice（extends）で提供
  // ナッジ設定（nudgeAmount）は NudgeSlice（extends）で提供
  // Undo/Redo履歴状態（history/historyIndex/isUndoRedoAction）は HistorySlice（extends）で提供
  // グリッド設定は GridSlice（extends）で提供
  // 最後に使ったスタイル（styleDefaults）は StyleDefaultsSlice（extends）で提供
  // 複製モード（duplicateMode）/ テキスト自動反転（autoInvertText）は ObjectOpsSlice（extends）で提供
  setSelectedTool: (tool: Tool) => void
  setSelectedObjectId: (id: string | null) => void
  // レイヤー関連アクション（setSelectedLayerIds/addLayer/removeLayer/removeLayers/groupLayersIntoFolder/toggleLayerVisibility/toggleLayerLock/updateLayerName/reorderLayers/moveLayer/toggleLayerExpanded/updateLayerChildren/createFolder/setLayers）は LayersSlice（extends）で提供
  // ズーム/ビューポートアクション（setZoom/setZoomValue/zoomIn/zoomOut/zoomToFit/zoomToSelection/resetZoom/resetView）は ViewportSlice（extends）で提供
  setFabricCanvas: (canvas: fabric.Canvas | null) => void
  setSelectedObjectProps: (props: ObjectProperties | null) => void
  // updateObjectProperty は ObjectOpsSlice（extends）で提供
  setClipboard: (obj: fabric.Object | null) => void
  setStickyClipboard: (pair: { bg: fabric.Object; text: fabric.Object } | null) => void
  // ページ関連アクション（addPage/removePage/setCurrentPage/setLoadedPageId/updatePageNotes/updatePageData/initializePages）は PagesSlice（extends）で提供
  // パネル関連アクション（toggleLeftPanel/toggleRightPanel/setLeftPanelWidth/setRightPanelWidth）は PanelSlice（extends）で提供
  // setLayers は LayersSlice（extends）で提供
  // テーマ関連アクション（toggleTheme/loadSavedTheme/setCanvasBackground/loadSavedCanvasBackground）は ThemeSlice（extends）で提供
  resetAll: () => void
  // ショートカット関連アクション（updateShortcut/resetShortcuts/loadSavedShortcuts/setShowShortcutsModal）は ShortcutsSlice（extends）で提供
  // ナッジ関連アクション（setNudgeAmount/loadSavedNudgeAmount）は NudgeSlice（extends）で提供
  // Undo/Redo関連アクション（saveHistory/clearHistory/undo/redo/canUndo/canRedo）は HistorySlice（extends）で提供
  // グリッド関連アクションは GridSlice（extends）で提供
  // スタイル既定値アクション（setStyleDefaults/loadSavedStyleDefaults）は StyleDefaultsSlice（extends）で提供
  // オブジェクト操作アクション（updateObjectProperty/moveSelectedObject/duplicateSelected/setDuplicateMode/setAutoInvertText/loadSavedAutoInvertText/applyAutoInvertText）は ObjectOpsSlice（extends）で提供
  // initializePages は PagesSlice（extends）で提供
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

// defaultPageId / defaultPages は pagesSlice に定義（defaultPageId は上部で import 済み）
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
  // ページ管理スライス（pages/currentPageId/loadedPageId/pagesInitialized/pagesInitStarted/saveStatus/saveError + 関連アクション）を合成
  ...createPagesSlice(set, get, store),
  // オブジェクト操作スライス（duplicateMode/autoInvertText + プロパティ編集/移動/複製/自動反転）を合成
  ...createObjectOpsSlice(set, get, store),
  selectedTool: 'select',
  selectedObjectId: null,
  // layers/selectedLayerIds 初期値・アクションは createLayersSlice で提供
  // zoom 初期値・アクションは createViewportSlice で提供
  fabricCanvas: null,
  selectedObjectProps: null,
  clipboard: null,
  stickyClipboard: null,
  // ページの初期値・アクションは createPagesSlice で提供
  // テーマの初期値・アクションは createThemeSlice で提供
  // パネルの初期値・アクションは createPanelSlice で提供
  // ショートカットの初期値・アクションは createShortcutsSlice で提供
  // ナッジの初期値・アクションは createNudgeSlice で提供
  // Undo/Redo履歴の初期値・アクションは createHistorySlice で提供
  // グリッド設定の初期値・アクションは createGridSlice で提供
  // スタイル既定値の初期値・アクションは createStyleDefaultsSlice で提供
  // duplicateMode/autoInvertText の初期値・アクションは createObjectOpsSlice で提供
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  // レイヤー関連アクション（setSelectedLayerIds/addLayer/removeLayer(s)/group/toggle*/update*/reorder/move/createFolder/setLayers）は createLayersSlice で提供
  setClipboard: (obj) => set({ clipboard: obj }),
  setStickyClipboard: (pair) => set({ stickyClipboard: pair }),
  // ズーム/ビューポートアクション（setZoom/setZoomValue/zoomIn/zoomOut/zoomToFit/zoomToSelection/resetZoom/resetView）は createViewportSlice で提供
  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  setSelectedObjectProps: (props) => set({ selectedObjectProps: props }),
  // オブジェクト操作アクション（updateObjectProperty/moveSelectedObject/duplicateSelected/setDuplicateMode/setAutoInvertText/loadSavedAutoInvertText/applyAutoInvertText）は createObjectOpsSlice で提供
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
  // Undo/Redo関連アクション（saveHistory/clearHistory/undo/redo/canUndo/canRedo）は createHistorySlice で提供
  // グリッド関連アクション（toggleGrid/setGridSize/Color/Opacity/Snap）は createGridSlice で提供
  // スタイル既定値アクション（setStyleDefaults/loadSavedStyleDefaults）は createStyleDefaultsSlice で提供
  // loadSavedGridSettings は createGridSlice で提供
  // ページ関連アクション（addPage/removePage/setCurrentPage/setLoadedPageId/updatePageNotes/updatePageData/initializePages）は createPagesSlice で提供
}))

import { create } from 'zustand'
import type { Tool, Layer, ShortcutConfig, ShortcutModifiers } from '@/types'
import type { fabric } from 'fabric'
import { DEFAULT_SHORTCUTS } from './shortcuts'

interface ObjectProperties {
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
}

// Undo/Redo用の履歴スナップショット
interface HistorySnapshot {
  canvasJSON: string
  layers: Layer[]
}

interface Page {
  id: string
  name: string
  canvasData: string | null
  layers: Layer[]
  notes?: string
}

interface CanvasStore {
  selectedTool: Tool
  selectedObjectId: string | null
  layers: Layer[]
  zoom: number
  fabricCanvas: fabric.Canvas | null
  selectedObjectProps: ObjectProperties | null
  clipboard: fabric.Object | null
  pages: Page[]
  currentPageId: string
  theme: 'light' | 'dark'
  canvasBackground: string
  showLeftPanel: boolean
  showRightPanel: boolean
  leftPanelWidth: number
  rightPanelWidth: number
  // ショートカット関連
  shortcuts: ShortcutConfig[]
  showShortcutsModal: boolean
  // ナッジ設定
  nudgeAmount: number
  // Undo/Redo履歴
  history: HistorySnapshot[]
  historyIndex: number
  isUndoRedoAction: boolean
  // グリッド設定
  gridEnabled: boolean
  gridSize: number
  gridColor: string
  gridOpacity: number
  gridSnapEnabled: boolean
  setSelectedTool: (tool: Tool) => void
  setSelectedObjectId: (id: string | null) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  updateLayerName: (id: string, name: string) => void
  reorderLayers: (startIndex: number, endIndex: number) => void
  toggleLayerExpanded: (id: string) => void
  updateLayerChildren: (parentId: string, childIds: string[]) => void
  setZoom: (zoom: number) => void
  zoomToFit: () => void
  zoomToSelection: () => void
  resetZoom: () => void
  resetView: () => void
  setFabricCanvas: (canvas: fabric.Canvas | null) => void
  setSelectedObjectProps: (props: ObjectProperties | null) => void
  updateObjectProperty: (key: keyof ObjectProperties, value: number | string) => void
  setClipboard: (obj: fabric.Object | null) => void
  addPage: (name: string) => void
  removePage: (id: string) => void
  setCurrentPage: (id: string) => void
  updatePageNotes: (id: string, notes: string) => void
  updatePageData: (id: string, canvasData: string, layers: Layer[]) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setLeftPanelWidth: (width: number) => void
  setRightPanelWidth: (width: number) => void
  setLayers: (layers: Layer[]) => void
  toggleTheme: () => void
  loadSavedTheme: () => void
  setCanvasBackground: (color: string) => void
  loadSavedCanvasBackground: () => void
  resetAll: () => void
  // ショートカット関連
  updateShortcut: (id: string, newKey: string, modifiers: ShortcutModifiers) => void
  resetShortcuts: () => void
  loadSavedShortcuts: () => void
  setShowShortcutsModal: (show: boolean) => void
  // ナッジ関連
  setNudgeAmount: (amount: number) => void
  loadSavedNudgeAmount: () => void
  moveSelectedObject: (direction: 'up' | 'down' | 'left' | 'right', useNudge: boolean) => void
  // Undo/Redo関連
  saveHistory: () => void
  clearHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  // グリッド関連
  toggleGrid: () => void
  setGridSize: (size: number) => void
  setGridColor: (color: string) => void
  setGridOpacity: (opacity: number) => void
  toggleGridSnap: () => void
  loadSavedGridSettings: () => void
}

const defaultPageId = 'page-1'

// localStorageからページデータを読み込む
const loadPagesFromStorage = (): Page[] => {
  if (typeof window === 'undefined') {
    return [{ id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] }]
  }

  try {
    const saved = localStorage.getItem('figma-clone-pages')
    if (saved) {
      const pages = JSON.parse(saved) as Page[]
      return pages.length > 0
        ? pages
        : [{ id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] }]
    }
  } catch (error) {
    console.error('Failed to load pages from localStorage:', error)
  }

  return [{ id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] }]
}

const MAX_HISTORY_LENGTH = 20

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  selectedTool: 'select',
  selectedObjectId: null,
  layers: [],
  zoom: 100,
  fabricCanvas: null,
  selectedObjectProps: null,
  clipboard: null,
  pages: loadPagesFromStorage(),
  currentPageId: defaultPageId,
  theme: 'dark',
  canvasBackground: '#1f2937',
  showLeftPanel: true,
  showRightPanel: true,
  leftPanelWidth: 224, // 56 * 4 = w-56
  rightPanelWidth: 288, // 72 * 4 = w-72
  shortcuts: DEFAULT_SHORTCUTS,
  showShortcutsModal: false,
  // ナッジ設定（デフォルト10px）
  nudgeAmount: 10,
  // Undo/Redo履歴
  history: [],
  historyIndex: -1,
  isUndoRedoAction: false,
  // グリッド設定（デフォルト値）
  gridEnabled: false,
  gridSize: 10,
  gridColor: '#888888',
  gridOpacity: 20,
  gridSnapEnabled: false,
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setClipboard: (obj) => set({ clipboard: obj }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  removeLayer: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === id)

      // Canvasからもオブジェクトを削除
      if (fabricCanvas && layer) {
        const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
        if (obj) {
          fabricCanvas.remove(obj)
          fabricCanvas.renderAll()
        }
      }

      return {
        layers: state.layers.filter((layer) => layer.id !== id),
      }
    }),
  toggleLayerVisibility: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )

      // Fabric.jsオブジェクトの表示/非表示を切り替え
      if (fabricCanvas) {
        const layer = state.layers.find((l) => l.id === id)
        if (layer) {
          const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
          if (obj) {
            obj.visible = !layer.visible
            fabricCanvas.renderAll()
          }
        }
      }

      return { layers: updatedLayers }
    }),
  toggleLayerLock: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === id)

      if (fabricCanvas && layer) {
        const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
        if (obj) {
          const newLockState = !layer.locked
          // ロック/ロック解除の設定
          obj.set({
            lockMovementX: newLockState,
            lockMovementY: newLockState,
            lockRotation: newLockState,
            lockScalingX: newLockState,
            lockScalingY: newLockState,
            hasControls: !newLockState,
            selectable: !newLockState,
            evented: !newLockState,
          })
          // ロックした場合は選択を解除
          if (newLockState && fabricCanvas.getActiveObject() === obj) {
            fabricCanvas.discardActiveObject()
          }
          fabricCanvas.renderAll()
        }
      }

      return {
        layers: state.layers.map((layer) =>
          layer.id === id ? { ...layer, locked: !layer.locked } : layer
        ),
      }
    }),
  updateLayerName: (id, name) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, name } : layer
      )

      // ページデータにも反映
      const updatedPages = state.pages.map((page) =>
        page.id === state.currentPageId ? { ...page, layers: updatedLayers } : page
      )

      // localStorageに保存
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
        } catch (error) {
          console.error('Failed to save layer name change:', error)
        }
      }

      return {
        layers: updatedLayers,
        pages: updatedPages,
      }
    }),
  reorderLayers: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.layers)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)

      // Fabric.jsでのオブジェクトの描画順序も更新
      const { fabricCanvas } = get()
      if (fabricCanvas) {
        // レイヤーの順番に基づいてオブジェクトを再配置
        result.forEach((layer, index) => {
          const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
          if (obj) {
            fabricCanvas.moveTo(obj, result.length - 1 - index) // レイヤーパネルと逆順
          }
        })
        fabricCanvas.renderAll()
      }

      // ページデータにも反映
      const updatedPages = state.pages.map((page) =>
        page.id === state.currentPageId ? { ...page, layers: result } : page
      )

      // localStorageに保存
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
        } catch (error) {
          console.error('Failed to save layer reorder:', error)
        }
      }

      return { layers: result, pages: updatedPages }
    }),
  toggleLayerExpanded: (id) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, expanded: !layer.expanded } : layer
      )

      // ページデータにも反映
      const updatedPages = state.pages.map((page) =>
        page.id === state.currentPageId ? { ...page, layers: updatedLayers } : page
      )

      // localStorageに保存
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
        } catch (error) {
          console.error('Failed to save layer expanded state:', error)
        }
      }

      return { layers: updatedLayers, pages: updatedPages }
    }),
  updateLayerChildren: (parentId, childIds) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) => {
        if (layer.id === parentId) {
          return { ...layer, children: childIds }
        }
        // 子レイヤーのparentIdを設定
        if (childIds.includes(layer.id)) {
          return { ...layer, parentId }
        }
        return layer
      })

      // ページデータにも反映
      const updatedPages = state.pages.map((page) =>
        page.id === state.currentPageId ? { ...page, layers: updatedLayers } : page
      )

      // localStorageに保存
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
        } catch (error) {
          console.error('Failed to save layer children:', error)
        }
      }

      return { layers: updatedLayers, pages: updatedPages }
    }),
  setZoom: (zoom) => {
    const { fabricCanvas } = get()
    if (fabricCanvas) {
      const zoomLevel = zoom / 100
      fabricCanvas.setZoom(zoomLevel)
      fabricCanvas.renderAll()
    }
    set({ zoom })
  },
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

    // オブジェクトのバウンディングボックスを手動で計算
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    objects.forEach((obj) => {
      const bound = obj.getBoundingRect()
      minX = Math.min(minX, bound.left)
      minY = Math.min(minY, bound.top)
      maxX = Math.max(maxX, bound.left + bound.width)
      maxY = Math.max(maxY, bound.top + bound.height)
    })

    const groupWidth = maxX - minX
    const groupHeight = maxY - minY

    // 適切なズームレベルを計算（余白10%）
    const zoomX = (canvasWidth * 0.9) / groupWidth
    const zoomY = (canvasHeight * 0.9) / groupHeight
    const zoom = Math.min(zoomX, zoomY) * 100

    get().setZoom(Math.max(10, Math.min(200, zoom)))
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
    zoom = Math.max(10, Math.min(200, zoom))

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
    set({ zoom })
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

    // オブジェクトのバウンディングボックスを計算
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    objects.forEach((obj) => {
      const bound = obj.getBoundingRect()
      minX = Math.min(minX, bound.left)
      minY = Math.min(minY, bound.top)
      maxX = Math.max(maxX, bound.left + bound.width)
      maxY = Math.max(maxY, bound.top + bound.height)
    })

    // オブジェクト全体が収まるようにズームと位置を調整
    const groupWidth = maxX - minX
    const groupHeight = maxY - minY

    // 適切なズームレベルを計算（余白10%）
    const zoomX = (canvasWidth * 0.9) / groupWidth
    const zoomY = (canvasHeight * 0.9) / groupHeight
    let zoom = Math.min(zoomX, zoomY) * 100

    // ズームは100%を上限とする（拡大はしない）
    zoom = Math.min(zoom, 100)
    zoom = Math.max(zoom, 10)

    // オブジェクトを中央に配置
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const vpCenterX = canvasWidth / 2
    const vpCenterY = canvasHeight / 2

    const zoomLevel = zoom / 100
    const panX = vpCenterX - centerX * zoomLevel
    const panY = vpCenterY - centerY * zoomLevel

    fabricCanvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, panX, panY])
    set({ zoom })
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

    // 単一オブジェクトのプロパティを更新するヘルパー関数
    const updateSingleObject = (obj: fabric.Object) => {
      // Groupオブジェクト（矢印など）の場合、子要素のプロパティを更新
      if (obj.type === 'group' && (key === 'fill' || key === 'stroke' || key === 'strokeWidth')) {
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
          const currentData = obj.data || { id: crypto.randomUUID() }
          obj.set({
            data: {
              ...currentData,
              ...(key === 'fill' && { baseFill: value as string }),
              ...(key === 'stroke' && { baseStroke: value as string }),
              baseTheme: theme,
            },
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
          const currentData = obj.data || { id: crypto.randomUUID() }
          obj.set({
            data: {
              ...currentData,
              ...(key === 'fill' && { baseFill: value as string }),
              ...(key === 'stroke' && { baseStroke: value as string }),
              baseTheme: theme,
            },
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
    // Trigger save via autosave listener
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

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
      } catch (error) {
        console.error('Failed to save pages to localStorage:', error)
      }
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

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
      } catch (error) {
        console.error('Failed to save pages to localStorage:', error)
      }
    }

    set({ pages: updatedPages, currentPageId: newCurrentPageId })
  },
  setCurrentPage: (id) => {
    // ページ切り替え時は履歴をクリア
    set({ currentPageId: id, history: [], historyIndex: -1 })
  },
  updatePageNotes: (id, notes) => {
    const updatedPages = get().pages.map((page) => (page.id === id ? { ...page, notes } : page))

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
      } catch (error) {
        console.error('Failed to save page notes to localStorage:', error)
      }
    }

    set({ pages: updatedPages })
  },
  updatePageData: (id, canvasData, layers) => {
    const updatedPages = get().pages.map((page) =>
      page.id === id ? { ...page, canvasData, layers } : page
    )

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
      } catch (error) {
        console.error('Failed to save pages to localStorage:', error)
      }
    }

    set({ pages: updatedPages })
  },
  toggleLeftPanel: () => set((state) => ({ showLeftPanel: !state.showLeftPanel })),
  toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(200, Math.min(width, 400)) }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(250, Math.min(width, 500)) }),
  toggleTheme: () => {
    const currentTheme = get().theme
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'

    if (typeof window !== 'undefined') {
      // Force clean then apply target to avoid stale class on hydration edge cases
      document.documentElement.classList.remove('dark')
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      }
      localStorage.setItem('figma-clone-theme', newTheme)
    }

    set({ theme: newTheme })
  },
  loadSavedTheme: () => {
    if (typeof window === 'undefined') return

    // Avoid double application: remove both then add needed
    document.documentElement.classList.remove('dark')

    const savedTheme = localStorage.getItem('figma-clone-theme') as 'light' | 'dark' | null
    // デフォルトはダークモード
    const theme: 'light' | 'dark' = savedTheme || 'dark'

    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    }

    set({ theme })
  },
  setCanvasBackground: (color) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('figma-clone-canvas-bg', color)
      } catch (e) {
        console.error('Failed to save canvas background:', e)
      }
    }
    set({ canvasBackground: color })
  },
  loadSavedCanvasBackground: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('figma-clone-canvas-bg')
    // デフォルトはダーク背景
    set({ canvasBackground: saved || '#1f2937' })
  },
  resetAll: () => {
    const { fabricCanvas } = get()

    // キャンバスをクリア
    if (fabricCanvas) {
      fabricCanvas.clear()
      fabricCanvas.renderAll()
    }

    // ストアを初期状態にリセット
    set({
      selectedTool: 'select',
      selectedObjectId: null,
      layers: [],
      zoom: 100,
      selectedObjectProps: null,
      clipboard: null,
      pages: [{ id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] }],
      currentPageId: defaultPageId,
    })
  },
  // ショートカット関連
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  updateShortcut: (id, newKey, modifiers) => {
    const shortcuts = get().shortcuts.map((shortcut) =>
      shortcut.id === id ? { ...shortcut, customKey: newKey, modifiers } : shortcut
    )

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        const customShortcuts = shortcuts
          .filter((s) => s.customKey)
          .map((s) => ({ id: s.id, customKey: s.customKey, modifiers: s.modifiers }))
        localStorage.setItem('figma-clone-shortcuts', JSON.stringify(customShortcuts))
      } catch (e) {
        console.error('Failed to save shortcuts:', e)
      }
    }

    set({ shortcuts })
  },
  resetShortcuts: () => {
    // localStorageからカスタムショートカットを削除
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('figma-clone-shortcuts')
      } catch (e) {
        console.error('Failed to remove shortcuts:', e)
      }
    }

    // デフォルトに戻す
    set({ shortcuts: DEFAULT_SHORTCUTS })
  },
  loadSavedShortcuts: () => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('figma-clone-shortcuts')
      if (saved) {
        const customShortcuts = JSON.parse(saved) as {
          id: string
          customKey: string
          modifiers: ShortcutModifiers
        }[]
        const shortcuts = DEFAULT_SHORTCUTS.map((shortcut) => {
          const custom = customShortcuts.find((c) => c.id === shortcut.id)
          return custom
            ? { ...shortcut, customKey: custom.customKey, modifiers: custom.modifiers }
            : shortcut
        })
        set({ shortcuts })
      }
    } catch (e) {
      console.error('Failed to load shortcuts:', e)
    }
  },
  // ナッジ関連
  setNudgeAmount: (amount) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('figma-clone-nudge-amount', String(amount))
      } catch (e) {
        console.error('Failed to save nudge amount:', e)
      }
    }
    set({ nudgeAmount: amount })
  },
  loadSavedNudgeAmount: () => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('figma-clone-nudge-amount')
      if (saved) {
        const amount = parseInt(saved, 10)
        if (!isNaN(amount) && amount > 0) {
          set({ nudgeAmount: amount })
        }
      }
    } catch (e) {
      console.error('Failed to load nudge amount:', e)
    }
  },
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

    const canvasJSON = JSON.stringify(fabricCanvas.toJSON(['data']))
    const snapshot: HistorySnapshot = {
      canvasJSON,
      layers: [...layers],
    }

    // 現在位置より後の履歴を削除
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)

    // 最大履歴数を超えたら古いものを削除
    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift()
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  undo: () => {
    const { fabricCanvas, history, historyIndex } = get()
    if (!fabricCanvas || historyIndex <= 0) return

    const newIndex = historyIndex - 1
    const snapshot = history[newIndex]

    set({ isUndoRedoAction: true })

    fabricCanvas.loadFromJSON(JSON.parse(snapshot.canvasJSON), () => {
      fabricCanvas.renderAll()
      set({
        layers: [...snapshot.layers],
        historyIndex: newIndex,
        isUndoRedoAction: false,
        selectedObjectId: null,
        selectedObjectProps: null,
      })
    })
  },
  redo: () => {
    const { fabricCanvas, history, historyIndex } = get()
    if (!fabricCanvas || historyIndex >= history.length - 1) return

    const newIndex = historyIndex + 1
    const snapshot = history[newIndex]

    set({ isUndoRedoAction: true })

    fabricCanvas.loadFromJSON(JSON.parse(snapshot.canvasJSON), () => {
      fabricCanvas.renderAll()
      set({
        layers: [...snapshot.layers],
        historyIndex: newIndex,
        isUndoRedoAction: false,
        selectedObjectId: null,
        selectedObjectProps: null,
      })
    })
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
  // グリッド関連
  toggleGrid: () => {
    const newEnabled = !get().gridEnabled
    if (typeof window !== 'undefined') {
      try {
        const settings = {
          enabled: newEnabled,
          size: get().gridSize,
          color: get().gridColor,
          opacity: get().gridOpacity,
          snapEnabled: get().gridSnapEnabled,
        }
        localStorage.setItem('figma-clone-grid-settings', JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save grid settings:', e)
      }
    }
    set({ gridEnabled: newEnabled })
  },
  setGridSize: (size) => {
    const validSize = Math.max(5, Math.min(100, size))
    if (typeof window !== 'undefined') {
      try {
        const settings = {
          enabled: get().gridEnabled,
          size: validSize,
          color: get().gridColor,
          opacity: get().gridOpacity,
          snapEnabled: get().gridSnapEnabled,
        }
        localStorage.setItem('figma-clone-grid-settings', JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save grid settings:', e)
      }
    }
    set({ gridSize: validSize })
  },
  setGridColor: (color) => {
    if (typeof window !== 'undefined') {
      try {
        const settings = {
          enabled: get().gridEnabled,
          size: get().gridSize,
          color: color,
          opacity: get().gridOpacity,
          snapEnabled: get().gridSnapEnabled,
        }
        localStorage.setItem('figma-clone-grid-settings', JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save grid settings:', e)
      }
    }
    set({ gridColor: color })
  },
  setGridOpacity: (opacity) => {
    const validOpacity = Math.max(5, Math.min(100, opacity))
    if (typeof window !== 'undefined') {
      try {
        const settings = {
          enabled: get().gridEnabled,
          size: get().gridSize,
          color: get().gridColor,
          opacity: validOpacity,
          snapEnabled: get().gridSnapEnabled,
        }
        localStorage.setItem('figma-clone-grid-settings', JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save grid settings:', e)
      }
    }
    set({ gridOpacity: validOpacity })
  },
  toggleGridSnap: () => {
    const newSnapEnabled = !get().gridSnapEnabled
    if (typeof window !== 'undefined') {
      try {
        const settings = {
          enabled: get().gridEnabled,
          size: get().gridSize,
          color: get().gridColor,
          opacity: get().gridOpacity,
          snapEnabled: newSnapEnabled,
        }
        localStorage.setItem('figma-clone-grid-settings', JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save grid settings:', e)
      }
    }
    set({ gridSnapEnabled: newSnapEnabled })
  },
  loadSavedGridSettings: () => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('figma-clone-grid-settings')
      if (saved) {
        const settings = JSON.parse(saved) as {
          enabled: boolean
          size: number
          color: string
          opacity: number
          snapEnabled?: boolean
        }
        set({
          gridEnabled: settings.enabled ?? false,
          gridSize: settings.size ?? 10,
          gridColor: settings.color ?? '#888888',
          gridOpacity: settings.opacity ?? 20,
          gridSnapEnabled: settings.snapEnabled ?? false,
        })
      }
    } catch (e) {
      console.error('Failed to load grid settings:', e)
    }
  },
}))

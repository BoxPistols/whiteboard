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

interface Page {
  id: string
  name: string
  canvasData: string | null
  layers: Layer[]
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
  setSelectedTool: (tool: Tool) => void
  setSelectedObjectId: (id: string | null) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  reorderLayers: (startIndex: number, endIndex: number) => void
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

      return { layers: result }
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
  setLayers: (layers) => set({ layers }),
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
  setCurrentPage: (id) => set({ currentPageId: id }),
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
}))

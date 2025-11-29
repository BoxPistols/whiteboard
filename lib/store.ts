import { create } from 'zustand'
import type { Tool, Layer } from '@/types'
import type { fabric } from 'fabric'

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
  theme: 'light',
  canvasBackground: '#f5f5f5',
  showLeftPanel: true,
  showRightPanel: true,
  leftPanelWidth: 224, // 56 * 4 = w-56
  rightPanelWidth: 288, // 72 * 4 = w-72
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

    // オブジェクトのサイズを取得
    const objectWidth = activeObject.width! * activeObject.scaleX!
    const objectHeight = activeObject.height! * activeObject.scaleY!

    // 適切なズームレベルを計算（余白20%）
    const zoomX = (canvasWidth * 0.8) / objectWidth
    const zoomY = (canvasHeight * 0.8) / objectHeight
    const zoom = Math.min(zoomX, zoomY) * 100

    get().setZoom(Math.max(10, Math.min(200, zoom)))

    // オブジェクトをビューポートの中心に移動
    const vpCenter = fabricCanvas.getVpCenter()
    fabricCanvas.viewportCenterObject(activeObject)
    fabricCanvas.renderAll()
  },
  resetZoom: () => {
    get().setZoom(100)
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
    let theme: 'light' | 'dark' = 'light'

    if (savedTheme) {
      theme = savedTheme
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark'
    }

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
    if (saved) {
      set({ canvasBackground: saved })
    }
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
}))

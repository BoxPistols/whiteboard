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
  setLayers: (layers: Layer[]) => void
  toggleTheme: () => void
  loadSavedTheme: () => void
  resetAll: () => void
}

const defaultPageId = 'page-1'

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  selectedTool: 'select',
  selectedObjectId: null,
  layers: [],
  zoom: 100,
  fabricCanvas: null,
  selectedObjectProps: null,
  clipboard: null,
  pages: [{ id: defaultPageId, name: 'Page 1', canvasData: null, layers: [] }],
  currentPageId: defaultPageId,
  theme: 'light',
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setClipboard: (obj) => set({ clipboard: obj }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
    })),
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
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, locked: !layer.locked } : layer
      ),
    })),
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

    // オブジェクトのバウンディングボックスを計算
    const group = new fabric.Group(objects, { originX: 'center', originY: 'center' })
    const groupWidth = group.width! * group.scaleX!
    const groupHeight = group.height! * group.scaleY!

    // グループを破棄（一時的な計算用のみ）
    group.destroy()

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
    const { fabricCanvas, selectedObjectId, selectedObjectProps } = get()
    if (!fabricCanvas || !selectedObjectId) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // Groupオブジェクト（矢印など）の場合、子要素のプロパティを更新
    if (
      activeObject.type === 'group' &&
      (key === 'fill' || key === 'stroke' || key === 'strokeWidth')
    ) {
      const items = (activeObject as any).getObjects()
      items.forEach((item: any) => {
        item[key] = value
        item.dirty = true
      })
      activeObject.dirty = true
    } else if (key === 'width' || key === 'height') {
      // 幅と高さはスケールを考慮して設定
      if (key === 'width' && activeObject.width) {
        activeObject.scaleX = (value as number) / activeObject.width
      } else if (key === 'height' && activeObject.height) {
        activeObject.scaleY = (value as number) / activeObject.height
      }
    } else {
      // 色や他のプロパティを直接設定
      ;(activeObject as any)[key] = value
    }

    // 変更を反映
    activeObject.setCoords()
    activeObject.dirty = true
    fabricCanvas.requestRenderAll()

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
  addPage: (name) =>
    set((state) => {
      const newPage: Page = {
        id: `page-${Date.now()}`,
        name,
        canvasData: null,
        layers: [],
      }
      return { pages: [...state.pages, newPage] }
    }),
  removePage: (id) =>
    set((state) => ({
      pages: state.pages.filter((page) => page.id !== id),
      currentPageId:
        state.currentPageId === id && state.pages.length > 1
          ? state.pages.find((p) => p.id !== id)!.id
          : state.currentPageId,
    })),
  setCurrentPage: (id) => set({ currentPageId: id }),
  updatePageData: (id, canvasData, layers) =>
    set((state) => ({
      pages: state.pages.map((page) => (page.id === id ? { ...page, canvasData, layers } : page)),
    })),
  toggleTheme: () => {
    const currentTheme = get().theme
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'

    // Update DOM
    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      // Save to localStorage
      localStorage.setItem('figma-clone-theme', newTheme)
    }

    set({ theme: newTheme })
  },
  loadSavedTheme: () => {
    if (typeof window === 'undefined') return

    // Read from localStorage or use system preference
    const savedTheme = localStorage.getItem('figma-clone-theme') as 'light' | 'dark' | null
    let theme: 'light' | 'dark' = 'light'

    if (savedTheme) {
      theme = savedTheme
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark'
    }

    // Apply theme to DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Update store
    set({ theme })
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

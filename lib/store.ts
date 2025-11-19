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

interface CanvasStore {
  selectedTool: Tool
  selectedObjectId: string | null
  layers: Layer[]
  zoom: number
  fabricCanvas: fabric.Canvas | null
  selectedObjectProps: ObjectProperties | null
  setSelectedTool: (tool: Tool) => void
  setSelectedObjectId: (id: string | null) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  reorderLayers: (startIndex: number, endIndex: number) => void
  setZoom: (zoom: number) => void
  setFabricCanvas: (canvas: fabric.Canvas | null) => void
  setSelectedObjectProps: (props: ObjectProperties | null) => void
  updateObjectProperty: (key: keyof ObjectProperties, value: number | string) => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  selectedTool: 'select',
  selectedObjectId: null,
  layers: [],
  zoom: 100,
  fabricCanvas: null,
  selectedObjectProps: null,
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  removeLayer: (id) => set((state) => ({
    layers: state.layers.filter((layer) => layer.id !== id),
  })),
  toggleLayerVisibility: (id) => set((state) => {
    const { fabricCanvas } = get()
    const updatedLayers = state.layers.map((layer) =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    )

    // Fabric.jsオブジェクトの表示/非表示を切り替え
    if (fabricCanvas) {
      const layer = state.layers.find(l => l.id === id)
      if (layer) {
        const obj = fabricCanvas.getObjects().find(o => o.data?.id === layer.objectId)
        if (obj) {
          obj.visible = !layer.visible
          fabricCanvas.renderAll()
        }
      }
    }

    return { layers: updatedLayers }
  }),
  toggleLayerLock: (id) => set((state) => ({
    layers: state.layers.map((layer) =>
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    ),
  })),
  reorderLayers: (startIndex, endIndex) => set((state) => {
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
  setZoom: (zoom) => set({ zoom }),
  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  setSelectedObjectProps: (props) => set({ selectedObjectProps: props }),
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
}))

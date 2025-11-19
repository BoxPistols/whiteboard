import { create } from 'zustand'
import type { Tool, Layer } from '@/types'

interface CanvasStore {
  selectedTool: Tool
  selectedObjectId: string | null
  layers: Layer[]
  zoom: number
  setSelectedTool: (tool: Tool) => void
  setSelectedObjectId: (id: string | null) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  setZoom: (zoom: number) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  selectedTool: 'select',
  selectedObjectId: null,
  layers: [],
  zoom: 100,
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  removeLayer: (id) => set((state) => ({
    layers: state.layers.filter((layer) => layer.id !== id),
  })),
  toggleLayerVisibility: (id) => set((state) => ({
    layers: state.layers.map((layer) =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ),
  })),
  toggleLayerLock: (id) => set((state) => ({
    layers: state.layers.map((layer) =>
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    ),
  })),
  setZoom: (zoom) => set({ zoom }),
}))

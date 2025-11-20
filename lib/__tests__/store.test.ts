import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../store'
import type { Layer } from '@/types'

describe('Canvas Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useCanvasStore.getState()
    useCanvasStore.setState({
      selectedTool: 'select',
      selectedObjectId: null,
      layers: [],
      zoom: 100,
      fabricCanvas: null,
      selectedObjectProps: null,
      clipboard: null,
      pages: [{ id: 'page-1', name: 'Page 1', canvasData: null, layers: [] }],
      currentPageId: 'page-1',
    })
  })

  describe('Tool Selection', () => {
    it('should set selected tool', () => {
      const { setSelectedTool, selectedTool } = useCanvasStore.getState()

      setSelectedTool('rectangle')
      expect(useCanvasStore.getState().selectedTool).toBe('rectangle')

      setSelectedTool('circle')
      expect(useCanvasStore.getState().selectedTool).toBe('circle')
    })

    it('should initialize with select tool', () => {
      const { selectedTool } = useCanvasStore.getState()
      expect(selectedTool).toBe('select')
    })
  })

  describe('Layer Management', () => {
    it('should add a layer', () => {
      const { addLayer } = useCanvasStore.getState()

      const layer: Layer = {
        id: 'layer-1',
        name: 'Rectangle 1',
        visible: true,
        locked: false,
        objectId: 'obj-1',
        type: 'RECTANGLE',
      }

      addLayer(layer)
      const { layers } = useCanvasStore.getState()

      expect(layers).toHaveLength(1)
      expect(layers[0]).toEqual(layer)
    })

    it('should remove a layer', () => {
      const { addLayer, removeLayer } = useCanvasStore.getState()

      const layer1: Layer = {
        id: 'layer-1',
        name: 'Rectangle 1',
        visible: true,
        locked: false,
        objectId: 'obj-1',
        type: 'RECTANGLE',
      }

      const layer2: Layer = {
        id: 'layer-2',
        name: 'Circle 1',
        visible: true,
        locked: false,
        objectId: 'obj-2',
        type: 'ELLIPSE',
      }

      addLayer(layer1)
      addLayer(layer2)

      removeLayer('layer-1')
      const { layers } = useCanvasStore.getState()

      expect(layers).toHaveLength(1)
      expect(layers[0].id).toBe('layer-2')
    })

    it('should toggle layer visibility', () => {
      const { addLayer, toggleLayerVisibility } = useCanvasStore.getState()

      const layer: Layer = {
        id: 'layer-1',
        name: 'Rectangle 1',
        visible: true,
        locked: false,
        objectId: 'obj-1',
        type: 'RECTANGLE',
      }

      addLayer(layer)
      toggleLayerVisibility('layer-1')

      const { layers } = useCanvasStore.getState()
      expect(layers[0].visible).toBe(false)

      toggleLayerVisibility('layer-1')
      expect(useCanvasStore.getState().layers[0].visible).toBe(true)
    })

    it('should toggle layer lock', () => {
      const { addLayer, toggleLayerLock } = useCanvasStore.getState()

      const layer: Layer = {
        id: 'layer-1',
        name: 'Rectangle 1',
        visible: true,
        locked: false,
        objectId: 'obj-1',
        type: 'RECTANGLE',
      }

      addLayer(layer)
      toggleLayerLock('layer-1')

      const { layers } = useCanvasStore.getState()
      expect(layers[0].locked).toBe(true)

      toggleLayerLock('layer-1')
      expect(useCanvasStore.getState().layers[0].locked).toBe(false)
    })
  })

  describe('Page Management', () => {
    it('should initialize with one default page', () => {
      const { pages, currentPageId } = useCanvasStore.getState()

      expect(pages).toHaveLength(1)
      expect(pages[0].name).toBe('Page 1')
      expect(currentPageId).toBe('page-1')
    })

    it('should add a new page', () => {
      const { addPage, pages } = useCanvasStore.getState()

      addPage('Page 2')
      const updatedPages = useCanvasStore.getState().pages

      expect(updatedPages).toHaveLength(2)
      expect(updatedPages[1].name).toBe('Page 2')
    })

    it('should remove a page', () => {
      const { addPage, removePage } = useCanvasStore.getState()

      addPage('Page 2')
      const pageToRemove = useCanvasStore.getState().pages[1].id

      removePage(pageToRemove)
      const { pages } = useCanvasStore.getState()

      expect(pages).toHaveLength(1)
      expect(pages[0].name).toBe('Page 1')
    })

    it('should switch to current page when removing active page', () => {
      const { addPage, removePage, setCurrentPage } = useCanvasStore.getState()

      addPage('Page 2')
      const page2Id = useCanvasStore.getState().pages[1].id

      setCurrentPage(page2Id)
      removePage(page2Id)

      const { currentPageId } = useCanvasStore.getState()
      expect(currentPageId).toBe('page-1')
    })

    it('should set current page', () => {
      const { addPage, setCurrentPage } = useCanvasStore.getState()

      addPage('Page 2')
      const page2Id = useCanvasStore.getState().pages[1].id

      setCurrentPage(page2Id)
      const { currentPageId } = useCanvasStore.getState()

      expect(currentPageId).toBe(page2Id)
    })
  })

  describe('Object Selection', () => {
    it('should set selected object ID', () => {
      const { setSelectedObjectId } = useCanvasStore.getState()

      setSelectedObjectId('obj-1')
      expect(useCanvasStore.getState().selectedObjectId).toBe('obj-1')

      setSelectedObjectId(null)
      expect(useCanvasStore.getState().selectedObjectId).toBeNull()
    })

    it('should set selected object properties', () => {
      const { setSelectedObjectProps } = useCanvasStore.getState()

      const props = {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        left: 10,
        top: 20,
        width: 100,
        height: 50,
      }

      setSelectedObjectProps(props)
      expect(useCanvasStore.getState().selectedObjectProps).toEqual(props)
    })
  })

  describe('Clipboard', () => {
    it('should set clipboard', () => {
      const { setClipboard } = useCanvasStore.getState()

      const mockObject = { type: 'rect' } as any
      setClipboard(mockObject)

      expect(useCanvasStore.getState().clipboard).toEqual(mockObject)

      setClipboard(null)
      expect(useCanvasStore.getState().clipboard).toBeNull()
    })
  })

  describe('Zoom', () => {
    it('should set zoom level', () => {
      const { setZoom } = useCanvasStore.getState()

      setZoom(150)
      expect(useCanvasStore.getState().zoom).toBe(150)

      setZoom(50)
      expect(useCanvasStore.getState().zoom).toBe(50)
    })

    it('should initialize with 100% zoom', () => {
      const { zoom } = useCanvasStore.getState()
      expect(zoom).toBe(100)
    })
  })
})

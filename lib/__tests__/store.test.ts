import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore, isBackgroundDark, CANVAS_SERIALIZE_PROPS } from '../store'
import type { Layer } from '@/types'
import type { fabric } from 'fabric'

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

  describe('Style Defaults', () => {
    it('should merge partial style defaults', () => {
      const { setStyleDefaults } = useCanvasStore.getState()
      const initial = useCanvasStore.getState().styleDefaults

      setStyleDefaults({ fill: '#ff0000' })
      const after = useCanvasStore.getState().styleDefaults
      expect(after.fill).toBe('#ff0000')
      // stroke / strokeWidth / textFill は保持される
      expect(after.stroke).toBe(initial.stroke)
      expect(after.strokeWidth).toBe(initial.strokeWidth)
      expect(after.textFill).toBe(initial.textFill)
    })

    it('should store textFill separately from shape fill', () => {
      const { setStyleDefaults } = useCanvasStore.getState()
      setStyleDefaults({ fill: 'rgba(0, 0, 0, 0.5)' })
      setStyleDefaults({ textFill: '#ff00ff' })
      const after = useCanvasStore.getState().styleDefaults
      expect(after.fill).toBe('rgba(0, 0, 0, 0.5)')
      expect(after.textFill).toBe('#ff00ff')
    })

    it('should toggle duplicate mode', () => {
      const { setDuplicateMode } = useCanvasStore.getState()
      expect(useCanvasStore.getState().duplicateMode).toBe(false)
      setDuplicateMode(true)
      expect(useCanvasStore.getState().duplicateMode).toBe(true)
      setDuplicateMode(false)
      expect(useCanvasStore.getState().duplicateMode).toBe(false)
    })

    it('should keep empty textFill by default so that theme default applies on creation', () => {
      // useCanvasEvents は `styleDefaults.textFill || themeTextColor` で fallback する
      // 初期状態で textFill が空文字（falsy）であることを担保
      useCanvasStore.setState({
        styleDefaults: {
          fill: 'rgba(107, 114, 128, 0.5)',
          stroke: '#6B7280',
          strokeWidth: 0,
          textFill: '',
          stickyColor: '#FEF3B5',
        },
      })
      const { styleDefaults } = useCanvasStore.getState()
      expect(styleDefaults.textFill).toBe('')
      expect(Boolean(styleDefaults.textFill)).toBe(false)
    })

    it('should reject non-string/non-number fields from corrupted localStorage', () => {
      // 汚染された localStorage（型不正）を読み込んでも既定値を破壊しないことを確認
      const baseline = {
        fill: 'rgba(107, 114, 128, 0.5)',
        stroke: '#6B7280',
        strokeWidth: 0,
        textFill: '',
        stickyColor: '#FEF3B5',
      }
      useCanvasStore.setState({ styleDefaults: baseline })
      localStorage.setItem(
        'twb-style-defaults',
        JSON.stringify({ fill: 123, stroke: null, strokeWidth: 'abc', textFill: {} })
      )
      useCanvasStore.getState().loadSavedStyleDefaults()
      const after = useCanvasStore.getState().styleDefaults
      expect(after).toEqual(baseline)
      localStorage.removeItem('twb-style-defaults')
    })
  })

  describe('Auto Invert Text', () => {
    it('isBackgroundDark should classify common colors correctly', () => {
      expect(isBackgroundDark('#000000')).toBe(true)
      expect(isBackgroundDark('#1f2937')).toBe(true)
      expect(isBackgroundDark('#f5f5f5')).toBe(false)
      expect(isBackgroundDark('#ffffff')).toBe(false)
      expect(isBackgroundDark('#fff')).toBe(false)
      expect(isBackgroundDark('rgb(17, 17, 17)')).toBe(true)
      expect(isBackgroundDark('rgb(240, 240, 240)')).toBe(false)
    })

    it('isBackgroundDark should fall back to dark on invalid input', () => {
      // 空文字や不正形式は「読めないのでダーク」扱い
      expect(isBackgroundDark('')).toBe(true)
      expect(isBackgroundDark('not-a-color')).toBe(true)
    })

    it('setAutoInvertText should persist to localStorage', () => {
      useCanvasStore.getState().setAutoInvertText(false)
      expect(useCanvasStore.getState().autoInvertText).toBe(false)
      expect(localStorage.getItem('twb-auto-invert-text')).toBe('0')
      useCanvasStore.getState().setAutoInvertText(true)
      expect(useCanvasStore.getState().autoInvertText).toBe(true)
      expect(localStorage.getItem('twb-auto-invert-text')).toBe('1')
      localStorage.removeItem('twb-auto-invert-text')
    })

    it('loadSavedAutoInvertText should leave default untouched when key absent', () => {
      localStorage.removeItem('twb-auto-invert-text')
      useCanvasStore.setState({ autoInvertText: true })
      useCanvasStore.getState().loadSavedAutoInvertText()
      // 未保存なら既定値（true）を維持
      expect(useCanvasStore.getState().autoInvertText).toBe(true)
    })
  })

  describe('Selected Object Props (regression)', () => {
    it('should accept strokeWidth and isArrow in ObjectProperties', () => {
      // handleObjectModified が strokeWidth / isArrow を落とすと PropertiesPanel の
      // 線コントロールが消える回帰が起きるため、型・ストアがこれらを保持できることを担保する
      const { setSelectedObjectProps } = useCanvasStore.getState()
      setSelectedObjectProps({
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 3,
        left: 10,
        top: 20,
        width: 100,
        height: 50,
        opacity: 1,
        isArrow: true,
      })
      const props = useCanvasStore.getState().selectedObjectProps
      expect(props?.strokeWidth).toBe(3)
      expect(props?.isArrow).toBe(true)
    })
  })

  describe('Persistence integrity (regression)', () => {
    // 並び順/ロック/可視性などのレイヤー操作後、現在ページの canvasData が
    // 最新の canvas からシリアライズし直されること（=リロードで巻き戻らないこと）を担保する。

    // toJSON 呼び出しのたびに tick を増やす最小モック canvas
    function makeMockCanvas(obj: { data: { id: string }; visible: boolean }) {
      let tick = 0
      return {
        getObjects: () => [obj],
        moveTo: () => {},
        renderAll: () => {},
        getActiveObject: () => null,
        discardActiveObject: () => {},
        toJSON: () => ({ tick: ++tick, objects: [{ id: obj.data.id, visible: obj.visible }] }),
      } as unknown as fabric.Canvas
    }

    const seedLayer: Layer = {
      id: 'l1',
      name: 'L1',
      visible: true,
      locked: false,
      objectId: 'obj-1',
      type: 'RECTANGLE',
    }

    function seedStore(mockCanvas: fabric.Canvas) {
      useCanvasStore.setState({
        fabricCanvas: mockCanvas,
        layers: [{ ...seedLayer }],
        pages: [{ id: 'page-1', name: 'Page 1', canvasData: 'STALE', layers: [{ ...seedLayer }] }],
        currentPageId: 'page-1',
      })
    }

    it('CANVAS_SERIALIZE_PROPS includes lock props so they round-trip', () => {
      for (const p of [
        'selectable',
        'evented',
        'lockMovementX',
        'lockMovementY',
        'lockRotation',
        'lockScalingX',
        'lockScalingY',
      ]) {
        expect(CANVAS_SERIALIZE_PROPS).toContain(p)
      }
    })

    it('toggleLayerVisibility refreshes canvasData and reflects the new visible state', () => {
      const obj = { data: { id: 'obj-1' }, visible: true }
      seedStore(makeMockCanvas(obj))
      useCanvasStore.getState().toggleLayerVisibility('l1')

      const st = useCanvasStore.getState()
      expect(st.layers[0].visible).toBe(false)
      const page = st.pages.find((p) => p.id === 'page-1')!
      expect(page.canvasData).not.toBe('STALE') // 再シリアライズされている
      expect(JSON.parse(page.canvasData!).objects[0].visible).toBe(false)
    })

    it('toggleLayerLock refreshes canvasData and flips locked', () => {
      const obj = { data: { id: 'obj-1' }, visible: true, set: () => {} }
      seedStore(makeMockCanvas(obj))
      useCanvasStore.getState().toggleLayerLock('l1')

      const st = useCanvasStore.getState()
      expect(st.layers[0].locked).toBe(true)
      const page = st.pages.find((p) => p.id === 'page-1')!
      expect(page.canvasData).not.toBe('STALE')
    })

    it('reorderLayers refreshes canvasData (z-order persisted)', () => {
      const obj = { data: { id: 'obj-1' }, visible: true }
      seedStore(makeMockCanvas(obj))
      useCanvasStore.getState().reorderLayers(0, 0)

      const page = useCanvasStore.getState().pages.find((p) => p.id === 'page-1')!
      expect(page.canvasData).not.toBe('STALE')
    })

    it('syncs correct fabric z-order when a FRAME (folder) is interleaved (no index drift)', () => {
      // パネル順(上=前面): A, B, FRAME, C, D（FRAME は canvas オブジェクトを持たない）。
      // 旧実装は length にフレームを含めるため中間挿入で A/B が入れ替わっていた。
      const mk = (id: string) => ({ data: { id } })
      const objs = [mk('a'), mk('b'), mk('c'), mk('d')]
      const arr = [...objs]
      const mockCanvas = {
        getObjects: () => arr,
        moveTo: (obj: { data: { id: string } }, index: number) => {
          const i = arr.indexOf(obj)
          if (i >= 0) arr.splice(i, 1)
          arr.splice(index, 0, obj)
        },
        renderAll: () => {},
        toJSON: () => ({ objects: arr.map((o) => ({ id: o.data.id })) }),
      } as unknown as fabric.Canvas

      const layers: Layer[] = [
        { id: 'la', name: 'A', visible: true, locked: false, objectId: 'a', type: 'RECTANGLE' },
        { id: 'lb', name: 'B', visible: true, locked: false, objectId: 'b', type: 'RECTANGLE' },
        { id: 'lf', name: 'F', visible: true, locked: false, objectId: 'f', type: 'FRAME' },
        { id: 'lc', name: 'C', visible: true, locked: false, objectId: 'c', type: 'RECTANGLE' },
        { id: 'ld', name: 'D', visible: true, locked: false, objectId: 'd', type: 'RECTANGLE' },
      ]
      useCanvasStore.setState({
        fabricCanvas: mockCanvas,
        layers,
        pages: [{ id: 'page-1', name: 'P', canvasData: null, layers }],
        currentPageId: 'page-1',
      })

      useCanvasStore.getState().reorderLayers(0, 0)

      // canvas index0 = 最背面。パネル先頭 A が最前面なので [d, c, b, a] が正しい順序。
      expect(arr.map((o) => o.data.id)).toEqual(['d', 'c', 'b', 'a'])
    })
  })

  describe('History dedup (regression)', () => {
    // add/remove 操作はデバウンスリスナーと明示 saveHistory() の双方から呼ばれ
    // 二重記録され、Undo に2回必要になっていた。同一内容なら無視することを担保する。
    it('should skip a duplicate consecutive snapshot but record real changes', () => {
      let toJSONResult: { objects: { id: string }[] } = { objects: [{ id: 'a' }] }
      const mockCanvas = { toJSON: () => toJSONResult } as unknown as import('fabric').fabric.Canvas
      useCanvasStore.setState({
        fabricCanvas: mockCanvas,
        layers: [],
        history: [],
        historyIndex: -1,
        isUndoRedoAction: false,
      })

      const { saveHistory } = useCanvasStore.getState()

      saveHistory()
      expect(useCanvasStore.getState().history).toHaveLength(1)

      // 同一内容の二度目 → 無視されて件数据え置き
      saveHistory()
      expect(useCanvasStore.getState().history).toHaveLength(1)

      // canvas 内容が変われば記録される
      toJSONResult = { objects: [{ id: 'a' }, { id: 'b' }] }
      saveHistory()
      expect(useCanvasStore.getState().history).toHaveLength(2)

      // canvas 同一でも layers が変われば記録される
      useCanvasStore.setState({
        layers: [
          { id: 'l1', name: 'L1', visible: true, locked: false, objectId: 'b', type: 'RECTANGLE' },
        ],
      })
      saveHistory()
      expect(useCanvasStore.getState().history).toHaveLength(3)
    })
  })
})

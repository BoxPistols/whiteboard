import { useCallback, useRef, useEffect } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
import {
  getCanvasPointer,
  createArrowPathData,
  createArrowObject,
  toolToNodeType,
} from '@/lib/canvasUtils'

interface UseCanvasEventsProps {
  fabricCanvas: fabric.Canvas | null
  shapeCounterRef: React.MutableRefObject<any>
  setSelectedObjectProps: (props: any) => void
  setShowAlignmentPanel: (show: boolean) => void
  setViewportOffset: (offset: { x: number; y: number }) => void
}

export const useCanvasEvents = ({
  fabricCanvas,
  shapeCounterRef,
  setSelectedObjectProps,
  setShowAlignmentPanel,
  setViewportOffset,
}: UseCanvasEventsProps) => {
  const {
    selectedTool,
    setSelectedTool,
    setSelectedObjectId,
    addLayer,
    theme,
    canvasBackground,
    gridSnapEnabled,
    gridSize,
    saveHistory,
    setZoom,
  } = useCanvasStore()

  const isDrawingRef = useRef(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<fabric.Object | null>(null)

  // --------------------------------------------------------------------------
  // 描画ハンドラ
  // --------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: fabric.IEvent<Event>) => {
      if (!fabricCanvas || selectedTool === 'select' || selectedTool === 'pencil') return

      const pointer = getCanvasPointer(e.e as MouseEvent | TouchEvent, fabricCanvas)

      if (selectedTool === 'text') {
        setSelectedTool('select')
        const id = crypto.randomUUID()
        const textColor = theme === 'dark' ? '#ffffff' : '#000000'
        const text = new fabric.IText('テキストを入力', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: textColor,
          fontFamily: 'Arial',
          data: { id, baseFill: textColor, baseTheme: theme },
        })
        fabricCanvas.add(text)
        fabricCanvas.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        fabricCanvas.renderAll()

        shapeCounterRef.current.text += 1
        addLayer({
          id,
          name: `text ${shapeCounterRef.current.text}`,
          visible: true,
          locked: false,
          objectId: id,
          type: 'TEXT',
        })
        setSelectedObjectId(id)
        return
      }

      isDrawingRef.current = true
      startPointRef.current = { x: pointer.x, y: pointer.y }

      const defaultStrokeColor = theme === 'dark' ? '#6B7280' : '#D1D5DB'
      const defaultFillColor =
        theme === 'dark' ? 'rgba(107, 114, 128, 0.5)' : 'rgba(209, 213, 219, 0.5)'

      let shape: fabric.Object | null = null

      switch (selectedTool) {
        case 'rectangle':
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: defaultFillColor,
            stroke: defaultStrokeColor,
            strokeWidth: 0,
            selectable: false,
            evented: false,
          })
          break
        case 'circle':
          shape = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: defaultFillColor,
            stroke: defaultStrokeColor,
            strokeWidth: 0,
            selectable: false,
            evented: false,
          })
          break
        case 'line':
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: defaultStrokeColor,
            strokeWidth: 2,
            selectable: false,
            evented: false,
          })
          break
        case 'arrow': {
          const pathData = createArrowPathData(2)
          shape = createArrowObject(pathData, {
            left: pointer.x,
            top: pointer.y,
            stroke: defaultStrokeColor,
            strokeWidth: 2,
            fill: defaultStrokeColor,
            selectable: false,
            evented: false,
          })
          break
        }
      }

      if (shape) {
        fabricCanvas.add(shape)
        currentShapeRef.current = shape
      }
    },
    [
      fabricCanvas,
      selectedTool,
      setSelectedTool,
      theme,
      addLayer,
      setSelectedObjectId,
      shapeCounterRef,
    ]
  )

  const handleMouseMove = useCallback(
    (e: fabric.IEvent<Event>) => {
      if (
        !isDrawingRef.current ||
        !startPointRef.current ||
        !currentShapeRef.current ||
        !fabricCanvas
      )
        return

      const pointer = getCanvasPointer(e.e as MouseEvent | TouchEvent, fabricCanvas)
      const startPoint = startPointRef.current
      const currentShape = currentShapeRef.current

      switch (selectedTool) {
        case 'rectangle':
          if (currentShape instanceof fabric.Rect) {
            const width = pointer.x - startPoint.x
            const height = pointer.y - startPoint.y
            currentShape.set({
              width: Math.abs(width),
              height: Math.abs(height),
              left: width > 0 ? startPoint.x : pointer.x,
              top: height > 0 ? startPoint.y : pointer.y,
            })
          }
          break
        case 'circle':
          if (currentShape instanceof fabric.Circle) {
            const radius = Math.sqrt(
              Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2)
            )
            currentShape.set({ radius: radius / 2 })
          }
          break
        case 'line':
          if (currentShape instanceof fabric.Line) {
            currentShape.set({ x2: pointer.x, y2: pointer.y })
          }
          break
        case 'arrow':
          if (currentShape instanceof fabric.Path) {
            const dx = pointer.x - startPoint.x
            const dy = pointer.y - startPoint.y
            const length = Math.max(5, Math.sqrt(dx * dx + dy * dy))
            let angle = (Math.atan2(dy, dx) * 180) / Math.PI

            if ((e.e as MouseEvent).shiftKey) {
              angle = Math.round(angle / 45) * 45
            }

            const rad = (angle * Math.PI) / 180
            const endX = startPoint.x + length * Math.cos(rad)
            const endY = startPoint.y + length * Math.sin(rad)

            fabricCanvas.remove(currentShape)
            const pathData = createArrowPathData(length)
            const newArrow = createArrowObject(pathData, {
              left: (startPoint.x + endX) / 2,
              top: (startPoint.y + endY) / 2,
              angle: angle,
              stroke: currentShape.stroke,
              strokeWidth: currentShape.strokeWidth,
              fill: currentShape.fill,
              selectable: false,
              evented: false,
            })
            fabricCanvas.add(newArrow)
            currentShapeRef.current = newArrow
          }
          break
      }
      fabricCanvas.renderAll()
    },
    [fabricCanvas, selectedTool]
  )

  const handleMouseUp = useCallback(() => {
    if (currentShapeRef.current && selectedTool !== 'select' && selectedTool !== 'pencil') {
      const id = crypto.randomUUID()
      const shape = currentShapeRef.current

      shape.set({
        data: {
          id,
          ...(selectedTool === 'arrow' && { type: 'arrow' }),
          baseFill: typeof shape.fill === 'string' ? shape.fill : undefined,
          baseStroke: typeof shape.stroke === 'string' ? shape.stroke : undefined,
          baseTheme: theme,
        },
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      })
      shape.setCoords()

      shapeCounterRef.current[selectedTool] += 1
      addLayer({
        id,
        name: `${selectedTool} ${shapeCounterRef.current[selectedTool]}`,
        visible: true,
        locked: false,
        objectId: id,
        type: toolToNodeType(selectedTool),
      })

      setSelectedTool('select')
      setSelectedObjectId(id)
      fabricCanvas?.setActiveObject(shape)
      fabricCanvas?.renderAll()
      saveHistory()
    }

    isDrawingRef.current = false
    startPointRef.current = null
    currentShapeRef.current = null
  }, [
    fabricCanvas,
    selectedTool,
    addLayer,
    setSelectedTool,
    setSelectedObjectId,
    theme,
    shapeCounterRef,
    saveHistory,
  ])

  // --------------------------------------------------------------------------
  // イベント登録
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!fabricCanvas) return

    const handleSelection = (e: fabric.IEvent) => {
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject?.type === 'activeSelection') {
        setShowAlignmentPanel(true)
        setSelectedObjectId('__multi_selection__')
        // プロパティ表示用（簡易版）
        const first = (activeObject as fabric.ActiveSelection).getObjects()[0]
        if (first)
          setSelectedObjectProps({ fill: first.fill, stroke: first.stroke, opacity: first.opacity })
        return
      }

      setShowAlignmentPanel(false)
      const selected = e.selected?.[0]
      if (selected && selected.data?.id) {
        setSelectedObjectId(selected.data.id)
        setSelectedObjectProps({
          fill: selected.fill,
          stroke: selected.stroke,
          strokeWidth: selected.strokeWidth,
          left: selected.left,
          top: selected.top,
          width: selected.width! * (selected.scaleX || 1),
          height: selected.height! * (selected.scaleY || 1),
          opacity: selected.opacity,
        })
      } else {
        setSelectedObjectId(null)
        setSelectedObjectProps(null)
      }
    }

    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target
      if (obj && obj.data?.id) {
        setSelectedObjectProps({
          fill: obj.fill,
          stroke: obj.stroke,
          left: obj.left,
          top: obj.top,
          width: obj.width! * (obj.scaleX || 1),
          height: obj.height! * (obj.scaleY || 1),
          opacity: obj.opacity,
        })
      }
    }

    const handlePathCreated = (e: any) => {
      if (e.path) {
        const id = crypto.randomUUID()
        e.path.set({ data: { id, baseStroke: e.path.stroke, baseTheme: theme } })
        shapeCounterRef.current.pencil += 1
        addLayer({
          id: crypto.randomUUID(),
          name: `pencil ${shapeCounterRef.current.pencil}`,
          visible: true,
          locked: false,
          objectId: id,
          type: 'VECTOR',
        })
        fabricCanvas.renderAll()
        saveHistory()
      }
    }

    // ズーム/パン処理
    let isPanning = false
    let lastPosX = 0
    let lastPosY = 0

    const handleMouseDownInt = (opt: fabric.IEvent) => {
      if (selectedTool !== 'select') return
      const evt = opt.e as MouseEvent | TouchEvent
      const isMiddleButton = 'button' in evt && evt.button === 1
      const isSpaceKey = 'buttons' in evt && evt.buttons === 1 && (evt as MouseEvent).altKey

      // パンは中ボタンまたはAlt+ドラッグでのみ有効（通常のクリックはfabric.jsの選択に任せる）
      if (!opt.target && (isMiddleButton || isSpaceKey)) {
        const mouseEvt = evt as MouseEvent
        const coords = { x: mouseEvt.clientX, y: mouseEvt.clientY }
        isPanning = true
        fabricCanvas.selection = false
        lastPosX = coords.x
        lastPosY = coords.y
      }
    }

    const handleMouseMoveInt = (opt: fabric.IEvent) => {
      if (isPanning) {
        const e = opt.e as MouseEvent | TouchEvent
        const coords =
          'touches' in e
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
        const vpt = fabricCanvas.viewportTransform!
        vpt[4] += coords.x - lastPosX
        vpt[5] += coords.y - lastPosY
        lastPosX = coords.x
        lastPosY = coords.y
        fabricCanvas.requestRenderAll()
        setViewportOffset({ x: vpt[4], y: vpt[5] })
      }
    }

    const handleMouseWheel = (opt: fabric.IEvent) => {
      const e = opt.e as WheelEvent
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const zoom = Math.max(0.1, Math.min(2, fabricCanvas.getZoom() + -e.deltaY * 0.0015))
        fabricCanvas.zoomToPoint({ x: e.clientX, y: e.clientY }, zoom)
        setZoom(Math.round(zoom * 100))
      } else {
        const vpt = fabricCanvas.viewportTransform!
        vpt[4] += -e.deltaX
        vpt[5] += -e.deltaY
        fabricCanvas.requestRenderAll()
      }
      setViewportOffset({
        x: fabricCanvas.viewportTransform![4],
        y: fabricCanvas.viewportTransform![5],
      })
    }

    fabricCanvas.on('mouse:down', handleMouseDown)
    fabricCanvas.on('mouse:move', handleMouseMove)
    fabricCanvas.on('mouse:up', handleMouseUp)
    fabricCanvas.on('mouse:down', handleMouseDownInt)
    fabricCanvas.on('mouse:move', handleMouseMoveInt)
    fabricCanvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false
        fabricCanvas.selection = true
      }
    })
    fabricCanvas.on('mouse:wheel', handleMouseWheel)
    fabricCanvas.on('selection:created', handleSelection)
    fabricCanvas.on('selection:updated', handleSelection)
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObjectId(null)
      setSelectedObjectProps(null)
      setShowAlignmentPanel(false)
    })
    fabricCanvas.on('object:modified', handleObjectModified)
    fabricCanvas.on('path:created', handlePathCreated)

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown)
      fabricCanvas.off('mouse:move', handleMouseMove)
      fabricCanvas.off('mouse:up', handleMouseUp)
      fabricCanvas.off('mouse:down', handleMouseDownInt)
      fabricCanvas.off('mouse:move', handleMouseMoveInt)
      fabricCanvas.off('mouse:wheel', handleMouseWheel)
      fabricCanvas.off('selection:created', handleSelection)
      fabricCanvas.off('selection:updated', handleSelection)
      fabricCanvas.off('object:modified', handleObjectModified)
      fabricCanvas.off('path:created', handlePathCreated)
    }
  }, [
    fabricCanvas,
    selectedTool,
    theme,
    addLayer,
    setSelectedObjectId,
    setSelectedObjectProps,
    setShowAlignmentPanel,
    setViewportOffset,
    setZoom,
    saveHistory,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    shapeCounterRef,
  ])
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts'
import { convertColorForTheme } from '@/lib/colorUtils'
import ContextMenu from '@/components/ContextMenu'
import AlignmentPanel from '@/components/AlignmentPanel'
import type { NodeType } from '@/types'

// ツールをFigmaのNodeTypeに変換するヘルパー関数
const toolToNodeType = (tool: string): NodeType => {
  switch (tool) {
    case 'rectangle':
      return 'RECTANGLE'
    case 'circle':
      return 'ELLIPSE'
    case 'line':
      return 'LINE'
    case 'text':
      return 'TEXT'
    default:
      return 'VECTOR'
  }
}

// 色をhex形式に変換するヘルパー関数
const colorToHex = (color: string | fabric.Pattern | fabric.Gradient | undefined): string => {
  if (!color || typeof color !== 'string') return ''

  // すでにhex形式の場合
  if (color.startsWith('#')) {
    // 短縮形を標準形に変換
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    }
    return color
  }

  // rgb/rgba形式の場合
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10)
    const g = parseInt(rgbaMatch[2], 10)
    const b = parseInt(rgbaMatch[3], 10)
    const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    return `#${hex}`
  }

  // 名前付き色の場合、そのまま返す（ブラウザが処理）
  return color
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const {
    selectedTool,
    setSelectedTool,
    setSelectedObjectId,
    addLayer,
    removeLayer,
    layers,
    selectedObjectId,
    setFabricCanvas,
    setSelectedObjectProps,
    clipboard,
    setClipboard,
    currentPageId,
    pages,
    updatePageData,
    setLayers,
    resetZoom,
    zoomToFit,
    zoomToSelection,
    theme,
    canvasBackground,
  } = useCanvasStore()
  // useRefを使用して、イベントハンドラの再作成を防ぐ
  const isDrawingRef = useRef(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<fabric.Object | null>(null)
  const [isAltDragging, setIsAltDragging] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const prevPageIdRef = useRef<string>(currentPageId)
  const [showAlignmentPanel, setShowAlignmentPanel] = useState(false)
  const shapeCounterRef = useRef({
    rectangle: 0,
    circle: 0,
    line: 0,
    arrow: 0,
    text: 0,
    pencil: 0,
    paste: 0,
    group: 0,
    object: 0,
  })

  // 選択されたオブジェクトを削除（複数選択対応）
  const deleteSelectedObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeSelection = canvas.getActiveObject()
    if (!activeSelection) return

    // 複数選択の場合
    if (activeSelection.type === 'activeSelection') {
      const objects = (activeSelection as fabric.ActiveSelection).getObjects()
      canvas.discardActiveObject()
      objects.forEach((obj) => {
        const objectId = obj.data?.id
        if (objectId) {
          // objectIdからlayerIdを見つける
          const layer = layers.find((l) => l.objectId === objectId)
          if (layer) {
            // removeLayerがcanvasからも削除する
            removeLayer(layer.id)
          }
        }
      })
    } else {
      // 単一選択の場合
      const objectId = activeSelection.data?.id
      if (objectId) {
        // objectIdからlayerIdを見つける
        const layer = layers.find((l) => l.objectId === objectId)
        if (layer) {
          // removeLayerがcanvasからも削除する
          removeLayer(layer.id)
        }
      }
    }

    setSelectedObjectId(null)
  }, [removeLayer, setSelectedObjectId, layers])

  // 選択されたオブジェクトを複製
  const duplicateSelectedObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedObjectId) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        const objectId = crypto.randomUUID()
        const layerId = crypto.randomUUID()
        cloned.set({
          left: (cloned.left || 0) + 10,
          top: (cloned.top || 0) + 10,
          data: { id: objectId },
        })
        canvas.add(cloned)
        canvas.setActiveObject(cloned)
        canvas.renderAll()

        // レイヤーを追加
        const originalLayer = layers.find((l) => l.objectId === selectedObjectId)
        if (originalLayer) {
          addLayer({
            id: layerId,
            name: `${originalLayer.name} copy`,
            visible: true,
            locked: false,
            objectId: objectId,
            type: originalLayer.type,
          })
        }
        setSelectedObjectId(objectId)
      })
    }
  }, [selectedObjectId, layers, addLayer, setSelectedObjectId])

  // コピー機能
  const copySelectedObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        setClipboard(cloned)
      })
    }
  }, [setClipboard])

  // ペースト機能
  const pasteObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !clipboard) return

    clipboard.clone((cloned: fabric.Object) => {
      const objectId = crypto.randomUUID()
      const layerId = crypto.randomUUID()
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
        data: { id: objectId },
        evented: true,
        selectable: true,
      })
      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.renderAll()

      // カウンターをインクリメント
      shapeCounterRef.current.paste += 1
      const counter = shapeCounterRef.current.paste

      addLayer({
        id: layerId,
        name: `paste ${counter}`,
        visible: true,
        locked: false,
        objectId: objectId,
        type: 'VECTOR',
      })
      setSelectedObjectId(objectId)
      setClipboard(cloned)
    })
  }, [clipboard, addLayer, setSelectedObjectId, setClipboard])

  // 最前面へ移動
  const bringToFront = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.bringToFront(activeObject)
      canvas.renderAll()
    }
  }, [])

  // 最背面へ移動
  const sendToBack = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.sendToBack(activeObject)
      canvas.renderAll()
    }
  }, [])

  // ロック
  const lockObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.data?.id) {
      activeObject.set({
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        selectable: false,
        evented: false,
      })
      canvas.discardActiveObject()
      canvas.renderAll()

      // レイヤー状態も更新
      const layer = layers.find((l) => l.id === activeObject.data?.id)
      if (layer) {
        // toggleLayerLock は store.ts に既存
      }
    }
  }, [layers])

  // ロック解除
  const unlockObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedObjectId) return

    // すべてのオブジェクトから該当のオブジェクトを探す
    const objects = canvas.getObjects()
    const lockedObject = objects.find((obj) => obj.data?.id === selectedObjectId)

    if (lockedObject) {
      lockedObject.set({
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
        hasControls: true,
        selectable: true,
        evented: true,
      })
      canvas.setActiveObject(lockedObject)
      canvas.renderAll()
    }
  }, [selectedObjectId])

  // グループ化
  const groupObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeSelection = canvas.getActiveObject()
    if (!activeSelection || activeSelection.type !== 'activeSelection') return

    const selection = activeSelection as fabric.ActiveSelection
    const objects = selection.getObjects()

    // 2つ以上のオブジェクトが選択されている場合のみグループ化
    if (objects.length < 2) return

    selection.toGroup()
    const group = canvas.getActiveObject() as fabric.Group

    // グループにIDを割り当て
    const id = crypto.randomUUID()
    group.set({
      data: { id },
    })

    // カウンターをインクリメント
    shapeCounterRef.current.group += 1
    const counter = shapeCounterRef.current.group

    // グループのレイヤーを追加
    addLayer({
      id,
      name: `group ${counter}`,
      visible: true,
      locked: false,
      objectId: id,
      type: 'VECTOR',
    })

    setSelectedObjectId(id)
    canvas.renderAll()
  }, [addLayer, setSelectedObjectId])

  // グループ解除
  const ungroupObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'group') return

    const group = activeObject as fabric.Group
    const items = group.getObjects()

    // グループを解除して個別のオブジェクトに戻す
    group.toActiveSelection()
    canvas.discardActiveObject()

    // 各アイテムにIDを割り当て直す
    items.forEach((item) => {
      if (!item.data?.id) {
        const id = crypto.randomUUID()
        item.set({ data: { id } })

        // カウンターをインクリメント
        shapeCounterRef.current.object += 1
        const counter = shapeCounterRef.current.object

        // レイヤーを追加
        addLayer({
          id,
          name: `object ${counter}`,
          visible: true,
          locked: false,
          objectId: id,
          type: 'VECTOR',
        })
      }
    })

    // グループのレイヤーを削除
    if (activeObject.data?.id) {
      removeLayer(activeObject.data.id)
    }

    canvas.renderAll()
  }, [addLayer, removeLayer])

  // 複数オブジェクトの取得ヘルパー
  const getSelectedObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return []

    const activeObject = canvas.getActiveObject()
    if (!activeObject) return []

    if (activeObject.type === 'activeSelection') {
      return (activeObject as fabric.ActiveSelection).getObjects()
    }
    return [activeObject]
  }, [])

  // 左揃え
  const alignLeft = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return

    const leftmost = Math.min(...objects.map((obj) => obj.left || 0))
    objects.forEach((obj) => obj.set({ left: leftmost }))

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 中央揃え（水平）
  const alignCenter = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return

    const centers = objects.map(
      (obj) => (obj.left || 0) + ((obj.width || 0) * (obj.scaleX || 1)) / 2
    )
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length

    objects.forEach((obj) => {
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      obj.set({ left: avgCenter - objWidth / 2 })
    })

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 右揃え
  const alignRight = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return

    const rightmost = Math.max(
      ...objects.map((obj) => (obj.left || 0) + (obj.width || 0) * (obj.scaleX || 1))
    )
    objects.forEach((obj) => {
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      obj.set({ left: rightmost - objWidth })
    })

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 上揃え
  const alignTop = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return

    const topmost = Math.min(...objects.map((obj) => obj.top || 0))
    objects.forEach((obj) => obj.set({ top: topmost }))

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 中央揃え（垂直）
  const alignMiddle = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return

    const middles = objects.map(
      (obj) => (obj.top || 0) + ((obj.height || 0) * (obj.scaleY || 1)) / 2
    )
    const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length

    objects.forEach((obj) => {
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      obj.set({ top: avgMiddle - objHeight / 2 })
    })

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 下揃え
  const alignBottom = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return

    const bottommost = Math.max(
      ...objects.map((obj) => (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1))
    )
    objects.forEach((obj) => {
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      obj.set({ top: bottommost - objHeight })
    })

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 水平分散
  const distributeHorizontal = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 3) return

    const sorted = [...objects].sort((a, b) => (a.left || 0) - (b.left || 0))
    const leftmost = sorted[0].left || 0
    const rightmost =
      (sorted[sorted.length - 1].left || 0) +
      (sorted[sorted.length - 1].width || 0) * (sorted[sorted.length - 1].scaleX || 1)
    const totalWidth = sorted.reduce((sum, obj) => sum + (obj.width || 0) * (obj.scaleX || 1), 0)
    const gap = (rightmost - leftmost - totalWidth) / (sorted.length - 1)

    let currentLeft = leftmost
    sorted.forEach((obj) => {
      obj.set({ left: currentLeft })
      currentLeft += (obj.width || 0) * (obj.scaleX || 1) + gap
    })

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // 垂直分散
  const distributeVertical = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 3) return

    const sorted = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0))
    const topmost = sorted[0].top || 0
    const bottommost =
      (sorted[sorted.length - 1].top || 0) +
      (sorted[sorted.length - 1].height || 0) * (sorted[sorted.length - 1].scaleY || 1)
    const totalHeight = sorted.reduce((sum, obj) => sum + (obj.height || 0) * (obj.scaleY || 1), 0)
    const gap = (bottommost - topmost - totalHeight) / (sorted.length - 1)

    let currentTop = topmost
    sorted.forEach((obj) => {
      obj.set({ top: currentTop })
      currentTop += (obj.height || 0) * (obj.scaleY || 1) + gap
    })

    const canvas = fabricCanvasRef.current
    canvas?.renderAll()
  }, [getSelectedObjects])

  // キーボードショートカットの設定
  useKeyboardShortcuts({
    setSelectedTool,
    deleteSelectedObject,
    duplicateSelectedObject,
    copySelectedObject,
    pasteObject,
    groupObjects,
    ungroupObjects,
    resetZoom,
    zoomToFit,
    zoomToSelection,
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const container = canvasRef.current.parentElement
    if (!container) return

    // キャンバス背景色（テーマとは独立）
    const canvasBg = canvasBackground || (theme === 'dark' ? '#1f2937' : '#f5f5f5')

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: canvasBg,
      enableRetinaScaling: true,
      allowTouchScrolling: false,
    })

    fabricCanvasRef.current = canvas
    setFabricCanvas(canvas)

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        canvas.setWidth(entry.contentRect.width)
        canvas.setHeight(entry.contentRect.height)
        canvas.renderAll()
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      canvas.dispose()
      setFabricCanvas(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.selection = selectedTool === 'select'
    canvas.isDrawingMode = selectedTool === 'pencil'

    // すべてのオブジェクトのselectable状態を更新
    canvas.getObjects().forEach((obj) => {
      obj.selectable = selectedTool === 'select'
      obj.evented = selectedTool === 'select'
    })
    // キャンバス背景色を反映
    canvas.backgroundColor = canvasBackground || (theme === 'dark' ? '#1f2937' : '#f5f5f5')
    canvas.renderAll()

    if (selectedTool === 'pencil') {
      canvas.freeDrawingBrush.color = theme === 'dark' ? '#ffffff' : '#000000'
      canvas.freeDrawingBrush.width = 2
    }
  }, [selectedTool, theme, canvasBackground])

  const handleMouseDown = useCallback(
    (e: fabric.IEvent<Event>) => {
      if (selectedTool === 'select' || selectedTool === 'pencil') return

      const canvas = fabricCanvasRef.current
      if (!canvas) return

      const pointer = canvas.getPointer(e.e as MouseEvent)

      // テキストツールの場合はクリック位置にテキストを追加
      if (selectedTool === 'text') {
        const id = crypto.randomUUID()
        // テーマに応じてテキスト色を決定
        const textColor = theme === 'dark' ? '#ffffff' : '#000000'

        const text = new fabric.IText('テキストを入力', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: textColor,
          fontFamily: 'Arial',
          data: {
            id,
            baseFill: textColor,
            baseTheme: theme,
          },
          selectable: true,
          evented: true,
        })

        canvas.add(text)
        canvas.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        canvas.renderAll()

        shapeCounterRef.current.text += 1
        const counter = shapeCounterRef.current.text

        addLayer({
          id,
          name: `text ${counter}`,
          visible: true,
          locked: false,
          objectId: id,
          type: 'TEXT',
        })

        setSelectedObjectId(id)

        // テキスト編集終了後にselectツールに自動切替
        text.on('editing:exited', () => {
          setSelectedTool('select')
        })

        return
      }

      isDrawingRef.current = true
      startPointRef.current = { x: pointer.x, y: pointer.y }

      // テーマに応じてデフォルトカラーを決定
      const defaultStrokeColor = theme === 'dark' ? '#6B7280' : '#D1D5DB' // Gray 500 for dark, Gray 300 for light
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
            strokeWidth: 2,
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
            strokeWidth: 2,
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
        case 'arrow':
          // 矢印は線と三角形のグループとして作成
          const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: defaultStrokeColor,
            strokeWidth: 2,
          })
          const triangle = new fabric.Triangle({
            left: pointer.x,
            top: pointer.y,
            width: 10,
            height: 10,
            fill: defaultStrokeColor,
            angle: 0,
          })
          shape = new fabric.Group([line, triangle], {
            selectable: false,
            evented: false,
          })
          break
      }

      if (shape) {
        canvas.add(shape)
        currentShapeRef.current = shape
      }
    },
    [selectedTool, addLayer, setSelectedObjectId, setSelectedTool, theme]
  )

  const handleMouseMove = useCallback(
    (e: fabric.IEvent<Event>) => {
      const isDrawing = isDrawingRef.current
      const startPoint = startPointRef.current
      const currentShape = currentShapeRef.current

      if (!isDrawing || !startPoint || !currentShape) return

      const canvas = fabricCanvasRef.current
      if (!canvas) return

      const pointer = canvas.getPointer(e.e as MouseEvent)

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
          if (currentShape instanceof fabric.Group) {
            const items = currentShape.getObjects()
            const line = items[0] as fabric.Line
            const triangle = items[1] as fabric.Triangle

            // 線を更新
            const dx = pointer.x - startPoint.x
            const dy = pointer.y - startPoint.y
            line.set({ x2: dx, y2: dy })

            // 三角形の位置と角度を計算
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
            triangle.set({
              left: dx,
              top: dy,
              angle: angle,
            })

            currentShape.setCoords()
          }
          break
      }

      canvas.renderAll()
    },
    [selectedTool]
  )

  const handleMouseUp = useCallback(() => {
    const currentShape = currentShapeRef.current

    if (currentShape && selectedTool !== 'select' && selectedTool !== 'pencil') {
      const id = crypto.randomUUID()

      // 現在の色を基本色として保存
      let baseFill: string | undefined
      let baseStroke: string | undefined

      if (currentShape.type === 'group') {
        // グループの場合は最初の要素から色を取得
        const items = (currentShape as fabric.Group).getObjects()
        if (items.length > 0) {
          baseFill = typeof items[0].fill === 'string' ? items[0].fill : undefined
          baseStroke = typeof items[0].stroke === 'string' ? items[0].stroke : undefined
        }
      } else {
        baseFill = typeof currentShape.fill === 'string' ? currentShape.fill : undefined
        baseStroke = typeof currentShape.stroke === 'string' ? currentShape.stroke : undefined
      }

      // 描画完了後にオブジェクトを選択可能にする
      currentShape.set({
        data: {
          id,
          baseFill,
          baseStroke,
          baseTheme: theme,
        },
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      })

      // Increment counter for this tool type
      shapeCounterRef.current[selectedTool] += 1
      const counter = shapeCounterRef.current[selectedTool]

      addLayer({
        id,
        name: `${selectedTool} ${counter}`,
        visible: true,
        locked: false,
        objectId: id,
        type: toolToNodeType(selectedTool),
      })

      // オブジェクト作成後、自動的にselectツールに切り替える
      setSelectedTool('select')
      setSelectedObjectId(id)

      // 作成したオブジェクトを選択状態にする
      const canvas = fabricCanvasRef.current
      if (canvas) {
        canvas.setActiveObject(currentShape)
        canvas.renderAll()
      }
    }

    isDrawingRef.current = false
    startPointRef.current = null
    currentShapeRef.current = null
  }, [selectedTool, addLayer, setSelectedTool, setSelectedObjectId, theme])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // Alt+ドラッグで複製
    const handleAltDragStart = (e: fabric.IEvent) => {
      if ((e.e as MouseEvent).altKey && selectedTool === 'select') {
        const target = canvas.getActiveObject()
        if (target) {
          target.clone((cloned: fabric.Object) => {
            const objectId = crypto.randomUUID()
            const layerId = crypto.randomUUID()
            cloned.set({
              data: { id: objectId },
              evented: true,
              selectable: true,
            })
            canvas.add(cloned)
            canvas.setActiveObject(cloned)
            setIsAltDragging(true)

            // レイヤーを追加
            const originalLayer = layers.find((l) => l.objectId === selectedObjectId)
            if (originalLayer) {
              addLayer({
                id: layerId,
                name: `${originalLayer.name} copy`,
                visible: true,
                locked: false,
                objectId: objectId,
                type: originalLayer.type,
              })
            }
            setSelectedObjectId(objectId)
          })
        }
      }
    }

    const handleAltDragEnd = () => {
      setIsAltDragging(false)
    }

    canvas.on('mouse:down:before', handleAltDragStart)
    canvas.on('mouse:up', handleAltDragEnd)

    // オブジェクト選択時のイベントハンドラ
    const handleSelection = (e: fabric.IEvent) => {
      const activeObject = canvas.getActiveObject()

      // 複数選択の場合はアライメントパネルを表示
      if (
        activeObject &&
        activeObject.type === 'activeSelection' &&
        (activeObject as fabric.ActiveSelection).getObjects().length >= 2
      ) {
        setShowAlignmentPanel(true)
      } else {
        setShowAlignmentPanel(false)
      }

      const selected = e.selected?.[0]
      if (selected && selected.data?.id) {
        setSelectedObjectId(selected.data.id)

        // Groupオブジェクト（矢印など）の場合、子要素から色を取得
        let fillColor = ''
        let strokeColor = ''
        let strokeWidth = 0

        if (selected.type === 'group') {
          const items = (selected as fabric.Group).getObjects()
          if (items.length > 0) {
            fillColor = colorToHex(items[0].fill)
            strokeColor = colorToHex(items[0].stroke)
            strokeWidth = items[0].strokeWidth || 2
          }
        } else {
          fillColor = colorToHex(selected.fill)
          strokeColor = colorToHex(selected.stroke)
          strokeWidth = selected.strokeWidth || 0
        }

        // プロパティを更新（色をhex形式に変換）
        setSelectedObjectProps({
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          left: selected.left,
          top: selected.top,
          width: selected.width ? selected.width * (selected.scaleX || 1) : 0,
          height: selected.height ? selected.height * (selected.scaleY || 1) : 0,
          scaleX: selected.scaleX,
          scaleY: selected.scaleY,
          opacity: selected.opacity !== undefined ? selected.opacity : 1,
        })
      } else {
        setSelectedObjectId(null)
        setSelectedObjectProps(null)
      }
    }

    const handleDeselection = () => {
      setSelectedObjectId(null)
      setSelectedObjectProps(null)
      setShowAlignmentPanel(false)
    }

    // オブジェクト変更時のイベントハンドラ
    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target
      if (obj && obj.data?.id) {
        // Groupオブジェクトの場合、子要素から色を取得
        let fillColor = ''
        let strokeColor = ''
        let strokeWidth = 0

        if (obj.type === 'group') {
          const items = (obj as fabric.Group).getObjects()
          if (items.length > 0) {
            fillColor = colorToHex(items[0].fill)
            strokeColor = colorToHex(items[0].stroke)
            strokeWidth = items[0].strokeWidth || 2
          }
        } else {
          fillColor = colorToHex(obj.fill)
          strokeColor = colorToHex(obj.stroke)
          strokeWidth = obj.strokeWidth || 0
        }

        setSelectedObjectProps({
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          left: obj.left,
          top: obj.top,
          width: obj.width ? obj.width * (obj.scaleX || 1) : 0,
          height: obj.height ? obj.height * (obj.scaleY || 1) : 0,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          opacity: obj.opacity !== undefined ? obj.opacity : 1,
        })
      }
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    // 空白ドラッグでパン（背景移動）・ホイールでズーム
    let isPanning = false
    let lastPosX = 0
    let lastPosY = 0
    const handlePanMouseDown = (opt: fabric.IEvent) => {
      if (!opt.target) {
        isPanning = true
        const e = opt.e as MouseEvent
        lastPosX = e.clientX
        lastPosY = e.clientY
      }
    }
    const handlePanMouseMove = (opt: fabric.IEvent) => {
      if (isPanning) {
        const e = opt.e as MouseEvent
        const vpt = canvas.viewportTransform!
        vpt[4] += e.clientX - lastPosX
        vpt[5] += e.clientY - lastPosY
        lastPosX = e.clientX
        lastPosY = e.clientY
        canvas.requestRenderAll()
      }
    }
    const handlePanMouseUp = () => {
      isPanning = false
    }
    const handleMouseWheel = (opt: fabric.IEvent) => {
      const e = opt.e as WheelEvent
      e.preventDefault()
      // Trackpad pinch often sets ctrlKey; use that for zoom. Otherwise scroll pans.
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY
        const zoom = Math.max(0.1, Math.min(2, canvas.getZoom() + delta * 0.0015))
        canvas.zoomToPoint({ x: e.clientX, y: e.clientY }, zoom)
        useCanvasStore.getState().setZoom(Math.round(zoom * 100))
      } else {
        const vpt = canvas.viewportTransform!
        if (e.shiftKey) {
          // Shift + scroll = horizontal pan
          vpt[4] += -e.deltaY
        } else {
          // Vertical pan
          vpt[5] += -e.deltaY
        }
        canvas.requestRenderAll()
      }
    }
    canvas.on('mouse:down', handlePanMouseDown)
    canvas.on('mouse:move', handlePanMouseMove)
    canvas.on('mouse:up', handlePanMouseUp)
    canvas.on('mouse:wheel', handleMouseWheel)

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleDeselection)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:scaled', handleObjectModified)
    canvas.on('object:moved', handleObjectModified)

    return () => {
      canvas.off('mouse:down:before', handleAltDragStart)
      canvas.off('mouse:up', handleAltDragEnd)
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)

      canvas.off('mouse:down', handlePanMouseDown)
      canvas.off('mouse:move', handlePanMouseMove)
      canvas.off('mouse:up', handlePanMouseUp)
      canvas.off('mouse:wheel', handleMouseWheel)

      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared', handleDeselection)
      canvas.off('object:modified', handleObjectModified)
      canvas.off('object:scaled', handleObjectModified)
      canvas.off('object:moved', handleObjectModified)
    }
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    setSelectedObjectId,
    setSelectedObjectProps,
    selectedTool,
    layers,
    selectedObjectId,
    addLayer,
  ])

  // localStorage初期読み込み（初回のみ）
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || hasLoadedRef.current) return

    // タイマーを使用して、canvasが完全に初期化されるのを待つ
    const timer = setTimeout(() => {
      hasLoadedRef.current = true

      // 初期読み込み - 現在のページのデータを読み込む
      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        // ページのレイヤーを読み込み
        if (currentPage.layers.length > 0) {
          try {
            currentPage.layers.forEach((layer) => {
              addLayer(layer)
            })
            // カウンターも復元
            currentPage.layers.forEach((layer) => {
              const match = layer.name.match(/(\w+)\s+(\d+)/)
              if (match) {
                const [, tool, count] = match
                const toolKey = tool as keyof typeof shapeCounterRef.current
                if (toolKey in shapeCounterRef.current) {
                  shapeCounterRef.current[toolKey] = Math.max(
                    shapeCounterRef.current[toolKey],
                    parseInt(count, 10)
                  )
                }
              }
            })
          } catch (error) {
            console.error('Failed to load page layers:', error)
          }
        }

        // ページのcanvasDataを読み込み
        if (currentPage.canvasData) {
          try {
            canvas.loadFromJSON(currentPage.canvasData, () => {
              // 読み込み後、すべてのオブジェクトを選択ツールでのみ選択可能にする
              canvas.getObjects().forEach((obj) => {
                obj.selectable = selectedTool === 'select'
                obj.evented = selectedTool === 'select'

                // 読み込み直後に現在のテーマへ色を揃える（リロードで色が戻る対策）
                const baseData = obj.data
                const baseTheme = baseData?.baseTheme
                const baseFill = baseData?.baseFill
                const baseStroke = baseData?.baseStroke
                if (baseTheme && baseTheme !== theme) {
                  if (obj.type === 'group') {
                    const items = (obj as fabric.Group).getObjects()
                    items.forEach((item) => {
                      if (
                        item.fill &&
                        typeof item.fill === 'string' &&
                        item.fill !== 'transparent'
                      ) {
                        const colorToConvert = baseFill || item.fill
                        item.set('fill', convertColorForTheme(colorToConvert, theme))
                      }
                      if (
                        item.stroke &&
                        typeof item.stroke === 'string' &&
                        item.stroke !== 'transparent'
                      ) {
                        const colorToConvert = baseStroke || item.stroke
                        item.set('stroke', convertColorForTheme(colorToConvert, theme))
                      }
                    })
                  } else {
                    if (obj.fill && typeof obj.fill === 'string' && obj.fill !== 'transparent') {
                      const colorToConvert = baseFill || obj.fill
                      obj.set('fill', convertColorForTheme(colorToConvert, theme))
                    }
                    if (
                      obj.stroke &&
                      typeof obj.stroke === 'string' &&
                      obj.stroke !== 'transparent'
                    ) {
                      const colorToConvert = baseStroke || obj.stroke
                      obj.set('stroke', convertColorForTheme(colorToConvert, theme))
                    }
                  }
                  obj.dirty = true
                }
              })
              canvas.renderAll()
            })
          } catch (error) {
            console.error('Failed to load page canvas data:', error)
          }
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [selectedTool, addLayer, pages, currentPageId])

  // localStorage自動保存（デバウンス） - ページごとに保存
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !hasLoadedRef.current) return

    let saveTimeout: NodeJS.Timeout
    const handleCanvasChange = () => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        try {
          const json = JSON.stringify(canvas.toJSON(['data']))
          updatePageData(currentPageId, json, layers)
        } catch (error) {
          console.error('Failed to save canvas to page:', error)
        }
      }, 500)
    }

    canvas.on('object:modified', handleCanvasChange)
    canvas.on('object:added', handleCanvasChange)
    canvas.on('object:removed', handleCanvasChange)

    return () => {
      clearTimeout(saveTimeout)
      canvas.off('object:modified', handleCanvasChange)
      canvas.off('object:added', handleCanvasChange)
      canvas.off('object:removed', handleCanvasChange)
    }
  }, [layers, currentPageId, updatePageData])

  // ページ切り替え処理
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // ページが変更された場合
    if (prevPageIdRef.current !== currentPageId) {
      // 前のページのデータを保存
      try {
        const json = JSON.stringify(canvas.toJSON(['data']))
        updatePageData(prevPageIdRef.current, json, layers)
      } catch (error) {
        console.error('Failed to save previous page:', error)
      }

      // 新しいページのデータを読み込み
      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        // キャンバスをクリア
        canvas.clear()

        // 新しいページのレイヤーを設定
        setLayers(currentPage.layers)

        // 新しいページのcanvasDataを読み込み
        if (currentPage.canvasData) {
          try {
            canvas.loadFromJSON(currentPage.canvasData, () => {
              canvas.renderAll()
            })
          } catch (error) {
            console.error('Failed to load page canvas data:', error)
          }
        }
      }

      // 前のページIDを更新
      prevPageIdRef.current = currentPageId
    }
  }, [currentPageId, pages, layers, updatePageData, setLayers])

  // 画像ペースト機能
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile()
          if (!blob) continue

          const reader = new FileReader()
          reader.onload = (event) => {
            const imgUrl = event.target?.result as string
            fabric.Image.fromURL(imgUrl, (img) => {
              const id = crypto.randomUUID()

              // 画像を中央に配置し、最大サイズを制限
              const maxWidth = canvas.width! * 0.5
              const maxHeight = canvas.height! * 0.5
              const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1)

              img.set({
                left: (canvas.width! - img.width! * scale) / 2,
                top: (canvas.height! - img.height! * scale) / 2,
                scaleX: scale,
                scaleY: scale,
                data: { id },
                selectable: true,
                evented: true,
              })

              canvas.add(img)
              canvas.setActiveObject(img)
              canvas.renderAll()

              shapeCounterRef.current.pencil += 1
              const counter = shapeCounterRef.current.pencil

              addLayer({
                id,
                name: `image ${counter}`,
                visible: true,
                locked: false,
                objectId: id,
                type: 'VECTOR',
              })

              setSelectedObjectId(id)
            })
          }
          reader.readAsDataURL(blob)
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [addLayer, setSelectedObjectId])

  // テーマ切り替え時に既存オブジェクトの色を自動変換
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const objects = canvas.getObjects()

    objects.forEach((obj) => {
      const baseData = obj.data
      const baseTheme = baseData?.baseTheme
      const baseFill = baseData?.baseFill
      const baseStroke = baseData?.baseStroke

      // baseThemeが現在のテーマと同じなら変換不要
      if (baseTheme === theme) {
        return
      }

      // Groupオブジェクト（矢印など）の場合
      if (obj.type === 'group') {
        const items = (obj as fabric.Group).getObjects()
        items.forEach((item) => {
          // baseFillから変換、なければ現在の色から変換
          if (item.fill && typeof item.fill === 'string' && item.fill !== 'transparent') {
            const colorToConvert = baseFill || item.fill
            item.set('fill', convertColorForTheme(colorToConvert, theme))
          }
          // baseStrokeから変換、なければ現在の色から変換
          if (item.stroke && typeof item.stroke === 'string' && item.stroke !== 'transparent') {
            const colorToConvert = baseStroke || item.stroke
            item.set('stroke', convertColorForTheme(colorToConvert, theme))
          }
        })
      } else {
        // 通常のオブジェクト
        // baseFillから変換、なければ現在の色から変換
        if (obj.fill && typeof obj.fill === 'string' && obj.fill !== 'transparent') {
          const colorToConvert = baseFill || obj.fill
          obj.set('fill', convertColorForTheme(colorToConvert, theme))
        }
        // baseStrokeから変換、なければ現在の色から変換
        if (obj.stroke && typeof obj.stroke === 'string' && obj.stroke !== 'transparent') {
          const colorToConvert = baseStroke || obj.stroke
          obj.set('stroke', convertColorForTheme(colorToConvert, theme))
        }
      }

      obj.dirty = true
    })

    canvas.renderAll()
  }, [theme])

  // タッチジェスチャーサポート（モバイル対応）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const canvasElement = canvasRef.current
    if (!canvas || !canvasElement) return

    let touchStartTime = 0
    let longPressTimer: NodeJS.Timeout | null = null
    let lastTapTime = 0
    let pinchStart = 0
    let lastZoom = 100

    // ピンチズーム用の距離計算
    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime = Date.now()

      // 2本指タッチ（ピンチズーム）
      if (e.touches.length === 2) {
        e.preventDefault()
        pinchStart = getDistance(e.touches)
        lastZoom = useCanvasStore.getState().zoom
        if (longPressTimer) clearTimeout(longPressTimer)
        return
      }

      // 1本指タッチ
      if (e.touches.length === 1) {
        const now = Date.now()
        const touch = e.touches[0]

        // ダブルタップ検出（300ms以内）
        if (now - lastTapTime < 300) {
          e.preventDefault()
          // ダブルタップでズーム
          const currentZoom = useCanvasStore.getState().zoom
          if (currentZoom >= 100) {
            useCanvasStore.getState().setZoom(50)
          } else {
            useCanvasStore.getState().setZoom(100)
          }
          lastTapTime = 0
        } else {
          lastTapTime = now

          // ロングプレス検出（500ms）
          longPressTimer = setTimeout(() => {
            // ロングプレスでコンテキストメニュー
            setContextMenu({ x: touch.clientX, y: touch.clientY })
          }, 500)
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // ピンチズーム中
      if (e.touches.length === 2) {
        e.preventDefault()
        const currentDistance = getDistance(e.touches)
        const scale = currentDistance / pinchStart
        const newZoom = Math.max(10, Math.min(200, lastZoom * scale))
        useCanvasStore.getState().setZoom(newZoom)
        return
      }

      // ロングプレスタイマーをキャンセル（移動したら）
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }

      // タッチが終了したらピンチズームをリセット
      if (e.touches.length < 2) {
        pinchStart = 0
      }
    }

    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvasElement.addEventListener('touchend', handleTouchEnd)

    return () => {
      canvasElement.removeEventListener('touchstart', handleTouchStart)
      canvasElement.removeEventListener('touchmove', handleTouchMove)
      canvasElement.removeEventListener('touchend', handleTouchEnd)
      if (longPressTimer) clearTimeout(longPressTimer)
    }
  }, [setContextMenu])

  // 右クリックメニュー
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // デフォルトの右クリックメニューを無効化
      e.preventDefault()

      // コンテキストメニューの位置を設定
      setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('contextmenu', handleContextMenu)
      return () => {
        canvas.removeEventListener('contextmenu', handleContextMenu)
      }
    }
  }, [])

  return (
    <div className="flex-1 min-w-0 relative">
      <canvas ref={canvasRef} />
      {showAlignmentPanel && (
        <AlignmentPanel
          onAlignLeft={alignLeft}
          onAlignCenter={alignCenter}
          onAlignRight={alignRight}
          onAlignTop={alignTop}
          onAlignMiddle={alignMiddle}
          onAlignBottom={alignBottom}
          onDistributeHorizontal={distributeHorizontal}
          onDistributeVertical={distributeVertical}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={copySelectedObject}
          onPaste={pasteObject}
          onDuplicate={duplicateSelectedObject}
          onDelete={deleteSelectedObject}
          onLock={lockObject}
          onUnlock={unlockObject}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onGroup={groupObjects}
          onUngroup={ungroupObjects}
          hasSelection={!!selectedObjectId}
          isLocked={
            selectedObjectId ? layers.find((l) => l.id === selectedObjectId)?.locked : false
          }
          hasClipboard={!!clipboard}
          canGroup={(() => {
            const canvas = fabricCanvasRef.current
            if (!canvas) return false
            const activeObject = canvas.getActiveObject()
            return (
              activeObject?.type === 'activeSelection' &&
              (activeObject as fabric.ActiveSelection).getObjects().length >= 2
            )
          })()}
          canUngroup={(() => {
            const canvas = fabricCanvasRef.current
            if (!canvas) return false
            const activeObject = canvas.getActiveObject()
            return activeObject?.type === 'group'
          })()}
        />
      )}
    </div>
  )
}

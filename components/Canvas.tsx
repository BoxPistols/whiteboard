'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts'
import { convertColorForTheme } from '@/lib/colorUtils'
import ContextMenu from '@/components/ContextMenu'
import AlignmentPanel from '@/components/AlignmentPanel'
import type { NodeType, Layer } from '@/types'

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
    resetView,
    zoomToFit,
    zoomToSelection,
    theme,
    canvasBackground,
    shortcuts,
    setShowShortcutsModal,
    moveSelectedObject,
    undo,
    redo,
    saveHistory,
    clearHistory,
    gridEnabled,
    gridSize,
    gridColor,
    gridOpacity,
    gridSnapEnabled,
    zoom,
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
        } else {
          // IDがない場合は直接削除（古いペンシルストローク等）
          canvas.remove(obj)
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
      } else {
        // IDがない場合は直接削除（古いペンシルストローク等）
        canvas.remove(activeSelection)
      }
    }

    canvas.renderAll()
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

  // Fabric.jsからレイヤー順序を同期
  const syncLayersFromCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const objects = canvas.getObjects()
    const updatedLayers = objects
      .map((obj) => {
        const objectId = obj.data?.id
        return layers.find((l) => l.objectId === objectId)
      })
      .filter(Boolean)
      .reverse()
    if (updatedLayers.length > 0) {
      setLayers(updatedLayers as Layer[])
    }
  }, [setLayers, layers])

  // 1レベル前面へ移動
  const bringForward = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.bringForward(activeObject)
      canvas.renderAll()
      syncLayersFromCanvas()
    }
  }, [syncLayersFromCanvas])

  // 1レベル背面へ移動
  const sendBackward = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.sendBackwards(activeObject)
      canvas.renderAll()
      syncLayersFromCanvas()
    }
  }, [syncLayersFromCanvas])

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

  // ショートカット一覧表示
  const showShortcuts = useCallback(() => {
    setShowShortcutsModal(true)
  }, [setShowShortcutsModal])

  // キーボードショートカットの設定
  useKeyboardShortcuts({
    shortcuts,
    setSelectedTool,
    deleteSelectedObject,
    duplicateSelectedObject,
    copySelectedObject,
    pasteObject,
    groupObjects,
    ungroupObjects,
    resetZoom,
    resetView,
    zoomToFit,
    zoomToSelection,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    showShortcuts,
    moveSelectedObject,
    undo,
    redo,
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

      // タッチイベントとマウスイベントの両方に対応
      const originalEvent = e.e as MouseEvent | TouchEvent
      let clientX: number, clientY: number

      if ('touches' in originalEvent && originalEvent.touches.length > 0) {
        clientX = originalEvent.touches[0].clientX
        clientY = originalEvent.touches[0].clientY
      } else if ('clientX' in originalEvent) {
        clientX = originalEvent.clientX
        clientY = originalEvent.clientY
      } else {
        return
      }

      // キャンバス要素の位置を取得して正確な座標を計算
      const canvasElement = canvas.getElement()
      const rect = canvasElement.getBoundingClientRect()
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
      const zoom = canvas.getZoom()

      // クライアント座標をキャンバス座標に変換
      const pointer = {
        x: (clientX - rect.left - vpt[4]) / zoom,
        y: (clientY - rect.top - vpt[5]) / zoom,
      }

      // テキストツールの場合はクリック位置にテキストを追加
      if (selectedTool === 'text') {
        // モバイルでのタッチ+マウスエミュレーションによる重複防止のため
        // テキスト作成直後にselectツールに切り替え
        setSelectedTool('select')

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
        case 'arrow': {
          // ライン＋矢印頭を作成（Figmaスタイル: ------> ）
          const arrowLine = new fabric.Line([0, 0, 0, 0], {
            stroke: defaultStrokeColor,
            strokeWidth: 1,
            selectable: false,
            evented: false,
          })

          // 矢印の頭（三角形）- Triangleを使用
          const arrowHead = new fabric.Triangle({
            width: 12,
            height: 10,
            fill: defaultStrokeColor,
            left: 0,
            top: 0,
            angle: 90, // 右向き
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          })

          shape = new fabric.Group([arrowLine, arrowHead], {
            left: pointer.x,
            top: pointer.y,
            originX: 'center',
            originY: 'center',
          })
          currentShapeRef.current = shape
          canvas.add(shape)

          break
        }
      }

      if (shape && selectedTool !== 'arrow') {
        canvas.add(shape)
        currentShapeRef.current = shape
      } else if (!shape && selectedTool !== 'arrow') {
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

      // タッチイベントとマウスイベントの両方に対応
      const originalEvent = e.e as MouseEvent | TouchEvent
      let clientX: number, clientY: number

      if ('touches' in originalEvent && originalEvent.touches.length > 0) {
        clientX = originalEvent.touches[0].clientX
        clientY = originalEvent.touches[0].clientY
      } else if ('clientX' in originalEvent) {
        clientX = originalEvent.clientX
        clientY = originalEvent.clientY
      } else {
        return
      }

      // キャンバス要素の位置を取得して正確な座標を計算
      const canvasElement = canvas.getElement()
      const rect = canvasElement.getBoundingClientRect()
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
      const zoom = canvas.getZoom()

      const pointer = {
        x: (clientX - rect.left - vpt[4]) / zoom,
        y: (clientY - rect.top - vpt[5]) / zoom,
      }

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
            const arrowLine = items[0] as fabric.Line
            const arrowHead = items[1] as fabric.Triangle

            // 始点から終点までの距離と角度を計算
            const dx = pointer.x - startPoint.x
            const dy = pointer.y - startPoint.y
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI

            // グループの中心を始点と終点の中間点に移動
            const midX = (startPoint.x + pointer.x) / 2
            const midY = (startPoint.y + pointer.y) / 2

            // ラインの終点を更新（グループ内のローカル座標系）
            const halfLength = length / 2
            arrowLine.set({
              x1: -halfLength,
              y1: 0,
              x2: halfLength,
              y2: 0,
            })

            // 矢印の頭の位置を更新（ラインの終点に配置）
            arrowHead.set({
              left: halfLength,
              top: 0,
              angle: 90, // 右向きを維持
            })

            // グループ全体の位置と角度を更新
            currentShape.set({
              left: midX,
              top: midY,
              angle: angle,
              originX: 'center',
              originY: 'center',
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

      // グループの場合、子要素も設定し、座標を更新
      if (currentShape.type === 'group') {
        const items = (currentShape as fabric.Group).getObjects()
        items.forEach((item) => {
          item.set({
            selectable: false,
            evented: false,
          })
        })
        // バウンディングボックスを再計算して選択可能にする
        currentShape.setCoords()
      }

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

        // 複数選択時：最初のオブジェクトのプロパティを表示（一括変更のベースとして）
        const objects = (activeObject as fabric.ActiveSelection).getObjects()
        const firstObj = objects[0]
        if (firstObj) {
          let fillColor = ''
          let strokeColor = ''
          let strokeWidth = 0

          if (firstObj.type === 'group') {
            const items = (firstObj as fabric.Group).getObjects()
            if (items.length > 0) {
              fillColor = colorToHex(items[0].fill)
              strokeColor = colorToHex(items[0].stroke)
              strokeWidth = items[0].strokeWidth || 2
            }
          } else {
            fillColor = colorToHex(firstObj.fill)
            strokeColor = colorToHex(firstObj.stroke)
            strokeWidth = firstObj.strokeWidth || 0
          }

          // 複数選択用のIDを設定（プロパティパネルで変更を可能にするため）
          setSelectedObjectId('__multi_selection__')
          setSelectedObjectProps({
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            opacity: firstObj.opacity !== undefined ? firstObj.opacity : 1,
          })
        }
        return
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
      // Only allow panning when select tool is active
      if (selectedTool !== 'select') return
      const e = opt.e as MouseEvent
      // Cmd/Ctrl + Click はオブジェクト選択に専念するためパンを無効化
      if (e.metaKey || e.ctrlKey) return
      if (!opt.target) {
        isPanning = true
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
          // Shift + scroll = horizontal pan (for mouse wheel users)
          vpt[4] += -e.deltaY
        } else {
          // Natural pan: use both deltaX and deltaY for trackpad support
          // This allows diagonal panning and horizontal scrolling on trackpad
          vpt[4] += -e.deltaX // Horizontal pan
          vpt[5] += -e.deltaY // Vertical pan
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

    // ペンシルツールで描いたパスにIDを付与
    const handlePathCreated = (e: fabric.IEvent & { path?: fabric.Path }) => {
      if (e.path) {
        const id = crypto.randomUUID()
        e.path.set({
          data: {
            id,
            baseStroke: e.path.stroke,
            baseTheme: useCanvasStore.getState().theme,
          },
          selectable: true,
          evented: true,
        })

        shapeCounterRef.current.pencil += 1
        const counter = shapeCounterRef.current.pencil

        addLayer({
          id: crypto.randomUUID(),
          name: `pencil ${counter}`,
          visible: true,
          locked: false,
          objectId: id,
          type: 'VECTOR',
        })

        canvas.renderAll()
      }
    }
    canvas.on('path:created', handlePathCreated)

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
      canvas.off('path:created', handlePathCreated)
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

  // グリッドスナップ機能
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handleObjectMoving = (e: fabric.IEvent) => {
      if (!gridSnapEnabled) return

      const obj = e.target
      if (!obj) return

      // オブジェクトの位置をグリッドにスナップ
      const left = obj.left || 0
      const top = obj.top || 0

      obj.set({
        left: Math.round(left / gridSize) * gridSize,
        top: Math.round(top / gridSize) * gridSize,
      })
    }

    canvas.on('object:moving', handleObjectMoving)

    return () => {
      canvas.off('object:moving', handleObjectMoving)
    }
  }, [gridSnapEnabled, gridSize])

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
            setLayers(currentPage.layers)
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
                // 初回読み込み時点でのselectedToolを使用
                obj.selectable = selectedTool === 'select'
                obj.evented = selectedTool === 'select'

                // グループの場合、子要素も設定
                if (obj.type === 'group') {
                  const items = (obj as fabric.Group).getObjects()
                  items.forEach((item) => {
                    item.selectable = false
                    item.evented = false
                  })
                }

                // objectIdが設定されていない場合はスキップ
                if (!obj.data?.id) {
                  console.warn('Object without ID found after loadFromJSON, skipping')
                  return
                }

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
              // 初期状態を履歴に保存（少し遅延させてobject:addedイベント後に実行）
              setTimeout(() => {
                saveHistory()
              }, 50)
            })
          } catch (error) {
            console.error('Failed to load page canvas data:', error)
          }
        } else {
          // 空のキャンバスの場合も初期状態を保存
          setTimeout(() => {
            saveHistory()
          }, 50)
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [pages, currentPageId, theme, setLayers, selectedTool, saveHistory])

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

  // Undo/Redo履歴の保存（デバウンス付き）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    let historyTimeout: NodeJS.Timeout
    const handleHistorySave = () => {
      clearTimeout(historyTimeout)
      historyTimeout = setTimeout(() => {
        saveHistory()
      }, 300)
    }

    canvas.on('object:modified', handleHistorySave)
    canvas.on('object:added', handleHistorySave)
    canvas.on('object:removed', handleHistorySave)

    return () => {
      clearTimeout(historyTimeout)
      canvas.off('object:modified', handleHistorySave)
      canvas.off('object:added', handleHistorySave)
      canvas.off('object:removed', handleHistorySave)
    }
  }, [saveHistory])

  // ページ切り替え処理
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // ページが変更された場合
    if (prevPageIdRef.current !== currentPageId) {
      // 前のページのデータを保存
      try {
        const json = JSON.stringify(canvas.toJSON(['data']))
        const currentState = useCanvasStore.getState()
        updatePageData(prevPageIdRef.current, json, currentState.layers)
      } catch (error) {
        console.error('Failed to save previous page:', error)
      }

      // 新しいページのデータを読み込み
      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        // ページ切り替え時に履歴をクリア（ページごとの履歴管理）
        clearHistory()

        // キャンバスをクリア
        canvas.clear()

        // 新しいページのレイヤーを設定
        setLayers(currentPage.layers)

        // 新しいページのcanvasDataを読み込み
        if (currentPage.canvasData) {
          try {
            canvas.loadFromJSON(currentPage.canvasData, () => {
              canvas.renderAll()
              // 新しいページの初期状態を履歴に保存
              setTimeout(() => {
                saveHistory()
              }, 50)
            })
          } catch (error) {
            console.error('Failed to load page canvas data:', error)
          }
        } else {
          // 空のページの場合も初期状態を保存
          setTimeout(() => {
            saveHistory()
          }, 50)
        }
      }

      // 前のページIDを更新
      prevPageIdRef.current = currentPageId
    }
  }, [currentPageId, pages, updatePageData, setLayers, saveHistory, clearHistory])

  // 画像ペースト機能（内部クリップボードからのペーストも統合）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handlePaste = (e: ClipboardEvent) => {
      // テキスト入力中は無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const items = e.clipboardData?.items
      if (!items) {
        // クリップボードデータがない場合、内部クリップボードからペースト
        pasteFromInternalClipboard()
        return
      }

      // 画像があるかチェック
      let hasImage = false
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          hasImage = true
          const blob = item.getAsFile()
          if (!blob) continue

          e.preventDefault()
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

      // 画像がなく、内部クリップボードにオブジェクトがある場合
      if (!hasImage) {
        e.preventDefault()
        pasteFromInternalClipboard()
      }
    }

    // 内部クリップボードからペーストするヘルパー関数
    const pasteFromInternalClipboard = () => {
      const currentClipboard = useCanvasStore.getState().clipboard
      if (!currentClipboard) return

      currentClipboard.clone((cloned: fabric.Object) => {
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
        useCanvasStore.getState().setClipboard(cloned)
      })
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
  // 注意: Fabric.js が標準でタッチ→マウス変換を行うため、
  // ここではピンチズームとロングプレスのみカスタム処理
  // 描画ツール使用時はFabric.jsに完全に委ねる
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const canvasElement = canvasRef.current
    if (!canvas || !canvasElement) return

    // Fabric.js の upper-canvas を取得（タッチイベントはここで発生）
    const upperCanvas = (canvas as unknown as { upperCanvasEl: HTMLCanvasElement }).upperCanvasEl
    if (!upperCanvas) return

    let longPressTimer: NodeJS.Timeout | null = null
    let lastTapTime = 0
    let pinchStart = 0
    let lastZoom = 100
    let isPinching = false
    let touchStartPos = { x: 0, y: 0 }

    // ピンチズーム用の距離計算
    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const handleTouchStart = (e: TouchEvent) => {
      const currentTool = useCanvasStore.getState().selectedTool

      // 描画ツール（select, pencil以外）が選択されている場合は
      // Fabric.jsに完全に処理を委ねる（カスタム処理をスキップ）
      const isDrawingTool = currentTool !== 'select' && currentTool !== 'pencil'

      // 2本指タッチ（ピンチズーム）- 描画ツール使用時も有効
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        isPinching = true
        pinchStart = getDistance(e.touches)
        lastZoom = useCanvasStore.getState().zoom
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
        return
      }

      // 描画ツール使用中は1本指タッチでFabric.jsに処理を任せる
      if (isDrawingTool) {
        return
      }

      // 1本指タッチ - select/pencil ツール時のみ追加機能を提供
      if (e.touches.length === 1) {
        const now = Date.now()
        const touch = e.touches[0]
        touchStartPos = { x: touch.clientX, y: touch.clientY }

        // ダブルタップ検出（300ms以内）- ズームトグル
        if (now - lastTapTime < 300) {
          // ダブルタップでズーム切り替え
          const currentZoom = useCanvasStore.getState().zoom
          if (currentZoom >= 100) {
            useCanvasStore.getState().setZoom(50)
          } else {
            useCanvasStore.getState().setZoom(100)
          }
          lastTapTime = 0
          // Fabric.js の処理は継続させる（preventDefault しない）
        } else {
          lastTapTime = now

          // ロングプレス検出（500ms）- コンテキストメニュー（selectツール時のみ）
          if (currentTool === 'select') {
            longPressTimer = setTimeout(() => {
              setContextMenu({ x: touch.clientX, y: touch.clientY })
            }, 500)
          }
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // ピンチズーム中
      if (e.touches.length === 2 && isPinching && pinchStart > 0) {
        e.preventDefault()
        e.stopPropagation()
        const currentDistance = getDistance(e.touches)
        const scale = currentDistance / pinchStart
        const newZoom = Math.max(10, Math.min(200, lastZoom * scale))
        useCanvasStore.getState().setZoom(newZoom)
        return
      }

      // 移動したらロングプレスタイマーをキャンセル
      if (longPressTimer && e.touches.length === 1) {
        const touch = e.touches[0]
        const dx = touch.clientX - touchStartPos.x
        const dy = touch.clientY - touchStartPos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        // 10px以上移動したらキャンセル
        if (distance > 10) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }

      // ピンチズーム終了
      if (e.touches.length < 2) {
        isPinching = false
        pinchStart = 0
      }
    }

    // upper-canvas にイベントリスナーを追加
    upperCanvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    upperCanvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    upperCanvas.addEventListener('touchend', handleTouchEnd)

    return () => {
      upperCanvas.removeEventListener('touchstart', handleTouchStart)
      upperCanvas.removeEventListener('touchmove', handleTouchMove)
      upperCanvas.removeEventListener('touchend', handleTouchEnd)
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
      {/* グリッドオーバーレイ */}
      {gridEnabled &&
        (() => {
          // ズームレベルに応じてグリッドサイズを調整
          const scaledGridSize = gridSize * (zoom / 100)
          return (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <defs>
                <pattern
                  id="grid-pattern"
                  width={scaledGridSize}
                  height={scaledGridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`}
                    fill="none"
                    stroke={gridColor}
                    strokeWidth="0.5"
                    strokeOpacity={gridOpacity / 100}
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>
          )
        })()}
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

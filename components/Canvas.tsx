'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts'
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

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const { selectedTool, setSelectedTool, setSelectedObjectId, addLayer, removeLayer, layers, selectedObjectId } = useCanvasStore()
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentShape, setCurrentShape] = useState<fabric.Object | null>(null)
  const shapeCounterRef = useRef({ rectangle: 0, circle: 0, line: 0, text: 0, pencil: 0 })

  // 選択されたオブジェクトを削除
  const deleteSelectedObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedObjectId) return

    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.data?.id) {
      canvas.remove(activeObject)
      removeLayer(activeObject.data.id)
      setSelectedObjectId(null)
      canvas.renderAll()
    }
  }, [selectedObjectId, removeLayer, setSelectedObjectId])

  // 選択されたオブジェクトを複製
  const duplicateSelectedObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedObjectId) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        const id = crypto.randomUUID()
        cloned.set({
          left: (cloned.left || 0) + 10,
          top: (cloned.top || 0) + 10,
          data: { id },
        })
        canvas.add(cloned)
        canvas.setActiveObject(cloned)
        canvas.renderAll()

        // レイヤーを追加
        const originalLayer = layers.find(l => l.id === selectedObjectId)
        if (originalLayer) {
          addLayer({
            id,
            name: `${originalLayer.name} copy`,
            visible: true,
            locked: false,
            objectId: id,
            type: originalLayer.type,
          })
        }
        setSelectedObjectId(id)
      })
    }
  }, [selectedObjectId, layers, addLayer, setSelectedObjectId])

  // キーボードショートカットの設定
  useKeyboardShortcuts({
    setSelectedTool,
    deleteSelectedObject,
    duplicateSelectedObject,
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const container = canvasRef.current.parentElement
    if (!container) return

    // ダークモードの検出
    const isDark = document.documentElement.classList.contains('dark')
    const bgColor = isDark ? '#1f2937' : '#f5f5f5'

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: bgColor,
    })

    fabricCanvasRef.current = canvas

    // ダークモード変更の監視
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      canvas.backgroundColor = isDark ? '#1f2937' : '#f5f5f5'
      canvas.renderAll()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

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
      observer.disconnect()
      resizeObserver.disconnect()
      canvas.dispose()
    }
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
    canvas.renderAll()

    if (selectedTool === 'pencil') {
      canvas.freeDrawingBrush.color = '#000000'
      canvas.freeDrawingBrush.width = 2
    }
  }, [selectedTool])

  const handleMouseDown = useCallback((e: fabric.IEvent<Event>) => {
    if (selectedTool === 'select' || selectedTool === 'pencil') return

    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const pointer = canvas.getPointer(e.e as MouseEvent)

    // テキストツールの場合はクリック位置にテキストを追加
    if (selectedTool === 'text') {
      const id = crypto.randomUUID()
      const text = new fabric.IText('テキストを入力', {
        left: pointer.x,
        top: pointer.y,
        fontSize: 20,
        fill: '#000000',
        fontFamily: 'Arial',
        data: { id },
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

    setIsDrawing(true)
    setStartPoint({ x: pointer.x, y: pointer.y })

    let shape: fabric.Object | null = null

    switch (selectedTool) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'rgba(59, 130, 246, 0.5)',
          stroke: '#3b82f6',
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
          fill: 'rgba(59, 130, 246, 0.5)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        })
        break
      case 'line':
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#3b82f6',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        })
        break
    }

    if (shape) {
      canvas.add(shape)
      setCurrentShape(shape)
    }
  }, [selectedTool, addLayer, setSelectedObjectId])

  const handleMouseMove = useCallback((e: fabric.IEvent<Event>) => {
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
    }

    canvas.renderAll()
  }, [isDrawing, startPoint, currentShape, selectedTool])

  const handleMouseUp = useCallback(() => {
    if (currentShape && selectedTool !== 'select' && selectedTool !== 'pencil') {
      const id = crypto.randomUUID()

      // 描画完了後にオブジェクトを選択可能にする
      currentShape.set({
        data: { id },
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
    }

    setIsDrawing(false)
    setStartPoint(null)
    setCurrentShape(null)
  }, [currentShape, selectedTool, addLayer])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // オブジェクト選択時のイベントハンドラ
    const handleSelection = (e: fabric.IEvent) => {
      const selected = e.selected?.[0]
      if (selected && selected.data?.id) {
        setSelectedObjectId(selected.data.id)
      } else {
        setSelectedObjectId(null)
      }
    }

    const handleDeselection = () => {
      setSelectedObjectId(null)
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)
    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleDeselection)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared', handleDeselection)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, setSelectedObjectId])

  // localStorage保存・読み込み
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // 初期読み込み
    const savedCanvas = localStorage.getItem('figma-clone-canvas')
    const savedLayers = localStorage.getItem('figma-clone-layers')

    if (savedCanvas) {
      try {
        canvas.loadFromJSON(JSON.parse(savedCanvas), () => {
          canvas.renderAll()
          // 読み込み後、すべてのオブジェクトを選択ツールでのみ選択可能にする
          canvas.getObjects().forEach((obj) => {
            obj.selectable = selectedTool === 'select'
            obj.evented = selectedTool === 'select'
          })
        })
      } catch (error) {
        console.error('Failed to load canvas from localStorage:', error)
      }
    }

    if (savedLayers) {
      try {
        const parsedLayers = JSON.parse(savedLayers)
        parsedLayers.forEach((layer: typeof layers[0]) => {
          if (!layers.find(l => l.id === layer.id)) {
            addLayer(layer)
          }
        })
        // カウンターも復元
        parsedLayers.forEach((layer: typeof layers[0]) => {
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
        console.error('Failed to load layers from localStorage:', error)
      }
    }

    // 自動保存（デバウンス）
    let saveTimeout: NodeJS.Timeout
    const handleCanvasChange = () => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        try {
          const json = JSON.stringify(canvas.toJSON(['data']))
          localStorage.setItem('figma-clone-canvas', json)
          localStorage.setItem('figma-clone-layers', JSON.stringify(layers))
        } catch (error) {
          console.error('Failed to save canvas to localStorage:', error)
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
  }, [selectedTool, layers, addLayer])

  return (
    <div className="flex-1 relative">
      <canvas ref={canvasRef} />
    </div>
  )
}

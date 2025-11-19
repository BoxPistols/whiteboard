'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
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
  const { selectedTool, setSelectedObjectId, addLayer } = useCanvasStore()
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentShape, setCurrentShape] = useState<fabric.Object | null>(null)
  const shapeCounterRef = useRef({ rectangle: 0, circle: 0, line: 0, text: 0, pencil: 0 })

  useEffect(() => {
    if (!canvasRef.current) return
    const container = canvasRef.current.parentElement
    if (!container) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#f5f5f5',
    })

    fabricCanvasRef.current = canvas

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
    }
  }, [])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.selection = selectedTool === 'select'
    canvas.isDrawingMode = selectedTool === 'pencil'

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
        })
        break
      case 'line':
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#3b82f6',
          strokeWidth: 2,
        })
        break
    }

    if (shape) {
      canvas.add(shape)
      setCurrentShape(shape)
    }
  }, [selectedTool])

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
      // Store custom data using the data property
      currentShape.set({ data: { id } })

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

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

  return (
    <div className="flex-1 relative">
      <canvas ref={canvasRef} />
    </div>
  )
}

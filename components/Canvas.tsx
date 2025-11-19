'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const { selectedTool, setSelectedObjectId, addLayer } = useCanvasStore()
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentShape, setCurrentShape] = useState<fabric.Object | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f5f5f5',
    })

    fabricCanvasRef.current = canvas

    const handleResize = () => {
      canvas.setWidth(window.innerWidth)
      canvas.setHeight(window.innerHeight)
      canvas.renderAll()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
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

  const handleMouseDown = (e: fabric.IEvent<Event>) => {
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
  }

  const handleMouseMove = (e: fabric.IEvent<Event>) => {
    if (!isDrawing || !startPoint || !currentShape) return

    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const pointer = canvas.getPointer(e.e as MouseEvent)

    switch (selectedTool) {
      case 'rectangle':
        const rect = currentShape as fabric.Rect
        const width = pointer.x - startPoint.x
        const height = pointer.y - startPoint.y
        rect.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width > 0 ? startPoint.x : pointer.x,
          top: height > 0 ? startPoint.y : pointer.y,
        })
        break
      case 'circle':
        const circle = currentShape as fabric.Circle
        const radius = Math.sqrt(
          Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2)
        )
        circle.set({ radius: radius / 2 })
        break
      case 'line':
        const line = currentShape as fabric.Line
        line.set({ x2: pointer.x, y2: pointer.y })
        break
    }

    canvas.renderAll()
  }

  const handleMouseUp = () => {
    if (currentShape) {
      const id = `shape-${Date.now()}`
      // Store custom data using the data property
      currentShape.set({ data: { id } } as any)

      addLayer({
        id,
        name: `${selectedTool} ${Date.now()}`,
        visible: true,
        locked: false,
        objectId: id,
      })
    }

    setIsDrawing(false)
    setStartPoint(null)
    setCurrentShape(null)
  }

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
  }, [selectedTool, isDrawing, startPoint, currentShape])

  return (
    <div className="flex-1 relative">
      <canvas ref={canvasRef} />
    </div>
  )
}

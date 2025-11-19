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
  } = useCanvasStore()
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentShape, setCurrentShape] = useState<fabric.Object | null>(null)
  const shapeCounterRef = useRef({ rectangle: 0, circle: 0, line: 0, arrow: 0, text: 0, pencil: 0 })

  // 選択されたオブジェクトを削除（複数選択対応）
  const deleteSelectedObject = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeSelection = canvas.getActiveObject()
    if (!activeSelection) return

    // 複数選択の場合
    if (activeSelection.type === 'activeSelection') {
      const objects = (activeSelection as fabric.ActiveSelection).getObjects()
      objects.forEach((obj) => {
        if (obj.data?.id) {
          canvas.remove(obj)
          removeLayer(obj.data.id)
        }
      })
      canvas.discardActiveObject()
    } else {
      // 単一選択の場合
      if (activeSelection.data?.id) {
        canvas.remove(activeSelection)
        removeLayer(activeSelection.data.id)
      }
    }

    setSelectedObjectId(null)
    canvas.renderAll()
  }, [removeLayer, setSelectedObjectId])

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
        const originalLayer = layers.find((l) => l.id === selectedObjectId)
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

  // グループ化機能
  const groupSelectedObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeSelection = canvas.getActiveObject()
    if (!activeSelection || activeSelection.type !== 'activeSelection') return

    const objects = (activeSelection as fabric.ActiveSelection).getObjects()
    if (objects.length < 2) return

    const id = crypto.randomUUID()

    // グループを作成
    const group = new fabric.Group(objects, {
      data: { id },
    })

    // 元のオブジェクトを削除
    objects.forEach(obj => {
      if (obj.data?.id) {
        removeLayer(obj.data.id)
      }
      canvas.remove(obj)
    })

    // グループを追加
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.renderAll()

    // グループレイヤーを追加
    shapeCounterRef.current.rectangle += 1
    const counter = shapeCounterRef.current.rectangle
    addLayer({
      id,
      name: `group ${counter}`,
      visible: true,
      locked: false,
      objectId: id,
      type: 'VECTOR',
    })

    setSelectedObjectId(id)
  }, [addLayer, removeLayer, setSelectedObjectId])

  // グループ解除機能
  const ungroupSelectedObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'group') return

    const group = activeObject as fabric.Group
    const items = group._objects
    const groupId = group.data?.id

    // グループを削除
    if (groupId) {
      removeLayer(groupId)
    }
    group._restoreObjectsState()
    canvas.remove(group)

    // 個別のオブジェクトを復元
    const newSelection: fabric.Object[] = []
    items.forEach((obj: fabric.Object) => {
      const id = crypto.randomUUID()
      obj.set('data', { id })
      canvas.add(obj)
      newSelection.push(obj)

      // オブジェクトのタイプを判定してレイヤーを追加
      let type: NodeType = 'VECTOR'
      let toolName = 'object'
      if (obj instanceof fabric.Rect) {
        type = 'RECTANGLE'
        toolName = 'rectangle'
      } else if (obj instanceof fabric.Circle) {
        type = 'ELLIPSE'
        toolName = 'circle'
      } else if (obj instanceof fabric.Line) {
        type = 'LINE'
        toolName = 'line'
      } else if (obj instanceof fabric.IText) {
        type = 'TEXT'
        toolName = 'text'
      }

      shapeCounterRef.current.rectangle += 1
      const counter = shapeCounterRef.current.rectangle
      addLayer({
        id,
        name: `${toolName} ${counter}`,
        visible: true,
        locked: false,
        objectId: id,
        type,
      })
    })

    // 解除後のオブジェクトを選択
    if (newSelection.length > 0) {
      const selection = new fabric.ActiveSelection(newSelection, {
        canvas: canvas
      })
      canvas.setActiveObject(selection)
    }

    canvas.renderAll()
  }, [addLayer, removeLayer])

  // キーボードショートカットの設定
  useKeyboardShortcuts({
    setSelectedTool,
    deleteSelectedObject,
    duplicateSelectedObject,
    groupSelectedObjects,
    ungroupSelectedObjects,
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
    setFabricCanvas(canvas)

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
    canvas.renderAll()

    if (selectedTool === 'pencil') {
      const isDark = document.documentElement.classList.contains('dark')
      canvas.freeDrawingBrush.color = isDark ? '#ffffff' : '#000000'
      canvas.freeDrawingBrush.width = 2
    }
  }, [selectedTool])

  const handleMouseDown = useCallback(
    (e: fabric.IEvent<Event>) => {
      if (selectedTool === 'select' || selectedTool === 'pencil') return

      const canvas = fabricCanvasRef.current
      if (!canvas) return

      const pointer = canvas.getPointer(e.e as MouseEvent)

      // テキストツールの場合はクリック位置にテキストを追加
      if (selectedTool === 'text') {
        const id = crypto.randomUUID()
        // ダークモードを検出してテキスト色を決定
        const isDark = document.documentElement.classList.contains('dark')
        const textColor = isDark ? '#ffffff' : '#000000'

        const text = new fabric.IText('テキストを入力', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: textColor,
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

        // テキスト編集終了後にselectツールに自動切替
        text.on('editing:exited', () => {
          setSelectedTool('select')
        })

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
        case 'arrow':
          // 矢印は線と三角形のグループとして作成
          const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: '#3b82f6',
            strokeWidth: 2,
          })
          const triangle = new fabric.Triangle({
            left: pointer.x,
            top: pointer.y,
            width: 10,
            height: 10,
            fill: '#3b82f6',
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
        setCurrentShape(shape)
      }
    },
    [selectedTool, addLayer, setSelectedObjectId, setSelectedTool]
  )

  const handleMouseMove = useCallback(
    (e: fabric.IEvent<Event>) => {
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
    [isDrawing, startPoint, currentShape, selectedTool]
  )

  const handleMouseUp = useCallback(() => {
    if (currentShape && selectedTool !== 'select' && selectedTool !== 'pencil') {
      const id = crypto.randomUUID()
      const canvas = fabricCanvasRef.current
      let finalShape = currentShape

      // 矢印の場合、線の終点に三角形を追加してグループ化
      if (selectedTool === 'arrow' && currentShape instanceof fabric.Line && canvas) {
        const x1 = currentShape.x1 || 0
        const y1 = currentShape.y1 || 0
        const x2 = currentShape.x2 || 0
        const y2 = currentShape.y2 || 0

        // 矢印の角度を計算
        const angle = Math.atan2(y2 - y1, x2 - x1)

        // 線を作成
        const line = new fabric.Line([x1, y1, x2, y2], {
          stroke: '#3b82f6',
          strokeWidth: 2,
          originX: 'left',
          originY: 'top',
        })

        // 三角形（矢印の頭）を作成
        const headLength = 15
        const headWidth = 10

        // 三角形の頂点を計算
        const triangle = new fabric.Triangle({
          left: x2,
          top: y2,
          width: headWidth,
          height: headLength,
          fill: '#3b82f6',
          angle: (angle * 180) / Math.PI + 90,
          originX: 'center',
          originY: 'center',
        })

        // グループ化
        finalShape = new fabric.Group([line, triangle], {
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        })

        // 元の線を削除
        canvas.remove(currentShape)
        canvas.add(finalShape)
      }

      // 描画完了後にオブジェクトを選択可能にする
      finalShape.set({
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

      // オブジェクト作成後、自動的にselectツールに切り替える
      setSelectedTool('select')
      setSelectedObjectId(id)

      // 作成したオブジェクトを選択状態にする
      if (canvas) {
        canvas.setActiveObject(finalShape)
        canvas.renderAll()
      }
    }

    setIsDrawing(false)
    setStartPoint(null)
    setCurrentShape(null)
  }, [currentShape, selectedTool, addLayer, setSelectedTool, setSelectedObjectId])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // オブジェクト選択時のイベントハンドラ
    const handleSelection = (e: fabric.IEvent) => {
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
    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleDeselection)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:scaled', handleObjectModified)
    canvas.on('object:moved', handleObjectModified)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared', handleDeselection)
      canvas.off('object:modified', handleObjectModified)
      canvas.off('object:scaled', handleObjectModified)
      canvas.off('object:moved', handleObjectModified)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, setSelectedObjectId, setSelectedObjectProps])

  // localStorage初期読み込み（初回のみ）
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || hasLoadedRef.current) return

    // タイマーを使用して、canvasが完全に初期化されるのを待つ
    const timer = setTimeout(() => {
      hasLoadedRef.current = true

      // 初期読み込み
      const savedCanvas = localStorage.getItem('figma-clone-canvas')
      const savedLayers = localStorage.getItem('figma-clone-layers')

      if (savedLayers) {
        try {
          const parsedLayers = JSON.parse(savedLayers)
          parsedLayers.forEach((layer: (typeof layers)[0]) => {
            addLayer(layer)
          })
          // カウンターも復元
          parsedLayers.forEach((layer: (typeof layers)[0]) => {
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

      if (savedCanvas) {
        try {
          canvas.loadFromJSON(JSON.parse(savedCanvas), () => {
            // 読み込み後、すべてのオブジェクトを選択ツールでのみ選択可能にする
            canvas.getObjects().forEach((obj) => {
              obj.selectable = selectedTool === 'select'
              obj.evented = selectedTool === 'select'
            })
            canvas.renderAll()
          })
        } catch (error) {
          console.error('Failed to load canvas from localStorage:', error)
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [selectedTool, addLayer])

  // localStorage自動保存（デバウンス）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !hasLoadedRef.current) return

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
  }, [layers])

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

  return (
    <div className="flex-1 relative">
      <canvas ref={canvasRef} />
    </div>
  )
}

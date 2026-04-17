'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts'
import { convertColorForTheme } from '@/lib/colorUtils'
import ContextMenu from '@/components/ContextMenu'
import AlignmentPanel from '@/components/AlignmentPanel'
import { useCanvasActions } from '@/hooks/useCanvasActions'
import { useCanvasEvents } from '@/hooks/useCanvasEvents'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const {
    selectedTool,
    setSelectedTool,
    setSelectedObjectId,
    addLayer,
    layers,
    selectedObjectId,
    setFabricCanvas,
    setSelectedObjectProps,
    clipboard,
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
    moveSelectedObject,
    undo,
    redo,
    saveHistory,
    clearHistory,
    gridEnabled,
    gridSize,
    gridColor,
    gridOpacity,
    zoom,
  } = useCanvasStore()

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showAlignmentPanel, setShowAlignmentPanel] = useState(false)
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 })
  const prevPageIdRef = useRef<string>(currentPageId)
  const hasLoadedRef = useRef(false)
  // 画像ペーストをマウス位置に行うため、最後に観測したカーソル位置（キャンバス座標系）を保持
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)

  // アクションフック
  const canvasActions = useCanvasActions(fabricCanvasRef.current)
  const {
    shapeCounterRef,
    deleteSelectedObject,
    duplicateSelectedObject,
    copySelectedObject,
    pasteObject,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    lockObject,
    unlockObject,
    groupObjects,
    ungroupObjects,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontal,
    distributeVertical,
  } = canvasActions

  // イベントフック
  useCanvasEvents({
    fabricCanvas: fabricCanvasRef.current,
    shapeCounterRef,
    setSelectedObjectProps,
    setShowAlignmentPanel,
    setViewportOffset,
  })

  // キーボードショートカット
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
    showShortcuts: () => useCanvasStore.getState().setShowShortcutsModal(true),
    moveSelectedObject,
    undo,
    redo,
  })

  // クリップボード画像ペースト
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return

      // テキスト入力中は無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const items = e.clipboardData?.items
      if (!items) {
        pasteObject()
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

              // 最大サイズを制限
              const maxWidth = canvas.width! * 0.5
              const maxHeight = canvas.height! * 0.5
              const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1)
              const drawW = img.width! * scale
              const drawH = img.height! * scale

              // 配置中心: 直近のカーソル位置（キャンバス座標系）。未取得時はビューポート中央へフォールバック
              let centerX: number
              let centerY: number
              if (lastPointerRef.current) {
                centerX = lastPointerRef.current.x
                centerY = lastPointerRef.current.y
              } else {
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
                const zoom = canvas.getZoom() || 1
                centerX = (canvas.width! / 2 - vpt[4]) / zoom
                centerY = (canvas.height! / 2 - vpt[5]) / zoom
              }

              img.set({
                left: centerX - drawW / 2,
                top: centerY - drawH / 2,
                scaleX: scale,
                scaleY: scale,
                data: { id },
                selectable: true,
                evented: true,
              })

              canvas.add(img)
              canvas.setActiveObject(img)
              canvas.renderAll()

              shapeCounterRef.current.paste += 1
              addLayer({
                id,
                name: `image ${shapeCounterRef.current.paste}`,
                visible: true,
                locked: false,
                objectId: id,
                type: 'VECTOR',
              })
              setSelectedObjectId(id)
              saveHistory()
            })
          }
          reader.readAsDataURL(blob)
          break
        }
      }

      // 画像がなく、内部クリップボードにオブジェクトがある場合
      if (!hasImage) {
        e.preventDefault()
        pasteObject()
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [addLayer, setSelectedObjectId, pasteObject, saveHistory, shapeCounterRef])

  // Fabric.js 初期化
  useEffect(() => {
    if (!canvasRef.current) return
    const container = canvasRef.current.parentElement
    if (!container) return

    const canvasBg = canvasBackground || (theme === 'dark' ? '#1f2937' : '#f5f5f5')
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: canvasBg,
      enableRetinaScaling: true,
    })

    fabricCanvasRef.current = canvas
    setFabricCanvas(canvas)

    // Shift/Cmd押下時に15度スナップ回転
    canvas.on('object:rotating', (e) => {
      const evt = e.e as KeyboardEvent | MouseEvent
      if (evt && (evt.shiftKey || evt.metaKey)) {
        const obj = e.target
        if (obj) {
          obj.set('angle', Math.round((obj.angle || 0) / 15) * 15)
        }
      }
    })

    // 画像ペースト位置決定のため、最後のカーソル位置（キャンバス座標系）を保持
    const trackPointer = (opt: fabric.IEvent) => {
      const p = canvas.getPointer(opt.e as MouseEvent | TouchEvent)
      lastPointerRef.current = { x: p.x, y: p.y }
    }
    canvas.on('mouse:move', trackPointer)

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        canvas.setWidth(entries[0].contentRect.width)
        canvas.setHeight(entries[0].contentRect.height)
        canvas.renderAll()
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      canvas.dispose()
      setFabricCanvas(null)
    }
  }, [])

  // ページデータの読み込み（初回 + ページ切り替え時）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const isPageSwitch = hasLoadedRef.current && prevPageIdRef.current !== currentPageId
    const isInitialLoad = !hasLoadedRef.current

    if (!isInitialLoad && !isPageSwitch) return

    const timer = setTimeout(() => {
      hasLoadedRef.current = true
      prevPageIdRef.current = currentPageId

      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        setLayers(currentPage.layers || [])
        if (currentPage.canvasData) {
          canvas.loadFromJSON(JSON.parse(currentPage.canvasData), () => {
            canvas.renderAll()
            setTimeout(() => saveHistory(), 50)
          })
        } else {
          // 空ページの場合はCanvasをクリア
          canvas.clear()
          canvas.renderAll()
          saveHistory()
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [pages, currentPageId, setLayers, saveHistory])

  // Undo/Redo用の履歴記録（操作完了時にスナップショット保存）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handleHistorySnapshot = () => {
      const state = useCanvasStore.getState()
      if (!state.pagesInitialized || state.isUndoRedoAction) return
      saveHistory()
    }

    canvas.on('object:modified', handleHistorySnapshot)
    canvas.on('object:added', handleHistorySnapshot)
    canvas.on('object:removed', handleHistorySnapshot)

    return () => {
      canvas.off('object:modified', handleHistorySnapshot)
      canvas.off('object:added', handleHistorySnapshot)
      canvas.off('object:removed', handleHistorySnapshot)
    }
  }, [saveHistory])

  // 自動保存（pagesInitialized になるまで保存を抑制）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    let saveTimeout: NodeJS.Timeout
    const handleCanvasChange = () => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        const state = useCanvasStore.getState()
        if (!state.pagesInitialized) return
        const json = JSON.stringify(canvas.toJSON(['data']))
        updatePageData(state.currentPageId, json, state.layers)
      }, 500)
    }

    canvas.on('object:modified', handleCanvasChange)
    canvas.on('object:added', handleCanvasChange)
    canvas.on('object:removed', handleCanvasChange)
    canvas.on('text:editing:exited', handleCanvasChange)

    return () => {
      clearTimeout(saveTimeout)
      canvas.off('object:modified', handleCanvasChange)
      canvas.off('object:added', handleCanvasChange)
      canvas.off('object:removed', handleCanvasChange)
      canvas.off('text:editing:exited', handleCanvasChange)
    }
  }, [updatePageData])

  // テーマ切り替え時の色変換
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.getObjects().forEach((obj) => {
      const { baseTheme, baseFill, baseStroke } = obj.data || {}
      if (baseTheme && baseTheme !== theme) {
        if (obj.fill && typeof obj.fill === 'string' && obj.fill !== 'transparent') {
          obj.set('fill', convertColorForTheme(baseFill || obj.fill, theme))
        }
        if (obj.stroke && typeof obj.stroke === 'string' && obj.stroke !== 'transparent') {
          obj.set('stroke', convertColorForTheme(baseStroke || obj.stroke, theme))
        }
        obj.dirty = true
      }
    })
    canvas.renderAll()
  }, [theme])

  return (
    <div className="flex-1 min-w-0 relative">
      <canvas ref={canvasRef} />
      {gridEnabled && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <pattern
              id="grid-pattern"
              width={gridSize * (zoom / 100)}
              height={gridSize * (zoom / 100)}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${viewportOffset.x % (gridSize * (zoom / 100))}, ${viewportOffset.y % (gridSize * (zoom / 100))})`}
            >
              <path
                d={`M ${gridSize * (zoom / 100)} 0 L 0 0 0 ${gridSize * (zoom / 100)}`}
                fill="none"
                stroke={gridColor}
                strokeWidth="0.5"
                strokeOpacity={gridOpacity / 100}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      )}
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
          canGroup={fabricCanvasRef.current?.getActiveObject()?.type === 'activeSelection'}
          canUngroup={fabricCanvasRef.current?.getActiveObject()?.type === 'group'}
        />
      )}
    </div>
  )
}

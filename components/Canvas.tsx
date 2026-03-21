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

  // ページデータの読み込み
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || hasLoadedRef.current) return

    const timer = setTimeout(() => {
      hasLoadedRef.current = true
      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        if (currentPage.layers.length > 0) setLayers(currentPage.layers)
        if (currentPage.canvasData) {
          canvas.loadFromJSON(JSON.parse(currentPage.canvasData), () => {
            canvas.renderAll()
            setTimeout(() => saveHistory(), 50)
          })
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [pages, currentPageId, setLayers, saveHistory])

  // 自動保存
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    let saveTimeout: NodeJS.Timeout
    const handleCanvasChange = () => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        const json = JSON.stringify(canvas.toJSON(['data']))
        const state = useCanvasStore.getState()
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

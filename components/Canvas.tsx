'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore, DARK_CANVAS_BG, LIGHT_CANVAS_BG } from '@/lib/store'
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts'
import { convertColorForTheme } from '@/lib/colorUtils'
import ContextMenu from '@/components/ContextMenu'
import AlignmentPanel from '@/components/AlignmentPanel'
import { useCanvasActions } from '@/hooks/useCanvasActions'
import { useCanvasEvents } from '@/hooks/useCanvasEvents'
import { downscaleImageDataUrl } from '@/lib/canvasUtils'

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
    selectedLayerIds,
    setFabricCanvas,
    setSelectedObjectProps,
    clipboard,
    currentPageId,
    pages,
    updatePageData,
    setLayers,
    groupLayersIntoFolder,
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
  // canvas が実際に保持しているページID。自動保存はこのページにのみ書き込む
  // （currentPageId はページ切替で即座に変わるが、canvas の中身は非同期ロード完了まで旧ページのまま）
  const loadedPageIdRef = useRef<string | null>(null)
  // ページ読み込み中フラグ。loadFromJSON / clear が発火する object イベントで
  // 過渡的な内容を別ページへ誤保存しないよう自動保存・履歴記録を抑制する
  const isLoadingPageRef = useRef(false)
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
          reader.onload = async (event) => {
            const rawUrl = event.target?.result as string
            // 巨大画像をそのまま保持すると、保存・履歴のたびに巨大 JSON を生成して
            // OOM クラッシュを起こすため、ペースト時点で最大1600pxにダウンスケール
            const imgUrl = await downscaleImageDataUrl(rawUrl)
            // ダウンスケールと fromURL の間にコンポーネントがアンマウントされる可能性があるため
            // 最新の canvas 参照を毎回チェックする
            if (!fabricCanvasRef.current) return
            fabric.Image.fromURL(imgUrl, (img) => {
              if (!fabricCanvasRef.current) return
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

    const canvasBg = canvasBackground || (theme === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG)
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: canvasBg,
      enableRetinaScaling: true,
      // デフォルト false だと選択中オブジェクトが常に最前面で描画されるため、
      // 付箋の bg を選択したときに text(前面) が隠れる。Figma 等と同様の挙動にするため
      // スタッキング順を維持
      preserveObjectStacking: true,
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

    // ビューポート変更を grid overlay と同期。レイヤークリックによるパン等、
    // 個別ハンドラを経由しない経路でも setViewportTransform 後に grid 位置が
    // 取り残されないよう、after:render で実際の値の変化を検知して反映する
    let lastVpX = 0
    let lastVpY = 0
    const syncViewportOffset = () => {
      const vpt = canvas.viewportTransform
      if (!vpt) return
      if (vpt[4] !== lastVpX || vpt[5] !== lastVpY) {
        lastVpX = vpt[4]
        lastVpY = vpt[5]
        setViewportOffset({ x: lastVpX, y: lastVpY })
      }
    }
    canvas.on('after:render', syncViewportOffset)

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
      // dispose でも一括解除されるが、リスナー解除の対称性を保つため明示 off
      canvas.off('mouse:move', trackPointer)
      canvas.off('after:render', syncViewportOffset)
      canvas.dispose()
      setFabricCanvas(null)
    }
  }, [])

  // canvasBackground / theme 変化時に Canvas の背景色を追従させる
  // （初期化 useEffect の依存は [] なので、ここで別 effect で同期する）
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const nextBg = canvasBackground || (theme === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG)
    canvas.setBackgroundColor(nextBg, () => {
      // autoInvertText が ON のとき、既定色テキストを背景に応じて反転
      useCanvasStore.getState().applyAutoInvertText()
      canvas.renderAll()
    })
  }, [canvasBackground, theme])

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
      isLoadingPageRef.current = true

      // タイマー発火までに pages が再保存されている可能性があるため、最新を取得
      const targetPageId = currentPageId
      const currentPage = useCanvasStore.getState().pages.find((p) => p.id === targetPageId)
      if (!currentPage) {
        isLoadingPageRef.current = false
        return
      }

      setLayers(currentPage.layers || [])

      // ロード完了時: canvas が保持するページを記録し、抑制フラグを解除してから履歴を取る
      const finishLoad = () => {
        loadedPageIdRef.current = targetPageId
        isLoadingPageRef.current = false
        saveHistory()
      }

      if (currentPage.canvasData) {
        canvas.loadFromJSON(JSON.parse(currentPage.canvasData), () => {
          // loadFromJSON は保存時の背景色を復元するため、ここで現在のユーザー設定で上書き
          const { canvasBackground: bg, theme: t } = useCanvasStore.getState()
          canvas.setBackgroundColor(bg || (t === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG), () =>
            canvas.renderAll()
          )
          finishLoad()
        })
      } else {
        // 空ページの場合はCanvasをクリア
        canvas.clear()
        canvas.renderAll()
        finishLoad()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [pages, currentPageId, setLayers, saveHistory])

  // Undo/Redo用の履歴記録（操作完了時にスナップショット保存）
  // 連続イベント（ペースト一括追加、整列、複数選択削除など）で毎回 toJSON するとメモリと CPU を浪費し
  // クラッシュの原因になるため、300ms デバウンスで coalesce する
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    let snapshotTimer: NodeJS.Timeout | null = null
    const handleHistorySnapshot = () => {
      const state = useCanvasStore.getState()
      if (!state.pagesInitialized || state.isUndoRedoAction || isLoadingPageRef.current) return
      if (snapshotTimer) clearTimeout(snapshotTimer)
      snapshotTimer = setTimeout(() => {
        const s = useCanvasStore.getState()
        if (!s.pagesInitialized || s.isUndoRedoAction || isLoadingPageRef.current) return
        saveHistory()
      }, 300)
    }

    canvas.on('object:modified', handleHistorySnapshot)
    canvas.on('object:added', handleHistorySnapshot)
    canvas.on('object:removed', handleHistorySnapshot)

    return () => {
      if (snapshotTimer) clearTimeout(snapshotTimer)
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
        // ページ読み込み中は保存しない（clear/loadFromJSON の過渡的な内容を書き込まない）
        if (isLoadingPageRef.current) return
        // canvas が保持するページと現在ページが食い違う間（切替の過渡期）は保存しない。
        // これをしないと旧ページの canvas 内容を新ページへ上書きしてデータが壊れる
        const targetPageId = loadedPageIdRef.current
        if (!targetPageId || targetPageId !== state.currentPageId) return
        // 巨大な canvas（多数の画像）では toJSON / stringify が OOM を起こす可能性があるため
        // try/catch で保護し、失敗しても以降の操作が止まらないようにする
        try {
          const json = JSON.stringify(canvas.toJSON(['data']))
          updatePageData(targetPageId, json, state.layers)
        } catch (e) {
          console.error('Auto-save serialization failed:', e)
        }
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

  // キャンバス右クリック: カーソル下のオブジェクトをヒットテストし、
  // 未選択ならそれを選択してからコンテキストメニューを開く（空白上でも開く＝ペースト用）
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const target = canvas.findTarget(e.nativeEvent, false) as fabric.Object | undefined
    if (target) {
      const active = canvas.getActiveObject()
      const isPartOfActive =
        active?.type === 'activeSelection' &&
        (active as fabric.ActiveSelection).getObjects().includes(target)
      // 既存の選択（単一/複数）に含まれていなければ、対象を単一選択に切り替える
      if (active !== target && !isPartOfActive) {
        canvas.setActiveObject(target)
        canvas.requestRenderAll()
        if (target.data?.id) {
          setSelectedObjectId(target.data.id)
          const layerId = layers.find((l) => l.objectId === target.data?.id)?.id
          useCanvasStore.getState().setSelectedLayerIds(layerId ? [layerId] : [])
        }
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  // 右クリックメニューから「フォルダにまとめる」: Canvas の複数選択に同期された
  // selectedLayerIds をそのままフォルダ化する
  const groupSelectionIntoFolder = () => {
    const ids = useCanvasStore.getState().selectedLayerIds
    if (ids.length > 0) groupLayersIntoFolder(ids)
  }

  return (
    <div className="flex-1 min-w-0 relative" onContextMenu={handleCanvasContextMenu}>
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
          onGroupIntoFolder={groupSelectionIntoFolder}
          canGroupIntoFolder={selectedLayerIds.length >= 2}
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

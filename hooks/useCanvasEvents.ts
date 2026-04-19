import { useCallback, useRef, useEffect } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore, isBackgroundDark, DARK_CANVAS_BG, LIGHT_CANVAS_BG } from '@/lib/store'
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
    styleDefaults,
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
        // 前回のテキスト色が保存されていれば引き継ぐ（未設定は現在の背景色に応じて自動選択）
        // ※ theme ではなく canvasBackground ベース（背景色のみ変更されても視認性を担保）
        const bgIsDark = isBackgroundDark(
          canvasBackground || (theme === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG)
        )
        const themeTextColor = bgIsDark ? '#ffffff' : '#000000'
        const textColor = styleDefaults.textFill || themeTextColor
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

      if (selectedTool === 'sticky') {
        setSelectedTool('select')
        // 付箋は Rect(背景) + Textbox(本文) を別オブジェクトとして配置し、
        // object:moving で同期する（Group にすると Textbox 内の IME 入力が
        // 正しく動作しないため、独立オブジェクト方式を採用）
        const stickyId = crypto.randomUUID()
        const bgId = crypto.randomUUID()
        const textId = crypto.randomUUID()
        const bgColor = styleDefaults.stickyColor || '#FEF3B5'
        const size = 180
        const pad = 16
        const textColor = isBackgroundDark(bgColor) ? '#ffffff' : '#1f2937'
        const bgLeft = pointer.x - size / 2
        const bgTop = pointer.y - size / 2

        const bg = new fabric.Rect({
          left: bgLeft,
          top: bgTop,
          width: size,
          height: size,
          fill: bgColor,
          rx: 6,
          ry: 6,
          stroke: 'rgba(0,0,0,0.08)',
          strokeWidth: 1,
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.15)',
            blur: 8,
            offsetX: 0,
            offsetY: 2,
          }),
          data: { id: bgId, type: 'sticky', stickyId, stickyRole: 'bg', stickyColor: bgColor },
        })
        const textbox = new fabric.Textbox('メモを入力', {
          left: bgLeft + pad,
          top: bgTop + pad,
          width: size - pad * 2,
          fontSize: 16,
          fill: textColor,
          fontFamily: 'Arial',
          textAlign: 'left',
          // 単語境界のない長文（英数字連続など）でも幅内で折り返すため、
          // grapheme 単位での折り返しを有効化
          splitByGrapheme: true,
          data: { id: textId, type: 'sticky', stickyId, stickyRole: 'text' },
        })

        fabricCanvas.add(bg)
        fabricCanvas.add(textbox)
        fabricCanvas.setActiveObject(bg)
        fabricCanvas.renderAll()

        shapeCounterRef.current.sticky = (shapeCounterRef.current.sticky || 0) + 1
        addLayer({
          id: bgId,
          name: `sticky ${shapeCounterRef.current.sticky}`,
          visible: true,
          locked: false,
          objectId: bgId,
          type: 'STICKY',
        })
        setSelectedObjectId(bgId)
        return
      }

      isDrawingRef.current = true
      startPointRef.current = { x: pointer.x, y: pointer.y }

      // 最後に使ったスタイルを既定として採用（未設定時はテーマ既定）
      const themeDefaultStroke = theme === 'dark' ? '#6B7280' : '#D1D5DB'
      const themeDefaultFill =
        theme === 'dark' ? 'rgba(107, 114, 128, 0.5)' : 'rgba(209, 213, 219, 0.5)'
      const defaultStrokeColor = styleDefaults.stroke || themeDefaultStroke
      const defaultFillColor = styleDefaults.fill || themeDefaultFill
      const defaultStrokeWidth = styleDefaults.strokeWidth ?? 0
      // 線/矢印は太さ0だと見えないので最低値1を保証
      const lineStrokeWidth = Math.max(1, defaultStrokeWidth || 2)

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
            strokeWidth: defaultStrokeWidth,
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
            strokeWidth: defaultStrokeWidth,
            selectable: false,
            evented: false,
          })
          break
        case 'line':
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: defaultStrokeColor,
            strokeWidth: lineStrokeWidth,
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
            strokeWidth: lineStrokeWidth,
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
      styleDefaults,
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

      // 付箋の text を通常選択した場合は bg にリダイレクト
      // （編集中は IText.isEditing が true になるので、その間はスキップ）
      if (
        activeObject?.data?.type === 'sticky' &&
        activeObject.data?.stickyRole === 'text' &&
        !(activeObject as fabric.IText).isEditing
      ) {
        const bg = fabricCanvas
          .getObjects()
          .find(
            (o) => o.data?.stickyId === activeObject.data?.stickyId && o.data?.stickyRole === 'bg'
          )
        if (bg) {
          fabricCanvas.setActiveObject(bg)
          // リダイレクト後に selection:updated が再度発火するのでそこで処理継続
          return
        }
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
          isArrow: selected.data?.type === 'arrow',
        })
      } else {
        setSelectedObjectId(null)
        setSelectedObjectProps(null)
      }
    }

    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target
      if (obj && obj.data?.id) {
        // strokeWidth/isArrow を含めないと PropertiesPanel の線コントロールが消えるバグになる
        setSelectedObjectProps({
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          left: obj.left,
          top: obj.top,
          width: obj.width! * (obj.scaleX || 1),
          height: obj.height! * (obj.scaleY || 1),
          opacity: obj.opacity,
          isArrow: obj.data?.type === 'arrow',
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

    // 複製ドラッグ用: ドラッグ開始位置を記録しておき、最初の object:moving で原点にクローンを残す
    let dragOrigin: { object: fabric.Object; left: number; top: number } | null = null
    let altCloneCreated = false

    const handleMouseDownInt = (opt: fabric.IEvent) => {
      if (selectedTool !== 'select') return
      const evt = opt.e as MouseEvent | TouchEvent
      const isMiddleButton = 'button' in evt && evt.button === 1
      // 空白エリアの Alt+左ドラッグはパンとして扱う
      const isAltBlankDrag =
        !opt.target &&
        'buttons' in evt &&
        (evt as MouseEvent).buttons === 1 &&
        (evt as MouseEvent).altKey

      // パンは中ボタンまたは空白 Alt+ドラッグでのみ有効（オブジェクト上の Alt+ドラッグは複製に回す）
      if (!opt.target && (isMiddleButton || isAltBlankDrag)) {
        const mouseEvt = evt as MouseEvent
        const coords = { x: mouseEvt.clientX, y: mouseEvt.clientY }
        isPanning = true
        fabricCanvas.selection = false
        lastPosX = coords.x
        lastPosY = coords.y
        return
      }

      // オブジェクト上で mouse:down が起きたらドラッグ原点を記録（複製ドラッグの起点）
      // 複数選択（activeSelection）はクローンが壊れるため複製ドラッグの対象外とする
      if (opt.target && opt.target.data?.id && opt.target.type !== 'activeSelection') {
        dragOrigin = {
          object: opt.target,
          left: opt.target.left || 0,
          top: opt.target.top || 0,
        }
        altCloneCreated = false
      }
    }

    const handleObjectMovingDup = (opt: fabric.IEvent) => {
      if (!dragOrigin || altCloneCreated) return
      const evt = opt.e as MouseEvent | undefined
      const shouldDuplicate = (evt && evt.altKey) || useCanvasStore.getState().duplicateMode
      if (!shouldDuplicate) return
      altCloneCreated = true

      const src = dragOrigin.object
      const originalLeft = dragOrigin.left
      const originalTop = dragOrigin.top
      // z-order 復元用に元オブジェクトのインデックスを控えておく
      const originalIndex = fabricCanvas.getObjects().indexOf(src)
      src.clone(
        (cloned: fabric.Object) => {
          const objectId = crypto.randomUUID()
          cloned.set({
            left: originalLeft,
            top: originalTop,
            data: { ...src.data, id: objectId },
            selectable: true,
            evented: true,
          })
          cloned.setCoords()
          fabricCanvas.add(cloned)
          // 元オブジェクトの直上に挿入（add 直後は最前面）
          if (originalIndex >= 0) {
            fabricCanvas.moveTo(cloned, originalIndex + 1)
          }
          fabricCanvas.renderAll()

          const srcId = src.data?.id
          const { layers: currentLayers } = useCanvasStore.getState()
          const originalLayer = currentLayers.find((l) => l.objectId === srcId)
          if (originalLayer) {
            useCanvasStore.getState().addLayer({
              id: crypto.randomUUID(),
              name: `${originalLayer.name} copy`,
              visible: true,
              locked: false,
              objectId,
              type: originalLayer.type,
              parentId: originalLayer.parentId,
            })
          }
          // saveHistory は canvas の object:added リスナー経由で自動記録される
        },
        ['data']
      )
    }

    const handleMouseUpDup = () => {
      dragOrigin = null
      altCloneCreated = false
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

    const handleMouseUpPan = () => {
      if (isPanning) {
        isPanning = false
        fabricCanvas.selection = true
      }
    }
    const handleSelectionCleared = () => {
      setSelectedObjectId(null)
      setSelectedObjectProps(null)
      setShowAlignmentPanel(false)
    }

    // 付箋パーツのペアを検索するヘルパー
    const findStickyPartner = (obj: fabric.Object): fabric.Object | undefined => {
      const stickyId = obj.data?.stickyId
      if (!stickyId) return
      return fabricCanvas.getObjects().find((o) => o.data?.stickyId === stickyId && o !== obj)
    }

    // 付箋をダブルクリックしたら、対になる Textbox の編集モードに入る
    // bg 上 / text 上どちらのダブルクリックでも同じ text を編集対象にする
    // 注意: enterEditing を setActiveObject より先に呼ぶことで、selection:updated の
    //      ハンドラが isEditing=true を見て text→bg のリダイレクトをスキップする
    const handleStickyDblClick = (opt: fabric.IEvent) => {
      const target = opt.target
      if (!target || target.data?.type !== 'sticky') return
      const textbox =
        target.data?.stickyRole === 'text'
          ? (target as fabric.Textbox)
          : (findStickyPartner(target) as fabric.Textbox | undefined)
      if (!textbox || !('enterEditing' in textbox)) return
      ;(textbox as fabric.IText).enterEditing()
      fabricCanvas.setActiveObject(textbox as fabric.Object)
      ;(textbox as fabric.IText).selectAll()
      fabricCanvas.requestRenderAll()
    }

    // 付箋パーツの相対位置を強制的にスナップ（text = bg + pad）
    // bg が動けば text を追従、text が動けば（通常起こらないが保険で）bg を追従
    const STICKY_PAD = 16
    const snapStickyPartner = (moved: fabric.Object) => {
      const partner = findStickyPartner(moved)
      if (!partner) return
      if (moved.data?.stickyRole === 'bg') {
        partner.set({
          left: (moved.left || 0) + STICKY_PAD,
          top: (moved.top || 0) + STICKY_PAD,
        })
      } else if (moved.data?.stickyRole === 'text') {
        partner.set({
          left: (moved.left || 0) - STICKY_PAD,
          top: (moved.top || 0) - STICKY_PAD,
        })
      }
      partner.setCoords()
    }

    const handleStickyMoving = (opt: fabric.IEvent) => {
      const target = opt.target
      if (!target || target.data?.type !== 'sticky') return
      snapStickyPartner(target)
    }

    // object:modified はマウスドラッグ完了時だけでなく、キーボードナッジ（moveSelectedObject）
    // や整列/分配アクションでも発火するため、両方をここでカバー
    const handleStickyObjectModifiedSync = (opt: fabric.IEvent) => {
      const target = opt.target
      if (!target || target.data?.type !== 'sticky') return
      snapStickyPartner(target)
      fabricCanvas.requestRenderAll()
    }

    // text の内容が変わったら bg の高さを text に合わせて伸縮
    // （min 180、text より小さくならない）
    const STICKY_MIN_SIZE = 180
    const handleStickyTextChanged = (opt: fabric.IEvent) => {
      const target = opt.target
      if (!target || target.data?.type !== 'sticky' || target.data?.stickyRole !== 'text') return
      const text = target as fabric.Textbox
      const bg = findStickyPartner(text)
      if (!bg) return
      const textHeight =
        typeof text.calcTextHeight === 'function' ? text.calcTextHeight() : text.height || 0
      const desiredBgHeight = Math.max(STICKY_MIN_SIZE, textHeight + STICKY_PAD * 2)
      if ((bg.height || 0) !== desiredBgHeight) {
        bg.set({ height: desiredBgHeight })
        bg.setCoords()
        fabricCanvas.requestRenderAll()
      }
    }

    // 付箋パーツが削除されたとき、相棒も削除する（bg 単独削除／text 単独削除を防ぐ）
    let isRemovingStickyPartner = false
    const handleStickyObjectRemoved = (opt: fabric.IEvent) => {
      if (isRemovingStickyPartner) return
      const target = opt.target
      if (!target || target.data?.type !== 'sticky') return
      const stickyId = target.data?.stickyId
      if (!stickyId) return
      // 相棒はまだ canvas 上にいる想定
      const partner = fabricCanvas
        .getObjects()
        .find((o) => o.data?.stickyId === stickyId && o !== target)
      if (!partner) return
      isRemovingStickyPartner = true
      try {
        fabricCanvas.remove(partner)
      } finally {
        isRemovingStickyPartner = false
      }
    }

    fabricCanvas.on('mouse:down', handleMouseDown)
    fabricCanvas.on('mouse:move', handleMouseMove)
    fabricCanvas.on('mouse:up', handleMouseUp)
    fabricCanvas.on('mouse:down', handleMouseDownInt)
    fabricCanvas.on('mouse:move', handleMouseMoveInt)
    fabricCanvas.on('mouse:up', handleMouseUpPan)
    fabricCanvas.on('mouse:up', handleMouseUpDup)
    fabricCanvas.on('object:moving', handleObjectMovingDup)
    fabricCanvas.on('mouse:wheel', handleMouseWheel)
    fabricCanvas.on('selection:created', handleSelection)
    fabricCanvas.on('selection:updated', handleSelection)
    fabricCanvas.on('selection:cleared', handleSelectionCleared)
    fabricCanvas.on('object:modified', handleObjectModified)
    fabricCanvas.on('path:created', handlePathCreated)
    fabricCanvas.on('mouse:dblclick', handleStickyDblClick)
    fabricCanvas.on('object:moving', handleStickyMoving)
    fabricCanvas.on('object:modified', handleStickyObjectModifiedSync)
    fabricCanvas.on('object:removed', handleStickyObjectRemoved)
    fabricCanvas.on('text:changed', handleStickyTextChanged)

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown)
      fabricCanvas.off('mouse:move', handleMouseMove)
      fabricCanvas.off('mouse:up', handleMouseUp)
      fabricCanvas.off('mouse:down', handleMouseDownInt)
      fabricCanvas.off('mouse:move', handleMouseMoveInt)
      fabricCanvas.off('mouse:up', handleMouseUpPan)
      fabricCanvas.off('mouse:up', handleMouseUpDup)
      fabricCanvas.off('object:moving', handleObjectMovingDup)
      fabricCanvas.off('mouse:wheel', handleMouseWheel)
      fabricCanvas.off('selection:created', handleSelection)
      fabricCanvas.off('selection:updated', handleSelection)
      fabricCanvas.off('selection:cleared', handleSelectionCleared)
      fabricCanvas.off('object:modified', handleObjectModified)
      fabricCanvas.off('path:created', handlePathCreated)
      fabricCanvas.off('mouse:dblclick', handleStickyDblClick)
      fabricCanvas.off('object:moving', handleStickyMoving)
      fabricCanvas.off('object:modified', handleStickyObjectModifiedSync)
      fabricCanvas.off('object:removed', handleStickyObjectRemoved)
      fabricCanvas.off('text:changed', handleStickyTextChanged)
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

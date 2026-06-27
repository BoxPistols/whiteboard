import type { StateCreator } from 'zustand'
import type { fabric } from 'fabric'
import type { CanvasStore, ObjectProperties } from '../store'
import { isBackgroundDark } from '../storeHelpers'
import { DARK_CANVAS_BG, LIGHT_CANVAS_BG } from './themeSlice'

// autoInvertText は「既定色（白/黒系）」のテキストだけを反転対象にする
const isDefaultTextColor = (fill: string): boolean => {
  const c = fill.trim().toLowerCase()
  return (
    c === '#000000' ||
    c === '#000' ||
    c === 'black' ||
    c === '#ffffff' ||
    c === '#fff' ||
    c === 'white'
  )
}

// 選択オブジェクトへの操作（プロパティ編集 / ナッジ移動 / 複製 / テキスト自動反転）のスライス。
// store.ts(モノリス)からの段階的分割（fabric 依存）。fabricCanvas/selectedObjectProps/theme 等は
// get() 経由で参照する。
export interface ObjectOpsSlice {
  // 複製モード（Alt+ドラッグ用インジケーター）
  duplicateMode: boolean
  // テキスト色を背景色に応じて自動反転する設定（既定色のみ対象、カスタム色は触らない）
  autoInvertText: boolean
  updateObjectProperty: (key: keyof ObjectProperties, value: number | string) => void
  moveSelectedObject: (direction: 'up' | 'down' | 'left' | 'right', useNudge: boolean) => void
  setDuplicateMode: (on: boolean) => void
  duplicateSelected: () => void
  setAutoInvertText: (on: boolean) => void
  loadSavedAutoInvertText: () => void
  applyAutoInvertText: () => void
}

export const createObjectOpsSlice: StateCreator<CanvasStore, [], [], ObjectOpsSlice> = (
  set,
  get
) => ({
  duplicateMode: false,
  // デフォルト ON（既定色テキストのみ背景に応じて自動反転）
  autoInvertText: true,
  updateObjectProperty: (key, value) => {
    const { fabricCanvas, selectedObjectProps, theme } = get()
    if (!fabricCanvas) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // fill/stroke 変更時にテーマ追従用の元色(baseFill/baseStroke)と baseTheme を data へ記録する。
    // 3箇所で重複していたロジックを集約（theme はこのクロージャから参照）。
    const applyBaseColorData = (
      obj: fabric.Object,
      patch: { baseFill?: string; baseStroke?: string }
    ) => {
      const currentData = obj.data || { id: crypto.randomUUID() }
      obj.set({ data: { ...currentData, ...patch, baseTheme: theme } })
    }

    // 単一オブジェクトのプロパティを更新するヘルパー関数
    const updateSingleObject = (obj: fabric.Object) => {
      // 矢印（Path）の場合、fillとstrokeを連動させる
      if (obj.data?.type === 'arrow' && (key === 'fill' || key === 'stroke')) {
        const colorValue = value as string
        obj.set('fill', colorValue)
        obj.set('stroke', colorValue)
        obj.dirty = true

        applyBaseColorData(obj, { baseFill: colorValue, baseStroke: colorValue })
      } else if (
        obj.type === 'group' &&
        (key === 'fill' || key === 'stroke' || key === 'strokeWidth')
      ) {
        // Groupオブジェクトの場合、子要素のプロパティを更新
        const group = obj as fabric.Group
        const items = group.getObjects()
        items.forEach((item) => {
          if (key === 'fill') item.set('fill', value as string)
          else if (key === 'stroke') item.set('stroke', value as string)
          else if (key === 'strokeWidth') item.set('strokeWidth', value as number)
          item.dirty = true
        })
        obj.dirty = true

        // 色が変更された場合、baseColorとbaseThemeを更新
        if (key === 'fill' || key === 'stroke') {
          applyBaseColorData(obj, {
            ...(key === 'fill' && { baseFill: value as string }),
            ...(key === 'stroke' && { baseStroke: value as string }),
          })
        }
      } else if (key === 'width' || key === 'height') {
        // 幅と高さはスケールを考慮して設定
        if (key === 'width' && obj.width) {
          obj.scaleX = (value as number) / obj.width
        } else if (key === 'height' && obj.height) {
          obj.scaleY = (value as number) / obj.height
        }
      } else {
        // 色や他のプロパティを直接設定
        if (key === 'fill') obj.set('fill', value as string)
        else if (key === 'stroke') obj.set('stroke', value as string)
        else if (key === 'strokeWidth') obj.set('strokeWidth', value as number)
        else if (key === 'opacity') obj.set('opacity', value as number)
        else if (key === 'left') obj.set('left', value as number)
        else if (key === 'top') obj.set('top', value as number)

        // 色が変更された場合、baseColorとbaseThemeを更新
        if (key === 'fill' || key === 'stroke') {
          applyBaseColorData(obj, {
            ...(key === 'fill' && { baseFill: value as string }),
            ...(key === 'stroke' && { baseStroke: value as string }),
          })
        }
      }

      obj.setCoords()
      obj.dirty = true
    }

    // 複数選択の場合、すべてのオブジェクトを更新
    if (activeObject.type === 'activeSelection') {
      const selection = activeObject as fabric.ActiveSelection
      const objects = selection.getObjects()
      objects.forEach((obj) => {
        updateSingleObject(obj)
      })
    } else {
      // 単一選択の場合
      updateSingleObject(activeObject)
    }

    // 変更を反映
    activeObject.setCoords()
    activeObject.dirty = true
    fabricCanvas.requestRenderAll()

    // 最後に使ったスタイルを記憶（次回の新規作成で引き継ぎ）
    // テキストの fill は shape の fill と別枠で保存する
    if (key === 'fill' && typeof value === 'string') {
      const isText =
        activeObject.type === 'i-text' ||
        activeObject.type === 'text' ||
        activeObject.type === 'textbox'
      get().setStyleDefaults(isText ? { textFill: value } : { fill: value })
    } else if (key === 'stroke' && typeof value === 'string') {
      get().setStyleDefaults({ stroke: value })
    } else if (key === 'strokeWidth' && typeof value === 'number') {
      get().setStyleDefaults({ strokeWidth: value })
    }

    // 自動保存は object:modified 経由（500ms デバウンス）に委譲する。
    // ここで毎回 toJSON すると、スライダードラッグ等の連続呼び出しで巨大 JSON を
    // 大量にアロケートし OOM／クラッシュの原因になっていた
    fabricCanvas.fire('object:modified', { target: activeObject })

    // ストアのプロパティも即座に更新
    if (selectedObjectProps) {
      const updatedProps = { ...selectedObjectProps, [key]: value }

      // width/heightが変更された場合、scaleも更新
      if (key === 'width' && activeObject.width) {
        updatedProps.scaleX = (value as number) / activeObject.width
      } else if (key === 'height' && activeObject.height) {
        updatedProps.scaleY = (value as number) / activeObject.height
      }

      set({ selectedObjectProps: updatedProps })
    }
  },
  moveSelectedObject: (direction, useNudge) => {
    const { fabricCanvas, nudgeAmount, selectedObjectProps } = get()
    if (!fabricCanvas) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // 移動量を決定（通常は1px、Shift押下時はnudgeAmount）
    const moveAmount = useNudge ? nudgeAmount : 1

    let deltaX = 0
    let deltaY = 0

    switch (direction) {
      case 'up':
        deltaY = -moveAmount
        break
      case 'down':
        deltaY = moveAmount
        break
      case 'left':
        deltaX = -moveAmount
        break
      case 'right':
        deltaX = moveAmount
        break
    }

    // 現在の位置を取得
    const currentLeft = activeObject.left || 0
    const currentTop = activeObject.top || 0

    // 新しい位置を設定
    activeObject.set({
      left: currentLeft + deltaX,
      top: currentTop + deltaY,
    })

    activeObject.setCoords()
    fabricCanvas.requestRenderAll()
    fabricCanvas.fire('object:modified', { target: activeObject })

    // ストアのプロパティも更新
    if (selectedObjectProps) {
      set({
        selectedObjectProps: {
          ...selectedObjectProps,
          left: currentLeft + deltaX,
          top: currentTop + deltaY,
        },
      })
    }
  },
  setDuplicateMode: (on) => set({ duplicateMode: on }),
  setAutoInvertText: (on) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('twb-auto-invert-text', on ? '1' : '0')
      } catch (e) {
        console.error('Failed to save auto-invert-text:', e)
      }
    }
    set({ autoInvertText: on })
    // トグル直後に既存テキストへ反映（ON 化時に反転、OFF 化時は何もしない）
    if (on) get().applyAutoInvertText()
  },
  loadSavedAutoInvertText: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('twb-auto-invert-text')
    if (saved === null) return
    set({ autoInvertText: saved === '1' })
  },
  applyAutoInvertText: () => {
    const { fabricCanvas, autoInvertText, canvasBackground, theme } = get()
    if (!fabricCanvas || !autoInvertText) return
    const bg = canvasBackground || (theme === 'dark' ? DARK_CANVAS_BG : LIGHT_CANVAS_BG)
    const bgIsDark = isBackgroundDark(bg)
    const targetColor = bgIsDark ? '#ffffff' : '#000000'
    let changed = false
    fabricCanvas.getObjects().forEach((obj) => {
      const type = obj.type
      if (type !== 'i-text' && type !== 'text' && type !== 'textbox') return
      const fill = typeof obj.fill === 'string' ? obj.fill.toLowerCase() : ''
      // 既定色（白/黒）のみ対象。ユーザーが任意色を選んだテキストは触らない
      if (!isDefaultTextColor(fill)) return
      if (fill === targetColor) return
      obj.set('fill', targetColor)
      obj.dirty = true
      changed = true
    })
    if (changed) fabricCanvas.requestRenderAll()
  },
  duplicateSelected: () => {
    const { fabricCanvas } = get()
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return
    // activeSelection はクローンが壊れるため未対応（個別選択の後に実行してもらう）
    if (activeObject.type === 'activeSelection') return
    // 元オブジェクトの z-index を控えて、複製を直上に挿入する
    const originalIndex = fabricCanvas.getObjects().indexOf(activeObject)
    activeObject.clone((cloned: fabric.Object) => {
      const objectId = crypto.randomUUID()
      const layerId = crypto.randomUUID()
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
        data: { ...cloned.data, id: objectId },
        selectable: true,
        evented: true,
      })
      fabricCanvas.add(cloned)
      if (originalIndex >= 0) {
        fabricCanvas.moveTo(cloned, originalIndex + 1)
      }
      fabricCanvas.setActiveObject(cloned)
      fabricCanvas.renderAll()

      const { layers: currentLayers } = get()
      const originalObjectId = activeObject.data?.id
      const originalLayer = currentLayers.find((l) => l.objectId === originalObjectId)
      if (originalLayer) {
        get().addLayer({
          id: layerId,
          name: `${originalLayer.name} copy`,
          visible: true,
          locked: false,
          objectId,
          type: originalLayer.type,
          parentId: originalLayer.parentId,
        })
      }
      set({ selectedObjectId: objectId })
      // saveHistory は canvas の object:added リスナー経由で自動記録されるため明示呼び出し不要
    })
  },
})

import { useCallback, useRef } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/lib/store'
import { colorToHex } from '@/lib/colorUtils'
import { createArrowObject, createArrowPathData } from '@/lib/canvasUtils'
import type { Layer } from '@/types'

export const useCanvasActions = (fabricCanvas: fabric.Canvas | null) => {
  const {
    layers,
    selectedObjectId,
    setSelectedObjectId,
    addLayer,
    removeLayer,
    setLayers,
    clipboard,
    setClipboard,
    stickyClipboard,
    setStickyClipboard,
    saveHistory,
  } = useCanvasStore()

  const shapeCounterRef = useRef({
    rectangle: 0,
    circle: 0,
    line: 0,
    arrow: 0,
    text: 0,
    sticky: 0,
    pencil: 0,
    paste: 0,
    group: 0,
    object: 0,
  })

  // 選択されたオブジェクトを削除
  const deleteSelectedObject = useCallback(() => {
    if (!fabricCanvas) return

    const activeSelection = fabricCanvas.getActiveObject()
    if (!activeSelection) return

    if (activeSelection.type === 'activeSelection') {
      const objects = (activeSelection as fabric.ActiveSelection).getObjects()
      fabricCanvas.discardActiveObject()
      objects.forEach((obj) => {
        const objectId = obj.data?.id
        if (objectId) {
          const layer = layers.find((l) => l.objectId === objectId)
          if (layer) removeLayer(layer.id)
        } else {
          fabricCanvas.remove(obj)
        }
      })
    } else {
      const objectId = activeSelection.data?.id
      if (objectId) {
        const layer = layers.find((l) => l.objectId === objectId)
        if (layer) removeLayer(layer.id)
      } else {
        fabricCanvas.remove(activeSelection)
      }
    }

    fabricCanvas.renderAll()
    setSelectedObjectId(null)
    saveHistory()
  }, [fabricCanvas, layers, removeLayer, setSelectedObjectId, saveHistory])

  // 選択されたオブジェクトを複製
  const duplicateSelectedObject = useCallback(() => {
    if (!fabricCanvas || !selectedObjectId) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // 付箋の場合は bg/text をペアで複製し、新しい stickyId を割り当てる
    // （従来の clone() は data をそのまま継承するため stickyId が衝突していた）
    if (activeObject.data?.type === 'sticky' && activeObject.data?.stickyRole === 'bg') {
      const originalBg = activeObject
      const originalText = fabricCanvas
        .getObjects()
        .find(
          (o) => o.data?.stickyId === originalBg.data?.stickyId && o.data?.stickyRole === 'text'
        )
      if (!originalText) return
      const newStickyId = crypto.randomUUID()
      const newBgId = crypto.randomUUID()
      const newTextId = crypto.randomUUID()
      const offset = 10
      originalBg.clone((clonedBg: fabric.Object) => {
        originalText.clone((clonedText: fabric.Object) => {
          clonedBg.set({
            left: (clonedBg.left || 0) + offset,
            top: (clonedBg.top || 0) + offset,
            data: {
              ...clonedBg.data,
              id: newBgId,
              stickyId: newStickyId,
              stickyRole: 'bg',
            },
          })
          clonedText.set({
            left: (clonedText.left || 0) + offset,
            top: (clonedText.top || 0) + offset,
            data: {
              ...clonedText.data,
              id: newTextId,
              stickyId: newStickyId,
              stickyRole: 'text',
            },
          })
          fabricCanvas.add(clonedBg)
          fabricCanvas.add(clonedText)
          fabricCanvas.setActiveObject(clonedBg)
          fabricCanvas.renderAll()

          const originalLayer = layers.find((l) => l.objectId === selectedObjectId)
          if (originalLayer) {
            addLayer({
              id: crypto.randomUUID(),
              name: `${originalLayer.name} copy`,
              visible: true,
              locked: false,
              objectId: newBgId,
              type: originalLayer.type,
            })
          }
          setSelectedObjectId(newBgId)
          saveHistory()
        })
      })
      return
    }

    activeObject.clone((cloned: fabric.Object) => {
      const objectId = crypto.randomUUID()
      const layerId = crypto.randomUUID()
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
        data: { ...cloned.data, id: objectId },
      })
      fabricCanvas.add(cloned)
      fabricCanvas.setActiveObject(cloned)
      fabricCanvas.renderAll()

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
      saveHistory()
    })
  }, [fabricCanvas, selectedObjectId, layers, addLayer, setSelectedObjectId, saveHistory])

  // コピー
  const copySelectedObject = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    // 付箋の場合は bg/text をペアでクリップボードに保存
    if (activeObject.data?.type === 'sticky' && activeObject.data?.stickyRole === 'bg') {
      const text = fabricCanvas
        .getObjects()
        .find(
          (o) =>
            o.data?.stickyId === activeObject.data?.stickyId && o.data?.stickyRole === 'text'
        )
      if (text) {
        activeObject.clone((clonedBg: fabric.Object) => {
          text.clone((clonedText: fabric.Object) => {
            setStickyClipboard({ bg: clonedBg, text: clonedText })
            setClipboard(null)
          })
        })
        return
      }
    }

    activeObject.clone((cloned: fabric.Object) => {
      setClipboard(cloned)
      setStickyClipboard(null)
    })
  }, [fabricCanvas, setClipboard, setStickyClipboard])

  // ペースト
  const pasteObject = useCallback(() => {
    if (!fabricCanvas) return

    // 付箋ペーストを優先（copy 時に付箋ペアを保存している場合）
    if (stickyClipboard) {
      const newStickyId = crypto.randomUUID()
      const newBgId = crypto.randomUUID()
      const newTextId = crypto.randomUUID()
      const offset = 10
      stickyClipboard.bg.clone((clonedBg: fabric.Object) => {
        stickyClipboard.text.clone((clonedText: fabric.Object) => {
          clonedBg.set({
            left: (clonedBg.left || 0) + offset,
            top: (clonedBg.top || 0) + offset,
            data: { ...clonedBg.data, id: newBgId, stickyId: newStickyId, stickyRole: 'bg' },
            evented: true,
            selectable: true,
          })
          clonedText.set({
            left: (clonedText.left || 0) + offset,
            top: (clonedText.top || 0) + offset,
            data: {
              ...clonedText.data,
              id: newTextId,
              stickyId: newStickyId,
              stickyRole: 'text',
            },
            evented: true,
            selectable: true,
          })
          fabricCanvas.add(clonedBg)
          fabricCanvas.add(clonedText)
          fabricCanvas.setActiveObject(clonedBg)
          fabricCanvas.renderAll()

          shapeCounterRef.current.sticky = (shapeCounterRef.current.sticky || 0) + 1
          addLayer({
            id: crypto.randomUUID(),
            name: `sticky ${shapeCounterRef.current.sticky}`,
            visible: true,
            locked: false,
            objectId: newBgId,
            type: 'STICKY',
          })
          setSelectedObjectId(newBgId)
          // 連続ペースト時に毎回オフセットが重ならないよう、保存済みペアの位置も更新
          setStickyClipboard({ bg: clonedBg, text: clonedText })
          saveHistory()
        })
      })
      return
    }

    if (!clipboard) return

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
      fabricCanvas.add(cloned)
      fabricCanvas.setActiveObject(cloned)
      fabricCanvas.renderAll()

      shapeCounterRef.current.paste += 1
      addLayer({
        id: layerId,
        name: `paste ${shapeCounterRef.current.paste}`,
        visible: true,
        locked: false,
        objectId: objectId,
        type: 'VECTOR',
      })
      setSelectedObjectId(objectId)
      setClipboard(cloned)
      saveHistory()
    })
  }, [
    fabricCanvas,
    clipboard,
    stickyClipboard,
    addLayer,
    setSelectedObjectId,
    setClipboard,
    setStickyClipboard,
    saveHistory,
  ])

  // 重なり順の変更
  const bringToFront = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (activeObject) {
      fabricCanvas.bringToFront(activeObject)
      fabricCanvas.renderAll()
      saveHistory()
    }
  }, [fabricCanvas, saveHistory])

  const sendToBack = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (activeObject) {
      fabricCanvas.sendToBack(activeObject)
      fabricCanvas.renderAll()
      saveHistory()
    }
  }, [fabricCanvas, saveHistory])

  const bringForward = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (activeObject) {
      fabricCanvas.bringForward(activeObject)
      fabricCanvas.renderAll()
      saveHistory()
    }
  }, [fabricCanvas, saveHistory])

  const sendBackward = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (activeObject) {
      fabricCanvas.sendBackwards(activeObject)
      fabricCanvas.renderAll()
      saveHistory()
    }
  }, [fabricCanvas, saveHistory])

  // ロック/アンロック
  const lockObject = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
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
      fabricCanvas.discardActiveObject()
      fabricCanvas.renderAll()
      saveHistory()
    }
  }, [fabricCanvas, saveHistory])

  const unlockObject = useCallback(() => {
    if (!fabricCanvas || !selectedObjectId) return
    const lockedObject = fabricCanvas.getObjects().find((obj) => obj.data?.id === selectedObjectId)
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
      fabricCanvas.setActiveObject(lockedObject)
      fabricCanvas.renderAll()
      saveHistory()
    }
  }, [fabricCanvas, selectedObjectId, saveHistory])

  // グループ化/解除
  const groupObjects = useCallback(() => {
    if (!fabricCanvas) return
    const activeSelection = fabricCanvas.getActiveObject()
    if (!activeSelection || activeSelection.type !== 'activeSelection') return

    const selection = activeSelection as fabric.ActiveSelection
    const objects = selection.getObjects()
    if (objects.length < 2) return

    const childObjectIds = objects.map((obj) => obj.data?.id).filter((id): id is string => !!id)
    selection.toGroup()
    const group = fabricCanvas.getActiveObject() as fabric.Group

    const groupId = crypto.randomUUID()
    group.set({
      data: { id: groupId },
      subTargetCheck: true,
    })

    shapeCounterRef.current.group += 1
    const childLayerIds = layers
      .filter((layer) => childObjectIds.includes(layer.objectId))
      .map((layer) => layer.id)

    const updatedLayers = layers.map((layer) => {
      if (childObjectIds.includes(layer.objectId)) {
        return { ...layer, parentId: groupId }
      }
      return layer
    })

    updatedLayers.push({
      id: groupId,
      name: `Group ${shapeCounterRef.current.group}`,
      visible: true,
      locked: false,
      objectId: groupId,
      type: 'GROUP',
      children: childLayerIds,
      expanded: true,
    })
    setLayers(updatedLayers)
    setSelectedObjectId(groupId)
    fabricCanvas.renderAll()
    saveHistory()
  }, [fabricCanvas, layers, setLayers, setSelectedObjectId, saveHistory])

  const ungroupObjects = useCallback(() => {
    if (!fabricCanvas) return
    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'group') return

    const group = activeObject as fabric.Group
    const items = group.getObjects()
    const groupId = activeObject.data?.id
    if (group.data?.type === 'arrow') return

    const groupMatrix = group.calcTransformMatrix()
    const clonePromises = items.map(
      (item) =>
        new Promise<{
          clone: fabric.Object
          options: ReturnType<typeof fabric.util.qrDecompose>
          originalId: string | undefined
        }>((resolve) => {
          const itemMatrix = item.calcTransformMatrix()
          const finalMatrix = fabric.util.multiplyTransformMatrices(groupMatrix, itemMatrix)
          const options = fabric.util.qrDecompose(finalMatrix)
          item.clone((cloned: fabric.Object) => {
            resolve({ clone: cloned, options, originalId: item.data?.id })
          })
        })
    )

    Promise.all(clonePromises).then((clonedItems) => {
      fabricCanvas.remove(group)
      const updatedLayers = layers
        .filter((layer) => layer.id !== groupId)
        .map((layer) => {
          if (layer.parentId === groupId) {
            const { parentId, ...rest } = layer
            return rest
          }
          return layer
        })

      clonedItems.forEach(({ clone, options, originalId }) => {
        const itemId = originalId || crypto.randomUUID()
        clone.set({
          left: options.translateX,
          top: options.translateY,
          scaleX: options.scaleX,
          scaleY: options.scaleY,
          angle: options.angle,
          skewX: options.skewX,
          skewY: options.skewY,
          selectable: true,
          evented: true,
          data: { id: itemId },
        })
        clone.setCoords()
        fabricCanvas.add(clone)
      })

      setLayers(updatedLayers as Layer[])
      fabricCanvas.discardActiveObject()
      fabricCanvas.renderAll()
      saveHistory()
    })
  }, [fabricCanvas, layers, setLayers, saveHistory])

  // アライメント
  const getSelectedObjects = useCallback(() => {
    if (!fabricCanvas) return []
    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return []
    if (activeObject.type === 'activeSelection') {
      return (activeObject as fabric.ActiveSelection).getObjects()
    }
    return [activeObject]
  }, [fabricCanvas])

  const alignLeft = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return
    const leftmost = Math.min(...objects.map((obj) => obj.left || 0))
    objects.forEach((obj) => obj.set({ left: leftmost }))
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

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
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

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
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

  const alignTop = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 2) return
    const topmost = Math.min(...objects.map((obj) => obj.top || 0))
    objects.forEach((obj) => obj.set({ top: topmost }))
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

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
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

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
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

  const distributeHorizontal = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 3) return
    const sorted = [...objects].sort((a, b) => (a.left || 0) - (b.left || 0))
    const leftmost = sorted[0].left || 0
    const last = sorted[sorted.length - 1]
    const rightmost = (last.left || 0) + (last.width || 0) * (last.scaleX || 1)
    const totalWidth = sorted.reduce((sum, obj) => sum + (obj.width || 0) * (obj.scaleX || 1), 0)
    const gap = (rightmost - leftmost - totalWidth) / (sorted.length - 1)
    let currentLeft = leftmost
    sorted.forEach((obj) => {
      obj.set({ left: currentLeft })
      currentLeft += (obj.width || 0) * (obj.scaleX || 1) + gap
    })
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

  const distributeVertical = useCallback(() => {
    const objects = getSelectedObjects()
    if (objects.length < 3) return
    const sorted = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0))
    const topmost = sorted[0].top || 0
    const last = sorted[sorted.length - 1]
    const bottommost = (last.top || 0) + (last.height || 0) * (last.scaleY || 1)
    const totalHeight = sorted.reduce((sum, obj) => sum + (obj.height || 0) * (obj.scaleY || 1), 0)
    const gap = (bottommost - topmost - totalHeight) / (sorted.length - 1)
    let currentTop = topmost
    sorted.forEach((obj) => {
      obj.set({ top: currentTop })
      currentTop += (obj.height || 0) * (obj.scaleY || 1) + gap
    })
    fabricCanvas?.renderAll()
    saveHistory()
  }, [fabricCanvas, getSelectedObjects, saveHistory])

  return {
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
  }
}

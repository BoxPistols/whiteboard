import type { StateCreator } from 'zustand'
import type { Layer } from '@/types'
import type { CanvasStore } from '../store'
import {
  persistLayersToStorage,
  flattenLayerTree,
  nextFolderName,
  getDescendantIds,
  syncFabricZOrder,
  findFabricObject,
  findStickyPartnerOnCanvas,
  getCanvasData,
} from '../storeHelpers'

// レイヤーツリー操作のスライス。store.ts(モノリス)からの段階的分割（fabric 依存）。
// fabricCanvas / pages / currentPageId / selectedObjectId 等は get() 経由で参照する。
export interface LayersSlice {
  layers: Layer[]
  // レイヤーパネルの複数選択（Cmd/Shift+クリック）。単一選択時も常に同期する
  selectedLayerIds: string[]
  setSelectedLayerIds: (ids: string[]) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  // 複数レイヤーを一括削除（子孫含む）
  removeLayers: (ids: string[]) => void
  // 選択中レイヤーを新規フォルダにまとめる
  groupLayersIntoFolder: (layerIds: string[], name?: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  updateLayerName: (id: string, name: string) => void
  reorderLayers: (startIndex: number, endIndex: number) => void
  moveLayer: (layerId: string, targetParentId: string | null, targetIndex: number) => void
  toggleLayerExpanded: (id: string) => void
  updateLayerChildren: (parentId: string, childIds: string[]) => void
  createFolder: (name?: string) => void
  setLayers: (layers: Layer[]) => void
}

export const createLayersSlice: StateCreator<CanvasStore, [], [], LayersSlice> = (set, get) => ({
  layers: [],
  selectedLayerIds: [],
  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),
  removeLayers: (ids) =>
    set((state) => {
      const { fabricCanvas } = get()
      if (ids.length === 0) return {}

      // 削除対象（指定IDとその子孫すべて）をまとめて収集し、1回のsetで処理する
      const allIdsToRemove = new Set<string>()
      ids.forEach((id) => {
        allIdsToRemove.add(id)
        getDescendantIds(id, state.layers).forEach((descId) => allIdsToRemove.add(descId))
      })

      // Canvasオブジェクトを一括削除（FRAMEはCanvas上にないのでスキップ）
      if (fabricCanvas) {
        // 削除前にactiveを破棄し、stale な activeSelection を残さない
        fabricCanvas.discardActiveObject()
        allIdsToRemove.forEach((removeId) => {
          const layer = state.layers.find((l) => l.id === removeId)
          if (!layer || layer.type === 'FRAME') return
          const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
          if (obj) fabricCanvas.remove(obj)
        })
        fabricCanvas.renderAll()
      }

      // レイヤー配列から除去しつつ、親のchildrenからも除去
      let updatedLayers = state.layers.filter((l) => !allIdsToRemove.has(l.id))
      updatedLayers = updatedLayers.map((l) =>
        l.children?.some((cid) => allIdsToRemove.has(cid))
          ? { ...l, children: l.children.filter((cid) => !allIdsToRemove.has(cid)) }
          : l
      )

      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)

      // 選択中オブジェクトが削除対象なら selectedObjectId/Props も合わせてクリア
      const removedObjectIds = new Set(
        state.layers.filter((l) => allIdsToRemove.has(l.id)).map((l) => l.objectId)
      )
      const clearSelected = !!state.selectedObjectId && removedObjectIds.has(state.selectedObjectId)

      return {
        ...persistLayersToStorage(state, updatedLayers, canvasData, 'batch layer removal'),
        selectedLayerIds: [],
        ...(clearSelected ? { selectedObjectId: null, selectedObjectProps: null } : {}),
      }
    }),
  addLayer: (layer) =>
    set((state) => {
      const { fabricCanvas } = get()
      const updatedLayers = [...state.layers, layer]
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer addition')
    }),
  removeLayer: (id) =>
    set((state) => {
      const { fabricCanvas } = get()

      // 削除対象のIDリスト（自分自身＋子孫すべて）
      const idsToRemove = [id, ...getDescendantIds(id, state.layers)]

      // Canvasからもオブジェクトを削除（子孫含む、FRAMEはCanvas上にオブジェクトがないのでスキップ）
      if (fabricCanvas) {
        for (const removeId of idsToRemove) {
          const layer = state.layers.find((l) => l.id === removeId)
          if (!layer || layer.type === 'FRAME') continue
          const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
          if (obj) {
            fabricCanvas.remove(obj)
          }
        }
        fabricCanvas.renderAll()
      }

      // 親のchildrenからも除去
      const removedLayer = state.layers.find((l) => l.id === id)
      let updatedLayers = state.layers.filter((l) => !idsToRemove.includes(l.id))
      if (removedLayer?.parentId) {
        updatedLayers = updatedLayers.map((l) => {
          if (l.id === removedLayer.parentId && l.children) {
            return { ...l, children: l.children.filter((cid) => cid !== id) }
          }
          return l
        })
      }

      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer removal')
    }),
  toggleLayerVisibility: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === id)
      if (!layer) return {}

      const newVisible = !layer.visible
      // グループの場合は子孫もカスケード
      const descendantIds = getDescendantIds(id, state.layers)
      const idsToUpdate = [id, ...descendantIds]

      const updatedLayers = state.layers.map((l) =>
        idsToUpdate.includes(l.id) ? { ...l, visible: newVisible } : l
      )

      // Fabric.jsオブジェクトの表示/非表示を切り替え（FRAMEはCanvas上にないのでスキップ）
      if (fabricCanvas) {
        for (const updateId of idsToUpdate) {
          const targetLayer = state.layers.find((l) => l.id === updateId)
          if (!targetLayer || targetLayer.type === 'FRAME') continue

          const obj = findFabricObject(fabricCanvas, targetLayer.objectId)
          if (obj) {
            obj.visible = newVisible
            // 付箋 bg と text は同じレイヤーに属さないが、視覚的に一体なので
            // visibility を相棒にも伝播
            const partner = findStickyPartnerOnCanvas(fabricCanvas, obj)
            if (partner) partner.visible = newVisible
          }
        }
        fabricCanvas.renderAll()
      }

      // 可視状態は fabric の既定 toJSON に乗るが、canvasData を更新しないと
      // リロード時に旧 visible が復元される。新しい canvas 状態を再シリアライズして保存。
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer visibility change')
    }),
  toggleLayerLock: (id) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === id)
      if (!layer) return {}

      const newLockState = !layer.locked
      // グループの場合は子孫もカスケード
      const descendantIds = getDescendantIds(id, state.layers)
      const idsToUpdate = [id, ...descendantIds]

      if (fabricCanvas) {
        const lockProps = {
          lockMovementX: newLockState,
          lockMovementY: newLockState,
          lockRotation: newLockState,
          lockScalingX: newLockState,
          lockScalingY: newLockState,
          hasControls: !newLockState,
          selectable: !newLockState,
          evented: !newLockState,
        }
        for (const updateId of idsToUpdate) {
          const targetLayer = state.layers.find((l) => l.id === updateId)
          if (!targetLayer || targetLayer.type === 'FRAME') continue

          const obj = findFabricObject(fabricCanvas, targetLayer.objectId)
          if (obj) {
            obj.set(lockProps)
            // 付箋 bg と text は同じレイヤーに属さないが、一体で操作できるよう
            // lock 状態を相棒にも伝播
            const partner = findStickyPartnerOnCanvas(fabricCanvas, obj)
            if (partner) partner.set(lockProps)
            if (newLockState && fabricCanvas.getActiveObject() === obj) {
              fabricCanvas.discardActiveObject()
            }
          }
        }
        fabricCanvas.renderAll()
      }

      const updatedLayers = state.layers.map((l) =>
        idsToUpdate.includes(l.id) ? { ...l, locked: newLockState } : l
      )

      // ロック系プロパティ(selectable/evented/lock*)は CANVAS_SERIALIZE_PROPS により
      // canvasData へ round-trip する。新しい canvas 状態を再シリアライズして保存。
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, updatedLayers, canvasData, 'layer lock change')
    }),
  updateLayerName: (id, name) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, name } : layer
      )
      return persistLayersToStorage(state, updatedLayers, undefined, 'layer name change')
    }),
  reorderLayers: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.layers)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)

      // Fabric.jsでのオブジェクトの描画順序も更新
      const { fabricCanvas } = get()
      if (fabricCanvas) {
        syncFabricZOrder(fabricCanvas, result)
        fabricCanvas.renderAll()
      }

      // z-order は canvasData のオブジェクト配列順そのもの。canvasData を更新しないと
      // 新しい並び順とシリアライズ済み順序がズレてリロードで巻き戻る。
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, result, canvasData, 'layer reorder')
    }),
  moveLayer: (layerId, targetParentId, targetIndex) =>
    set((state) => {
      const { fabricCanvas } = get()
      const layer = state.layers.find((l) => l.id === layerId)
      if (!layer) return {}

      // 自分自身や自分の子孫の中には移動できない
      if (targetParentId) {
        const descendantIds = getDescendantIds(layerId, state.layers)
        if (targetParentId === layerId || descendantIds.includes(targetParentId)) {
          return {}
        }
      }

      let updatedLayers = [...state.layers]

      // 1. 旧親のchildrenからlayerIdを除去
      if (layer.parentId) {
        updatedLayers = updatedLayers.map((l) => {
          if (l.id === layer.parentId && l.children) {
            return { ...l, children: l.children.filter((cid) => cid !== layerId) }
          }
          return l
        })
      }

      // 2. 移動元レイヤーのparentIdを更新
      updatedLayers = updatedLayers.map((l) => {
        if (l.id === layerId) {
          return { ...l, parentId: targetParentId || undefined }
        }
        return l
      })

      // 3. 新親のchildrenにlayerIdを挿入
      if (targetParentId) {
        updatedLayers = updatedLayers.map((l) => {
          if (l.id === targetParentId) {
            const currentChildren = (l.children || []).filter((cid) => cid !== layerId)
            const insertIdx = targetIndex < 0 ? currentChildren.length : targetIndex
            const newChildren = [...currentChildren]
            newChildren.splice(insertIdx, 0, layerId)
            return { ...l, children: newChildren, expanded: true }
          }
          return l
        })
      }

      // 4. 全体の配列順序もツリーの表示順に合わせて並べ替え
      // 兄弟間の順序をtargetIndexに基づいて更新
      const siblings = targetParentId
        ? updatedLayers.filter((l) => l.parentId === targetParentId && l.id !== layerId)
        : updatedLayers.filter((l) => !l.parentId && l.id !== layerId)

      const insertIdx = targetIndex < 0 ? siblings.length : Math.min(targetIndex, siblings.length)
      siblings.splice(insertIdx, 0, updatedLayers.find((l) => l.id === layerId)!)

      // 配列全体をツリー順に再構成
      const reordered: Layer[] = []
      const rootLayers = updatedLayers.filter((l) => !l.parentId)
      // ルートの順序をsiblingsで更新（targetParentIdがnullの場合）
      const orderedRoots = targetParentId === null ? siblings : rootLayers

      function reorderTraverse(currentLayerId: string) {
        const l = updatedLayers.find((x) => x.id === currentLayerId)
        if (!l) return
        reordered.push(l)
        // 子の順序
        const childrenOrder =
          targetParentId === currentLayerId
            ? siblings
            : updatedLayers.filter((x) => x.parentId === currentLayerId)
        childrenOrder.forEach((child) => reorderTraverse(child.id))
      }
      orderedRoots.forEach((root) => reorderTraverse(root.id))

      // reorderedに含まれなかったレイヤーも追加（安全対策）
      const reorderedIds = new Set(reordered.map((l) => l.id))
      const remaining = updatedLayers.filter((l) => !reorderedIds.has(l.id))
      const finalLayers = [...reordered, ...remaining]

      // 5. fabric.jsのz-orderをツリーの深さ優先走査順に同期
      if (fabricCanvas) {
        syncFabricZOrder(fabricCanvas, flattenLayerTree(finalLayers))
        fabricCanvas.renderAll()
      }

      // z-order を canvasData に反映（更新しないとリロードでスタッキングが巻き戻る）
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return persistLayersToStorage(state, finalLayers, canvasData, 'layer move')
    }),
  toggleLayerExpanded: (id) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) =>
        layer.id === id ? { ...layer, expanded: !layer.expanded } : layer
      )
      return persistLayersToStorage(state, updatedLayers, undefined, 'layer expanded state')
    }),
  updateLayerChildren: (parentId, childIds) =>
    set((state) => {
      const updatedLayers = state.layers.map((layer) => {
        if (layer.id === parentId) {
          return { ...layer, children: childIds }
        }
        if (childIds.includes(layer.id)) {
          return { ...layer, parentId }
        }
        return layer
      })
      return persistLayersToStorage(state, updatedLayers, undefined, 'layer children')
    }),
  createFolder: (name) =>
    set((state) => {
      const folderId = crypto.randomUUID()
      const folderLayer: Layer = {
        id: folderId,
        name: name || nextFolderName(state.layers),
        visible: true,
        locked: false,
        objectId: folderId,
        type: 'FRAME',
        children: [],
        expanded: true,
      }
      const updatedLayers = [folderLayer, ...state.layers]
      return persistLayersToStorage(state, updatedLayers, undefined, 'folder creation')
    }),
  groupLayersIntoFolder: (layerIds, name) =>
    set((state) => {
      if (!layerIds || layerIds.length === 0) return {}
      const { fabricCanvas } = get()
      const idSet = new Set(layerIds)

      // 別の選択レイヤーの子孫は親ごと移動されるので除外（二重移動防止）
      // while条件で cur と cur.parentId を確認し、非null断言を避ける
      const isDescendantOfSelected = (id: string): boolean => {
        let cur = state.layers.find((l) => l.id === id)
        while (cur && cur.parentId) {
          // parentId をconstに取り出し、クロージャ内での型の絞り込みを保つ
          const parentId = cur.parentId
          if (idSet.has(parentId)) return true
          cur = state.layers.find((l) => l.id === parentId)
        }
        return false
      }
      const targets = layerIds.filter((id) => !isDescendantOfSelected(id))
      if (targets.length === 0) return {}
      const targetSet = new Set(targets)

      // フォルダは最初の選択レイヤーの親階層に配置する
      const firstLayer = state.layers.find((l) => l.id === targets[0])
      const folderParentId = firstLayer?.parentId

      const folderId = crypto.randomUUID()
      const folderLayer: Layer = {
        id: folderId,
        name: name || nextFolderName(state.layers),
        visible: true,
        locked: false,
        objectId: folderId,
        type: 'FRAME',
        parentId: folderParentId ?? undefined,
        children: [...targets],
        expanded: true,
      }

      // 選択レイヤーの parentId を folderId に変更し、旧親 children からは除去
      let updatedLayers = state.layers.map((l) => {
        if (targetSet.has(l.id)) return { ...l, parentId: folderId }
        if (l.children?.some((cid) => targetSet.has(cid))) {
          return { ...l, children: l.children.filter((cid) => !targetSet.has(cid)) }
        }
        return l
      })

      // 新親の children にフォルダを追加
      if (folderParentId) {
        updatedLayers = updatedLayers.map((l) =>
          l.id === folderParentId
            ? { ...l, children: [...(l.children || []), folderId], expanded: true }
            : l
        )
      }

      // 表示順は配列順に依存するため、フォルダを最初の選択レイヤーの位置へ挿入
      const firstIdx = updatedLayers.findIndex((l) => l.id === targets[0])
      updatedLayers.splice(Math.max(firstIdx, 0), 0, folderLayer)

      // 非連続レイヤーのグループ化で表示順が変わるため、Fabric.jsのz-orderを
      // ツリーの深さ優先走査順に同期する（moveLayerと同じ手法）
      if (fabricCanvas) {
        syncFabricZOrder(fabricCanvas, flattenLayerTree(updatedLayers))
        fabricCanvas.renderAll()
      }

      // グループ化で z-order が変わるため canvasData も更新（リロードで巻き戻さない）
      const currentCanvasData =
        state.pages.find((p) => p.id === state.currentPageId)?.canvasData || null
      const canvasData = getCanvasData(fabricCanvas, currentCanvasData)
      return {
        ...persistLayersToStorage(state, updatedLayers, canvasData, 'group into folder'),
        selectedLayerIds: [folderId],
        selectedObjectId: folderId,
      }
    }),
  setLayers: (layers) => {
    // 重複排除：同じidを持つレイヤーを削除
    const seenIds = new Set<string>()
    const uniqueLayers = layers.filter((layer) => {
      if (seenIds.has(layer.id)) {
        return false
      }
      seenIds.add(layer.id)
      return true
    })
    set({ layers: uniqueLayers })
  },
})

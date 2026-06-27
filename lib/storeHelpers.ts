import type { Layer } from '@/types'
import type { fabric } from 'fabric'
import { savePagesToDB } from './storage'

// store.ts(モノリス) が抱えていた、ストア状態に依存しない純粋／パラメータ化済みヘルパー群。
// layers/pages/history/canvas の各アクション（および将来のスライス）が共有するため、
// 中立モジュールへ集約。store.ts への import は型のみ（実行時 erase）で値依存は持たないため
// 循環依存は発生しない（依存方向は store → storeHelpers の一方向）。

// ページ（store 内部型）。canvasData は base64 画像を含むため数MBに達しうる。
export interface Page {
  id: string
  name: string
  canvasData: string | null
  layers: Layer[]
  notes?: string
}

// 現在ページの layers（必要なら canvasData も）を更新し、IndexedDB へ非同期保存する。
export const persistLayersToStorage = (
  state: {
    pages: Page[]
    currentPageId: string
  },
  updatedLayers: Layer[],
  canvasData?: string | null,
  actionName?: string
): { layers: Layer[]; pages: Page[] } => {
  const updatedPages = state.pages.map((page) =>
    page.id === state.currentPageId
      ? { ...page, layers: updatedLayers, ...(canvasData !== undefined && { canvasData }) }
      : page
  )

  if (typeof window !== 'undefined') {
    savePagesToDB(updatedPages).catch((error) => {
      console.error(`Failed to save ${actionName || 'layer change'}:`, error)
    })
  }

  return { layers: updatedLayers, pages: updatedPages }
}

// ツリーを深さ優先で平坦化（レイヤーパネル表示順=z-order）
export function flattenLayerTree(layers: Layer[]): Layer[] {
  const rootLayers = layers.filter((l) => !l.parentId)
  const result: Layer[] = []
  function traverse(layerId: string) {
    const layer = layers.find((l) => l.id === layerId)
    if (!layer) return
    result.push(layer)
    const children = layers.filter((l) => l.parentId === layerId)
    children.forEach((child) => traverse(child.id))
  }
  rootLayers.forEach((l) => traverse(l.id))
  return result
}

// フォルダ既定名のプレフィックス（ハードコード禁止のため定数化）
export const FOLDER_NAME_PREFIX = 'フォルダ'

// 次のフォルダ既定名を採番する。
// 「該当プレフィックスで始まる件数 + 1」だと、既存フォルダをリネームした瞬間に
// 件数が減って番号が衝突する（同名フォルダができる）。末尾数字の最大値から
// 採番することでリネーム後も衝突しない。
export const nextFolderName = (layers: Layer[]): string => {
  const re = new RegExp(`^${FOLDER_NAME_PREFIX}\\s*(\\d+)$`)
  let max = 0
  for (const l of layers) {
    if (l.type !== 'FRAME') continue
    const m = l.name.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${FOLDER_NAME_PREFIX} ${max + 1}`
}

// 子孫レイヤーIDを再帰的に取得
export function getDescendantIds(layerId: string, layers: Layer[]): string[] {
  const children = layers.filter((l) => l.parentId === layerId)
  return children.flatMap((child) => [child.id, ...getDescendantIds(child.id, layers)])
}

// レイヤーのパネル表示順（先頭=最前面）に合わせて fabric の z-order を同期する。
// FRAME（フォルダ）等 canvas オブジェクトを持たないレイヤーはインデックス空間から
// 除外し、実オブジェクトだけを詰めて moveTo する。これをしないと length にフレームが
// 混ざり、フレーム混在時に重なり順がズレる（CodeRabbit 指摘）。
// objectId→object の Map を一度だけ構築して O(n) で解決する（getObjects().find の O(n^2) 回避）。
export const syncFabricZOrder = (fabricCanvas: fabric.Canvas, orderedLayers: Layer[]): void => {
  const byId = new Map<string, fabric.Object>()
  for (const obj of fabricCanvas.getObjects()) {
    const oid = obj.data?.id
    if (oid) byId.set(oid, obj)
  }
  const objectsInOrder = orderedLayers
    .map((l) => byId.get(l.objectId))
    .filter((o): o is fabric.Object => !!o)
  // 先頭(パネル最上)=最前面 → 末尾の canvas index を割り当てる
  objectsInOrder.forEach((obj, i) => {
    fabricCanvas.moveTo(obj, objectsInOrder.length - 1 - i)
  })
}

// fabricCanvasからobjectIdでオブジェクトを検索（直下→グループ内）
export const findFabricObject = (
  fabricCanvas: fabric.Canvas,
  objectId: string
): fabric.Object | null => {
  // キャンバス直下で探す
  const obj = fabricCanvas.getObjects().find((o) => o.data?.id === objectId)
  if (obj) return obj
  // グループ内を探す
  for (const canvasObj of fabricCanvas.getObjects()) {
    if (canvasObj.type === 'group') {
      const group = canvasObj as fabric.Group
      const found = group.getObjects().find((o) => o.data?.id === objectId)
      if (found) return found
    }
  }
  return null
}

// 付箋ペア（bg/text）の相棒を取得。obj が付箋パーツでなければ null
export const findStickyPartnerOnCanvas = (
  fabricCanvas: fabric.Canvas,
  obj: fabric.Object
): fabric.Object | null => {
  const stickyId = obj.data?.stickyId
  if (!stickyId) return null
  return fabricCanvas.getObjects().find((o) => o.data?.stickyId === stickyId && o !== obj) || null
}

// canvas シリアライズ時に既定プロパティへ追加で含めるプロパティ。
// fabric v5 の toJSON 既定出力には lock/selectable/evented が含まれないため、
// これらを明示しないとリロード/ページ切替/Undo でロック状態が失われる
// （visible は既定で含まれるが、ロック系は含めないと round-trip しない）。
// 全シリアライズ箇所（getCanvasData / 自動保存 / ページ切替 / 履歴 / エクスポート）で
// 同一の配列を使い、保存と復元のプロパティ集合を一致させる。
export const CANVAS_SERIALIZE_PROPS = [
  'data',
  'selectable',
  'evented',
  'hasControls',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
]

// 全オブジェクトのバウンディングボックスを集計する（zoomToFit / resetView 共通）
export const computeObjectsBoundingBox = (objects: fabric.Object[]) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const obj of objects) {
    const b = obj.getBoundingRect()
    minX = Math.min(minX, b.left)
    minY = Math.min(minY, b.top)
    maxX = Math.max(maxX, b.left + b.width)
    maxY = Math.max(maxY, b.top + b.height)
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

// fabricCanvasからcanvasDataを取得するヘルパー関数
export const getCanvasData = (
  fabricCanvas: fabric.Canvas | null,
  currentCanvasData: string | null
): string | null => {
  if (!fabricCanvas) return currentCanvasData
  try {
    return JSON.stringify(fabricCanvas.toJSON(CANVAS_SERIALIZE_PROPS))
  } catch (error) {
    console.error('Failed to serialize canvas:', error)
    return currentCanvasData
  }
}

import type { StateCreator } from 'zustand'
import type { fabric } from 'fabric'
import type { CanvasStore } from '../store'
import { computeObjectsBoundingBox } from '../storeHelpers'

// ズーム率の下限/上限（%）。Figma 同様に広いレンジを許可する。
// ズームドメインの定数なので viewportSlice に定義し、store.ts からは re-export して後方互換維持。
export const MIN_ZOOM = 2
export const MAX_ZOOM = 800

// ズーム/ビューポート操作のスライス。store.ts(モノリス)からの段階的分割（fabric 依存）。
// fabricCanvas / selectedObjectId など他スライスの状態は get() 経由で参照する。
export interface ViewportSlice {
  zoom: number
  setZoom: (zoom: number) => void
  setZoomValue: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomToSelection: () => void
  resetZoom: () => void
  resetView: () => void
}

export const createViewportSlice: StateCreator<CanvasStore, [], [], ViewportSlice> = (
  set,
  get
) => ({
  zoom: 100,
  setZoom: (zoom) => {
    const { fabricCanvas } = get()
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    if (fabricCanvas) {
      // Figma 同様にビューポート中心を固定してズームする。
      // fabricCanvas.setZoom は origin(0,0) 基準で内容が左上へ寄るため使わない。
      // store は fabric を type-only import しているため new fabric.Point は使えない。
      // zoomToPoint は point.x/point.y のみ参照するので素のオブジェクトで十分。
      const center = { x: fabricCanvas.getWidth() / 2, y: fabricCanvas.getHeight() / 2 }
      fabricCanvas.zoomToPoint(center as fabric.Point, clamped / 100)
      fabricCanvas.renderAll()
    }
    set({ zoom: Math.round(clamped) })
  },
  // 数値表示のみ更新（fabric への再適用はしない）。
  // ホイールズームは zoomToPoint でカーソル位置基準に既に適用済みのため、
  // setZoom を使うと origin(0,0) 基準で再適用され二重がけになる。それを避ける用途。
  setZoomValue: (zoom) => set({ zoom }),
  // キーボード/ボタンからのズームイン・アウト（setZoom はビューポート中心基準＋クランプ済み）
  zoomIn: () => get().setZoom(get().zoom + 25),
  zoomOut: () => get().setZoom(get().zoom - 25),
  zoomToFit: () => {
    const { fabricCanvas } = get()
    if (!fabricCanvas) return

    const canvasWidth = fabricCanvas.getWidth()
    const canvasHeight = fabricCanvas.getHeight()

    // すべてのオブジェクトを取得して範囲を計算
    const objects = fabricCanvas.getObjects()
    if (objects.length === 0) {
      get().resetZoom()
      return
    }

    const { width: groupWidth, height: groupHeight } = computeObjectsBoundingBox(objects)

    // 適切なズームレベルを計算（余白10%）
    const zoomX = (canvasWidth * 0.9) / groupWidth
    const zoomY = (canvasHeight * 0.9) / groupHeight
    const zoom = Math.min(zoomX, zoomY) * 100

    get().setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)))
  },
  zoomToSelection: () => {
    const { fabricCanvas, selectedObjectId } = get()
    if (!fabricCanvas || !selectedObjectId) return

    const activeObject = fabricCanvas.getActiveObject()
    if (!activeObject) return

    const canvasWidth = fabricCanvas.getWidth()
    const canvasHeight = fabricCanvas.getHeight()

    // オブジェクトのバウンディングボックスを取得（現在のtransformを考慮）
    const bound = activeObject.getBoundingRect()
    const objectCenterX = bound.left + bound.width / 2
    const objectCenterY = bound.top + bound.height / 2

    // 適切なズームレベルを計算（余白20%）
    const zoomX = (canvasWidth * 0.8) / bound.width
    const zoomY = (canvasHeight * 0.8) / bound.height
    let zoom = Math.min(zoomX, zoomY) * 100
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

    // オブジェクトを中心にビューポートを移動（オブジェクト自体は動かさない）
    const zoomLevel = zoom / 100
    const vpCenterX = canvasWidth / 2
    const vpCenterY = canvasHeight / 2

    // 現在のビューポート座標でのオブジェクト中心を計算
    const currentVpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
    const currentZoom = currentVpt[0]
    // 画面座標からキャンバス座標に変換
    const objCanvasX = (objectCenterX - currentVpt[4]) / currentZoom
    const objCanvasY = (objectCenterY - currentVpt[5]) / currentZoom

    // 新しいパン位置を計算（オブジェクトがビューポート中央に来るように）
    const panX = vpCenterX - objCanvasX * zoomLevel
    const panY = vpCenterY - objCanvasY * zoomLevel

    fabricCanvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, panX, panY])
    set({ zoom: Math.round(zoom) })
    fabricCanvas.renderAll()
  },
  resetZoom: () => {
    const { fabricCanvas } = get()
    if (fabricCanvas) {
      // ビューポートのtransformをリセット（初期位置に戻す）
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    }
    get().setZoom(100)
  },
  // 全体俯瞰（すべてのオブジェクトが見えるようにズームと位置を調整）
  resetView: () => {
    const { fabricCanvas } = get()
    if (!fabricCanvas) return

    // まずビューポートをリセット
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])

    const objects = fabricCanvas.getObjects()
    if (objects.length === 0) {
      // オブジェクトがない場合は100%表示
      get().setZoom(100)
      return
    }

    const canvasWidth = fabricCanvas.getWidth()
    const canvasHeight = fabricCanvas.getHeight()

    // オブジェクト全体が収まるようにズームと位置を調整
    const {
      width: groupWidth,
      height: groupHeight,
      centerX,
      centerY,
    } = computeObjectsBoundingBox(objects)

    // 適切なズームレベルを計算（余白10%）
    const zoomX = (canvasWidth * 0.9) / groupWidth
    const zoomY = (canvasHeight * 0.9) / groupHeight
    let zoom = Math.min(zoomX, zoomY) * 100

    // resetView は俯瞰用途のため 100% を上限（拡大しない）。zoomToFit とは意図的に異なる。
    zoom = Math.min(zoom, 100)
    zoom = Math.max(zoom, 10)

    // オブジェクトを中央に配置
    const vpCenterX = canvasWidth / 2
    const vpCenterY = canvasHeight / 2

    const zoomLevel = zoom / 100
    const panX = vpCenterX - centerX * zoomLevel
    const panY = vpCenterY - centerY * zoomLevel

    fabricCanvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, panX, panY])
    set({ zoom: Math.round(zoom) })
    fabricCanvas.renderAll()
  },
})

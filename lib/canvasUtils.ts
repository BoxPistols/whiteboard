import { fabric } from 'fabric'
import type { NodeType } from '@/types'

/**
 * ツール名をFigmaのNodeTypeに変換する
 */
export const toolToNodeType = (tool: string): NodeType => {
  switch (tool) {
    case 'rectangle':
      return 'RECTANGLE'
    case 'circle':
      return 'ELLIPSE'
    case 'line':
      return 'LINE'
    case 'text':
      return 'TEXT'
    case 'sticky':
      return 'STICKY'
    default:
      return 'VECTOR'
  }
}

/**
 * 矢印のSVGパス文字列を生成する（ローカル座標系、水平方向）
 */
export const createArrowPathData = (length: number, headLength = 15, headWidth = 12): string => {
  const halfLen = length / 2
  // 矢印が短い場合、ヘッドサイズを調整
  const hl = Math.min(headLength, length * 0.4)
  const hw = Math.min(headWidth, length * 0.3) / 2

  // 線の軸: 左端から矢じり手前まで（開いたサブパス → strokeのみ）
  // 矢じり: 三角形（閉じたサブパス → fill + stroke）
  return [
    `M ${-halfLen} 0`,
    `L ${halfLen - hl} 0`,
    `M ${halfLen - hl} ${-hw}`,
    `L ${halfLen} 0`,
    `L ${halfLen - hl} ${hw}`,
    'Z',
  ].join(' ')
}

/**
 * 矢印Pathオブジェクトを共通オプション付きで生成するファクトリ
 */
export const createArrowObject = (
  pathData: string,
  options: Partial<fabric.IPathOptions>
): fabric.Path => {
  return new fabric.Path(pathData, {
    strokeLineJoin: 'round',
    originX: 'center',
    originY: 'center',
    ...options,
  })
}

/**
 * クライアント座標をキャンバス座標に変換する
 */
export const getCanvasPointer = (e: MouseEvent | TouchEvent, canvas: fabric.Canvas) => {
  let clientX: number, clientY: number

  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else if ('clientX' in e) {
    clientX = e.clientX
    clientY = e.clientY
  } else {
    return { x: 0, y: 0 }
  }

  const canvasElement = canvas.getElement()
  const rect = canvasElement.getBoundingClientRect()
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
  const zoom = canvas.getZoom()

  return {
    x: (clientX - rect.left - vpt[4]) / zoom,
    y: (clientY - rect.top - vpt[5]) / zoom,
  }
}

/**
 * オブジェクトの中心座標を取得
 */
export const getObjectCenter = (obj: fabric.Object) => {
  const center = obj.getCenterPoint()
  return { x: center.x, y: center.y }
}

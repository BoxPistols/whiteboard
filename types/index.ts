export type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'text' | 'pencil'

// Figma Plugin API互換のノード型定義
export type NodeType = 'RECTANGLE' | 'ELLIPSE' | 'LINE' | 'TEXT' | 'VECTOR'

export interface BaseNode {
  id: string
  type: NodeType
  name: string
  visible: boolean
  locked: boolean
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL'
  color?: RGB
  opacity?: number
}

export interface RGB {
  r: number  // 0-1
  g: number  // 0-1
  b: number  // 0-1
}

export interface RectangleNode extends BaseNode {
  type: 'RECTANGLE'
  fills: Paint[]
  strokes: Paint[]
  strokeWeight: number
  cornerRadius: number
}

export interface EllipseNode extends BaseNode {
  type: 'ELLIPSE'
  fills: Paint[]
  strokes: Paint[]
  strokeWeight: number
}

export interface LineNode extends BaseNode {
  type: 'LINE'
  strokes: Paint[]
  strokeWeight: number
}

export interface TextNode extends BaseNode {
  type: 'TEXT'
  characters: string
  fontSize: number
  fontName: { family: string; style: string }
  fills: Paint[]
}

export type FigmaNode = RectangleNode | EllipseNode | LineNode | TextNode

// レイヤー管理用の内部型
export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  objectId: string
  type: NodeType
}

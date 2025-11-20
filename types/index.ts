// ツール選択用の型定義
export type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'pencil'

// Figma互換のノード型定義
export type NodeType = 'RECTANGLE' | 'ELLIPSE' | 'LINE' | 'TEXT' | 'VECTOR'

// レイヤー管理用の型定義
export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  objectId: string
  type: NodeType
}

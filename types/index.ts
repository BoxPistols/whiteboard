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

// ショートカット関連の型定義
export type ShortcutCategory = 'tools' | 'edit' | 'view' | 'arrange' | 'group'

export interface ShortcutModifiers {
  ctrl?: boolean
  meta?: boolean // Cmd on Mac
  shift?: boolean
  alt?: boolean
}

export interface ShortcutConfig {
  id: string
  action: string // アクション識別子
  defaultKey: string // デフォルトのキー
  customKey?: string // ユーザーカスタムのキー
  modifiers: ShortcutModifiers
  category: ShortcutCategory
  label: string // 表示名
  description: string // 説明
}

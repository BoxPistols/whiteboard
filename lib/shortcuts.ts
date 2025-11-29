import type { ShortcutConfig } from '@/types'

// デフォルトのショートカット設定
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // ツール系
  {
    id: 'tool-select',
    action: 'setTool:select',
    defaultKey: 'v',
    modifiers: {},
    category: 'tools',
    label: '選択ツール',
    description: 'オブジェクトを選択・移動',
  },
  {
    id: 'tool-rectangle',
    action: 'setTool:rectangle',
    defaultKey: 'r',
    modifiers: {},
    category: 'tools',
    label: '矩形ツール',
    description: '四角形を描画',
  },
  {
    id: 'tool-circle',
    action: 'setTool:circle',
    defaultKey: 'o',
    modifiers: {},
    category: 'tools',
    label: '楕円ツール',
    description: '円・楕円を描画',
  },
  {
    id: 'tool-line',
    action: 'setTool:line',
    defaultKey: 'l',
    modifiers: {},
    category: 'tools',
    label: '線ツール',
    description: '直線を描画',
  },
  {
    id: 'tool-arrow',
    action: 'setTool:arrow',
    defaultKey: 'l',
    modifiers: { shift: true },
    category: 'tools',
    label: '矢印ツール',
    description: '矢印付きの線を描画',
  },
  {
    id: 'tool-text',
    action: 'setTool:text',
    defaultKey: 't',
    modifiers: {},
    category: 'tools',
    label: 'テキストツール',
    description: 'テキストを追加',
  },
  {
    id: 'tool-pencil',
    action: 'setTool:pencil',
    defaultKey: 'p',
    modifiers: {},
    category: 'tools',
    label: 'ペンシルツール',
    description: '自由に描画',
  },

  // 編集系
  {
    id: 'edit-copy',
    action: 'copy',
    defaultKey: 'c',
    modifiers: { meta: true },
    category: 'edit',
    label: 'コピー',
    description: '選択オブジェクトをコピー',
  },
  {
    id: 'edit-paste',
    action: 'paste',
    defaultKey: 'v',
    modifiers: { meta: true },
    category: 'edit',
    label: 'ペースト',
    description: 'クリップボードから貼り付け',
  },
  {
    id: 'edit-duplicate',
    action: 'duplicate',
    defaultKey: 'd',
    modifiers: { meta: true },
    category: 'edit',
    label: '複製',
    description: '選択オブジェクトを複製',
  },
  {
    id: 'edit-delete',
    action: 'delete',
    defaultKey: 'backspace',
    modifiers: {},
    category: 'edit',
    label: '削除',
    description: '選択オブジェクトを削除',
  },

  // グループ系
  {
    id: 'group-create',
    action: 'group',
    defaultKey: 'g',
    modifiers: { meta: true },
    category: 'group',
    label: 'グループ化',
    description: '選択オブジェクトをグループ化',
  },
  {
    id: 'group-ungroup',
    action: 'ungroup',
    defaultKey: 'g',
    modifiers: { meta: true, shift: true },
    category: 'group',
    label: 'グループ解除',
    description: 'グループを解除',
  },

  // 配置系
  {
    id: 'arrange-front',
    action: 'bringToFront',
    defaultKey: ']',
    modifiers: { meta: true, shift: true },
    category: 'arrange',
    label: '最前面へ',
    description: 'オブジェクトを最前面に移動',
  },
  {
    id: 'arrange-back',
    action: 'sendToBack',
    defaultKey: '[',
    modifiers: { meta: true, shift: true },
    category: 'arrange',
    label: '最背面へ',
    description: 'オブジェクトを最背面に移動',
  },

  // 表示/ズーム系
  {
    id: 'view-zoom100',
    action: 'resetZoom',
    defaultKey: '0',
    modifiers: { shift: true },
    category: 'view',
    label: '100%表示',
    description: 'ズームを100%にリセット',
  },
  {
    id: 'view-zoomFit',
    action: 'zoomToFit',
    defaultKey: '1',
    modifiers: { shift: true },
    category: 'view',
    label: '全体表示',
    description: 'すべてのオブジェクトが見えるようにズーム',
  },
  {
    id: 'view-zoomSelection',
    action: 'zoomToSelection',
    defaultKey: '2',
    modifiers: { shift: true },
    category: 'view',
    label: '選択範囲にズーム',
    description: '選択オブジェクトにフォーカス',
  },
  {
    id: 'view-shortcuts',
    action: 'showShortcuts',
    defaultKey: '/',
    modifiers: { meta: true, shift: true },
    category: 'view',
    label: 'ショートカット一覧',
    description: 'ショートカットキーの一覧を表示',
  },
]

// カテゴリの表示名
export const CATEGORY_LABELS: Record<string, string> = {
  tools: 'ツール',
  edit: '編集',
  group: 'グループ',
  arrange: '配置',
  view: '表示',
}

// キーの表示名マッピング
export const KEY_DISPLAY_NAMES: Record<string, string> = {
  backspace: 'Backspace',
  delete: 'Delete',
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  enter: 'Enter',
  escape: 'Esc',
  tab: 'Tab',
}

// ショートカットの表示文字列を生成
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = []

  if (shortcut.modifiers.meta) {
    parts.push('⌘')
  }
  if (shortcut.modifiers.ctrl) {
    parts.push('Ctrl')
  }
  if (shortcut.modifiers.alt) {
    parts.push('Alt')
  }
  if (shortcut.modifiers.shift) {
    parts.push('⇧')
  }

  const key = shortcut.customKey || shortcut.defaultKey
  const displayKey = KEY_DISPLAY_NAMES[key.toLowerCase()] || key.toUpperCase()
  parts.push(displayKey)

  return parts.join(' + ')
}

// キーイベントがショートカットにマッチするかチェック
export function matchesShortcut(e: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  const key = shortcut.customKey || shortcut.defaultKey
  const keyMatches = e.key.toLowerCase() === key.toLowerCase()

  const metaMatches = shortcut.modifiers.meta ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey
  const shiftMatches = shortcut.modifiers.shift ? e.shiftKey : !e.shiftKey
  const altMatches = shortcut.modifiers.alt ? e.altKey : !e.altKey

  return keyMatches && metaMatches && shiftMatches && altMatches
}

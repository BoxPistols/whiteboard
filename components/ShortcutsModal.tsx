'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCanvasStore } from '@/lib/store'
import { formatShortcut, CATEGORY_LABELS } from '@/lib/shortcuts'
import type { ShortcutConfig, ShortcutCategory, ShortcutModifiers } from '@/types'

export default function ShortcutsModal() {
  const {
    showShortcutsModal,
    setShowShortcutsModal,
    shortcuts,
    updateShortcut,
    resetShortcuts,
    nudgeAmount,
    setNudgeAmount,
  } = useCanvasStore()

  const [activeTab, setActiveTab] = useState<'list' | 'customize' | 'settings'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string>('')
  const [pendingModifiers, setPendingModifiers] = useState<ShortcutModifiers>({})

  // カテゴリ別にショートカットをグループ化
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<ShortcutCategory, ShortcutConfig[]>
  )

  // キー入力ハンドラー（カスタマイズ時）
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editingId) return

      e.preventDefault()
      e.stopPropagation()

      // 修飾キーのみの場合は無視
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        return
      }

      const modifiers: ShortcutModifiers = {
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      }

      setPendingKey(e.key.toLowerCase())
      setPendingModifiers(modifiers)
    },
    [editingId]
  )

  // キー入力リスナーの設定
  useEffect(() => {
    if (editingId) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingId, handleKeyDown])

  // 編集を確定
  const confirmEdit = useCallback(() => {
    if (editingId && pendingKey) {
      updateShortcut(editingId, pendingKey, pendingModifiers)
    }
    setEditingId(null)
    setPendingKey('')
    setPendingModifiers({})
  }, [editingId, pendingKey, pendingModifiers, updateShortcut])

  // 編集をキャンセル
  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setPendingKey('')
    setPendingModifiers({})
  }, [])

  // 編集開始
  const startEdit = useCallback((id: string) => {
    setEditingId(id)
    setPendingKey('')
    setPendingModifiers({})
  }, [])

  // 競合チェック
  const checkConflict = useCallback(
    (key: string, modifiers: ShortcutModifiers, excludeId: string) => {
      return shortcuts.find((s) => {
        if (s.id === excludeId) return false
        const sKey = s.customKey || s.defaultKey
        const keyMatches = sKey.toLowerCase() === key.toLowerCase()
        const modifiersMatch =
          !!s.modifiers.meta === !!modifiers.meta &&
          !!s.modifiers.ctrl === !!modifiers.ctrl &&
          !!s.modifiers.shift === !!modifiers.shift &&
          !!s.modifiers.alt === !!modifiers.alt
        return keyMatches && modifiersMatch
      })
    },
    [shortcuts]
  )

  if (!showShortcutsModal) return null

  const conflict =
    editingId && pendingKey ? checkConflict(pendingKey, pendingModifiers, editingId) : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            キーボードショートカット
          </h2>
          <button
            onClick={() => setShowShortcutsModal(false)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="閉じる"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-600 dark:text-gray-400"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            一覧
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'customize'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            カスタマイズ
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            設定
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'list' && (
            <div className="space-y-6">
              {(Object.keys(groupedShortcuts) as ShortcutCategory[]).map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <div className="space-y-2">
                    {groupedShortcuts[category]?.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {shortcut.label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {shortcut.description}
                          </div>
                        </div>
                        <kbd className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-mono text-sm">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                ショートカットを変更するには、変更したい項目をクリックし、新しいキーを押してください。
              </div>

              {(Object.keys(groupedShortcuts) as ShortcutCategory[]).map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <div className="space-y-2">
                    {groupedShortcuts[category]?.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {shortcut.label}
                          </div>
                        </div>
                        {editingId === shortcut.id ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={`px-3 py-1.5 border-2 rounded font-mono text-sm min-w-[100px] text-center ${
                                conflict
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                  : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              }`}
                            >
                              {pendingKey
                                ? formatShortcut({
                                    ...shortcut,
                                    customKey: pendingKey,
                                    modifiers: pendingModifiers,
                                  })
                                : '入力待ち...'}
                            </div>
                            <button
                              onClick={confirmEdit}
                              disabled={!pendingKey || !!conflict}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(shortcut.id)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono text-sm transition-colors"
                          >
                            {formatShortcut(shortcut)}
                            {shortcut.customKey && (
                              <span className="ml-2 text-blue-500 text-xs">(カスタム)</span>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {conflict && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                  このショートカットは「{conflict.label}」と競合しています。
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  ナッジ設定
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="mb-4">
                    <label
                      htmlFor="nudgeAmount"
                      className="block font-medium text-gray-900 dark:text-gray-100 mb-2"
                    >
                      Shift + 矢印キーの移動量
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Shiftキーを押しながら矢印キーを押したときに移動するピクセル数を設定します。
                      <br />
                      通常の矢印キーは1pxずつ移動します。
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        id="nudgeAmount"
                        type="number"
                        min="1"
                        max="100"
                        value={nudgeAmount}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          if (!isNaN(value) && value > 0 && value <= 100) {
                            setNudgeAmount(value)
                          }
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-gray-600 dark:text-gray-400">px</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">使い方</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>
                        •{' '}
                        <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                          ↑ ↓ ← →
                        </kbd>{' '}
                        : 1pxずつ移動
                      </li>
                      <li>
                        •{' '}
                        <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                          Shift + ↑ ↓ ← →
                        </kbd>{' '}
                        : {nudgeAmount}pxずつ移動
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  Undo / Redo
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    操作の履歴は最大20回まで保存されます。
                  </p>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>
                      •{' '}
                      <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        ⌘ + Z
                      </kbd>{' '}
                      : 元に戻す (Undo)
                    </li>
                    <li>
                      •{' '}
                      <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        ⌘ + Shift + Z
                      </kbd>{' '}
                      : やり直し (Redo)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between">
          {activeTab === 'customize' && (
            <button
              onClick={resetShortcuts}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              デフォルトに戻す
            </button>
          )}
          <button
            onClick={() => setShowShortcutsModal(false)}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

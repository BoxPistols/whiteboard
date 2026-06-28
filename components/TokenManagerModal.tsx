'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '@/lib/store'
import { useModalA11y } from '@/lib/useModalA11y'
import HexColorInput from './HexColorInput'
import NumberInput from './NumberInput'
import type { DesignToken, TokenType, ModeId, TokenValue } from '@/lib/tokens/tokenTypes'
import {
  TOKEN_LABELS,
  TOKEN_TYPE_LABELS,
  TOKEN_TYPE_DEFAULT_VALUE,
} from '@/lib/tokens/tokenConstants'

const TOKEN_TYPES: TokenType[] = ['color', 'dimension', 'number']

// 値表示用: token.type に応じて HexColorInput / NumberInput を出し分け
function ValueEditor({
  token,
  mode,
  onChange,
}: {
  token: DesignToken
  mode: ModeId
  onChange: (value: TokenValue) => void
}) {
  const raw = token.values[mode]
  if (token.type === 'color') {
    const color = typeof raw === 'string' ? raw : '#000000'
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer shrink-0"
          aria-label={TOKEN_LABELS.value}
        />
        <HexColorInput
          value={color}
          onChange={onChange}
          className="w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
        />
      </div>
    )
  }
  const num = typeof raw === 'number' ? raw : Number(raw) || 0
  return (
    <NumberInput
      value={num}
      onValueChange={onChange}
      aria-label={TOKEN_LABELS.value}
      className="w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    />
  )
}

export default function TokenManagerModal() {
  const showTokenManager = useCanvasStore((s) => s.showTokenManager)
  const setShowTokenManager = useCanvasStore((s) => s.setShowTokenManager)
  const tokensData = useCanvasStore((s) => s.tokensData)
  const addCollection = useCanvasStore((s) => s.addCollection)
  const removeCollection = useCanvasStore((s) => s.removeCollection)
  const renameCollection = useCanvasStore((s) => s.renameCollection)
  const addMode = useCanvasStore((s) => s.addMode)
  const removeMode = useCanvasStore((s) => s.removeMode)
  const addToken = useCanvasStore((s) => s.addToken)
  const updateToken = useCanvasStore((s) => s.updateToken)
  const removeToken = useCanvasStore((s) => s.removeToken)

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<ModeId | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setShowTokenManager(false), [setShowTokenManager])
  useModalA11y(showTokenManager, close, panelRef)

  // 選択中コレクション（未選択時は先頭）
  const collection = useMemo(() => {
    const id = selectedCollectionId ?? tokensData.collections[0]?.id
    return tokensData.collections.find((c) => c.id === id) ?? tokensData.collections[0] ?? null
  }, [selectedCollectionId, tokensData.collections])

  // アクティブモード（未選択時はコレクションの先頭モード）
  const mode: ModeId | null = useMemo(() => {
    if (!collection) return null
    if (activeMode && collection.modeIds.includes(activeMode)) return activeMode
    return collection.modeIds[0] ?? null
  }, [activeMode, collection])

  const modeName = (id: ModeId) => tokensData.modes.find((m) => m.id === id)?.name ?? id

  const collectionTokens = useMemo(
    () => (collection ? tokensData.tokens.filter((t) => t.collectionId === collection.id) : []),
    [collection, tokensData.tokens]
  )

  // トークンの型を変更したら、全モードの値を新しい型のデフォルトで再シードする（不正値混入を防ぐ）
  const handleTypeChange = (token: DesignToken, type: TokenType) => {
    const values: Record<ModeId, TokenValue> = Object.fromEntries(
      Object.keys(token.values).map((m) => [m, TOKEN_TYPE_DEFAULT_VALUE[type]])
    )
    updateToken(token.id, { type, values })
  }

  const setTokenValue = (token: DesignToken, m: ModeId, value: TokenValue) => {
    updateToken(token.id, { values: { ...token.values, [m]: value } })
  }

  if (!showTokenManager) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-manager-title"
        tabIndex={-1}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="token-manager-title"
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            {TOKEN_LABELS.panelTitle}
          </h2>
          <button
            onClick={close}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={TOKEN_LABELS.close}
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

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* コレクション一覧 */}
          <div className="w-56 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              {TOKEN_LABELS.collections}
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {tokensData.collections.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-1 rounded px-2 py-1 ${
                    collection?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <button
                    onClick={() => setSelectedCollectionId(c.id)}
                    className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100 truncate"
                  >
                    {c.name}
                  </button>
                  {tokensData.collections.length > 1 && (
                    <button
                      onClick={() => {
                        removeCollection(c.id)
                        if (collection?.id === c.id) setSelectedCollectionId(null)
                      }}
                      className="text-gray-400 hover:text-red-500 text-xs px-1"
                      aria-label={`${c.name} ${TOKEN_LABELS.remove}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => addCollection(TOKEN_LABELS.newCollectionName)}
              className="m-2 px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              + {TOKEN_LABELS.addCollection}
            </button>
          </div>

          {/* 選択コレクションの編集 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {collection ? (
              <>
                {/* コレクション名 + モードタブ */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
                  <input
                    value={collection.name}
                    onChange={(e) => renameCollection(collection.id, e.target.value)}
                    className="w-full px-2 py-1 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    aria-label={TOKEN_LABELS.rename}
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      {TOKEN_LABELS.modes}:
                    </span>
                    {collection.modeIds.map((mid) => (
                      <div key={mid} className="flex items-center">
                        <button
                          onClick={() => setActiveMode(mid)}
                          className={`px-2 py-1 text-xs rounded-l ${
                            mode === mid
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {modeName(mid)}
                        </button>
                        {tokensData.modes.length > 1 && (
                          <button
                            onClick={() => removeMode(mid)}
                            className="px-1 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-r"
                            aria-label={`${modeName(mid)} ${TOKEN_LABELS.remove}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addMode(TOKEN_LABELS.newModeName)}
                      className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      + {TOKEN_LABELS.addMode}
                    </button>
                  </div>
                </div>

                {/* トークン行 */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {collectionTokens.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                      {TOKEN_LABELS.tokens}: 0
                    </p>
                  )}
                  {collectionTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <input
                        value={token.name}
                        onChange={(e) => updateToken(token.id, { name: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                        aria-label={TOKEN_LABELS.name}
                      />
                      <select
                        value={token.type}
                        onChange={(e) => handleTypeChange(token, e.target.value as TokenType)}
                        className="px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shrink-0"
                        aria-label={TOKEN_LABELS.type}
                      >
                        {TOKEN_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TOKEN_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      {mode && (
                        <ValueEditor
                          token={token}
                          mode={mode}
                          onChange={(v) => setTokenValue(token, mode, v)}
                        />
                      )}
                      <button
                        onClick={() => removeToken(token.id)}
                        className="text-gray-400 hover:text-red-500 text-xs px-1 shrink-0"
                        aria-label={`${token.name} ${TOKEN_LABELS.remove}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      addToken({
                        name: TOKEN_LABELS.newTokenName,
                        collectionId: collection.id,
                        type: 'color',
                      })
                    }
                    className="px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    + {TOKEN_LABELS.addToken}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                {TOKEN_LABELS.collections}: 0
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={close}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
          >
            {TOKEN_LABELS.close}
          </button>
        </div>
      </div>
    </div>
  )
}

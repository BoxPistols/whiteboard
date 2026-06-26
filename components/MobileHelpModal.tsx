'use client'

import { useRef, useState } from 'react'
import { useModalA11y } from '@/lib/useModalA11y'

interface MobileHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileHelpModal({ isOpen, onClose }: MobileHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'gestures' | 'tools' | 'tips'>('gestures')
  const panelRef = useRef<HTMLDivElement>(null)
  useModalA11y(isOpen, onClose, panelRef)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-help-modal-title"
        tabIndex={-1}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="mobile-help-modal-title"
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            モバイル操作ガイド
          </h2>
          <button
            onClick={onClose}
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
            onClick={() => setActiveTab('gestures')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'gestures'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            ジェスチャー
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tools'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            ツール
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tips'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            ヒント
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'gestures' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                タッチジェスチャー
              </h3>

              <div className="space-y-4">
                <GestureItem
                  emoji="👆"
                  title="タップ"
                  description="オブジェクトを選択します。選択ツール時のみ有効です。"
                />

                <GestureItem
                  emoji="👆👆"
                  title="ダブルタップ"
                  description="ズームレベルを50%と100%で切り替えます。素早く2回タップしてください。"
                />

                <GestureItem
                  emoji="👆⏱️"
                  title="ロングプレス（500ms）"
                  description="コンテキストメニューを表示します。長押しでコピー、ペースト、削除などの操作が可能です。"
                />

                <GestureItem
                  emoji="🤏"
                  title="ピンチイン"
                  description="2本指を近づけてズームアウトします。ズーム範囲: 10% ~ 200%"
                />

                <GestureItem
                  emoji="🖐️"
                  title="ピンチアウト"
                  description="2本指を広げてズームインします。細かい編集に便利です。"
                />

                <GestureItem
                  emoji="👉"
                  title="ドラッグ"
                  description="選択ツールでオブジェクトを移動できます。"
                />
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                ツールの使い方
              </h3>

              <div className="space-y-4">
                <ToolItem
                  title="選択ツール"
                  description="オブジェクトを選択、移動、リサイズできます。"
                  usage="ツールを選択してオブジェクトをタップ"
                />

                <ToolItem
                  title="矩形ツール"
                  description="四角形を描画します。"
                  usage="ドラッグして矩形を作成"
                />

                <ToolItem
                  title="円ツール"
                  description="円や楕円を描画します。"
                  usage="ドラッグして円を作成"
                />

                <ToolItem
                  title="線ツール"
                  description="直線を描画します。"
                  usage="開始点から終了点までドラッグ"
                />

                <ToolItem
                  title="矢印ツール"
                  description="矢印付きの線を描画します。"
                  usage="開始点から終了点までドラッグ"
                />

                <ToolItem
                  title="テキストツール"
                  description="テキストを追加します。"
                  usage="追加したい場所をタップ"
                />

                <ToolItem
                  title="鉛筆ツール"
                  description="自由に描画します。"
                  usage="ドラッグして自由に描画"
                />
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                便利なヒント
              </h3>

              <div className="space-y-4">
                <TipItem
                  icon="📱"
                  title="横向き表示がおすすめ"
                  description="デバイスを横向きにすると、より広い作業スペースが利用できます。"
                />

                <TipItem
                  icon="🎨"
                  title="プロパティパネル"
                  description="大きい画面（1024px以上）では右側にプロパティパネルが表示され、色やサイズを調整できます。"
                />

                <TipItem
                  icon="📄"
                  title="複数ページ"
                  description="中サイズ画面（768px以上）では左側のレイヤーパネルでページを追加・切り替えできます。"
                />

                <TipItem
                  icon="💾"
                  title="自動保存"
                  description="作業内容はブラウザに自動保存されます。ページをリロードしても復元されます。"
                />

                <TipItem
                  icon="🌙"
                  title="ダークモード"
                  description="右上のボタンでダークモードに切り替えられます。目に優しく作業できます。"
                />

                <TipItem
                  icon="⚡"
                  title="パフォーマンス"
                  description="多くのオブジェクトを描画すると動作が重くなる場合があります。不要なオブジェクトは削除してください。"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

function GestureItem({
  emoji,
  title,
  description,
}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-3xl flex-shrink-0">{emoji}</div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function ToolItem({
  title,
  description,
  usage,
}: {
  title: string
  description: string
  usage: string
}) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{description}</p>
      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">使い方: {usage}</div>
    </div>
  )
}

function TipItem({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Toolbar from '@/components/Toolbar'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'
import ShortcutsModal from '@/components/ShortcutsModal'
import { useCanvasStore } from '@/lib/store'

const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-gray-100" />,
})

export default function Home() {
  const {
    showLeftPanel,
    showRightPanel,
    leftPanelWidth,
    rightPanelWidth,
    toggleLeftPanel,
    toggleRightPanel,
    setLeftPanelWidth,
    setRightPanelWidth,
    loadSavedShortcuts,
    loadSavedNudgeAmount,
  } = useCanvasStore()

  // 保存されたショートカット設定とナッジ設定を読み込み
  useEffect(() => {
    loadSavedShortcuts()
    loadSavedNudgeAmount()
  }, [loadSavedShortcuts, loadSavedNudgeAmount])

  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)

  // リサイズハンドル処理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(e.clientX, 400))
        setLeftPanelWidth(newWidth)
      }
      if (isResizingRight) {
        const newWidth = Math.max(250, Math.min(window.innerWidth - e.clientX, 500))
        setRightPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizingLeft(false)
      setIsResizingRight(false)
    }

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizingLeft, isResizingRight, setLeftPanelWidth, setRightPanelWidth])

  return (
    <main className="flex min-h-screen flex-col touch-none">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* 左パネルトグルボタン＋パネル（モバイルでは非表示） */}
        <div
          className="relative z-40 flex-shrink-0 hidden md:block"
          style={{ width: showLeftPanel ? `${leftPanelWidth}px` : '0px' }}
        >
          {/* パネル本体 */}
          {showLeftPanel && <LayersPanel />}

          {/* リサイズハンドル */}
          {showLeftPanel && (
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50"
              onMouseDown={() => setIsResizingLeft(true)}
              title="ドラッグしてリサイズ"
            />
          )}

          {/* トグルボタン - パネルの右端に固定 */}
          <button
            onClick={toggleLeftPanel}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-50 w-6 h-16 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-r flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors shadow-lg"
            title={showLeftPanel ? 'レイヤーパネルを隠す' : 'レイヤーパネルを表示'}
            aria-label={showLeftPanel ? 'レイヤーパネルを隠す' : 'レイヤーパネルを表示'}
          >
            {showLeftPanel ? '◀' : '▶'}
          </button>
        </div>

        <Canvas />

        {/* 右パネルトグルボタン＋パネル（モバイルでは非表示） */}
        <div
          className="relative z-40 flex-shrink-0 hidden md:block"
          style={{ width: showRightPanel ? `${rightPanelWidth}px` : '0px' }}
        >
          {/* トグルボタン - パネルの左端に固定 */}
          <button
            onClick={toggleRightPanel}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-50 w-6 h-16 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-l flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors shadow-lg"
            title={showRightPanel ? 'プロパティパネルを隠す' : 'プロパティパネルを表示'}
            aria-label={showRightPanel ? 'プロパティパネルを隠す' : 'プロパティパネルを表示'}
          >
            {showRightPanel ? '▶' : '◀'}
          </button>

          {/* リサイズハンドル */}
          {showRightPanel && (
            <div
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50"
              onMouseDown={() => setIsResizingRight(true)}
              title="ドラッグしてリサイズ"
            />
          )}

          {/* パネル本体 */}
          {showRightPanel && <PropertiesPanel />}
        </div>
      </div>

      {/* ショートカット一覧モーダル */}
      <ShortcutsModal />
    </main>
  )
}

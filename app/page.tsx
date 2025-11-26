'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Toolbar from '@/components/Toolbar'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'
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
  } = useCanvasStore()

  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)

  // リサイズハンドル処理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = e.clientX
        setLeftPanelWidth(newWidth)
      }
      if (isResizingRight) {
        const newWidth = window.innerWidth - e.clientX
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
        {/* 左パネルトグルボタン */}
        <button
          onClick={toggleLeftPanel}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-r flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
          style={{ left: showLeftPanel ? `${leftPanelWidth}px` : '0px' }}
          title={showLeftPanel ? 'レイヤーパネルを隠す' : 'レイヤーパネルを表示'}
          aria-label={showLeftPanel ? 'レイヤーパネルを隠す' : 'レイヤーパネルを表示'}
        >
          {showLeftPanel ? '◀' : '▶'}
        </button>

        {/* 左パネル */}
        {showLeftPanel && (
          <div className="relative flex-shrink-0" style={{ width: `${leftPanelWidth}px` }}>
            <LayersPanel />
            {/* リサイズハンドル */}
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={() => setIsResizingLeft(true)}
              title="ドラッグしてリサイズ"
            />
          </div>
        )}

        <Canvas />

        {/* 右パネル */}
        {showRightPanel && (
          <div className="relative flex-shrink-0" style={{ width: `${rightPanelWidth}px` }}>
            {/* リサイズハンドル */}
            <div
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={() => setIsResizingRight(true)}
              title="ドラッグしてリサイズ"
            />
            <PropertiesPanel />
          </div>
        )}

        {/* 右パネルトグルボタン */}
        <button
          onClick={toggleRightPanel}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-l flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
          style={{ right: showRightPanel ? `${rightPanelWidth}px` : '0px' }}
          title={showRightPanel ? 'プロパティパネルを隠す' : 'プロパティパネルを表示'}
          aria-label={showRightPanel ? 'プロパティパネルを隠す' : 'プロパティパネルを表示'}
        >
          {showRightPanel ? '▶' : '◀'}
        </button>
      </div>
    </main>
  )
}

'use client'

import { useRef } from 'react'
import { useCanvasStore } from '@/lib/store'

export default function ExportImportControls() {
  const { fabricCanvas, layers } = useCanvasStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // JSON形式でエクスポート
  const exportAsJSON = () => {
    if (!fabricCanvas) return

    const data = {
      canvas: fabricCanvas.toJSON(['data']),
      layers: layers,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `figma-clone-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // SVG形式でエクスポート
  const exportAsSVG = () => {
    if (!fabricCanvas) return

    const svg = fabricCanvas.toSVG()
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `figma-clone-${Date.now()}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  // PNG形式でエクスポート
  const exportAsPNG = () => {
    if (!fabricCanvas) return

    fabricCanvas.toCanvasElement().toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `figma-clone-${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  // JSONファイルをインポート
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !fabricCanvas) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)

        // キャンバスをクリア
        fabricCanvas.clear()

        // キャンバスデータを読み込み
        if (data.canvas) {
          fabricCanvas.loadFromJSON(data.canvas, () => {
            fabricCanvas.renderAll()
          })
        }

        // レイヤーデータを読み込み（ストアの更新はCanvas.tsxで行う）
        if (data.layers) {
          // レイヤーはlocalStorageに保存し、Canvas.tsxで読み込み
          localStorage.setItem('figma-clone-layers', JSON.stringify(data.layers))
        }

        // ページをリロードして変更を反映
        window.location.reload()
      } catch (error) {
        console.error('Failed to import JSON:', error)
        alert('ファイルのインポートに失敗しました。正しいJSONファイルか確認してください。')
      }
    }
    reader.readAsText(file)

    // インプットをリセット（同じファイルを再度選択できるように）
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
          onClick={() => {
            const menu = document.getElementById('export-menu')
            if (menu) {
              menu.classList.toggle('hidden')
            }
          }}
        >
          エクスポート
        </button>
        <div
          id="export-menu"
          className="hidden absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50"
        >
          <button
            onClick={() => {
              exportAsJSON()
              document.getElementById('export-menu')?.classList.add('hidden')
            }}
            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            JSON形式
          </button>
          <button
            onClick={() => {
              exportAsSVG()
              document.getElementById('export-menu')?.classList.add('hidden')
            }}
            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            SVG形式
          </button>
          <button
            onClick={() => {
              exportAsPNG()
              document.getElementById('export-menu')?.classList.add('hidden')
            }}
            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            PNG形式
          </button>
        </div>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
      >
        インポート
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={importJSON}
        className="hidden"
      />
    </div>
  )
}

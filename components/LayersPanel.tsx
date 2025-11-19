'use client'

import { useCanvasStore } from '@/lib/store'
import { EyeIcon, EyeOffIcon, LockIcon, UnlockIcon, TrashIcon } from '@/components/icons'

export default function LayersPanel() {
  const { layers, removeLayer, toggleLayerVisibility, toggleLayerLock } = useCanvasStore()

  return (
    <div className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-2">
      <h2 className="text-sm font-semibold mb-2 px-1 text-gray-900 dark:text-gray-100">レイヤー</h2>
      {layers.length > 0 ? (
        <div className="space-y-0.5">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between px-1.5 py-1 bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex-shrink-0"
                  title={layer.visible ? '非表示' : '表示'}
                  aria-label={layer.visible ? 'レイヤーを非表示にする' : 'レイヤーを表示する'}
                >
                  {layer.visible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                </button>
                <span className="text-xs truncate text-gray-900 dark:text-gray-100">{layer.name}</span>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => toggleLayerLock(layer.id)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  title={layer.locked ? 'ロック解除' : 'ロック'}
                  aria-label={layer.locked ? 'レイヤーのロックを解除する' : 'レイヤーをロックする'}
                >
                  {layer.locked ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
                </button>
                <button
                  onClick={() => removeLayer(layer.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  title="削除"
                  aria-label={`${layer.name}を削除する`}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-xs px-1">レイヤーがありません</p>
      )}
    </div>
  )
}

'use client'

import { useCanvasStore } from '@/lib/store'
import { EyeIcon, EyeOffIcon, LockIcon, UnlockIcon, TrashIcon } from '@/components/icons'

export default function LayersPanel() {
  const { layers, removeLayer, toggleLayerVisibility, toggleLayerLock } = useCanvasStore()

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">レイヤー</h2>
      {layers.length > 0 ? (
        <div className="space-y-2">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className="text-gray-600 hover:text-gray-800"
                  title={layer.visible ? '非表示' : '表示'}
                  aria-label={layer.visible ? 'レイヤーを非表示にする' : 'レイヤーを表示する'}
                >
                  {layer.visible ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                </button>
                <span className="text-sm truncate">{layer.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleLayerLock(layer.id)}
                  className="text-gray-600 hover:text-gray-800"
                  title={layer.locked ? 'ロック解除' : 'ロック'}
                  aria-label={layer.locked ? 'レイヤーのロックを解除する' : 'レイヤーをロックする'}
                >
                  {layer.locked ? <LockIcon size={16} /> : <UnlockIcon size={16} />}
                </button>
                <button
                  onClick={() => removeLayer(layer.id)}
                  className="text-red-600 hover:text-red-800"
                  title="削除"
                  aria-label={`${layer.name}を削除する`}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">レイヤーがありません</p>
      )}
    </div>
  )
}

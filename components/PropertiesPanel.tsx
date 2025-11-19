'use client'

import { useCanvasStore } from '@/lib/store'

export default function PropertiesPanel() {
  const { selectedObjectId } = useCanvasStore()

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">プロパティ</h2>
      {selectedObjectId ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              塗りつぶし
            </label>
            <input
              type="color"
              className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              defaultValue="#3b82f6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              線の色
            </label>
            <input
              type="color"
              className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              defaultValue="#3b82f6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              線の太さ
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              defaultValue={2}
              min={1}
              max={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X座標
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              defaultValue={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y座標
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              defaultValue={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              幅
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              defaultValue={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              高さ
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              defaultValue={100}
            />
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">オブジェクトを選択してください</p>
      )}
    </div>
  )
}

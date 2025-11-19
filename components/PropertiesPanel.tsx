'use client'

import { useCanvasStore } from '@/lib/store'

export default function PropertiesPanel() {
  const { selectedObjectId } = useCanvasStore()

  return (
    <div className="w-56 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-2">
      <h2 className="text-sm font-semibold mb-2 px-1 text-gray-900 dark:text-gray-100">プロパティ</h2>
      {selectedObjectId ? (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              塗りつぶし
            </label>
            <input
              type="color"
              className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800"
              defaultValue="#3b82f6"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              線の色
            </label>
            <input
              type="color"
              className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800"
              defaultValue="#3b82f6"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              線の太さ
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              defaultValue={2}
              min={1}
              max={20}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              X座標
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              defaultValue={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              Y座標
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              defaultValue={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              幅
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              defaultValue={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              高さ
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              defaultValue={100}
            />
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-xs px-1">オブジェクトを選択してください</p>
      )}
    </div>
  )
}

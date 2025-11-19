'use client'

import { useCanvasStore } from '@/lib/store'

export default function PropertiesPanel() {
  const { selectedObjectId, selectedObjectProps, updateObjectProperty } = useCanvasStore()

  if (!selectedObjectId || !selectedObjectProps) {
    return (
      <div className="w-56 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-2">
        <h2 className="text-sm font-semibold mb-2 px-1 text-gray-900 dark:text-gray-100">
          プロパティ
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-xs px-1">
          オブジェクトを選択してください
        </p>
      </div>
    )
  }

  return (
    <div className="w-56 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-2">
      <h2 className="text-sm font-semibold mb-2 px-1 text-gray-900 dark:text-gray-100">
        プロパティ
      </h2>
      <div className="space-y-2">
        {(selectedObjectProps.fill || selectedObjectProps.fill === '') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              塗りつぶし
            </label>
            <input
              type="color"
              className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800"
              value={
                selectedObjectProps.fill && selectedObjectProps.fill.startsWith('#')
                  ? selectedObjectProps.fill
                  : '#3b82f6'
              }
              onChange={(e) => updateObjectProperty('fill', e.target.value)}
            />
          </div>
        )}
        {(selectedObjectProps.stroke || selectedObjectProps.stroke === '') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              線の色
            </label>
            <input
              type="color"
              className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800"
              value={
                selectedObjectProps.stroke && selectedObjectProps.stroke.startsWith('#')
                  ? selectedObjectProps.stroke
                  : '#3b82f6'
              }
              onChange={(e) => updateObjectProperty('stroke', e.target.value)}
            />
          </div>
        )}
        {selectedObjectProps.strokeWidth !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              線の太さ
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={Math.round(selectedObjectProps.strokeWidth)}
              onChange={(e) => updateObjectProperty('strokeWidth', parseInt(e.target.value, 10))}
              min={1}
              max={20}
            />
          </div>
        )}
        {selectedObjectProps.opacity !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              透明度: {Math.round((selectedObjectProps.opacity || 1) * 100)}%
            </label>
            <input
              type="range"
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
              value={selectedObjectProps.opacity || 1}
              onChange={(e) => updateObjectProperty('opacity', parseFloat(e.target.value))}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        )}
        {selectedObjectProps.left !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              X座標
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={Math.round(selectedObjectProps.left)}
              onChange={(e) => updateObjectProperty('left', parseInt(e.target.value, 10))}
            />
          </div>
        )}
        {selectedObjectProps.top !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              Y座標
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={Math.round(selectedObjectProps.top)}
              onChange={(e) => updateObjectProperty('top', parseInt(e.target.value, 10))}
            />
          </div>
        )}
        {selectedObjectProps.width !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              幅
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={Math.round(selectedObjectProps.width)}
              onChange={(e) => updateObjectProperty('width', parseInt(e.target.value, 10))}
              min={1}
            />
          </div>
        )}
        {selectedObjectProps.height !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
              高さ
            </label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={Math.round(selectedObjectProps.height)}
              onChange={(e) => updateObjectProperty('height', parseInt(e.target.value, 10))}
              min={1}
            />
          </div>
        )}
      </div>
    </div>
  )
}

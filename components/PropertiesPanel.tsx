'use client'

import { useMemo, useCallback } from 'react'
import { useCanvasStore } from '@/lib/store'
import ColorPalette from './ColorPalette'
import { parseColor, hexToRgba } from '@/lib/colorUtils'

export default function PropertiesPanel() {
  const { selectedObjectId, selectedObjectProps, updateObjectProperty } = useCanvasStore()

  // useMemoで色情報をメモ化（不要な再計算を防止）
  const fillColor = useMemo(() => {
    if (!selectedObjectProps?.fill) return { hex: '#3b82f6', alpha: 1 }
    return parseColor(selectedObjectProps.fill)
  }, [selectedObjectProps?.fill])

  const strokeColor = useMemo(() => {
    if (!selectedObjectProps?.stroke) return { hex: '#3b82f6', alpha: 1 }
    return parseColor(selectedObjectProps.stroke)
  }, [selectedObjectProps?.stroke])

  // 汎用的な透明度変更ハンドラー
  const handleAlphaChange = useCallback(
    (prop: 'fill' | 'stroke', alpha: number) => {
      const { hex } = prop === 'fill' ? fillColor : strokeColor
      const newValue = alpha === 1 ? hex : hexToRgba(hex, alpha)
      updateObjectProperty(prop, newValue)
    },
    [fillColor, strokeColor, updateObjectProperty]
  )

  // 汎用的な色変更ハンドラー
  const handleColorChange = useCallback(
    (prop: 'fill' | 'stroke', newHex: string) => {
      const { alpha } = prop === 'fill' ? fillColor : strokeColor
      const newValue = alpha === 1 ? newHex : hexToRgba(newHex, alpha)
      updateObjectProperty(prop, newValue)
    },
    [fillColor, strokeColor, updateObjectProperty]
  )

  if (!selectedObjectId || !selectedObjectProps) {
    return (
      <div className="w-full h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-2 flex flex-col">
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
    <div className="w-full h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-2 flex flex-col overflow-hidden">
      <h2 className="text-sm font-semibold mb-2 px-1 text-gray-900 dark:text-gray-100">
        プロパティ
      </h2>

      {/* スクロール可能なプロパティエリア */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {(selectedObjectProps.fill || selectedObjectProps.fill === '') && (
          <details
            className="rounded border border-gray-200 dark:border-gray-700"
            onToggle={(e) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem(
                  'accordion-fill-open',
                  (e.currentTarget as HTMLDetailsElement).open ? '1' : '0'
                )
              }
            }}
            open={
              typeof window !== 'undefined'
                ? localStorage.getItem('accordion-fill-open') === '1'
                : true
            }
          >
            <summary className="px-2 py-1 text-xs font-medium cursor-pointer select-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              塗りつぶし
            </summary>
            <div className="p-2 space-y-2">
              <input
                type="color"
                className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800"
                value={fillColor.hex}
                onChange={(e) => handleColorChange('fill', e.target.value)}
              />
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  透明度: {Math.round(fillColor.alpha * 100)}%
                </label>
                <input
                  type="range"
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
                  value={fillColor.alpha}
                  onChange={(e) => handleAlphaChange('fill', parseFloat(e.target.value))}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>
            </div>
          </details>
        )}
        {(selectedObjectProps.stroke || selectedObjectProps.stroke === '') && (
          <details
            className="rounded border border-gray-200 dark:border-gray-700"
            onToggle={(e) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem(
                  'accordion-stroke-open',
                  (e.currentTarget as HTMLDetailsElement).open ? '1' : '0'
                )
              }
            }}
            open={
              typeof window !== 'undefined'
                ? localStorage.getItem('accordion-stroke-open') === '1'
                : true
            }
          >
            <summary className="px-2 py-1 text-xs font-medium cursor-pointer select-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              線のカラー
            </summary>
            <div className="p-2 space-y-2">
              <input
                type="color"
                className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800"
                value={strokeColor.hex}
                onChange={(e) => handleColorChange('stroke', e.target.value)}
              />
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  透明度: {Math.round(strokeColor.alpha * 100)}%
                </label>
                <input
                  type="range"
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
                  value={strokeColor.alpha}
                  onChange={(e) => handleAlphaChange('stroke', parseFloat(e.target.value))}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>
            </div>
          </details>
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
              min={0}
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

      {/* カラーパレット（固定位置：右下） */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
        <div className="space-y-2">
          {/* 塗りつぶしカラーパレット */}
          {(selectedObjectProps.fill || selectedObjectProps.fill === '') && (
            <details
              className="rounded border border-gray-200 dark:border-gray-700"
              onToggle={(e) => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(
                    'accordion-fill-palette-open',
                    (e.currentTarget as HTMLDetailsElement).open ? '1' : '0'
                  )
                }
              }}
              open={
                typeof window !== 'undefined'
                  ? localStorage.getItem('accordion-fill-palette-open') === '1'
                  : true
              }
            >
              <summary className="px-2 py-1 text-xs font-medium cursor-pointer select-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                塗りつぶしカラー
              </summary>
              <div className="p-2">
                <ColorPalette
                  label="塗りつぶしカラー"
                  currentColor={fillColor.hex}
                  onColorSelect={(color) => handleColorChange('fill', color)}
                />
              </div>
            </details>
          )}

          {/* 線の色カラーパレット */}
          {(selectedObjectProps.stroke || selectedObjectProps.stroke === '') && (
            <details
              className="rounded border border-gray-200 dark:border-gray-700"
              onToggle={(e) => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(
                    'accordion-stroke-palette-open',
                    (e.currentTarget as HTMLDetailsElement).open ? '1' : '0'
                  )
                }
              }}
              open={
                typeof window !== 'undefined'
                  ? localStorage.getItem('accordion-stroke-palette-open') === '1'
                  : true
              }
            >
              <summary className="px-2 py-1 text-xs font-medium cursor-pointer select-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                線のカラー
              </summary>
              <div className="p-2">
                <ColorPalette
                  label="線のカラー"
                  currentColor={strokeColor.hex}
                  onColorSelect={(color) => handleColorChange('stroke', color)}
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

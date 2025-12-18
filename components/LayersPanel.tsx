'use client'

import { useState, DragEvent } from 'react'
import { useCanvasStore } from '@/lib/store'
import type { Layer } from '@/types'
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
} from '@/components/icons'

// レイヤーツリーアイテムのプロパティ
interface LayerTreeItemProps {
  layer: Layer
  index: number
  depth: number
  isGroup: boolean
  getChildLayers: (parentId: string) => Layer[]
  selectedObjectId: string | null
  editingLayerId: string | null
  editingName: string
  draggedIndex: number | null
  dragOverIndex: number | null
  layersLength: number
  onSelect: (layer: Layer) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onToggleExpanded: (id: string) => void
  onRemove: (id: string) => void
  onMoveUp: (layer: Layer, e: React.MouseEvent) => void
  onMoveDown: (layer: Layer, e: React.MouseEvent) => void
  onStartEditing: (layer: Layer, e: React.MouseEvent) => void
  onEditNameChange: (value: string) => void
  onFinishEditing: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onDragStart: (e: DragEvent<HTMLDivElement>, index: number) => void
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void
  onDragEnd: () => void
  onDrop: (e: DragEvent<HTMLDivElement>, index: number) => void
  isGroupLayer: (layer: Layer) => boolean
}

// 再帰的にレイヤーをレンダリングするコンポーネント
function LayerTreeItem({
  layer,
  index,
  depth,
  isGroup,
  getChildLayers,
  selectedObjectId,
  editingLayerId,
  editingName,
  draggedIndex,
  dragOverIndex,
  layersLength,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onToggleExpanded,
  onRemove,
  onMoveUp,
  onMoveDown,
  onStartEditing,
  onEditNameChange,
  onFinishEditing,
  onKeyDown,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isGroupLayer,
}: LayerTreeItemProps) {
  const children = getChildLayers(layer.id)
  const hasChildren = children.length > 0
  const isExpanded = layer.expanded ?? true // デフォルトは展開

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop(e, index)}
        onClick={() => onSelect(layer)}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`flex items-center justify-between py-1 pr-1.5 rounded cursor-move transition-all ${
          selectedObjectId === layer.objectId
            ? 'bg-blue-500 dark:bg-blue-600 text-white'
            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
        } ${draggedIndex === index ? 'opacity-50' : ''} ${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}`}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* 展開/折りたたみボタン（グループの場合のみ） */}
          {isGroup || hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpanded(layer.id)
              }}
              className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${
                selectedObjectId === layer.objectId
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title={isExpanded ? '折りたたむ' : '展開する'}
            >
              {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}

          {/* グループアイコン */}
          {(isGroup || hasChildren) && (
            <FolderIcon
              size={12}
              className={`flex-shrink-0 ${
                selectedObjectId === layer.objectId
                  ? 'text-white'
                  : 'text-yellow-500 dark:text-yellow-400'
              }`}
            />
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility(layer.id)
            }}
            className={`flex-shrink-0 ${
              selectedObjectId === layer.objectId
                ? 'text-white/80 hover:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title={layer.visible ? '非表示' : '表示'}
            aria-label={layer.visible ? 'レイヤーを非表示にする' : 'レイヤーを表示する'}
          >
            {layer.visible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
          </button>

          {editingLayerId === layer.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onBlur={onFinishEditing}
              onKeyDown={onKeyDown}
              autoFocus
              className="flex-1 min-w-0 px-1 py-0.5 text-xs bg-white dark:bg-gray-700 border border-blue-500 rounded text-gray-900 dark:text-gray-100"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`text-xs truncate select-none cursor-pointer ${
                selectedObjectId === layer.objectId
                  ? 'text-white'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
              onDoubleClick={(e) => onStartEditing(layer, e)}
              title="ダブルクリックで編集"
            >
              {layer.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => onMoveUp(layer, e)}
            disabled={index === 0}
            className={`disabled:opacity-30 disabled:cursor-not-allowed ${
              selectedObjectId === layer.objectId
                ? 'text-white/80 hover:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="前面へ移動"
            aria-label={`${layer.name}を前面へ移動`}
          >
            <ArrowUpIcon size={14} />
          </button>
          <button
            onClick={(e) => onMoveDown(layer, e)}
            disabled={index === layersLength - 1}
            className={`disabled:opacity-30 disabled:cursor-not-allowed ${
              selectedObjectId === layer.objectId
                ? 'text-white/80 hover:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="背面へ移動"
            aria-label={`${layer.name}を背面へ移動`}
          >
            <ArrowDownIcon size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock(layer.id)
            }}
            className={`${
              selectedObjectId === layer.objectId
                ? 'text-white/80 hover:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title={layer.locked ? 'ロック解除' : 'ロック'}
            aria-label={layer.locked ? 'レイヤーのロックを解除する' : 'レイヤーをロックする'}
          >
            {layer.locked ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(layer.id)
            }}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            title="削除"
            aria-label={`${layer.name}を削除する`}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {/* 子レイヤーを再帰的にレンダリング */}
      {hasChildren && isExpanded && (
        <div className="ml-2 border-l border-gray-300 dark:border-gray-600">
          {children.map((childLayer, childIndex) => (
            <LayerTreeItem
              key={childLayer.id}
              layer={childLayer}
              index={childIndex}
              depth={depth + 1}
              isGroup={isGroupLayer(childLayer)}
              getChildLayers={getChildLayers}
              selectedObjectId={selectedObjectId}
              editingLayerId={editingLayerId}
              editingName={editingName}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              layersLength={children.length}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onToggleExpanded={onToggleExpanded}
              onRemove={onRemove}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onStartEditing={onStartEditing}
              onEditNameChange={onEditNameChange}
              onFinishEditing={onFinishEditing}
              onKeyDown={onKeyDown}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              isGroupLayer={isGroupLayer}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LayersPanel() {
  const {
    layers,
    removeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayerName,
    reorderLayers,
    toggleLayerExpanded,
    setSelectedObjectId,
    selectedObjectId,
    fabricCanvas,
    pages,
    currentPageId,
    addPage,
    removePage,
    setCurrentPage,
    updatePageNotes,
    setLayers,
  } = useCanvasStore()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderLayers(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const selectLayer = (layer: (typeof layers)[0]) => {
    if (!fabricCanvas) return

    // まずトップレベルで検索
    let obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)

    // 見つからない場合はグループ内を検索
    if (!obj) {
      for (const canvasObj of fabricCanvas.getObjects()) {
        if (canvasObj.type === 'group') {
          const group = canvasObj as fabric.Group
          const found = group.getObjects().find((o) => o.data?.id === layer.objectId)
          if (found) {
            // グループ内のオブジェクトを選択する場合、グループを展開してサブオブジェクトを選択
            // Fabric.jsではActiveSelectionを使って個別選択を実現
            fabricCanvas.setActiveObject(found)
            fabricCanvas.renderAll()
            setSelectedObjectId(layer.objectId)
            return
          }
        }
      }
    }

    if (obj) {
      fabricCanvas.setActiveObject(obj)
      fabricCanvas.renderAll()
      setSelectedObjectId(layer.objectId)
    }
  }

  const moveLayerUp = (layer: (typeof layers)[0], e: React.MouseEvent) => {
    e.stopPropagation()
    if (!fabricCanvas) return
    const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
    if (obj) {
      fabricCanvas.bringForward(obj)
      fabricCanvas.renderAll()
      // Fabric.jsからレイヤー順序を同期
      syncLayersFromCanvas()
    }
  }

  const moveLayerDown = (layer: (typeof layers)[0], e: React.MouseEvent) => {
    e.stopPropagation()
    if (!fabricCanvas) return
    const obj = fabricCanvas.getObjects().find((o) => o.data?.id === layer.objectId)
    if (obj) {
      fabricCanvas.sendBackwards(obj)
      fabricCanvas.renderAll()
      // Fabric.jsからレイヤー順序を同期
      syncLayersFromCanvas()
    }
  }

  const syncLayersFromCanvas = () => {
    if (!fabricCanvas) return
    const objects = fabricCanvas.getObjects()
    const seenIds = new Set<string>()
    const syncedLayers = objects
      .map((o) => layers.find((l) => l.objectId === o.data?.id))
      .filter((layer): layer is (typeof layers)[number] => {
        if (!layer) return false
        // 重複を排除
        if (seenIds.has(layer.id)) return false
        seenIds.add(layer.id)
        return true
      })
      .reverse()

    if (syncedLayers.length > 0) {
      setLayers(syncedLayers)
      // ページデータも更新
      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        const updatedPages = pages.map((p) =>
          p.id === currentPageId ? { ...p, layers: syncedLayers } : p
        )
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('figma-clone-pages', JSON.stringify(updatedPages))
          } catch (error) {
            console.error('Failed to save page data:', error)
          }
        }
      }
    }
  }

  const startEditing = (layer: (typeof layers)[0], e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLayerId(layer.id)
    setEditingName(layer.name)
  }

  const finishEditing = () => {
    if (editingLayerId && editingName.trim()) {
      updateLayerName(editingLayerId, editingName.trim())
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  const cancelEditing = () => {
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // ルートレイヤー（parentIdがないもの）のみをフィルタリング
  const rootLayers = layers.filter((layer) => !layer.parentId)

  // 子レイヤーを取得するヘルパー関数
  const getChildLayers = (parentId: string): Layer[] => {
    return layers.filter((layer) => layer.parentId === parentId)
  }

  // グループかどうかを判定
  const isGroupLayer = (layer: Layer): boolean => {
    return layer.type === 'GROUP' || Boolean(layer.children && layer.children.length > 0)
  }

  const handleAddPage = () => {
    const pageNumber = pages.length + 1
    addPage(`Page ${pageNumber}`)
  }

  const handleRemovePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (pages.length > 1) {
      removePage(id)
    }
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* ページナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300">ページ</h2>
          <button
            onClick={handleAddPage}
            className="px-1.5 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
            title="新しいページを追加"
            aria-label="新しいページを追加"
          >
            +
          </button>
        </div>
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {pages.map((page) => (
            <div key={page.id} className="relative group">
              <button
                onClick={() => setCurrentPage(page.id)}
                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                  currentPageId === page.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                aria-label={`${page.name}に切り替え`}
              >
                {page.name}
              </button>
              {pages.length > 1 && (
                <button
                  onClick={(e) => handleRemovePage(page.id, e)}
                  className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="ページを削除"
                  aria-label={`${page.name}を削除`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* レイヤーリスト */}
      <div className="flex-1 overflow-y-auto p-2">
        <h2 className="text-sm font-semibold mb-2 px-1 text-gray-900 dark:text-gray-100">
          レイヤー
        </h2>
        {layers.length > 0 ? (
          <div className="space-y-0.5">
            {rootLayers.map((layer, index) => (
              <LayerTreeItem
                key={layer.id}
                layer={layer}
                index={index}
                depth={0}
                isGroup={isGroupLayer(layer)}
                getChildLayers={getChildLayers}
                selectedObjectId={selectedObjectId}
                editingLayerId={editingLayerId}
                editingName={editingName}
                draggedIndex={draggedIndex}
                dragOverIndex={dragOverIndex}
                layersLength={rootLayers.length}
                onSelect={selectLayer}
                onToggleVisibility={toggleLayerVisibility}
                onToggleLock={toggleLayerLock}
                onToggleExpanded={toggleLayerExpanded}
                onRemove={removeLayer}
                onMoveUp={moveLayerUp}
                onMoveDown={moveLayerDown}
                onStartEditing={startEditing}
                onEditNameChange={setEditingName}
                onFinishEditing={finishEditing}
                onKeyDown={handleKeyDown}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                isGroupLayer={isGroupLayer}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-xs px-1">レイヤーがありません</p>
        )}
      </div>

      {/* ページメモセクション */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 h-48 flex flex-col">
        <h3 className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">ページメモ</h3>
        <textarea
          value={pages.find((p) => p.id === currentPageId)?.notes || ''}
          onChange={(e) => updatePageNotes(currentPageId, e.target.value)}
          placeholder="このページに関するメモを入力..."
          className="flex-1 w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-vertical focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

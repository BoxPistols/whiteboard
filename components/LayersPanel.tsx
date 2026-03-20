'use client'

import { useState, useRef, DragEvent } from 'react'
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

// ドロップターゲットの型
interface DropTarget {
  layerId: string
  position: 'above' | 'below' | 'inside' // inside=グループ内にネスト
}

// レイヤーツリーアイテムのプロパティ
interface LayerTreeItemProps {
  layer: Layer
  depth: number
  isGroup: boolean
  getChildLayers: (parentId: string) => Layer[]
  getSiblingLayers: (layer: Layer) => Layer[]
  selectedObjectId: string | null
  editingLayerId: string | null
  editingName: string
  draggedLayerId: string | null
  dropTarget: DropTarget | null
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
  onDragStart: (e: DragEvent<HTMLDivElement>, layerId: string) => void
  onDragOver: (e: DragEvent<HTMLDivElement>, layerId: string, isGroup: boolean) => void
  onDragEnd: () => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  isGroupLayer: (layer: Layer) => boolean
}

// 再帰的にレイヤーをレンダリングするコンポーネント
function LayerTreeItem({
  layer,
  depth,
  isGroup,
  getChildLayers,
  getSiblingLayers,
  selectedObjectId,
  editingLayerId,
  editingName,
  draggedLayerId,
  dropTarget,
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
  const siblings = getSiblingLayers(layer)
  const siblingIndex = siblings.findIndex((l) => l.id === layer.id)
  const isFirst = siblingIndex === 0
  const isLast = siblingIndex === siblings.length - 1

  // ドロップインジケーターのスタイルを計算
  const isDropAbove = dropTarget?.layerId === layer.id && dropTarget?.position === 'above'
  const isDropBelow = dropTarget?.layerId === layer.id && dropTarget?.position === 'below'
  const isDropInside = dropTarget?.layerId === layer.id && dropTarget?.position === 'inside'

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, layer.id)}
        onDragOver={(e) => onDragOver(e, layer.id, isGroup || hasChildren)}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
        onClick={() => onSelect(layer)}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`flex items-center justify-between py-1 pr-1.5 rounded cursor-move transition-all ${
          selectedObjectId === layer.objectId
            ? 'bg-blue-500 dark:bg-blue-600 text-white'
            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
        } ${draggedLayerId === layer.id ? 'opacity-50' : ''} ${
          isDropAbove ? 'border-t-2 border-blue-500' : ''
        } ${isDropBelow ? 'border-b-2 border-blue-500' : ''} ${
          isDropInside ? 'bg-blue-100 dark:bg-blue-900/40' : ''
        }`}
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
            disabled={isFirst}
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
            disabled={isLast}
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
          {children.map((childLayer) => (
            <LayerTreeItem
              key={childLayer.id}
              layer={childLayer}
              depth={depth + 1}
              isGroup={isGroupLayer(childLayer)}
              getChildLayers={getChildLayers}
              getSiblingLayers={getSiblingLayers}
              selectedObjectId={selectedObjectId}
              editingLayerId={editingLayerId}
              editingName={editingName}
              draggedLayerId={draggedLayerId}
              dropTarget={dropTarget}
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
    moveLayer,
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
  } = useCanvasStore()
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const dragOverRef = useRef<{ layerId: string; rect: DOMRect } | null>(null)

  const handleDragStart = (e: DragEvent<HTMLDivElement>, layerId: string) => {
    setDraggedLayerId(layerId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (
    e: DragEvent<HTMLDivElement>,
    layerId: string,
    isGroup: boolean
  ) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (layerId === draggedLayerId) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let position: DropTarget['position']

    if (y < height * 0.25) {
      // 上25%: above
      position = 'above'
    } else if (y > height * 0.75) {
      // 下25%: below
      position = 'below'
    } else if (isGroup) {
      // 中央50%でグループの場合: inside
      position = 'inside'
    } else {
      // 中央50%で非グループの場合: belowにフォールバック
      position = 'below'
    }

    // 前回と同じターゲットなら更新しない
    if (dropTarget?.layerId === layerId && dropTarget?.position === position) return

    setDropTarget({ layerId, position })
    dragOverRef.current = { layerId, rect }
  }

  const handleDragEnd = () => {
    setDraggedLayerId(null)
    setDropTarget(null)
    dragOverRef.current = null
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!draggedLayerId || !dropTarget) {
      handleDragEnd()
      return
    }

    const { position, layerId: targetId } = dropTarget
    const targetLayer = layers.find((l) => l.id === targetId)
    if (!targetLayer) {
      handleDragEnd()
      return
    }

    if (position === 'inside') {
      // グループ内の最後に追加
      moveLayer(draggedLayerId, targetId, -1)
    } else if (position === 'above') {
      // targetの親の中で、targetの直前に挿入
      const parentId = targetLayer.parentId || null
      const siblings = parentId
        ? layers.filter((l) => l.parentId === parentId)
        : layers.filter((l) => !l.parentId)
      const targetIdx = siblings.findIndex((l) => l.id === targetId)
      moveLayer(draggedLayerId, parentId, targetIdx)
    } else {
      // below: targetの親の中で、targetの直後に挿入
      const parentId = targetLayer.parentId || null
      const siblings = parentId
        ? layers.filter((l) => l.parentId === parentId)
        : layers.filter((l) => !l.parentId)
      const targetIdx = siblings.findIndex((l) => l.id === targetId)
      moveLayer(draggedLayerId, parentId, targetIdx + 1)
    }

    handleDragEnd()
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

  // 同じ親内で1つ上に移動
  const moveLayerUp = (layer: (typeof layers)[0], e: React.MouseEvent) => {
    e.stopPropagation()
    const parentId = layer.parentId || null
    const siblings = parentId
      ? layers.filter((l) => l.parentId === parentId)
      : layers.filter((l) => !l.parentId)
    const currentIdx = siblings.findIndex((l) => l.id === layer.id)
    if (currentIdx <= 0) return
    moveLayer(layer.id, parentId, currentIdx - 1)
  }

  // 同じ親内で1つ下に移動
  const moveLayerDown = (layer: (typeof layers)[0], e: React.MouseEvent) => {
    e.stopPropagation()
    const parentId = layer.parentId || null
    const siblings = parentId
      ? layers.filter((l) => l.parentId === parentId)
      : layers.filter((l) => !l.parentId)
    const currentIdx = siblings.findIndex((l) => l.id === layer.id)
    if (currentIdx >= siblings.length - 1) return
    moveLayer(layer.id, parentId, currentIdx + 1)
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

  // 同じ親を持つ兄弟レイヤーを取得
  const getSiblingLayers = (layer: Layer): Layer[] => {
    const parentId = layer.parentId || null
    return parentId
      ? layers.filter((l) => l.parentId === parentId)
      : layers.filter((l) => !l.parentId)
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
            {rootLayers.map((layer) => (
              <LayerTreeItem
                key={layer.id}
                layer={layer}
                depth={0}
                isGroup={isGroupLayer(layer)}
                getChildLayers={getChildLayers}
                getSiblingLayers={getSiblingLayers}
                selectedObjectId={selectedObjectId}
                editingLayerId={editingLayerId}
                editingName={editingName}
                draggedLayerId={draggedLayerId}
                dropTarget={dropTarget}
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

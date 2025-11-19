'use client'

import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onCopy?: () => void
  onPaste?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onLock?: () => void
  onUnlock?: () => void
  onBringToFront?: () => void
  onSendToBack?: () => void
  onGroup?: () => void
  onUngroup?: () => void
  hasSelection: boolean
  isLocked?: boolean
  hasClipboard: boolean
  canGroup?: boolean
  canUngroup?: boolean
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onLock,
  onUnlock,
  onBringToFront,
  onSendToBack,
  onGroup,
  onUngroup,
  hasSelection,
  isLocked,
  hasClipboard,
  canGroup,
  canUngroup,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleAction = (action?: () => void) => {
    if (action) {
      action()
    }
    onClose()
  }

  const MenuItem = ({
    label,
    onClick,
    disabled,
    shortcut,
  }: {
    label: string
    onClick?: () => void
    disabled?: boolean
    shortcut?: string
  }) => (
    <button
      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
        disabled
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={() => !disabled && handleAction(onClick)}
      disabled={disabled}
    >
      <span>{label}</span>
      {shortcut && <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">{shortcut}</span>}
    </button>
  )

  const Divider = () => <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg min-w-[180px] z-50"
      style={{ left: x, top: y }}
    >
      <div className="py-1">
        <MenuItem label="コピー" onClick={onCopy} disabled={!hasSelection} shortcut="⌘C" />
        <MenuItem label="ペースト" onClick={onPaste} disabled={!hasClipboard} shortcut="⌘V" />
        <MenuItem label="複製" onClick={onDuplicate} disabled={!hasSelection} shortcut="⌘D" />
        <Divider />
        <MenuItem label="削除" onClick={onDelete} disabled={!hasSelection} shortcut="Del" />
        <Divider />
        {isLocked ? (
          <MenuItem label="ロック解除" onClick={onUnlock} disabled={!hasSelection} />
        ) : (
          <MenuItem label="ロック" onClick={onLock} disabled={!hasSelection} />
        )}
        <Divider />
        <MenuItem label="グループ化" onClick={onGroup} disabled={!canGroup} shortcut="⌘G" />
        <MenuItem label="グループ解除" onClick={onUngroup} disabled={!canUngroup} shortcut="⌘⇧G" />
        <Divider />
        <MenuItem label="最前面へ" onClick={onBringToFront} disabled={!hasSelection} />
        <MenuItem label="最背面へ" onClick={onSendToBack} disabled={!hasSelection} />
      </div>
    </div>
  )
}

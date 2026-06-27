'use client'

import type { ComponentType } from 'react'
import type { IconProps } from './icons'
import {
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignMiddleVIcon,
  AlignBottomIcon,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
} from './icons'

interface AlignmentPanelProps {
  onAlignLeft: () => void
  onAlignCenter: () => void
  onAlignRight: () => void
  onAlignTop: () => void
  onAlignMiddle: () => void
  onAlignBottom: () => void
  onDistributeHorizontal: () => void
  onDistributeVertical: () => void
}

export default function AlignmentPanel({
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontal,
  onDistributeVertical,
}: AlignmentPanelProps) {
  // テキストラベルではなく Figma 風のアイコンボタン。title はスクリーンリーダー/ツールチップ用に維持。
  const AlignButton = ({
    Icon,
    onClick,
    title,
  }: {
    Icon: ComponentType<IconProps>
    onClick: () => void
    title: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      <Icon size={16} />
    </button>
  )

  return (
    // 位置は親（SelectionToolbar）が制御するため、ここでは見た目だけ持つインラインツールバー
    <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800">
      <div className="flex items-center gap-1">
        <div className="flex gap-1 border-r border-gray-300 pr-2 dark:border-gray-600">
          <AlignButton Icon={AlignLeftIcon} onClick={onAlignLeft} title="左揃え" />
          <AlignButton Icon={AlignCenterHIcon} onClick={onAlignCenter} title="左右中央揃え" />
          <AlignButton Icon={AlignRightIcon} onClick={onAlignRight} title="右揃え" />
        </div>
        <div className="flex gap-1 border-r border-gray-300 pr-2 dark:border-gray-600">
          <AlignButton Icon={AlignTopIcon} onClick={onAlignTop} title="上揃え" />
          <AlignButton Icon={AlignMiddleVIcon} onClick={onAlignMiddle} title="上下中央揃え" />
          <AlignButton Icon={AlignBottomIcon} onClick={onAlignBottom} title="下揃え" />
        </div>
        <div className="flex gap-1">
          <AlignButton
            Icon={DistributeHorizontalIcon}
            onClick={onDistributeHorizontal}
            title="左右に等間隔配置"
          />
          <AlignButton
            Icon={DistributeVerticalIcon}
            onClick={onDistributeVertical}
            title="上下に等間隔配置"
          />
        </div>
      </div>
    </div>
  )
}

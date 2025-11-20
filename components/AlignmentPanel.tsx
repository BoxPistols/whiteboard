'use client'

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
  const AlignButton = ({
    label,
    onClick,
    title,
  }: {
    label: string
    onClick: () => void
    title: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
    >
      {label}
    </button>
  )

  return (
    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 z-10">
      <div className="flex items-center gap-1">
        <div className="flex gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <AlignButton label="左揃え" onClick={onAlignLeft} title="Align Left" />
          <AlignButton label="中央" onClick={onAlignCenter} title="Align Center" />
          <AlignButton label="右揃え" onClick={onAlignRight} title="Align Right" />
        </div>
        <div className="flex gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <AlignButton label="上揃え" onClick={onAlignTop} title="Align Top" />
          <AlignButton label="中央" onClick={onAlignMiddle} title="Align Middle" />
          <AlignButton label="下揃え" onClick={onAlignBottom} title="Align Bottom" />
        </div>
        <div className="flex gap-1">
          <AlignButton
            label="水平分散"
            onClick={onDistributeHorizontal}
            title="Distribute Horizontally"
          />
          <AlignButton
            label="垂直分散"
            onClick={onDistributeVertical}
            title="Distribute Vertically"
          />
        </div>
      </div>
    </div>
  )
}

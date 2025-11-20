import type { Meta, StoryObj } from '@storybook/nextjs'
import {
  SelectIcon,
  RectangleIcon,
  CircleIcon,
  LineIcon,
  PencilIcon,
  TextIcon,
  ArrowIcon,
} from './index'

const meta: Meta = {
  title: 'Components/Icons',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

export const AllIcons: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <SelectIcon size={32} />
        <span className="text-sm">Select</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <RectangleIcon size={32} />
        <span className="text-sm">Rectangle</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircleIcon size={32} />
        <span className="text-sm">Circle</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LineIcon size={32} />
        <span className="text-sm">Line</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ArrowIcon size={32} />
        <span className="text-sm">Arrow</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PencilIcon size={32} />
        <span className="text-sm">Pencil</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <TextIcon size={32} />
        <span className="text-sm">Text</span>
      </div>
    </div>
  ),
}

export const DifferentSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4 p-8">
      <SelectIcon size={16} />
      <SelectIcon size={20} />
      <SelectIcon size={24} />
      <SelectIcon size={32} />
      <SelectIcon size={48} />
    </div>
  ),
}

export const DarkMode: StoryObj = {
  render: () => (
    <div className="dark bg-gray-900 p-8">
      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col items-center gap-2 text-white">
          <SelectIcon size={32} />
          <span className="text-sm">Select</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white">
          <RectangleIcon size={32} />
          <span className="text-sm">Rectangle</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white">
          <CircleIcon size={32} />
          <span className="text-sm">Circle</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white">
          <LineIcon size={32} />
          <span className="text-sm">Line</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white">
          <ArrowIcon size={32} />
          <span className="text-sm">Arrow</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white">
          <PencilIcon size={32} />
          <span className="text-sm">Pencil</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white">
          <TextIcon size={32} />
          <span className="text-sm">Text</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

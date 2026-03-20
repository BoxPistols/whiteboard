import type { Meta, StoryObj } from '@storybook/nextjs'
import ExportImportControls from './ExportImportControls'
import { withCanvasStore, withDarkMode } from '@/.storybook/decorators'

const meta: Meta<typeof ExportImportControls> = {
  title: 'Components/ExportImportControls',
  component: ExportImportControls,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ExportImportControls>

// デフォルト（fabricCanvasなしの状態）
export const Default: Story = {
  decorators: [
    withCanvasStore({
      fabricCanvas: null,
      layers: [],
    }),
  ],
  render: () => (
    <div className="p-4 bg-white dark:bg-gray-900">
      <ExportImportControls />
    </div>
  ),
}

// ダークモード
export const DarkMode: Story = {
  decorators: [
    withCanvasStore({
      fabricCanvas: null,
      layers: [],
    }),
    withDarkMode,
  ],
  render: () => (
    <div className="p-4">
      <ExportImportControls />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

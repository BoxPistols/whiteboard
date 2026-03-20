import type { Meta, StoryObj } from '@storybook/nextjs'
import ShortcutsModal from './ShortcutsModal'
import { withCanvasStore, withDarkMode } from '@/.storybook/decorators'
import { DEFAULT_SHORTCUTS } from '@/lib/shortcuts'

const meta: Meta<typeof ShortcutsModal> = {
  title: 'Components/ShortcutsModal',
  component: ShortcutsModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ShortcutsModal>

// モーダルが開いた状態（一覧タブ）
export const Open: Story = {
  decorators: [
    withCanvasStore({
      showShortcutsModal: true,
      shortcuts: DEFAULT_SHORTCUTS,
      nudgeAmount: 10,
      gridEnabled: false,
      gridSize: 20,
      gridColor: '#cccccc',
      gridOpacity: 30,
      gridSnapEnabled: false,
    }),
  ],
}

// ダークモード
export const DarkMode: Story = {
  decorators: [
    withCanvasStore({
      showShortcutsModal: true,
      shortcuts: DEFAULT_SHORTCUTS,
      nudgeAmount: 10,
      gridEnabled: true,
      gridSize: 20,
      gridColor: '#cccccc',
      gridOpacity: 30,
      gridSnapEnabled: true,
    }),
    withDarkMode,
  ],
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

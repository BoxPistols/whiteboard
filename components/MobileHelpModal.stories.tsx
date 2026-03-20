import type { Meta, StoryObj } from '@storybook/nextjs'
import MobileHelpModal from './MobileHelpModal'
import { withDarkMode } from '@/.storybook/decorators'

const meta: Meta<typeof MobileHelpModal> = {
  title: 'Components/MobileHelpModal',
  component: MobileHelpModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'モーダルの表示状態',
    },
    onClose: {
      action: 'onClose',
      description: '閉じるボタンのコールバック',
    },
  },
}

export default meta
type Story = StoryObj<typeof MobileHelpModal>

// モーダルが開いた状態
export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
}

// ダークモード
export const DarkMode: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
  decorators: [withDarkMode],
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

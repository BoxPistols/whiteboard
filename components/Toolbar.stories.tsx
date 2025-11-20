import type { Meta, StoryObj } from '@storybook/nextjs'
import Toolbar from './Toolbar'

const meta: Meta<typeof Toolbar> = {
  title: 'Components/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Toolbar>

export const Default: Story = {
  render: () => (
    <div className="h-screen w-64 border-r border-gray-200 dark:border-gray-700">
      <Toolbar />
    </div>
  ),
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark h-screen w-64 border-r border-gray-700 bg-gray-900">
      <Toolbar />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

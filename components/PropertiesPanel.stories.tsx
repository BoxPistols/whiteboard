import type { Meta, StoryObj } from '@storybook/nextjs'
import PropertiesPanel from './PropertiesPanel'

const meta: Meta<typeof PropertiesPanel> = {
  title: 'Components/PropertiesPanel',
  component: PropertiesPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PropertiesPanel>

export const Default: Story = {
  render: () => (
    <div className="h-screen w-80 border-l border-gray-200 dark:border-gray-700">
      <PropertiesPanel />
    </div>
  ),
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark h-screen w-80 border-l border-gray-700 bg-gray-900">
      <PropertiesPanel />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

import type { Meta, StoryObj } from '@storybook/nextjs'
import PagePanel from './PagePanel'

const meta: Meta<typeof PagePanel> = {
  title: 'Components/PagePanel',
  component: PagePanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full min-h-[200px] flex items-end justify-center">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof PagePanel>

export const Default: Story = {}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-900 p-8 w-full">
      <PagePanel />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

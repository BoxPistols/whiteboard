import type { Meta, StoryObj } from '@storybook/nextjs'
import AlignmentPanel from './AlignmentPanel'

const meta: Meta<typeof AlignmentPanel> = {
  title: 'Components/AlignmentPanel',
  component: AlignmentPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AlignmentPanel>

export const Default: Story = {
  args: {
    onAlignLeft: () => console.log('Align left'),
    onAlignCenter: () => console.log('Align center'),
    onAlignRight: () => console.log('Align right'),
    onAlignTop: () => console.log('Align top'),
    onAlignMiddle: () => console.log('Align middle'),
    onAlignBottom: () => console.log('Align bottom'),
    onDistributeHorizontal: () => console.log('Distribute horizontal'),
    onDistributeVertical: () => console.log('Distribute vertical'),
  },
}

export const DarkMode: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => (
    <div className="dark bg-gray-900 p-8">
      <AlignmentPanel {...args} />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

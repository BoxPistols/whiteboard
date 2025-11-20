import type { Meta, StoryObj } from '@storybook/nextjs'
import ContextMenu from './ContextMenu'

const meta: Meta<typeof ContextMenu> = {
  title: 'Components/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    x: { control: 'number' },
    y: { control: 'number' },
    hasSelection: { control: 'boolean' },
    isLocked: { control: 'boolean' },
    hasClipboard: { control: 'boolean' },
    canGroup: { control: 'boolean' },
    canUngroup: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ContextMenu>

export const WithSelection: Story = {
  args: {
    x: 200,
    y: 200,
    hasSelection: true,
    isLocked: false,
    hasClipboard: false,
    canGroup: false,
    canUngroup: false,
    onClose: () => console.log('Close'),
    onCopy: () => console.log('Copy'),
    onPaste: () => console.log('Paste'),
    onDuplicate: () => console.log('Duplicate'),
    onDelete: () => console.log('Delete'),
    onLock: () => console.log('Lock'),
    onUnlock: () => console.log('Unlock'),
    onBringToFront: () => console.log('Bring to front'),
    onSendToBack: () => console.log('Send to back'),
    onGroup: () => console.log('Group'),
    onUngroup: () => console.log('Ungroup'),
  },
}

export const WithClipboard: Story = {
  args: {
    ...WithSelection.args,
    hasClipboard: true,
  },
}

export const LockedObject: Story = {
  args: {
    ...WithSelection.args,
    isLocked: true,
  },
}

export const CanGroup: Story = {
  args: {
    ...WithSelection.args,
    canGroup: true,
  },
}

export const CanUngroup: Story = {
  args: {
    ...WithSelection.args,
    canUngroup: true,
  },
}

export const DarkMode: Story = {
  args: {
    ...WithSelection.args,
  },
  render: (args) => (
    <div className="dark bg-gray-900 p-8">
      <ContextMenu {...args} />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

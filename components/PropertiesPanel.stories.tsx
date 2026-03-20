import type { Meta, StoryObj } from '@storybook/nextjs'
import PropertiesPanel from './PropertiesPanel'
import { withCanvasStore, withDarkMode } from '@/.storybook/decorators'

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

// デフォルト：オブジェクト未選択
export const Default: Story = {
  decorators: [
    withCanvasStore({
      selectedObjectId: null,
      selectedObjectProps: null,
    }),
  ],
  render: () => (
    <div className="h-screen w-80 border-l border-gray-200 dark:border-gray-700">
      <PropertiesPanel />
    </div>
  ),
}

// 矩形オブジェクトが選択された状態
export const RectangleSelected: Story = {
  decorators: [
    withCanvasStore({
      selectedObjectId: 'obj-rect-1',
      selectedObjectProps: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        left: 100,
        top: 50,
        width: 200,
        height: 150,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        isArrow: false,
      },
    }),
  ],
  render: () => (
    <div className="h-screen w-80 border-l border-gray-200 dark:border-gray-700">
      <PropertiesPanel />
    </div>
  ),
}

// 半透明オブジェクトが選択された状態
export const SemiTransparentObject: Story = {
  decorators: [
    withCanvasStore({
      selectedObjectId: 'obj-circle-1',
      selectedObjectProps: {
        fill: 'rgba(239, 68, 68, 0.5)',
        stroke: '#991b1b',
        strokeWidth: 1,
        left: 200,
        top: 200,
        width: 120,
        height: 120,
        scaleX: 1,
        scaleY: 1,
        opacity: 0.8,
        isArrow: false,
      },
    }),
  ],
  render: () => (
    <div className="h-screen w-80 border-l border-gray-200 dark:border-gray-700">
      <PropertiesPanel />
    </div>
  ),
}

// 矢印オブジェクトが選択された状態（塗りつぶしセクションが非表示）
export const ArrowSelected: Story = {
  decorators: [
    withCanvasStore({
      selectedObjectId: 'obj-arrow-1',
      selectedObjectProps: {
        fill: '',
        stroke: '#000000',
        strokeWidth: 3,
        left: 50,
        top: 100,
        width: 300,
        height: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        isArrow: true,
      },
    }),
  ],
  render: () => (
    <div className="h-screen w-80 border-l border-gray-200 dark:border-gray-700">
      <PropertiesPanel />
    </div>
  ),
}

// スケーリングされたオブジェクト
export const ScaledObject: Story = {
  decorators: [
    withCanvasStore({
      selectedObjectId: 'obj-scaled-1',
      selectedObjectProps: {
        fill: '#10b981',
        stroke: '#065f46',
        strokeWidth: 1,
        left: 300,
        top: 150,
        width: 100,
        height: 80,
        scaleX: 2.5,
        scaleY: 1.8,
        opacity: 1,
        isArrow: false,
      },
    }),
  ],
  render: () => (
    <div className="h-screen w-80 border-l border-gray-200 dark:border-gray-700">
      <PropertiesPanel />
    </div>
  ),
}

// ダークモード
export const DarkMode: Story = {
  decorators: [
    withCanvasStore({
      selectedObjectId: 'obj-dark-1',
      selectedObjectProps: {
        fill: '#8b5cf6',
        stroke: '#4c1d95',
        strokeWidth: 2,
        left: 150,
        top: 100,
        width: 180,
        height: 120,
        scaleX: 1,
        scaleY: 1,
        opacity: 0.9,
        isArrow: false,
      },
    }),
    withDarkMode,
  ],
  render: () => (
    <div className="h-screen w-80 border-l border-gray-700">
      <PropertiesPanel />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

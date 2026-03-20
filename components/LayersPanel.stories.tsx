import type { Meta, StoryObj } from '@storybook/nextjs'
import LayersPanel from './LayersPanel'
import { withCanvasStore, withDarkMode } from '@/.storybook/decorators'
import type { Layer } from '@/types'

// テスト用レイヤーデータ
const sampleLayers: Layer[] = [
  {
    id: 'layer-1',
    name: '背景矩形',
    visible: true,
    locked: false,
    objectId: 'obj-1',
    type: 'RECTANGLE',
  },
  {
    id: 'layer-2',
    name: '見出しテキスト',
    visible: true,
    locked: false,
    objectId: 'obj-2',
    type: 'TEXT',
  },
  {
    id: 'layer-3',
    name: 'アイコン円',
    visible: true,
    locked: true,
    objectId: 'obj-3',
    type: 'ELLIPSE',
  },
  {
    id: 'layer-4',
    name: '矢印コネクタ',
    visible: false,
    locked: false,
    objectId: 'obj-4',
    type: 'ARROW',
  },
  {
    id: 'layer-5',
    name: 'フリーハンド線',
    visible: true,
    locked: false,
    objectId: 'obj-5',
    type: 'VECTOR',
  },
]

// グループを含むレイヤーデータ
const groupedLayers: Layer[] = [
  {
    id: 'group-1',
    name: 'ヘッダーグループ',
    visible: true,
    locked: false,
    objectId: 'obj-group-1',
    type: 'GROUP',
    children: ['layer-child-1', 'layer-child-2'],
    expanded: true,
  },
  {
    id: 'layer-child-1',
    name: 'ロゴ',
    visible: true,
    locked: false,
    objectId: 'obj-child-1',
    type: 'RECTANGLE',
    parentId: 'group-1',
  },
  {
    id: 'layer-child-2',
    name: 'ナビゲーション',
    visible: true,
    locked: false,
    objectId: 'obj-child-2',
    type: 'TEXT',
    parentId: 'group-1',
  },
  {
    id: 'layer-6',
    name: 'メインコンテンツ',
    visible: true,
    locked: false,
    objectId: 'obj-6',
    type: 'RECTANGLE',
  },
]

const meta: Meta<typeof LayersPanel> = {
  title: 'Components/LayersPanel',
  component: LayersPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof LayersPanel>

// デフォルト：レイヤーなし（空状態）
export const Default: Story = {
  decorators: [
    withCanvasStore({
      layers: [],
      selectedObjectId: null,
      pages: [{ id: 'page-1', name: 'Page 1', canvasData: null, layers: [] }],
      currentPageId: 'page-1',
      fabricCanvas: null,
    }),
  ],
  render: () => (
    <div className="h-[600px] w-64 border-r border-gray-200 dark:border-gray-700">
      <LayersPanel />
    </div>
  ),
}

// 複数レイヤーが存在する状態
export const WithLayers: Story = {
  decorators: [
    withCanvasStore({
      layers: sampleLayers,
      selectedObjectId: null,
      pages: [
        { id: 'page-1', name: 'Page 1', canvasData: null, layers: sampleLayers },
      ],
      currentPageId: 'page-1',
      fabricCanvas: null,
    }),
  ],
  render: () => (
    <div className="h-[600px] w-64 border-r border-gray-200 dark:border-gray-700">
      <LayersPanel />
    </div>
  ),
}

// レイヤーが選択された状態
export const WithSelectedLayer: Story = {
  decorators: [
    withCanvasStore({
      layers: sampleLayers,
      selectedObjectId: 'obj-2',
      pages: [
        { id: 'page-1', name: 'Page 1', canvasData: null, layers: sampleLayers },
      ],
      currentPageId: 'page-1',
      fabricCanvas: null,
    }),
  ],
  render: () => (
    <div className="h-[600px] w-64 border-r border-gray-200 dark:border-gray-700">
      <LayersPanel />
    </div>
  ),
}

// グループレイヤーを含む状態
export const WithGroupedLayers: Story = {
  decorators: [
    withCanvasStore({
      layers: groupedLayers,
      selectedObjectId: null,
      pages: [
        { id: 'page-1', name: 'Page 1', canvasData: null, layers: groupedLayers },
      ],
      currentPageId: 'page-1',
      fabricCanvas: null,
    }),
  ],
  render: () => (
    <div className="h-[600px] w-64 border-r border-gray-200 dark:border-gray-700">
      <LayersPanel />
    </div>
  ),
}

// 複数ページがある状態
export const WithMultiplePages: Story = {
  decorators: [
    withCanvasStore({
      layers: sampleLayers,
      selectedObjectId: null,
      pages: [
        { id: 'page-1', name: 'Page 1', canvasData: null, layers: sampleLayers },
        { id: 'page-2', name: 'Page 2', canvasData: null, layers: [] },
        { id: 'page-3', name: 'デザイン案', canvasData: null, layers: [] },
      ],
      currentPageId: 'page-1',
      fabricCanvas: null,
    }),
  ],
  render: () => (
    <div className="h-[600px] w-64 border-r border-gray-200 dark:border-gray-700">
      <LayersPanel />
    </div>
  ),
}

// ダークモード
export const DarkMode: Story = {
  decorators: [
    withCanvasStore({
      layers: sampleLayers,
      selectedObjectId: 'obj-3',
      pages: [
        { id: 'page-1', name: 'Page 1', canvasData: null, layers: sampleLayers },
        { id: 'page-2', name: 'Page 2', canvasData: null, layers: [] },
      ],
      currentPageId: 'page-1',
      fabricCanvas: null,
    }),
    withDarkMode,
  ],
  render: () => (
    <div className="h-[600px] w-64 border-r border-gray-700">
      <LayersPanel />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

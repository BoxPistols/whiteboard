import type { Meta, StoryObj } from '@storybook/nextjs'
import ColorPalette from './ColorPalette'
import { useState } from 'react'

const meta: Meta<typeof ColorPalette> = {
  title: 'Components/ColorPalette',
  component: ColorPalette,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ColorPalette>

// インタラクティブなストーリー
export const Default: Story = {
  render: () => {
    const [selectedColor, setSelectedColor] = useState('#3B82F6')
    return (
      <div className="w-64">
        <ColorPalette
          label="カラーを選択"
          currentColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
        <div className="mt-4 p-4 border border-gray-300 rounded">
          <p className="text-sm mb-2">選択中の色:</p>
          <div
            className="w-full h-12 rounded border border-gray-300"
            style={{ backgroundColor: selectedColor }}
          />
          <p className="text-xs mt-2 text-gray-600">{selectedColor}</p>
        </div>
      </div>
    )
  },
}

// 塗りつぶし用
export const FillColor: Story = {
  render: () => {
    const [selectedColor, setSelectedColor] = useState('#F472B6')
    return (
      <div className="w-64">
        <ColorPalette
          label="塗りつぶしカラー"
          currentColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
      </div>
    )
  },
}

// 線の色用
export const StrokeColor: Story = {
  render: () => {
    const [selectedColor, setSelectedColor] = useState('#EF4444')
    return (
      <div className="w-64">
        <ColorPalette
          label="線のカラー"
          currentColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
      </div>
    )
  },
}

// ダークモード
export const DarkMode: Story = {
  render: () => {
    const [selectedColor, setSelectedColor] = useState('#A855F7')
    return (
      <div className="w-64 dark">
        <div className="bg-gray-900 p-4 rounded">
          <ColorPalette
            label="カラーを選択"
            currentColor={selectedColor}
            onColorSelect={setSelectedColor}
          />
        </div>
      </div>
    )
  },
}

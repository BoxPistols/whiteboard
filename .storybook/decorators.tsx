import React from 'react'
import { useCanvasStore } from '@/lib/store'

// Zustandストアの状態を注入するデコレータ
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withCanvasStore = (overrides: Record<string, unknown>): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Story: any) => {
    useCanvasStore.setState(overrides)
    return <Story />
  }
}

// ダークモードを切り替えるデコレータ
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withDarkMode = (Story: any) => {
  return (
    <div className="dark bg-gray-900 min-h-screen">
      <Story />
    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'
import Toolbar from '@/components/Toolbar'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'

const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-gray-100" />,
})

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LayersPanel />
        <Canvas />
        <PropertiesPanel />
      </div>
    </main>
  )
}

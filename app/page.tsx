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
    <main className="flex min-h-screen flex-col touch-none">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <LayersPanel />
        </div>
        <Canvas />
        <div className="hidden lg:block">
          <PropertiesPanel />
        </div>
      </div>
    </main>
  )
}

import Toolbar from '@/components/Toolbar'
import Canvas from '@/components/Canvas'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'

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

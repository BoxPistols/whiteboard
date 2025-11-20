import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LayersPanel from '../LayersPanel'
import { useCanvasStore } from '@/lib/store'
import type { Layer } from '@/types'

describe('LayersPanel', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCanvasStore.setState({
      selectedTool: 'select',
      selectedObjectId: null,
      layers: [],
      zoom: 100,
      fabricCanvas: null,
      selectedObjectProps: null,
      clipboard: null,
      pages: [{ id: 'page-1', name: 'Page 1', canvasData: null, layers: [] }],
      currentPageId: 'page-1',
    })
  })

  it('renders layers panel with title', () => {
    render(<LayersPanel />)
    expect(screen.getByText('レイヤー')).toBeInTheDocument()
  })

  it('displays "No layers" when empty', () => {
    render(<LayersPanel />)
    expect(screen.getByText('レイヤーがありません')).toBeInTheDocument()
  })

  it('displays layers when they exist', () => {
    const layers: Layer[] = [
      {
        id: 'layer-1',
        name: 'Rectangle 1',
        visible: true,
        locked: false,
        objectId: 'obj-1',
        type: 'RECTANGLE',
      },
      {
        id: 'layer-2',
        name: 'Circle 1',
        visible: true,
        locked: false,
        objectId: 'obj-2',
        type: 'ELLIPSE',
      },
    ]

    useCanvasStore.setState({ layers })
    render(<LayersPanel />)

    expect(screen.getByText('Rectangle 1')).toBeInTheDocument()
    expect(screen.getByText('Circle 1')).toBeInTheDocument()
  })

  it('toggles layer visibility', async () => {
    const user = userEvent.setup()
    const layer: Layer = {
      id: 'layer-1',
      name: 'Rectangle 1',
      visible: true,
      locked: false,
      objectId: 'obj-1',
      type: 'RECTANGLE',
    }

    useCanvasStore.setState({ layers: [layer] })
    render(<LayersPanel />)

    const visibilityButton = screen.getByLabelText('レイヤーを非表示にする')
    await user.click(visibilityButton)

    const { layers } = useCanvasStore.getState()
    expect(layers[0].visible).toBe(false)
  })

  it('toggles layer lock', async () => {
    const user = userEvent.setup()
    const layer: Layer = {
      id: 'layer-1',
      name: 'Rectangle 1',
      visible: true,
      locked: false,
      objectId: 'obj-1',
      type: 'RECTANGLE',
    }

    useCanvasStore.setState({ layers: [layer] })
    render(<LayersPanel />)

    const lockButton = screen.getByLabelText('レイヤーをロックする')
    await user.click(lockButton)

    const { layers } = useCanvasStore.getState()
    expect(layers[0].locked).toBe(true)
  })

  it('renders selected layer', () => {
    const layers: Layer[] = [
      {
        id: 'layer-1',
        name: 'Rectangle 1',
        visible: true,
        locked: false,
        objectId: 'obj-1',
        type: 'RECTANGLE',
      },
      {
        id: 'layer-2',
        name: 'Circle 1',
        visible: true,
        locked: false,
        objectId: 'obj-2',
        type: 'ELLIPSE',
      },
    ]

    useCanvasStore.setState({
      layers,
      selectedObjectId: 'layer-1',
    })

    render(<LayersPanel />)

    // Just verify the layer name is rendered
    expect(screen.getByText('Rectangle 1')).toBeInTheDocument()
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toolbar from '../Toolbar'
import { useCanvasStore } from '@/lib/store'

describe('Toolbar', () => {
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

  it('renders all tool buttons', () => {
    render(<Toolbar />)

    // Check if all tool buttons are rendered (by their titles)
    expect(screen.getByTitle('選択')).toBeInTheDocument()
    expect(screen.getByTitle('矩形')).toBeInTheDocument()
    expect(screen.getByTitle('円')).toBeInTheDocument()
    expect(screen.getByTitle('線')).toBeInTheDocument()
    expect(screen.getByTitle('矢印')).toBeInTheDocument()
    expect(screen.getByTitle('テキスト')).toBeInTheDocument()
    expect(screen.getByTitle('鉛筆')).toBeInTheDocument()
  })

  it('highlights selected tool', () => {
    render(<Toolbar />)

    const selectButton = screen.getByTitle('選択')
    expect(selectButton).toHaveClass('bg-blue-100')
  })

  it('changes tool on click', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const rectangleButton = screen.getByTitle('矩形')
    await user.click(rectangleButton)

    const { selectedTool } = useCanvasStore.getState()
    expect(selectedTool).toBe('rectangle')
  })

  it('updates visual state when tool changes', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const selectButton = screen.getByTitle('選択')
    const circleButton = screen.getByTitle('円')

    // Initially select tool is highlighted
    expect(selectButton).toHaveClass('bg-blue-100')

    // Click circle tool
    await user.click(circleButton)

    // Circle tool should now be highlighted
    expect(circleButton).toHaveClass('bg-blue-100')
    expect(selectButton).not.toHaveClass('bg-blue-100')
  })
})

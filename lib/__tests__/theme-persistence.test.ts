import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCanvasStore } from '../store'

describe('Theme Persistence', () => {
  let localStorageMock: { [key: string]: string } = {}

  beforeEach(() => {
    // Reset store state
    useCanvasStore.setState({
      theme: 'light',
    })

    // Mock localStorage
    localStorageMock = {}
    global.Storage.prototype.getItem = vi.fn((key: string) => localStorageMock[key] || null)
    global.Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      localStorageMock[key] = value
    })
    global.Storage.prototype.removeItem = vi.fn((key: string) => {
      delete localStorageMock[key]
    })

    // Mock document.documentElement.classList
    const classListMock = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    }
    Object.defineProperty(document.documentElement, 'classList', {
      value: classListMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should toggle theme from light to dark', () => {
    const { toggleTheme } = useCanvasStore.getState()

    toggleTheme()

    expect(useCanvasStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark')
    expect(localStorage.setItem).toHaveBeenCalledWith('figma-clone-theme', 'dark')
  })

  it('should toggle theme from dark to light', () => {
    useCanvasStore.setState({ theme: 'dark' })
    const { toggleTheme } = useCanvasStore.getState()

    toggleTheme()

    expect(useCanvasStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark')
    expect(localStorage.setItem).toHaveBeenCalledWith('figma-clone-theme', 'light')
  })

  it('should initialize theme and apply it to DOM', () => {
    useCanvasStore.setState({ theme: 'dark' })
    const { initializeTheme } = useCanvasStore.getState()

    initializeTheme()

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark')
  })

  it('should initialize light theme and remove dark class from DOM', () => {
    useCanvasStore.setState({ theme: 'light' })
    const { initializeTheme } = useCanvasStore.getState()

    initializeTheme()

    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark')
  })

  it('should save theme preference to localStorage on toggle', () => {
    const { toggleTheme } = useCanvasStore.getState()

    toggleTheme() // light -> dark
    expect(localStorageMock['figma-clone-theme']).toBe('dark')

    toggleTheme() // dark -> light
    expect(localStorageMock['figma-clone-theme']).toBe('light')
  })
})

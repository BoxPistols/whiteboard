import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCanvasStore, DARK_CANVAS_BG, LIGHT_CANVAS_BG } from '../store'

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
    expect(localStorage.setItem).toHaveBeenCalledWith('twb-theme', 'dark')
  })

  it('should toggle theme from dark to light', () => {
    useCanvasStore.setState({ theme: 'dark' })
    const { toggleTheme } = useCanvasStore.getState()

    toggleTheme()

    expect(useCanvasStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark')
    expect(localStorage.setItem).toHaveBeenCalledWith('twb-theme', 'light')
  })

  it('should load saved dark theme from localStorage', () => {
    localStorageMock['twb-theme'] = 'dark'
    const { loadSavedTheme } = useCanvasStore.getState()

    loadSavedTheme()

    expect(useCanvasStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark')
  })

  it('should load saved light theme from localStorage', () => {
    localStorageMock['twb-theme'] = 'light'
    const { loadSavedTheme } = useCanvasStore.getState()

    loadSavedTheme()

    expect(useCanvasStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark')
  })

  it('should use system preference when no saved theme exists', () => {
    // Mock dark mode system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { loadSavedTheme } = useCanvasStore.getState()
    loadSavedTheme()

    expect(useCanvasStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark')
  })

  it('should save theme preference to localStorage on toggle', () => {
    const { toggleTheme } = useCanvasStore.getState()

    toggleTheme() // light -> dark
    expect(localStorageMock['twb-theme']).toBe('dark')

    toggleTheme() // dark -> light
    expect(localStorageMock['twb-theme']).toBe('light')
  })

  it('should sync canvasBackground to new theme default when current bg is a default', () => {
    // light テーマ + ライト既定背景 → ダーク切替で canvas もダーク既定に連動
    useCanvasStore.setState({ theme: 'light', canvasBackground: LIGHT_CANVAS_BG })
    useCanvasStore.getState().toggleTheme()
    expect(useCanvasStore.getState().theme).toBe('dark')
    expect(useCanvasStore.getState().canvasBackground).toBe(DARK_CANVAS_BG)
    expect(localStorageMock['twb-canvas-bg']).toBe(DARK_CANVAS_BG)
  })

  it('should preserve custom canvasBackground on theme toggle', () => {
    // ユーザーが独自色を設定している場合はテーマ切替で破壊しない
    const custom = '#ff00aa'
    useCanvasStore.setState({ theme: 'light', canvasBackground: custom })
    useCanvasStore.getState().toggleTheme()
    expect(useCanvasStore.getState().canvasBackground).toBe(custom)
    expect(localStorageMock['twb-canvas-bg']).toBeUndefined()
  })
})

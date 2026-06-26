import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCanvasStore, DARK_CANVAS_BG, LIGHT_CANVAS_BG } from '../store'

describe('Theme Persistence', () => {
  // localStorage は tests/setup.ts の共有モック（spy 付き・Map バック）を利用する

  beforeEach(() => {
    // Reset store state
    useCanvasStore.setState({
      theme: 'light',
    })

    // Mock document.documentElement.classList
    const classListMock = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    }
    Object.defineProperty(document.documentElement, 'classList', {
      configurable: true,
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
    localStorage.setItem('twb-theme', 'dark')
    const { loadSavedTheme } = useCanvasStore.getState()

    loadSavedTheme()

    expect(useCanvasStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark')
  })

  it('should load saved light theme from localStorage', () => {
    localStorage.setItem('twb-theme', 'light')
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
    expect(localStorage.getItem('twb-theme')).toBe('dark')

    toggleTheme() // dark -> light
    expect(localStorage.getItem('twb-theme')).toBe('light')
  })

  it('should sync canvasBackground to new theme default when current bg is a default', () => {
    // light テーマ + ライト既定背景 → ダーク切替で canvas もダーク既定に連動
    useCanvasStore.setState({ theme: 'light', canvasBackground: LIGHT_CANVAS_BG })
    useCanvasStore.getState().toggleTheme()
    expect(useCanvasStore.getState().theme).toBe('dark')
    expect(useCanvasStore.getState().canvasBackground).toBe(DARK_CANVAS_BG)
    expect(localStorage.getItem('twb-canvas-bg')).toBe(DARK_CANVAS_BG)
  })

  it('should preserve custom canvasBackground on theme toggle', () => {
    // ユーザーが独自色を設定している場合はテーマ切替で破壊しない
    const custom = '#ff00aa'
    useCanvasStore.setState({ theme: 'light', canvasBackground: custom })
    useCanvasStore.getState().toggleTheme()
    expect(useCanvasStore.getState().canvasBackground).toBe(custom)
    expect(localStorage.getItem('twb-canvas-bg')).toBeNull()
  })
})

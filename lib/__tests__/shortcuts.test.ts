import { describe, it, expect } from 'vitest'
import { matchesShortcut, DEFAULT_SHORTCUTS } from '../shortcuts'

function ev(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    code: '',
    key: '',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...partial,
  } as KeyboardEvent
}

const byAction = (action: string) => {
  const s = DEFAULT_SHORTCUTS.find((x) => x.action === action)
  if (!s) throw new Error(`shortcut not found: ${action}`)
  return s
}

describe('matchesShortcut (Figma shortcut gaps)', () => {
  it('delete matches both Backspace and forward Delete', () => {
    const del = byAction('delete')
    expect(matchesShortcut(ev({ key: 'Backspace' }), del)).toBe(true)
    expect(matchesShortcut(ev({ key: 'Delete' }), del)).toBe(true)
    expect(matchesShortcut(ev({ key: 'x' }), del)).toBe(false)
  })

  it('select-all matches Cmd+A and Ctrl+A, but not bare A', () => {
    const sa = byAction('selectAll')
    expect(matchesShortcut(ev({ code: 'KeyA', key: 'a', metaKey: true }), sa)).toBe(true)
    expect(matchesShortcut(ev({ code: 'KeyA', key: 'a', ctrlKey: true }), sa)).toBe(true)
    expect(matchesShortcut(ev({ code: 'KeyA', key: 'a' }), sa)).toBe(false)
  })

  it('zoom in/out match Cmd+= and Cmd+- but not bare keys', () => {
    const zi = byAction('zoomIn')
    const zo = byAction('zoomOut')
    expect(matchesShortcut(ev({ key: '=', metaKey: true }), zi)).toBe(true)
    expect(matchesShortcut(ev({ key: '-', metaKey: true }), zo)).toBe(true)
    expect(matchesShortcut(ev({ key: '=' }), zi)).toBe(false)
  })

  it('deselect matches plain Escape only (no modifier)', () => {
    const d = byAction('deselect')
    expect(matchesShortcut(ev({ key: 'Escape' }), d)).toBe(true)
    expect(matchesShortcut(ev({ key: 'Escape', metaKey: true }), d)).toBe(false)
    expect(matchesShortcut(ev({ key: 'Escape', shiftKey: true }), d)).toBe(false)
  })
})

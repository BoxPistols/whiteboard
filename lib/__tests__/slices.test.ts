import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../store'
import { DEFAULT_SHORTCUTS } from '../shortcuts'

// store.ts から分割した各スライス（grid/panel/shortcuts/nudge）の単体回帰テスト。
// 合成済みストア経由でアクションを叩き、スライスロジックと composition の双方を検証する。
// localStorage は tests/setup.ts が beforeEach で Map バックのモックに差し替える。

describe('GridSlice', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      gridEnabled: false,
      gridSize: 10,
      gridColor: '#888888',
      gridOpacity: 20,
      gridSnapEnabled: false,
    })
  })

  it('toggleGrid は有効/無効を反転し localStorage に保存する', () => {
    useCanvasStore.getState().toggleGrid()
    expect(useCanvasStore.getState().gridEnabled).toBe(true)

    const saved = JSON.parse(localStorage.getItem('twb-grid-settings')!)
    expect(saved.enabled).toBe(true)

    useCanvasStore.getState().toggleGrid()
    expect(useCanvasStore.getState().gridEnabled).toBe(false)
  })

  it('setGridSize は 5〜100 にクランプする', () => {
    useCanvasStore.getState().setGridSize(3)
    expect(useCanvasStore.getState().gridSize).toBe(5)

    useCanvasStore.getState().setGridSize(250)
    expect(useCanvasStore.getState().gridSize).toBe(100)

    useCanvasStore.getState().setGridSize(40)
    expect(useCanvasStore.getState().gridSize).toBe(40)
  })

  it('setGridOpacity は 5〜100 にクランプする', () => {
    useCanvasStore.getState().setGridOpacity(1)
    expect(useCanvasStore.getState().gridOpacity).toBe(5)

    useCanvasStore.getState().setGridOpacity(500)
    expect(useCanvasStore.getState().gridOpacity).toBe(100)
  })

  it('loadSavedGridSettings は保存値を復元し、欠損キーは既定値で補完する', () => {
    localStorage.setItem(
      'twb-grid-settings',
      JSON.stringify({ enabled: true, size: 25, color: '#ff0000', opacity: 50 })
    )
    useCanvasStore.getState().loadSavedGridSettings()

    const s = useCanvasStore.getState()
    expect(s.gridEnabled).toBe(true)
    expect(s.gridSize).toBe(25)
    expect(s.gridColor).toBe('#ff0000')
    expect(s.gridOpacity).toBe(50)
    // snapEnabled 未保存 → 既定 false
    expect(s.gridSnapEnabled).toBe(false)
  })
})

describe('PanelSlice', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      showLeftPanel: true,
      showRightPanel: true,
      leftPanelWidth: 224,
      rightPanelWidth: 288,
    })
  })

  it('toggleLeftPanel / toggleRightPanel は表示状態を反転する', () => {
    useCanvasStore.getState().toggleLeftPanel()
    expect(useCanvasStore.getState().showLeftPanel).toBe(false)

    useCanvasStore.getState().toggleRightPanel()
    expect(useCanvasStore.getState().showRightPanel).toBe(false)
  })

  it('setLeftPanelWidth は 200〜400 にクランプする', () => {
    useCanvasStore.getState().setLeftPanelWidth(100)
    expect(useCanvasStore.getState().leftPanelWidth).toBe(200)

    useCanvasStore.getState().setLeftPanelWidth(999)
    expect(useCanvasStore.getState().leftPanelWidth).toBe(400)

    useCanvasStore.getState().setLeftPanelWidth(300)
    expect(useCanvasStore.getState().leftPanelWidth).toBe(300)
  })

  it('setRightPanelWidth は 250〜500 にクランプする', () => {
    useCanvasStore.getState().setRightPanelWidth(100)
    expect(useCanvasStore.getState().rightPanelWidth).toBe(250)

    useCanvasStore.getState().setRightPanelWidth(999)
    expect(useCanvasStore.getState().rightPanelWidth).toBe(500)
  })
})

describe('ShortcutsSlice', () => {
  beforeEach(() => {
    useCanvasStore.setState({ shortcuts: DEFAULT_SHORTCUTS, showShortcutsModal: false })
  })

  it('setShowShortcutsModal はモーダル表示フラグを切り替える', () => {
    useCanvasStore.getState().setShowShortcutsModal(true)
    expect(useCanvasStore.getState().showShortcutsModal).toBe(true)
  })

  it('updateShortcut はカスタムキーを反映し localStorage に保存する', () => {
    const id = DEFAULT_SHORTCUTS[0].id
    useCanvasStore.getState().updateShortcut(id, 'k', { meta: true })

    const updated = useCanvasStore.getState().shortcuts.find((s) => s.id === id)
    expect(updated?.customKey).toBe('k')
    expect(updated?.modifiers).toEqual({ meta: true })

    const saved = JSON.parse(localStorage.getItem('twb-shortcuts')!)
    expect(saved).toEqual([{ id, customKey: 'k', modifiers: { meta: true } }])
  })

  it('resetShortcuts は既定へ戻し localStorage を削除する', () => {
    const id = DEFAULT_SHORTCUTS[0].id
    useCanvasStore.getState().updateShortcut(id, 'k', { meta: true })
    expect(localStorage.getItem('twb-shortcuts')).not.toBeNull()

    useCanvasStore.getState().resetShortcuts()
    expect(localStorage.getItem('twb-shortcuts')).toBeNull()
    expect(useCanvasStore.getState().shortcuts).toBe(DEFAULT_SHORTCUTS)
  })

  it('loadSavedShortcuts は保存済みカスタムを既定にマージする', () => {
    const id = DEFAULT_SHORTCUTS[0].id
    localStorage.setItem(
      'twb-shortcuts',
      JSON.stringify([{ id, customKey: 'z', modifiers: { ctrl: true } }])
    )
    useCanvasStore.getState().loadSavedShortcuts()

    const merged = useCanvasStore.getState().shortcuts.find((s) => s.id === id)
    expect(merged?.customKey).toBe('z')
    expect(merged?.modifiers).toEqual({ ctrl: true })
  })
})

describe('NudgeSlice', () => {
  beforeEach(() => {
    useCanvasStore.setState({ nudgeAmount: 10 })
  })

  it('setNudgeAmount は値を更新し localStorage に文字列で保存する', () => {
    useCanvasStore.getState().setNudgeAmount(25)
    expect(useCanvasStore.getState().nudgeAmount).toBe(25)
    expect(localStorage.getItem('twb-nudge-amount')).toBe('25')
  })

  it('loadSavedNudgeAmount は正の整数のみ復元する', () => {
    localStorage.setItem('twb-nudge-amount', '15')
    useCanvasStore.getState().loadSavedNudgeAmount()
    expect(useCanvasStore.getState().nudgeAmount).toBe(15)
  })

  it('loadSavedNudgeAmount は 0 以下/不正値を無視する', () => {
    useCanvasStore.setState({ nudgeAmount: 10 })
    localStorage.setItem('twb-nudge-amount', '0')
    useCanvasStore.getState().loadSavedNudgeAmount()
    expect(useCanvasStore.getState().nudgeAmount).toBe(10)

    localStorage.setItem('twb-nudge-amount', 'abc')
    useCanvasStore.getState().loadSavedNudgeAmount()
    expect(useCanvasStore.getState().nudgeAmount).toBe(10)
  })
})

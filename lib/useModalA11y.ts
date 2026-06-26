import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// モーダルのアクセシビリティ配線: 初期フォーカス・フォーカストラップ（Tab 巡回）・
// Esc クローズ・閉じたときのフォーカス復帰をまとめて担う。
// panelRef には role="dialog" を付けたパネル要素を渡す（tabIndex={-1} 推奨）。
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLDivElement | null>
) {
  // 初期フォーカス＋クローズ時のフォーカス復帰（開閉時のみ実行。onClose 変化では再フォーカスしない）
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const initial =
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(
        (el) => el.offsetParent !== null
      ) ?? panel
    initial.focus()
    return () => previouslyFocused?.focus?.()
  }, [isOpen, panelRef])

  // Esc クローズ＋フォーカストラップ（Tab 巡回）
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return

    const getFocusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      )

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === firstEl || !panel.contains(active)) {
          e.preventDefault()
          lastEl.focus()
        }
      } else if (active === lastEl || !panel.contains(active)) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, panelRef])
}

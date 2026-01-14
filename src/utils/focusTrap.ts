import { RefObject, useEffect } from 'react'

type FocusTrapOptions = {
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscape?: () => void
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ]
  const nodes = Array.from(container.querySelectorAll(selectors.join(','))) as HTMLElement[]
  return nodes.filter((n) => !!n && !n.hasAttribute('disabled') && n.tabIndex !== -1)
}

export function useFocusTrap(opts: FocusTrapOptions) {
  useEffect(() => {
    if (!opts.enabled) return

    const container = opts.containerRef.current
    if (!container) return

    const previousActive = document.activeElement as HTMLElement | null

    // Try to focus initial element
    try {
      const el = opts.initialFocusRef?.current
      if (el) el.focus()
      else {
        const focusables = getFocusable(container)
        if (focusables[0]) focusables[0].focus()
      }
    } catch {}

    const onKeyDown = (e: KeyboardEvent) => {
      if (!opts.enabled) return
      if (e.key === 'Escape') {
        if (opts.onEscape) {
          e.preventDefault()
          opts.onEscape()
        }
        return
      }
      if (e.key !== 'Tab') return

      const focusables = getFocusable(container)
      if (!focusables.length) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      try {
        if (previousActive) previousActive.focus()
      } catch {}
    }
  }, [opts.enabled, opts.containerRef, opts.initialFocusRef, opts.onEscape])
}

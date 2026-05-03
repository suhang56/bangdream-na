import { useEffect, useId, useRef } from 'react'
import './MobileDrawer.css'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function MobileDrawer({
  open,
  onClose,
  ariaLabel,
  children,
  returnFocusRef,
}) {
  const panelRef = useRef(null)
  const labelId = useId()

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = panelRef.current
      ? panelRef.current.querySelectorAll(FOCUSABLE)
      : []
    if (focusables.length > 0) {
      focusables[0].focus()
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      const list = panelRef.current
        ? panelRef.current.querySelectorAll(FOCUSABLE)
        : []
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      const target = returnFocusRef?.current || previouslyFocused
      if (target && typeof target.focus === 'function') target.focus()
    }
  }, [open, onClose, returnFocusRef])

  if (!open) return null

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  return (
    <div className="mobile-drawer-root">
      <div
        className="mobile-drawer-backdrop"
        aria-hidden="true"
        onClick={onBackdropClick}
      />
      <div
        ref={panelRef}
        className="mobile-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        <div id={labelId} className="mobile-drawer-title-sr">
          {ariaLabel || 'Menu'}
        </div>
        {children}
      </div>
    </div>
  )
}

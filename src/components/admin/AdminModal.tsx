import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { lockScroll, stableUnlockScroll } from '../../utils/scrollLock'
import './adminMode.css'

export default function AdminModal({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // Stable lock token that survives remounts/re-renders; using a ref (instead
  // of useId()) guarantees the cleanup always unlocks the same token it locked.
  const lockIdRef = useRef<string | null>(null)
  if (lockIdRef.current === null) {
    lockIdRef.current = `admin-modal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
  const lockId = lockIdRef.current

  useEffect(() => {
    if (!open) return
    lockScroll(lockId)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      stableUnlockScroll(lockId)
    }
  }, [open, lockId])

  if (!open) return null

  return createPortal(
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <div className="admin-modal__title">{title}</div>
          <button className="admin-modal__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="admin-modal__body">{children}</div>

        {footer && <div className="admin-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}


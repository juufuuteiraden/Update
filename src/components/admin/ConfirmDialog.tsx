import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockScroll, stableUnlockScroll } from '../../utils/scrollLock'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [animating, setAnimating] = useState(false)
  const [pending, setPending] = useState(false)
  // Stable lock token that survives remounts/re-renders; using a ref (instead
  // of useId()) guarantees the cleanup always unlocks the same token it locked.
  const lockIdRef = useRef<string | null>(null)
  if (lockIdRef.current === null) {
    lockIdRef.current = `confirm-dialog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
  const lockId = lockIdRef.current

  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (open) {
      setAnimating(true)
      const timer = setTimeout(() => confirmRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
    setAnimating(false)
    setPending(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    lockScroll(lockId)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      stableUnlockScroll(lockId)
    }
  }, [open, lockId])

  const handleConfirm = async () => {
    if (pending) return
    setPending(true)
    try {
      await onConfirmRef.current()
    } finally {
      setPending(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className={`confirm-overlay ${animating ? 'confirm-overlay--open' : ''}`}
      onMouseDown={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`confirm-dialog ${variant === 'danger' ? 'confirm-dialog--danger' : ''} ${animating ? 'confirm-dialog--open' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__icon">
          {variant === 'danger' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="#006D77" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h0" stroke="#006D77" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div className="confirm-dialog__text">
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`confirm-dialog__confirm ${variant === 'danger' ? 'confirm-dialog__confirm--danger' : ''}`}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

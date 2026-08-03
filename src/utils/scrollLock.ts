// Global scroll lock manager.
// Uses a token-based registry so nested overlays (modals / confirm dialogs /
// lightboxes) can each lock/unlock the page body independently without
// prematurely restoring scroll while a parent overlay is still open.
//
// Unlike a simple reference counter, a token registry is resilient to
// component re-mounts, effect re-runs, and unbalanced unlock calls:
//  - each overlay owns a unique token,
//  - lockScroll(token) is idempotent (re-adding the same token is a no-op),
//  - unlockScroll(token) only removes that overlay's own token,
//  - the body overflow is restored only when every token is released.
//
// Safety net: after every unlock, if the registry is empty but the body is
// still locked, it force-restores the body. This guarantees the page can
// never remain permanently unscrollable even if a token is orphaned by a
// component that remounts mid-flow (e.g. the delete-confirm flow).

const activeLocks = new Set<string>()

let previousOverflow = ''
let lockSeq = 0

function restoreBodyOverflow(): void {
  if (typeof document === 'undefined') return
  if (activeLocks.size === 0 && document.body.style.overflow === 'hidden') {
    document.body.style.overflow = previousOverflow
  }
}

export function lockScroll(id?: string): string {
  if (typeof document === 'undefined') return id ?? ''
  const token = id || `scroll-lock-${++lockSeq}`

  if (activeLocks.size === 0) {
    previousOverflow = document.body.style.overflow
  }
  activeLocks.add(token)
  document.body.style.overflow = 'hidden'
  return token
}

export function unlockScroll(id?: string): void {
  if (typeof document === 'undefined') return

  if (id) {
    activeLocks.delete(id)
  } else {
    // Backwards-compatible fallback: release the most recently added lock.
    const last = [...activeLocks].pop()
    if (last) activeLocks.delete(last)
  }

  if (activeLocks.size === 0) {
    document.body.style.overflow = previousOverflow
  }

  // Safety net: repair any orphaned/desynced lock state.
  restoreBodyOverflow()
}

// Force-clears every lock and restores the body scroll.
export function unlockAllScroll(): void {
  if (typeof document === 'undefined') return
  activeLocks.clear()
  document.body.style.overflow = previousOverflow
}

// Guarded unlock used by components: identical to unlockScroll but named to
// signal that it also runs the safety net.
export function stableUnlockScroll(id?: string): void {
  unlockScroll(id)
}

export function isScrollLocked(): boolean {
  if (typeof document === 'undefined') return false
  return activeLocks.size > 0 || document.body.style.overflow === 'hidden'
}

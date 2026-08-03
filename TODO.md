# Scroll Lock Fix Plan

## Problem
When deleting content inside the Manage modal, the page scroll becomes permanently stuck because the scroll lock token from `useId()` can change on component remount, causing orphaned locks in the `activeLocks` set.

## Fix Steps

### 1. Fix `src/utils/scrollLock.ts` ✅
- Added a safety net (`restoreBodyOverflow`) that force-restores the body overflow when the token registry is empty but the body is still locked.
- Baked the safety net into `unlockScroll()` so all callers (including the ReviewsSection lightbox) are protected.
- Added `stableUnlockScroll()` as a guarded unlock wrapper.
- Kept `unlockAllScroll()` for force-clearing on logout / Escape.

### 2. Fix `src/components/admin/AdminModal.tsx` ✅
- Replaced `useId()` with a stable ref-based lock token that survives remounts/re-renders.
- Cleanup uses `stableUnlockScroll()` so a stale token can never leave the page unscrollable.

### 3. Fix `src/components/admin/ConfirmDialog.tsx` ✅
- Replaced `useId()` with a stable ref-based lock token.
- Cleanup uses `stableUnlockScroll()`.

### 4. Verify TypeScript compilation cleanly ✅
- `npx tsc --noEmit` exits with code 0 (no type errors).

### 5. Close the loop — ensure none of the "Manage" flows leave scroll locked ✅
- AdminModal + ConfirmDialog now use stable tokens + safety-net unlock, covering the delete flow in PostsSection, Rates, Packages, Amenities, ReviewsSection, and AdminPanel.


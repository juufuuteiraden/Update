# TODO: Preserve carousel animations when adding new showcase posts

## Goal
When a new event showcase post is added, existing posts' animations should not be disrupted (no slide jump, no re-triggered blur/parallax, no autoplay restart).

## Steps
- [x] 1. Track the currently-viewed post ID in a ref in PostsSection.tsx
- [x] 2. After galleryPosts changes, re-derive the viewed post's index and update currentIndex without a transition jump
- [x] 3. Split the carousel enhancement effect: run heavy one-time initializations only on mount
- [x] 4. Keep adjacent-image preloading + counter animation on index change
- [x] 5. Preserve autoplay continuity (don't hard-restart when only slide count changes)
- [x] 6. Verify with build (tsc / vite build)

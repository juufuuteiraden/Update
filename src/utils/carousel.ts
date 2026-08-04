/**
 * ── Carousel Enhancement Suite ──
 * Adds parallax captions, lazy-load blur-up, swipe momentum,
 * keyboard shortcuts, and intersection observer refinements
 * to the existing PostsSection carousel.
 */

type CarouselPost = {
  image: string
}

type Cleanup = void | (() => void)

/* ----------------------------------------------------------
   1. Parallax Caption Effect
   Moves the caption slightly on mouse position for depth
   ---------------------------------------------------------- */
export function initCaptionParallax() {
  const carousel = document.querySelector<HTMLElement>('.carousel-container')
  if (!carousel) return

  const handleMouseMove = (e: MouseEvent) => {
    const slide = carousel.querySelector('.carousel-slide')
    if (!slide) return

    const caption = slide.querySelector<HTMLElement>('.slide-caption')
    if (!caption) return

    const rect = carousel.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    caption.style.transform = `translate(${-x * 12}px, ${-y * 8}px)`
    caption.style.transition = 'transform 0.1s ease-out'
  }

  const handleMouseLeave = () => {
    const caption = carousel.querySelector<HTMLElement>('.slide-caption')
    if (caption) {
      caption.style.transform = 'translate(0, 0)'
      caption.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }
  }

  carousel.addEventListener('mousemove', handleMouseMove)
  carousel.addEventListener('mouseleave', handleMouseLeave)

  return () => {
    carousel.removeEventListener('mousemove', handleMouseMove)
    carousel.removeEventListener('mouseleave', handleMouseLeave)
  }
}

/* ----------------------------------------------------------
   2. Progressive Image Loading (Blur-up)
   Adds a blur-to-sharp transition when images load
   ---------------------------------------------------------- */
export function initProgressiveImages() {
  const images = document.querySelectorAll<HTMLImageElement>('.slide-image')

  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.style.filter = 'blur(0)'
      return
    }

    img.style.filter = 'blur(8px)'
    img.style.transition = 'filter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

    img.addEventListener('load', () => {
      img.style.filter = 'blur(0)'
    })

    if (img.complete) {
      img.style.filter = 'blur(0)'
    }
  })
}

/* ----------------------------------------------------------
   3. Swipe Momentum Tracking
   Adds inertia-like feel to touch swipes
   ---------------------------------------------------------- */
export function initSwipeMomentum() {
  const carousel = document.querySelector<HTMLElement>('.carousel-container')
  if (!carousel) return

  let velocity = 0
  let lastX = 0
  let lastTime = 0
  let animationFrame: number | null = null

  const handleTouchStart = (e: TouchEvent) => {
    lastX = e.touches[0].clientX
    lastTime = Date.now()
    velocity = 0
    if (animationFrame) cancelAnimationFrame(animationFrame)
  }

  const handleTouchMove = (e: TouchEvent) => {
    const currentX = e.touches[0].clientX
    const currentTime = Date.now()
    const deltaTime = currentTime - lastTime

    if (deltaTime > 0) {
      velocity = (currentX - lastX) / deltaTime
    }

    lastX = currentX
    lastTime = currentTime
  }

  const handleTouchEnd = () => {
    const momentumThreshold = 0.3

    if (Math.abs(velocity) > momentumThreshold) {
      const track = carousel.querySelector<HTMLElement>('.carousel-track')
      if (track) {
        track.style.transition = 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)'
        animationFrame = requestAnimationFrame(() => {
          track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        })
      }
    }

    velocity = 0
  }

  carousel.addEventListener('touchstart', handleTouchStart, { passive: true })
  carousel.addEventListener('touchmove', handleTouchMove, { passive: true })
  carousel.addEventListener('touchend', handleTouchEnd)

  return () => {
    carousel.removeEventListener('touchstart', handleTouchStart)
    carousel.removeEventListener('touchmove', handleTouchMove)
    carousel.removeEventListener('touchend', handleTouchEnd)
  }
}

/* ----------------------------------------------------------
   4. Keyboard Shortcuts Overlay
   Shows available keyboard shortcuts on first interaction
   ---------------------------------------------------------- */
export function initKeyboardHints() {
  const carousel = document.querySelector<HTMLElement>('.carousel-container')
  if (!carousel) return

  let hintShown = false

  const showHint = () => {
    if (hintShown) return
    hintShown = true

    const hint = document.createElement('div')
    hint.className = 'keyboard-hint'
    hint.innerHTML = `
      <span class="keyboard-hint-key">←</span>
      <span class="keyboard-hint-text">Navigate</span>
      <span class="keyboard-hint-key">→</span>
    `

    // Inline styles for the hint
    hint.style.cssText = `
      position: absolute;
      bottom: 4rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 50px;
      font-family: 'Inter', sans-serif;
      font-size: 0.7rem;
      z-index: 15;
      animation: fadeSlideUp 0.4s ease, fadeSlideUp 0.4s ease 2.5s reverse forwards;
      pointer-events: none;
    `

    // Inject keyframe styles once
    if (!document.getElementById('keyboard-hint-styles')) {
      const style = document.createElement('style')
      style.id = 'keyboard-hint-styles'
      style.textContent = `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .keyboard-hint-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .keyboard-hint-text {
          opacity: 0.7;
          letter-spacing: 0.04em;
        }
      `
      document.head.appendChild(style)
    }

    carousel.appendChild(hint)
    setTimeout(() => hint.remove(), 3000)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      showHint()
    }
  }

  const handleMouseEnter = () => showHint()

  window.addEventListener('keydown', handleKeyDown)
  carousel.addEventListener('mouseenter', handleMouseEnter, { once: true })

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

/* ----------------------------------------------------------
   5. Active Thumbnail Scroll Into View
   Auto-scrolls the thumbnail strip to keep the active one visible
   ---------------------------------------------------------- */
export function initThumbnailAutoScroll() {
  const strip = document.querySelector<HTMLElement>('.carousel-thumbnails')
  if (!strip) return

  const observer = new MutationObserver(() => {
    const activeThumb = strip.querySelector('.thumbnail-active')
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  })

  observer.observe(strip, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class'],
  })

  return () => observer.disconnect()
}

/* ----------------------------------------------------------
   6. Preload Adjacent Images
   Eagerly loads the next and previous images for instant transitions
   ---------------------------------------------------------- */
export function preloadAdjacentImages(currentIndex: number, posts: CarouselPost[]) {
  const total = posts.length
  if (!total) return

  const indices = [
    (currentIndex - 1 + total) % total,
    currentIndex,
    (currentIndex + 1) % total,
  ]

  indices.forEach((i) => {
    const img = new Image()
    img.src = posts[i].image
  })
}

/* ----------------------------------------------------------
   7. Ripple Effect on Dot Click
   Adds a subtle ripple when clicking dot indicators
   ---------------------------------------------------------- */
export function initDotRipple() {
  const dots = document.querySelectorAll<HTMLElement>('.carousel-dot')

  dots.forEach((dot) => {
    dot.addEventListener('click', (e: MouseEvent) => {
      const ripple = document.createElement('span')
      ripple.className = 'dot-ripple'

      const rect = dot.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        border-radius: 50%;
        background: rgba(255,131,96,0.5);
        transform: scale(0);
        animation: dotRipple 0.6s ease-out forwards;
        pointer-events: none;
      `

      if (!document.getElementById('ripple-styles')) {
        const style = document.createElement('style')
        style.id = 'ripple-styles'
        style.textContent = `
          @keyframes dotRipple {
            to { transform: scale(3); opacity: 0; }
          }
        `
        document.head.appendChild(style)
      }

      dot.style.position = 'relative'
      dot.style.overflow = 'visible'
      dot.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    })
  })
}

/* ----------------------------------------------------------
   8. Intersection Observer — Pause when not in viewport
   Saves resources when carousel is scrolled away
   ---------------------------------------------------------- */
export function initViewportPause(setIsPaused: (isPaused: boolean) => void) {
  const carousel = document.querySelector<HTMLElement>('.carousel-container')
  if (!carousel) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        setIsPaused(!entry.isIntersecting)
      })
    },
    { threshold: 0.3 }
  )

  observer.observe(carousel)
  return () => observer.disconnect()
}

/* ----------------------------------------------------------
   9. Smooth Counter Animation
   Animates the slide counter numbers when they change
   ---------------------------------------------------------- */
export function animateCounter(_currentIndex: number, _totalSlides: number) {
  const counterEl = document.querySelector<HTMLElement>('.slide-counter')
  if (!counterEl) return

  counterEl.style.transform = 'scale(1.15)'
  counterEl.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'

  setTimeout(() => {
    counterEl.style.transform = 'scale(1)'
  }, 200)
}

/* ----------------------------------------------------------
   10. Initialize All Enhancements (mount only)
   Runs the heavy one-time initializations so existing posts'
   animations are NOT re-triggered when new posts are added.
   Call this from your component's mount effect.
   ---------------------------------------------------------- */
export function initializeCarouselEnhancements(
  _currentIndex: number,
  _posts: CarouselPost[],
  setIsPaused: (isPaused: boolean) => void,
) {
  const cleanups: Cleanup[] = []

  cleanups.push(initCaptionParallax())
  cleanups.push(initProgressiveImages())
  cleanups.push(initSwipeMomentum())
  cleanups.push(initKeyboardHints())
  cleanups.push(initThumbnailAutoScroll())
  cleanups.push(initDotRipple())
  cleanups.push(initViewportPause(setIsPaused))

  return () => cleanups.forEach((cleanup) => {
    if (typeof cleanup === 'function') cleanup()
  })
}

/* ----------------------------------------------------------
   11. Light Per-Index Updates
   Preloads adjacent images and animates the counter whenever
   the active slide changes. Cheap and safe to run often.
   ---------------------------------------------------------- */
export function updateCarouselOnIndexChange(
  currentIndex: number,
  posts: CarouselPost[],
) {
  preloadAdjacentImages(currentIndex, posts)
  animateCounter(currentIndex, posts.length)
}

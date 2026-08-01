import { useEffect, useState, useCallback, useRef } from 'react'
import './PostSection.css'
import { initializeCarouselEnhancements } from '../utils/carousel.ts'
import { supabase } from '../supabaseClient'
import type { GalleryItem } from '../supabaseTypes'
import { isAdminModeEnabled } from '../utils/adminMode'
import AdminModal from '../components/admin/AdminModal'
import { ImagePlus, Save, Trash2, Upload, X, Plus, Edit } from 'lucide-react'

/* ── Types ── */
type Post = {
  id: string
  galleryId?: string
  showcaseId?: string
  category: string
  title: string
  subtitle: string
  image: string
}

type GalleryEdit = {
  title: string
  subtitle: string
  category: string
  imageFile: File | null
}

type ShowcaseDraft = {
  title: string
  subtitle: string
  category: string
  image: string
}

/* ── Data ── */
const defaultPosts: Post[] = [
  {
    id: 'bday1',
    category: 'Birthday',
    title: 'Themed Birthday Parties',
    subtitle: 'Custom setups for every age — from whimsical to elegant.',
    image: '/bdayevent1.jpg',
  },
  {
    id: 'bday2',
    category: 'Birthday',
    title: 'Celebrations with a View',
    subtitle: 'Beachfront birthdays with curated décor and coastal backdrops.',
    image: '/bdayevent2.jpg',
  },
  {
    id: 'bday3',
    category: 'Birthday',
    title: 'Milestone Moments',
    subtitle: 'Intimate gatherings or grand affairs — every detail considered.',
    image: '/bdayevent3.jpg',
  },
  {
    id: 'grand1',
    category: 'Corporate',
    title: 'Grand Company Events',
    subtitle: 'Sophisticated setups for galas, year-end parties, and team celebrations.',
    image: '/gt1.jpg',
  },
  {
    id: 'grand2',
    category: 'Corporate',
    title: 'Elegant Evening Affairs',
    subtitle: 'Refined décor and ambient lighting transform our venue after dark.',
    image: '/gt2.jpg',
  },
  {
    id: 'grand3',
    category: 'Corporate',
    title: 'Large-Scale Productions',
    subtitle: 'Full venue transformations for awards nights and company milestones.',
    image: '/gt3.jpg',
  },
  {
    id: 'debut1',
    category: 'Debut',
    title: 'Grand 18th Birthdays',
    subtitle: 'Fairytale debuts with themed styling and unforgettable entrances.',
    image: '/debut1.jpg',
  },
  {
    id: 'debut2',
    category: 'Debut',
    title: 'A Night to Remember',
    subtitle: 'Elegant table settings, floral arches, and personalized touches.',
    image: '/debut2.jpg',
  },
  {
    id: 'debut3',
    category: 'Debut',
    title: 'Starlit Celebrations',
    subtitle: 'Open-air receptions under string lights by the coast.',
    image: '/debut3.jpg',
  },
  {
    id: 'wedding1',
    category: 'Wedding',
    title: 'Seaside Wedding Receptions',
    subtitle: 'Romantic coastal settings with breathtaking sunset backdrops.',
    image: '/wedding1.jpg',
  },
  {
    id: 'wedding2',
    category: 'Wedding',
    title: 'Timeless Elegance',
    subtitle: 'Classic white-and-greenery setups that let the ocean speak.',
    image: '/wedding2.jpg',
  },
  {
    id: 'xmas1',
    category: 'Holiday',
    title: 'Festive Christmas Parties',
    subtitle: 'Family gatherings wrapped in holiday cheer and warm lighting.',
    image: '/xmas1.jpg',
  },
  {
    id: 'xmas2',
    category: 'Holiday',
    title: 'Seasonal Magic',
    subtitle: 'Twinkling lights, festive tablescapes, and coastal Christmas spirit.',
    image: '/xmas2.jpg',
  },
  {
    id: 'bdayx1',
    category: 'Birthday',
    title: 'Playful Setups',
    subtitle: 'Colorful balloon installations and themed tables that delight.',
    image: '/bday1.jpg',
  },
  {
    id: 'bdayx2',
    category: 'Birthday',
    title: 'Sunset Celebrations',
    subtitle: 'Golden-hour parties with lounge seating and tropical accents.',
    image: '/bday2.jpg',
  },
]

/* ── Component ── */
export default function PostsSection() {
  const showAdmin = isAdminModeEnabled() && window.location.pathname === '/admin-vs-2024'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [galleryPosts, setGalleryPosts] = useState<Post[]>(defaultPosts)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [manageOpen, setManageOpen] = useState(false)
  const [galleryDraft, setGalleryDraft] = useState({ title: '', subtitle: '', category: 'Gallery' })
  const [galleryDraftFile, setGalleryDraftFile] = useState<File | null>(null)
  const [galleryEdits, setGalleryEdits] = useState<Record<string, GalleryEdit>>({})
  const [updatingGalleryId, setUpdatingGalleryId] = useState<string | null>(null)
  const [savingGallery, setSavingGallery] = useState(false)
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Undo stack for default post deletions ──
  const [undoDefaultPost, setUndoDefaultPost] = useState<{ id: string; data: any; timer: number } | null>(null)

  const showUndoDefaultPost = (id: string, data: any) => {
    if (undoDefaultPost) clearTimeout(undoDefaultPost.timer)
    const timer = window.setTimeout(() => setUndoDefaultPost(null), 5000)
    setUndoDefaultPost({ id, data, timer })
  }

  // ── Default post inline management ──
  const [defaultPostEdits, setDefaultPostEdits] = useState<Record<string, { title: string; subtitle: string; category: string }>>({})
const [deletedDefaultIds, setDeletedDefaultIds] = useState<Set<string>>(new Set())

  const updateDefaultPostEdit = (id: string, patch: { title?: string; subtitle?: string; category?: string }) => {
    setDefaultPostEdits(prev => {
      const current = prev[id] || { title: defaultPosts.find(p => p.id === id)?.title || '', subtitle: defaultPosts.find(p => p.id === id)?.subtitle || '', category: defaultPosts.find(p => p.id === id)?.category || '' }
      return { ...prev, [id]: { ...current, ...patch } }
    })
  }

  const deleteDefaultPost = (id: string) => {
    if (!window.confirm(`Remove "${defaultPosts.find(p => p.id === id)?.title || id}" from display? You can also save it to showcase first.`)) return
    setDeletedDefaultIds(prev => new Set([...prev, id]))
    const post = defaultPosts.find(p => p.id === id)
    showUndoDefaultPost(id, { edits: defaultPostEdits[id], name: post?.title || id })
  }

  const saveDefaultPostToDB = async (id: string) => {
    const original = defaultPosts.find(p => p.id === id)
    if (!original) return
    const edit = defaultPostEdits[id]
    const post = edit ? { ...original, title: edit.title || original.title, subtitle: edit.subtitle || original.subtitle, category: edit.category || original.category } : original
    setSavingShowcase(true)
    try {
      let imageUrl = post.image
      const payload = {
        title: post.title,
        subtitle: post.subtitle,
        category: post.category,
        image_url: imageUrl,
        order: showcaseItems.length + 1,
      }
      const { error } = await supabase.from('event_showcase').insert(payload)
      if (error) throw error
      setDeletedDefaultIds(prev => new Set([...prev, id]))
      setDefaultPostEdits(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to save to showcase')
    } finally {
      setSavingShowcase(false)
    }
  }


const [showcaseItems, setShowcaseItems] = useState<Post[]>([])
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false)
  const [editingShowcaseId, setEditingShowcaseId] = useState<string | null>(null)
  const [savingShowcase, setSavingShowcase] = useState(false)
  const [showcaseDraft, setShowcaseDraft] = useState<ShowcaseDraft>({ title: '', subtitle: '', category: '', image: '' })
  const [showcaseDraftFile, setShowcaseDraftFile] = useState<File | null>(null)

  const fileName = (file: File) =>
    `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`

  // ── Load gallery + showcase from Supabase ──
  useEffect(() => {
    let isMounted = true

    const loadAll = async () => {
      // Load gallery
      const { data: galleryData } = await supabase
        .from('gallery')
        .select('id,image_url,order,title,subtitle,category')
        .order('order', { ascending: true })

      const uploadedPosts = (galleryData || []).map((item: GalleryItem) => ({
        id: item.id,
        galleryId: item.id,
        category: item.category || 'Gallery',
        title: item.title || 'Gallery Photo',
        subtitle: item.subtitle || '',
        image: item.image_url,
      }))

      // Load event_showcase
      const { data: showcaseData } = await supabase
        .from('event_showcase')
        .select('*')
        .order('order', { ascending: true })

      const showcasePosts: Post[] = (showcaseData || []).map((item: any) => ({
        id: `showcase-${item.id}`,
        showcaseId: item.id,
        category: item.category || 'Gallery',
        title: item.title || 'Showcase',
        subtitle: item.subtitle || '',
        image: item.image_url || '',
      }))

      if (!isMounted) return
      setShowcaseItems(showcasePosts)
      setGalleryPosts([...defaultPosts, ...showcasePosts, ...uploadedPosts])
    }

    loadAll()

    const galleryChannel = supabase
      .channel('public-gallery-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, loadAll)
      .subscribe()

    const showcaseChannel = supabase
      .channel('public-showcase-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_showcase' }, loadAll)
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(galleryChannel)
      supabase.removeChannel(showcaseChannel)
    }
  }, [])

  const categories = ['All', ...Array.from(new Set(galleryPosts.map((p) => p.category)))]
  const filteredPosts = activeCategory === 'All'
    ? galleryPosts
    : galleryPosts.filter((p) => p.category === activeCategory)
  const uploadedGalleryPosts = galleryPosts.filter((post) => post.galleryId)

  const totalSlides = filteredPosts.length

  useEffect(() => {
    setGalleryEdits((current) => {
      const next: Record<string, GalleryEdit> = {}
      galleryPosts.forEach((post) => {
        next[post.id] = current[post.id] || {
          title: post.title,
          subtitle: post.subtitle,
          category: post.category,
          imageFile: null,
        }
      })
      return next
    })
  }, [galleryPosts])

  const updateGalleryEdit = (postId: string, patch: Partial<GalleryEdit>) => {
    setGalleryEdits((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] ?? {
          title: '',
          subtitle: '',
          category: 'Gallery',
          imageFile: null,
        }),
        ...patch,
      },
    }))
  }

  const addGalleryImage = async (file: File | null) => {
    if (!file) return
    setSavingGallery(true)
    try {
      const path = fileName(file)
      const { error: uploadError } = await supabase.storage.from('villa-images').upload(path, file)
      if (uploadError) throw uploadError

      const imageUrl = supabase.storage.from('villa-images').getPublicUrl(path).data.publicUrl
      const order = galleryPosts.filter((post) => post.galleryId).length + 1
      const { error } = await supabase.from('gallery').insert({
        image_url: imageUrl,
        order,
        title: galleryDraft.title || 'Gallery Photo',
        subtitle: galleryDraft.subtitle || '',
        category: galleryDraft.category || 'Gallery',
      })
      if (error) throw error
      setGalleryDraft({ title: '', subtitle: '', category: 'Gallery' })
      setGalleryDraftFile(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to add gallery image.')
    } finally {
      setSavingGallery(false)
    }
  }

  const deleteGalleryImage = async (id?: string) => {
    if (!id) return
    if (!window.confirm('Delete this gallery image?')) return
    const { error } = await supabase.from('gallery').delete().eq('id', id)
    if (error) alert(error.message)
  }

  const saveGalleryImage = async (post: Post) => {
    if (!post.galleryId) return
    const edit = galleryEdits[post.id]
    if (!edit) return

    setUpdatingGalleryId(post.galleryId)
    try {
      let imageUrl = post.image
      if (edit.imageFile) {
        const path = fileName(edit.imageFile)
        const { error: uploadError } = await supabase.storage.from('villa-images').upload(path, edit.imageFile)
        if (uploadError) throw uploadError
        imageUrl = supabase.storage.from('villa-images').getPublicUrl(path).data.publicUrl
      }

      const { error } = await supabase
        .from('gallery')
        .update({
          image_url: imageUrl,
          title: edit.title,
          subtitle: edit.subtitle,
          category: edit.category || 'Gallery',
        })
        .eq('id', post.galleryId)

      if (error) throw error
      updateGalleryEdit(post.id, { imageFile: null })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update gallery image.')
    } finally {
      setUpdatingGalleryId(null)
    }
  }

  const clearGalleryCaption = async (post: Post) => {
    if (!post.galleryId) return
    const nextEdit = {
      ...(galleryEdits[post.id] || {
        title: '',
        subtitle: '',
        category: post.category,
        imageFile: null,
      }),
      title: '',
      subtitle: '',
    }

    updateGalleryEdit(post.id, nextEdit)
    setUpdatingGalleryId(post.galleryId)

    const { error } = await supabase
      .from('gallery')
      .update({ title: '', subtitle: '', category: nextEdit.category || 'Gallery' })
      .eq('id', post.galleryId)

    if (error) alert(error.message)
    setUpdatingGalleryId(null)
  }

  // ── Showcase CRUD ──
  const resetShowcaseDraft = () => {
    setEditingShowcaseId(null)
    setShowcaseDraft({ title: '', subtitle: '', category: '', image: '' })
    setShowcaseDraftFile(null)
  }

  const saveShowcase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingShowcase(true)
    try {
      let imageUrl = showcaseDraft.image
      if (showcaseDraftFile) {
        const path = fileName(showcaseDraftFile)
        const { error: uploadError } = await supabase.storage.from('villa-images').upload(path, showcaseDraftFile)
        if (uploadError) throw uploadError
        imageUrl = supabase.storage.from('villa-images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        title: showcaseDraft.title,
        subtitle: showcaseDraft.subtitle,
        category: showcaseDraft.category,
        image_url: imageUrl,
        order: showcaseItems.length + 1,
      }

      const { error } = editingShowcaseId
        ? await supabase.from('event_showcase').update(payload).eq('id', editingShowcaseId)
        : await supabase.from('event_showcase').insert(payload)

      if (error) throw error
      resetShowcaseDraft()
      setShowcaseModalOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to save showcase item')
    } finally {
      setSavingShowcase(false)
    }
  }

  const deleteShowcase = async (id: string) => {
    if (!window.confirm('Delete this showcase item?')) return
    const { error } = await supabase.from('event_showcase').delete().eq('id', id)
    if (error) alert(error.message)
  }

  const openEditShowcase = (post: Post) => {
    if (!post.showcaseId) return
    setEditingShowcaseId(post.showcaseId)
    setShowcaseDraft({
      title: post.title,
      subtitle: post.subtitle,
      category: post.category,
      image: post.image,
    })
    setShowcaseDraftFile(null)
  }

  /* ── Navigation ── */
  const goTo = useCallback((index: number) => {
    if (isTransitioning || totalSlides === 0) return
    setIsTransitioning(true)
    setCurrentIndex(((index % totalSlides) + totalSlides) % totalSlides)
    setDragOffset(0)
    setTimeout(() => setIsTransitioning(false), 650)
  }, [isTransitioning, totalSlides])

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  /* ── Reset index when category changes ── */
  useEffect(() => {
    setCurrentIndex(0)
    setDragOffset(0)
  }, [activeCategory])

  /* ── Autoplay ── */
  useEffect(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    if (totalSlides <= 1 || isPaused) return

    autoplayRef.current = setInterval(() => {
      goTo(currentIndex + 1)
    }, 5000)

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current)
    }
  }, [currentIndex, goTo, totalSlides, isPaused])

  // ── Carousel Enhancements ──
  useEffect(() => {
    const cleanup = initializeCarouselEnhancements(currentIndex, galleryPosts, setIsPaused)
    return cleanup
  }, [currentIndex, galleryPosts])

  /* ── Keyboard ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next])

  /* ── Touch ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setTouchEnd(null)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.targetTouches[0].clientX
    setTouchEnd(currentTouch)
    if (touchStart !== null) {
      setDragOffset(currentTouch - touchStart)
    }
  }

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) {
      setDragOffset(0)
      return
    }
    const distance = touchStart - touchEnd
    const threshold = 60

    if (Math.abs(distance) > threshold) {
      distance > 0 ? next() : prev()
    }

    setTouchStart(null)
    setTouchEnd(null)
    setDragOffset(0)
  }

  /* ── Render ── */
  return (
    <section id="posts" className="posts-section" aria-label="Event Showcase">
      {/* ── Ambient background decoration ── */}
      <div className="posts-bg-texture" aria-hidden="true" />
      <div className="posts-bg-orb posts-bg-orb--left" aria-hidden="true" />
      <div className="posts-bg-orb posts-bg-orb--right" aria-hidden="true" />

      <div className="posts-container">
        {/* ── Header ── */}
        <div className="posts-header reveal">
          <div className="posts-header-rule" aria-hidden="true">
          </div>
          <span className="posts-eyebrow">Event Showcase</span>
          <h2 className="posts-title">Moments We've Hosted</h2>
          <p className="posts-subtitle">
            From intimate birthday dinners to grand wedding receptions — every event at Villa Susane is crafted with intention and a touch of the coast.
          </p>
          {showAdmin && (
            <button className="posts-admin-manage" type="button" onClick={() => setManageOpen(true)}>
              Manage
            </button>
          )}
        </div>

        {/* ── Category Filter Pills ── */}
        <div className="posts-filters reveal">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`posts-filter-pill ${activeCategory === cat ? 'posts-filter-pill--active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Carousel ── */}
        <div
          className="carousel-shell reveal"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Viewport */}
          <div className="carousel-viewport">
            <div
              className="carousel-track"
              style={{
                transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
                transition: dragOffset !== 0 || isTransitioning
                  ? 'none'
                  : 'transform 0.7s cubic-bezier(0.65, 0, 0.35, 1)',
              }}
            >
              {filteredPosts.map((post, index) => (
                <div
                  key={post.id}
                  className={`carousel-slide ${index === currentIndex ? 'carousel-slide--active' : ''}`}
                >
                  <div className="slide-media">
                    <img
                      src={post.image}
                      alt={`${post.category}: ${post.title}`}
                      className="slide-image"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    <div className="slide-gradient slide-gradient--top" aria-hidden="true" />
                    <div className="slide-gradient slide-gradient--bottom" aria-hidden="true" />
                  </div>

                  <div className="slide-caption">
                    <div className="slide-caption-inner">
                      <span className="slide-category-tag">{post.category}</span>
                      {post.title && <h3 className="slide-title">{post.title}</h3>}
                      {post.subtitle && <p className="slide-subtitle">{post.subtitle}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Navigation Arrows ── */}
          {totalSlides > 1 && (
            <>
              <button
                onClick={prev}
                className="carousel-arrow carousel-arrow--prev"
                aria-label="Previous slide"
                disabled={isTransitioning}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={next}
                className="carousel-arrow carousel-arrow--next"
                aria-label="Next slide"
                disabled={isTransitioning}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {/* ── Progress Bar ── */}
          {totalSlides > 1 && (
            <div className="carousel-progress-track">
              <div
                className="carousel-progress-fill"
                style={{
                  animation: isPaused ? 'none' : `progressFill 5s linear`,
                }}
                key={`progress-${currentIndex}-${isPaused}`}
              />
            </div>
          )}

          {/* ── Dot Indicators + Counter ── */}
          {totalSlides > 1 && (
            <div className="carousel-controls-bar">
              <div className="carousel-dots">
                {filteredPosts.map((post, index) => (
                  <button
                    key={post.id}
                    onClick={() => goTo(index)}
                    className={`carousel-dot ${index === currentIndex ? 'carousel-dot--active' : ''}`}
                    aria-label={`Go to slide ${index + 1}: ${post.title}`}
                    aria-current={index === currentIndex ? 'true' : 'false'}
                  />
                ))}
              </div>
              <span className="carousel-counter">
                <span className="carousel-counter-current">
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <span className="carousel-counter-separator">/</span>
                <span className="carousel-counter-total">
                  {String(totalSlides).padStart(2, '0')}
                </span>
              </span>
            </div>
          )}

          {/* ── Pause indicator ── */}
          {isPaused && totalSlides > 1 && (
            <div className="carousel-pause-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="3" width="5" height="18" rx="1" />
                <rect x="14" y="3" width="5" height="18" rx="1" />
              </svg>
              <span>Paused</span>
            </div>
          )}
        </div>

        {/* ── Thumbnail Strip ── */}
        {totalSlides > 1 && (
          <div className="thumbnail-strip reveal">
            <div className="thumbnail-strip-inner">
              {filteredPosts.map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => goTo(index)}
                  className={`thumbnail-card ${index === currentIndex ? 'thumbnail-card--active' : ''}`}
                >
                  <div className="thumbnail-card-media">
                    <img src={post.image} alt="" className="thumbnail-card-image" loading="lazy" />
                    <div className="thumbnail-card-overlay" />
                    {index === currentIndex && (
                      <div className="thumbnail-card-active-indicator">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="thumbnail-card-category">{post.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Showcase Add/Edit Modal ── */}
      <AdminModal
        title={editingShowcaseId ? 'Edit Showcase Item' : 'Add Showcase Item'}
        open={showcaseModalOpen}
        onClose={() => { setShowcaseModalOpen(false); resetShowcaseDraft(); }}
      >
        <form id="showcase-admin-form" onSubmit={saveShowcase} className="rates-admin-room-form">
          <label className="rates-admin-field">
            <span>Title</span>
            <input required value={showcaseDraft.title} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, title: e.target.value })} placeholder="e.g. Seaside Wedding Reception" />
          </label>
          <label className="rates-admin-field">
            <span>Subtitle / Description</span>
            <textarea rows={3} value={showcaseDraft.subtitle} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, subtitle: e.target.value })} placeholder="Short description" />
          </label>
          <label className="rates-admin-field">
            <span>Category</span>
            <input value={showcaseDraft.category} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, category: e.target.value })} placeholder="e.g. Wedding, Birthday, Corporate" />
          </label>
          <label className="rates-admin-field">
            <span>Image</span>
            <input type="file" accept="image/*" required={!editingShowcaseId} onChange={(e) => setShowcaseDraftFile(e.target.files?.[0] || null)} />
            {showcaseDraftFile && (
              <div style={{ fontSize: '0.8rem', color: '#006D77', marginTop: '0.25rem' }}>
                <Upload size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                {showcaseDraftFile.name}
              </div>
            )}
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="rates-admin-modal-cancel" onClick={() => { setShowcaseModalOpen(false); resetShowcaseDraft(); }} disabled={savingShowcase}>
              Cancel
            </button>
            <button type="submit" className="rates-admin-modal-primary" disabled={savingShowcase}>
              {savingShowcase ? 'Saving...' : editingShowcaseId ? 'Update Showcase' : 'Add Showcase'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        title="Manage Event Showcase"
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      >
        <div className="posts-manage-modal">
          {/* ── Undo banner for deleted default posts ── */}
          {undoDefaultPost && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#E65100' }}>Removed "{undoDefaultPost.data.name}" from display</span>
              <button
                type="button"
                onClick={() => {
                  if (undoDefaultPost) {
                    clearTimeout(undoDefaultPost.timer)
                    setDeletedDefaultIds(prev => { const n = new Set(prev); n.delete(undoDefaultPost.id); return n })
                    if (undoDefaultPost.data.edits) {
                      setDefaultPostEdits(prev => ({ ...prev, [undoDefaultPost.id]: undoDefaultPost.data.edits }))
                    }
                    setUndoDefaultPost(null)
                  }
                }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #FFB74D', background: '#FFF', color: '#E65100', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
              >
                Undo
              </button>
            </div>
          )}

          {/* ── Showcase Items Section ── */}
          <div className="posts-manage-add">
            <div className="posts-manage-add__header">
              <div>
                <span className="posts-manage-add__eyebrow">Showcase items</span>
                <h3>{showcaseItems.length} showcase item{showcaseItems.length === 1 ? '' : 's'}</h3>
              </div>
              <button
                className="posts-manage-add__button"
                type="button"
                onClick={() => setShowcaseModalOpen(true)}
              >
                <Plus size={17} aria-hidden="true" />
                Add
              </button>
            </div>
            {showcaseItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {showcaseItems.map((post) => (
                  <div key={post.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem', border: '1px solid rgba(0,109,119,0.12)', borderRadius: '10px'
                  }}>
                    {post.image && (
                      <img src={post.image} alt="" style={{
                        width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.85rem', color: '#1A2B2C' }}>{post.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6B7B7C' }}>{post.category}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button type="button" onClick={() => openEditShowcase(post)} style={{
                        padding: '0.35rem 0.6rem', fontSize: '0.75rem', border: '1px solid rgba(0,109,119,0.2)',
                        borderRadius: '6px', background: 'transparent', color: '#006D77', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}>
                        <Edit size={13} />
                        Edit
                      </button>
                      <button type="button" onClick={() => post.showcaseId && deleteShowcase(post.showcaseId)} style={{
                        padding: '0.35rem 0.6rem', fontSize: '0.75rem', border: '1px solid rgba(220,38,38,0.2)',
                        borderRadius: '6px', background: 'transparent', color: '#DC2626', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="posts-manage-empty" style={{ minHeight: '80px' }}>
                <strong>No showcase items yet</strong>
                <span>Click "Add" to create your first showcase item.</span>
              </div>
            )}
          </div>

          {/* ── Default Showcase Items Section (editable inline) ── */}
          {defaultPosts.filter(p => !deletedDefaultIds.has(p.id)).length > 0 && (
            <div className="posts-manage-add" style={{ marginTop: '1.5rem' }}>
              <div className="posts-manage-add__header">
                <div>
                  <span className="posts-manage-add__eyebrow">Built-in showcase items</span>
                  <h3>{defaultPosts.filter(p => !deletedDefaultIds.has(p.id)).length} default item{defaultPosts.filter(p => !deletedDefaultIds.has(p.id)).length === 1 ? '' : 's'}</h3>
                </div>
                <p>Edit these built-in showcase items inline. Changes reflect immediately in the carousel. Save to database to persist.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {defaultPosts.filter(p => !deletedDefaultIds.has(p.id)).map((post) => {
                  const edit = defaultPostEdits[post.id]
                  const currentTitle = edit?.title ?? post.title
                  const currentSubtitle = edit?.subtitle ?? post.subtitle
                  const currentCategory = edit?.category ?? post.category
                  return (
                    <div key={post.id} style={{
                      display: 'flex', gap: '0.75rem', padding: '0.75rem',
                      border: '1px solid rgba(0,109,119,0.15)', borderRadius: '10px',
                      background: 'rgba(0,109,119,0.03)'
                    }}>
                      {post.image && (
                        <img src={post.image} alt="" style={{
                          width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <input
                          value={currentTitle}
                          onChange={(e) => updateDefaultPostEdit(post.id, { title: e.target.value })}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.85rem', width: '100%' }}
                          placeholder="Title"
                        />
                        <input
                          value={currentSubtitle}
                          onChange={(e) => updateDefaultPostEdit(post.id, { subtitle: e.target.value })}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%' }}
                          placeholder="Subtitle"
                        />
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input
                            value={currentCategory}
                            onChange={(e) => updateDefaultPostEdit(post.id, { category: e.target.value })}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', flex: 1 }}
                            placeholder="Category"
                          />
                          <button
                            type="button"
                            onClick={() => saveDefaultPostToDB(post.id)}
                            disabled={savingShowcase}
                            style={{
                              padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px',
                              border: '1px solid rgba(0,109,119,0.3)', background: '#006D77', color: '#FFFDF7',
                              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}
                            title="Save to event showcase database"
                          >
                            <Save size={12} />
                            Save to DB
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDefaultPost(post.id)}
                            style={{
                              padding: '0.3rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px',
                              border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', color: '#DC2626',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}
                            title="Remove from display"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Uploaded gallery photos section ── */}
          <div className="posts-manage-add">
            <div className="posts-manage-add__header">
              <div>
                <span className="posts-manage-add__eyebrow">New post photo</span>
                <h3>Add a photo to Gallery</h3>
              </div>
              <button
                className="posts-manage-add__button"
                type="button"
                disabled={savingGallery || !galleryDraftFile}
                onClick={() => addGalleryImage(galleryDraftFile)}
              >
                <ImagePlus size={17} aria-hidden="true" />
                {savingGallery ? 'Adding...' : 'Add photo'}
              </button>
            </div>

            <div className="posts-manage-add__content">
              <label className="posts-manage-add__upload" aria-label="Choose gallery image">
                <Upload size={24} aria-hidden="true" />
                <strong>{galleryDraftFile ? galleryDraftFile.name : 'Choose photo'}</strong>
                <span>JPG, PNG, or WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={savingGallery}
                  onChange={(event) => setGalleryDraftFile(event.target.files?.[0] || null)}
                />
              </label>

              <div className="posts-manage-add__fields">
                <label>
                  <span>Caption title</span>
                  <input
                    value={galleryDraft.title}
                    onChange={(event) => setGalleryDraft({ ...galleryDraft, title: event.target.value })}
                    placeholder="Example: Sunset birthday dinner"
                  />
                </label>
                <label>
                  <span>Description</span>
                  <input
                    value={galleryDraft.subtitle}
                    onChange={(event) => setGalleryDraft({ ...galleryDraft, subtitle: event.target.value })}
                    placeholder="Example: A breezy evening celebration by the pool"
                  />
                </label>
                <label>
                  <span>Category</span>
                  <input
                    value={galleryDraft.category}
                    onChange={(event) => setGalleryDraft({ ...galleryDraft, category: event.target.value })}
                    placeholder="Birthday, Wedding, Corporate..."
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="posts-manage-list-header">
            <div>
              <span className="posts-manage-list-header__eyebrow">Editable uploads</span>
              <h3>{uploadedGalleryPosts.length} custom photo{uploadedGalleryPosts.length === 1 ? '' : 's'}</h3>
            </div>
            <p>Uploaded photos appear after showcase items and can be edited here.</p>
          </div>

          {uploadedGalleryPosts.length > 0 ? (
            <div className="posts-manage-grid">
              {uploadedGalleryPosts.map((post) => (
                <article className="posts-manage-card" key={post.id}>
                  <div className="posts-manage-card__media">
                    <img src={post.image} alt={post.title || post.category} />
                    <div className="posts-manage-card__actions">
                      <label className="posts-manage-card__icon" aria-label={`Replace ${post.title || 'gallery photo'}`}>
                        <Upload size={16} aria-hidden="true" />
                        <input
                          type="file"
                          accept="image/*"
                          disabled={updatingGalleryId === post.galleryId}
                          onChange={(event) =>
                            updateGalleryEdit(post.id, { imageFile: event.target.files?.[0] || null })
                          }
                        />
                      </label>
                      <button
                        className="posts-manage-card__icon posts-manage-card__icon--danger"
                        type="button"
                        aria-label={`Delete ${post.title || 'gallery photo'}`}
                        onClick={() => deleteGalleryImage(post.galleryId)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="posts-manage-card__editor">
                    <label>
                      <span>Caption</span>
                      <input
                        value={galleryEdits[post.id]?.title ?? post.title}
                        onChange={(event) => updateGalleryEdit(post.id, { title: event.target.value })}
                        placeholder="Caption title"
                        disabled={updatingGalleryId === post.galleryId}
                      />
                    </label>
                    <label>
                      <span>Description</span>
                      <input
                        value={galleryEdits[post.id]?.subtitle ?? post.subtitle}
                        onChange={(event) => updateGalleryEdit(post.id, { subtitle: event.target.value })}
                        placeholder="Caption description"
                        disabled={updatingGalleryId === post.galleryId}
                      />
                    </label>
                    <label>
                      <span>Category</span>
                      <input
                        value={galleryEdits[post.id]?.category ?? post.category}
                        onChange={(event) => updateGalleryEdit(post.id, { category: event.target.value })}
                        placeholder="Category"
                        disabled={updatingGalleryId === post.galleryId}
                      />
                    </label>
                    {galleryEdits[post.id]?.imageFile && (
                      <div className="posts-manage-card__pending">
                        New photo selected
                        <button
                          type="button"
                          aria-label="Remove selected replacement photo"
                          onClick={() => updateGalleryEdit(post.id, { imageFile: null })}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <div className="posts-manage-card__buttons">
                      <button
                        className="posts-manage-card__save"
                        type="button"
                        onClick={() => saveGalleryImage(post)}
                        disabled={updatingGalleryId === post.galleryId}
                      >
                        <Save size={15} aria-hidden="true" />
                        Save
                      </button>
                      <button
                        className="posts-manage-card__clear"
                        type="button"
                        onClick={() => clearGalleryCaption(post)}
                        disabled={updatingGalleryId === post.galleryId}
                      >
                        Clear caption
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="posts-manage-empty">
              <ImagePlus size={22} aria-hidden="true" />
              <strong>No uploaded photos yet</strong>
              <span>Choose a photo above, add a caption and category, then publish it into Posts.</span>
            </div>
          )}
        </div>
      </AdminModal>
    </section>
  )
}


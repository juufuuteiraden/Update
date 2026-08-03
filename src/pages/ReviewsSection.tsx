import { useState, useEffect, useId } from 'react'
import { client } from '../sanityClient'
import './ReviewsSection.css'
import { supabase } from '../supabaseClient'
import type { ReviewItem } from '../supabaseTypes'
import AdminModal from '../components/admin/AdminModal'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import { useToast } from '../components/admin/Toast'
import { isAdminModeEnabled } from '../utils/adminMode'
import { lockScroll, unlockScroll } from '../utils/scrollLock'
import { Plus, Edit, Trash2 } from 'lucide-react'

type Review = {
  quote: string
  context: string
  author: string
  proofImage: string
  detail: string
  rating?: number
  dbId?: string
}

type ReviewsContent = {
  eyebrow: string
  title: string
  subtitle: string
  trustText: string
}

const fallbackReviewsContent: ReviewsContent = {
  eyebrow: 'GUEST NOTES',
  title: 'What Our Guests Say',
  subtitle: "Real stories from real celebrations - hear it directly from those who've experienced Villa Susane.",
  trustText: 'Rated 5.0 from {count}+ verified reviews',
}

const fallbackReviews: Review[] = [
  {
    quote: 'Wonderful experience! Stunning decor, accommodating staff, delicious food, and great value.',
    context: 'Family Celebration',
    author: 'Gafnie Lyn Fuentes',
    proofImage: '/review1.jpg',
    detail: 'Such a wonderful experience! The staff were incredibly accommodating, and the decor was absolutely stunning. For such an affordable price, we got so much value: delicious food, comfortable accommodation, and a beautiful cake. We\'ll definitely be back!',
  },
  {
    quote: 'Thank you for making my 18th Debut fantasy dream come true!',
    context: '18th Debut',
    author: 'Shona',
    proofImage: '/review2.jpg',
    detail: 'Thank you very much for being part of my 18th Debut Celebration. I really enjoyed my night and am super grateful that you guys made an effort to make my fantasy dream come true!',
  },
  {
    quote: 'Nice ambiance, good food, and hassle-free booking! 👍',
    context: 'Christmas Party',
    author: 'Au Acevedo-Bendebel',
    proofImage: '/review3.jpg',
    detail: 'We thoroughly enjoyed our Christmas party at Villa Susane! It features a nice ambiance, good food, and a completely hassle-free booking experience. 👍👍👍👍👍',
  },
  {
    quote: 'An experience I will remember and cherish forever! 🥰',
    context: 'Special Event',
    author: 'Jade Nicole Ramos',
    proofImage: '/review4.jpg',
    detail: 'Thank you so much to Villa Susane and the staff for making this event happen! It is an experience that I will remember and cherish forever.',
  },
]

export default function ReviewsSection() {
  const showAdmin = isAdminModeEnabled() && window.location.pathname === '/admin-vs-2024'
  const { showToast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    variant?: 'danger' | 'default'
    confirmLabel?: string
    onConfirm: () => void
  } | null>(null)

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { variant?: 'danger' | 'default'; confirmLabel?: string },
  ) => {
    setConfirmDialog({
      title,
      message,
      variant: options?.variant ?? 'danger',
      confirmLabel: options?.confirmLabel,
      onConfirm,
    })
  }

  const lightboxLockId = useId()
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [content, setContent] = useState<ReviewsContent>(fallbackReviewsContent)
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews)
  const [deletedFallbackIndices, setDeletedFallbackIndices] = useState<Set<number>>(new Set())
  const [fallbackEdit, setFallbackEdit] = useState<Record<number, Partial<Review>>>({})

const visibleReviews = reviews.filter((r, idx) => {
    if (r.dbId) return true
    return !deletedFallbackIndices.has(idx)
  }).map((r) => {
    const originalIdx = reviews.indexOf(r)
    const edit = fallbackEdit[originalIdx]
    return edit ? { ...r, ...edit } : r
  })

  const deleteFallbackReview = (index: number) => {
    const review = reviews[index]
    openConfirm(
      'Remove review from display?',
      `Remove "${review.author}'s" review from display?`,
      () => {
        setDeletedFallbackIndices(prev => new Set([...prev, index]))
        showUndoReview(index, { edit: fallbackEdit[index], name: review.author })
        showToast(`Removed "${review.author}'s" review from display.`)
      },
    )
  }

  const saveFallbackReviewToDB = async (review: Review, originalIdx: number) => {
    setSavingReview(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        guest_name: review.author,
        event_type: review.context,
        rating: review.rating ?? 5,
        quote: review.quote,
      })
      if (error) throw error
      setDeletedFallbackIndices(prev => new Set([...prev, originalIdx]))
      setFallbackEdit(prev => { const n={...prev}; delete n[originalIdx]; return n })
      showToast('Review saved to database.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save review', 'error')
    } finally {
      setSavingReview(false)
    }
  }

  // ── Undo for fallback review deletions ──
  const [undoFallback, setUndoFallback] = useState<{ index: number; data: any; timer: number } | null>(null)

  const showUndoReview = (index: number, data: any) => {
    if (undoFallback) clearTimeout(undoFallback.timer)
    const timer = window.setTimeout(() => setUndoFallback(null), 5000)
    setUndoFallback({ index, data, timer })
  }

  // Review management state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [savingReview, setSavingReview] = useState(false)
  const [reviewDraft, setReviewDraft] = useState({
    guest_name: '',
    event_type: '',
    rating: 5,
    quote: '',
  })
  // ── Image upload for reviews ──
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null)
  const BUCKET = 'villa-images'
  const uploadReviewImage = async (file: File) => {
    const path = `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw error
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  useEffect(() => {
    let isMounted = true

    Promise.all([
      client.fetch<Partial<ReviewsContent> | null>(`
        *[_type == "reviewsSection"][0]{
          eyebrow,
          title,
          subtitle,
          trustText
        }
      `),
      client.fetch<Review[]>(`
        *[_type == "review"] | order(_createdAt asc){
          quote,
          detail,
          context,
          author,
          "proofImage": proofImage.asset->url
        }
      `),
    ])
      .then(([sectionData, reviewData]) => {
        if (!isMounted) return

        if (sectionData) {
          setContent({
            ...fallbackReviewsContent,
            ...sectionData,
          })
        }

        if (reviewData.length) {
          setReviews(
            reviewData.map((review, index) => ({
              ...fallbackReviews[index % fallbackReviews.length],
              ...review,
              proofImage: review.proofImage || fallbackReviews[index % fallbackReviews.length].proofImage,
            })),
          )
        }
      })
      .catch(() => {
        if (!isMounted) return
        // Only reset the section headings. Do NOT reset `reviews` here —
        // Supabase is the source of truth and must survive a Sanity failure.
        setContent(fallbackReviewsContent)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id,guest_name,event_type,rating,quote')

      if (!isMounted || error || !data?.length) return

      setReviews(
        data.map((review: ReviewItem, index) => {
          const fallback = fallbackReviews[index % fallbackReviews.length]
          return {
            dbId: review.id,
            quote: review.quote,
            context: review.event_type,
            author: review.guest_name,
            detail: review.quote,
            rating: review.rating,
            proofImage: fallback.proofImage,
          }
        }),
      )
    }

    loadReviews()

    const channel = supabase
      .channel('public-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, loadReviews)
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const filters = ['All', ...Array.from(new Set(reviews.map(r => r.context)))]
  
  const filteredReviews = activeFilter === 'All' 
    ? visibleReviews
    : visibleReviews.filter(r => r.context === activeFilter)

  const openLightbox = (image: string) => {
    setLightboxImage(image)
    lockScroll(lightboxLockId)
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    unlockScroll(lightboxLockId)
  }

  // ── Review CRUD ──
  const resetReviewDraft = () => {
    setEditingReviewId(null)
    setReviewDraft({ guest_name: '', event_type: '', rating: 5, quote: '' })
  }

  const saveReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingReview(true)
    try {
      const { guest_name, event_type, rating, quote } = reviewDraft
      let proofImageUrl = ''
      if (reviewImageFile) {
        proofImageUrl = await uploadReviewImage(reviewImageFile)
      }
      const payload = { guest_name, event_type, rating, quote }
      if (proofImageUrl) {
        ;(payload as any).proof_image_url = proofImageUrl
      }
      const { error } = editingReviewId
        ? await supabase.from('reviews').update(payload).eq('id', editingReviewId)
        : await supabase.from('reviews').insert(payload)
      if (error) throw error
      resetReviewDraft()
      setReviewImageFile(null)
      setReviewModalOpen(false)
      showToast(editingReviewId ? 'Review updated.' : 'Review added.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save review', 'error')
    } finally {
      setSavingReview(false)
    }
  }

  const deleteReview = async (id: string) => {
    openConfirm(
      'Delete this review?',
      'This will permanently remove the review from the database.',
      async () => {
        const { error } = await supabase.from('reviews').delete().eq('id', id)
        if (error) {
          showToast(error.message, 'error')
          return
        }
        showToast('Review deleted.')
      },
    )
  }

  const openEditReview = (review: Review & { dbId?: string }) => {
    if (!review.dbId) return
    setEditingReviewId(review.dbId)
    setReviewDraft({
      guest_name: review.author,
      event_type: review.context,
      rating: review.rating ?? 5,
      quote: review.quote,
    })
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <section id="reviews" className="reviews-section" aria-label="Guest reviews">
      {/* Background decoration */}
      <div className="reviews-bg-accent" aria-hidden="true" />

      <div className="reviews-container">
        {/* ── Header ── */}
        <div className="section-header reveal">
          <div className="reviews-header-rule" aria-hidden="true">
            
           
          </div>
          <span className="section-tag" data-sanity="reviewsSection.eyebrow">{content.eyebrow}</span>
          <h2 className="section-title" data-sanity="reviewsSection.title">{content.title}</h2>
          <p className="section-subtitle" data-sanity="reviewsSection.subtitle">
            {content.subtitle}
          </p>
          {showAdmin && (
            <div className="posts-header" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="posts-admin-manage" type="button" onClick={() => setReviewModalOpen(true)}>
                Manage
              </button>
            </div>
          )}
        </div>

        {/* ── Trust Badge ── */}
        <div className="reviews-trust-badge reveal">
          <div className="reviews-trust-stars">
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#FFB800">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <span className="reviews-trust-text" data-sanity="reviewsSection.trustText">{content.trustText.replace('{count}', String(reviews.length))}</span>
        </div>

        {/* ── Filter Pills ── */}
        <div className="reviews-filters reveal">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`reviews-filter-pill ${activeFilter === filter ? 'reviews-filter-pill--active' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* ── Reviews Grid ── */}
        <div className="reviews-grid">
          {filteredReviews.map((review, index) => (
            <article 
              className="review-card reveal" 
              style={{ animationDelay: `${index * 0.1}s` }} 
              key={`${review.author}-${index}`}
            >
              {/* Text Panel */}
              <div className="review-text-panel">
                <div className="review-header">
                  <span className="review-context" data-sanity="review.context">{review.context}</span>
                  <div className="review-stars">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < (review.rating ?? 5) ? '#FFB800' : 'rgba(255,184,0,0.22)'}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                </div>

                <blockquote className="review-quote" data-sanity="review.quote">
                  <span className="review-quote-mark">"</span>
                  {review.quote}
                </blockquote>

                <div className="review-detail" data-sanity="review.detail">
                  <p>{review.detail}</p>
                </div>

                <div className="review-author-wrapper">
                  <div className="review-author-info">
                    <div className="review-author-avatar">
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <span className="review-author" data-sanity="review.author">{review.author}</span>
                      <span className="review-verified">Verified Guest</span>
                    </div>
                  </div>
                  <svg className="review-quote-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M10 11H6C4.9 11 4 11.9 4 13V17C4 18.1 4.9 19 6 19H10C11.1 19 12 18.1 12 17V13C12 11.9 11.1 11 10 11Z" fill="currentColor" opacity="0.6"/>
                    <path d="M18 11H14C12.9 11 12 11.9 12 13V17C12 18.1 12.9 19 14 19H18C19.1 19 20 18.1 20 17V13C20 11.9 19.1 11 18 11Z" fill="currentColor" opacity="0.6"/>
                  </svg>
                </div>
              </div>

              {/* Proof Image Panel */}
              <div className="review-proof-panel" onClick={() => openLightbox(review.proofImage)}>
                <img 
                  src={review.proofImage} 
                  alt={`Screenshot from ${review.author}'s ${review.context}`} 
                  loading="lazy" 
                  data-sanity="review.proofImage"
                />
                <div className="review-proof-overlay">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>View screenshot</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty state */}
        {filteredReviews.length === 0 && (
          <div className="reviews-empty">
            <p>No reviews found for this category.</p>
            <button onClick={() => setActiveFilter('All')}>Show all reviews</button>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} aria-label="Close image viewer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <img src={lightboxImage} alt="Review screenshot enlarged" />
          </div>
        </div>
      )}

      {/* ── Review Management Modal ── */}
      <AdminModal
        title={editingReviewId ? 'Edit Review' : 'Manage Guest Reviews'}
        open={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); resetReviewDraft(); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ── Undo banner ── */}
          {undoFallback && (
            <div style={{ padding: '0.75rem 1rem', background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#E65100' }}>Removed "{undoFallback.data.name}'s" review from display</span>
              <button
                type="button"
                onClick={() => {
                  if (undoFallback) {
                    clearTimeout(undoFallback.timer)
                    setDeletedFallbackIndices(prev => { const n = new Set(prev); n.delete(undoFallback.index); return n })
                    if (undoFallback.data.edit) {
                      setFallbackEdit(prev => ({ ...prev, [undoFallback.index]: undoFallback.data.edit }))
                    }
                    setUndoFallback(null)
                  }
                }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #FFB74D', background: '#FFF', color: '#E65100', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
              >
                Undo
              </button>
            </div>
          )}

          {/* All reviews list (DB + fallback) */}
          <div>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
              All Reviews ({reviews.filter(r => !deletedFallbackIndices.has(reviews.indexOf(r)) || r.dbId).length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reviews.map((review, idx) => {
                if (!review.dbId && deletedFallbackIndices.has(idx)) return null
                return (
                  <div key={review.dbId || `fallback-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.9rem' }}>{review.author}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem' }}>{review.context}</span>
                      <span style={{ fontSize: '0.75rem', color: '#FFB800', marginLeft: '0.5rem' }}>{'★'.repeat(review.rating ?? 5)}</span>
                      {!review.dbId && <span style={{ fontSize: '0.7rem', color: '#aaa', marginLeft: '0.5rem', fontStyle: 'italic' }}>(default)</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {review.dbId ? (
                        <>
                          <button type="button" onClick={() => openEditReview(review)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Edit size={14} />
                            Edit
                          </button>
                          <button type="button" onClick={() => deleteReview(review.dbId!)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => saveFallbackReviewToDB(review, idx)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #2a9d8f', color: '#2a9d8f', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Plus size={14} />
                            Save to DB
                          </button>
                          <button type="button" onClick={() => deleteFallbackReview(idx)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add/Edit form */}
          <form id="reviews-admin-form" onSubmit={saveReview} className="rates-admin-room-form">
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
              <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              {editingReviewId ? 'Edit Review' : 'Add New Review'}
            </h4>
            <label className="rates-admin-field">
              <span>Guest Name</span>
              <input required value={reviewDraft.guest_name} onChange={(e) => setReviewDraft({ ...reviewDraft, guest_name: e.target.value })} placeholder="e.g. Maria Santos" />
            </label>
            <label className="rates-admin-field">
              <span>Event Type</span>
              <input value={reviewDraft.event_type} onChange={(e) => setReviewDraft({ ...reviewDraft, event_type: e.target.value })} placeholder="e.g. Birthday, Wedding, Family Celebration" />
            </label>
            <label className="rates-admin-field">
              <span>Rating</span>
              <select value={reviewDraft.rating} onChange={(e) => setReviewDraft({ ...reviewDraft, rating: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d0d0d0' }}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </label>
            <label className="rates-admin-field">
              <span>Quote / Review Text</span>
              <textarea required rows={4} value={reviewDraft.quote} onChange={(e) => setReviewDraft({ ...reviewDraft, quote: e.target.value })} placeholder="Guest's testimonial..." />
            </label>
            <label className="rates-admin-field">
              <span>Screenshot / Proof Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReviewImageFile(e.target.files?.[0] || null)}
              />
              {reviewImageFile && (
                <div style={{ fontSize: '0.8rem', color: '#006D77', marginTop: '0.25rem' }}>
                  Selected: {reviewImageFile.name}
                </div>
              )}
            </label>
          </form>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="rates-admin-modal-cancel" onClick={() => { setReviewModalOpen(false); resetReviewDraft(); }} disabled={savingReview}>
              Cancel
            </button>
            <button type="submit" className="rates-admin-modal-primary" form="reviews-admin-form" disabled={savingReview}>
              {savingReview ? 'Saving...' : editingReviewId ? 'Update Review' : 'Add Review'}
            </button>
          </div>
        </div>
      </AdminModal>

{/* ── Custom Confirmation Dialog ── */}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        variant={confirmDialog?.variant}
        confirmLabel={confirmDialog?.confirmLabel}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await confirmDialog?.onConfirm()
          setConfirmDialog(null)
        }}
      />
    </section>
  )
}

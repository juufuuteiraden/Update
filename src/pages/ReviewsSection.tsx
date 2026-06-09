import { useState, useEffect } from 'react'
import { client } from '../sanityClient'
import './ReviewsSection.css'
import { supabase } from '../supabaseClient'
import type { ReviewItem } from '../supabaseTypes'

type Review = {
  quote: string
  context: string
  author: string
  proofImage: string
  detail: string
  rating?: number
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [content, setContent] = useState<ReviewsContent>(fallbackReviewsContent)
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews)

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
        setContent(fallbackReviewsContent)
        setReviews(fallbackReviews)
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
    ? reviews 
    : reviews.filter(r => r.context === activeFilter)

  const openLightbox = (image: string) => {
    setLightboxImage(image)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    document.body.style.overflow = ''
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
    </section>
  )
}

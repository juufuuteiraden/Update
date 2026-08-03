import { useState, useEffect, useCallback } from 'react'

import './App.css'
import { useToast } from './components/admin/Toast'
import HeroSection from './pages/HeroSection'
import Amenities from './pages/Amenities'
import Rates from './pages/Rates'
import Packages from './pages/Packages'
import ContactSection from './pages/ContactSection'
import FindUs from './pages/FindUs'
import PostsSection from './pages/PostsSection'
import ReviewsSection from './pages/ReviewsSection'
import AdminModeToolbar from './components/admin/AdminModeToolbar'
import { supabase } from './supabaseClient'
import { unlockAllScroll } from './utils/scrollLock'
import './components/admin/adminModeLogin.css'
/* ----------------------------------------------------------
   Types
   ---------------------------------------------------------- */
interface RoomData {
  id: number
  name: string
  description: string
  price: string
  guests: string
  image: string
  badge?: string
  priceRows?: { label: string; price: string; note?: string }[]
}

type ReservationFormData = {
  checkIn: string
  checkOut: string
  guests: string
  name: string
  email: string
  phone: string
  requests: string
}

type ReservationSummary = {
  roomName: string
  nightlyRate: number
  nights: number
  total: number
  checkInDisplay: string
  checkOutDisplay: string
  form: ReservationFormData
}

/* ----------------------------------------------------------
   Data
   ---------------------------------------------------------- */
const rooms: RoomData[] = [
  {
    id: 1,
    name: 'Weekday Pool Access',
    description: 'Pool access for weekday walk-in guests.',
    price: 'PHP 150',
    guests: 'Walk-in pool access',
    image: '/room-ocean.jpg',
    badge: 'WEEKDAY',
    priceRows: [
      { label: 'Adults', price: 'PHP 150' },
      { label: 'Children', price: 'PHP 100', note: '3ft & below' },
    ],
  },
  {
    id: 2,
    name: 'Weekend / Holiday Pool Access',
    description: 'Pool access for weekend and holiday walk-in guests.',
    price: 'PHP 150',
    guests: 'Walk-in pool access',
    image: '/room-garden.jpg',
    badge: 'POPULAR',
    priceRows: [
      { label: 'Adults', price: 'PHP 150' },
      { label: 'Children', price: 'PHP 100', note: '3ft & below' },
    ],
  },
  {
    id: 3,
    name: 'Table Cottage Rentals',
    description: 'Choose the cottage size that fits your group.',
    price: 'PHP 300+',
    guests: 'Capacity-based',
    image: '/room-beachfront.jpg',
    badge: 'GROUP FAVORITE',
    priceRows: [
      { label: '4-6 people', price: 'PHP 300' },
      { label: '10-20 people', price: 'PHP 500' },
      { label: '20-30 people', price: 'PHP 1,000' },
    ],
  },
]

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Posts', href: '#posts' },
  { label: 'Rates', href: '#rates' },
  { label: 'Amenities', href: '#amenities' },
  { label: 'Location', href: '#location' },
  { label: 'Packages', href: '#packages' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Contact', href: '#contact' },
]

type SiteSettings = {
  title: string
  navigation: typeof navLinks
}

const fallbackSiteSettings: SiteSettings = {
  title: 'Villa Susane',
  navigation: navLinks,
}

/* ----------------------------------------------------------
   Admin constants
   ---------------------------------------------------------- */
const SESSION_KEY = 'villa_susane_admin_session'

/* ----------------------------------------------------------
   Custom hook for scroll-triggered animations
   ---------------------------------------------------------- */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )
    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}



function formatReservationDate(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function parseRoomRate(price: string) {
  const numeric = price.replace(/[^\d.]/g, '')
  return Number(numeric) || 0
}

function formatPeso(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

function getReservationNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0
  const start = new Date(`${checkIn}T00:00:00`)
  const end = new Date(`${checkOut}T00:00:00`)
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000)
  return nights > 0 ? nights : 0
}

function SectionDivider() {
  return (
    <div className="section-divider-shell" aria-hidden="true">
      <span className="section-divider-line" />
      <span className="section-divider-mark" />
      <span className="section-divider-line" />
    </div>
  )
}

/* ----------------------------------------------------------
   Booking Modal Component
   ---------------------------------------------------------- */
function BookingModal({
  room,
  isOpen,
  onClose,
  onSubmit,
}: {
  room: RoomData | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (roomName: string, form: ReservationFormData) => void
}) {
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: '2',
    name: '',
    email: '',
    phone: '',
    requests: '',
  })
  const [summary, setSummary] = useState<ReservationSummary | null>(null)
  const [formError, setFormError] = useState('')
  const [isSending, setIsSending] = useState(false)

  if (!isOpen || !room) return null

  const checkInDisplay = formatReservationDate(formData.checkIn)
  const checkOutDisplay = formatReservationDate(formData.checkOut)
  const nightlyRate = parseRoomRate(room.price)
  const nights = getReservationNights(formData.checkIn, formData.checkOut)
  const total = nightlyRate * nights

  const resetAndClose = () => {
    setSummary(null)
    setFormError('')
    onClose()
  }

  const handleReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!nights) {
      setFormError('Please choose a check-out date after your check-in date.')
      return
    }
    setFormError('')
    setSummary({
      roomName: room.name,
      nightlyRate,
      nights,
      total,
      checkInDisplay,
      checkOutDisplay,
      form: formData,
    })
  }

  const sendReservation = async () => {
    if (!summary) return
    setIsSending(true)
    const payload = new FormData()
    payload.append('subject', `${summary.roomName} Reservation!`)
    payload.append('Room Name', summary.roomName)
    payload.append('Nightly Rate', formatPeso(summary.nightlyRate))
    payload.append('Number of Nights', String(summary.nights))
    payload.append('Total Amount', formatPeso(summary.total))
    payload.append('Check-in Date', summary.checkInDisplay)
    payload.append('Check-out Date', summary.checkOutDisplay)
    payload.append('Number of Guests', summary.form.guests)
    payload.append('Full Name', summary.form.name)
    payload.append('Email', summary.form.email)
    payload.append('Phone', summary.form.phone)
    payload.append('Special Requests', summary.form.requests || 'None')

    try {
      const response = await fetch('https://formspree.io/f/mlgvrkjd', {
        method: 'POST',
        body: payload,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Unable to send reservation.')
      onSubmit(summary.roomName, summary.form)
      setIsSending(false)
      resetAndClose()
    } catch {
      setIsSending(false)
      setFormError('We could not send the reservation right now. Please try again in a moment.')
    }
  }

  return (
    <div
      className="reservation-modal-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: 'rgba(0,109,119,0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={resetAndClose}
    >
      <div
        className={`reservation-modal${summary ? ' reservation-modal--confirmation' : ''}`}
        style={{
          background: '#FFFDF7',
          border: '2px solid #006D77',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={resetAndClose}
          className="reservation-close-button"
          aria-label="Close reservation"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#FF8360',
            color: '#FFFDF7',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#ff6b42' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#FF8360' }}
        >
          ✕
        </button>

        {!summary ? (
          <>
            <h3
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '1.5rem',
                color: '#006D77',
                marginBottom: '0.5rem',
              }}
            >
              Reserve <span data-sanity="room.name">{room.name}</span>
            </h3>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                color: '#6B7B7C',
                marginBottom: '1.5rem',
              }}
            >
              {room.price} / night · {room.guests}
            </p>

            <form
              onSubmit={handleReview}
              className="reservation-form"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-field">
                  <label className="form-label">Check-in Date</label>
                  <input
                    type="date"
                    required
                    className="form-input reservation-native-date"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Check-out Date</label>
                  <input
                    type="date"
                    required
                    min={formData.checkIn || undefined}
                    className="form-input reservation-native-date"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  />
                </div>
              </div>

              <div className="reservation-total-preview">
                <span>{nights || 0} night{nights === 1 ? '' : 's'} selected</span>
                <strong>{formatPeso(total)}</strong>
              </div>

              <div className="form-field">
                <label className="form-label">Number of Guests</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  className="form-input"
                  name="Number of Guests"
                  value={formData.guests}
                  onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  name="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  name="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  name="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Special Requests (Optional)</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  name="Special Requests"
                  value={formData.requests}
                  onChange={(e) => setFormData({ ...formData, requests: e.target.value })}
                />
              </div>

              {formError && <p className="reservation-error">{formError}</p>}

              <button
                type="submit"
                className="submit-button reservation-submit-button"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                Review Inquiry
              </button>
            </form>
          </>
        ) : (
          <div className="reservation-confirmation">
            <span className="form-intro-step">Confirm details</span>
            <h3>{summary.roomName} Reservation!</h3>
            <p className="reservation-confirmation-copy">Please review the details before we send your inquiry.</p>

            <div className="reservation-total-card">
              <span>Total to be paid</span>
              <strong>{formatPeso(summary.total)}</strong>
              <small>{formatPeso(summary.nightlyRate)} x {summary.nights} night{summary.nights === 1 ? '' : 's'}</small>
            </div>

            <div className="reservation-summary-grid">
              {[
                ['Guest', summary.form.name],
                ['Email', summary.form.email],
                ['Phone', summary.form.phone],
                ['Guests', summary.form.guests],
                ['Check-in', summary.checkInDisplay],
                ['Check-out', summary.checkOutDisplay],
              ].map(([label, value]) => (
                <div className="reservation-summary-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            {summary.form.requests && (
              <div className="reservation-summary-note">
                <span>Special Requests</span>
                <p>{summary.form.requests}</p>
              </div>
            )}

            {formError && <p className="reservation-error">{formError}</p>}

            <div className="reservation-confirmation-actions">
              <button type="button" className="reservation-secondary-button" onClick={() => setSummary(null)} disabled={isSending}>
                Edit Details
              </button>
              <button type="button" className="submit-button reservation-submit-button" onClick={sendReservation} disabled={isSending}>
                <span>{isSending ? 'Sending...' : 'Send Reservation'}</span>
                {!isSending && (
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------
   Main App Component
   ---------------------------------------------------------- */
export default function App() {
  const { showToast } = useToast()
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)
  const siteSettings = fallbackSiteSettings

  // Admin login state — only used on /admin-vs-2024
  // Starts logged out; the real Supabase session (restored below) decides access.
  const [adminAuth, setAdminAuth] = useState(false)
  const [adminLogin, setAdminLogin] = useState({ user: '', password: '', showPassword: false })
  const [adminLoginError, setAdminLoginError] = useState('')

  useScrollReveal()

  // Sanity siteSettings fetch removed: current build does not define a Sanity `client`.
  // Keeping fallbackSiteSettings ensures the homepage and /admin-vs-2024 route load.


  useEffect(() => {

    const handleScroll = () => {
      setHeaderScrolled(window.scrollY > window.innerHeight - 100)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false)
        setMobileMenuOpen(false)
        unlockAllScroll()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Restore Supabase admin session on mount + listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        try { localStorage.setItem(SESSION_KEY, 'true') } catch { /* ignore */ }
        setAdminAuth(true)
        setAdminMode(true)
      } else {
        // No real Supabase session — clear any stale local flag so admin mode
        // cannot be entered (or bypass the login screen) without a valid login.
        try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
        setAdminAuth(false)
        setAdminMode(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        try { localStorage.setItem(SESSION_KEY, 'true') } catch { /* ignore */ }
        setAdminAuth(true)
        setAdminMode(true)
      } else {
        try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
        setAdminAuth(false)
        setAdminMode(false)
      }
    })

    return () => { listener.subscription.unsubscribe() }
  }, [])

  const openBookingModal = useCallback((room: RoomData) => {
    setSelectedRoom(room)
    setModalOpen(true)
  }, [])

  const handleBookingSubmit = useCallback(
    (roomName: string, form: ReservationFormData) => {
      const STORAGE_KEY = 'balamban_reservations'
      const now = new Date().toISOString()
      const newReservation = {
        roomName,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests) || 0,
        name: form.name,
        email: form.email,
        phone: form.phone,
        requests: form.requests,
        createdAt: now,
      }
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? (JSON.parse(raw) as unknown[]) : []
        const list = Array.isArray(parsed) ? parsed : []
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, newReservation]))
} catch { /* storage unavailable */ }
      showToast(`Booking request received for ${roomName}! We will contact you shortly.`, 'success')
    },
    []
  )

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  /* Shared style objects */
  const coralBtn = {
    display: 'inline-block',
    padding: '1rem 2.5rem',
    borderRadius: '50px',
    background: '#FF8360',
    color: '#FFFDF7',
    border: 'none',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: '0.95rem',
    letterSpacing: '0.03em',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  } as React.CSSProperties

  const sectionLabel = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#FF8360',
    marginBottom: '0.75rem',
  } as React.CSSProperties

  const sectionHeading = {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 400,
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    color: '#006D77',
    letterSpacing: '-0.01em',
    marginBottom: '0.75rem',
  } as React.CSSProperties

  const sectionSubtitle = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: '1rem',
    color: '#6B7B7C',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: 1.6,
  } as React.CSSProperties

  const inputFieldStyle = {
    width: '100%',
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    border: '1px solid rgba(0,109,119,0.18)',
    background: '#FFFDF7',
    fontFamily: 'Inter, sans-serif',
    fontSize: '1rem',
    color: '#1A2B2C',
    outline: 'none',
    transition: 'border 0.2s, box-shadow 0.2s',
  } as React.CSSProperties

  /* ----------------------------------------------------------
     Admin route: /admin-vs-2024
     All hooks are declared above — only rendering is conditional.
     ---------------------------------------------------------- */
  // Robust admin route detection for dev/proxy environments.
  // Handles:
  // - trailing slash (/admin-vs-2024/)
  // - query params (/admin-vs-2024?x=1)
  // - base path / subdirectory deployments
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const pathNoQuery = pathname.split('?')[0]
  const isAdminRoute = pathNoQuery.endsWith('/admin-vs-2024')



  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAdminLoginError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: adminLogin.user.trim(),
      password: adminLogin.password,
    })
    if (error) {
      setAdminLoginError('Invalid admin credentials.')
      return
    }
    try { localStorage.setItem(SESSION_KEY, 'true') } catch { /* ignore */ }
    setAdminAuth(true)
    setAdminMode(true)
  }

  if (isAdminRoute && !adminAuth) {
    return (
      <main className="admin-mode-login-shell">
        <form onSubmit={handleAdminLogin} className="admin-mode-login-card">
          <h1 className="admin-mode-login-title">Admin Access</h1>
          <p className="admin-mode-login-subtitle">Enter credentials to open the admin mode screen.</p>

          <input
            className="admin-mode-login-input"
            value={adminLogin.user}
            placeholder="Username"
            onChange={(e) => setAdminLogin({ ...adminLogin, user: e.target.value })}
            autoComplete="username"
          />

          <div className="admin-mode-login-password">
            <input
              className="admin-mode-login-input admin-mode-login-password__input"
              type={adminLogin.showPassword ? 'text' : 'password'}
              value={adminLogin.password}
              placeholder="Password"
              onChange={(e) => setAdminLogin((prev) => ({ ...prev, password: e.target.value }))}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="admin-mode-login-password__toggle"
              aria-label={adminLogin.showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setAdminLogin((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
            >
              {adminLogin.showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10.58 10.58a2 2 0 002.83 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M9.88 5.08A10.94 10.94 0 0112 5c7 0 10 7 10 7a15.3 15.3 0 01-3.07 4.27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6.12 6.12C3.6 7.72 2 12 2 12s3 7 10 7c1.2 0 2.3-.22 3.3-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>

          {adminLoginError && <p className="admin-mode-login-error">{adminLoginError}</p>}

          <button className="admin-mode-login-submit" type="submit">
            Sign In
          </button>
        </form>
      </main>
    )
  }

  if (isAdminRoute && adminAuth) {
    return (
      <div>
        <AdminModeToolbar
          onLogout={async () => {
            await supabase.auth.signOut()
            try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
            unlockAllScroll()
            setAdminAuth(false)
            setAdminMode(false)
          }}
        />
        {/* Render the full site in admin mode so Manage buttons appear (e.g. PostsSection). */}
        {/* Reuse the normal homepage layout but keep adminMode enabled. */}
        <div>
          {/* NOTE: We keep the exact same structure as the normal render below. */}
          {/* The headerScrolled / scrollToSection behavior is irrelevant for admin editing buttons, but PostsSection relies on adminMode via isAdminModeEnabled(). */}
          <div className="grain-overlay" />
          <BookingModal room={selectedRoom} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleBookingSubmit} />
          <HeroSection onLearnMore={() => scrollToSection('#rates')} />
          <SectionDivider />
          <PostsSection />
          <SectionDivider />
          <Rates rooms={rooms} onBook={openBookingModal} />
          <SectionDivider />
          <Amenities />
          <SectionDivider />
          <FindUs />
          <SectionDivider />
          <Packages onAskAboutThis={() => scrollToSection('#contact')} />
          <SectionDivider />
          <SectionDivider />
          <ReviewsSection />
          <SectionDivider />
          <ContactSection
            coralBtn={coralBtn}
            sectionLabel={sectionLabel}
            sectionHeading={sectionHeading}
            sectionSubtitle={sectionSubtitle}
            inputFieldStyle={inputFieldStyle}
          />
        </div>
      </div>
    )
  }

  /* ----------------------------------------------------------
     Normal homepage render
     ---------------------------------------------------------- */
  const visibleNavLinks = siteSettings.navigation.length ? siteSettings.navigation : navLinks

  return (
    <div>
      {adminMode && (
        <AdminModeToolbar
          onLogout={() => {
            try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
            unlockAllScroll()
            setAdminMode(false)
          }}
        />
      )}

{/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Booking Modal */}
      <BookingModal room={selectedRoom} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleBookingSubmit} />

      {/* ══════════════════════════════════════════
          HEADER / NAVIGATION
      ══════════════════════════════════════════ */}
      <header
        className={`navbar${headerScrolled ? ' scrolled' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: headerScrolled ? '64px' : '80px',
          display: 'flex',
          alignItems: 'center',
          background: headerScrolled ? 'rgba(0, 109, 119, 0.96)' : 'transparent',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            padding: '0 clamp(1rem, 4vw, 3rem)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); scrollToSection('#home') }}
            data-sanity="siteSettings.title"
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '1.25rem',
              color: '#FFFDF7',
              letterSpacing: '-0.01em',
            }}
          >
            {siteSettings.title}
          </a>

          <nav className="desktop-nav" data-sanity="siteSettings.navigation" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {visibleNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollToSection(link.href) }}
                style={{ color: '#FDFCDC', fontWeight: 500, fontSize: '0.875rem', letterSpacing: '0.03em' }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            className={`mobile-hamburger${mobileMenuOpen ? ' open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
          >
            <span style={{ background: '#FDFCDC' }} />
            <span style={{ background: '#FDFCDC' }} />
            <span style={{ background: '#FDFCDC' }} />
          </button>
        </div>

        <div
          className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(0, 109, 119, 0.97)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }} data-sanity="siteSettings.navigation">
            {visibleNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollToSection(link.href) }}
                style={{ color: '#FDFCDC', fontWeight: 400, fontSize: '1.1rem' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <HeroSection onLearnMore={() => scrollToSection('#rates')} />
      <SectionDivider />

      <PostsSection />
      <SectionDivider />

      <Rates rooms={rooms} onBook={openBookingModal} />
      <SectionDivider />

      <Amenities />
      <SectionDivider />

      <FindUs />
      <SectionDivider />

      <Packages onAskAboutThis={() => scrollToSection('#contact')} />
      <SectionDivider />
      <SectionDivider />

      <ReviewsSection />
      <SectionDivider />

      <ContactSection
        coralBtn={coralBtn}
        sectionLabel={sectionLabel}
        sectionHeading={sectionHeading}
        sectionSubtitle={sectionSubtitle}
        inputFieldStyle={inputFieldStyle}
      />

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer
        style={{
          background: 'var(--section-white)',
          color: '#1A2B2C',
          padding: 'clamp(3rem, 6vw, 4rem) clamp(1rem, 4vw, 3rem) 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="reveal"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '3rem',
            paddingBottom: '3rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, fontSize: '1.5rem', color: '#1A2B2C', marginBottom: '0.5rem' }}>
              Villa Susane Resort
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: '0.9rem', color: '#6B7B7C', lineHeight: 1.7 }}>
              Your private escape on the western coast of Cebu.
            </p>
          </div>

          <div>
            <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF8360', marginBottom: '1rem' }}>
              Contact
            </h4>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#6B7B7C', marginBottom: '0.5rem', lineHeight: 1.7 }}>
              Abucayan, Balamban, Cebu, Philippines
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#6B7B7C', marginBottom: '0.5rem' }}>
              0929 479 9835
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#6B7B7C' }}>
              balambanbooking@gmail.com
            </p>
          </div>

          <div>
            <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF8360', marginBottom: '1rem' }}>
              Follow Us
            </h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[
                {
                  href: 'https://www.facebook.com/villasusane.roomsnvenue',
                  label: 'Facebook',
                  path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
                },
                {
                  href: '#',
                  label: 'Instagram',
                  path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
                },
                {
                  href: '#',
                  label: 'Twitter',
                  path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
                },
              ].map(({ href, label, path }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  style={{
                    color: '#006D77',
                    transition: 'color 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'inline-flex',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FF8360'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#006D77'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            borderTop: '1px solid rgba(255,131,96,0.22)',
            padding: '1.5rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#6B7B7C' }}>
            © 2024 Balamban Coastal Resort. All rights reserved.
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#6B7B7C' }}>
            Privacy Policy | Terms of Service
          </p>
        </div>
      </footer>
    </div>
  )
}
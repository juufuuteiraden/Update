import { useEffect, useRef, useState } from 'react'
import { client } from '../sanityClient'
import { BedDouble, Package, PartyPopper, Waves, MessageCircleQuestion } from 'lucide-react'
import './ContactSection.css'

/* ── Types ── */
type InquiryCategory = 'rooms' | 'packages' | 'occasions' | 'amenities' | 'general'

type InquiryData = {
  interest: string
  eventType: string
  guestCount: string
  eventDate: string
  budget: string
  name: string
  phone: string
  email: string
  notes: string
}

type ContactContent = {
  eyebrow: string
  title: string
  subtitle: string
  formIntro: string
  directPhone: string
  directEmail: string
  facebookPage: string
}

/* ── Category config ── */
const CATEGORIES: { id: InquiryCategory; label: string; icon: React.ReactNode; blurb: string }[] = [
  { id: 'rooms', label: 'Rooms & Rates', icon: <BedDouble size={16} />, blurb: 'Book a stay, check availability, or ask about our walk-in rates.' },
  { id: 'packages', label: 'Event Packages', icon: <Package size={16} />, blurb: 'Let us shape the right package for your celebration.' },
  { id: 'occasions', label: 'Events & Occasions', icon: <PartyPopper size={16} />, blurb: 'Birthdays, debuts, weddings, corporate events — we host them all.' },
  { id: 'amenities', label: 'Amenities', icon: <Waves size={16} />, blurb: 'Pool access, billiards, food & beverage, and more.' },
  { id: 'general', label: 'General Question', icon: <MessageCircleQuestion size={16} />, blurb: 'Something else on your mind? Ask us anything.' },
]

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  rooms: 'Rooms & Rates',
  packages: 'Event Packages',
  occasions: 'Events & Occasions',
  amenities: 'Amenities',
  general: 'General Question',
}

const INTEREST_LABELS: Record<Exclude<InquiryCategory, 'general'>, string> = {
  rooms: 'Room of Interest',
  packages: 'Package of Interest',
  occasions: 'Occasion Type',
  amenities: 'Amenity of Interest',
}

/* ── Content fallback ── */
const fallbackContactContent: ContactContent = {
  eyebrow: 'INQUIRE',
  title: 'Plan Your Visit',
  subtitle: 'Whether it’s a stay, an event, or a simple question — we’re here to help.',
  formIntro: 'Choose a category and share a few details. We’ll take it from there.',
  directPhone: '0929 479 9835',
  directEmail: 'balambanbooking@gmail.com',
  facebookPage: 'facebook.com/villasusane.roomsnvenue',
}

/* ── Option lists ── */
const fallbackPackageOptions = [
  'Phase 1 Area Package',
  'Food Package with Pool Access',
  'All-in-One Event Package',
  'Grand Celebration Package',
  'Not sure yet',
]

const roomOptions = [
  'Rooms Pool View',
  'Day Use Room',
  'Standard Room',
  'Walk-in Pool Access',
  'Not sure yet',
]

const amenityOptions = [
  'Resort Pool',
  'Billiards Room',
  'Catering & Events',
  'Food & Beverages',
  'Air Conditioned Rooms',
  'Free WiFi',
  'Night Pools',
  'Not sure yet',
]

const occasionOptions = [
  'Birthday Party',
  'Wedding Reception',
  'Debut / 18th Birthday',
  'Christening',
  'Corporate Event',
  'Reunion / Family Gathering',
  'Holiday Party',
  'Other',
]

const guestRanges = [
  '1-10 people',
  '10-20 people',
  '20-30 people',
  '30-50 people',
  '50-100 people',
  '100+ people',
]

/* ── Helpers ── */
function formatDisplayDate(value: string) {
  if (!value) return 'Flexible / to be discussed'

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

/** Strip a leading peso sign if the user pasted one, then re-add it. */
const PESO_SIGN = '\u20B1' // ₱
function formatPeso(value: string): string {
  // Remove any non-digit characters except comma and period
  const cleaned = value.replace(/[^\d.,]/g, '')
  return PESO_SIGN + cleaned
}

/** Strip the peso prefix when reading from the input for storage. */
function stripPeso(value: string): string {
  return value.replace(PESO_SIGN, '').trim()
}

const initialInquiry: InquiryData = {
  interest: '',
  eventType: '',
  guestCount: '',
  eventDate: '',
  budget: '',
  name: '',
  phone: '',
  email: '',
  notes: '',
}

/* ── Component ── */
export default function ContactSection({
  coralBtn,
  sectionLabel,
  sectionHeading,
  sectionSubtitle,
  inputFieldStyle,
}: {
  coralBtn: React.CSSProperties
  sectionLabel: React.CSSProperties
  sectionHeading: React.CSSProperties
  sectionSubtitle: React.CSSProperties
  inputFieldStyle: React.CSSProperties
}) {
  const [activeCategory, setActiveCategory] = useState<InquiryCategory>('packages')
  const [formData, setFormData] = useState<InquiryData>(initialInquiry)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [content, setContent] = useState<ContactContent>(fallbackContactContent)
  const [packageOptions, setPackageOptions] = useState<string[]>(fallbackPackageOptions)

  // These props are currently reserved for future styling tweaks.
  void coralBtn
  void sectionLabel
  void sectionHeading
  void sectionSubtitle
  void inputFieldStyle

  useEffect(() => {
    let isMounted = true

    Promise.all([
      client.fetch<Partial<ContactContent> | null>(`
        *[_type == "contactSection"][0]{
          eyebrow,
          title,
          subtitle,
          formIntro,
          directPhone,
          directEmail,
          facebookPage
        }
      `),
      client.fetch<{ title: string }[]>(`
        *[_type == "packageItem"] | order(_createdAt asc){
          title
        }
      `),
    ])
      .then(([sectionData, packages]) => {
        if (!isMounted) return

        if (sectionData) {
          setContent({
            ...fallbackContactContent,
            ...sectionData,
          })
        }

        const titles = packages.map((item) => item.title).filter(Boolean)
        if (titles.length) setPackageOptions([...titles, 'Not sure yet'])
      })
      .catch(() => {
        if (!isMounted) return
        setContent(fallbackContactContent)
        setPackageOptions(fallbackPackageOptions)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const switchCategory = (id: InquiryCategory) => {
    setActiveCategory(id)
    setReviewOpen(false)
    setFormMessage('')
    setFormData((cur) => ({
      ...cur,
      interest: '',
      eventType: '',
      guestCount: '',
      eventDate: '',
      budget: '',
      notes: '',
    }))
  }

  const updateField = (field: keyof InquiryData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setFormMessage('')
  }

  const handleReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReviewOpen(true)
  }

  const openDatePicker = () => {
    const dateInput = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
    if (!dateInput) return

    dateInput.focus()
    dateInput.showPicker?.()
  }

  const closeReview = () => {
    if (!isSending) setReviewOpen(false)
  }

  const sendInquiry = async () => {
    setIsSending(true)
    setFormMessage('')

    const categoryLabel = CATEGORY_LABELS[activeCategory]
    const payload = new FormData()
    payload.append('subject', `${categoryLabel} Inquiry!`)
    payload.append('Inquiry Category', categoryLabel)
    if (formData.interest) payload.append('Interest', formData.interest)
    if (formData.eventType) payload.append('Event Type', formData.eventType)
    if (formData.guestCount) payload.append('Approximate Guests', formData.guestCount)
    if (formData.eventDate) payload.append('Preferred Date', formatDisplayDate(formData.eventDate))
    if (formData.budget) payload.append('Budget', formData.budget)
    payload.append('Full Name', formData.name)
    if (formData.phone) payload.append('Phone', formData.phone)
    payload.append('Email', formData.email)
    payload.append('Message / Notes', formData.notes || 'None')

    try {
      const response = await fetch('https://formspree.io/f/mlgvrkjd', {
        method: 'POST',
        body: payload,
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) throw new Error('Unable to send inquiry.')

      setFormData(initialInquiry)
      setReviewOpen(false)
      setFormMessage(`${categoryLabel} inquiry sent. We will reply with availability and next steps.`)
    } catch {
      setFormMessage('We could not send the inquiry right now. Please try again in a moment.')
    } finally {
      setIsSending(false)
    }
  }

  /* ── Dynamic category-specific fields ── */
  const renderCategoryFields = () => {
    switch (activeCategory) {
      case 'rooms':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="roomInterest">
                  Room of Interest
                </label>
                <select
                  id="roomInterest"
                  className="form-input form-select"
                  value={formData.interest}
                  onChange={(event) => updateField('interest', event.target.value)}
                >
                  <option value="" disabled>
                    Select room
                  </option>
                  {roomOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="stayDate">
                  Preferred Stay Date
                </label>
                <input
                  id="stayDate"
                  type="date"
                  className="form-input"
                  value={formData.eventDate}
                  onChange={(event) => updateField('eventDate', event.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="roomGuests">
                  Guests
                </label>
                <select
                  id="roomGuests"
                  className="form-input form-select"
                  value={formData.guestCount}
                  onChange={(event) => updateField('guestCount', event.target.value)}
                >
                  <option value="" disabled>
                    Select range
                  </option>
                  {guestRanges.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="roomBudget">
                  Budget per Night (optional)
                </label>
                <input
                  id="roomBudget"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2,500"
                  inputMode="numeric"
                  value={stripPeso(formData.budget)}
                  onChange={(event) => {
                    const raw = event.target.value
                    // Only allow digits, commas, and dots
                    if (/^[\d,.]*$/.test(raw)) {
                      updateField('budget', formatPeso(raw))
                    }
                  }}
                />
              </div>
            </div>
          </>
        )

      case 'packages':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="packageInterest">
                  Package of Interest
                </label>
                <select
                  id="packageInterest"
                  className="form-input form-select"
                  value={formData.interest}
                  onChange={(event) => updateField('interest', event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select package
                  </option>
                  {packageOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="packageDate">
                  Preferred Event Date
                </label>
                <div className="package-date-shell">
                  <input
                    ref={dateInputRef}
                    id="packageDate"
                    type="date"
                    className="form-input package-date-input"
                    value={formData.eventDate}
                    onChange={(event) => updateField('eventDate', event.target.value)}
                  />
                  <button
                    type="button"
                    className="package-date-button"
                    onClick={openDatePicker}
                    aria-label="Open event date picker"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="packageEventType">
                  Event Type
                </label>
                <input
                  id="packageEventType"
                  type="text"
                  className="form-input"
                  placeholder="Birthday, reunion, christening..."
                  value={formData.eventType}
                  onChange={(event) => updateField('eventType', event.target.value)}
                />
              </div>

<div className="form-group">
                <label className="form-label" htmlFor="packageGuests">
                  Approximate Guests
                </label>
                <select
                  id="packageGuests"
                  className="form-input form-select"
                  value={formData.guestCount}
                  onChange={(event) => updateField('guestCount', event.target.value)}
                >
                  <option value="" disabled>
                    Select range
                  </option>
                  {guestRanges.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="packageBudget">
                Budget (optional)
              </label>
              <input
                id="packageBudget"
                type="text"
                className="form-input"
                placeholder="e.g. 35,000"
                inputMode="numeric"
                value={stripPeso(formData.budget)}
                onChange={(event) => {
                  const raw = event.target.value
                  if (/^[\d,.]*$/.test(raw)) {
                    updateField('budget', formatPeso(raw))
                  }
                }}
              />
            </div>
          </>
        )

      case 'occasions':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="occasionType">
                  Occasion Type
                </label>
                <select
                  id="occasionType"
                  className="form-input form-select"
                  value={formData.interest}
                  onChange={(event) => updateField('interest', event.target.value)}
                >
                  <option value="" disabled>
                    Select occasion
                  </option>
                  {occasionOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="occasionDate">
                  Preferred Event Date
                </label>
                <input
                  id="occasionDate"
                  type="date"
                  className="form-input"
                  value={formData.eventDate}
                  onChange={(event) => updateField('eventDate', event.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="occasionGuests">
                Approximate Guests
              </label>
              <select
                id="occasionGuests"
                className="form-input form-select"
                value={formData.guestCount}
                onChange={(event) => updateField('guestCount', event.target.value)}
              >
                <option value="" disabled>
                  Select range
                </option>
                {guestRanges.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </>
        )

      case 'amenities':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="amenityInterest">
                  Amenity of Interest
                </label>
                <select
                  id="amenityInterest"
                  className="form-input form-select"
                  value={formData.interest}
                  onChange={(event) => updateField('interest', event.target.value)}
                >
                  <option value="" disabled>
                    Select amenity
                  </option>
                  {amenityOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="amenityDate">
                  Visit Date
                </label>
                <input
                  id="amenityDate"
                  type="date"
                  className="form-input"
                  value={formData.eventDate}
                  onChange={(event) => updateField('eventDate', event.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amenityGuests">
                Number of Guests
              </label>
              <select
                id="amenityGuests"
                className="form-input form-select"
                value={formData.guestCount}
                onChange={(event) => updateField('guestCount', event.target.value)}
              >
                <option value="" disabled>
                  Select range
                </option>
                {guestRanges.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </>
        )

      case 'general':
      default:
        return null
    }
  }

  /* ── Shared contact fields (slimmer for general) ── */
  const renderContactFields = () => {
    if (activeCategory === 'general') {
      return (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="generalName">
                Full Name
              </label>
              <input
                id="generalName"
                type="text"
                className="form-input"
                placeholder="Juan Dela Cruz"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="generalEmail">
                Email Address
              </label>
              <input
                id="generalEmail"
                type="email"
                className="form-input"
                placeholder="juan@email.com"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="generalMessage">
              Message
            </label>
            <textarea
              id="generalMessage"
              rows={5}
              className="form-input form-textarea"
              placeholder="How can we help?"
              value={formData.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              required
            />
          </div>
        </>
      )
    }

    return (
      <>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="inquiryName">
              Full Name
            </label>
            <input
              id="inquiryName"
              type="text"
              className="form-input"
              placeholder="Juan Dela Cruz"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inquiryPhone">
              Phone Number
            </label>
            <input
              id="inquiryPhone"
              type="tel"
              className="form-input"
              placeholder="+63 912 345 6789"
              value={formData.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="inquiryEmail">
            Email Address
          </label>
          <input
            id="inquiryEmail"
            type="email"
            className="form-input"
            placeholder="juan@email.com"
            value={formData.email}
            onChange={(event) => updateField('email', event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="inquiryNotes">
            Anything We Should Know?
          </label>
          <textarea
            id="inquiryNotes"
            rows={4}
            className="form-input form-textarea"
            placeholder="Preferred setup, food needs, program flow, or early questions..."
            value={formData.notes}
            onChange={(event) => updateField('notes', event.target.value)}
          />
        </div>
      </>
    )
  }

  /* ── Review summary rows ── */
  const buildReviewRows = (): [string, string][] => {
    const rows: [string, string][] = []
    if (activeCategory !== 'general' && formData.interest) {
      rows.push([INTEREST_LABELS[activeCategory as Exclude<InquiryCategory, 'general'>], formData.interest])
    }
    if (formData.eventType) rows.push(['Event type', formData.eventType])
    if (formData.guestCount) rows.push(['Guests', formData.guestCount])
    if (formData.eventDate) rows.push(['Preferred date', formatDisplayDate(formData.eventDate)])
    if (formData.budget) rows.push(['Budget', formData.budget])
    rows.push(['Name', formData.name])
    if (formData.phone) rows.push(['Phone', formData.phone])
    rows.push(['Email', formData.email])
    return rows
  }

  const activeCategoryConfig = CATEGORIES.find((c) => c.id === activeCategory)!

  return (
    <section id="contact" className="contact-section" aria-label="Inquiry">
      <div className="contact-container contact-container--split">
        <div className="section-header reveal">
          <span className="section-tag" data-sanity="contactSection.eyebrow">{content.eyebrow}</span>
          <h2 className="section-title" data-sanity="contactSection.title">{content.title}</h2>
          <p className="section-subtitle" data-sanity="contactSection.subtitle">{content.subtitle}</p>
        </div>

        <div className="split-layout">
          {/* ── Left Panel — Contact Details ── */}
          <div className="contact-left-column">
            <div className="contact-info-panel reveal">
              <div className="contact-info-header">
                <span className="contact-info-badge">CONTACT DIRECTLY</span>
                <h3 className="contact-info-title">Reach us anytime</h3>
                <p className="contact-info-desc">Prefer to talk first? We're just a message or call away.</p>
              </div>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M22 16.92V19.92C22.0011 20.3985 21.8841 20.869 21.661 21.2875C21.4379 21.706 21.1168 22.0578 20.727 22.3097C20.3372 22.5616 19.8912 22.7052 19.432 22.7262C18.9728 22.7473 18.5156 22.6451 18.105 22.43C15.1985 20.9389 12.7354 18.645 10.97 15.73C10.7549 15.3223 10.6514 14.868 10.6696 14.4118C10.6877 13.9555 10.8268 13.511 11.07 13.12L13 10.06C13.1429 9.82736 13.3394 9.63364 13.5725 9.49616C13.8056 9.35868 14.0681 9.28157 14.337 9.2716C14.6059 9.26164 14.873 9.31918 15.1149 9.43912C15.3568 9.55907 15.566 9.73773 15.724 9.958L17.93 12.991C18.0888 13.2121 18.1931 13.4684 18.2342 13.7385C18.2753 14.0087 18.252 14.2849 18.166 14.544C17.9029 15.2982 17.5105 16.001 17.01 16.62C16.9302 16.7377 16.8734 16.8697 16.8429 17.0089C16.8124 17.1481 16.8088 17.2919 16.8324 17.4324C16.856 17.5729 16.9062 17.7077 16.98 17.8296C17.0538 17.9516 17.1499 18.0585 17.263 18.145C17.3644 18.2198 17.4553 18.3056 17.534 18.4C17.7907 18.7172 17.98 19.0816 18.09 19.472C18.1059 19.523 18.1178 19.5753 18.1255 19.6284C18.1332 19.6815 18.1366 19.7353 18.1355 19.7892C18.1344 19.843 18.129 19.8966 18.1193 19.9494C18.1096 20.0022 18.0957 20.054 18.0779 20.1041"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 2C12.848 2.00117 13.6906 2.12632 14.5 2.37M20.8 6.6C21.628 7.866 22.1391 9.31892 22.28 10.83M19.83 4.15C18.0572 2.41947 15.6964 1.41658 13.19 1.31M21 16C20.9986 15.1512 20.8716 14.3079 20.623 13.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Phone / Viber</span>
                    <strong className="contact-info-value" data-sanity="contactSection.directPhone">{content.directPhone}</strong>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M22 6L12 13L2 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Email</span>
                    <strong className="contact-info-value" data-sanity="contactSection.directEmail">{content.directEmail}</strong>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M18 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V4C20 2.9 19.1 2 18 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="M12 18H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9 6H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Facebook Page</span>
                    <strong className="contact-info-value" data-sanity="contactSection.facebookPage">{content.facebookPage}</strong>
                  </div>
                </div>
              </div>

              <div className="contact-info-footer">
                <p>
                  Response within <strong>24 hours</strong>
                </p>
              </div>
            </div>
          </div>

          {/* ── Right Panel — Tabbed Inquiry Form ── */}
          <div className="inquiry-card reveal">
            <div className="form-intro inquiry-intro">
              <div>
                <span className="form-intro-step">How can we help?</span>
                <p data-sanity="contactSection.formIntro">{content.formIntro}</p>
              </div>
              <div className="package-form-pill">No commitment yet</div>
            </div>

            {/* Category tabs */}
            <div className="inquiry-tabs" role="tablist" aria-label="Inquiry category">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  type="button"
                  className={`inquiry-tab ${activeCategory === cat.id ? 'inquiry-tab--active' : ''}`}
                  onClick={() => switchCategory(cat.id)}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Category blurb */}
            <div className="inquiry-category-bar">
              <div className="inquiry-category-icon">{activeCategoryConfig.icon}</div>
              <div>
                <strong>{activeCategoryConfig.label}</strong>
                <span>{activeCategoryConfig.blurb}</span>
              </div>
            </div>

            <form className="inquiry-form" onSubmit={handleReview}>
              {renderCategoryFields()}
              {renderContactFields()}

              {formMessage && <p className="inquiry-message">{formMessage}</p>}

              <div className="form-footer inquiry-footer">
                <p className="form-note">You will review these details before anything is sent.</p>
              </div>

              <button type="submit" className="submit-button">
                <span>Review {activeCategoryConfig.label} Inquiry</span>
                <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* ── Review Modal ── */}
        {reviewOpen && (
          <div className="package-review-shell" onClick={closeReview}>
            <div className="package-review-modal" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="package-review-close"
                onClick={closeReview}
                aria-label="Close inquiry review"
              >
                x
              </button>

              <span className="form-intro-step">Review details</span>
              <h3>{activeCategoryConfig.label} Inquiry Preview</h3>
              <p className="package-review-copy">Confirm the details below before we send them to Villa Susane.</p>

              <div className="package-review-highlight">
                <span>Inquiry type</span>
                <strong>{activeCategoryConfig.label}</strong>
                <small>
                  {formData.interest || formData.eventType || (formData.guestCount ? `For ${formData.guestCount.toLowerCase()}` : 'Tell us what you need')}
                </small>
              </div>

              <div className="package-review-grid">
                {buildReviewRows().map(([label, value]) => (
                  <div className="package-review-item" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              {formData.notes && activeCategory !== 'general' && (
                <div className="package-review-note">
                  <span>Notes</span>
                  <p>{formData.notes}</p>
                </div>
              )}

              {formMessage && <p className="inquiry-message">{formMessage}</p>}

              <div className="package-review-actions">
                <button
                  type="button"
                  className="package-review-secondary"
                  onClick={() => setReviewOpen(false)}
                  disabled={isSending}
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  className="submit-button package-review-submit"
                  onClick={sendInquiry}
                  disabled={isSending}
                >
                  <span>{isSending ? 'Sending...' : 'Send Inquiry'}</span>
                  {!isSending && (
                    <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}


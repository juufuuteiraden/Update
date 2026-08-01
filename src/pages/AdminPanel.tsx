import { useEffect, useMemo, useState } from 'react'
import './AdminPanel.css'
import { supabase } from '../supabaseClient'
import type { GalleryItem, PackageItem, ReviewItem, RoomItem, ShowcaseItem, WalkInRateRow, AmenityRow } from '../supabaseTypes'

const ADMIN_EMAIL = 'admin@villasusane.website'
const ADMIN_PASSWORD = 'SusaneVilla2024!'

const SESSION_KEY = 'villa_susane_admin_session'
const BUCKET = 'villa-images'

type Section = 'Gallery' | 'Reviews' | 'Rooms' | 'Packages' | 'Event Showcase'

const emptyReview = { guest_name: '', event_type: '', rating: 5, quote: '' }
const emptyRoom = { name: '', description: '', price: '', guests: '', features: '' }
const emptyPackage = { name: '', price: '', inclusions: '', highlighted: false }
const emptyShowcase = { title: '', subtitle: '', description: '', price: '', image_url: '', category: '' }
// Walk-in rate and amenity templates (reserved for future use)
// const emptyWalkInRate = { name: '', description: '', guests: '', badge: '', price_rows: '' }
// const emptyAmenity = { name: '', description: '', image_url: '' }

function listToText(items?: string[]) {
  return (items || []).join('\n')
}

function textToList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function fileName(file: File) {
  return `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`
}

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(SESSION_KEY) === 'true')
  const [login, setLogin] = useState({ email: '', password: '', showPassword: false })
  const [loginError, setLoginError] = useState('')
  const [active, setActive] = useState<Section>('Gallery')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([])
  const [, setWalkInRates] = useState<WalkInRateRow[]>([])
  const [, setAmenities] = useState<AmenityRow[]>([])

  const [reviewForm, setReviewForm] = useState(emptyReview)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [roomForm, setRoomForm] = useState(emptyRoom)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomImage, setRoomImage] = useState<File | null>(null)

  const [galleryEditTitle, setGalleryEditTitle] = useState('')
  const [galleryEditSubtitle, setGalleryEditSubtitle] = useState('')
  const [galleryEditCategory, setGalleryEditCategory] = useState('')
  const [galleryEditPrice, setGalleryEditPrice] = useState('')
  const [galleryEditImage, setGalleryEditImage] = useState<File | null>(null)
  const [galleryEditId, setGalleryEditId] = useState<string | null>(null)

  const [packageForm, setPackageForm] = useState(emptyPackage)
  const [packageId, setPackageId] = useState<string | null>(null)

  const [showcaseForm, setShowcaseForm] = useState(emptyShowcase)
  const [showcaseId, setShowcaseId] = useState<string | null>(null)
  const [showcaseImage, setShowcaseImage] = useState<File | null>(null)

// Walk-in rate and amenity management state (reserved for future use)
  // const [walkInForm, setWalkInForm] = useState(emptyWalkInRate)
  // const [walkInId, setWalkInId] = useState<string | null>(null)
  // const [amenityForm, setAmenityForm] = useState(emptyAmenity)
  // const [amenityId, setAmenityId] = useState<string | null>(null)
  // const [amenityImage, setAmenityImage] = useState<File | null>(null)

  const [draggedGalleryId, setDraggedGalleryId] = useState<string | null>(null)

  const galleryOrder = useMemo(() => Math.max(0, ...gallery.map((item) => item.order || 0)) + 1, [gallery])

  const showMessage = (value: string) => {
    setMessage(value)
    window.setTimeout(() => setMessage(''), 3000)
  }

  const loadAll = async () => {
    const [galleryRes, reviewsRes, roomsRes, packagesRes, showcaseRes, walkInRes, amenitiesRes] = await Promise.all([
      supabase.from('gallery').select('id,image_url,order,title,subtitle,category').order('order', { ascending: true }),
      supabase.from('reviews').select('id,guest_name,event_type,rating,quote'),
      supabase.from('rooms').select('id,name,description,image_url,price,guests,features'),
      supabase.from('packages').select('id,name,price,inclusions,highlighted'),
      supabase.from('event_showcase').select('id,title,subtitle,description,price,image_url,category,order').order('order', { ascending: true }),
      supabase.from('walk_in_rate').select('id,name,description,guests,badge,price_rows'),
      supabase.from('amenities').select('id,name,description,image_url'),
    ])

    if (galleryRes.data) setGallery(galleryRes.data)
    if (reviewsRes.data) setReviews(reviewsRes.data)
    if (roomsRes.data) setRooms(roomsRes.data)
    if (packagesRes.data) setPackages(packagesRes.data as PackageItem[])
    if (showcaseRes.data) setShowcaseItems(showcaseRes.data)
    if (walkInRes.data) setWalkInRates(walkInRes.data)
    if (amenitiesRes.data) setAmenities(amenitiesRes.data)
  }

  useEffect(() => {
    if (!isLoggedIn) return
    loadAll()

    const channel = supabase
      .channel('admin-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_showcase' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_in_rate' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amenities' }, loadAll)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isLoggedIn])

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (login.email === ADMIN_EMAIL && login.password === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, 'true')
      setIsLoggedIn(true)
      setLoginError('')
      return
    }
    setLoginError('Invalid admin credentials.')
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setIsLoggedIn(false)
  }

  const uploadImage = async (file: File) => {
    const path = fileName(file)
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw error
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  const addGalleryImage = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    try {
      const imageUrl = await uploadImage(file)
      const { error } = await supabase.from('gallery').insert({ image_url: imageUrl, order: galleryOrder })
      if (error) throw error
      showMessage('Success! Gallery image upload completed.')
      await loadAll()
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to add image.')
    } finally {
      setLoading(false)
    }
  }

  const deleteRow = async (table: string, id: string) => {
    setLoading(true)
    const { error } = await supabase.from(table as any).delete().eq('id', id)
    setLoading(false)
    if (error) { showMessage(error.message); return }
    showMessage('Deleted.')
    await loadAll()
  }

  const saveReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    const payload = { ...reviewForm, rating: Number(reviewForm.rating) }
    const { error } = reviewId
      ? await supabase.from('reviews').update(payload).eq('id', reviewId)
      : await supabase.from('reviews').insert(payload)
    setLoading(false)
    if (error) return showMessage(error.message)
    setReviewForm(emptyReview)
    setReviewId(null)
    showMessage('Review saved.')
    await loadAll()
  }

  const saveRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    try {
      const current = rooms.find((r) => r.id === roomId)
      const imageUrl = roomImage ? await uploadImage(roomImage) : current?.image_url || ''
      const guestsNum = Number(String(roomForm.guests).replace(/[^0-9]/g, '')) || 0
      const payload = {
        name: roomForm.name,
        description: roomForm.description,
        image_url: imageUrl,
        price: Number(roomForm.price) || 0,
        guests: guestsNum,
        features: textToList(roomForm.features),
      }
      const { error } = roomId
        ? await supabase.from('rooms').update(payload).eq('id', roomId)
        : await supabase.from('rooms').insert(payload)
      if (error) throw error
      setRoomForm(emptyRoom)
      setRoomId(null)
      setRoomImage(null)
      showMessage('Room saved.')
      await loadAll()
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save room.')
    } finally {
      setLoading(false)
    }
  }

  const savePackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    const payload = {
      name: packageForm.name,
      price: packageForm.price,
      inclusions: textToList(packageForm.inclusions),
      highlighted: packageForm.highlighted,
    }
    const { error } = packageId
      ? await supabase.from('packages').update(payload).eq('id', packageId)
      : await supabase.from('packages').insert(payload)
    setLoading(false)
    if (error) return showMessage(error.message)
    setPackageForm(emptyPackage)
    setPackageId(null)
    showMessage('Package saved.')
    await loadAll()
  }

  const saveShowcase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    try {
      const current = showcaseItems.find((item) => item.id === showcaseId)
      const imageUrl = showcaseImage ? await uploadImage(showcaseImage) : (current?.image_url || showcaseForm.image_url)
      const nextOrder = Math.max(0, ...showcaseItems.map((item) => item.order || 0)) + 1
      const payload = {
        title: showcaseForm.title,
        subtitle: showcaseForm.subtitle,
        description: showcaseForm.description,
        price: showcaseForm.price,
        image_url: imageUrl,
        category: showcaseForm.category,
        order: current?.order || nextOrder,
      }
      const { error } = showcaseId
        ? await supabase.from('event_showcase').update(payload).eq('id', showcaseId)
        : await supabase.from('event_showcase').insert(payload)
      if (error) throw error
      setShowcaseForm(emptyShowcase)
      setShowcaseId(null)
      setShowcaseImage(null)
      showMessage('Showcase item saved.')
      await loadAll()
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save showcase item.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <main className="admin-login-screen">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <span>Villa Susane</span>
          <h1>Admin Access</h1>
          <input
            type="email"
            placeholder="Email"
            value={login.email}
            onChange={(event) => setLogin({ ...login, email: event.target.value })}
          />
          <div className="admin-password-field">
            <input
              type={login.showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={login.password}
              onChange={(event) => setLogin({ ...login, password: event.target.value })}
            />
            <button
              type="button"
              className="admin-password-toggle"
              onClick={() => setLogin({ ...login, showPassword: !login.showPassword })}
              aria-label={login.showPassword ? 'Hide password' : 'Show password'}
            >
              {login.showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {loginError && <p>{loginError}</p>}
          <button type="submit">Sign In</button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <span className="admin-kicker">Villa Susane</span>
          <h1>Admin</h1>
        </div>
        <nav>
          {(['Gallery', 'Reviews', 'Rooms', 'Packages', 'Event Showcase'] as Section[]).map((section) => (
            <button key={section} className={active === section ? 'active' : ''} onClick={() => setActive(section)}>
              {section}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={logout}>Log Out</button>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">Content</span>
            <h2>{active}</h2>
          </div>
          {message && <p className="admin-message">{message}</p>}
        </header>

        {active === 'Gallery' && renderGallery()}
        {active === 'Reviews' && renderReviews()}
        {active === 'Rooms' && renderRooms()}
        {active === 'Packages' && renderPackages()}
        {active === 'Event Showcase' && renderEventShowcase()}
      </section>
    </main>
  )

  function renderGallery() {
    return (
      <div className="admin-panel">
        <label className="admin-upload">
          <span>Upload New Photo</span>
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={(event) => addGalleryImage(event.target.files?.[0] || null)}
          />
        </label>

        <div className="admin-gallery-editor">
          <div className="admin-gallery-editor__title">
            <h3>Edit posts (title / subtitle / category / image)</h3>
            <p>Each item in this list maps to a row in the <code>gallery</code> table.</p>
          </div>

          <div className="admin-gallery-grid">
            {gallery.map((item) => (
              <article
                key={item.id}
                className={`admin-gallery-item ${item.id === galleryEditId ? 'active' : ''}`}
                draggable
                onDragStart={() => setDraggedGalleryId(item.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropGalleryItem(item.id)}
              >
                <img src={item.image_url} alt="" />
                <div>
                  <span>Order {item.order}</span>
                  <div className="admin-gallery-item__actions">
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryEditId(item.id)
                        setGalleryEditTitle(item.title || '')
                        setGalleryEditSubtitle(item.subtitle || '')
                        setGalleryEditCategory(item.category || '')
                        setGalleryEditPrice(String((item as any).price || ''))
                        setGalleryEditImage(null)
                      }}
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteRow('gallery', item.id)}>Delete</button>
                  </div>

                  {item.id === galleryEditId && (
                    <div className="admin-gallery-item__form">
                      <label>
                        <span>Title</span>
                        <input value={galleryEditTitle} onChange={(e) => setGalleryEditTitle(e.target.value)} />
                      </label>
                      <label>
                        <span>Subtitle</span>
                        <textarea rows={3} value={galleryEditSubtitle} onChange={(e) => setGalleryEditSubtitle(e.target.value)} />
                      </label>
                      <label>
                        <span>Category</span>
                        <input value={galleryEditCategory} onChange={(e) => setGalleryEditCategory(e.target.value)} />
                      </label>
                      <label>
                        <span>Pricing</span>
                        <input value={galleryEditPrice} onChange={(e) => setGalleryEditPrice(e.target.value)} placeholder="e.g. PHP 10,000" />
                      </label>
                      <label className="admin-gallery-replace">
                        <span>Replace image</span>
                        <input type="file" accept="image/*" onChange={(e) => setGalleryEditImage(e.target.files?.[0] || null)} />
                      </label>
                      <div className="admin-gallery-item__buttons">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!galleryEditId) return
                            setLoading(true)
                            try {
                              const current = gallery.find((g) => g.id === galleryEditId)
                              let imageUrl = current?.image_url || ''
                              if (galleryEditImage) imageUrl = await uploadImage(galleryEditImage)
                              const payload = {
                                title: galleryEditTitle,
                                subtitle: galleryEditSubtitle,
                                category: galleryEditCategory,
                                order: current?.order,
                                image_url: imageUrl,
                              }
                              const { error } = await supabase.from('gallery').update(payload).eq('id', galleryEditId)
                              if (error) throw error
                              setGalleryEditImage(null)
                              setGalleryEditId(null)
                              showMessage('Gallery post updated.')
                              await loadAll()
                            } catch (e) {
                              showMessage(e instanceof Error ? e.message : 'Unable to update gallery post.')
                            } finally {
                              setLoading(false)
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setGalleryEditId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const dropGalleryItem = async (targetId: string) => {
    if (!draggedGalleryId || draggedGalleryId === targetId) return
    const items = [...gallery]
    const draggedIndex = items.findIndex((item) => item.id === draggedGalleryId)
    const targetIndex = items.findIndex((item) => item.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const [movedItem] = items.splice(draggedIndex, 1)
    items.splice(targetIndex, 0, movedItem)

    const updated = items.map((item, index) => ({ ...item, order: index + 1 }))
    setGallery(updated)

    for (const item of updated) {
      await supabase.from('gallery').update({ order: item.order }).eq('id', item.id)
    }
    setDraggedGalleryId(null)
  }

  function renderReviews() {
    return (
      <div className="admin-two-column">
        <form className="admin-form" onSubmit={saveReview}>
          <h3>{reviewId ? 'Edit Review' : 'Add Review'}</h3>
          <input
            placeholder="Guest name"
            value={reviewForm.guest_name}
            onChange={(e) => setReviewForm({ ...reviewForm, guest_name: e.target.value })}
            required
          />
          <input
            placeholder="Event type (e.g. Birthday)"
            value={reviewForm.event_type}
            onChange={(e) => setReviewForm({ ...reviewForm, event_type: e.target.value })}
          />
          <input
            type="number"
            min={1}
            max={5}
            placeholder="Rating (1-5)"
            value={reviewForm.rating}
            onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
          />
          <textarea
            rows={4}
            placeholder="Quote / review text"
            value={reviewForm.quote}
            onChange={(e) => setReviewForm({ ...reviewForm, quote: e.target.value })}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : reviewId ? 'Update' : 'Add'}
          </button>
          {reviewId && <button type="button" onClick={() => { setReviewForm(emptyReview); setReviewId(null); }}>Cancel</button>}
        </form>

        <div className="admin-list">
          {reviews.map((review) => (
            <article key={review.id}>
              <strong>{review.guest_name}</strong>
              <p>{review.quote}</p>
              <span>Rating: {review.rating}/5 · {review.event_type}</span>
              <div>
                <button onClick={() => {
                  setReviewId(review.id)
                  setReviewForm({ guest_name: review.guest_name, event_type: review.event_type, rating: review.rating, quote: review.quote })
                }}>Edit</button>
                <button onClick={() => deleteRow('reviews', review.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderRooms() {
    return (
      <div className="admin-two-column">
        <form className="admin-form" onSubmit={saveRoom}>
          <h3>{roomId ? 'Edit Room' : 'Add Room'}</h3>
          <input
            placeholder="Room name"
            value={roomForm.name}
            onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
            required
          />
          <input
            placeholder="Description"
            value={roomForm.description}
            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
            required
          />
          <input
            placeholder="Price (numeric)"
            value={roomForm.price}
            onChange={(e) => setRoomForm({ ...roomForm, price: e.target.value })}
          />
          <input
            placeholder="Guests"
            value={roomForm.guests}
            onChange={(e) => setRoomForm({ ...roomForm, guests: e.target.value })}
          />
          <textarea
            rows={4}
            placeholder="Features (one per line)"
            value={roomForm.features}
            onChange={(e) => setRoomForm({ ...roomForm, features: e.target.value })}
          />
          <label className="admin-upload" style={{ display: 'flex', marginBottom: '0.85rem' }}>
            <span>{roomImage ? roomImage.name : (roomId ? 'Replace image' : 'Upload image')}</span>
            <input type="file" accept="image/*" onChange={(e) => setRoomImage(e.target.files?.[0] || null)} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : roomId ? 'Update' : 'Add'}
          </button>
          {roomId && <button type="button" onClick={() => { setRoomForm(emptyRoom); setRoomId(null); setRoomImage(null); }}>Cancel</button>}
        </form>

        <div className="admin-list">
          {rooms.map((room) => (
            <article key={room.id}>
              <strong>{room.name}</strong>
              <p>{room.description}</p>
              <span>PHP {room.price?.toLocaleString()} / night · {room.guests} guests</span>
              <div>
                <button onClick={() => {
                  setRoomId(room.id)
                  setRoomForm({ name: room.name, description: room.description, price: String(room.price || ''), guests: String(room.guests || ''), features: listToText(room.features) })
                  setRoomImage(null)
                }}>Edit</button>
                <button onClick={() => deleteRow('rooms', room.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderPackages() {
    return (
      <div className="admin-two-column">
        <form className="admin-form" onSubmit={savePackage}>
          <h3>{packageId ? 'Edit Package' : 'Add Package'}</h3>
          <input
            placeholder="Package name"
            value={packageForm.name}
            onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
            required
          />
          <input
            placeholder="Price"
            value={packageForm.price}
            onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
          />
          <textarea
            rows={4}
            placeholder="Inclusions (one per line)"
            value={packageForm.inclusions}
            onChange={(e) => setPackageForm({ ...packageForm, inclusions: e.target.value })}
          />
          <label className="admin-check">
            <input
              type="checkbox"
              checked={packageForm.highlighted}
              onChange={(e) => setPackageForm({ ...packageForm, highlighted: e.target.checked })}
            />
            Highlighted
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : packageId ? 'Update' : 'Add'}
          </button>
          {packageId && <button type="button" onClick={() => { setPackageForm(emptyPackage); setPackageId(null); }}>Cancel</button>}
        </form>

        <div className="admin-list">
          {packages.map((pkg) => (
            <article key={pkg.id}>
              <strong>{pkg.name}</strong>
              <p>{pkg.description}</p>
              <span>{pkg.price}</span>
              <div>
                <button onClick={() => {
                  setPackageId(pkg.id)
                  setPackageForm({ name: pkg.name, price: pkg.price, inclusions: listToText(pkg.inclusions), highlighted: pkg.highlighted })
                }}>Edit</button>
                <button onClick={() => deleteRow('packages', pkg.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderEventShowcase() {
    return (
      <div className="admin-two-column">
        <form className="admin-form" onSubmit={saveShowcase}>
          <h3>{showcaseId ? 'Edit Showcase Item' : 'Add Showcase Item'}</h3>
          <input
            placeholder="Title"
            value={showcaseForm.title}
            onChange={(e) => setShowcaseForm({ ...showcaseForm, title: e.target.value })}
            required
          />
          <input
            placeholder="Subtitle"
            value={showcaseForm.subtitle}
            onChange={(e) => setShowcaseForm({ ...showcaseForm, subtitle: e.target.value })}
          />
          <textarea
            rows={3}
            placeholder="Description"
            value={showcaseForm.description}
            onChange={(e) => setShowcaseForm({ ...showcaseForm, description: e.target.value })}
          />
          <input
            placeholder="Price"
            value={showcaseForm.price}
            onChange={(e) => setShowcaseForm({ ...showcaseForm, price: e.target.value })}
          />
          <input
            placeholder="Category"
            value={showcaseForm.category}
            onChange={(e) => setShowcaseForm({ ...showcaseForm, category: e.target.value })}
          />
          <label className="admin-upload" style={{ display: 'flex', marginBottom: '0.85rem' }}>
            <span>{showcaseImage ? showcaseImage.name : (showcaseId ? 'Replace image' : 'Upload image')}</span>
            <input type="file" accept="image/*" onChange={(e) => setShowcaseImage(e.target.files?.[0] || null)} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : showcaseId ? 'Update' : 'Add'}
          </button>
          {showcaseId && <button type="button" onClick={() => { setShowcaseForm(emptyShowcase); setShowcaseId(null); setShowcaseImage(null); }}>Cancel</button>}
        </form>

        <div className="admin-list">
          {showcaseItems.map((item) => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.subtitle}</p>
              <span>{item.category} · {item.price}</span>
              <div>
                <button onClick={() => {
                  setShowcaseId(item.id)
                  setShowcaseForm({
                    title: item.title,
                    subtitle: item.subtitle,
                    description: item.description || '',
                    price: item.price,
                    image_url: item.image_url,
                    category: item.category,
                  })
                  setShowcaseImage(null)
                }}>Edit</button>
                <button onClick={() => deleteRow('event_showcase', item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }
}


import { useEffect, useMemo, useState } from 'react'
import './AdminPanel.css'
import { supabase } from '../supabaseClient'
import type { GalleryItem, PackageItem, ReviewItem, RoomItem } from '../supabaseTypes'

// Local-only UI state tweak (no backend auth): show/hide password on the admin login screen.
// (Used by the gate for /admin-vs-2024.)

const ADMIN_EMAIL = 'admin@villasusane.com'
const ADMIN_PASSWORD = 'VillaSusane2024!'
const SESSION_KEY = 'villa_susane_admin_session'
const BUCKET = 'villa-images'

type Section = 'Gallery' | 'Reviews' | 'Rooms' | 'Packages'

const emptyReview = { guest_name: '', event_type: '', rating: 5, quote: '' }
const emptyRoom = { name: '', description: '', price: '', guests: '', features: '' }
const emptyPackage = { name: '', price: '', inclusions: '', highlighted: false }

function listToText(items?: string[]) {
  return (items || []).join('\n')
}

function textToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
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
  const [draggedGalleryId, setDraggedGalleryId] = useState<string | null>(null)

  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [packages, setPackages] = useState<PackageItem[]>([])

  const [reviewForm, setReviewForm] = useState(emptyReview)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [roomForm, setRoomForm] = useState(emptyRoom)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomImage, setRoomImage] = useState<File | null>(null)
  const [packageForm, setPackageForm] = useState(emptyPackage)
  const [packageId, setPackageId] = useState<string | null>(null)

  const galleryOrder = useMemo(() => Math.max(0, ...gallery.map((item) => item.order || 0)) + 1, [gallery])

  const showMessage = (value: string) => {
    setMessage(value)
    window.setTimeout(() => setMessage(''), 3000)
  }

  const loadAll = async () => {
    const [galleryRes, reviewsRes, roomsRes, packagesRes] = await Promise.all([
      supabase.from('gallery').select('id,image_url,order').order('order', { ascending: true }),
      supabase.from('reviews').select('id,guest_name,event_type,rating,quote'),
      supabase.from('rooms').select('id,name,description,image_url,price,guests,features'),
      supabase.from('packages').select('id,name,price,inclusions,highlighted'),
    ])

    if (galleryRes.data) setGallery(galleryRes.data)
    if (reviewsRes.data) setReviews(reviewsRes.data)
    if (roomsRes.data) setRooms(roomsRes.data)
    if (packagesRes.data) setPackages(packagesRes.data)
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      showMessage('Gallery image uploaded successfully.')
      await loadAll()
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to add image.')
    } finally {
      setLoading(false)
    }
  }

  const deleteRow = async (table: 'gallery' | 'reviews' | 'rooms' | 'packages', id: string) => {
    setLoading(true)
    const { error } = await supabase.from(table).delete().eq('id', id)
    setLoading(false)
    if (error) {
      showMessage(error.message)
      return
    }
    showMessage('Deleted.')
    await loadAll()
  }

  const persistGalleryOrder = async (items: GalleryItem[]) => {
    const updates = items.map((item, index) => ({ ...item, order: index + 1 }))
    setGallery(updates)
    const { error } = await supabase.from('gallery').upsert(updates)
    showMessage(error ? error.message : 'Gallery order saved.')
  }

  const dropGalleryItem = (targetId: string) => {
    if (!draggedGalleryId || draggedGalleryId === targetId) return
    const next = [...gallery]
    const from = next.findIndex((item) => item.id === draggedGalleryId)
    const to = next.findIndex((item) => item.id === targetId)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDraggedGalleryId(null)
    persistGalleryOrder(next)
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
      const current = rooms.find((room) => room.id === roomId)
      const imageUrl = roomImage ? await uploadImage(roomImage) : current?.image_url || ''
      const payload = {
        name: roomForm.name,
        description: roomForm.description,
        image_url: imageUrl,
        price: Number(roomForm.price) || 0,
        guests: Number(String(roomForm.guests).replace(/[^0-9]/g, '')) || 0,
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
          {(['Gallery', 'Reviews', 'Rooms', 'Packages'] as Section[]).map((section) => (
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

        {active === 'Gallery' && (
          <div className="admin-panel">
            <label className="admin-upload">
              <span>Upload New Photo</span>
              <input type="file" accept="image/*" disabled={loading} onChange={(event) => addGalleryImage(event.target.files?.[0] || null)} />
            </label>
            <div className="admin-gallery-grid">
              {gallery.map((item) => (
                <article
                  key={item.id}
                  className="admin-gallery-item"
                  draggable
                  onDragStart={() => setDraggedGalleryId(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropGalleryItem(item.id)}
                >
                  <img src={item.image_url} alt="" />
                  <div>
                    <span>Order {item.order}</span>
                    <button onClick={() => deleteRow('gallery', item.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {active === 'Reviews' && (
          <div className="admin-two-column">
            <form className="admin-form" onSubmit={saveReview}>
              <input required placeholder="Guest name" value={reviewForm.guest_name} onChange={(event) => setReviewForm({ ...reviewForm, guest_name: event.target.value })} />
              <input required placeholder="Event type" value={reviewForm.event_type} onChange={(event) => setReviewForm({ ...reviewForm, event_type: event.target.value })} />
              <input required type="number" min="1" max="5" placeholder="Rating" value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })} />
              <textarea required rows={6} placeholder="Quote" value={reviewForm.quote} onChange={(event) => setReviewForm({ ...reviewForm, quote: event.target.value })} />
              <button disabled={loading}>{reviewId ? 'Update Review' : 'Add Review'}</button>
            </form>
            <div className="admin-list">
              {reviews.map((review) => (
                <article key={review.id}>
                  <strong>{review.guest_name}</strong>
                  <span>{review.event_type} - {review.rating} stars</span>
                  <p>{review.quote}</p>
                  <div>
                    <button onClick={() => { setReviewId(review.id); setReviewForm(review) }}>Edit</button>
                    <button onClick={() => deleteRow('reviews', review.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {active === 'Rooms' && (
          <div className="admin-two-column">
            <form className="admin-form" onSubmit={saveRoom}>
              <input required placeholder="Room name" value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} />
              <textarea required rows={4} placeholder="Description" value={roomForm.description} onChange={(event) => setRoomForm({ ...roomForm, description: event.target.value })} />
              <input required placeholder="Price" value={roomForm.price} onChange={(event) => setRoomForm({ ...roomForm, price: event.target.value })} />
              <input required placeholder="Guests" value={roomForm.guests} onChange={(event) => setRoomForm({ ...roomForm, guests: event.target.value })} />
              <textarea rows={6} placeholder="Features, one per line" value={roomForm.features} onChange={(event) => setRoomForm({ ...roomForm, features: event.target.value })} />
              <input type="file" accept="image/*" onChange={(event) => setRoomImage(event.target.files?.[0] || null)} />
              <button disabled={loading}>{roomId ? 'Update Room' : 'Add Room'}</button>
            </form>
            <div className="admin-list">
              {rooms.map((room) => (
                <article key={room.id}>
                  {room.image_url && <img src={room.image_url} alt="" />}
                  <strong>{room.name}</strong>
                  <p>{room.description}</p>
                  <div>
                    <button onClick={() => { setRoomId(room.id); setRoomForm({ name: room.name, description: room.description, price: String(room.price || ''), guests: String(room.guests || ''), features: listToText(room.features) }) }}>Edit</button>
                    <button onClick={() => deleteRow('rooms', room.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {active === 'Packages' && (
          <div className="admin-two-column">
            <form className="admin-form" onSubmit={savePackage}>
              <input required placeholder="Package name" value={packageForm.name} onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })} />
              <input required placeholder="Price" value={packageForm.price} onChange={(event) => setPackageForm({ ...packageForm, price: event.target.value })} />
              <textarea rows={7} placeholder="Inclusions, one per line" value={packageForm.inclusions} onChange={(event) => setPackageForm({ ...packageForm, inclusions: event.target.value })} />
              <label className="admin-check">
                <input type="checkbox" checked={packageForm.highlighted} onChange={(event) => setPackageForm({ ...packageForm, highlighted: event.target.checked })} />
                Highlight package
              </label>
              <button disabled={loading}>{packageId ? 'Update Package' : 'Add Package'}</button>
            </form>
            <div className="admin-list">
              {packages.map((pkg) => (
                <article key={pkg.id}>
                  <strong>{pkg.name}</strong>
                  <span>{pkg.price}{pkg.highlighted ? ' - Highlighted' : ''}</span>
                  <p>{pkg.inclusions?.join(', ')}</p>
                  <div>
                    <button onClick={() => { setPackageId(pkg.id); setPackageForm({ name: pkg.name, price: pkg.price, inclusions: listToText(pkg.inclusions), highlighted: pkg.highlighted }) }}>Edit</button>
                    <button onClick={() => deleteRow('packages', pkg.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

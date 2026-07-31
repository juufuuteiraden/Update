import { useEffect, useState } from 'react'
import { client } from '../sanityClient'
import './Rates.css'
import './RatesAdminPlaceholder.css'
import AdminModal from '../components/admin/AdminModal'
import { supabase } from '../supabaseClient'
import type { RoomItem, WalkInRateRow } from '../supabaseTypes'
import { isAdminModeEnabled } from '../utils/adminMode'
import { Edit, Plus, Save, Trash2 } from 'lucide-react'

export type RateRoom = {
  id: number
  dbId?: string
  name: string
  description: string
  price: string
  guests: string
  image: string
  badge?: string
  priceRows?: { label: string; price: string; note?: string }[]
  inclusions?: { icon: string; label: string; value: string }[]
  images?: { url: string; label: string }[]
}

type RoomDraft = {
  name: string
  description: string
  featuresText: string
  price: string
  guests: string
}

type RatesContent = {
  walkInEyebrow: string
  walkInTitle: string
  walkInSubtitle: string
  roomsEyebrow: string
  roomsTitle: string
}

const fallbackRatesContent: RatesContent = {
  walkInEyebrow: 'PRICING & ACCESS',
  walkInTitle: 'Walk-In Rates',
  walkInSubtitle:
    'On-site rates vary by weekday, weekend & holiday access, time of day, and cottage or table capacity. No booking required.',
  roomsEyebrow: 'STAY WITH US',
  roomsTitle: 'Rooms',
}

export default function Rates({
  rooms,
  onBook,
}: {
  rooms: RateRoom[]
  onBook: (room: RateRoom) => void
}) {
  const showAdmin = isAdminModeEnabled() && window.location.pathname === '/admin-vs-2024';

// Walk-In Rate management state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [editingWalkInId, setEditingWalkInId] = useState<string | null>(null);
  const [savingWalkIn, setSavingWalkIn] = useState(false);
  const [walkInDraft, setWalkInDraft] = useState({
    name: '', description: '', guests: '', badge: '', priceRowsText: '',
  });

  // ── Undo stacks for fallback deletions ──
  const [undoWalkIn, setUndoWalkIn] = useState<{ index: number; data: any; timer: number } | null>(null)
  const [undoRoom, setUndoRoom] = useState<{ index: number; data: any; timer: number } | null>(null)

  const showUndoWalkIn = (index: number, data: any) => {
    if (undoWalkIn) clearTimeout(undoWalkIn.timer)
    const timer = window.setTimeout(() => setUndoWalkIn(null), 5000)
    setUndoWalkIn({ index, data, timer })
  }

  const showUndoRoom = (index: number, data: any) => {
    if (undoRoom) clearTimeout(undoRoom.timer)
    const timer = window.setTimeout(() => setUndoRoom(null), 5000)
    setUndoRoom({ index, data, timer })
  }

  // ── Fallback walk-in rate inline management (from `rooms` prop) ──
  const [fallbackWalkInEdits, setFallbackWalkInEdits] = useState<Record<number, { name: string; description: string; guests: string; badge: string; priceRowsText: string }>>({})
  const [deletedFallbackWalkInIndices, setDeletedFallbackWalkInIndices] = useState<Set<number>>(new Set())
  const [savingFallbackWalkIn, setSavingFallbackWalkIn] = useState(false)

  const getFallbackWalkInEdit = (index: number) => fallbackWalkInEdits[index] || {
    name: rooms[index]?.name || '',
    description: rooms[index]?.description || '',
    guests: rooms[index]?.guests || '',
    badge: rooms[index]?.badge || '',
    priceRowsText: (rooms[index]?.priceRows || []).map(r => [r.label, r.price, r.note].filter(Boolean).join(' | ')).join('\n'),
  }

  const updateFallbackWalkInEdit = (index: number, patch: Partial<{ name: string; description: string; guests: string; badge: string; priceRowsText: string }>) => {
    setFallbackWalkInEdits(prev => {
      const current = getFallbackWalkInEdit(index)
      return { ...prev, [index]: { ...current, ...patch } }
    })
  }

  const deleteFallbackWalkIn = (index: number) => {
    const name = rooms[index]?.name || 'this rate'
    if (!window.confirm(`Remove "${name}" from display? Save to database first if needed.`)) return
    setDeletedFallbackWalkInIndices(prev => new Set([...prev, index]))
    // Save undo data
    const original = rooms[index]
    showUndoWalkIn(index, { edits: fallbackWalkInEdits[index], name: original?.name })
  }

  const saveFallbackWalkInToDB = async (index: number) => {
    const original = rooms[index]
    if (!original) return
    const edit = fallbackWalkInEdits[index]
    const name = edit?.name || original.name
    const description = edit?.description || original.description
    const guests = edit?.guests || original.guests
    const badge = edit?.badge || original.badge || ''
    const priceRowsText = edit?.priceRowsText || ''
    const priceRows = priceRowsText.split('\n').filter(Boolean).map((line) => {
      const [label, price, ...noteParts] = line.split('|').map((s) => s.trim())
      return { label: label || '', price: price || '', note: noteParts.length ? noteParts.join('|').trim() : undefined }
    })
    setSavingFallbackWalkIn(true)
    try {
      const { error } = await supabase.from('walk_in_rate').insert({ name, description, guests, badge, price_rows: priceRows.length ? priceRows : original.priceRows })
      if (error) throw error
      setDeletedFallbackWalkInIndices(prev => new Set([...prev, index]))
      setFallbackWalkInEdits(prev => { const n = { ...prev }; delete n[index]; return n })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to save walk-in rate')
    } finally {
      setSavingFallbackWalkIn(false)
    }
  }

  const resetWalkInDraft = () => {
    setEditingWalkInId(null);
    setWalkInDraft({ name: '', description: '', guests: '', badge: '', priceRowsText: '' });
  };

  const saveWalkInRate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingWalkIn(true);
    const priceRows = walkInDraft.priceRowsText
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [label, price, ...noteParts] = line.split('|').map((s) => s.trim());
        return { label: label || '', price: price || '', note: noteParts.length ? noteParts.join('|').trim() : undefined };
      });
    const payload = {
      name: walkInDraft.name,
      description: walkInDraft.description,
      guests: walkInDraft.guests,
      badge: walkInDraft.badge,
      price_rows: priceRows,
    };
    const { error } = editingWalkInId
      ? await supabase.from('walk_in_rate').update(payload).eq('id', editingWalkInId)
      : await supabase.from('walk_in_rate').insert(payload);
    setSavingWalkIn(false);
    if (error) { alert(error.message); return; }
    resetWalkInDraft();
    setWalkInModalOpen(false);
  };

  const deleteWalkInRate = async (id: string) => {
    if (!window.confirm('Delete this walk-in rate?')) return;
    const { error } = await supabase.from('walk_in_rate').delete().eq('id', id);
    if (error) alert(error.message);
  };

  const loadWalkInRatesFromSupabase = async () => {
    const { data, error } = await supabase
      .from('walk_in_rate')
      .select('id,name,description,guests,badge,price_rows');
    if (error || !data?.length) return;
    setWalkInRates(
      data.map((rate: WalkInRateRow, index: number) => ({
        id: index + 1,
        dbId: rate.id,
        name: rate.name,
        description: rate.description,
        price: (Array.isArray(rate.price_rows) && rate.price_rows[0]?.price) || '',
        guests: rate.guests,
        image: '',
        badge: rate.badge,
        priceRows: Array.isArray(rate.price_rows) ? rate.price_rows : [],
      })),
    );
  };

  // NOTE: existing admin edit modal is Supabase-backed (rooms table). Sanity-backed editing is handled by the new AdminCmsPanel.

  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [roomDraft, setRoomDraft] = useState<RoomDraft>({
    name: '',
    description: '',
    featuresText: '',
    price: '',
    guests: '',
  })
const [roomDraftImage, setRoomDraftImage] = useState<File | null>(null)
  const [savingRoom, setSavingRoom] = useState(false)

  // ── Fallback/hotel room inline management (built-in hotelRooms without dbId) ──
  const [fallbackRoomEdits, setFallbackRoomEdits] = useState<Record<number, { name: string; description: string; price: string; guests: string; inclusionsText: string }>>({})
  const [deletedFallbackRoomIndices, setDeletedFallbackRoomIndices] = useState<Set<number>>(new Set())
  const [savingFallbackRoom, setSavingFallbackRoom] = useState(false)

  const getFallbackRoomEdit = (index: number) => fallbackRoomEdits[index] || {
    name: hotelRooms[index]?.name || '',
    description: hotelRooms[index]?.description || '',
    price: hotelRooms[index]?.price || '',
    guests: hotelRooms[index]?.guests || '',
    inclusionsText: (hotelRooms[index]?.inclusions || []).map(i => `${i.label}: ${i.value}`).join('\n'),
  }

  const updateFallbackRoomEdit = (index: number, patch: Partial<{ name: string; description: string; price: string; guests: string; inclusionsText: string }>) => {
    setFallbackRoomEdits(prev => {
      const current = getFallbackRoomEdit(index)
      return { ...prev, [index]: { ...current, ...patch } }
    })
  }

  const deleteFallbackRoom = (index: number) => {
    const name = hotelRooms[index]?.name || 'this room'
    if (!window.confirm(`Remove "${name}" from display? Save to database first if needed.`)) return
    setDeletedFallbackRoomIndices(prev => new Set([...prev, index]))
    const original = hotelRooms[index]
    showUndoRoom(index, { edits: fallbackRoomEdits[index], name: original?.name })
  }

  const saveFallbackRoomToDB = async (index: number) => {
    const original = hotelRooms[index]
    if (!original) return
    const edit = fallbackRoomEdits[index]
    const name = edit?.name || original.name
    const description = edit?.description || original.description
    const price = edit?.price || original.price
    const guests = edit?.guests || original.guests
    setSavingFallbackRoom(true)
    try {
      const { error } = await supabase.from('rooms').insert({
        name,
        description,
        image_url: original.image,
        price: Number(String(price).replace(/[^0-9]/g, '')) || 0,
        guests: Number(String(guests).replace(/[^0-9]/g, '')) || 0,
      })
      if (error) throw error
      setDeletedFallbackRoomIndices(prev => new Set([...prev, index]))
      setFallbackRoomEdits(prev => { const n = { ...prev }; delete n[index]; return n })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to save room')
    } finally {
      setSavingFallbackRoom(false)
    }
  }

  const resetRoomDraft = () => {
    setEditingRoomId(null)
    setRoomDraft({ name: '', description: '', featuresText: '', price: '', guests: '' })
    setRoomDraftImage(null)
  }

  const BUCKET = 'villa-images'

  const fileName = (file: File) => `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`

  const uploadImage = async (file: File) => {
    const path = fileName(file)
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw error
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  const textToList = (value: string) =>
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

  const [activeImageIndex, setActiveImageIndex] = useState<Record<number, number>>({})
  const [content, setContent] = useState<RatesContent>(fallbackRatesContent)
  const [walkInRates, setWalkInRates] = useState<RateRoom[]>([])
  const [cmsRooms, setCmsRooms] = useState<RateRoom[]>([])

  const hotelRooms: RateRoom[] = [
    {
      id: 101,
      name: 'Rooms Pool View',
      description: 'Wake to the sound of gentle waves in our signature cabana.',
      price: '₱5,000',
      guests: '10 guests',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      badge: '10 PAX',
      images: [
        { url: '/room2.jpg', label: 'King Bed' },
        { url: '/roomterrace1.jpg ', label: 'Pool-side Terrace' },
        { url: '/bedroom4.jpg', label: 'Mixed King Bed and Bunk Beds' },
      ],
      inclusions: [
        { icon: '', label: 'Bed', value: 'King Bed/Bunk Bed' },
        { icon: '', label: 'Bath', value: 'Hot/Cold Shower' },
        { icon: '', label: 'Room Type', value: 'Family Room' },
        { icon: '', label: 'Check-in/out', value: '2:00 PM - 12:00 PM' },
      ],
    },
    {
      id: 103,
      name: 'Day Use Room',
      description: 'A comfortable room option for daytime visits and small group rest breaks.',
      price: 'PHP 2,500',
      guests: 'Up to 10 guests',
      image: '/room-ocean.jpg',
      badge: '10AM-5PM',
      images: [
        { url: '/rooms1.jpg', label: 'Day Use Room' },
        { url: '/balcony1.jpg', label: 'Relaxing Balcony' },
        { url: '/pool.jpg', label: 'Pool Access Nearby' },
      ],
      inclusions: [
        { icon: '', label: 'Use Time', value: '10:00 AM - 5:00 PM' },
        { icon: '', label: 'Guests', value: 'Up to 10 people' },
        { icon: '', label: 'Rate', value: 'PHP 2,500' },
        { icon: '', label: 'Availability', value: 'Subject to schedule' },
      ],
    },
    {
      id: 102,
      name: 'Standard Room',
      description: 'Bed: Queen Sized Bed · Bath: Hot/Cold Shower · Room Type: Standard Room · Check-in/out: 2:00 PM - 12:00 PM · Guests: Up to 10 people · Availability: Subject to schedule',
      price: 'PHP 2,500',
      guests: 'Up to 10 guests',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      badge: 'UP TO 10 PAX',
      images: [
        { url: '/bed1.jpg', label: 'Queen Bed' },
        { url: '/roombathroom1.jpg', label: 'Hot and Cold Showers' },
        { url: '/bedroom2.jpg', label: 'Queen Bed' },
      ],
      inclusions: [
        { icon: '', label: 'Bed', value: 'Queen Sized Bed' },
        { icon: '', label: 'Bath', value: 'Hot/Cold Shower' },
        { icon: '', label: 'Room Type', value: 'Standard Room' },
        { icon: '', label: 'Check-in/out', value: '2:00 PM - 12:00 PM' },
        { icon: '', label: 'Guests', value: 'Up to 10 people' },
        { icon: '', label: 'Availability', value: 'Subject to schedule' },
      ],
    },
  ]

  const loadRoomsOnce = async () => {
    // Supabase rooms (features/price) used by existing admin modal.
    const { data, error } = await supabase
      .from('rooms')
      .select('id,name,description,image_url,features,price,guests')

    if (error || !data?.length) return

    setCmsRooms(
      data.map((room: RoomItem, index: number) => {
        const fallbackRoom = hotelRooms[index % hotelRooms.length]
        const features = Array.isArray(room.features) ? room.features : []

        return {
          ...fallbackRoom,
          id: index + 101,
          dbId: room.id,
          name: room.name,
          description: room.description,
          price: room.price ? `PHP ${room.price.toLocaleString()}` : fallbackRoom.price,
          guests: room.guests ? `${room.guests} guests` : fallbackRoom.guests,
          image: room.image_url || fallbackRoom.image,
          images: [
            {
              url: room.image_url || fallbackRoom.image,
              label: room.name,
            },
          ],
          inclusions: features.length
            ? features.map((feature) => ({ icon: '', label: 'Feature', value: feature }))
            : fallbackRoom.inclusions,
        }
      }),
    )
  }

  useEffect(() => {
    let isMounted = true

    // Sanity fetches used to render walk-in rates + section titles.
    Promise.all([
      client.fetch<Partial<RatesContent> | null>(`
        *[_type == "ratesSection"][0]{
          walkInEyebrow,
          walkInTitle,
          walkInSubtitle,
          roomsEyebrow,
          roomsTitle
        }
      `),
      client.fetch<Array<Omit<RateRoom, 'id' | 'image'> & { _id: string }>>(`
        *[_type == "walkInRate"] | order(_createdAt asc){
          _id,
          name,
          description,
          guests,
          badge,
          priceRows
        }
      `),
      client.fetch<Array<Omit<RateRoom, 'id' | 'image' | 'inclusions' | 'images'> & {
        _id: string
        inclusions?: { label: string; value: string }[]
        images?: { url: string; label: string }[]
      }>>(`
        *[_type == "room"] | order(_createdAt asc){
          _id,
          name,
          description,
          price,
          guests,
          badge,
          inclusions[]{label, value},
          "images": images[]{label, "url": image.asset->url}
        }
      `),
    ])
      .then(([sectionData, walkInData, roomData]) => {
        if (!isMounted) return

        if (sectionData) {
          setContent({
            ...fallbackRatesContent,
            ...sectionData,
          })
        }

        if (walkInData.length) {
          setWalkInRates(
            walkInData.map((rate, index) => ({
              id: index + 1,
              name: rate.name,
              description: rate.description,
              price: rate.price || rate.priceRows?.[0]?.price || '',
              guests: rate.guests,
              image: '',
              badge: rate.badge,
              priceRows: rate.priceRows,
            })),
          )
        }

        if (roomData.length) {
          setCmsRooms(
            roomData.map((room, index) => {
              const fallbackRoom = hotelRooms[index % hotelRooms.length]
              const images = room.images?.filter((image) => image.url) || []

              return {
                ...fallbackRoom,
                ...room,
                id: index + 101,
                image: images[0]?.url || fallbackRoom.image,
                images: images.length ? images : fallbackRoom.images,
                inclusions: room.inclusions?.length
                  ? room.inclusions.map((item) => ({ icon: '', ...item }))
                  : fallbackRoom.inclusions,
              }
            }),
          )
        }
      })
      .catch(() => {
        if (!isMounted) return
        setContent(fallbackRatesContent)
        setWalkInRates([])
        setCmsRooms([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    // Supabase realtime loaders for admin modals.
    let isMounted = true
    loadRoomsOnce()
    loadWalkInRatesFromSupabase()

    const roomChannel = supabase
      .channel('public-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        if (!isMounted) return
        loadRoomsOnce()
      })
      .subscribe()

    const walkInChannel = supabase
      .channel('public-walk-in-rate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_in_rate' }, () => {
        if (!isMounted) return
        loadWalkInRatesFromSupabase()
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(roomChannel)
      supabase.removeChannel(walkInChannel)
    }
  }, [])

  const displayedWalkInRates = walkInRates.length ? walkInRates : rooms
  const displayedRooms = cmsRooms.length ? cmsRooms : hotelRooms

  const nextImage = (roomId: number, imagesLength: number) => {
    setActiveImageIndex((prev) => {
      const current = prev[roomId] ?? 0
      return { ...prev, [roomId]: (current + 1) % imagesLength }
    })
  }

  const prevImage = (roomId: number, imagesLength: number) => {
    setActiveImageIndex((prev) => {
      const current = prev[roomId] ?? 0
      return { ...prev, [roomId]: (current - 1 + imagesLength) % imagesLength }
    })
  }

  const openEditRoom = (room: RateRoom) => {
    if (!room.dbId) return
    setEditingRoomId(room.dbId)
    setRoomDraft({
      name: room.name,
      description: room.description,
      featuresText: (room.inclusions || []).map((item) => item.value).join('\n'),
      price: room.price.replace(/[^0-9]/g, ''),
      guests: room.guests,
    })
    setRoomDraftImage(null)
    setAdminModalOpen(true)
  }

  const deleteRoom = async (room: RateRoom) => {
    if (!room.dbId) return
    if (!window.confirm('Delete this room?')) return
    const { error } = await supabase.from('rooms').delete().eq('id', room.dbId)
    if (error) alert(error.message)
  }

  const saveRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingRoomId && !roomDraftImage) return

    setSavingRoom(true)
    try {
      const currentRoom = cmsRooms.find((room) => room.dbId === editingRoomId)
      const imageUrl = roomDraftImage ? await uploadImage(roomDraftImage) : currentRoom?.image || ''

      const payload = {
        name: roomDraft.name,
        description: roomDraft.description,
        image_url: imageUrl,
        features: textToList(roomDraft.featuresText),
        price: Number(roomDraft.price) || 0,
        guests: Number(String(roomDraft.guests).replace(/[^0-9]/g, '')) || 0,
      }

      const { error } = editingRoomId
        ? await supabase.from('rooms').update(payload).eq('id', editingRoomId)
        : await supabase.from('rooms').insert(payload)

      if (error) throw error

      setAdminModalOpen(false)
      resetRoomDraft()
      await loadRoomsOnce()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to save room')
    } finally {
      setSavingRoom(false)
    }
  }

  return (
    <section id="rates" className="rates-section">
      <div className="rates-container">
        <div className="section-header reveal">
          <span className="section-tag" data-sanity="ratesSection.walkInEyebrow">{content.walkInEyebrow}</span>
          <h2 className="section-title" data-sanity="ratesSection.walkInTitle">{content.walkInTitle}</h2>
          <p className="section-subtitle" data-sanity="ratesSection.walkInSubtitle">{content.walkInSubtitle}</p>
          {showAdmin && (
            <div className="posts-header" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="posts-admin-manage" type="button" onClick={() => setWalkInModalOpen(true)}>
                Manage
              </button>
            </div>
          )}
        </div>

        <div className="walkin-rates-grid reveal">
          {displayedWalkInRates.map((room, index) => (
            <div
              key={room.id}
              className={`walkin-rate-card ${room.badge ? 'walkin-rate-card--featured' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="walkin-rate-content">
                <div className="walkin-rate-header">
                  <div>
                    <h3 className="walkin-rate-name" data-sanity="walkInRate.name">{room.name}</h3>
                    <span className="walkin-rate-guests" data-sanity="walkInRate.guests">{room.guests}</span>
                  </div>
                  {room.badge && <span className="walkin-rate-badge" data-sanity="walkInRate.badge">{room.badge}</span>}
                </div>
                <p className="walkin-rate-description" data-sanity="walkInRate.description">{room.description}</p>
                <div className="walkin-price-list" data-sanity="walkInRate.priceRows">
                  {(room.priceRows || [{ label: 'Rate', price: room.price }]).map((row) => (
                    <div className="walkin-price-row" key={`${room.id}-${row.label}`}>
                      <div>
                        <span className="walkin-price-label">{row.label}</span>
                        {row.note && <span className="walkin-price-note">{row.note}</span>}
                      </div>
                      <span className="walkin-rate-price">{row.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hotel-rooms-section">
          <div className="section-header reveal">
            <span className="section-tag" data-sanity="ratesSection.roomsEyebrow">{content.roomsEyebrow}</span>
            <h2 className="section-title" data-sanity="ratesSection.roomsTitle">{content.roomsTitle}</h2>
            {showAdmin && (
              <div className="posts-header" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button className="posts-admin-manage" type="button" onClick={() => setAdminModalOpen(true)}>
                  Manage
                </button>
              </div>
            )}
          </div>

          <div className="room-grid">
            {displayedRooms.map((room, idx) => {
              const current = activeImageIndex[room.id] ?? 0
              const images = room.images || []
              const imagesCount = images.length || 1

              return (
                <div key={room.id} className="room-card reveal" style={{ animationDelay: `${idx * 0.12}s` }}>
                  <div className="room-carousel">
                    <div className="room-carousel-viewport">
                      <div className="room-carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
                        {images.map((img, imgIndex) => (
                          <div key={imgIndex} className="room-carousel-slide">
                            <img
                              src={img.url}
                              alt={img.label}
                              className="room-carousel-image"
                              loading="lazy"
                              data-sanity="room.images"
                            />
                            <div className="room-carousel-overlay">
                              <span className="room-carousel-label">{img.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {room.badge && <span className="room-badge" data-sanity="room.badge">{room.badge}</span>}

                    {imagesCount > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            prevImage(room.id, imagesCount)
                          }}
                          className="room-carousel-arrow room-carousel-arrow-left"
                          aria-label="Previous image"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            nextImage(room.id, imagesCount)
                          }}
                          className="room-carousel-arrow room-carousel-arrow-right"
                          aria-label="Next image"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <div className="room-carousel-dots">
                          {images.map((_, dotIndex) => (
                            <button
                              key={dotIndex}
                              onClick={(e) => {
                                e.preventDefault()
                                setActiveImageIndex((prev) => ({ ...prev, [room.id]: dotIndex }))
                              }}
                              className={`room-carousel-dot ${dotIndex === current ? 'room-carousel-dot-active' : ''}`}
                              aria-label={`Go to image ${dotIndex + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="room-card-content">
                    <h3 className="room-card-title" data-sanity="room.name">{room.name}</h3>
                    <p className="room-card-description" data-sanity="room.description">{room.description}</p>

                    <div className="room-card-meta">
                      <div className="room-card-price">
                        <span className="room-price-amount" data-sanity="room.price">{room.price}</span>
                        <span className="room-price-period">/ night</span>
                      </div>
                      <span className="room-card-guests" data-sanity="room.guests">{room.guests}</span>
                    </div>

                    {room.inclusions && (
                      <div className="room-inclusions" data-sanity="room.inclusions">
                        {room.inclusions.map((item, i) => (
                          <div key={i} className="inclusion-item">
                            <span className="inclusion-icon">{item.icon}</span>
                            <div className="inclusion-text">
                              <span className="inclusion-label">{item.label}</span>
                              <span className="inclusion-value">{item.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button className="book-button" onClick={() => onBook(room)}>
                      <span>Inquire</span>
                      <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Supabase admin actions (rooms only) */}
                    {showAdmin && room.dbId && (
                      <div className="room-admin-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditRoom(room)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
                        >
                          <Edit size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRoom(room)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #e74c3c', color: '#e74c3c', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>


      <AdminModal
        title={editingWalkInId ? 'Edit Walk-In Rate' : 'Manage Walk-In Rates'}
        open={walkInModalOpen}
        onClose={() => { setWalkInModalOpen(false); resetWalkInDraft(); }}
      >
        <div className="posts-manage-modal">
          {/* ── Undo banner for deleted walk-in rates ── */}
          {undoWalkIn && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#E65100' }}>Removed "{undoWalkIn.data.name}" from display</span>
              <button
                type="button"
                onClick={() => {
                  if (undoWalkIn) {
                    clearTimeout(undoWalkIn.timer)
                    setDeletedFallbackWalkInIndices(prev => { const n = new Set(prev); n.delete(undoWalkIn.index); return n })
                    if (undoWalkIn.data.edits) {
                      setFallbackWalkInEdits(prev => ({ ...prev, [undoWalkIn.index]: undoWalkIn.data.edits }))
                    }
                    setUndoWalkIn(null)
                  }
                }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #FFB74D', background: '#FFF', color: '#E65100', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
              >
                Undo
              </button>
            </div>
          )}

          {/* ── Undo banner for deleted rooms ── */}
          {undoRoom && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#E65100' }}>Removed "{undoRoom.data.name}" from display</span>
              <button
                type="button"
                onClick={() => {
                  if (undoRoom) {
                    clearTimeout(undoRoom.timer)
                    setDeletedFallbackRoomIndices(prev => { const n = new Set(prev); n.delete(undoRoom.index); return n })
                    if (undoRoom.data.edits) {
                      setFallbackRoomEdits(prev => ({ ...prev, [undoRoom.index]: undoRoom.data.edits }))
                    }
                    setUndoRoom(null)
                  }
                }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #FFB74D', background: '#FFF', color: '#E65100', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
              >
                Undo
              </button>
            </div>
          )}

          {/* ── Fallback walk-in rates (from `rooms` prop, non-DB) ── */}
          {rooms.filter((_, i) => !deletedFallbackWalkInIndices.has(i)).length > 0 && (
            <div className="posts-manage-add" style={{ marginBottom: '1.5rem' }}>
              <div className="posts-manage-add__header">
                <div>
                  <span className="posts-manage-add__eyebrow">Built-in walk-in rates</span>
                  <h3>{rooms.filter((_, i) => !deletedFallbackWalkInIndices.has(i)).length} default rate{rooms.filter((_, i) => !deletedFallbackWalkInIndices.has(i)).length === 1 ? '' : 's'}</h3>
                </div>
                <p>Edit these built-in rates inline. Save to database to persist.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {rooms.map((rate, idx) => {
                  if (deletedFallbackWalkInIndices.has(idx)) return null
                  const edit = fallbackWalkInEdits[idx]
                  const currentName = edit?.name ?? rate.name
                  const currentDescription = edit?.description ?? rate.description
                  const currentGuests = edit?.guests ?? rate.guests
                  const currentBadge = edit?.badge ?? rate.badge ?? ''
                  const currentPriceRowsText = edit?.priceRowsText ?? (rate.priceRows || []).map(r => [r.label, r.price, r.note].filter(Boolean).join(' | ')).join('\n')
                  return (
                    <div key={`fallback-walkin-${idx}`} style={{
                      display: 'flex', gap: '0.75rem', padding: '0.75rem',
                      border: '1px solid rgba(0,109,119,0.15)', borderRadius: '10px',
                      background: 'rgba(0,109,119,0.03)'
                    }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            value={currentName}
                            onChange={(e) => updateFallbackWalkInEdit(idx, { name: e.target.value })}
                            style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.85rem' }}
                            placeholder="Name"
                          />
                          <input
                            value={currentBadge}
                            onChange={(e) => updateFallbackWalkInEdit(idx, { badge: e.target.value })}
                            style={{ width: '100px', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem' }}
                            placeholder="Badge"
                          />
                        </div>
                        <textarea
                          value={currentDescription}
                          onChange={(e) => updateFallbackWalkInEdit(idx, { description: e.target.value })}
                          rows={2}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                          placeholder="Description"
                        />
                        <input
                          value={currentGuests}
                          onChange={(e) => updateFallbackWalkInEdit(idx, { guests: e.target.value })}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%' }}
                          placeholder="Guests / Info"
                        />
                        <textarea
                          value={currentPriceRowsText}
                          onChange={(e) => updateFallbackWalkInEdit(idx, { priceRowsText: e.target.value })}
                          rows={3}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                          placeholder="Label | Price | Note"
                        />
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => saveFallbackWalkInToDB(idx)}
                            disabled={savingFallbackWalkIn}
                            style={{
                              padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px',
                              border: '1px solid rgba(0,109,119,0.3)', background: '#006D77', color: '#FFFDF7',
                              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}
                            title="Save to walk-in rates database"
                          >
                            <Save size={12} />
                            Save to DB
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFallbackWalkIn(idx)}
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
          {/* Existing rates list */}
          {displayedWalkInRates.filter(r => r.dbId).length > 0 && (
            <div>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>Existing Walk-In Rates</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {displayedWalkInRates.filter(r => r.dbId).map((rate) => (
                  <div key={rate.dbId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{rate.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem' }}>{rate.guests}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="button" onClick={() => {
                        setEditingWalkInId(rate.dbId!);
                        setWalkInDraft({
                          name: rate.name,
                          description: rate.description,
                          guests: rate.guests,
                          badge: rate.badge || '',
                          priceRowsText: (rate.priceRows || []).map(r => [r.label, r.price, r.note].filter(Boolean).join(' | ')).join('\n'),
                        });
                      }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
                        <Edit size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteWalkInRate(rate.dbId!)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer' }}>
                        <Trash2 size={14} style={{ verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit form */}
          <form id="walkin-admin-form" onSubmit={saveWalkInRate} className="rates-admin-room-form">
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: '0.25rem' }}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {editingWalkInId ? 'Edit Rate' : 'Add New Rate'}
            </h4>
            <label className="rates-admin-field">
              <span>Name</span>
              <input required value={walkInDraft.name} onChange={(e) => setWalkInDraft({ ...walkInDraft, name: e.target.value })} placeholder="e.g. Weekday Pool Access" />
            </label>
            <label className="rates-admin-field">
              <span>Description</span>
              <textarea rows={3} value={walkInDraft.description} onChange={(e) => setWalkInDraft({ ...walkInDraft, description: e.target.value })} placeholder="Short description" />
            </label>
            <label className="rates-admin-field">
              <span>Guests / Info</span>
              <input value={walkInDraft.guests} onChange={(e) => setWalkInDraft({ ...walkInDraft, guests: e.target.value })} placeholder="e.g. Walk-in pool access" />
            </label>
            <label className="rates-admin-field">
              <span>Badge</span>
              <input value={walkInDraft.badge} onChange={(e) => setWalkInDraft({ ...walkInDraft, badge: e.target.value })} placeholder="e.g. WEEKDAY" />
            </label>
            <label className="rates-admin-field">
              <span>Price Rows (one per line, format: Label | Price | Note)</span>
              <textarea rows={5} value={walkInDraft.priceRowsText} onChange={(e) => setWalkInDraft({ ...walkInDraft, priceRowsText: e.target.value })} placeholder="Adults | PHP 150&#10;Children | PHP 100 | 3ft & below" />
            </label>
          </form>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="rates-admin-modal-cancel" onClick={() => { setWalkInModalOpen(false); resetWalkInDraft(); }} disabled={savingWalkIn}>
              Cancel
            </button>
            <button type="submit" className="rates-admin-modal-primary" form="walkin-admin-form" disabled={savingWalkIn}>
              {savingWalkIn ? 'Saving...' : editingWalkInId ? 'Update Rate' : 'Add Rate'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* ── Room Management Modal ── */}
      <AdminModal
        title={editingRoomId ? 'Edit Room' : 'Manage Rooms'}
        open={adminModalOpen}
        onClose={() => { setAdminModalOpen(false); resetRoomDraft(); }}
      >
        <div className="posts-manage-modal">
          {/* ── Fallback/hotel rooms (non-DB) ── */}
          {hotelRooms.filter((_, i) => !deletedFallbackRoomIndices.has(i)).length > 0 && (
            <div className="posts-manage-add" style={{ marginBottom: '1.5rem' }}>
              <div className="posts-manage-add__header">
                <div>
                  <span className="posts-manage-add__eyebrow">Built-in rooms</span>
                  <h3>{hotelRooms.filter((_, i) => !deletedFallbackRoomIndices.has(i)).length} default room{hotelRooms.filter((_, i) => !deletedFallbackRoomIndices.has(i)).length === 1 ? '' : 's'}</h3>
                </div>
                <p>Edit these built-in rooms inline. Save to database to persist.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {hotelRooms.map((room, idx) => {
                  if (deletedFallbackRoomIndices.has(idx)) return null
                  const edit = fallbackRoomEdits[idx]
                  const currentName = edit?.name ?? room.name
                  const currentDescription = edit?.description ?? room.description
                  const currentPrice = edit?.price ?? room.price
                  const currentGuests = edit?.guests ?? room.guests
                  return (
                    <div key={`fallback-room-${idx}`} style={{
                      display: 'flex', gap: '0.75rem', padding: '0.75rem',
                      border: '1px solid rgba(0,109,119,0.15)', borderRadius: '10px',
                      background: 'rgba(0,109,119,0.03)'
                    }}>
                      {room.image && (
                        <img src={room.image} alt="" style={{
                          width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <input
                          value={currentName}
                          onChange={(e) => updateFallbackRoomEdit(idx, { name: e.target.value })}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.85rem', width: '100%' }}
                          placeholder="Name"
                        />
                        <textarea
                          value={currentDescription}
                          onChange={(e) => updateFallbackRoomEdit(idx, { description: e.target.value })}
                          rows={2}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                          placeholder="Description"
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            value={currentPrice}
                            onChange={(e) => updateFallbackRoomEdit(idx, { price: e.target.value })}
                            style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem' }}
                            placeholder="Price"
                          />
                          <input
                            value={currentGuests}
                            onChange={(e) => updateFallbackRoomEdit(idx, { guests: e.target.value })}
                            style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem' }}
                            placeholder="Guests"
                          />
                        </div>
                        <textarea
                          value={edit?.inclusionsText ?? (room.inclusions || []).map(i => `${i.label}: ${i.value}`).join('\n')}
                          onChange={(e) => updateFallbackRoomEdit(idx, { inclusionsText: e.target.value })}
                          rows={3}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                          placeholder="Inclusions (Label: Value per line) e.g.&#10;Bed: Queen Sized Bed&#10;Bath: Hot/Cold Shower&#10;Room Type: Standard Room&#10;Check-in/out: 2:00 PM - 12:00 PM"
                        />
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => saveFallbackRoomToDB(idx)}
                            disabled={savingFallbackRoom}
                            style={{
                              padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px',
                              border: '1px solid rgba(0,109,119,0.3)', background: '#006D77', color: '#FFFDF7',
                              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}
                            title="Save to rooms database"
                          >
                            <Save size={12} />
                            Save to DB
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFallbackRoom(idx)}
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

          {/* Existing rooms list */}
          {displayedRooms.filter(r => r.dbId).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="posts-manage-list-header">
                <div>
                  <span className="posts-manage-list-header__eyebrow">Existing rooms</span>
                  <h3>{displayedRooms.filter(r => r.dbId).length} room{displayedRooms.filter(r => r.dbId).length === 1 ? '' : 's'}</h3>
                </div>
                <p>Manage existing rooms — edit details or remove them.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {displayedRooms.filter(r => r.dbId).map((room) => (
                  <div key={room.dbId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--section-white)', border: '1px solid rgba(0,109,119,0.12)', borderRadius: '10px' }}>
                    {room.image && (
                      <img src={room.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.9rem', color: '#1A2B2C' }}>{room.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#6B7B7C' }}>{room.price} · {room.guests}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => openEditRoom(room)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', background: 'transparent', color: '#006D77', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoom(room)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(220,38,38,0.2)', background: 'transparent', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit form */}
          <div className="posts-manage-add">
            <div className="posts-manage-add__header">
              <div>
                <span className="posts-manage-add__eyebrow">Room</span>
                <h3>{editingRoomId ? 'Edit Room' : 'Add New Room'}</h3>
              </div>
              {!editingRoomId && (
                <button
                  className="posts-manage-add__button"
                  type="button"
                  disabled={savingRoom}
                  onClick={() => {
                    const form = document.getElementById('rooms-admin-form') as HTMLFormElement;
                    form?.requestSubmit();
                  }}
                >
                  <Plus size={17} aria-hidden="true" />
                  {savingRoom ? 'Adding...' : 'Add Room'}
                </button>
              )}
            </div>
            <form id="rooms-admin-form" onSubmit={saveRoom} className="rates-admin-room-form">
              <label className="rates-admin-field">
                <span>Room name</span>
                <input required value={roomDraft.name} onChange={(e) => setRoomDraft({ ...roomDraft, name: e.target.value })} placeholder="e.g. Garden Room" />
              </label>

              <label className="rates-admin-field">
                <span>Description</span>
                <textarea required rows={4} value={roomDraft.description} onChange={(e) => setRoomDraft({ ...roomDraft, description: e.target.value })} placeholder="Short description" />
              </label>

              <label className="rates-admin-field">
                <span>Features (one per line)</span>
                <textarea rows={5} value={roomDraft.featuresText} onChange={(e) => setRoomDraft({ ...roomDraft, featuresText: e.target.value })} placeholder="e.g. King bed\nHot/Cold shower\nBalcony access" />
              </label>

              <label className="rates-admin-field">
                <span>Price (per night)</span>
                <input required inputMode="numeric" placeholder="e.g. 5000" value={roomDraft.price} onChange={(e) => setRoomDraft({ ...roomDraft, price: e.target.value })} />
              </label>

              <label className="rates-admin-field">
                <span>Guests</span>
                <input required placeholder="e.g. 2-4 guests" value={roomDraft.guests} onChange={(e) => setRoomDraft({ ...roomDraft, guests: e.target.value })} />
              </label>

              <label className="rates-admin-field">
                <span>Main image</span>
                <input type="file" accept="image/*" required={!editingRoomId} onChange={(e) => setRoomDraftImage(e.target.files?.[0] || null)} />
              </label>

              {editingRoomId && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="rates-admin-modal-cancel" onClick={() => { setEditingRoomId(null); resetRoomDraft(); setAdminModalOpen(false); }} disabled={savingRoom}>Cancel</button>
                  <button type="submit" className="rates-admin-modal-primary" disabled={savingRoom}>
                    {savingRoom ? 'Saving...' : 'Update Room'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </AdminModal>
    </section>
  )
}


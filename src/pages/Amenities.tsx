import { useEffect, useState } from 'react'
import { client } from '../sanityClient'
import './Amenities.css'
import { supabase } from '../supabaseClient'
import type { AmenityRow } from '../supabaseTypes'
import AdminModal from '../components/admin/AdminModal'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import { useToast } from '../components/admin/Toast'
import { isAdminModeEnabled } from '../utils/adminMode'
import { Plus, Edit, Trash2, Upload, Save } from 'lucide-react'

interface AmenityData {
  id: number
  dbId?: string
  name: string
  description: string
  image: string
  icon: string
  span?: 'wide' | 'tall' | 'featured' | 'normal'
}

type AmenitiesContent = {
  eyebrow: string
  title: string
  subtitle: string
}

const fallbackAmenitiesContent: AmenitiesContent = {
  eyebrow: 'INDULGE IN COMFORT',
  title: 'Resort Amenities',
  subtitle: 'Every detail designed for your perfect coastal escape',
}

const fallbackAmenities: AmenityData[] = [
  {
    id: 1,
    name: 'Resort Pool',
    description: 'Two-tier infinity pools with panoramic views, sun loungers, and poolside service.',
    image: '/pool3.jpg',
    icon: '',
    span: 'featured',
  },
  {
    id: 2,
    name: 'Billiards Room',
    description: 'Professional-grade table for friendly games or evening gatherings.',
    image: '/recreation1.jpg',
    icon: '',
    span: 'tall',
  },
  {
    id: 3,
    name: 'Catering and Events Services',
    description: 'High-speed internet from your cabana to the shoreline.',
    image: '/bdayevent2.jpg',
    icon: '',
    span: 'tall',
  },
  {
    id: 4,
    name: 'Your Favorite Filipino Dishes',
    description: 'Fresh tropical breakfast served daily with local fruits and ocean breezes.',
    image: '/foodmenu1.jpg',
    icon: '',
    span: 'wide',
  },
  {
    id: 5,
    name: 'Air Conditioned Rooms',
    description: 'Signature massages and soothing treatments to restore your energy.',
    image: '/room2.jpg',
    icon: '',
    span: 'normal',
  },
  {
    id: 6,
    name: 'Your Favorite Brews',
    description: 'Curated small plates and drinks served at sunset on the beachfront deck.',
    image: '/matcha1.jpg',
    icon: '',
    span: 'normal',
  },
  {
    id: 7,
    name: 'Night Pools',
    description: 'Shaded lounging with fresh towels and attentive poolside service.',
    image: '/nightpool1.jpg',
    icon: '',
    span: 'normal',
  },
  {
    id: 8,
    name: 'Free wifi',
    description: 'Explore nearby coves and viewpoints with local guide support.',
    image: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    icon: '',
    span: 'wide',
  },
]

const BUCKET = 'villa-images'

const fileName = (file: File) =>
  `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`

const uploadImage = async (file: File) => {
  const path = fileName(file)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export default function Amenities() {
  const showAdmin = isAdminModeEnabled() && window.location.pathname === '/admin-vs-2024'
  const { showToast } = useToast()
  const [content, setContent] = useState<AmenitiesContent>(fallbackAmenitiesContent)
  const [amenities, setAmenities] = useState<AmenityData[]>(fallbackAmenities)

  // ── Confirm Dialog state ──
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    variant?: 'danger' | 'default'
    confirmLabel?: string
    onConfirm: () => void
  } | null>(null)

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'default') => {
    setConfirmDialog({ title, message, onConfirm, variant })
  }

  // Amenity management state
  const [amenityModalOpen, setAmenityModalOpen] = useState(false)
  const [editingAmenityId, setEditingAmenityId] = useState<string | null>(null)
  const [savingAmenity, setSavingAmenity] = useState(false)
  const [amenityDraft, setAmenityDraft] = useState({ name: '', description: '' })
  const [amenityDraftFile, setAmenityDraftFile] = useState<File | null>(null)
  // ── Fallback/built-in amenity management ──
  const [fallbackEdits, setFallbackEdits] = useState<Record<number, { name: string; description: string }>>({})
  const [deletedFallbackIndices, setDeletedFallbackIndices] = useState<Set<number>>(new Set())
  const [savingFallbackToDB, setSavingFallbackToDB] = useState(false)
  // ── Undo stack for fallback deletions ──
  const [undoFallback, setUndoFallback] = useState<{ index: number; data: any; timer: number } | null>(null)

  const showUndoAmenity = (index: number, data: any) => {
    if (undoFallback) clearTimeout(undoFallback.timer)
    const timer = window.setTimeout(() => setUndoFallback(null), 5000)
    setUndoFallback({ index, data, timer })
  }

// getFallbackEdit is available via fallbackEdits directly

  const updateFallbackEdit = (index: number, patch: { name?: string; description?: string }) => {
    setFallbackEdits(prev => {
      const current = prev[index] || { name: fallbackAmenities[index]?.name || '', description: fallbackAmenities[index]?.description || '' }
      return { ...prev, [index]: { ...current, ...patch } }
    })
  }

const deleteFallbackAmenity = (index: number) => {
    const name = fallbackAmenities[index]?.name || 'this amenity'
    openConfirm(
      'Remove amenity from display?',
      `Remove "${name}" from display? You can save it to the database first.`,
      () => {
        setDeletedFallbackIndices(prev => new Set([...prev, index]))
        showUndoAmenity(index, { edits: fallbackEdits[index], name })
        showToast(`Removed "${name}" from display.`)
      },
    )
  }

  const saveFallbackToDB = async (index: number) => {
    const original = fallbackAmenities[index]
    if (!original) return
    const edit = fallbackEdits[index]
    const name = edit?.name ?? original.name
    const description = edit?.description ?? original.description
    setSavingFallbackToDB(true)
    try {
      const { error } = await supabase.from('amenities').insert({ name, description, image_url: original.image })
      if (error) throw error
      setDeletedFallbackIndices(prev => new Set([...prev, index]))
      setFallbackEdits(prev => {
        const n = { ...prev }
        delete n[index]
        return n
      })
} catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save amenity', 'error')
    } finally {
      setSavingFallbackToDB(false)
    }
  }

  // Computed list of all visible amenities (fallback + DB)
  const allVisibleAmenities = [
    ...fallbackAmenities
      .filter((_, i) => !deletedFallbackIndices.has(i))
      .map((item, i) => {
        const edit = fallbackEdits[i]
        return edit ? { ...item, name: edit.name || item.name, description: edit.description || item.description } : item
      }),
    ...amenities.filter(a => a.dbId),
  ]

  const resetAmenityDraft = () => {
    setEditingAmenityId(null)
    setAmenityDraft({ name: '', description: '' })
    setAmenityDraftFile(null)
  }

  const saveAmenity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
if (!editingAmenityId && !amenityDraftFile) {
      showToast('Please select an image.', 'error')
      return
    }
    setSavingAmenity(true)
    try {
      let imageUrl = ''
      if (amenityDraftFile) {
        imageUrl = await uploadImage(amenityDraftFile)
      } else {
        const existing = amenities.find(a => a.dbId === editingAmenityId)
        imageUrl = existing?.image || ''
      }

      const payload = {
        name: amenityDraft.name,
        description: amenityDraft.description,
        image_url: imageUrl,
      }

      const { error } = editingAmenityId
        ? await supabase.from('amenities').update(payload).eq('id', editingAmenityId)
        : await supabase.from('amenities').insert(payload)

      if (error) throw error
      resetAmenityDraft()
      setAmenityModalOpen(false)
} catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save amenity', 'error')
    } finally {
      setSavingAmenity(false)
    }
  }

  const deleteAmenity = async (id: string) => {
    openConfirm('Delete this amenity?', 'Are you sure you want to delete this amenity? This action cannot be undone.', async () => {
      const { error } = await supabase.from('amenities').delete().eq('id', id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Amenity deleted successfully.')
      }
    }, 'danger')
  }

  const openEditAmenity = (amenity: AmenityData) => {
    if (!amenity.dbId) return
    setEditingAmenityId(amenity.dbId)
    setAmenityDraft({ name: amenity.name, description: amenity.description })
    setAmenityDraftFile(null)
  }

  const loadAmenitiesFromSupabase = async () => {
    const { data, error } = await supabase
      .from('amenities')
      .select('id,name,description,image_url')
    if (error || !data?.length) return
    setAmenities(
      data.map((item: AmenityRow, index: number) => ({
        id: index + 1,
        dbId: item.id,
        name: item.name,
        description: item.description,
        image: item.image_url || '',
        icon: '',
        span: fallbackAmenities[index % fallbackAmenities.length]?.span || 'normal',
      })),
    )
  }

  useEffect(() => {
    let isMounted = true

    Promise.all([
      client.fetch<Partial<AmenitiesContent> | null>(`
        *[_type == "amenitiesSection"][0]{
          eyebrow,
          title,
          subtitle
        }
      `),
      client.fetch<Array<Omit<AmenityData, 'id' | 'icon' | 'span'> & { _id: string }>>(`
        *[_type == "amenity"] | order(_createdAt asc){
          _id,
          name,
          description,
          "image": image.asset->url
        }
      `),
    ])
      .then(([sectionData, amenityData]) => {
        if (!isMounted) return

        if (sectionData) {
          setContent({
            ...fallbackAmenitiesContent,
            ...sectionData,
          })
        }

        if (amenityData.length) {
          setAmenities(
            amenityData.map((amenity, index) => ({
              id: index + 1,
              name: amenity.name,
              description: amenity.description,
              image: amenity.image || '',
              icon: '',
              span: fallbackAmenities[index]?.span || 'normal',
            })),
          )
        }
      })
      .catch(() => {
        if (!isMounted) return
        // Only reset the section headings. Do NOT reset `amenities` here —
        // Supabase is the source of truth and must survive a Sanity failure.
        setContent(fallbackAmenitiesContent)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    loadAmenitiesFromSupabase()

    const channel = supabase
      .channel('public-amenities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amenities' }, () => {
        if (!isMounted) return
        loadAmenitiesFromSupabase()
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <>
      <section id="amenities" className="amenities-section" aria-label="Amenities">
        <div className="amenities-container">
          <div className="section-header reveal">
            <span className="section-tag" data-sanity="amenitiesSection.eyebrow">{content.eyebrow}</span>
            <h2 className="section-title" data-sanity="amenitiesSection.title">{content.title}</h2>
            <p className="section-subtitle" data-sanity="amenitiesSection.subtitle">{content.subtitle}</p>
            {showAdmin && (
              <div className="posts-header" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button className="posts-admin-manage" type="button" onClick={() => setAmenityModalOpen(true)}>
                  Manage
                </button>
              </div>
            )}
          </div>

          <div className="bento-grid">
            {allVisibleAmenities.map((amenity, index) => (
              <div
                key={amenity.id}
                className={`bento-card bento-${amenity.span || 'normal'} reveal`}
                style={{ transitionDelay: `${index * 0.07}s` }}
              >
                {amenity.image ? (
                  <>
                    <img
                      src={amenity.image}
                      alt={amenity.name}
                      className="bento-img"
                      loading="lazy"
                      data-sanity="amenity.image"
                    />
                    <div className="bento-img-overlay" />
                  </>
                ) : (
                  <div className="bento-no-img" />
                )}

                <div className="bento-content">
                  <span className="bento-icon" aria-hidden="true">{amenity.icon}</span>
                  <div>
                    <h3 className="bento-name" data-sanity="amenity.name">{amenity.name}</h3>
                    <p className="bento-desc" data-sanity="amenity.description">{amenity.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdminModal
        title="Manage Amenities"
        open={amenityModalOpen}
        onClose={() => { setAmenityModalOpen(false); resetAmenityDraft(); }}
      >
        <div className="posts-manage-modal">
          {/* ── Undo banner for deleted amenities ── */}
          {undoFallback && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#E65100' }}>Removed "{undoFallback.data.name}" from display</span>
              <button
                type="button"
                onClick={() => {
                  if (undoFallback) {
                    clearTimeout(undoFallback.timer)
                    setDeletedFallbackIndices(prev => { const n = new Set(prev); n.delete(undoFallback.index); return n })
                    if (undoFallback.data.edits) {
                      setFallbackEdits(prev => ({ ...prev, [undoFallback.index]: undoFallback.data.edits }))
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

          {/* Add / Edit form */}
          <div className="posts-manage-add" style={{ marginBottom: '1.5rem' }}>
            <div className="posts-manage-add__header">
              <div>
                <span className="posts-manage-add__eyebrow">Amenity</span>
                <h3>{editingAmenityId ? 'Edit Amenity' : 'Add New Amenity'}</h3>
              </div>
              {!editingAmenityId && (
                <button
                  className="posts-manage-add__button"
                  type="button"
                  disabled={savingAmenity}
                  onClick={() => {
                    const form = document.getElementById('amenities-admin-form') as HTMLFormElement;
                    form?.requestSubmit();
                  }}
                >
                  <Plus size={17} aria-hidden="true" />
                  {savingAmenity ? 'Adding...' : 'Add Amenity'}
                </button>
              )}
            </div>

            <form id="amenities-admin-form" onSubmit={saveAmenity} className="rates-admin-room-form">
              <label className="rates-admin-field">
                <span>Name</span>
                <input required value={amenityDraft.name} onChange={(e) => setAmenityDraft({ ...amenityDraft, name: e.target.value })} placeholder="e.g. Resort Pool" />
              </label>
              <label className="rates-admin-field">
                <span>Description</span>
                <textarea rows={3} value={amenityDraft.description} onChange={(e) => setAmenityDraft({ ...amenityDraft, description: e.target.value })} placeholder="Short description" />
              </label>
              <label className="rates-admin-field">
                <span>Image</span>
                <input type="file" accept="image/*" required={!editingAmenityId} onChange={(e) => setAmenityDraftFile(e.target.files?.[0] || null)} />
                {amenityDraftFile && (
                  <div style={{ fontSize: '0.8rem', color: '#006D77', marginTop: '0.25rem' }}>
                    <Upload size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                    {amenityDraftFile.name}
                  </div>
                )}
              </label>
              {editingAmenityId && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="rates-admin-modal-cancel" onClick={() => resetAmenityDraft()} disabled={savingAmenity}>Cancel</button>
                  <button type="submit" className="rates-admin-modal-primary" disabled={savingAmenity}>
                    {savingAmenity ? 'Saving...' : 'Update Amenity'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ── Built-in (fallback) amenities ── */}
          {fallbackAmenities.filter((_, i) => !deletedFallbackIndices.has(i)).length > 0 && (
            <div className="posts-manage-add" style={{ marginTop: '1.5rem' }}>
              <div className="posts-manage-add__header">
                <div>
                  <span className="posts-manage-add__eyebrow">Built-in amenities</span>
                  <h3>{fallbackAmenities.filter((_, i) => !deletedFallbackIndices.has(i)).length} default amenit{fallbackAmenities.filter((_, i) => !deletedFallbackIndices.has(i)).length === 1 ? 'y' : 'ies'}</h3>
                </div>
                <p>Edit these built-in amenities inline. Save to database to persist.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {fallbackAmenities.map((amenity, idx) => {
                  if (deletedFallbackIndices.has(idx)) return null
                  const edit = fallbackEdits[idx]
                  const currentName = edit?.name ?? amenity.name
                  const currentDescription = edit?.description ?? amenity.description
                  return (
                    <div key={`fallback-${idx}`} style={{
                      display: 'flex', gap: '0.75rem', padding: '0.75rem',
                      border: '1px solid rgba(0,109,119,0.15)', borderRadius: '10px',
                      background: 'rgba(0,109,119,0.03)'
                    }}>
                      {amenity.image && (
                        <img src={amenity.image} alt="" style={{
                          width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <input
                          value={currentName}
                          onChange={(e) => updateFallbackEdit(idx, { name: e.target.value })}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.85rem', width: '100%' }}
                          placeholder="Name"
                        />
                        <textarea
                          value={currentDescription}
                          onChange={(e) => updateFallbackEdit(idx, { description: e.target.value })}
                          rows={2}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                          placeholder="Description"
                        />
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => saveFallbackToDB(idx)}
                            disabled={savingFallbackToDB}
                            style={{
                              padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px',
                              border: '1px solid rgba(0,109,119,0.3)', background: '#006D77', color: '#FFFDF7',
                              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}
                            title="Save to amenities database"
                          >
                            <Save size={12} />
                            Save to DB
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFallbackAmenity(idx)}
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

          {/* ── DB-backed amenities ── */}
          {amenities.filter(a => a.dbId).length > 0 && (
            <div style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <div className="posts-manage-list-header">
                <div>
                  <span className="posts-manage-list-header__eyebrow">Saved amenities</span>
                  <h3>{amenities.filter(a => a.dbId).length} saved amenit{amenities.filter(a => a.dbId).length === 1 ? 'y' : 'ies'}</h3>
                </div>
                <p>Manage amenities saved to the database.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {amenities.filter(a => a.dbId).map((amenity) => (
                  <div key={amenity.dbId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--section-white)', border: '1px solid rgba(0,109,119,0.12)', borderRadius: '10px' }}>
{amenity.image && (
                      <img src={amenity.image} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.9rem', color: '#1A2B2C' }}>{amenity.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#6B7B7C' }}>{amenity.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => openEditAmenity(amenity)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', background: 'transparent', color: '#006D77', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => amenity.dbId && deleteAmenity(amenity.dbId)}
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
        </div>
</AdminModal>

{/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        variant={confirmDialog?.variant}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={async () => {
          await confirmDialog?.onConfirm()
          setConfirmDialog(null)
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  )
}


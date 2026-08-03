import { useState, useEffect, useRef, useCallback } from 'react';
import { client } from '../sanityClient';
import './Packages.css';
import { supabase } from '../supabaseClient';
import type { PackageItem } from '../supabaseTypes';
import AdminModal from '../components/admin/AdminModal';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { useToast } from '../components/admin/Toast';
import { isAdminModeEnabled } from '../utils/adminMode';
import { Plus, Edit, Trash2, Upload, Save, Users } from 'lucide-react';

interface PackageData {
  id?: string
  title: string
  description: string
  price: string
  pax: string
  images: string[]
  badge?: string
  includes?: string[]
  highlighted?: boolean
}

type PackageDraft = {
  name: string
  description: string
  price: string
  pax: string
  badge: string
  image_url: string
  inclusions: string
  highlighted: boolean
}

type PackagesContent = {
  eyebrow: string
  title: string
  subtitle: string
}

const fallbackPackagesContent: PackagesContent = {
  eyebrow: 'CURATED EXPERIENCES',
  title: 'Event Packages',
  subtitle: 'Choose a package and let us handle every detail of your perfect celebration',
}

const BUCKET = 'villa-images'

const fileName = (file: File) =>
  `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`

const uploadImage = async (file: File) => {
  const path = fileName(file)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export default function Packages({ onAskAboutThis }: { onAskAboutThis: () => void }) {
  const showAdmin = isAdminModeEnabled() && window.location.pathname === '/admin-vs-2024';
  const { showToast } = useToast();
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageDraft, setPackageDraft] = useState<PackageDraft>({ name: '', description: '', price: '', pax: '', badge: '', image_url: '', inclusions: '', highlighted: false });
  const [packageDraftFile, setPackageDraftFile] = useState<File | null>(null);
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
  // ── Undo stack for fallback deletions ──
  const [undoFallback, setUndoFallback] = useState<{ index: number; data: any; timer: number } | null>(null)

  const showUndoPackage = (index: number, data: any) => {
    if (undoFallback) clearTimeout(undoFallback.timer)
    const timer = window.setTimeout(() => setUndoFallback(null), 5000)
    setUndoFallback({ index, data, timer })
  }

  // ── Fallback/built-in package management ──
  const [fallbackEdits, setFallbackEdits] = useState<Record<number, { title: string; description: string; price: string; pax: string; badge: string; includes: string }>>({});
  const [deletedFallbackIndices, setDeletedFallbackIndices] = useState<Set<number>>(new Set());
  const [savingFallbackToDB, setSavingFallbackToDB] = useState(false);

  const updateFallbackEdit = (index: number, patch: Partial<{ title: string; description: string; price: string; pax: string; badge: string; includes: string }>) => {
    setFallbackEdits(prev => {
      const current = prev[index] || { title: fallbackPackages[index]?.title || '', description: fallbackPackages[index]?.description || '', price: fallbackPackages[index]?.price || '', pax: fallbackPackages[index]?.pax || '', badge: fallbackPackages[index]?.badge || '', includes: (fallbackPackages[index]?.includes || []).join('\n') };
      return { ...prev, [index]: { ...current, ...patch } };
    });
  };

const deleteFallbackPackage = (index: number) => {
    const name = fallbackPackages[index]?.title || 'this package';
    openConfirm(
      'Remove package from display?',
      `Remove "${name}" from display? You can save it to the database first.`,
      () => {
        setDeletedFallbackIndices(prev => new Set([...prev, index]));
        showUndoPackage(index, { edits: fallbackEdits[index], name });
        showToast(`Removed "${name}" from display.`);
      },
    );
  };

  const saveFallbackToDB = async (index: number) => {
    const original = fallbackPackages[index];
    if (!original) return;
    const edit = fallbackEdits[index];
    const name = edit?.title ?? original.title;
    const description = edit?.description ?? original.description;
    const price = edit?.price ?? original.price;
    const pax = edit?.pax ?? original.pax;
    const badge = (edit?.badge ?? original.badge) || '';
    const inclusions = edit?.includes ? edit.includes.split('\n').map(s => s.trim()).filter(Boolean) : original.includes || [];
    setSavingFallbackToDB(true);
    try {
      const { error } = await supabase.from('packages').insert({ name, description, price, pax, badge, image_url: original.images?.[0] || '', inclusions, highlighted: false });
      if (error) throw error;
      setDeletedFallbackIndices(prev => new Set([...prev, index]));
      setFallbackEdits(prev => { const n = { ...prev }; delete n[index]; return n; });
} catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save package', 'error');
    } finally {
      setSavingFallbackToDB(false);
    }
  };

  const fallbackPackages: PackageData[] = [
    {
      title: 'Phase 1 Area Package',
      description: 'Perfect for small gatherings and get togethers.',
      price: '\u20B110,000',
      pax: '10 persons',
      images: ['/bdayevent1.jpg', '/bdayevent2.jpg', '/bdayevent3.jpg'],
      badge: '10 PAX',
      includes: ['Venue Area only Access', '4-6 Hours Usage', '10 Pax free pool use', 'Villa Susane, Abucayan, Balamban, Cebu'],
    },
    {
      title: 'Food Package with Pool Access',
      description: 'Complete venue experience with premium accommodations, private pool access, and entertainment facilities for your special event.',
      price: '\u20B115,000',
      pax: 'Up to 20-30 Persons',
      images: ['/pool3.jpg', '/balconyview1.jpg', '/rooms1.jpg'],
      badge: '20-30 PAX',
      includes: ['8 Food trays', 'Free entrance and pool access', 'Tables and Chairs', 'Villa Susane, Abucayan, Balamban, Cebu'],
    },
    {
      title: 'All-in-One Event Package',
      description: 'Perfect for celebrations with complete event setup, catering, and entertainment systems.',
      price: '\u20B135,000',
      pax: '50 guests',
      images: ['/bdayevent1.jpg', '/bdayevent2.jpg', '/bdayevent3.jpg'],
      badge: '50 PAX',
      includes: ['Exclusive Phase 1 Access', '4 Main Dishes, Dessert, Rice and Drinks', 'Balloon Backdrop and Celebrant Name', 'Professional Sound System and Microphone', 'Perfect for Birthdays, Christenings, or Reunions', 'Villa Susane, Abucayan, Balamban, Cebu'],
    },
    {
      title: 'Grand Celebration Package',
      description: 'The ultimate experience for large gatherings with grand function hall and premium amenities.',
      price: '\u20B160,000',
      pax: '100 guests',
      images: ['/gt1.jpg', '/gt2.jpg', '/gt3.jpg'],
      badge: '100 PAX',
      includes: ['Exclusive Grand Function Hall', '4 Main Dishes, Dessert, Rice and Drinks', 'Premium Balloon Backdrop and Name', 'Professional Sounds and Mic System', '4 to 6 Hours Venue Use', 'Perfect for Birthdays, Christenings, and Reunions', 'Villa Susane, Abucayan, Balamban, Cebu'],
    },
  ];

  const [content, setContent] = useState<PackagesContent>(fallbackPackagesContent);
  const [packages, setPackages] = useState<PackageData[]>(fallbackPackages);
  const textToList = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

  const resetPackageDraft = () => {
    setEditingPackageId(null);
    setPackageDraft({ name: '', description: '', price: '', pax: '', badge: '', image_url: '', inclusions: '', highlighted: false });
    setPackageDraftFile(null);
  };

const savePackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPackageId && !packageDraftFile) {
      showToast('Please select an image.', 'error');
      return;
    }
    setSavingPackage(true);
    try {
      let imageUrl = packageDraft.image_url;
      if (packageDraftFile) {
        imageUrl = await uploadImage(packageDraftFile);
      } else {
        const existing = packages.find(p => p.id === editingPackageId);
        imageUrl = existing?.images?.[0] || '';
      }
      const payload = {
        name: packageDraft.name,
        description: packageDraft.description,
        price: packageDraft.price,
        pax: packageDraft.pax,
        badge: packageDraft.badge,
        image_url: imageUrl,
        inclusions: textToList(packageDraft.inclusions),
        highlighted: packageDraft.highlighted,
      };
      const { error } = editingPackageId
        ? await supabase.from('packages').update(payload).eq('id', editingPackageId)
        : await supabase.from('packages').insert(payload);
      if (error) throw error;
      resetPackageDraft();
      setPackageModalOpen(false);
      showToast(editingPackageId ? 'Package updated.' : 'Package added.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save package', 'error');
    } finally {
      setSavingPackage(false);
    }
  };

  const deletePackage = async (id: string) => {
    openConfirm(
      'Delete this package?',
      'Are you sure you want to permanently delete this package?',
      async () => {
        const { error } = await supabase.from('packages').delete().eq('id', id);
        if (error) {
          showToast(error.message, 'error');
          return;
        }
        showToast('Package deleted.', 'success');
      },
      'danger',
    );
  };

  const openEditPackage = (pkg: PackageData) => {
    if (!pkg.id) return;
    setEditingPackageId(pkg.id);
    setPackageDraft({
      name: pkg.title,
      description: pkg.description,
      price: pkg.price,
      pax: pkg.pax,
      badge: pkg.badge || '',
      image_url: pkg.images?.[0] || '',
      inclusions: Array.isArray(pkg.includes) ? pkg.includes.join('\n') : '',
      highlighted: pkg.highlighted || false,
    });
    setPackageDraftFile(null);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      client.fetch<Partial<PackagesContent> | null>('*[_type == "packagesSection"][0]{eyebrow,title,subtitle}'),
      client.fetch<PackageData[]>('*[_type == "packageItem"] | order(_createdAt asc){title,description,price,pax,badge,includes,"images": images[].asset->url}'),
    ]).then(([sectionData, packageData]) => {
      if (!isMounted) return;
      if (sectionData) setContent({ ...fallbackPackagesContent, ...sectionData });
      if (packageData.length) {
        setPackages(packageData.map((pkg, index) => {
          const fallback = fallbackPackages[index % fallbackPackages.length];
          return { ...fallback, ...pkg, images: pkg.images?.length ? pkg.images : fallback.images, includes: pkg.includes?.length ? pkg.includes : fallback.includes };
        }));
      }
    }).catch(() => {
      if (!isMounted) return
      // Only reset the section headings. Do NOT reset `packages` here —
      // Supabase is the source of truth and must survive a Sanity failure.
      setContent(fallbackPackagesContent)
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadPackages = async () => {
      const { data, error } = await supabase.from('packages').select('id,name,description,price,pax,badge,image_url,inclusions,highlighted');
      if (!isMounted || error || !data?.length) return;
      setPackages(data.map((pkg: PackageItem, index) => {
        const fallback = fallbackPackages[index % fallbackPackages.length];
        return {
          ...fallback,
          id: pkg.id,
          title: pkg.name || fallback.title,
          description: pkg.description || fallback.description,
          price: pkg.price || fallback.price,
          pax: pkg.pax || fallback.pax,
          badge: pkg.highlighted ? 'Featured' : (pkg.badge || fallback.badge),
          images: pkg.image_url ? [pkg.image_url] : fallback.images,
          includes: Array.isArray(pkg.inclusions) && pkg.inclusions.length ? pkg.inclusions : fallback.includes,
          highlighted: pkg.highlighted
        };
      }));
    };
    loadPackages();
    const channel = supabase.channel('public-packages').on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, loadPackages).subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, []);

  const ImageCarousel = ({ images, title }: { images: string[], title: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const clearAutoAdvance = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);
    const startAutoAdvance = useCallback(() => { if (images.length <= 1) return; clearAutoAdvance(); intervalRef.current = setInterval(() => { setCurrentIndex((prev) => (prev + 1) % images.length); }, 4000); }, [images.length, clearAutoAdvance]);
    const nextSlide = useCallback((e?: React.MouseEvent) => { if (e) e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); if (!isHovered) { clearAutoAdvance(); startAutoAdvance(); } }, [isHovered, clearAutoAdvance, startAutoAdvance]);
    const prevSlide = useCallback((e?: React.MouseEvent) => { if (e) e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); if (!isHovered) { clearAutoAdvance(); startAutoAdvance(); } }, [images.length, isHovered, clearAutoAdvance, startAutoAdvance]);
    const goToSlide = useCallback((index: number, e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(index); if (!isHovered) { clearAutoAdvance(); startAutoAdvance(); } }, [isHovered, clearAutoAdvance, startAutoAdvance]);
    const handleMouseEnter = useCallback(() => { setIsHovered(true); clearAutoAdvance(); }, [clearAutoAdvance]);
    const handleMouseLeave = useCallback(() => { setIsHovered(false); startAutoAdvance(); }, [startAutoAdvance]);
    useEffect(() => { if (images.length > 1) startAutoAdvance(); return () => clearAutoAdvance(); }, [images.length, startAutoAdvance, clearAutoAdvance]);

    return (
      <div className="package-carousel" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="carousel-container">
          <div className="carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
            {images.map((img, idx) => (
              <div key={idx} className="carousel-slide">
                <img src={img} alt={`${title} - image ${idx + 1}`} loading="lazy" data-sanity="packageItem.images" />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="carousel-btn next" onClick={nextSlide} aria-label="Next image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="carousel-dots">
                {images.map((_, idx) => (
                  <button key={idx} className={`dot ${idx === currentIndex ? 'active' : ''}`} onClick={(e) => goToSlide(idx, e)} aria-label={`Go to image ${idx + 1}`} />
                ))}
              </div>
            </>
          )}
          <div className="image-overlay" />
</div>
      </div>
    );
  };

return (
    <>
      <section id="packages" className="packages-section" aria-label="Packages">
        <div className="packages-container">
          <div className="section-header reveal">
            <span className="section-tag" data-sanity="packagesSection.eyebrow">{content.eyebrow}</span>
            <h2 className="section-title" data-sanity="packagesSection.title">{content.title}</h2>
            <p className="section-subtitle" data-sanity="packagesSection.subtitle">{content.subtitle}</p>
            {showAdmin && (
              <div className="posts-header" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button className="posts-admin-manage" type="button" onClick={() => setPackageModalOpen(true)}>
                  Manage
                </button>
              </div>
            )}
          </div>
          <div className="packages-grid">
            {packages.map((pkg, index) => (
              <div key={pkg.id || pkg.title} className="package-card-wrapper reveal" style={{ animationDelay: `${index * 0.12}s` }}>
                <div className="package-card">
                  {pkg.badge && <span className="package-badge" data-sanity="packageItem.badge">{pkg.badge}</span>}
                  <ImageCarousel images={pkg.images} title={pkg.title} />
                  <div className="package-content">
                    <h3 className="package-title" data-sanity="packageItem.title">{pkg.title}</h3>
                    <p className="package-description" data-sanity="packageItem.description">{pkg.description}</p>
                    {pkg.includes && (
                      <ul className="package-includes" data-sanity="packageItem.includes">
                        {pkg.includes.map((item, i) => (
                          <li key={i} className="package-include-item">
                            <svg className="include-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="package-meta">
                    <div className="package-price">
                      <span className="price-label">Package Rate</span>
                      <span className="price-amount" data-sanity="packageItem.price">{pkg.price}</span>
                    </div>
                    <div className="package-pax" data-sanity="packageItem.pax">
                      <Users size={14} aria-hidden="true" />
                      <span>{pkg.pax}</span>
                    </div>
                  </div>
                  <button className="package-button" onClick={onAskAboutThis}>
                    <span>Ask About This</span>
                    <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdminModal
        title="Manage Packages"
        open={packageModalOpen}
        onClose={() => { setPackageModalOpen(false); resetPackageDraft(); }}
      >
        <div className="posts-manage-modal">
          {/* ── Undo banner for deleted packages ── */}
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

          {/* ── Built-in (fallback) packages ── */}
          {fallbackPackages.filter((_, i) => !deletedFallbackIndices.has(i)).length > 0 && (
            <div className="posts-manage-add" style={{ marginBottom: '1.5rem' }}>
              <div className="posts-manage-add__header">
                <div>
                  <span className="posts-manage-add__eyebrow">Built-in packages</span>
                  <h3>{fallbackPackages.filter((_, i) => !deletedFallbackIndices.has(i)).length} default package{fallbackPackages.filter((_, i) => !deletedFallbackIndices.has(i)).length === 1 ? '' : 's'}</h3>
                </div>
                <p>Edit these built-in packages inline. Save to database to persist.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {fallbackPackages.map((pkg, idx) => {
                  if (deletedFallbackIndices.has(idx)) return null
                  const edit = fallbackEdits[idx]
                  const currentTitle = edit?.title ?? pkg.title
                  const currentDesc = edit?.description ?? pkg.description
                  const currentPrice = edit?.price ?? pkg.price
                  const currentPax = edit?.pax ?? pkg.pax
const currentBadge = (edit?.badge ?? pkg.badge) || ''
                  const currentIncludes = edit?.includes ?? (pkg.includes || []).join('\n')
                  return (
                    <div key={`fallback-${idx}`} style={{
                      display: 'flex', gap: '0.75rem', padding: '0.75rem',
                      border: '1px solid rgba(0,109,119,0.15)', borderRadius: '10px',
                      background: 'rgba(0,109,119,0.03)'
                    }}>
                      {pkg.images?.[0] && (
                        <img src={pkg.images[0]} alt="" style={{
                          width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                          <input value={currentTitle} onChange={(e) => updateFallbackEdit(idx, { title: e.target.value })} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.85rem', width: '100%' }} placeholder="Title" />
                          <input value={currentPrice} onChange={(e) => updateFallbackEdit(idx, { price: e.target.value })} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.85rem', width: '100%' }} placeholder="Price" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                          <input value={currentPax} onChange={(e) => updateFallbackEdit(idx, { pax: e.target.value })} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%' }} placeholder="Pax" />
                          <input value={currentBadge} onChange={(e) => updateFallbackEdit(idx, { badge: e.target.value })} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%' }} placeholder="Badge" />
                        </div>
                        <textarea value={currentDesc} onChange={(e) => updateFallbackEdit(idx, { description: e.target.value })} rows={2} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }} placeholder="Description" />
                        <textarea value={currentIncludes} onChange={(e) => updateFallbackEdit(idx, { includes: e.target.value })} rows={3} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', fontSize: '0.8rem', width: '100%', resize: 'vertical' }} placeholder="Inclusions (one per line)" />
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button type="button" onClick={() => saveFallbackToDB(idx)} disabled={savingFallbackToDB} style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.3)', background: '#006D77', color: '#FFFDF7', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Save to packages database"><Save size={12} /> Save to DB</button>
                          <button type="button" onClick={() => deleteFallbackPackage(idx)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Remove from display"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── DB-backed packages ── */}
          {packages.filter(p => p.id).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="posts-manage-list-header">
                <div>
                  <span className="posts-manage-list-header__eyebrow">Saved packages</span>
                  <h3>{packages.filter(p => p.id).length} saved package{packages.filter(p => p.id).length === 1 ? '' : 's'}</h3>
                </div>
                <p>Manage packages saved to the database.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {packages.filter(p => p.id).map((pkg) => (
                  <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--section-white)', border: '1px solid rgba(0,109,119,0.12)', borderRadius: '10px' }}>
{pkg.images?.[0] && (
                      <img src={pkg.images[0]} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.9rem', color: '#1A2B2C' }}>{pkg.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#6B7B7C' }}>{pkg.price} · {pkg.pax}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button type="button" onClick={() => openEditPackage(pkg)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(0,109,119,0.2)', background: 'transparent', color: '#006D77', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                        <Edit size={14} />
                        Edit
                      </button>
                      <button type="button" onClick={() => pkg.id && deletePackage(pkg.id)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(220,38,38,0.2)', background: 'transparent', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Add new package form ── */}
          <div className="posts-manage-add">
            <div className="posts-manage-add__header">
              <div>
                <span className="posts-manage-add__eyebrow">Package</span>
                <h3>{editingPackageId ? 'Edit Package' : 'Add New Package'}</h3>
              </div>
              {!editingPackageId && (
                <button
                  className="posts-manage-add__button"
                  type="button"
                  disabled={savingPackage}
                  onClick={() => {
                    const form = document.getElementById('packages-admin-form') as HTMLFormElement;
                    form?.requestSubmit();
                  }}
                >
                  <Plus size={17} aria-hidden="true" />
                  {savingPackage ? 'Adding...' : 'Add Package'}
                </button>
              )}
            </div>
            <form id="packages-admin-form" onSubmit={savePackage} className="rates-admin-room-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="rates-admin-field">
                  <span>Package name</span>
                  <input required value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} />
                </label>
                <label className="rates-admin-field">
                  <span>Price (e.g. ₱10,000)</span>
                  <input required value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} />
                </label>
              </div>
              <label className="rates-admin-field">
                <span>Description</span>
                <textarea rows={2} value={packageDraft.description} onChange={(event) => setPackageDraft({ ...packageDraft, description: event.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="rates-admin-field">
                  <span>Max Pax (e.g. 10 persons)</span>
                  <input value={packageDraft.pax} onChange={(event) => setPackageDraft({ ...packageDraft, pax: event.target.value })} />
                </label>
                <label className="rates-admin-field">
                  <span>Badge (e.g. 10 PAX)</span>
                  <input value={packageDraft.badge} onChange={(event) => setPackageDraft({ ...packageDraft, badge: event.target.value })} />
                </label>
              </div>
              <label className="rates-admin-field">
                <span>Image</span>
                <input type="file" accept="image/*" required={!editingPackageId} onChange={(event) => setPackageDraftFile(event.target.files?.[0] || null)} />
                {packageDraftFile && (
                  <div style={{ fontSize: '0.8rem', color: '#006D77', marginTop: '0.25rem' }}>
                    <Upload size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                    {packageDraftFile.name}
                  </div>
                )}
              </label>
              <label className="rates-admin-field">
                <span>Inclusions (one per line)</span>
                <textarea rows={4} value={packageDraft.inclusions} onChange={(event) => setPackageDraft({ ...packageDraft, inclusions: event.target.value })} />
              </label>
              <label className="packages-admin-check">
                <input type="checkbox" checked={packageDraft.highlighted} onChange={(event) => setPackageDraft({ ...packageDraft, highlighted: event.target.checked })} />
                Highlight package
              </label>
              {editingPackageId && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="rates-admin-modal-cancel" onClick={() => { setEditingPackageId(null); resetPackageDraft(); }} disabled={savingPackage}>Cancel</button>
                  <button type="submit" className="rates-admin-modal-primary" disabled={savingPackage}>
                    {savingPackage ? 'Saving...' : 'Update Package'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
</AdminModal>

{/* ── Confirm Dialog ── */}
      {confirmDialog && (
        <ConfirmDialog
          open={!!confirmDialog}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmLabel={confirmDialog.confirmLabel || 'Confirm'}
          onConfirm={async () => {
            await confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  )
}

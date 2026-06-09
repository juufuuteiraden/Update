import { useState, useEffect, useRef, useCallback } from 'react';
import { client } from '../sanityClient';
import './Packages.css';
import { supabase } from '../supabaseClient';
import type { PackageItem } from '../supabaseTypes';
import { isAdminModeEnabled } from '../utils/adminMode';
import AdminModal from '../components/admin/AdminModal';

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
  price: string
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

export default function Packages({
  onAskAboutThis,
}: {
  onAskAboutThis: () => void
}) {
  const showAdmin = isAdminModeEnabled()
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)
  const [savingPackage, setSavingPackage] = useState(false)
  const [packageDraft, setPackageDraft] = useState<PackageDraft>({ name: '', price: '', inclusions: '', highlighted: false })

  const fallbackPackages: PackageData[] = [
     {
      title: 'Phase 1 Area Package',
      description: 'Perfect for small gatherings and get togethers.',
      price: '₱10,000',
      pax: '10 persons',
      images: [
        '/bdayevent1.jpg',
        '/bdayevent2.jpg',
        '/bdayevent3.jpg',
      ],
      badge: '10 PAX',
      includes: [
        'Venue Area only Access',
        '4-6 Hours Usage',
        '10 Pax free pool use',
        'Villa Susane, Abucayan, Balamban, Cebu',
      ],
    },
    {
      title: 'Food Package with Pool Access',
      description: 'Complete venue experience with premium accommodations, private pool access, and entertainment facilities for your special event.',
      price: '₱15,000',
      pax: 'Up to 20-30 Persons',
      images: [
        '/pool3.jpg',
        '/balconyview1.jpg',
        '/rooms1.jpg',
      ],
      badge: '20-30 PAX',
      includes: [
        '8 Food trays',
        'Free entrance and pool access',
        'Tables and Chairs',
        'Villa Susane, Abucayan, Balamban, Cebu',
      ],
    },
    {
      title: 'All-in-One Event Package',
      description: 'Perfect for celebrations with complete event setup, catering, and entertainment systems.',
      price: '₱35,000',
      pax: '50 guests',
      images: [
        '/bdayevent1.jpg',
        '/bdayevent2.jpg',
        '/bdayevent3.jpg',
      ],
      badge: '50 PAX',
      includes: [
        'Exclusive Phase 1 Access',
        '4 Main Dishes, Dessert, Rice & Drinks',
        'Balloon Backdrop & Celebrant Name', 
        'Professional Sound System & Microphone',
        'Perfect for Birthdays, Christenings, or Reunions',
        'Villa Susane, Abucayan, Balamban, Cebu',
      ],
    },
    {
      title: 'Grand Celebration Package',
      description: 'The ultimate experience for large gatherings with grand function hall and premium amenities.',
      price: '₱60,000',
      pax: '100 guests',
      images: [
        '/gt1.jpg',
        '/gt2.jpg',
        '/gt3.jpg',
      ],
      badge: '100 PAX',
      includes: [
        'Exclusive Grand Function Hall',
        '4 Main Dishes, Dessert, Rice & Drinks',
        'Premium Balloon Backdrop & Name', 
        'Professional Sounds & Mic System',
        '4 to 6 Hours Venue Use',
        'Perfect for Birthdays, Christenings, & Reunions',
        'Villa Susane, Abucayan, Balamban, Cebu',
      ],
    },
  ]
  const [content, setContent] = useState<PackagesContent>(fallbackPackagesContent)
  const [packages, setPackages] = useState<PackageData[]>(fallbackPackages)

  const textToList = (value: string) =>
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

  const resetPackageDraft = () => {
    setEditingPackageId(null)
    setPackageDraft({ name: '', price: '', inclusions: '', highlighted: false })
  }

  const openAddPackage = () => {
    resetPackageDraft()
    setPackageModalOpen(true)
  }

  const openEditPackage = (pkg: PackageData) => {
    if (!pkg.id) return
    setEditingPackageId(pkg.id)
    setPackageDraft({
      name: pkg.title,
      price: pkg.price,
      inclusions: (pkg.includes || []).join('\n'),
      highlighted: Boolean(pkg.highlighted),
    })
    setPackageModalOpen(true)
  }

  const savePackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingPackage(true)
    const payload = {
      name: packageDraft.name,
      price: packageDraft.price,
      inclusions: textToList(packageDraft.inclusions),
      highlighted: packageDraft.highlighted,
    }
    const { error } = editingPackageId
      ? await supabase.from('packages').update(payload).eq('id', editingPackageId)
      : await supabase.from('packages').insert(payload)
    setSavingPackage(false)
    if (error) {
      alert(error.message)
      return
    }
    resetPackageDraft()
    setPackageModalOpen(false)
  }

  const deletePackage = async (pkg: PackageData) => {
    if (!pkg.id) return
    if (!window.confirm('Delete this package?')) return
    const { error } = await supabase.from('packages').delete().eq('id', pkg.id)
    if (error) alert(error.message)
  }

  useEffect(() => {
    let isMounted = true

    Promise.all([
      client.fetch<Partial<PackagesContent> | null>(`
        *[_type == "packagesSection"][0]{
          eyebrow,
          title,
          subtitle
        }
      `),
      client.fetch<PackageData[]>(`
        *[_type == "packageItem"] | order(_createdAt asc){
          title,
          description,
          price,
          pax,
          badge,
          includes,
          "images": images[].asset->url
        }
      `),
    ])
      .then(([sectionData, packageData]) => {
        if (!isMounted) return

        if (sectionData) {
          setContent({
            ...fallbackPackagesContent,
            ...sectionData,
          })
        }

        if (packageData.length) {
          setPackages(
            packageData.map((pkg, index) => {
              const fallback = fallbackPackages[index % fallbackPackages.length]
              return {
                ...fallback,
                ...pkg,
                images: pkg.images?.length ? pkg.images : fallback.images,
                includes: pkg.includes?.length ? pkg.includes : fallback.includes,
              }
            }),
          )
        }
      })
      .catch(() => {
        if (!isMounted) return
        setContent(fallbackPackagesContent)
        setPackages(fallbackPackages)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadPackages = async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id,name,price,inclusions,highlighted')

      if (!isMounted || error || !data?.length) return

      setPackages(
        data.map((pkg: PackageItem, index) => {
          const fallback = fallbackPackages[index % fallbackPackages.length]
          return {
            ...fallback,
            id: pkg.id,
            title: pkg.name,
            price: pkg.price,
            badge: pkg.highlighted ? 'Featured' : fallback.badge,
            includes: Array.isArray(pkg.inclusions) && pkg.inclusions.length ? pkg.inclusions : fallback.includes,
            highlighted: pkg.highlighted,
          }
        }),
      )
    }

    loadPackages()

    const channel = supabase
      .channel('public-packages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, loadPackages)
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  // Carousel component for each package
  const ImageCarousel = ({ images, title }: { images: string[], title: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)


    // Clear interval function
    const clearAutoAdvance = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    // Start auto-advance function
    const startAutoAdvance = useCallback(() => {
      if (images.length <= 1) return;
      clearAutoAdvance();
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 4000);
    }, [images.length, clearAutoAdvance]);

    // Next slide function
    const nextSlide = useCallback((e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % images.length);
      // Reset auto-advance timer on manual navigation
      if (!isHovered) {
        clearAutoAdvance();
        startAutoAdvance();
      }
    }, [isHovered, clearAutoAdvance, startAutoAdvance]);

    // Previous slide function
    const prevSlide = useCallback((e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      // Reset auto-advance timer on manual navigation
      if (!isHovered) {
        clearAutoAdvance();
        startAutoAdvance();
      }
    }, [images.length, isHovered, clearAutoAdvance, startAutoAdvance]);

    // Go to specific slide
    const goToSlide = useCallback((index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex(index);
      if (!isHovered) {
        clearAutoAdvance();
        startAutoAdvance();
      }
    }, [isHovered, clearAutoAdvance, startAutoAdvance]);

    // Handle hover events
    const handleMouseEnter = useCallback(() => {
      setIsHovered(true);
      clearAutoAdvance();
    }, [clearAutoAdvance]);

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
      startAutoAdvance();
    }, [startAutoAdvance]);

    // Start auto-advance on mount
    useEffect(() => {
      if (images.length > 1) {
        startAutoAdvance();
      }
      return () => clearAutoAdvance();
    }, [images.length, startAutoAdvance, clearAutoAdvance]);

    return (
      <div 
        className="package-carousel"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="carousel-container">
          <div 
            className="carousel-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((img, idx) => (
              <div key={idx} className="carousel-slide">
                <img src={img} alt={`${title} - image ${idx + 1}`} loading="lazy" data-sanity="packageItem.images" />
              </div>
            ))}
          </div>
        </div>
        
        {images.length > 1 && (
          <>
            <button 
              className="carousel-btn prev" 
              onClick={prevSlide}
              aria-label="Previous image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className="carousel-btn next" 
              onClick={nextSlide}
              aria-label="Next image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="carousel-dots">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={`dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={(e) => goToSlide(idx, e)}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
        
        <div className="image-overlay" />
      </div>
    );
  };

  return (
    <section id="packages" className="packages-section" aria-label="Packages">
      

      <div className="packages-container">
        <div className="section-header reveal">
          <span className="section-tag" data-sanity="packagesSection.eyebrow">{content.eyebrow}</span>
          <h2 className="section-title" data-sanity="packagesSection.title">{content.title}</h2>
          <p className="section-subtitle" data-sanity="packagesSection.subtitle">{content.subtitle}</p>
        </div>

        <div className="packages-grid">
          {packages.map((pkg, index) => (
            <div
              key={pkg.id || pkg.title}
              className="package-card-wrapper reveal"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
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
                          <svg className="include-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="package-meta">
                    <div className="package-price">
                      <span className="price-label">Package Rate</span>
                      <span className="price-amount" data-sanity="packageItem.price">{pkg.price}</span>
                    </div>
                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>
                  </div>

                  <button className="package-button" onClick={onAskAboutThis}>
                    <span>Ask About This</span>
                    <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {showAdmin && pkg.id && (
                    <div className="package-admin-actions">
                      <button type="button" onClick={() => openEditPackage(pkg)}>Edit</button>
                      <button type="button" onClick={() => deletePackage(pkg)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdminModal
        title={editingPackageId ? 'Edit Package' : 'Add Package'}
        open={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="rates-admin-modal-cancel"
              onClick={() => setPackageModalOpen(false)}
              disabled={savingPackage}
            >
              Cancel
            </button>
            <button type="submit" className="rates-admin-modal-primary" form="packages-admin-form" disabled={savingPackage}>
              {savingPackage ? 'Saving...' : editingPackageId ? 'Update Package' : 'Add Package'}
            </button>
          </div>
        }
      >
        <form id="packages-admin-form" onSubmit={savePackage} className="rates-admin-room-form">
          <label className="rates-admin-field">
            <span>Package name</span>
            <input required value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} />
          </label>
          <label className="rates-admin-field">
            <span>Price</span>
            <input required value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} />
          </label>
          <label className="rates-admin-field">
            <span>Inclusions (one per line)</span>
            <textarea rows={7} value={packageDraft.inclusions} onChange={(event) => setPackageDraft({ ...packageDraft, inclusions: event.target.value })} />
          </label>
          <label className="packages-admin-check">
            <input type="checkbox" checked={packageDraft.highlighted} onChange={(event) => setPackageDraft({ ...packageDraft, highlighted: event.target.checked })} />
            Highlight package
          </label>
        </form>
      </AdminModal>
    </section>
  )
}

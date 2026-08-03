export type GalleryItem = {
  id: string
  image_url: string
  order: number
  title?: string
  subtitle?: string
  category?: string
}

export type ReviewItem = {
  id: string
  guest_name: string
  event_type: string
  rating: number
  quote: string
}

export type RoomItem = {
  id: string
  name: string
  description: string
  image_url: string
  price: number
  guests: number
  features: string[]
}

export type PackageItem = {
  id: string
  name: string
  description: string
  price: string
  pax: string
  badge: string
  image_url: string
  inclusions: string[]
  highlighted: boolean
}

// Pricing & access (walk-in rates)
export type RatesSectionRow = {
  id: string
  eyebrow: string
  title: string
  subtitle: string
}

export type WalkInPriceRow = {
  label: string
  price: string
  note?: string
}

export type WalkInRateRow = {
  id: string
  name: string
  description: string
  guests: string
  badge: string
  price_rows: WalkInPriceRow[]
}

// Amenities
export type AmenitiesSectionRow = {
  id: string
  eyebrow: string
  title: string
  subtitle: string
}

export type AmenityRow = {
  id: string
  name: string
  description: string
  image_url: string
}

// Event Showcase
export type ShowcaseItem = {
  id: string
  title: string
  subtitle: string
  description: string
  price: string
  image_url: string
  category: string
  badge?: string
  order: number
}

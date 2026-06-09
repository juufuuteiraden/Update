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
  price: string
  inclusions: string[]
  highlighted: boolean
}

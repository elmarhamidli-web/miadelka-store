export type CategoryId =
  | 'baby'
  | 'girls'
  | 'boys'
  | 'shoes'
  | 'accessories'
  | 'new-collection'

export interface Category {
  id: CategoryId
  name: string
  tagline: string
  emoji: string
  gradient: string
}

export interface ColorOption {
  name: string
  hex: string
  /** Photo gallery for this colour variant (public paths). */
  images?: string[]
}

export interface Product {
  id: string
  name: string
  category: CategoryId
  price: number
  oldPrice?: number
  rating: number
  reviews: number
  emoji: string
  gradient: string
  sizes: string[]
  colors: ColorOption[]
  ages: string[]
  badge?: string
  description: string
  material: string
  bestSeller?: boolean
  featured?: boolean
  seasonal?: boolean
  isNew?: boolean
  /** Defaults to true when omitted (bundled data). */
  inStock?: boolean
}

export interface CartItem {
  product: Product
  size: string
  color: string
  quantity: number
}

export interface Review {
  id: string
  name: string
  location: string
  avatar: string
  rating: number
  text: string
}

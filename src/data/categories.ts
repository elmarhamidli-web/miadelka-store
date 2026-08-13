import type { Category } from '../types'

export const categories: Category[] = [
  {
    id: 'baby',
    name: 'Baby',
    tagline: '0 – 24 months',
    emoji: '🍼',
    gradient: 'linear-gradient(135deg, #ffe0e9 0%, #ffd1dc 100%)',
  },
  {
    id: 'new-collection',
    name: 'New Collection',
    tagline: 'Fresh arrivals',
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #e7e3ff 0%, #d6e0ff 100%)',
  },
]

export const categoryName = (id: string): string =>
  categories.find((c) => c.id === id)?.name ?? id

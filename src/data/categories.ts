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
    id: 'girls',
    name: 'Girls',
    tagline: '0 – 24 months',
    emoji: '👗',
    gradient: 'linear-gradient(135deg, #ffe7f3 0%, #f5d6ff 100%)',
  },
  {
    id: 'boys',
    name: 'Boys',
    tagline: '0 – 24 months',
    emoji: '🧢',
    gradient: 'linear-gradient(135deg, #d9f0ff 0%, #c7e3ff 100%)',
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

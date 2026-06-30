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
    tagline: '2 – 12 years',
    emoji: '👗',
    gradient: 'linear-gradient(135deg, #ffe7f3 0%, #f5d6ff 100%)',
  },
  {
    id: 'boys',
    name: 'Boys',
    tagline: '2 – 12 years',
    emoji: '🧢',
    gradient: 'linear-gradient(135deg, #d9f0ff 0%, #c7e3ff 100%)',
  },
  {
    id: 'shoes',
    name: 'Shoes',
    tagline: 'Tiny steps',
    emoji: '👟',
    gradient: 'linear-gradient(135deg, #e6fbe9 0%, #d2f5dd 100%)',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    tagline: 'Finishing touches',
    emoji: '🎀',
    gradient: 'linear-gradient(135deg, #fff3d6 0%, #ffe7c2 100%)',
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

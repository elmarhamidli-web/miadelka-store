import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product, CategoryId, ColorOption } from '../types'
import { products as bundledProducts } from './products'
import { supabase } from '../lib/supabase'

/* ------------------------------------------------------------------ */
/* Database row shape                                                  */
/* ------------------------------------------------------------------ */

export interface ProductRow {
  id: string
  sort: number
  category: CategoryId
  price_czk: number
  old_price_czk: number | null
  rating: number
  reviews: number
  emoji: string
  gradient: string | null
  sizes: string[]
  ages: string[]
  colors: ColorOption[]
  badge: string | null
  featured: boolean
  best_seller: boolean
  seasonal: boolean
  is_new: boolean
  hidden: boolean
  in_stock: boolean
  name_cs: string | null
  name_en: string | null
  name_uk: string | null
  desc_cs: string | null
  desc_en: string | null
  desc_uk: string | null
  material_cs: string | null
  material_en: string | null
  material_uk: string | null
}

export interface SiteSettings {
  shipping_czk: number
  free_over_czk: number
}

export const DEFAULT_SETTINGS: SiteSettings = { shipping_czk: 90, free_over_czk: 2000 }

const CZK_RATE = 24

/* ------------------------------------------------------------------ */
/* Per-locale product texts fed into i18n at runtime                   */
/* ------------------------------------------------------------------ */

type Texts = { name?: string; description?: string; material?: string }
const dynamicTexts: Record<string, Record<string, Texts>> = { cs: {}, en: {}, uk: {} }

export function getDynamicProductText(locale: string, id: string): Texts | undefined {
  return dynamicTexts[locale]?.[id]
}

function rowToProduct(row: ProductRow): Product {
  dynamicTexts.cs[row.id] = {
    name: row.name_cs ?? undefined,
    description: row.desc_cs ?? undefined,
    material: row.material_cs ?? undefined,
  }
  dynamicTexts.en[row.id] = {
    name: row.name_en ?? row.name_cs ?? undefined,
    description: row.desc_en ?? row.desc_cs ?? undefined,
    material: row.material_en ?? row.material_cs ?? undefined,
  }
  dynamicTexts.uk[row.id] = {
    name: row.name_uk ?? row.name_cs ?? undefined,
    description: row.desc_uk ?? row.desc_cs ?? undefined,
    material: row.material_uk ?? row.material_cs ?? undefined,
  }
  return {
    id: row.id,
    name: row.name_en ?? row.name_cs ?? row.id,
    category: row.category,
    price: row.price_czk / CZK_RATE,
    oldPrice: row.old_price_czk ? row.old_price_czk / CZK_RATE : undefined,
    rating: row.rating,
    reviews: row.reviews,
    emoji: row.emoji || '🧸',
    gradient:
      row.gradient ||
      'linear-gradient(140deg, #ffe3ec 0%, #ffc9d8 60%, #ffb6c8 100%)',
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    ages: row.ages ?? [],
    badge: row.badge ?? undefined,
    description: row.desc_en ?? row.desc_cs ?? '',
    material: row.material_en ?? row.material_cs ?? '',
    featured: row.featured,
    bestSeller: row.best_seller,
    seasonal: row.seasonal,
    isNew: row.is_new,
    inStock: row.in_stock,
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface ProductsContextValue {
  products: Product[]
  featured: Product[]
  bestSellers: Product[]
  seasonal: Product[]
  settings: SiteSettings
  byId: (id: string) => Product | undefined
  similar: (product: Product, limit?: number) => Product[]
  /** True once live data has been loaded from the backend. */
  live: boolean
  refresh: () => Promise<void>
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(bundledProducts)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [live, setLive] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase) return
    const [prodRes, setRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('hidden', false)
        .order('sort', { ascending: true }),
      supabase.from('site_settings').select('*'),
    ])
    if (!prodRes.error && prodRes.data && prodRes.data.length > 0) {
      setProducts((prodRes.data as ProductRow[]).map(rowToProduct))
      setLive(true)
    }
    if (!setRes.error && setRes.data) {
      const map: Record<string, unknown> = {}
      for (const row of setRes.data as { key: string; value: unknown }[]) {
        map[row.key] = row.value
      }
      const s = map['shipping'] as Partial<SiteSettings> | undefined
      if (s) {
        setSettings({
          shipping_czk: Number(s.shipping_czk ?? DEFAULT_SETTINGS.shipping_czk),
          free_over_czk: Number(s.free_over_czk ?? DEFAULT_SETTINGS.free_over_czk),
        })
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<ProductsContextValue>(() => {
    const featured = products.filter((p) => p.featured)
    const bestSellers = products.filter((p) => p.bestSeller)
    const seasonal = products.filter((p) => p.seasonal)
    return {
      products,
      featured,
      bestSellers,
      seasonal,
      settings,
      live,
      refresh,
      byId: (id) => products.find((p) => p.id === id),
      similar: (product, limit = 4) =>
        products
          .filter((p) => p.id !== product.id && p.category === product.category)
          .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
          .slice(0, limit),
    }
  }, [products, settings, live, refresh])

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider')
  return ctx
}

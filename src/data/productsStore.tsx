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
  stock_qty: number | null
  seasons: string[]
}

export interface SiteSettings {
  shipping_czk: number
  free_over_czk: number
  /** Packeta/Zásilkovna widget API key (optional, set in admin settings). */
  packeta_api_key?: string
}

export interface Promotion {
  id: string
  name: string
  subtitle: string | null
  percent: number
  cta: string | null
  starts_at: string
  ends_at: string
  seasons: string[]
  banner: boolean
  active: boolean
}

export const SEASONS: { id: string; label: string }[] = [
  { id: 'spring', label: 'Jaro' },
  { id: 'summer', label: 'Léto' },
  { id: 'autumn', label: 'Podzim' },
  { id: 'winter', label: 'Zima' },
]

export const DEFAULT_SETTINGS: SiteSettings = { shipping_czk: 90, free_over_czk: 2000 }

const CZK_RATE = 24

/** Highest active promotion percentage that applies to a product's seasons.
 *  A promotion with no seasons applies to every product. */
export function promoPercentFor(seasons: string[] | null | undefined, promos: Promotion[]): number {
  const s = seasons ?? []
  let pct = 0
  const now = Date.now()
  for (const p of promos) {
    if (!p.active) continue
    if (new Date(p.starts_at).getTime() > now || new Date(p.ends_at).getTime() < now) continue
    const ps = p.seasons ?? []
    if (ps.length === 0 || ps.some((x) => s.includes(x))) pct = Math.max(pct, Number(p.percent))
  }
  return pct
}

/* ------------------------------------------------------------------ */
/* Per-locale product texts fed into i18n at runtime                   */
/* ------------------------------------------------------------------ */

type Texts = { name?: string; description?: string; material?: string }
const dynamicTexts: Record<string, Record<string, Texts>> = { cs: {}, en: {}, uk: {} }

export function getDynamicProductText(locale: string, id: string): Texts | undefined {
  return dynamicTexts[locale]?.[id]
}

function rowToProduct(row: ProductRow, promos: Promotion[] = []): Product {
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
  // Seasonal promotion engine: automatic price reduction + return to normal.
  const pct = promoPercentFor(row.seasons, promos)
  const promoPriceCzk = pct > 0 ? Math.round(row.price_czk * (1 - pct / 100)) : row.price_czk
  const soldOutByStock = row.stock_qty != null && row.stock_qty <= 0

  return {
    id: row.id,
    name: row.name_en ?? row.name_cs ?? row.id,
    category: row.category,
    price: promoPriceCzk / CZK_RATE,
    oldPrice:
      pct > 0
        ? row.price_czk / CZK_RATE
        : row.old_price_czk
          ? row.old_price_czk / CZK_RATE
          : undefined,
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
    inStock: row.in_stock && !soldOutByStock,
    stockQty: row.stock_qty,
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
  /** Currently running promotion shown in the homepage banner (or null). */
  bannerPromo: Promotion | null
  /** True once live data has been loaded from the backend. */
  live: boolean
  refresh: () => Promise<void>
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(bundledProducts)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [live, setLive] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase) return
    const [prodRes, setRes, promoRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('hidden', false)
        .order('sort', { ascending: true }),
      supabase.from('site_settings').select('*'),
      // RLS already limits this to active promotions within their date range.
      supabase.from('promotions').select('*'),
    ])
    const promos = (promoRes.data as Promotion[] | null) ?? []
    setPromotions(promos)
    if (!prodRes.error && prodRes.data && prodRes.data.length > 0) {
      setProducts((prodRes.data as ProductRow[]).map((r) => rowToProduct(r, promos)))
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
          packeta_api_key: (s as { packeta_api_key?: string }).packeta_api_key || undefined,
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
    const now = Date.now()
    const bannerPromo =
      promotions.find(
        (p) =>
          p.banner &&
          p.active &&
          new Date(p.starts_at).getTime() <= now &&
          new Date(p.ends_at).getTime() > now,
      ) ?? null
    return {
      products,
      featured,
      bestSellers,
      seasonal,
      settings,
      bannerPromo,
      live,
      refresh,
      byId: (id) => products.find((p) => p.id === id),
      similar: (product, limit = 4) =>
        products
          .filter((p) => p.id !== product.id && p.category === product.category)
          .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
          .slice(0, limit),
    }
  }, [products, settings, promotions, live, refresh])

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider')
  return ctx
}

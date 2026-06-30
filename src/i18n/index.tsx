import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Dictionary, Locale } from './types'
import { dictionaries, getStoredLocale, storeLocale } from './registry'

export type { Locale, Dictionary } from './types'

interface I18nContextValue {
  locale: Locale
  dict: Dictionary
  setLocale: (locale: Locale) => void
  /** Replace {token} placeholders, e.g. fmt(t.addAria, { name }). */
  fmt: (template: string, vars: Record<string, string | number>) => string
  /** Format a base price into the current locale's currency. */
  formatPrice: (base: number) => string
  /** Czech-aware pluralisation. */
  plural: (count: number, forms: { one: string; few: string; many: string }) => string
  /** Translated product name / description / material with English fallback. */
  productName: (id: string, fallback: string) => string
  productDescription: (id: string, fallback: string) => string
  productMaterial: (id: string, fallback: string) => string
  categoryName: (id: string) => string
  categoryTagline: (id: string) => string
  colorName: (name: string) => string
  badge: (badge: string) => string
  reviewText: (id: string, fallback: string) => string
  reviewLocation: (id: string, fallback: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)
  const dict = dictionaries[locale]

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    storeLocale(next)
    document.documentElement.lang = next
  }, [])

  const fmt = useCallback(
    (template: string, vars: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (_, key: string) =>
        key in vars ? String(vars[key]) : `{${key}}`,
      ),
    [],
  )

  const formatPrice = useCallback(
    (base: number) => {
      const { symbol, rate, position, thousand } = dict.currency
      const value = Math.round(base * rate)
      const grouped = value
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, thousand)
      return position === 'before' ? `${symbol}${grouped}` : `${grouped} ${symbol}`
    },
    [dict],
  )

  const plural = useCallback(
    (count: number, forms: { one: string; few: string; many: string }) => {
      if (locale === 'cs') {
        if (count === 1) return forms.one
        if (count >= 2 && count <= 4) return forms.few
        return forms.many
      }
      return count === 1 ? forms.one : forms.many
    },
    [locale],
  )

  const productName = useCallback(
    (id: string, fallback: string) => dict.products[id]?.name ?? fallback,
    [dict],
  )
  const productDescription = useCallback(
    (id: string, fallback: string) => dict.products[id]?.description ?? fallback,
    [dict],
  )
  const productMaterial = useCallback(
    (id: string, fallback: string) => dict.products[id]?.material ?? fallback,
    [dict],
  )
  const categoryName = useCallback(
    (id: string) => dict.categories[id]?.name ?? id,
    [dict],
  )
  const categoryTagline = useCallback(
    (id: string) => dict.categories[id]?.tagline ?? '',
    [dict],
  )
  const colorName = useCallback(
    (name: string) => dict.ui.colors[name] ?? name,
    [dict],
  )
  const badge = useCallback(
    (value: string) => dict.ui.badges[value] ?? value,
    [dict],
  )
  const reviewText = useCallback(
    (id: string, fallback: string) => dict.reviews[id]?.text ?? fallback,
    [dict],
  )
  const reviewLocation = useCallback(
    (id: string, fallback: string) => dict.reviews[id]?.location ?? fallback,
    [dict],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dict,
      setLocale,
      fmt,
      formatPrice,
      plural,
      productName,
      productDescription,
      productMaterial,
      categoryName,
      categoryTagline,
      colorName,
      badge,
      reviewText,
      reviewLocation,
    }),
    [
      locale,
      dict,
      setLocale,
      fmt,
      formatPrice,
      plural,
      productName,
      productDescription,
      productMaterial,
      categoryName,
      categoryTagline,
      colorName,
      badge,
      reviewText,
      reviewLocation,
    ],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

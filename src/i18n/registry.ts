import type { Dictionary, Locale } from './types'
import { cs } from './cs'
import { en } from './en'

export const DEFAULT_LOCALE: Locale = 'cs'

export const dictionaries: Record<Locale, Dictionary> = { cs, en }

export const locales: Locale[] = ['cs', 'en']

const STORAGE_KEY = 'littleonestore_locale'

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
  return stored && locales.includes(stored) ? stored : DEFAULT_LOCALE
}

export function storeLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore storage errors */
  }
}

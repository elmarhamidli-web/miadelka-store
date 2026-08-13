/* ------------------------------------------------------------------ */
/* Shipping methods — managed by the store owner in the admin panel.  */
/* Prices are stored in CZK; the storefront converts with CZK_RATE.   */
/* ------------------------------------------------------------------ */
import { supabase } from './supabase'

export interface ShippingMethod {
  id: string
  code: string
  name_cs: string
  name_en: string | null
  name_uk: string | null
  note_cs: string | null
  price_czk: number
  /** Free shipping from this order value (null = never free). */
  free_over_czk: number | null
  /** 'pickup' methods require choosing a pickup point. */
  kind: 'address' | 'pickup'
  /** zasilkovna | ppl | balikovna | … — drives which picker is shown. */
  carrier: string | null
  cod_allowed: boolean
  active: boolean
  sort: number
}

export async function fetchShippingMethods(): Promise<ShippingMethod[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('active', true)
    .order('sort', { ascending: true })
  return error || !data ? [] : (data as ShippingMethod[])
}

export function methodName(m: ShippingMethod, locale: string): string {
  if (locale === 'en') return m.name_en || m.name_cs
  if (locale === 'uk') return m.name_uk || m.name_cs
  return m.name_cs
}

/** Shipping price for a method at a given subtotal (both in CZK). */
export function shippingPriceCzk(m: ShippingMethod, subtotalCzk: number): number {
  if (m.free_over_czk != null && subtotalCzk >= Number(m.free_over_czk)) return 0
  return Number(m.price_czk)
}

/* ------------------------------------------------------------------ */
/* Packeta (Zásilkovna) pickup-point widget                            */
/* ------------------------------------------------------------------ */

export interface PickupPoint {
  id: string
  name: string
}

let packetaLoading: Promise<boolean> | null = null

function loadPacketaWidget(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const w = window as unknown as { Packeta?: unknown }
  if (w.Packeta) return Promise.resolve(true)
  if (packetaLoading) return packetaLoading
  packetaLoading = new Promise<boolean>((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://widget.packeta.com/v6/www/js/library.js'
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
  return packetaLoading
}

interface PacketaApi {
  Widget: {
    pick: (
      apiKey: string,
      cb: (point: { id?: string | number; name?: string; place?: string } | null) => void,
      opts?: Record<string, unknown>,
    ) => void
  }
}

/**
 * Opens the official Packeta map so the customer can choose a pickup point.
 * Resolves with the chosen point, or null if cancelled / widget unavailable.
 */
export async function pickPacketaPoint(apiKey: string): Promise<PickupPoint | null> {
  const ok = await loadPacketaWidget()
  const api = (window as unknown as { Packeta?: PacketaApi }).Packeta
  if (!ok || !api?.Widget?.pick) return null
  return new Promise<PickupPoint | null>((resolve) => {
    api.Widget.pick(
      apiKey,
      (point) => {
        if (!point || !point.id) {
          resolve(null)
          return
        }
        resolve({ id: String(point.id), name: point.name || point.place || String(point.id) })
      },
      { language: 'cs', country: 'cz', vendors: [{ country: 'cz' }] },
    )
  })
}

/** Public map used when a carrier has no embeddable widget configured. */
export const CARRIER_MAP_URLS: Record<string, string> = {
  zasilkovna: 'https://www.zasilkovna.cz/pobocky',
  ppl: 'https://www.ppl.cz/parcelshop',
  balikovna: 'https://www.balikovna.cz/vyhledani-podaci-vydejni-misto',
}

/* ------------------------------------------------------------------ */
/* Shipping carriers + automatic tracking-URL generation.             */
/* Used by the admin fulfillment flow. The generated tracking_url is  */
/* stored on the order and e-mailed to the customer.                  */
/* ------------------------------------------------------------------ */

export interface Carrier {
  id: string
  label: string
  /** Build a public tracking URL from a tracking number, or null if unknown. */
  track: (n: string) => string | null
  placeholder?: string
}

const enc = (n: string) => encodeURIComponent(n.trim())

export const CARRIERS: Carrier[] = [
  {
    id: 'zasilkovna',
    label: 'Zásilkovna (Packeta)',
    // Official consumer tracking. Numbers usually start with "Z" + digits.
    track: (n) => (n.trim() ? `https://tracking.packeta.com/cs/?id=${enc(n)}` : null),
    placeholder: 'Z1234567890',
  },
  {
    id: 'ceska-posta',
    label: 'Česká pošta',
    track: (n) =>
      n.trim()
        ? `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${enc(n)}`
        : null,
    placeholder: 'RR123456789CZ',
  },
  {
    id: 'ppl',
    label: 'PPL',
    track: (n) => (n.trim() ? `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${enc(n)}` : null),
  },
  {
    id: 'dpd',
    label: 'DPD',
    track: (n) =>
      n.trim() ? `https://www.dpd.com/cz/cs/sledovani-zasilky/?parcelNumber=${enc(n)}` : null,
  },
  {
    id: 'gls',
    label: 'GLS',
    track: (n) =>
      n.trim()
        ? `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${enc(n)}`
        : null,
  },
  {
    id: 'balikovna',
    label: 'Balíkovna',
    track: (n) =>
      n.trim()
        ? `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${enc(n)}`
        : null,
  },
  {
    id: 'other',
    label: 'Jiný dopravce',
    track: () => null,
  },
]

export const carrierById = (id: string): Carrier | undefined =>
  CARRIERS.find((c) => c.id === id)

export const carrierLabel = (id: string): string =>
  carrierById(id)?.label ?? id

/** Generate the best-guess tracking URL for a carrier + number. */
export function makeTrackingUrl(carrierId: string, trackingNumber: string): string {
  const c = carrierById(carrierId)
  return (c?.track(trackingNumber) ?? '') || ''
}

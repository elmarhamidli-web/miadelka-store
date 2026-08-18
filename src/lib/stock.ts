/* ------------------------------------------------------------------ */
/* Variant stock — quantity tracked per size + colour combination.     */
/* Keys must stay identical to the SQL function public.variant_key().  */
/* ------------------------------------------------------------------ */

export type StockVariants = Record<string, number>

const EMPTY = '-'

export function variantKey(size?: string | null, color?: string | null): string {
  const s = (size ?? '').trim() || EMPTY
  const c = (color ?? '').trim() || EMPTY
  return `${s}__${c}`
}

interface HasVariants {
  stockVariants?: StockVariants | null
  sizes?: string[]
}

/** True when the shop owner filled in a size × colour matrix for this product. */
export function tracksVariants(p: HasVariants | null | undefined): boolean {
  return !!p?.stockVariants && Object.keys(p.stockVariants).length > 0
}

/** Remaining pieces for one size + colour, or null when not tracked per variant. */
export function variantQty(
  p: HasVariants | null | undefined,
  size?: string | null,
  color?: string | null,
): number | null {
  if (!tracksVariants(p)) return null
  const v = p!.stockVariants![variantKey(size, color)]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Total pieces left in one colour across all sizes (null when not tracked). */
export function colorQty(
  p: HasVariants | null | undefined,
  color: string,
  sizes: string[],
): number | null {
  if (!tracksVariants(p)) return null
  return sizes.reduce((sum, s) => sum + (variantQty(p, s, color) ?? 0), 0)
}

/** Normalises anything coming back from the database into a clean number map. */
export function parseVariants(raw: unknown): StockVariants {
  if (!raw || typeof raw !== 'object') return {}
  const out: StockVariants = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (Number.isFinite(n)) out[k] = Math.max(0, Math.trunc(n))
  }
  return out
}

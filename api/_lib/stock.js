// Server-side variant stock checks. Mirrors src/lib/stock.ts and the SQL
// function public.variant_key() — the three must stay in sync.

export function variantKey(size, color) {
  const s = String(size ?? '').trim() || '-'
  const c = String(color ?? '').trim() || '-'
  return `${s}__${c}`
}

export function tracksVariants(row) {
  return !!row?.stock_variants && Object.keys(row.stock_variants).length > 0
}

/** Pieces left for one size + colour, or null when not tracked per variant. */
export function variantQty(row, size, color) {
  if (!tracksVariants(row)) return null
  const v = row.stock_variants[variantKey(size, color)]
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** True when the requested amount of this exact variant can be sold. */
export function variantAvailable(row, size, color, qty) {
  const left = variantQty(row, size, color)
  if (left === null) return true
  return left >= qty
}

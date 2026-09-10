// Money maths for Czech invoices.
//
// Prices in the shop are whole crowns, but a VAT-inclusive amount almost never
// splits into whole crowns: 169 Kč at 21 % is 139,67 + 29,33, not 140 + 29.
// Rounding the split to whole crowns makes the accounting wrong, so every tax
// figure is kept and printed to two decimals — the same way Stripe prints it.

/** Rounds to haléře, avoiding the usual binary-floating-point drift. */
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

/**
 * Splits a VAT-INCLUSIVE amount into net base and tax, both to two decimals.
 * The base is derived by subtraction so base + vat is exactly the total.
 */
export function splitVat(totalCzk, percent) {
  const total = round2(totalCzk)
  const rate = Number(percent) || 0
  if (!(total > 0) || !(rate > 0)) return { baseCzk: total, vatCzk: 0 }
  const vatCzk = round2(total - total / (1 + rate / 100))
  return { baseCzk: round2(total - vatCzk), vatCzk }
}

/** "1 234,50 Kč" — Czech formatting, always two decimals. */
export function czk2(n) {
  return `${Number(n || 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Kč`
}

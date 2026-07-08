// Discount codes + gift cards: server-side validation and redemption.
// The tables are NOT readable with the anon key (codes must stay secret),
// so everything here uses the service-role key.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...serviceHeaders(), ...(options.headers || {}) },
  })
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

export const normalizeCode = (code) => String(code || '').trim().toUpperCase()

/**
 * Validate a discount code for a given subtotal (CZK).
 * Returns { ok, error?, discountCzk?, type?, value? }.
 * error keys: invalid | expired | exhausted | min_subtotal
 */
export async function checkDiscount(code, subtotalCzk) {
  const c = normalizeCode(code)
  if (!c) return { ok: false, error: 'invalid' }
  const rows = await sb(`discount_codes?code=eq.${encodeURIComponent(c)}&select=*`)
  const row = rows?.[0]
  if (!row || !row.active) return { ok: false, error: 'invalid' }
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { ok: false, error: 'expired' }
  if (row.max_uses != null && row.used_count >= row.max_uses) return { ok: false, error: 'exhausted' }
  if (subtotalCzk < Number(row.min_subtotal_czk || 0))
    return { ok: false, error: 'min_subtotal', minSubtotalCzk: Number(row.min_subtotal_czk) }
  const discountCzk =
    row.type === 'percent'
      ? Math.round((subtotalCzk * Number(row.value)) / 100)
      : Math.min(Math.round(Number(row.value)), subtotalCzk)
  if (discountCzk <= 0) return { ok: false, error: 'invalid' }
  return { ok: true, code: c, discountCzk, type: row.type, value: Number(row.value) }
}

/**
 * Validate a gift card. Returns { ok, error?, balanceCzk? }.
 * error keys: invalid | expired | empty
 */
export async function checkGiftCard(code) {
  const c = normalizeCode(code)
  if (!c) return { ok: false, error: 'invalid' }
  const rows = await sb(`gift_cards?code=eq.${encodeURIComponent(c)}&select=*`)
  const row = rows?.[0]
  if (!row || !row.active) return { ok: false, error: 'invalid' }
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { ok: false, error: 'expired' }
  const balance = Math.round(Number(row.balance_czk))
  if (balance <= 0) return { ok: false, error: 'empty' }
  return { ok: true, code: c, balanceCzk: balance }
}

/** Look up a code of unknown kind: tries discount first, then gift card. */
export async function classifyCode(code, subtotalCzk) {
  const d = await checkDiscount(code, subtotalCzk)
  if (d.ok || ['expired', 'exhausted', 'min_subtotal'].includes(d.error)) return { kind: 'discount', ...d }
  const g = await checkGiftCard(code)
  if (g.ok || ['expired', 'empty'].includes(g.error)) return { kind: 'gift', ...g }
  return { kind: 'unknown', ok: false, error: 'invalid' }
}

/** Increment a discount code's use counter (best-effort). */
export async function redeemDiscount(code) {
  const c = normalizeCode(code)
  if (!c) return
  try {
    const rows = await sb(`discount_codes?code=eq.${encodeURIComponent(c)}&select=used_count`)
    if (!rows?.[0]) return
    await sb(`discount_codes?code=eq.${encodeURIComponent(c)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ used_count: Number(rows[0].used_count) + 1 }),
    })
  } catch (err) {
    console.error('redeemDiscount failed:', err)
  }
}

/** Deduct an amount (CZK) from a gift card balance (best-effort, never below 0). */
export async function redeemGiftCard(code, amountCzk) {
  const c = normalizeCode(code)
  const amount = Math.round(Number(amountCzk))
  if (!c || !(amount > 0)) return
  try {
    const rows = await sb(`gift_cards?code=eq.${encodeURIComponent(c)}&select=balance_czk`)
    if (!rows?.[0]) return
    const newBalance = Math.max(0, Math.round(Number(rows[0].balance_czk)) - amount)
    await sb(`gift_cards?code=eq.${encodeURIComponent(c)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ balance_czk: newBalance }),
    })
  } catch (err) {
    console.error('redeemGiftCard failed:', err)
  }
}

/**
 * Compute all promo amounts for an order.
 * Shipping threshold applies to the subtotal AFTER discount.
 * Gift card covers up to the remaining total (items + shipping).
 */
export async function applyPromo({ subtotalCzk, shippingCfg, discountCode, giftCode }) {
  let discountCzk = 0
  let discount = null
  if (discountCode) {
    const d = await checkDiscount(discountCode, subtotalCzk)
    if (d.ok) {
      discount = d
      discountCzk = d.discountCzk
    }
  }
  const afterDiscount = subtotalCzk - discountCzk
  const shippingCzk =
    afterDiscount >= Number(shippingCfg.free_over_czk) ? 0 : Number(shippingCfg.shipping_czk)

  let giftCzk = 0
  let gift = null
  if (giftCode) {
    const g = await checkGiftCard(giftCode)
    if (g.ok) {
      gift = g
      giftCzk = Math.min(g.balanceCzk, afterDiscount + shippingCzk)
    }
  }
  const totalCzk = Math.max(0, afterDiscount + shippingCzk - giftCzk)
  return { discount, discountCzk, gift, giftCzk, shippingCzk, totalCzk }
}

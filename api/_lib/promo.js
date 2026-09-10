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
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
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
 * Active seasonal promotions (admin-managed). Used to price products
 * server-side exactly like the storefront does.
 */
export async function getActivePromotions() {
  try {
    const rows = await sb(`promotions?select=*&active=eq.true`)
    const now = Date.now()
    return (rows || []).filter(
      (p) => new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() > now,
    )
  } catch (err) {
    console.error('getActivePromotions failed:', err)
    return []
  }
}

/** Effective price of a product row after seasonal promotions (CZK). */
export function promoPrice(row, promos) {
  if (row.is_gift_card === true) return Number(row.price_czk)
  const seasons = row.seasons || []
  let pct = 0
  for (const p of promos) {
    const ps = p.seasons || []
    if (ps.length === 0 || ps.some((s) => seasons.includes(s))) pct = Math.max(pct, Number(p.percent))
  }
  const base = Number(row.price_czk)
  return pct > 0 ? Math.round(base * (1 - pct / 100)) : base
}

/**
 * Look up an active shipping method by code (admin-managed).
 * Returns null when the code is unknown or the method is disabled.
 */
export async function getShippingMethod(code) {
  if (!code) return null
  try {
    const rows = await sb(
      `shipping_methods?code=eq.${encodeURIComponent(String(code))}&active=eq.true&select=*`,
    )
    return rows?.[0] ?? null
  } catch (err) {
    console.error('getShippingMethod failed:', err)
    return null
  }
}

/**
 * Compute all promo amounts for an order.
 * Shipping threshold applies to the subtotal AFTER discount.
 * Gift card covers up to the remaining total (items + shipping).
 * `method` (optional) overrides the global shipping settings.
 * `freeShipping` forces 0 Kč postage (basket of e-mailed gift vouchers).
 */
export async function applyPromo({
  subtotalCzk,
  shippingCfg,
  discountCode,
  giftCode,
  method,
  freeShipping = false,
}) {
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
  const shippingCzk = freeShipping
    ? 0
    : method
      ? method.free_over_czk != null && afterDiscount >= Number(method.free_over_czk)
        ? 0
        : Number(method.price_czk)
      : afterDiscount >= Number(shippingCfg.free_over_czk)
        ? 0
        : Number(shippingCfg.shipping_czk)

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

/* ------------------------------------------------------------------ */
/* Selling gift vouchers                                               */
/* ------------------------------------------------------------------ */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomGiftCode() {
  const block = () =>
    Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('')
  return `GIFT-${block()}-${block()}`
}

/**
 * Create one gift card row per purchased voucher (quantity aware).
 * Called only after the order is really paid.
 *
 * Idempotent: vouchers already issued for this order are reused instead of
 * created again, so a Stripe webhook retry re-sends the same codes rather
 * than minting new money. Throws when a code cannot be created — the caller
 * must fail loudly so the delivery is retried.
 *
 * Returns [{ code, valueCzk }] — safe to show to the buyer.
 */
export async function issueGiftCards(order) {
  const items = Array.isArray(order?.items) ? order.items : []
  const wanted = []
  for (const item of items) {
    if (item.is_gift_card !== true) continue
    const value = Math.round(Number(item.price_czk) || 0)
    const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 20)
    if (!(value > 0)) continue
    for (let i = 0; i < qty; i++) wanted.push(value)
  }
  if (wanted.length === 0) return []

  const orderNumber = order?.order_number ?? null
  const issued = []
  const remaining = [...wanted]

  // Anything already issued for this order counts towards the total.
  if (orderNumber != null) {
    // If this lookup fails we must NOT continue — creating a second set of
    // vouchers for an order is real money given away twice.
    const existing =
      (await sb(
        `gift_cards?order_number=eq.${encodeURIComponent(orderNumber)}&select=code,initial_czk`,
      )) || []
    for (const row of existing) {
      const value = Math.round(Number(row.initial_czk))
      const idx = remaining.indexOf(value)
      if (idx === -1) continue
      remaining.splice(idx, 1)
      issued.push({ code: row.code, valueCzk: value })
    }
  }

  for (const value of remaining) {
    let created = false
    let lastErr = null
    // Retry only when the random code happens to be taken already.
    for (let attempt = 0; attempt < 6 && !created; attempt++) {
      const code = randomGiftCode()
      try {
        await sb('gift_cards', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            code,
            initial_czk: value,
            balance_czk: value,
            active: true,
            order_number: orderNumber,
            recipient_email: order?.email ?? null,
            sold_at: new Date().toISOString(),
            note: `Prodáno — objednávka #${orderNumber ?? '?'}`,
          }),
        })
        issued.push({ code, valueCzk: value })
        created = true
      } catch (err) {
        lastErr = err
        // 23505 = unique violation → try another code. Anything else is a
        // real failure and must not be retried silently.
        if (!String(err.message).includes('23505')) break
      }
    }
    if (!created) throw lastErr || new Error('Gift voucher could not be created')
  }
  return issued
}

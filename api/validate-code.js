// Validates a discount code or gift card for the current cart and returns
// the amounts to display at checkout. Final amounts are always recomputed
// server-side again when the order is placed.
import { classifyCode, checkDiscount, checkGiftCard } from './_lib/promo.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_Uco7Zh8nx_pMXpJMHOeKOA_dNgaCxjO'

async function anonFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status}`)
  return res.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { code, items, appliedDiscount, appliedGift } = req.body || {}
    if (!code || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      res.status(400).json({ error: 'invalid' })
      return
    }

    // Authoritative subtotal from live product prices.
    const ids = [...new Set(items.map((i) => String(i.id)))]
    const rows = await anonFetch(
      `products?id=in.(${ids.map((id) => `"${id}"`).join(',')})&select=id,price_czk,hidden,in_stock`,
    )
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    let subtotalCzk = 0
    for (const item of items) {
      const row = byId[item.id]
      if (!row || row.hidden || row.in_stock === false) continue
      const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 20)
      subtotalCzk += Number(row.price_czk) * qty
    }

    const result = await classifyCode(code, subtotalCzk)
    if (!result.ok) {
      res.status(200).json({ ok: false, error: result.error, minSubtotalCzk: result.minSubtotalCzk })
      return
    }

    // Only one code of each kind can be active at a time.
    if (result.kind === 'discount' && appliedDiscount) {
      res.status(200).json({ ok: false, error: 'discount_already' })
      return
    }
    if (result.kind === 'gift' && appliedGift) {
      res.status(200).json({ ok: false, error: 'gift_already' })
      return
    }

    // Recheck the *other* applied code so displayed amounts stay consistent.
    const discountCode = result.kind === 'discount' ? result.code : appliedDiscount
    const giftCode = result.kind === 'gift' ? result.code : appliedGift

    const settingsRows = await anonFetch(`site_settings?key=eq.shipping&select=value`)
    const shippingCfg = settingsRows[0]?.value || { shipping_czk: 90, free_over_czk: 2000 }

    let discountCzk = 0
    if (discountCode) {
      const d = await checkDiscount(discountCode, subtotalCzk)
      if (d.ok) discountCzk = d.discountCzk
    }
    const afterDiscount = subtotalCzk - discountCzk
    const shippingCzk =
      afterDiscount >= Number(shippingCfg.free_over_czk) ? 0 : Number(shippingCfg.shipping_czk)
    let giftCzk = 0
    if (giftCode) {
      const g = await checkGiftCard(giftCode)
      if (g.ok) giftCzk = Math.min(g.balanceCzk, afterDiscount + shippingCzk)
    }

    res.status(200).json({
      ok: true,
      kind: result.kind,
      code: result.code,
      subtotalCzk,
      discountCode: discountCode || null,
      discountCzk,
      giftCode: giftCode || null,
      giftCzk,
      shippingCzk,
      totalCzk: Math.max(0, afterDiscount + shippingCzk - giftCzk),
    })
  } catch (err) {
    console.error('validate-code error:', err)
    res.status(500).json({ error: 'validation failed' })
  }
}

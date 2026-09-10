// Places a cash-on-delivery / bank-transfer order server-side, with the same
// price validation as the card flow, and sends confirmation e-mails.
// Discount codes and gift cards are validated + redeemed here, server-side.
import { sendOrderEmails } from './_lib/email.js'
import {
  applyPromo,
  getActivePromotions,
  getShippingMethod,
  promoPrice,
  redeemDiscount,
  redeemGiftCard,
} from './_lib/promo.js'
import { variantAvailable } from './_lib/stock.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_Uco7Zh8nx_pMXpJMHOeKOA_dNgaCxjO'

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
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
    const {
      customer,
      items,
      discountCode,
      giftCode,
      shippingMethod,
      pickupPointId,
      pickupPointName,
    } = req.body || {}
    if (
      !customer?.name ||
      !customer?.email ||
      !customer?.phone ||
      !customer?.street ||
      !customer?.city ||
      !customer?.zip ||
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 50
    ) {
      res.status(400).json({ error: 'Invalid request' })
      return
    }

    const ids = [...new Set(items.map((i) => String(i.id)))]
    const rows = await sbFetch(
      `products?id=in.(${ids.map((id) => `"${id}"`).join(',')})&select=*`,
    )
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))

    // Seasonal promotions change the effective price server-side too.
    const activePromos = await getActivePromotions()

    let subtotalCzk = 0
    const orderItems = []
    for (const item of items) {
      const row = byId[item.id]
      const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 20)
      // A voucher code must never leave before the money is in — card only.
      if (row?.is_gift_card === true) {
        res.status(400).json({ error: 'Gift vouchers require card payment' })
        return
      }
      if (
        !row ||
        row.hidden ||
        row.in_stock === false ||
        (row.stock_qty != null && row.stock_qty <= 0)
      ) {
        res.status(400).json({ error: `Product unavailable: ${item.id}` })
        return
      }
      // Stock split by size + colour: the exact variant must be available.
      if (!variantAvailable(row, item.size, item.color, qty)) {
        res.status(400).json({ error: `Variant unavailable: ${item.id}` })
        return
      }
      const priceCzk = promoPrice(row, activePromos)
      subtotalCzk += priceCzk * qty
      orderItems.push({
        id: row.id,
        name: row.name_en || row.name_cs,
        name_cs: row.name_cs,
        size: String(item.size || '').slice(0, 30),
        color: String(item.color || '').slice(0, 40),
        qty,
        price_czk: priceCzk,
      })
    }

    const settingsRows = await sbFetch(`site_settings?key=eq.shipping&select=value`)
    const shippingCfg = settingsRows[0]?.value || { shipping_czk: 90, free_over_czk: 2000 }

    // Shipping method + discounts — always validated against the DB.
    const method = await getShippingMethod(shippingMethod)
    if (method && method.kind === 'pickup' && !String(pickupPointName || '').trim()) {
      res.status(400).json({ error: 'Pickup point required' })
      return
    }
    const promo = await applyPromo({ subtotalCzk, shippingCfg, discountCode, giftCode, method })
    const paidByGift = promo.totalCzk === 0

    // Prices are VAT-inclusive, so the tax sits inside whatever remains after
    // the discount and the voucher have been deducted.
    const vatPayer = shippingCfg.vat_payer !== false
    const vatRate = vatPayer ? Number(shippingCfg.vat_rate ?? 21) : 0
    const vatCzk =
      vatRate > 0 ? Math.round(promo.totalCzk - promo.totalCzk / (1 + vatRate / 100)) : 0

    const orderPayload = {
      customer_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.street,
      city: customer.city,
      zip: customer.zip,
      note: customer.note || null,
      items: orderItems,
      subtotal_czk: subtotalCzk,
      shipping_czk: promo.shippingCzk,
      total_czk: promo.totalCzk,
      payment_method: paidByGift ? 'gift_card' : 'cod',
      discount_code: promo.discount?.code || null,
      discount_czk: promo.discountCzk,
      gift_card_code: promo.gift?.code || null,
      gift_card_czk: promo.giftCzk,
      vat_rate: vatRate || null,
      vat_czk: vatCzk,
      vat_base_czk: promo.totalCzk - vatCzk,
      shipping_method: method?.code || null,
      shipping_name: method?.name_cs || null,
      pickup_point_id: String(pickupPointId || '').slice(0, 60) || null,
      pickup_point_name: String(pickupPointName || '').slice(0, 200) || null,
    }

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/place_order`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p: orderPayload }),
    })
    if (!orderRes.ok) throw new Error('Order creation failed: ' + (await orderRes.text()))
    const orderNumber = await orderRes.json()

    // Redeem the codes now — the order is definitely placed.
    if (promo.discount)
      await redeemDiscount(promo.discount.code, { orderNumber, amountCzk: promo.discountCzk })
    if (promo.gift && promo.giftCzk > 0)
      await redeemGiftCard(promo.gift.code, promo.giftCzk, { orderNumber })

    // Fully covered by a gift card → mark as paid right away.
    if (paidByGift) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?order_number=eq.${orderNumber}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'paid', payment_ref: 'gift_card' }),
        }).catch(() => undefined)
      }
    }

    await sendOrderEmails({ ...orderPayload, order_number: orderNumber }, paidByGift)

    res.status(200).json({ orderNumber, paidByGift })
  } catch (err) {
    console.error('place-order error:', err)
    res.status(500).json({ error: 'Order failed' })
  }
}

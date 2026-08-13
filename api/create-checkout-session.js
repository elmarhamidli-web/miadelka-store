// Vercel serverless function: creates a Stripe Checkout Session for the cart.
// Prices are validated server-side against the Supabase catalog — the client
// can never manipulate amounts. Stripe Products are created on demand and
// cached in the `stripe_product_id` column.
import Stripe from 'stripe'
import {
  applyPromo,
  getActivePromotions,
  getShippingMethod,
  promoPrice,
  redeemDiscount,
  redeemGiftCard,
} from './_lib/promo.js'
import { sendOrderEmails } from './_lib/email.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_Uco7Zh8nx_pMXpJMHOeKOA_dNgaCxjO'
const SITE = 'https://www.littleonestore.cz'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
})

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Service-role update (used only to cache stripe_product_id; optional). */
async function cacheStripeProductId(productId, stripeProductId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ stripe_product_id: stripeProductId }),
    })
  } catch {
    /* cache only — never fail checkout because of it */
  }
}

/** Product fields as they should look in Stripe, derived from our DB row. */
function stripeProductFields(row) {
  const image = row.colors?.find((c) => c.images?.length)?.images?.[0]
  return {
    name: row.name_cs || row.name_en || row.id,
    description: (row.desc_cs || row.desc_en || '').slice(0, 400) || undefined,
    images: image ? [image.startsWith('http') ? image : SITE + image] : undefined,
  }
}

/** True when Stripe's copy differs from ours and needs updating. */
function needsSync(existing, fields) {
  if (existing.name !== fields.name) return true
  if ((existing.description || undefined) !== fields.description) return true
  const cur = existing.images?.[0] || undefined
  const next = fields.images?.[0] || undefined
  return cur !== next
}

/**
 * Get the Stripe product for a catalogue row, creating it on first use.
 * Name / description / photo are kept in sync automatically: whenever the
 * shop owner renames a product or swaps its photo in the admin panel, the
 * Stripe catalogue is updated on the next checkout. Prices are never stored
 * in Stripe — they are sent per checkout from our database, so a price change
 * in the admin panel takes effect immediately.
 */
async function getOrCreateStripeProduct(row) {
  const fields = stripeProductFields(row)

  if (row.stripe_product_id) {
    try {
      const existing = await stripe.products.retrieve(row.stripe_product_id)
      if (existing && !existing.deleted) {
        if (needsSync(existing, fields)) {
          try {
            await stripe.products.update(existing.id, {
              ...fields,
              images: fields.images ?? [],
            })
          } catch (err) {
            console.error('Stripe product sync failed:', err.message)
          }
        }
        return existing.id
      }
    } catch {
      /* fall through and create */
    }
  }

  const search = await stripe.products.search({
    query: `metadata['pid']:'${row.id}'`,
    limit: 1,
  })
  let productId
  if (search.data.length > 0) {
    const found = search.data[0]
    productId = found.id
    if (needsSync(found, fields)) {
      try {
        await stripe.products.update(found.id, { ...fields, images: fields.images ?? [] })
      } catch (err) {
        console.error('Stripe product sync failed:', err.message)
      }
    }
  } else {
    const created = await stripe.products.create({ ...fields, metadata: { pid: row.id } })
    productId = created.id
  }
  await cacheStripeProductId(row.id, productId)
  return productId
}

/**
 * Reuse (or create) the Stripe customer for this e-mail with Czech as the
 * preferred locale — Stripe renders invoice PDFs and the hosted invoice page
 * in the customer's language, so this keeps every faktura in Czech
 * regardless of the shopper's browser language.
 */
async function getOrCreateCustomer(email, name) {
  try {
    const found = await stripe.customers.list({ email, limit: 1 })
    if (found.data[0]) {
      await stripe.customers.update(found.data[0].id, {
        name: name || undefined,
        preferred_locales: ['cs'],
      })
      return found.data[0].id
    }
  } catch (err) {
    console.error('Customer lookup failed:', err.message)
  }
  const created = await stripe.customers.create({
    email,
    name: name || undefined,
    preferred_locales: ['cs'],
  })
  return created.id
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
      locale,
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

    // 1. Load authoritative product data from the database.
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
      if (
        !row ||
        row.hidden ||
        row.in_stock === false ||
        (row.stock_qty != null && row.stock_qty <= 0)
      ) {
        res.status(400).json({ error: `Product unavailable: ${item.id}` })
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

    // 2. Shipping from settings + discount/gift card validation.
    const settingsRows = await sbFetch(`site_settings?key=eq.shipping&select=value`)
    const shippingCfg = settingsRows[0]?.value || { shipping_czk: 90, free_over_czk: 2000 }
    const method = await getShippingMethod(shippingMethod)
    if (method && method.kind === 'pickup' && !String(pickupPointName || '').trim()) {
      res.status(400).json({ error: 'Pickup point required' })
      return
    }
    const promo = await applyPromo({ subtotalCzk, shippingCfg, discountCode, giftCode, method })
    const { shippingCzk } = promo
    const shippingFree = shippingCzk === 0
    const paidByGift = promo.totalCzk === 0

    // Stripe coupons only reduce line items (not shipping) — when a card
    // payment remains, cap the gift amount at the discounted items total.
    let giftCzk = promo.giftCzk
    let totalCzk = promo.totalCzk
    if (!paidByGift && promo.gift) {
      giftCzk = Math.min(promo.gift.balanceCzk, subtotalCzk - promo.discountCzk)
      totalCzk = subtotalCzk - promo.discountCzk - giftCzk + shippingCzk
    }

    // 3. Create the order (status stays "new" until the webhook marks it paid).
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
      shipping_czk: shippingCzk,
      total_czk: totalCzk,
      payment_method: paidByGift ? 'gift_card' : 'card',
      // Card orders start as "pending" — they only become real orders once
      // Stripe confirms the payment. Abandoned checkouts stay pending and are
      // expired by Stripe (→ cancelled), so they never pollute the order list.
      status: paidByGift ? 'new' : 'pending',
      discount_code: promo.discount?.code || null,
      discount_czk: promo.discountCzk,
      gift_card_code: giftCzk > 0 ? promo.gift?.code || null : null,
      gift_card_czk: giftCzk,
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

    // 3b. Fully covered by the gift card → no Stripe payment needed.
    if (paidByGift) {
      if (promo.discount) await redeemDiscount(promo.discount.code)
      if (promo.gift && promo.giftCzk > 0) await redeemGiftCard(promo.gift.code, promo.giftCzk)
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
      await sendOrderEmails({ ...orderPayload, order_number: orderNumber }, true)
      res.status(200).json({ paidByGift: true, orderNumber })
      return
    }

    // 4. Build line items with synced Stripe products.
    const lineItems = []
    for (const item of orderItems) {
      const row = byId[item.id]
      const stripeProductId = await getOrCreateStripeProduct(row)
      lineItems.push({
        quantity: item.qty,
        price_data: {
          currency: 'czk',
          unit_amount: Math.round(item.price_czk * 100),
          product: stripeProductId,
        },
      })
    }

    // 5. Discount + gift card as a one-off Stripe coupon (reduces line items).
    const reductionCzk = promo.discountCzk + giftCzk
    let discounts
    if (reductionCzk > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(Math.min(reductionCzk, subtotalCzk) * 100),
        currency: 'czk',
        duration: 'once',
        name:
          promo.discount && giftCzk > 0
            ? 'Sleva + dárkový poukaz'
            : promo.discount
              ? `Sleva ${promo.discount.code}`
              : 'Dárkový poukaz',
      })
      discounts = [{ coupon: coupon.id }]
    }

    // 6. Create the Checkout Session.
    const origin = req.headers.origin || SITE
    const stripeCustomerId = await getOrCreateCustomer(customer.email, customer.name)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      discounts,
      customer: stripeCustomerId,
      locale: locale === 'cs' ? 'cs' : 'auto',
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: shippingFree
              ? 'Doprava zdarma'
              : method?.name_cs || 'Doprava',
            fixed_amount: { amount: shippingCzk * 100, currency: 'czk' },
          },
        },
      ],
      metadata: { order_number: String(orderNumber) },
      payment_intent_data: {
        metadata: { order_number: String(orderNumber) },
        description: `Little One Store — objednávka #${orderNumber}`,
      },
      // Stripe issues a proper invoice/receipt PDF for every paid order.
      // Stripe prints the trading name ("Little One Store") in the header, so
      // the legal entity (obchodní firma, IČO, DIČ) is added as custom fields
      // — a Czech faktura must show them.
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Little One Store — objednávka #${orderNumber}`,
          metadata: { order_number: String(orderNumber) },
          custom_fields: [
            { name: 'Prodávající', value: 'Azruk s.r.o.' },
            { name: 'IČO', value: '14420333' },
            { name: 'DIČ', value: 'CZ14420333' },
          ],
          footer:
            'Dodavatel: Azruk s.r.o., Hviezdoslavova 545/41, 627 00 Brno, Česká republika\n' +
            'IČO: 14420333 · DIČ: CZ14420333 · Bankovní účet: 7441532004/5500\n' +
            'info@littleonestore.cz · www.littleonestore.cz',
        },
      },
      success_url: `${origin}/checkout?success=1&order=${orderNumber}`,
      cancel_url: `${origin}/checkout?canceled=1`,
    })

    res.status(200).json({ url: session.url, orderNumber })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    res.status(500).json({ error: 'Checkout failed' })
  }
}

// Vercel serverless function: creates a Stripe Checkout Session for the cart.
// Prices are validated server-side against the Supabase catalog — the client
// can never manipulate amounts. Stripe Products are created on demand and
// cached in the `stripe_product_id` column.
import Stripe from 'stripe'

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

async function getOrCreateStripeProduct(row) {
  if (row.stripe_product_id) {
    try {
      const existing = await stripe.products.retrieve(row.stripe_product_id)
      if (existing && !existing.deleted) return existing.id
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
    productId = search.data[0].id
  } else {
    const image = row.colors?.find((c) => c.images?.length)?.images?.[0]
    const created = await stripe.products.create({
      name: row.name_cs || row.name_en || row.id,
      description: (row.desc_cs || row.desc_en || '').slice(0, 400) || undefined,
      images: image ? [image.startsWith('http') ? image : SITE + image] : undefined,
      metadata: { pid: row.id },
    })
    productId = created.id
  }
  await cacheStripeProductId(row.id, productId)
  return productId
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { customer, items, locale } = req.body || {}
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

    let subtotalCzk = 0
    const orderItems = []
    for (const item of items) {
      const row = byId[item.id]
      const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 20)
      if (!row || row.hidden || row.in_stock === false) {
        res.status(400).json({ error: `Product unavailable: ${item.id}` })
        return
      }
      subtotalCzk += Number(row.price_czk) * qty
      orderItems.push({
        id: row.id,
        name: row.name_en || row.name_cs,
        name_cs: row.name_cs,
        size: String(item.size || '').slice(0, 30),
        color: String(item.color || '').slice(0, 40),
        qty,
        price_czk: Number(row.price_czk),
      })
    }

    // 2. Shipping from settings.
    const settingsRows = await sbFetch(`site_settings?key=eq.shipping&select=value`)
    const shippingCfg = settingsRows[0]?.value || { shipping_czk: 90, free_over_czk: 2000 }
    const shippingFree = subtotalCzk >= Number(shippingCfg.free_over_czk)
    const shippingCzk = shippingFree ? 0 : Number(shippingCfg.shipping_czk)

    // 3. Create the order (status stays "new" until the webhook marks it paid).
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/place_order`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p: {
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
          total_czk: subtotalCzk + shippingCzk,
          payment_method: 'card',
        },
      }),
    })
    if (!orderRes.ok) throw new Error('Order creation failed: ' + (await orderRes.text()))
    const orderNumber = await orderRes.json()

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

    // 5. Create the Checkout Session.
    const origin = req.headers.origin || SITE
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: customer.email,
      locale: locale === 'cs' ? 'cs' : 'auto',
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: shippingFree ? 'Doprava zdarma' : 'Doprava',
            fixed_amount: { amount: shippingCzk * 100, currency: 'czk' },
          },
        },
      ],
      metadata: { order_number: String(orderNumber) },
      payment_intent_data: {
        metadata: { order_number: String(orderNumber) },
        description: `Little One Store — objednávka #${orderNumber}`,
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

// Places a cash-on-delivery / bank-transfer order server-side, with the same
// price validation as the card flow, and sends confirmation e-mails.
import { sendOrderEmails } from './_lib/email.js'

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
    const { customer, items } = req.body || {}
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

    const settingsRows = await sbFetch(`site_settings?key=eq.shipping&select=value`)
    const shippingCfg = settingsRows[0]?.value || { shipping_czk: 90, free_over_czk: 2000 }
    const shippingCzk =
      subtotalCzk >= Number(shippingCfg.free_over_czk) ? 0 : Number(shippingCfg.shipping_czk)

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
      total_czk: subtotalCzk + shippingCzk,
      payment_method: 'cod',
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

    await sendOrderEmails({ ...orderPayload, order_number: orderNumber }, false)

    res.status(200).json({ orderNumber })
  } catch (err) {
    console.error('place-order error:', err)
    res.status(500).json({ error: 'Order failed' })
  }
}

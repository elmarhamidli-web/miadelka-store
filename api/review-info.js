// Returns the order items for a review link token so the review form can
// show what the customer bought. Exposes no address/contact data.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'

function svc() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return { apikey: key, Authorization: `Bearer ${key}` }
}

export default async function handler(req, res) {
  try {
    const token = String(req.query?.token || '')
    if (!token || token.length < 10) {
      res.status(400).json({ error: 'invalid' })
      return
    }
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?review_token=eq.${encodeURIComponent(token)}&select=order_number,customer_name,items,reviewed_at`,
      { headers: svc() },
    ).then((r) => (r.ok ? r.json() : []))
    const order = rows[0]
    if (!order) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    // Unique products only (a set can appear in several sizes/colors).
    const seen = new Set()
    const products = []
    for (const i of order.items || []) {
      if (seen.has(i.id)) continue
      seen.add(i.id)
      products.push({ id: i.id, name: i.name_cs ?? i.name })
    }
    res.status(200).json({
      orderNumber: order.order_number,
      firstName: String(order.customer_name || '').split(' ')[0],
      alreadyReviewed: !!order.reviewed_at,
      products,
    })
  } catch (err) {
    console.error('review-info error:', err)
    res.status(500).json({ error: 'failed' })
  }
}

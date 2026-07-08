// Accepts customer reviews from the /recenze/<token> form. Reviews are
// stored as "pending" and appear on the site only after the store owner
// approves them in the admin panel.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'

function svc() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { token, author, reviews } = req.body || {}
    if (
      !token ||
      String(token).length < 10 ||
      !author ||
      String(author).trim().length < 2 ||
      !Array.isArray(reviews) ||
      reviews.length === 0 ||
      reviews.length > 20
    ) {
      res.status(400).json({ error: 'invalid' })
      return
    }

    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?review_token=eq.${encodeURIComponent(String(token))}&select=id,order_number,items,reviewed_at`,
      { headers: svc() },
    ).then((r) => (r.ok ? r.json() : []))
    const order = rows[0]
    if (!order) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    if (order.reviewed_at) {
      res.status(409).json({ error: 'already_reviewed' })
      return
    }

    // Only products that were actually in the order can be reviewed.
    const validIds = new Set((order.items || []).map((i) => i.id))
    const clean = []
    for (const r of reviews) {
      const rating = Math.round(Number(r.rating))
      const text = String(r.text || '').trim().slice(0, 2000)
      if (!validIds.has(r.productId) || !(rating >= 1 && rating <= 5) || text.length < 3) continue
      clean.push({
        product_id: r.productId,
        order_number: order.order_number,
        author: String(author).trim().slice(0, 80),
        rating,
        text,
        status: 'pending',
      })
    }
    if (clean.length === 0) {
      res.status(400).json({ error: 'invalid' })
      return
    }

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: { ...svc(), Prefer: 'return=minimal' },
      body: JSON.stringify(clean),
    })
    if (!ins.ok) throw new Error('insert failed: ' + (await ins.text()))

    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      headers: { ...svc(), Prefer: 'return=minimal' },
      body: JSON.stringify({ reviewed_at: new Date().toISOString() }),
    })

    res.status(200).json({ ok: true, count: clean.length })
  } catch (err) {
    console.error('submit-review error:', err)
    res.status(500).json({ error: 'failed' })
  }
}

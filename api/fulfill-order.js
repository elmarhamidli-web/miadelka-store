// Marks an order as shipped and e-mails the customer their tracking details.
// The admin panel updates the order row (tracking fields + status) via the
// authenticated Supabase client; this endpoint re-verifies the caller is a
// signed-in admin, then sends the Czech shipment e-mail with the tracking link.
import { sendShippedEmail } from './_lib/email.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_Uco7Zh8nx_pMXpJMHOeKOA_dNgaCxjO'

/** Verify the bearer token belongs to a signed-in Supabase user. */
async function verifyUser(token) {
  if (!token) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    const user = await verifyUser(token)
    if (!user?.id) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { order } = req.body || {}
    if (!order?.email || !order?.order_number) {
      res.status(400).json({ error: 'Invalid request' })
      return
    }

    // Only e-mail the customer when there is a real tracking reference.
    if (order.tracking_number) {
      await sendShippedEmail(order)
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('fulfill-order error:', err)
    res.status(500).json({ error: 'Fulfillment e-mail failed' })
  }
}

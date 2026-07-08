// Daily Vercel cron (see vercel.json): 20 days after an order was placed,
// send the customer a review-request e-mail with a personal review link.
// Idempotent — each order gets the request at most once.
import crypto from 'node:crypto'
import { sendReviewRequestEmail } from './_lib/email.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'
const DAYS = 20
const BATCH = 50

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
  // Vercel cron sends Authorization: Bearer <CRON_SECRET> when the env is set.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString()
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*` +
        `&status=in.(paid,shipped,done)` +
        `&created_at=lte.${encodeURIComponent(cutoff)}` +
        `&review_request_sent_at=is.null` +
        `&order=created_at.asc&limit=${BATCH}`,
      { headers: svc() },
    ).then((r) => (r.ok ? r.json() : []))

    let sent = 0
    for (const order of rows) {
      if (!order.email) continue
      const token = order.review_token || crypto.randomBytes(18).toString('base64url')
      // Mark as sent BEFORE e-mailing so a crash can't cause duplicates.
      const upd = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: { ...svc(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          review_token: token,
          review_request_sent_at: new Date().toISOString(),
        }),
      })
      if (!upd.ok) continue
      await sendReviewRequestEmail({ ...order, review_token: token })
      sent++
    }
    res.status(200).json({ ok: true, checked: rows.length, sent })
  } catch (err) {
    console.error('send-review-requests error:', err)
    res.status(500).json({ error: 'cron failed' })
  }
}

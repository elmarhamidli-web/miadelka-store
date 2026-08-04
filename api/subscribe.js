// Newsletter subscription: stores the subscriber, creates a personal
// single-use 10% discount code and e-mails it as a welcome gift.
import { sendWelcomeEmail } from './_lib/email.js'

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

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = (n) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `VITEJTE-${block(4)}${block(2)}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
      res.status(400).json({ error: 'invalid' })
      return
    }

    // Already subscribed → succeed silently (no duplicate codes).
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id`,
      { headers: svc() },
    ).then((r) => (r.ok ? r.json() : []))
    if (existing.length > 0) {
      res.status(200).json({ ok: true, already: true })
      return
    }

    // Personal single-use 10% welcome code.
    const code = genCode()
    await fetch(`${SUPABASE_URL}/rest/v1/discount_codes`, {
      method: 'POST',
      headers: { ...svc(), Prefer: 'return=minimal' },
      body: JSON.stringify({ code, type: 'percent', value: 10, max_uses: 1, note: `Newsletter — ${email}` }),
    })

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: 'POST',
      headers: { ...svc(), Prefer: 'return=minimal' },
      body: JSON.stringify({ email, discount_code: code }),
    })
    if (!ins.ok) throw new Error('subscriber insert failed: ' + (await ins.text()))

    await sendWelcomeEmail(email, code)

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('subscribe error:', err)
    res.status(500).json({ error: 'failed' })
  }
}

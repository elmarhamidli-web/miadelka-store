// Serves the zálohová faktura for one order as a printable page.
// Guarded by a token derived from the order number, so a sequential id alone
// does not expose somebody else's document.
import { proformaHtml, proformaToken } from './_lib/proforma.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'

async function loadOrder(orderNumber) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  )
  if (!res.ok) throw new Error(`Supabase orders: ${res.status}`)
  const rows = await res.json()
  return rows?.[0] ?? null
}

export default async function handler(req, res) {
  try {
    const orderNumber = String(req.query?.order || '')
    const token = String(req.query?.t || '')
    if (!orderNumber || token !== proformaToken(orderNumber)) {
      res.status(404).send('Nenalezeno')
      return
    }
    const order = await loadOrder(orderNumber)
    if (!order) {
      res.status(404).send('Nenalezeno')
      return
    }

    const settingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?key=eq.shipping&select=value`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    )
    const cfg = settingsRes.ok ? (await settingsRes.json())?.[0]?.value || {} : {}
    const vatRate = cfg.vat_payer === false ? 0 : Number(cfg.vat_rate ?? 21)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'private, max-age=60')
    res.status(200).send(proformaHtml(order, { vatRate }))
  } catch (err) {
    console.error('proforma error:', err)
    res.status(500).send('Dokument se nepodařilo načíst.')
  }
}

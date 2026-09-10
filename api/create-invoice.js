// Invoices for orders that did NOT go through Stripe Checkout — cash on
// delivery, bank transfer, or fully covered by a gift voucher.
//
// Two states, because a Czech invoice must not claim money that has not
// arrived:
//   • money not in yet  → ZÁLOHOVÁ FAKTURA (proforma). Stays "open" in Stripe,
//     so its hosted page offers "Zaplatit online" — the customer may pay it
//     early instead of on delivery.
//   • money in          → the same invoice is marked paid out of band and the
//     wording switches to a plain faktura, which is the daňový doklad.
//
// Card orders never reach this file: Stripe Checkout already issues a paid
// invoice for them, and the webhook mails it with the confirmation.
import Stripe from 'stripe'
import { sendGiftCardEmail, sendInvoiceEmail } from './_lib/email.js'
import { activateGiftCardsForOrder } from './_lib/promo.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_Uco7Zh8nx_pMXpJMHOeKOA_dNgaCxjO'

/** Verify the bearer token belongs to a signed-in Supabase user (the admin). */
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
})

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...serviceHeaders(), ...(options.headers || {}) },
  })
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${await res.text()}`)
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/** Reuses the shared Czech VAT rate created by the checkout flow. */
async function getVatRateId(percent) {
  const marker = `los_vat_${percent}`
  const list = await stripe.taxRates.list({ active: true, limit: 100 })
  const found = list.data.find((r) => r.metadata?.los_key === marker)
  if (found) return found.id
  const created = await stripe.taxRates.create({
    display_name: 'DPH',
    description: `DPH ${percent} %`,
    percentage: Number(percent),
    inclusive: true,
    country: 'CZ',
    metadata: { los_key: marker },
  })
  return created.id
}

async function getCustomer(order) {
  // list(), not search(): search is eventually consistent and would miss a
  // customer the checkout flow created moments ago.
  const found = await stripe.customers.list({ email: order.email, limit: 1 })
  if (found.data.length > 0) return found.data[0].id
  const created = await stripe.customers.create({
    email: order.email,
    name: order.customer_name,
    phone: order.phone || undefined,
    preferred_locales: ['cs'],
    address: {
      line1: order.address || undefined,
      city: order.city || undefined,
      postal_code: order.zip || undefined,
      country: 'CZ',
    },
  })
  return created.id
}

const SELLER_BLOCK =
  'Dodavatel: Azruk s.r.o., Hviezdoslavova 545/41, 627 00 Brno, Česká republika\n' +
  'IČO: 14420333 · DIČ: CZ14420333 · Bankovní účet: 7441532004/5500\n' +
  'info@littleonestore.cz · www.littleonestore.cz'

/** Title and footer differ for a proforma and for the real tax document. */
function invoiceWording(order, vatRate, settled) {
  const vatLine =
    vatRate > 0
      ? `Ceny jsou uvedeny včetně DPH ${vatRate} %. Sleva i dárkový poukaz snižují ` +
        `základ daně — DPH se počítá až z částky po jejich odečtení.\n`
      : 'Všechny uvedené částky jsou konečné.\n'

  if (!settled) {
    return {
      description: `ZÁLOHOVÁ FAKTURA (proforma) — objednávka #${order.order_number}`,
      footer:
        'Toto je zálohová faktura, není daňovým dokladem. Můžete ji zaplatit online ' +
        'odkazem výše, nebo zaplatit až při převzetí zásilky. Po přijetí platby vám ' +
        'pošleme daňový doklad.\n' +
        vatLine +
        SELLER_BLOCK,
    }
  }
  const paidLabel =
    order.payment_method === 'gift_card'
      ? 'Uhrazeno dárkovým poukazem'
      : order.payment_method === 'cod'
        ? 'Uhrazeno dobírkou / bankovním převodem'
        : 'Uhrazeno'
  return {
    description: `Little One Store — objednávka #${order.order_number}`,
    footer: `${vatLine}${paidLabel}.\n${SELLER_BLOCK}`,
  }
}

/** Maps the API result shape onto the order row's column names. */
function toOrderFields(result) {
  return {
    invoice_url: result.invoiceUrl ?? null,
    invoice_pdf: result.invoicePdf ?? null,
    invoice_status: result.invoiceStatus ?? null,
  }
}

/** Records that the customer has been e-mailed the document. */
async function markSent(orderNumber) {
  try {
    await sb(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ invoice_sent_at: new Date().toISOString() }),
    })
  } catch (err) {
    console.error('markSent failed:', err)
  }
}

/** Money is really in when a voucher covered it or the owner marked it paid. */
function isSettled(order) {
  return (
    order.payment_method === 'gift_card' ||
    ['paid', 'shipped', 'done'].includes(order.status)
  )
}

export async function issueInvoiceForOrder(order, { vatRate = 21 } = {}) {
  if (!order) throw new Error('Order missing')
  const number = order.order_number

  // Already invoiced → hand the existing links back. Settling an open invoice
  // later (COD money arrives) is handled by settleInvoiceForOrder().
  if (order.invoice_pdf || order.invoice_url) {
    return {
      invoiceUrl: order.invoice_url,
      invoicePdf: order.invoice_pdf,
      invoiceStatus: order.invoice_status || 'paid',
      skipped: true,
    }
  }

  const customerId = await getCustomer(order)
  const taxRates = vatRate > 0 ? [await getVatRateId(vatRate)] : undefined

  const settled = isSettled(order)
  const wording = invoiceWording(order, vatRate, settled)

  // The draft is created FIRST and every line is attached to it explicitly.
  // Relying on Stripe's "pending invoice items" would both miss the lines
  // (they are excluded by default) and risk swallowing leftovers from an
  // earlier failed run into this invoice.
  const invoice = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 14,
      auto_advance: false,
      currency: 'czk',
      description: wording.description,
      metadata: { order_number: String(number) },
      custom_fields: [
        { name: 'Prodávající', value: 'Azruk s.r.o.' },
        { name: 'IČO', value: '14420333' },
        { name: 'DIČ', value: 'CZ14420333' },
      ],
      footer: wording.footer,
    },
    { idempotencyKey: `los-inv-${number}` },
  )

  const lines = []
  for (const it of Array.isArray(order.items) ? order.items : []) {
    const label =
      it.is_gift_card === true
        ? `${it.name_cs || it.name} — dárkový poukaz${
            it.size === 'physical' ? ' (poštou)' : ' (e-mailem)'
          }`
        : [it.name_cs || it.name, it.color, it.size].filter(Boolean).join(' — ')
    lines.push({
      qty: Math.max(1, Number(it.qty) || 1),
      cents: Math.round(Number(it.price_czk) * 100),
      label,
    })
  }
  if (Number(order.shipping_czk) > 0) {
    lines.push({
      qty: 1,
      cents: Math.round(Number(order.shipping_czk) * 100),
      label: `Doprava — ${order.shipping_name || 'přeprava'}`,
    })
  }
  // A discount or a voucher is a negative line: it lowers the taxable base,
  // so DPH ends up charged only on what is actually left to pay.
  if (Number(order.discount_czk) > 0) {
    lines.push({
      qty: 1,
      cents: -Math.round(Number(order.discount_czk) * 100),
      label: `Sleva ${order.discount_code || ''}`.trim(),
    })
  }
  if (Number(order.gift_card_czk) > 0) {
    lines.push({
      qty: 1,
      cents: -Math.round(Number(order.gift_card_czk) * 100),
      label: `Dárkový poukaz ${order.gift_card_code || ''}`.trim(),
    })
  }

  for (const [i, line] of lines.entries()) {
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        invoice: invoice.id,
        currency: 'czk',
        quantity: line.qty,
        unit_amount_decimal: String(line.cents),
        tax_rates: taxRates,
        description: line.label.slice(0, 250),
      },
      { idempotencyKey: `los-inv-${number}-line-${i}` },
    )
  }

  // The idempotency key can replay a draft from a run that died halfway, so
  // check the real state before finalising again.
  const fresh = await stripe.invoices.retrieve(invoice.id)
  const finalised =
    fresh.status === 'draft' ? await stripe.invoices.finalizeInvoice(invoice.id) : fresh

  // Paid only when the money really is in. A dobírka invoice stays open, which
  // is exactly what makes it a proforma with a working "Zaplatit online" link.
  let current = finalised
  if (settled && finalised.status === 'open') {
    current = await stripe.invoices.pay(finalised.id, { paid_out_of_band: true })
  }

  const result = {
    invoiceUrl: current.hosted_invoice_url || null,
    invoicePdf: current.invoice_pdf || null,
    invoiceStatus: current.status === 'paid' ? 'paid' : 'proforma',
    skipped: false,
  }

  await sb(`orders?order_number=eq.${encodeURIComponent(number)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      invoice_url: result.invoiceUrl,
      invoice_pdf: result.invoicePdf,
      invoice_status: result.invoiceStatus,
    }),
  })

  return result
}

/**
 * The money for a cash-on-delivery order has arrived: the proforma becomes the
 * real faktura — wording switched, marked paid outside Stripe, links refreshed.
 */
export async function settleInvoiceForOrder(order, { vatRate = 21 } = {}) {
  const number = order?.order_number
  if (!number) return { settled: false }

  // list(), not search(): the search index lags by up to a minute, and the
  // invoice we are settling may have been created seconds ago.
  const customerId = await getCustomer(order)
  const list = await stripe.invoices.list({ customer: customerId, limit: 100 })
  const inv = list.data.find((i) => i.metadata?.order_number === String(number))
  if (!inv) return { settled: false }

  if (inv.status === 'paid') {
    // The customer paid the proforma online. Nothing notifies us, so record it
    // now — otherwise the row stays 'proforma' forever.
    const already = {
      settled: true,
      alreadyPaid: true,
      invoiceUrl: inv.hosted_invoice_url || null,
      invoicePdf: inv.invoice_pdf || null,
      invoiceStatus: 'paid',
    }
    await sb(`orders?order_number=eq.${encodeURIComponent(number)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        invoice_url: already.invoiceUrl,
        invoice_pdf: already.invoicePdf,
        invoice_status: 'paid',
      }),
    })
    return already
  }
  if (inv.status !== 'open') return { settled: false }

  // Description and footer stay editable after finalisation, so the same
  // document can stop calling itself a proforma.
  const wording = invoiceWording({ ...order, order_number: number }, vatRate, true)
  try {
    await stripe.invoices.update(inv.id, {
      description: wording.description,
      footer: wording.footer,
    })
  } catch (err) {
    console.error('Invoice wording update failed:', err.message)
  }

  const paid = await stripe.invoices.pay(inv.id, { paid_out_of_band: true })
  const result = {
    settled: true,
    invoiceUrl: paid.hosted_invoice_url || null,
    invoicePdf: paid.invoice_pdf || null,
    invoiceStatus: 'paid',
  }

  await sb(`orders?order_number=eq.${encodeURIComponent(number)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      invoice_url: result.invoiceUrl,
      invoice_pdf: result.invoicePdf,
      invoice_status: 'paid',
    }),
  })
  return result
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    // Settling an order activates its gift vouchers — real money. Only a
    // signed-in admin may reach any action here.
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    const user = await verifyUser(token)
    if (!user?.id) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { orderNumber } = req.body || {}
    if (!orderNumber) {
      res.status(400).json({ error: 'orderNumber required' })
      return
    }
    const rows = await sb(
      `orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*`,
    )
    const order = rows?.[0]
    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    if (['pending', 'cancelled'].includes(order.status)) {
      res.status(400).json({ error: 'Nedokončenou ani zrušenou objednávku nelze fakturovat.' })
      return
    }

    const settings = await sb(`site_settings?key=eq.shipping&select=value`)
    const cfg = settings?.[0]?.value || {}
    const vatRate = cfg.vat_payer === false ? 0 : Number(cfg.vat_rate ?? 21)

    // action: 'settle' — money arrived, turn the proforma into a faktura
    //         'send'   — e-mail the current document to the customer
    //         default  — issue it (proforma when unpaid, faktura when paid)
    const action = req.body.action || (req.body.settle ? 'settle' : 'issue')

    if (action === 'settle') {
      let current = order
      if (!order.invoice_url && !order.invoice_pdf) {
        const issued = await issueInvoiceForOrder(order, { vatRate })
        current = { ...order, ...toOrderFields(issued) }
      }
      const done = await settleInvoiceForOrder(current, { vatRate })
      if (!done.settled) {
        res.status(409).json({
          error: 'Fakturu se nepodařilo označit jako zaplacenou. Zkuste to prosím znovu.',
        })
        return
      }
      const merged = { ...current, ...toOrderFields(done) }
      // The money is in — the order is no longer merely "new".
      if (current.status === 'new') {
        try {
          await sb(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'paid' }),
          })
          merged.status = 'paid'
        } catch (err) {
          console.error('Order status update failed:', err)
        }
      }
      if (req.body.send !== false) {
        await sendInvoiceEmail(merged, { proforma: false })
        await markSent(orderNumber)
        // Vouchers bought on delivery have been sitting inactive in the
        // database. The money is in — switch them on and send the codes.
        try {
          const cards = await activateGiftCardsForOrder(orderNumber)
          if (cards.length > 0) await sendGiftCardEmail(merged, cards)
        } catch (err) {
          console.error(`Gift voucher activation failed for #${orderNumber}:`, err)
        }
      }
      res.status(200).json({
        invoiceUrl: merged.invoice_url,
        invoicePdf: merged.invoice_pdf,
        invoiceStatus: merged.invoice_status ?? 'paid',
        settled: true,
      })
      return
    }

    if (action === 'send') {
      let current = order
      if (!order.invoice_url && !order.invoice_pdf) {
        const issued = await issueInvoiceForOrder(order, { vatRate })
        current = { ...order, ...toOrderFields(issued) }
      }
      await sendInvoiceEmail(current, { proforma: current.invoice_status === 'proforma' })
      await markSent(orderNumber)
      res.status(200).json({
        invoiceUrl: current.invoice_url,
        invoicePdf: current.invoice_pdf,
        invoiceStatus: current.invoice_status,
        sent: true,
      })
      return
    }

    const result = await issueInvoiceForOrder(order, { vatRate })
    res.status(200).json(result)
  } catch (err) {
    console.error('create-invoice error:', err)
    res.status(500).json({ error: err.message || 'Invoice failed' })
  }
}

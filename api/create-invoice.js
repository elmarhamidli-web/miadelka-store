// Issues a Stripe invoice for an order that was NOT paid by card — cash on
// delivery, bank transfer, or fully covered by a gift voucher. Those orders
// never create a Checkout Session, so Stripe has no invoice for them and the
// admin panel shows no PDF.
//
// The invoice is finalised and marked "paid out of band" (the money did not
// flow through Stripe), which produces exactly the same PDF layout as a card
// order. Safe to call twice: an order that already has an invoice is returned
// unchanged.
import Stripe from 'stripe'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'

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
    return { invoiceUrl: order.invoice_url, invoicePdf: order.invoice_pdf, skipped: true }
  }

  const customerId = await getCustomer(order)
  const taxRates = vatRate > 0 ? [await getVatRateId(vatRate)] : undefined

  const paidLabel =
    order.payment_method === 'gift_card'
      ? 'Uhrazeno dárkovým poukazem'
      : order.payment_method === 'cod'
        ? 'Úhrada dobírkou / bankovním převodem'
        : 'Uhrazeno'

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
      description: `Little One Store — objednávka #${number}`,
      metadata: { order_number: String(number) },
      custom_fields: [
        { name: 'Prodávající', value: 'Azruk s.r.o.' },
        { name: 'IČO', value: '14420333' },
        { name: 'DIČ', value: 'CZ14420333' },
      ],
      footer:
        (vatRate > 0
          ? `Ceny jsou uvedeny včetně DPH ${vatRate} %. Sleva i dárkový poukaz snižují ` +
            `základ daně — DPH se počítá až z částky po jejich odečtení.\n`
          : 'Všechny uvedené částky jsou konečné.\n') +
        `${paidLabel}.\n` +
        'Dodavatel: Azruk s.r.o., Hviezdoslavova 545/41, 627 00 Brno, Česká republika\n' +
        'IČO: 14420333 · DIČ: CZ14420333 · Bankovní účet: 7441532004/5500\n' +
        'info@littleonestore.cz · www.littleonestore.cz',
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

  const finalised = await stripe.invoices.finalizeInvoice(invoice.id)

  // Only record it as settled when the money really is in. A dobírka invoice
  // stays open until the owner marks the order paid.
  let current = finalised
  if (isSettled(order)) {
    current = await stripe.invoices.pay(finalised.id, { paid_out_of_band: true })
  }

  const invoiceUrl = current.hosted_invoice_url || null
  const invoicePdf = current.invoice_pdf || null

  await sb(`orders?order_number=eq.${encodeURIComponent(number)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ invoice_url: invoiceUrl, invoice_pdf: invoicePdf }),
  })

  return { invoiceUrl, invoicePdf, skipped: false }
}

/**
 * Marks an already-issued invoice as paid outside Stripe. Called when the
 * owner flips a cash-on-delivery order to "zaplaceno".
 */
export async function settleInvoiceForOrder(order) {
  const number = order?.order_number
  if (!number) return { settled: false }
  const found = await stripe.invoices.search({
    query: `metadata['order_number']:'${String(number)}'`,
    limit: 1,
  })
  const inv = found.data[0]
  if (!inv || inv.status !== 'open') return { settled: false }
  await stripe.invoices.pay(inv.id, { paid_out_of_band: true })
  return { settled: true }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
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

    // "settle" = the money for a cash-on-delivery order has arrived.
    if (req.body.settle) {
      if (!order.invoice_url && !order.invoice_pdf) {
        const issued = await issueInvoiceForOrder(order, { vatRate })
        res.status(200).json(issued)
        return
      }
      const done = await settleInvoiceForOrder(order)
      res.status(200).json({
        invoiceUrl: order.invoice_url,
        invoicePdf: order.invoice_pdf,
        ...done,
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

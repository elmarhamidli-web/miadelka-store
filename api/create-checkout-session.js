// Vercel serverless function: creates a Stripe Checkout Session for the cart.
// Prices are validated server-side against the Supabase catalog — the client
// can never manipulate amounts. Stripe Products are created on demand and
// cached in the `stripe_product_id` column.
import Stripe from 'stripe'
import {
  applyPromo,
  getActivePromotions,
  getShippingMethod,
  issueGiftCards,
  promoPrice,
  redeemDiscount,
  redeemGiftCard,
} from './_lib/promo.js'
import { sendGiftCardEmail, sendOrderEmails } from './_lib/email.js'
import { variantAvailable } from './_lib/stock.js'
import { splitVat } from './_lib/money.js'

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

/** Product fields as they should look in Stripe, derived from our DB row. */
function stripeProductFields(row) {
  const image = row.colors?.find((c) => c.images?.length)?.images?.[0]
  // A voucher line on the faktura must say the amount is VAT-inclusive.
  const description =
    row.is_gift_card === true
      ? `Dárkový poukaz v hodnotě ${Math.round(Number(row.price_czk))} Kč — částka je konečná, včetně DPH.`
      : (row.desc_cs || row.desc_en || '').slice(0, 400) || undefined
  return {
    name: row.name_cs || row.name_en || row.id,
    description,
    images: image ? [image.startsWith('http') ? image : SITE + image] : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* DPH                                                                 */
/* ------------------------------------------------------------------ */

/** Cached Stripe tax-rate ids, keyed by percentage. */
const vatRateCache = new Map()

/**
 * Stripe tax rate for Czech VAT, created on first use and reused after.
 * `inclusive: true` — shop prices are final consumer prices, so the tax is
 * carved OUT of the amount instead of being added on top.
 */
async function getVatRateId(percent) {
  const key = String(percent)
  const cached = vatRateCache.get(key)
  if (cached) return cached

  const pending = (async () => {
    const marker = `los_vat_${key}`
    try {
      const list = await stripe.taxRates.list({ active: true, limit: 100 })
      const found = list.data.find((r) => r.metadata?.los_key === marker)
      if (found) return found.id
    } catch (err) {
      console.error('Tax rate lookup failed:', err.message)
    }
    const created = await stripe.taxRates.create({
      display_name: 'DPH',
      description: `DPH ${percent} %`,
      percentage: Number(percent),
      inclusive: true,
      country: 'CZ',
      metadata: { los_key: marker },
    })
    return created.id
  })()

  // Store the promise so parallel callers wait for the same lookup instead of
  // each creating their own duplicate tax rate.
  vatRateCache.set(key, pending)
  try {
    return await pending
  } catch (err) {
    vatRateCache.delete(key)
    throw err
  }
}

/**
 * Delivery mode of a purchased voucher, validated against what the shop
 * actually offers — the client cannot ask for post when only e-mail is on.
 */
function giftMode(row, requested) {
  const allowed = row.gift_delivery === 'both'
    ? ['online', 'physical']
    : [row.gift_delivery || 'online']
  const want = String(requested || '')
  return allowed.includes(want) ? want : allowed[0]
}

/** True when Stripe's copy differs from ours and needs updating. */
function needsSync(existing, fields) {
  if (existing.name !== fields.name) return true
  if ((existing.description || undefined) !== fields.description) return true
  const cur = existing.images?.[0] || undefined
  const next = fields.images?.[0] || undefined
  return cur !== next
}

/**
 * Get the Stripe product for a catalogue row, creating it on first use.
 * Name / description / photo are kept in sync automatically: whenever the
 * shop owner renames a product or swaps its photo in the admin panel, the
 * Stripe catalogue is updated on the next checkout. Prices are never stored
 * in Stripe — they are sent per checkout from our database, so a price change
 * in the admin panel takes effect immediately.
 */
async function getOrCreateStripeProduct(row) {
  const fields = stripeProductFields(row)

  if (row.stripe_product_id) {
    try {
      const existing = await stripe.products.retrieve(row.stripe_product_id)
      if (existing && !existing.deleted) {
        if (needsSync(existing, fields)) {
          try {
            await stripe.products.update(existing.id, {
              ...fields,
              images: fields.images ?? [],
            })
          } catch (err) {
            console.error('Stripe product sync failed:', err.message)
          }
        }
        return existing.id
      }
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
    const found = search.data[0]
    productId = found.id
    if (needsSync(found, fields)) {
      try {
        await stripe.products.update(found.id, { ...fields, images: fields.images ?? [] })
      } catch (err) {
        console.error('Stripe product sync failed:', err.message)
      }
    }
  } else {
    const created = await stripe.products.create({ ...fields, metadata: { pid: row.id } })
    productId = created.id
  }
  await cacheStripeProductId(row.id, productId)
  return productId
}

/**
 * Reuse (or create) the Stripe customer for this e-mail with Czech as the
 * preferred locale — Stripe renders invoice PDFs and the hosted invoice page
 * in the customer's language, so this keeps every faktura in Czech
 * regardless of the shopper's browser language.
 */
async function getOrCreateCustomer(email, name) {
  try {
    const found = await stripe.customers.list({ email, limit: 1 })
    if (found.data[0]) {
      await stripe.customers.update(found.data[0].id, {
        name: name || undefined,
        preferred_locales: ['cs'],
      })
      return found.data[0].id
    }
  } catch (err) {
    console.error('Customer lookup failed:', err.message)
  }
  const created = await stripe.customers.create({
    email,
    name: name || undefined,
    preferred_locales: ['cs'],
  })
  return created.id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const {
      customer,
      items,
      locale,
      discountCode,
      giftCode,
      shippingMethod,
      pickupPointId,
      pickupPointName,
    } = req.body || {}
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
    // Independent of each other — fetching them together shaves a couple of
    // hundred milliseconds off the "Zaplatit kartou" click.
    const [rows, activePromos, settingsRows] = await Promise.all([
      sbFetch(`products?id=in.(${ids.map((id) => `"${id}"`).join(',')})&select=*`),
      getActivePromotions(),
      sbFetch(`site_settings?key=eq.shipping&select=value`),
    ])
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))

    let subtotalCzk = 0
    const orderItems = []
    for (const item of items) {
      const row = byId[item.id]
      const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 20)
      const isGift = row?.is_gift_card === true
      if (!row || row.hidden || row.in_stock === false) {
        res.status(400).json({ error: `Product unavailable: ${item.id}` })
        return
      }
      // A voucher is generated on demand, so it is never out of stock.
      if (!isGift) {
        if (row.stock_qty != null && row.stock_qty <= 0) {
          res.status(400).json({ error: `Product unavailable: ${item.id}` })
          return
        }
        // Stock split by size + colour: the exact variant must be available.
        if (!variantAvailable(row, item.size, item.color, qty)) {
          res.status(400).json({ error: `Variant unavailable: ${item.id}` })
          return
        }
      }
      const priceCzk = promoPrice(row, activePromos)
      subtotalCzk += priceCzk * qty
      orderItems.push({
        id: row.id,
        name: row.name_en || row.name_cs,
        name_cs: row.name_cs,
        // For a voucher the size slot carries how it is delivered.
        size: isGift
          ? giftMode(row, item.size)
          : String(item.size || '').slice(0, 30),
        color: isGift ? '' : String(item.color || '').slice(0, 40),
        qty,
        price_czk: priceCzk,
        is_gift_card: isGift,
      })
    }

    // Only a basket of e-mailed vouchers pays no postage — a printed voucher
    // is a parcel like any other.
    const giftOnly =
      orderItems.length > 0 &&
      orderItems.every((i) => i.is_gift_card && i.size !== 'physical')

    // 2. Shipping from settings + discount/gift card validation.
    const shippingCfg = settingsRows[0]?.value || { shipping_czk: 90, free_over_czk: 2000 }
    // DPH is opt-in (the shop may not be a VAT payer) and the rate is editable
    // in the admin — never hard-coded into the invoice.
    const vatPayer = shippingCfg.vat_payer !== false
    const vatRate = vatPayer ? Number(shippingCfg.vat_rate ?? 21) : 0
    const method = giftOnly ? null : await getShippingMethod(shippingMethod)
    if (method && method.kind === 'pickup' && !String(pickupPointName || '').trim()) {
      res.status(400).json({ error: 'Pickup point required' })
      return
    }
    const promo = await applyPromo({
      subtotalCzk,
      shippingCfg,
      discountCode,
      giftCode,
      method,
      freeShipping: giftOnly,
    })
    const { shippingCzk } = promo
    const paidByGift = promo.totalCzk === 0

    // Postage is a line item (see below), so a coupon can reduce it too —
    // the amounts from applyPromo are used exactly as computed.
    const giftCzk = promo.giftCzk
    const totalCzk = promo.totalCzk

    // The customer pays a VAT-inclusive total, so the tax is carved out of
    // whatever is left AFTER the discount and the voucher.
    const { baseCzk: vatBaseCzk, vatCzk } = splitVat(totalCzk, vatRate)

    // Stripe cannot charge a card for less than about 15 Kč. Better to say so
    // than to create an order that can never be paid.
    if (!paidByGift && totalCzk > 0 && totalCzk < 15) {
      res.status(400).json({ error: 'amount_too_small', minimumCzk: 15 })
      return
    }

    // 3. Create the order (status stays "new" until the webhook marks it paid).
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
      total_czk: totalCzk,
      payment_method: paidByGift ? 'gift_card' : 'card',
      // Card orders start as "pending" — they only become real orders once
      // Stripe confirms the payment. Abandoned checkouts stay pending and are
      // expired by Stripe (→ cancelled), so they never pollute the order list.
      status: paidByGift ? 'new' : 'pending',
      discount_code: promo.discount?.code || null,
      discount_czk: promo.discountCzk,
      gift_card_code: giftCzk > 0 ? promo.gift?.code || null : null,
      gift_card_czk: giftCzk,
      vat_rate: vatRate || null,
      vat_czk: vatCzk,
      vat_base_czk: vatBaseCzk,
      shipping_method: method?.code || null,
      shipping_name: method?.name_cs || null,
      pickup_point_id: String(pickupPointId || '').slice(0, 60) || null,
      pickup_point_name: String(pickupPointName || '').slice(0, 200) || null,
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

    // 3b. Fully covered by the gift card → no Stripe payment needed.
    if (paidByGift) {
      if (promo.discount)
        await redeemDiscount(promo.discount.code, {
          orderNumber,
          amountCzk: promo.discountCzk,
        })
      if (promo.gift && promo.giftCzk > 0)
        await redeemGiftCard(promo.gift.code, promo.giftCzk, { orderNumber })
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?order_number=eq.${orderNumber}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'paid', payment_ref: 'gift_card' }),
        }).catch(() => undefined)
      }
      const paidOrder = { ...orderPayload, order_number: orderNumber, status: 'paid' }
      // Nothing goes through Stripe Checkout here, so issue the faktura the
      // same way the cash-on-delivery flow does.
      try {
        const { issueInvoiceForOrder } = await import('./create-invoice.js')
        const inv = await issueInvoiceForOrder(paidOrder, { vatRate })
        paidOrder.invoice_url = inv.invoiceUrl ?? null
        paidOrder.invoice_pdf = inv.invoicePdf ?? null
        paidOrder.invoice_status = inv.invoiceStatus ?? null
      } catch (err) {
        console.error(`Invoice for order #${orderNumber} failed:`, err)
      }
      await sendOrderEmails(paidOrder, true)
      // Vouchers bought with another voucher: the order is already paid, so
      // the codes have to be issued here. Tell the owner loudly if it fails —
      // there is no webhook retry on this path.
      try {
        const cards = await issueGiftCards(paidOrder)
        if (cards.length > 0) await sendGiftCardEmail(paidOrder, cards)
      } catch (err) {
        console.error(
          `Gift voucher issue FAILED for paid order #${orderNumber} — issue the code manually:`,
          err,
        )
      }
      res.status(200).json({ paidByGift: true, orderNumber })
      return
    }

    // 4. Build line items with synced Stripe products. The tax rate, the
    //    customer and every product sync are independent Stripe calls, so they
    //    all go out at once instead of one after another.
    const origin = req.headers.origin || SITE
    const [vatRateId, stripeCustomerId, productIds] = await Promise.all([
      vatRate > 0 ? getVatRateId(vatRate) : null,
      getOrCreateCustomer(customer.email, customer.name),
      Promise.all(
        [...new Set(orderItems.map((i) => i.id))].map(async (id) => [
          id,
          await getOrCreateStripeProduct(byId[id]),
        ]),
      ),
    ])
    const taxRates = vatRateId ? [vatRateId] : undefined
    const stripeProductById = Object.fromEntries(productIds)

    const lineItems = orderItems.map((item) => ({
      quantity: item.qty,
      tax_rates: taxRates,
      price_data: {
        currency: 'czk',
        unit_amount: Math.round(item.price_czk * 100),
        product: stripeProductById[item.id],
        // Prices on the site are final consumer prices: whatever DPH applies
        // is already contained in the amount, never added on top. This is
        // what makes a 500 Kč voucher cost exactly 500 Kč on the faktura.
        tax_behavior: 'inclusive',
      },
    }))

    // Postage rides along as a normal line item instead of a Stripe shipping
    // option. Two reasons: it can carry the DPH rate (a shipping_rate cannot),
    // and a discount or voucher may then reduce it like anything else.
    if (!giftOnly && shippingCzk > 0) {
      lineItems.push({
        quantity: 1,
        tax_rates: taxRates,
        price_data: {
          currency: 'czk',
          unit_amount: Math.round(shippingCzk * 100),
          tax_behavior: 'inclusive',
          product_data: {
            name: `Doprava — ${method?.name_cs || 'přeprava'}`,
            description:
              method?.kind === 'pickup' && pickupPointName
                ? String(pickupPointName).slice(0, 200)
                : undefined,
          },
        },
      })
    }

    // 5. Discount + gift card as a one-off Stripe coupon (reduces line items).
    // Named with the real codes, so the faktura shows exactly what was used,
    // e.g. "Dárkový poukaz GIFT-AB12-CD34 −1 000 Kč". Stripe allows a single
    // discount per session, so a discount + voucher combination is one line
    // naming both; the split is stored on the order and in code_redemptions.
    const reductionCzk = promo.discountCzk + giftCzk
    let discounts
    if (reductionCzk > 0) {
      const parts = []
      if (giftCzk > 0 && promo.gift) parts.push(`Poukaz ${promo.gift.code}`)
      if (promo.discount) parts.push(`sleva ${promo.discount.code}`)
      // Never ask for more than the line items actually add up to — Stripe
      // rejects a coupon larger than the order.
      const lineSum = lineItems.reduce(
        (sum, li) => sum + li.price_data.unit_amount * li.quantity,
        0,
      )
      const coupon = await stripe.coupons.create({
        amount_off: Math.min(Math.round(reductionCzk * 100), lineSum),
        currency: 'czk',
        duration: 'once',
        name: parts.join(' + ').slice(0, 40) || 'Sleva',
        metadata: {
          order_number: String(orderNumber),
          discount_code: promo.discount?.code || '',
          discount_czk: String(promo.discountCzk),
          gift_code: promo.gift?.code || '',
          gift_czk: String(giftCzk),
        },
      })
      discounts = [{ coupon: coupon.id }]
    }

    // 6. Create the Checkout Session.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      discounts,
      customer: stripeCustomerId,
      locale: locale === 'cs' ? 'cs' : 'auto',
      metadata: { order_number: String(orderNumber) },
      payment_intent_data: {
        metadata: { order_number: String(orderNumber) },
        description: `Little One Store — objednávka #${orderNumber}`,
      },
      // Stripe issues a proper invoice/receipt PDF for every paid order.
      // Stripe prints the trading name ("Little One Store") in the header, so
      // the legal entity (obchodní firma, IČO, DIČ) is added as custom fields
      // — a Czech faktura must show them.
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description:
            `Little One Store — objednávka #${orderNumber}` +
            (promo.discount ? ` · sleva ${promo.discount.code} −${promo.discountCzk} Kč` : '') +
            (giftCzk > 0 && promo.gift
              ? ` · dárkový poukaz ${promo.gift.code} −${giftCzk} Kč`
              : ''),
          metadata: {
            order_number: String(orderNumber),
            discount_code: promo.discount?.code || '',
            discount_czk: String(promo.discountCzk),
            gift_code: promo.gift?.code || '',
            gift_czk: String(giftCzk),
            vat_rate: String(vatRate),
            vat_czk: String(vatCzk),
            vat_base_czk: String(vatBaseCzk),
          },
          custom_fields: [
            { name: 'Prodávající', value: 'Azruk s.r.o.' },
            { name: 'IČO', value: '14420333' },
            { name: 'DIČ', value: 'CZ14420333' },
          ].concat(
            giftCzk > 0 && promo.gift
              ? [{ name: 'Dárkový poukaz', value: promo.gift.code }]
              : [],
          ),
          footer:
            (vatRate > 0
              ? `Ceny jsou uvedeny včetně DPH ${vatRate} %. Sleva i dárkový poukaz snižují ` +
                `základ daně — DPH se počítá až z částky po jejich odečtení.\n`
              : 'Všechny uvedené částky jsou konečné.\n') +
            (giftOnly
              ? 'Dárkový poukaz byl doručen elektronicky na e-mail kupujícího.\n'
              : '') +
            'Dodavatel: Azruk s.r.o., Hviezdoslavova 545/41, 627 00 Brno, Česká republika\n' +
            'IČO: 14420333 · DIČ: CZ14420333 · Bankovní účet: 7441532004/5500\n' +
            'info@littleonestore.cz · www.littleonestore.cz',
        },
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

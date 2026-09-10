// Stripe webhook: marks orders as paid when the Checkout Session completes
// and sends confirmation e-mails.
import Stripe from 'stripe'
import { sendGiftCardEmail, sendOrderEmails } from './_lib/email.js'
import { issueGiftCards, redeemDiscount, redeemGiftCard } from './_lib/promo.js'

export const config = { api: { bodyParser: false } }

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evqdraogfekhtdkkrmuq.supabase.co'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
})

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  let event
  try {
    const body = await rawBody(req)
    event = stripe.webhooks.constructEvent(
      body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const orderNumber = session.metadata?.order_number
      if (orderNumber && session.payment_status === 'paid') {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) {
          console.error('SUPABASE_SERVICE_ROLE_KEY missing — cannot mark order paid')
          res.status(500).json({ error: 'Server misconfigured' })
          return
        }

        // Stripe issues an invoice for the paid session — fetch its PDF /
        // hosted links so we can send them to the customer ourselves.
        let invoiceUrl = null
        let invoicePdf = null
        try {
          if (session.invoice) {
            const inv = await stripe.invoices.retrieve(String(session.invoice))
            invoiceUrl = inv.hosted_invoice_url || null
            invoicePdf = inv.invoice_pdf || null
          }
        } catch (err) {
          console.error('Invoice fetch failed:', err.message)
        }
        // Only unpaid orders (pending card / new COD) transition to paid, and
        // return=representation makes it idempotent: a webhook retry matches
        // no row and skips e-mails + code redemption.
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&status=in.(new,pending)`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              status: 'paid',
              payment_ref: String(session.payment_intent || session.id),
              invoice_url: invoiceUrl,
              invoice_pdf: invoicePdf,
            }),
          },
        )
        if (!resp.ok) {
          console.error('Order update failed:', resp.status, await resp.text())
          // 500 so Stripe retries the delivery
          res.status(500).json({ error: 'Order update failed' })
          return
        }
        let order = (await resp.json())?.[0]
        // A retry finds the order already paid, so the PATCH matches nothing.
        // Vouchers still have to reach the buyer, so re-read the order and let
        // the (idempotent) issuing step run again.
        let alreadyHandled = false
        if (!order) {
          alreadyHandled = true
          try {
            const again = await fetch(
              `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&status=in.(paid,shipped,done)&select=*`,
              {
                headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
              },
            )
            if (again.ok) order = (await again.json())?.[0]
          } catch (err) {
            console.error('Order re-read failed:', err)
          }
        }
        if (order) {
          // Redeem discount code / gift card exactly once, after real payment.
          if (!alreadyHandled) {
            try {
              if (order.discount_code)
                await redeemDiscount(order.discount_code, {
                  orderNumber: order.order_number,
                  amountCzk: Number(order.discount_czk) || 0,
                })
              if (order.gift_card_code && Number(order.gift_card_czk) > 0)
                await redeemGiftCard(order.gift_card_code, Number(order.gift_card_czk), {
                  orderNumber: order.order_number,
                })
            } catch (err) {
              console.error('Promo redemption failed:', err)
            }
          }
          // Send confirmation e-mails first, so a voucher problem can never
          // cost the customer their order confirmation.
          if (!alreadyHandled) {
            try {
              await sendOrderEmails(order, true)
            } catch (err) {
              console.error('Order e-mail failed:', err)
            }
          }
          // Purchased vouchers become real codes now. issueGiftCards() reuses
          // anything already created for this order, so a retry re-sends the
          // same codes instead of minting new ones. A failure here returns 500
          // on purpose: the customer has paid and Stripe must retry.
          try {
            const cards = await issueGiftCards(order)
            if (cards.length > 0) await sendGiftCardEmail(order, cards)
          } catch (err) {
            console.error('Gift voucher issue failed:', err)
            res.status(500).json({ error: 'Gift voucher issue failed' })
            return
          }
        }
      }
    } else if (
      event.type === 'checkout.session.expired' ||
      event.type === 'checkout.session.async_payment_failed'
    ) {
      const session = event.data.object
      const orderNumber = session.metadata?.order_number
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (orderNumber && serviceKey) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&status=in.(new,pending)`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ status: 'cancelled' }),
          },
        )
      }
    }
    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: 'Webhook failed' })
  }
}

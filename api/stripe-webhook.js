// Stripe webhook: marks orders as paid when the Checkout Session completes.
import Stripe from 'stripe'

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
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              status: 'paid',
              payment_ref: String(session.payment_intent || session.id),
            }),
          },
        )
        if (!resp.ok) {
          console.error('Order update failed:', resp.status, await resp.text())
          // 500 so Stripe retries the delivery
          res.status(500).json({ error: 'Order update failed' })
          return
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
          `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&status=eq.new`,
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

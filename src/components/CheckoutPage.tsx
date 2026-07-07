import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { useProducts } from '../data/productsStore'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import { fadeUp } from '../lib/motion'
import { ArrowIcon } from './icons'

const CZK = 24

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, subtotal, clearCart } = useStore()
  const { dict, fmt, formatPrice, productName, colorName } = useI18n()
  const { settings } = useProducts()
  const c = dict.ui.checkout

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    zip: '',
    note: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const FREE_SHIP = settings.free_over_czk / CZK
  const SHIPPING_FEE = settings.shipping_czk / CZK
  const shippingFree = subtotal >= FREE_SHIP
  const shipping = shippingFree ? 0 : SHIPPING_FEE
  const total = subtotal + shipping

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || cart.length === 0) return
    setBusy(true)
    setError('')
    const items = cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      name_cs: productName(item.product.id, item.product.name),
      size: item.size,
      color: item.color,
      qty: item.quantity,
      price_czk: Math.round(item.product.price * CZK),
    }))
    const { data, error: err } = await supabase.rpc('place_order', {
      p: {
        customer_name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.street,
        city: form.city,
        zip: form.zip,
        note: form.note || null,
        items,
        subtotal_czk: Math.round(subtotal * CZK),
        shipping_czk: Math.round(shipping * CZK),
        total_czk: Math.round(total * CZK),
        payment_method: 'cod',
      },
    })
    setBusy(false)
    if (err || data == null) {
      setError(c.errorGeneric)
      return
    }
    track('order_placed')
    setOrderNumber(String(data))
    clearCart()
    window.scrollTo({ top: 0 })
  }

  if (orderNumber) {
    return (
      <section className="section checkout">
        <div className="container checkout__success">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <span className="checkout__success-emoji" aria-hidden="true">💝</span>
            <h1>{c.successTitle}</h1>
            <p>{fmt(c.successSub, { number: orderNumber })}</p>
            <button className="btn btn--primary btn--lg" onClick={() => navigate('/')}>
              {c.backToShop}
            </button>
          </motion.div>
        </div>
      </section>
    )
  }

  if (cart.length === 0) {
    return (
      <section className="section checkout">
        <div className="container checkout__success">
          <span className="checkout__success-emoji" aria-hidden="true">🛒</span>
          <h1>{c.emptyCart}</h1>
          <button className="btn btn--primary btn--lg" onClick={() => navigate('/')}>
            {c.backToShop}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="section checkout">
      <div className="container">
        <motion.h1 className="section-title" initial="hidden" animate="show" variants={fadeUp}>
          {c.title}
        </motion.h1>

        <form className="checkout__layout" onSubmit={submit}>
          <div className="checkout__form">
            <div className="checkout__panel">
              <h2>{c.contact}</h2>
              <label>
                {c.name} *
                <input required value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <div className="checkout__grid">
                <label>
                  {c.email} *
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    autoComplete="email"
                  />
                </label>
                <label>
                  {c.phone} *
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    autoComplete="tel"
                  />
                </label>
              </div>
            </div>

            <div className="checkout__panel">
              <h2>{c.shippingAddr}</h2>
              <label>
                {c.street} *
                <input
                  required
                  value={form.street}
                  onChange={set('street')}
                  autoComplete="street-address"
                />
              </label>
              <div className="checkout__grid">
                <label>
                  {c.city} *
                  <input required value={form.city} onChange={set('city')} autoComplete="address-level2" />
                </label>
                <label>
                  {c.zip} *
                  <input required value={form.zip} onChange={set('zip')} autoComplete="postal-code" />
                </label>
              </div>
              <label>
                {c.note}
                <textarea rows={3} value={form.note} onChange={set('note')} />
              </label>
            </div>

            <div className="checkout__panel">
              <h2>{c.payment}</h2>
              <label className="checkout__pay is-active">
                <input type="radio" name="payment" defaultChecked />
                <div>
                  <strong>{c.cod}</strong>
                  <span>{c.codNote}</span>
                </div>
              </label>
              <label className="checkout__pay is-disabled">
                <input type="radio" name="payment" disabled />
                <div>
                  <strong>💳 {c.card}</strong>
                  <span>{c.cardSoon}</span>
                </div>
              </label>
            </div>
          </div>

          <aside className="checkout__summary">
            <h2>{c.summary}</h2>
            {cart.map((item) => (
              <div className="checkout__item" key={`${item.product.id}-${item.size}-${item.color}`}>
                <div
                  className="checkout__item-media"
                  style={{ background: item.product.gradient }}
                >
                  {(() => {
                    const imgs =
                      item.product.colors.find((col) => col.name === item.color)?.images ??
                      item.product.colors.find((col) => col.images)?.images
                    return imgs ? (
                      <img src={imgs[0]} alt="" loading="lazy" />
                    ) : (
                      <span aria-hidden="true">{item.product.emoji}</span>
                    )
                  })()}
                </div>
                <div className="checkout__item-info">
                  <strong>{productName(item.product.id, item.product.name)}</strong>
                  <span>
                    {colorName(item.color)} · {item.size} · {item.quantity}×
                  </span>
                </div>
                <span className="checkout__item-price">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}

            <div className="checkout__totals">
              <div>
                <span>{dict.ui.cart.subtotal}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div>
                <span>{dict.ui.cart.shipping}</span>
                <span>{shippingFree ? dict.ui.cart.shippingFree : formatPrice(shipping)}</span>
              </div>
              <div className="checkout__total">
                <span>{dict.ui.cart.total}</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>

            {error && <p className="checkout__error">{error}</p>}

            <button className="btn btn--primary btn--lg btn--full" disabled={busy}>
              {busy ? c.placing : c.placeOrder} <ArrowIcon />
            </button>
            <p className="cart__note">{dict.ui.cart.note}</p>
          </aside>
        </form>
      </div>
    </section>
  )
}

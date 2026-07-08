import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const { cart, subtotal, clearCart } = useStore()
  const { dict, locale, fmt, formatPrice, productName, colorName } = useI18n()
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
  const [payment, setPayment] = useState<'card' | 'cod'>('card')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [paidReturn, setPaidReturn] = useState(false)

  // Discount code + gift card (amounts in CZK, validated server-side).
  const [promoInput, setPromoInput] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoErr, setPromoErr] = useState('')
  const [discount, setDiscount] = useState<{ code: string; czk: number } | null>(null)
  const [gift, setGift] = useState<{ code: string; czk: number } | null>(null)

  // Returning from Stripe Checkout.
  useEffect(() => {
    if (searchParams.get('success') === '1' && searchParams.get('order')) {
      setOrderNumber(searchParams.get('order'))
      setPaidReturn(true)
      clearCart()
    } else if (searchParams.get('canceled') === '1') {
      setError(c.canceled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const FREE_SHIP = settings.free_over_czk / CZK
  const SHIPPING_FEE = settings.shipping_czk / CZK
  const discountAmt = discount ? discount.czk / CZK : 0
  const giftAmt = gift ? gift.czk / CZK : 0
  const shippingFree = subtotal - discountAmt >= FREE_SHIP
  const shipping = shippingFree ? 0 : SHIPPING_FEE
  const total = Math.max(0, subtotal - discountAmt + shipping - giftAmt)

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const promoErrorMsg = (key?: string) => {
    switch (key) {
      case 'expired':
        return c.promoExpired
      case 'exhausted':
        return c.promoExhausted
      case 'min_subtotal':
        return c.promoMin
      case 'empty':
        return c.promoEmpty
      case 'discount_already':
      case 'gift_already':
        return c.promoAlready
      default:
        return c.promoInvalid
    }
  }

  const applyPromo = async () => {
    const code = promoInput.trim()
    if (!code || promoBusy) return
    setPromoBusy(true)
    setPromoErr('')
    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          items: cart.map((item) => ({ id: item.product.id, qty: item.quantity })),
          appliedDiscount: discount?.code || null,
          appliedGift: gift?.code || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setPromoErr(promoErrorMsg(data.error))
      } else {
        if (data.discountCode) setDiscount({ code: data.discountCode, czk: data.discountCzk })
        if (data.giftCode) setGift({ code: data.giftCode, czk: data.giftCzk })
        setPromoInput('')
      }
    } catch {
      setPromoErr(c.promoInvalid)
    }
    setPromoBusy(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || cart.length === 0) return
    setBusy(true)
    setError('')

    if (payment === 'card') {
      // Server creates the order + Stripe Checkout Session and validates prices.
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            customer: form,
            discountCode: discount?.code || null,
            giftCode: gift?.code || null,
            items: cart.map((item) => ({
              id: item.product.id,
              size: item.size,
              color: item.color,
              qty: item.quantity,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'checkout failed')
        track('order_placed')
        if (data.paidByGift && data.orderNumber != null) {
          // Fully covered by the gift card — no card payment needed.
          setBusy(false)
          setOrderNumber(String(data.orderNumber))
          setPaidReturn(true)
          clearCart()
          window.scrollTo({ top: 0 })
          return
        }
        if (!data.url) throw new Error('checkout failed')
        window.location.assign(data.url)
        return
      } catch {
        setBusy(false)
        setError(c.errorGeneric)
        return
      }
    }

    // COD / bank transfer — placed server-side so confirmation e-mails go out.
    try {
      const res = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form,
          discountCode: discount?.code || null,
          giftCode: gift?.code || null,
          items: cart.map((item) => ({
            id: item.product.id,
            size: item.size,
            color: item.color,
            qty: item.quantity,
          })),
        }),
      })
      const data = await res.json()
      setBusy(false)
      if (!res.ok || data.orderNumber == null) throw new Error('order failed')
      track('order_placed')
      setOrderNumber(String(data.orderNumber))
      if (data.paidByGift) setPaidReturn(true)
      clearCart()
      window.scrollTo({ top: 0 })
    } catch {
      setBusy(false)
      setError(c.errorGeneric)
    }
  }

  if (orderNumber) {
    return (
      <section className="section checkout">
        <div className="container checkout__success">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <span className="checkout__success-emoji" aria-hidden="true">💝</span>
            <h1>{c.successTitle}</h1>
            <p>
              {paidReturn
                ? `${fmt(c.successSub, { number: orderNumber }).split('.')[0]}. ${c.successPaid}`
                : fmt(c.successSub, { number: orderNumber })}
            </p>
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
              <label className={`checkout__pay ${payment === 'card' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={payment === 'card'}
                  onChange={() => setPayment('card')}
                />
                <div>
                  <strong>💳 {c.card}</strong>
                  <span>{c.cardNote}</span>
                </div>
              </label>
              <label className={`checkout__pay ${payment === 'cod' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={payment === 'cod'}
                  onChange={() => setPayment('cod')}
                />
                <div>
                  <strong>{c.cod}</strong>
                  <span>{c.codNote}</span>
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

            <div className="checkout__promo">
              <label htmlFor="promo-code">{c.promoTitle}</label>
              <div className="checkout__promo-row">
                <input
                  id="promo-code"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value)
                    setPromoErr('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void applyPromo()
                    }
                  }}
                  placeholder={c.promoPlaceholder}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <button
                  type="button"
                  className="btn btn--soft"
                  disabled={promoBusy || !promoInput.trim()}
                  onClick={() => void applyPromo()}
                >
                  {promoBusy ? '…' : c.promoApply}
                </button>
              </div>
              {promoErr && <p className="checkout__promo-err">{promoErr}</p>}
              {discount && (
                <div className="checkout__promo-chip">
                  <span>
                    🏷️ {c.promoDiscount} <strong>{discount.code}</strong>
                  </span>
                  <button type="button" aria-label={c.promoRemove} onClick={() => setDiscount(null)}>
                    ×
                  </button>
                </div>
              )}
              {gift && (
                <div className="checkout__promo-chip">
                  <span>
                    🎁 {c.promoGift} <strong>{gift.code}</strong>
                  </span>
                  <button type="button" aria-label={c.promoRemove} onClick={() => setGift(null)}>
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="checkout__totals">
              <div>
                <span>{dict.ui.cart.subtotal}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount && (
                <div className="checkout__promo-line">
                  <span>{c.promoDiscount} ({discount.code})</span>
                  <span>−{formatPrice(discountAmt)}</span>
                </div>
              )}
              <div>
                <span>{dict.ui.cart.shipping}</span>
                <span>{shippingFree ? dict.ui.cart.shippingFree : formatPrice(shipping)}</span>
              </div>
              {gift && (
                <div className="checkout__promo-line">
                  <span>{c.promoGift} ({gift.code})</span>
                  <span>−{formatPrice(giftAmt)}</span>
                </div>
              )}
              <div className="checkout__total">
                <span>{dict.ui.cart.total}</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>

            {error && <p className="checkout__error">{error}</p>}

            <button className="btn btn--primary btn--lg btn--full" disabled={busy}>
              {busy ? c.placing : payment === 'card' ? c.payNow : c.placeOrder} <ArrowIcon />
            </button>
            <p className="cart__note">{dict.ui.cart.note}</p>
          </aside>
        </form>
      </div>
    </section>
  )
}

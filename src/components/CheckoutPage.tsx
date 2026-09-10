import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { useProducts } from '../data/productsStore'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import { fadeUp } from '../lib/motion'
import {
  CARRIER_MAP_URLS,
  fetchShippingMethods,
  methodName,
  pickPacketaPoint,
  shippingPriceCzk,
  type ShippingMethod,
} from '../lib/shipping'
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

  // Delivery methods (managed in the admin panel).
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [methodCode, setMethodCode] = useState('')
  const [point, setPoint] = useState<{ id: string; name: string } | null>(null)
  const [pointError, setPointError] = useState('')

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

  // Load delivery methods once; preselect the cheapest/first one.
  useEffect(() => {
    let alive = true
    void fetchShippingMethods().then((ms) => {
      if (!alive) return
      setMethods(ms)
      if (ms.length > 0) setMethodCode((cur) => cur || ms[0].code)
    })
    return () => {
      alive = false
    }
  }, [])

  // A basket of vouchers only is delivered by e-mail: no carrier, no postage,
  // and card payment only (a code must never leave before it is paid for).
  const giftOnly = cart.length > 0 && cart.every((i) => i.product.isGiftCard === true)
  const hasGift = cart.some((i) => i.product.isGiftCard === true)

  const method = giftOnly ? null : methods.find((m) => m.code === methodCode) ?? null
  const needsPoint = !giftOnly && method?.kind === 'pickup'

  const discountAmt = discount ? discount.czk / CZK : 0
  const giftAmt = gift ? gift.czk / CZK : 0
  const subtotalAfterDiscountCzk = (subtotal - discountAmt) * CZK

  // Shipping comes from the selected method; falls back to global settings
  // while the methods are still loading (or if none are configured).
  const shippingCzk = giftOnly
    ? 0
    : method
      ? shippingPriceCzk(method, subtotalAfterDiscountCzk)
      : subtotalAfterDiscountCzk >= settings.free_over_czk
        ? 0
        : settings.shipping_czk
  const shipping = shippingCzk / CZK
  const shippingFree = shippingCzk === 0
  const total = Math.max(0, subtotal - discountAmt + shipping - giftAmt)

  // Cash on delivery may be disabled for a specific method — and is never
  // possible when the basket contains a gift voucher.
  useEffect(() => {
    if (payment !== 'cod') return
    if (hasGift || (method && !method.cod_allowed)) setPayment('card')
  }, [method, payment, hasGift])

  const choosePoint = async () => {
    if (!method) return
    setPointError('')
    const key = settings.packeta_api_key
    if (method.carrier === 'zasilkovna' && key) {
      const chosen = await pickPacketaPoint(key)
      if (chosen) setPoint(chosen)
      return
    }
    // No embeddable widget for this carrier → open the public map; the
    // customer types the branch name, which we store with the order.
    const url = CARRIER_MAP_URLS[method.carrier ?? ''] ?? CARRIER_MAP_URLS.zasilkovna
    window.open(url, '_blank', 'noopener,noreferrer')
  }

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
    // Pickup methods require a selected branch.
    if (needsPoint && !point?.name) {
      setPointError(c.pointRequired)
      document.getElementById('shipping-methods')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    setError('')
    const shippingPayload = {
      shippingMethod: method?.code ?? null,
      pickupPointId: point?.id ?? null,
      pickupPointName: point?.name ?? null,
    }

    if (payment === 'card') {
      // Server creates the order + Stripe Checkout Session and validates prices.
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            customer: form,
            ...shippingPayload,
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
        if (!res.ok) {
          if (data.error === 'amount_too_small') {
            setBusy(false)
            setError(c.errorMinimum)
            return
          }
          throw new Error(data.error || 'checkout failed')
        }
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
          ...shippingPayload,
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

            {giftOnly ? (
              <div className="checkout__panel">
                <h2>{c.shippingTitle}</h2>
                <p className="checkout__gift-note">
                  🎁 {dict.ui.gift.noShipping} {dict.ui.gift.emailNote}
                </p>
              </div>
            ) : methods.length > 0 && (
              <div className="checkout__panel" id="shipping-methods">
                <h2>{c.shippingTitle}</h2>
                {methods.map((m) => {
                  const priceCzk = shippingPriceCzk(m, subtotalAfterDiscountCzk)
                  return (
                    <label
                      className={`checkout__pay ${methodCode === m.code ? 'is-active' : ''}`}
                      key={m.code}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={methodCode === m.code}
                        onChange={() => {
                          setMethodCode(m.code)
                          setPoint(null)
                          setPointError('')
                        }}
                      />
                      <div>
                        <strong>
                          {methodName(m, locale)}
                          <span className="checkout__ship-price">
                            {priceCzk === 0 ? c.free : formatPrice(priceCzk / CZK)}
                          </span>
                        </strong>
                        {m.note_cs && <span>{m.note_cs}</span>}
                      </div>
                    </label>
                  )
                })}

                {needsPoint && (
                  <div className="checkout__point">
                    {point ? (
                      <div className="checkout__point-chosen">
                        <span>
                          📍 <strong>{point.name}</strong>
                          <small>{c.pointChosen}</small>
                        </span>
                        <button type="button" className="btn btn--soft" onClick={() => void choosePoint()}>
                          {c.changePoint}
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="btn btn--soft" onClick={() => void choosePoint()}>
                        {method?.carrier === 'zasilkovna' && settings.packeta_api_key
                          ? c.pickPoint
                          : c.openMap}
                      </button>
                    )}
                    {/* Fallback / manual entry — also lets customers correct the name. */}
                    {(!settings.packeta_api_key || method?.carrier !== 'zasilkovna') && (
                      <label className="checkout__point-manual">
                        {c.pointManual} *
                        <input
                          value={point?.name ?? ''}
                          onChange={(e) => {
                            setPoint(e.target.value ? { id: '', name: e.target.value } : null)
                            setPointError('')
                          }}
                          placeholder="např. Brno, Hviezdoslavova — Z-BOX"
                        />
                      </label>
                    )}
                    {pointError && <p className="checkout__promo-err">{pointError}</p>}
                  </div>
                )}
              </div>
            )}

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
              <label
                className={`checkout__pay ${payment === 'cod' ? 'is-active' : ''} ${
                  hasGift || (method && !method.cod_allowed) ? 'is-disabled' : ''
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  disabled={hasGift || Boolean(method && !method.cod_allowed)}
                  checked={payment === 'cod'}
                  onChange={() => setPayment('cod')}
                />
                <div>
                  <strong>{c.cod}</strong>
                  <span>{hasGift ? dict.ui.gift.cardOnly : c.codNote}</span>
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
                    {[item.color && colorName(item.color), item.size, `${item.quantity}×`]
                      .filter(Boolean)
                      .join(' · ')}
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
                <span>
                  {dict.ui.cart.shipping}
                  {method ? ` · ${methodName(method, locale)}` : ''}
                </span>
                <span>{shippingFree ? dict.ui.cart.shippingFree : formatPrice(shipping)}</span>
              </div>
              {point?.name && (
                <div className="checkout__ship-point">
                  <span>📍 {point.name}</span>
                  <span />
                </div>
              )}
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

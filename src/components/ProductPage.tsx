import { motion } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { celebrate } from '../lib/confetti'
import { useProducts } from '../data/productsStore'
import { track } from '../lib/analytics'
import { applyProductSeo } from '../lib/seo'
import { fadeUp, reveal, stagger } from '../lib/motion'
import { fetchApprovedReviews, type ReviewRow } from '../lib/reviews'
import { colorQty, tracksVariants, variantQty } from '../lib/stock'
import { defaultGiftMode, giftModes, type GiftDelivery } from '../lib/gift'
import { ProductCard } from './ProductCard'
import {
  HeartIcon,
  MinusIcon,
  PlusIcon,
  CartPlusIcon,
  LeafIcon,
  TruckIcon,
  ReturnIcon,
  ArrowIcon,
} from './icons'

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted, openCart } = useStore()
  const {
    dict,
    locale,
    fmt,
    formatPrice,
    productName,
    productDescription,
    productMaterial,
    categoryName,
    colorName,
  } = useI18n()

  const { byId, similar: getSimilar } = useProducts()
  const product = id ? byId(id) : undefined

  const [size, setSize] = useState<string | null>(null)
  const [color, setColor] = useState(0)
  const [qty, setQty] = useState(1)
  const [activeThumb, setActiveThumb] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    setSize(null)
    setColor(0)
    setQty(1)
    setActiveThumb(0)
    if (id) track('product_view', { productId: id })
  }, [id])

  useEffect(() => {
    if (!product) return
    applyProductSeo(
      locale,
      product,
      productName(product.id, product.name),
      productDescription(product.id, product.description),
    )
  }, [product, locale, productName, productDescription])

  if (!product) {
    return (
      <section className="section product-page">
        <div className="container product-page__missing">
          <span aria-hidden="true">🧺</span>
          <h1>{dict.ui.product.notFoundTitle}</h1>
          <p>{dict.ui.product.notFoundSub}</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            {dict.ui.product.backHome}
          </button>
        </div>
      </section>
    )
  }

  const p = dict.ui.product
  const similar = getSimilar(product)
  const wished = isWishlisted(product.id)
  const name = productName(product.id, product.name)
  const photos =
    product.colors[color]?.images ?? product.colors.find((c) => c.images)?.images
  const thumbs = photos ?? [product.emoji, '🧵', '📏', '🎁']
  const thumbIndex = Math.min(activeThumb, thumbs.length - 1)

  const isGift = product.isGiftCard === true
  const g = dict.ui.gift

  /* ---- stock per size + colour -------------------------------------- */
  const byVariant = !isGift && tracksVariants(product)
  const activeColor = isGift ? '' : (product.colors[color]?.name ?? '')
  // Switching colour can invalidate the chosen size, so the effective size is
  // derived: keep the customer's pick while it is in stock, otherwise fall
  // back to the first size still available in this colour.
  const sizeInStock = (s: string) => !byVariant || (variantQty(product, s, activeColor) ?? 0) > 0
  const giftOptions = isGift ? giftModes(product) : []
  const giftMode: GiftDelivery =
    isGift && size && (giftOptions as string[]).includes(size)
      ? (size as GiftDelivery)
      : defaultGiftMode(product)
  const chosenSize = isGift
    ? giftMode
    : size && sizeInStock(size)
      ? size
      : (product.sizes.find(sizeInStock) ?? product.sizes[0] ?? '')
  /** Pieces left for the exact combination the customer is looking at. */
  const pickedQty = byVariant ? (variantQty(product, chosenSize, activeColor) ?? 0) : null
  const sizeUnavailable = (s: string) =>
    byVariant && (variantQty(product, s, activeColor) ?? 0) <= 0
  const colorUnavailable = (c: string) =>
    byVariant && (colorQty(product, c, product.sizes) ?? 0) <= 0

  const soldOut = product.inStock === false || (byVariant && (product.stockQty ?? 0) <= 0)
  const pickUnavailable = !soldOut && byVariant && (pickedQty ?? 0) <= 0

  const handleAdd = (e: MouseEvent) => {
    if (soldOut || pickUnavailable) return
    const max = pickedQty ?? Infinity
    addToCart(product, chosenSize, activeColor, Math.min(qty, max))
    celebrate({ x: e.clientX, y: e.clientY })
    openCart()
  }

  return (
    <section className="section product-page">
      <div className="container">
        <button className="product-page__back" onClick={() => navigate('/')}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
            <ArrowIcon />
          </span>
          {p.back}
        </button>

        <motion.div className="product-page__panel" initial="hidden" animate="show" variants={fadeUp}>
          <div className="pdp__top">
            <div className="pdp__gallery">
              <div className="pdp__hero" style={{ background: product.gradient }}>
                {product.badge && (
                  <span className="discount-badge">{product.badge}</span>
                )}
                {photos ? (
                  <motion.img
                    key={`${color}-${thumbIndex}`}
                    className="pdp__hero-photo"
                    src={photos[thumbIndex]}
                    alt={name}
                    initial={{ scale: 1.02, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  />
                ) : (
                  <motion.span
                    key={thumbIndex}
                    className="pdp__hero-emoji"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    aria-hidden="true"
                  >
                    {thumbs[thumbIndex]}
                  </motion.span>
                )}
              </div>
              <div className="pdp__thumbs">
                {thumbs.map((t, i) => (
                  <button
                    key={i}
                    className={`pdp__thumb ${i === thumbIndex ? 'is-active' : ''}`}
                    style={{ background: product.gradient }}
                    onClick={() => setActiveThumb(i)}
                    aria-label={`${name} ${i + 1}`}
                  >
                    {photos ? (
                      <img src={t} alt="" loading="lazy" />
                    ) : (
                      <span aria-hidden="true">{t}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp__info">
              <span className="eyebrow">{categoryName(product.category)}</span>
              <h1 className="pdp__name">{name}</h1>
              <div className="pdp__rating">
                <span className="stars" aria-hidden="true">
                  {'★'.repeat(Math.round(product.rating))}
                </span>
                <span>{product.rating} · {product.reviews} {p.reviews}</span>
              </div>

              <div className="pdp__price">
                <span className="price price--lg">{formatPrice(product.price)}</span>
                {product.oldPrice && (
                  <>
                    <span className="price-old price-old--lg">{formatPrice(product.oldPrice)}</span>
                    <span className="pdp__save">
                      {fmt(p.save, { amount: formatPrice(product.oldPrice - product.price) })}
                    </span>
                  </>
                )}
              </div>

              {isGift ? (
                <p className="pdp__stock">🎁 {g.vat}</p>
              ) : (() => {
                // With a size × colour matrix the number shown follows the
                // exact combination the customer has selected.
                const shown = byVariant ? pickedQty : product.stockQty
                const out = soldOut || pickUnavailable
                return (
                  <p
                    className={`pdp__stock ${
                      out
                        ? 'pdp__stock--out'
                        : shown != null && shown <= 5
                          ? 'pdp__stock--low'
                          : ''
                    }`}
                  >
                    {out
                      ? `✕ ${p.stockOut}`
                      : shown != null
                        ? shown <= 5
                          ? `⚠ ${fmt(p.stockLow, { n: String(shown) })}`
                          : `✓ ${fmt(p.stockCount, { n: String(shown) })}`
                        : `✓ ${p.stockAvailable}`}
                  </p>
                )
              })()}

              <p className="pdp__desc">{productDescription(product.id, product.description)}</p>

              {isGift && (
                <div className="pdp__gift">
                  <strong>🎁 {g.badge}</strong>
                  <p>{g.how}</p>
                  {giftOptions.length > 1 ? (
                    <div className="pdp__gift-modes">
                      <span className="pdp__option-label">{g.deliveryLabel}</span>
                      {giftOptions.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`pdp__gift-mode ${giftMode === m ? 'is-active' : ''}`}
                          onClick={() => setSize(m)}
                        >
                          <strong>{m === 'online' ? g.byEmail : g.byPost}</strong>
                          <span>{m === 'online' ? g.byEmailNote : g.byPostNote}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="pdp__gift-single">
                      {giftOptions[0] === 'physical' ? g.byPostNote : g.byEmailNote}
                    </p>
                  )}
                  <ul>
                    {giftMode === 'online' && <li>{g.noShipping}</li>}
                    <li>{g.emailNote}</li>
                    <li>{g.cardOnly}</li>
                  </ul>
                </div>
              )}

              {!isGift && (
              <div className="pdp__option">
                <span className="pdp__option-label">
                  {p.colour} — <strong>{colorName(product.colors[color].name)}</strong>
                </span>
                <div className="card__dots">
                  {product.colors.map((col, i) => {
                    const gone = colorUnavailable(col.name)
                    return (
                      <button
                        key={col.name}
                        className={`color-dot color-dot--lg ${i === color ? 'is-active' : ''} ${
                          gone ? 'is-sold-out' : ''
                        }`}
                        style={{ background: col.hex }}
                        disabled={gone}
                        onClick={() => {
                          setColor(i)
                          setActiveThumb(0)
                        }}
                        aria-label={`${colorName(col.name)}${gone ? ` — ${p.stockOut}` : ''}`}
                        title={gone ? p.stockOut : colorName(col.name)}
                      />
                    )
                  })}
                </div>
              </div>
              )}

              {!isGift && (
              <div className="pdp__option">
                <span className="pdp__option-label">{p.size}</span>
                <div className="pdp__sizes">
                  {product.sizes.map((s) => {
                    const gone = sizeUnavailable(s)
                    return (
                      <button
                        key={s}
                        className={`size-chip size-chip--lg ${chosenSize === s ? 'is-active' : ''} ${
                          gone ? 'is-sold-out' : ''
                        }`}
                        disabled={gone}
                        title={gone ? p.stockOut : undefined}
                        onClick={() => setSize(s)}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
              )}

              <div className="pdp__buy">
                <div className="qty qty--lg">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={dict.ui.cart.decrease}>
                    <MinusIcon />
                  </button>
                  <span>{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(pickedQty ?? 99, q + 1))}
                    disabled={pickedQty != null && qty >= pickedQty}
                    aria-label={dict.ui.cart.increase}
                  >
                    <PlusIcon />
                  </button>
                </div>
                <button
                  className="btn btn--primary btn--lg pdp__add"
                  onClick={handleAdd}
                  disabled={soldOut || pickUnavailable}
                  style={soldOut || pickUnavailable ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  <CartPlusIcon />{' '}
                  {soldOut || pickUnavailable ? dict.ui.card.outOfStock : p.addToCart}
                </button>
                <button
                  className={`icon-btn pdp__wish ${wished ? 'is-active' : ''}`}
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={wished ? dict.ui.card.wishRemove : dict.ui.card.wishAdd}
                  aria-pressed={wished}
                >
                  <HeartIcon filled={wished} />
                </button>
              </div>

              <div className="pdp__assure">
                {isGift ? (
                  <>
                    <div><LeafIcon size={20} /><span>{g.vat}</span></div>
                    <div><TruckIcon size={20} /><span>{g.noShipping}</span></div>
                    <div><ReturnIcon size={20} /><span>{g.emailNote}</span></div>
                  </>
                ) : (
                  <>
                    <div><LeafIcon size={20} /><span>{productMaterial(product.id, product.material)}</span></div>
                    <div><TruckIcon size={20} /><span>{p.deliveryInfo}</span></div>
                    <div><ReturnIcon size={20} /><span>{p.returnsInfo}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <ProductReviews productId={product.id} />

        <div className="product-page__similar">
          <h2 className="section-title">{p.similar}</h2>
          <motion.div className="product-grid" variants={stagger} {...reveal}>
            {similar.map((s) => (
              <ProductCard key={s.id} product={s} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** Approved customer reviews for one product (hidden while empty). */
function ProductReviews({ productId }: { productId: string }) {
  const { dict } = useI18n()
  const [reviews, setReviews] = useState<ReviewRow[]>([])

  useEffect(() => {
    let alive = true
    void fetchApprovedReviews(productId, 20).then((r) => {
      if (alive) setReviews(r)
    })
    return () => {
      alive = false
    }
  }, [productId])

  if (reviews.length === 0) return null

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <div className="product-reviews">
      <h2 className="section-title">
        {dict.ui.review.productHeading}{' '}
        <span className="product-reviews__avg">
          ★ {avg.toFixed(1)} · {reviews.length}
        </span>
      </h2>
      <div className="product-reviews__list">
        {reviews.map((r) => (
          <figure className="review" key={r.id}>
            <span className="stars" aria-hidden="true">{'★'.repeat(r.rating)}</span>
            <blockquote>“{r.text}”</blockquote>
            <figcaption>
              <span>
                <strong>{r.author}</strong>
                <small>
                  ✓ {dict.ui.review.verified} ·{' '}
                  {new Date(r.created_at).toLocaleDateString('cs-CZ')}
                </small>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

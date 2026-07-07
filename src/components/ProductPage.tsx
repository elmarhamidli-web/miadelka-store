import { motion } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { celebrate } from '../lib/confetti'
import { getProductById, getSimilarProducts } from '../data/products'
import { fadeUp, reveal, stagger } from '../lib/motion'
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
    fmt,
    formatPrice,
    productName,
    productDescription,
    productMaterial,
    categoryName,
    colorName,
  } = useI18n()

  const product = id ? getProductById(id) : undefined

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
  }, [id])

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
  const similar = getSimilarProducts(product)
  const wished = isWishlisted(product.id)
  const name = productName(product.id, product.name)
  const photos =
    product.colors[color]?.images ?? product.colors.find((c) => c.images)?.images
  const thumbs = photos ?? [product.emoji, '🧵', '📏', '🎁']
  const thumbIndex = Math.min(activeThumb, thumbs.length - 1)

  const handleAdd = (e: MouseEvent) => {
    addToCart(product, size ?? product.sizes[0], product.colors[color].name, qty)
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

              <p className="pdp__desc">{productDescription(product.id, product.description)}</p>

              <div className="pdp__option">
                <span className="pdp__option-label">
                  {p.colour} — <strong>{colorName(product.colors[color].name)}</strong>
                </span>
                <div className="card__dots">
                  {product.colors.map((col, i) => (
                    <button
                      key={col.name}
                      className={`color-dot color-dot--lg ${i === color ? 'is-active' : ''}`}
                      style={{ background: col.hex }}
                      onClick={() => {
                        setColor(i)
                        setActiveThumb(0)
                      }}
                      aria-label={colorName(col.name)}
                    />
                  ))}
                </div>
              </div>

              <div className="pdp__option">
                <span className="pdp__option-label">{p.size}</span>
                <div className="pdp__sizes">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      className={`size-chip size-chip--lg ${size === s ? 'is-active' : ''}`}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pdp__buy">
                <div className="qty qty--lg">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={dict.ui.cart.decrease}>
                    <MinusIcon />
                  </button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} aria-label={dict.ui.cart.increase}>
                    <PlusIcon />
                  </button>
                </div>
                <button className="btn btn--primary btn--lg pdp__add" onClick={handleAdd}>
                  <CartPlusIcon /> {p.addToCart}
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
                <div><LeafIcon size={20} /><span>{productMaterial(product.id, product.material)}</span></div>
                <div><TruckIcon size={20} /><span>{p.deliveryInfo}</span></div>
                <div><ReturnIcon size={20} /><span>{p.returnsInfo}</span></div>
              </div>
            </div>
          </div>
        </motion.div>

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

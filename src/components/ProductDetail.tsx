import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import type { Product } from '../types'
import { useStore } from '../context/StoreContext'
import { celebrate } from '../lib/confetti'
import { getSimilarProducts } from '../data/products'
import { categoryName } from '../data/categories'
import {
  CloseIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  CartPlusIcon,
  LeafIcon,
  TruckIcon,
  ReturnIcon,
} from './icons'

interface Props {
  product: Product | null
  onClose: () => void
  onOpen: (product: Product) => void
}

export function ProductDetail({ product, onClose, onOpen }: Props) {
  const { addToCart, toggleWishlist, isWishlisted, openCart } = useStore()
  const [size, setSize] = useState<string | null>(null)
  const [color, setColor] = useState(0)
  const [qty, setQty] = useState(1)
  const [activeThumb, setActiveThumb] = useState(0)

  useEffect(() => {
    if (product) {
      setSize(null)
      setColor(0)
      setQty(1)
      setActiveThumb(0)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [product])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!product) return null

  const similar = getSimilarProducts(product)
  const wished = isWishlisted(product.id)
  const thumbs = [product.emoji, '🧵', '📏', '🎁']

  const handleAdd = (e: MouseEvent) => {
    addToCart(product, size ?? product.sizes[0], product.colors[color].name, qty)
    celebrate({ x: e.clientX, y: e.clientY })
    onClose()
    openCart()
  }

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            className="overlay overlay--dark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="pdp"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
          >
            <button className="icon-btn pdp__close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>

            <div className="pdp__scroll">
              <div className="pdp__top">
                <div className="pdp__gallery">
                  <div
                    className="pdp__hero"
                    style={{ background: product.gradient }}
                  >
                    {product.badge && (
                      <span className="discount-badge">{product.badge}</span>
                    )}
                    <motion.span
                      key={activeThumb}
                      className="pdp__hero-emoji"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      aria-hidden="true"
                    >
                      {thumbs[activeThumb]}
                    </motion.span>
                  </div>
                  <div className="pdp__thumbs">
                    {thumbs.map((t, i) => (
                      <button
                        key={i}
                        className={`pdp__thumb ${i === activeThumb ? 'is-active' : ''}`}
                        style={{ background: product.gradient }}
                        onClick={() => setActiveThumb(i)}
                        aria-label={`View image ${i + 1}`}
                      >
                        <span aria-hidden="true">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pdp__info">
                  <span className="eyebrow">{categoryName(product.category)}</span>
                  <h2 className="pdp__name">{product.name}</h2>
                  <div className="pdp__rating">
                    <span className="stars" aria-hidden="true">
                      {'★'.repeat(Math.round(product.rating))}
                    </span>
                    <span>{product.rating} · {product.reviews} reviews</span>
                  </div>

                  <div className="pdp__price">
                    <span className="price price--lg">${product.price}</span>
                    {product.oldPrice && (
                      <>
                        <span className="price-old price-old--lg">${product.oldPrice}</span>
                        <span className="pdp__save">
                          Save ${product.oldPrice - product.price}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="pdp__desc">{product.description}</p>

                  <div className="pdp__option">
                    <span className="pdp__option-label">
                      Colour — <strong>{product.colors[color].name}</strong>
                    </span>
                    <div className="card__dots">
                      {product.colors.map((c, i) => (
                        <button
                          key={c.name}
                          className={`color-dot color-dot--lg ${i === color ? 'is-active' : ''}`}
                          style={{ background: c.hex }}
                          onClick={() => setColor(i)}
                          aria-label={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pdp__option">
                    <span className="pdp__option-label">Size</span>
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
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                        <MinusIcon />
                      </button>
                      <span>{qty}</span>
                      <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">
                        <PlusIcon />
                      </button>
                    </div>
                    <button className="btn btn--primary btn--lg pdp__add" onClick={handleAdd}>
                      <CartPlusIcon /> Add to cart
                    </button>
                    <button
                      className={`icon-btn pdp__wish ${wished ? 'is-active' : ''}`}
                      onClick={() => toggleWishlist(product.id)}
                      aria-label="Toggle wishlist"
                      aria-pressed={wished}
                    >
                      <HeartIcon filled={wished} />
                    </button>
                  </div>

                  <div className="pdp__assure">
                    <div><LeafIcon size={20} /><span>{product.material}</span></div>
                    <div><TruckIcon size={20} /><span>Free delivery over $60 · ships in 2–4 days</span></div>
                    <div><ReturnIcon size={20} /><span>Easy 30-day returns & exchanges</span></div>
                  </div>
                </div>
              </div>

              <div className="pdp__similar">
                <h3>You may also like</h3>
                <div className="pdp__similar-grid">
                  {similar.map((s) => (
                    <button
                      key={s.id}
                      className="mini-card"
                      onClick={() => { onOpen(s); setActiveThumb(0) }}
                    >
                      <span className="mini-card__media" style={{ background: s.gradient }}>
                        <span aria-hidden="true">{s.emoji}</span>
                      </span>
                      <strong>{s.name}</strong>
                      <span className="price">${s.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

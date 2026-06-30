import { motion } from 'framer-motion'
import { useState, type MouseEvent } from 'react'
import type { Product } from '../types'
import { useStore } from '../context/StoreContext'
import { celebrate } from '../lib/confetti'
import { popIn } from '../lib/motion'
import { HeartIcon, CartPlusIcon } from './icons'

interface Props {
  product: Product
  onOpen: (product: Product) => void
}

export function ProductCard({ product, onOpen }: Props) {
  const { addToCart, toggleWishlist, isWishlisted, openCart } = useStore()
  const [activeColor, setActiveColor] = useState(0)
  const [activeSize, setActiveSize] = useState<string | null>(null)
  const wished = isWishlisted(product.id)

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation()
    const size = activeSize ?? product.sizes[0]
    addToCart(product, size, product.colors[activeColor].name, 1)
    celebrate({ x: e.clientX, y: e.clientY })
    openCart()
  }

  const handleWishlist = (e: MouseEvent) => {
    e.stopPropagation()
    toggleWishlist(product.id)
  }

  const badgeClass = product.badge?.toLowerCase().includes('new')
    ? 'discount-badge--new'
    : product.badge && !product.badge.includes('%')
      ? 'discount-badge--label'
      : ''

  return (
    <motion.article
      className="card"
      variants={popIn}
      whileHover={{ y: -10 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(product)}
      aria-label={`View ${product.name}`}
    >
      {product.badge && (
        <span className={`discount-badge ${badgeClass}`}>{product.badge}</span>
      )}

      <button
        className={`card__wish ${wished ? 'is-active' : ''}`}
        onClick={handleWishlist}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wished}
      >
        <HeartIcon filled={wished} />
      </button>

      <div className="card__media" style={{ background: product.gradient }}>
        <span className="card__emoji" aria-hidden="true">
          {product.emoji}
        </span>
        <div className="card__shine" />
        <button className="card__quick" onClick={(e) => { e.stopPropagation(); onOpen(product) }}>
          View product
        </button>
      </div>

      <div className="card__body">
        <div className="card__meta">
          <span className="stars" aria-hidden="true">
            {'★'.repeat(Math.round(product.rating))}
          </span>
          <span className="card__reviews">{product.rating} · {product.reviews}</span>
        </div>

        <h3 className="card__name">{product.name}</h3>

        <div className="card__dots" aria-label="Available colours">
          {product.colors.map((c, i) => (
            <button
              key={c.name}
              className={`color-dot ${i === activeColor ? 'is-active' : ''}`}
              style={{ background: c.hex }}
              title={c.name}
              aria-label={c.name}
              onClick={(e) => {
                e.stopPropagation()
                setActiveColor(i)
              }}
            />
          ))}
        </div>

        <div className="card__sizes">
          {product.sizes.slice(0, 4).map((s) => (
            <button
              key={s}
              className={`size-chip ${activeSize === s ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setActiveSize(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="card__foot">
          <div className="card__price">
            <span className="price">${product.price}</span>
            {product.oldPrice && <span className="price-old">${product.oldPrice}</span>}
          </div>
          <button className="card__add" onClick={handleAdd} aria-label={`Add ${product.name} to cart`}>
            <CartPlusIcon />
          </button>
        </div>
      </div>
    </motion.article>
  )
}

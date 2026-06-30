import { motion } from 'framer-motion'
import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { celebrate } from '../lib/confetti'
import { popIn } from '../lib/motion'
import { HeartIcon, CartPlusIcon } from './icons'

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted, openCart } = useStore()
  const { dict, fmt, formatPrice, productName, colorName, badge } = useI18n()
  const [activeColor, setActiveColor] = useState(0)
  const [activeSize, setActiveSize] = useState<string | null>(null)
  const wished = isWishlisted(product.id)
  const name = productName(product.id, product.name)

  const open = () => navigate(`/product/${product.id}`)

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
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      aria-label={name}
    >
      {product.badge && (
        <span className={`discount-badge ${badgeClass}`}>{badge(product.badge)}</span>
      )}

      <button
        className={`card__wish ${wished ? 'is-active' : ''}`}
        onClick={handleWishlist}
        aria-label={wished ? dict.ui.card.wishRemove : dict.ui.card.wishAdd}
        aria-pressed={wished}
      >
        <HeartIcon filled={wished} />
      </button>

      <div className="card__media" style={{ background: product.gradient }}>
        <span className="card__emoji" aria-hidden="true">
          {product.emoji}
        </span>
        <div className="card__shine" />
        <button className="card__quick" onClick={(e) => { e.stopPropagation(); open() }}>
          {dict.ui.card.view}
        </button>
      </div>

      <div className="card__body">
        <div className="card__meta">
          <span className="stars" aria-hidden="true">
            {'★'.repeat(Math.round(product.rating))}
          </span>
          <span className="card__reviews">{product.rating} · {product.reviews}</span>
        </div>

        <h3 className="card__name">{name}</h3>

        <div className="card__dots" aria-label={dict.ui.shop.colour}>
          {product.colors.map((c, i) => (
            <button
              key={c.name}
              className={`color-dot ${i === activeColor ? 'is-active' : ''}`}
              style={{ background: c.hex }}
              title={colorName(c.name)}
              aria-label={colorName(c.name)}
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
            <span className="price">{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="price-old">{formatPrice(product.oldPrice)}</span>}
          </div>
          <button
            className="card__add"
            onClick={handleAdd}
            aria-label={fmt(dict.ui.card.addAria, { name })}
          >
            <CartPlusIcon />
          </button>
        </div>
      </div>
    </motion.article>
  )
}

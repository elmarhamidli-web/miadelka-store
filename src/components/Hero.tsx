import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowIcon } from './icons'
import { useI18n } from '../i18n'
import { useStore } from '../context/StoreContext'
import { fadeUp, stagger } from '../lib/motion'
import { useProducts } from '../data/productsStore'

interface Props {
  onShop: () => void
  onExplore: () => void
}

/** Small, static "10 % off for subscribing" strip sitting under the hero card. */
function HeroSubscribe() {
  const { dict } = useI18n()
  const { pushToast } = useStore()
  const n = dict.ui.newsletter
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error('subscribe failed')
      setDone(true)
      pushToast(n.toast, '🎉')
      setEmail('')
      window.setTimeout(() => setDone(false), 3000)
    } catch {
      pushToast('Něco se nepovedlo — zkuste to prosím znovu.', '😔')
    }
    setBusy(false)
  }

  return (
    <div className="hero__offer">
      <div className="hero__offer-text">
        <strong>🎁 {n.heroTitle}</strong>
        <span>{n.heroSub}</span>
      </div>
      <form className="hero__offer-form" onSubmit={submit}>
        <input
          type="email"
          required
          placeholder={n.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={n.placeholder}
        />
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? '…' : done ? n.done : n.cta}
        </button>
      </form>
    </div>
  )
}

const floaters = [
  { emoji: '🧸', x: '44%', y: '6%', delay: 0, size: 54 },
  { emoji: '🌈', x: '84%', y: '12%', delay: 0.4, size: 48 },
  { emoji: '⭐', x: '90%', y: '64%', delay: 0.8, size: 38 },
  { emoji: '🎈', x: '2%', y: '78%', delay: 0.2, size: 44 },
  { emoji: '☁️', x: '70%', y: '4%', delay: 0.6, size: 40 },
]

export function Hero({ onShop, onExplore }: Props) {
  const { dict, formatPrice, productName } = useI18n()
  const navigate = useNavigate()
  const h = dict.ui.hero
  const { byId, bestSellers, products, settings } = useProducts()
  // The shop owner picks this product in the admin (Nastavení → Hlavní stránka).
  // Falls back to the first bestseller, then to any product.
  const heroMain =
    (settings.hero_product_id ? byId(settings.hero_product_id) : undefined) ??
    bestSellers[0] ??
    products[0]

  return (
    <section className="hero" id="top">
      <div className="hero__blob hero__blob--1" />
      <div className="hero__blob hero__blob--2" />
      <div className="hero__blob hero__blob--3" />

      {floaters.map((f, i) => (
        <motion.span
          key={i}
          className="hero__floater"
          style={{ left: f.x, top: f.y, fontSize: f.size }}
          aria-hidden="true"
          animate={{ y: [0, -18, 0], rotate: [0, 6, -4, 0] }}
          transition={{
            duration: 5 + i,
            delay: f.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {f.emoji}
        </motion.span>
      ))}

      <div className="container hero__grid">
        <motion.div
          className="hero__copy"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.span className="hero__pill" variants={fadeUp}>
            {h.pill}
          </motion.span>
          <motion.h1 className="hero__title" variants={fadeUp}>
            {h.titleLine1}<br />
            <span className="hero__title-accent">{h.titleAccent}</span>{' '}
            {h.titleLine2}
          </motion.h1>
          <motion.p className="hero__sub" variants={fadeUp}>
            {h.sub}
          </motion.p>
          <motion.div className="hero__cta" variants={fadeUp}>
            <button className="btn btn--primary btn--lg" onClick={onShop}>
              {h.shop} <ArrowIcon />
            </button>
            <button className="btn btn--ghost btn--lg" onClick={onExplore}>
              {h.explore}
            </button>
          </motion.div>
          <motion.div className="hero__stats" variants={fadeUp}>
            <div>
              <strong>{h.stat1}</strong>
              <span>{h.stat1Label}</span>
            </div>
            <div className="hero__stats-divider" />
            <div>
              <strong>{h.stat2}</strong>
              <span>{h.stat2Label}</span>
            </div>
            <div className="hero__stats-divider" />
            <div>
              <strong>{h.stat3}</strong>
              <span>{h.stat3Label}</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__visual"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <div
            className="hero__card hero__card--main"
            onClick={() => heroMain && navigate(`/product/${heroMain.id}`)}
            role={heroMain ? 'link' : undefined}
            tabIndex={heroMain ? 0 : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && heroMain) navigate(`/product/${heroMain.id}`)
            }}
          >
            {heroMain?.colors[0].images ? (
              <img
                className="hero__card-photo"
                src={heroMain.colors[0].images[0]}
                alt={productName(heroMain.id, heroMain.name)}
              />
            ) : (
              <span className="hero__card-emoji">🐰</span>
            )}
            <span className="discount-badge">{h.bestsellerTag}</span>
            <div className="hero__card-info">
              <strong>{heroMain ? productName(heroMain.id, heroMain.name) : ''}</strong>
              <span>{heroMain ? formatPrice(heroMain.price) : ''}</span>
            </div>
          </div>

          {/* Compact subscribe offer, anchored right under the card. */}
          <HeroSubscribe />
        </motion.div>
      </div>
    </section>
  )
}

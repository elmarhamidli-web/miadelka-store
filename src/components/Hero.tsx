import { motion } from 'framer-motion'
import { ArrowIcon } from './icons'
import { useI18n } from '../i18n'
import { fadeUp, stagger } from '../lib/motion'

interface Props {
  onShop: () => void
  onExplore: () => void
}

const floaters = [
  { emoji: '🧸', x: '6%', y: '18%', delay: 0, size: 54 },
  { emoji: '🌈', x: '84%', y: '12%', delay: 0.4, size: 48 },
  { emoji: '⭐', x: '90%', y: '64%', delay: 0.8, size: 38 },
  { emoji: '🎈', x: '3%', y: '70%', delay: 0.2, size: 44 },
  { emoji: '☁️', x: '70%', y: '4%', delay: 0.6, size: 40 },
]

export function Hero({ onShop, onExplore }: Props) {
  const { dict, formatPrice, productName } = useI18n()
  const h = dict.ui.hero

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
          <motion.div
            className="hero__card hero__card--main"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="hero__card-emoji">🌈</span>
            <span className="discount-badge">-30%</span>
            <div className="hero__card-info">
              <strong>{productName('rainbow-hoodie', 'Rainbow Hoodie')}</strong>
              <span>{formatPrice(39)} · {h.bestsellerTag}</span>
            </div>
          </motion.div>

          <motion.div
            className="hero__card hero__card--mini hero__card--tl"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <span>🧦</span>
            <div>
              <strong>{productName('star-stripe-socks', 'Socks')}</strong>
              <span>{formatPrice(12)}</span>
            </div>
          </motion.div>

          <motion.div
            className="hero__card hero__card--mini hero__card--br"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
          >
            <span>👟</span>
            <div>
              <strong>{productName('mini-sneakers', 'Mini Sneakers')}</strong>
              <span>{formatPrice(42)}</span>
            </div>
          </motion.div>

          <motion.div
            className="hero__chip hero__chip--ship"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🚚 {h.shipping}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// Homepage promotion banner — fully managed from the admin panel ("Akce").
// Shows the active banner promotion with a real-time countdown and
// disappears automatically the moment it expires. No promotion → no banner.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowIcon } from './icons'
import { useI18n } from '../i18n'
import { fadeUp, reveal } from '../lib/motion'
import { useProducts } from '../data/productsStore'

interface Props {
  onShop: () => void
}

function remaining(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  return {
    days: Math.floor(s / 86400),
    hrs: Math.floor((s % 86400) / 3600),
    min: Math.floor((s % 3600) / 60),
    sec: s % 60,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function PromoBanner({ onShop }: Props) {
  const { dict } = useI18n()
  const p = dict.ui.promo
  const { bannerPromo } = useProducts()
  const [left, setLeft] = useState(() =>
    bannerPromo ? remaining(bannerPromo.ends_at) : null,
  )

  // Real-time countdown, re-evaluated every second.
  useEffect(() => {
    if (!bannerPromo) return
    setLeft(remaining(bannerPromo.ends_at))
    const t = window.setInterval(() => setLeft(remaining(bannerPromo.ends_at)), 1000)
    return () => window.clearInterval(t)
  }, [bannerPromo])

  // No active promotion, or it just ran out → nothing is rendered.
  if (!bannerPromo || !left) return null

  return (
    <section className="section section--tight">
      <div className="container">
        <motion.div className="promo" {...reveal} variants={fadeUp}>
          <div className="promo__shape promo__shape--1" />
          <div className="promo__shape promo__shape--2" />
          <span className="promo__floater promo__floater--1" aria-hidden="true">🌷</span>
          <span className="promo__floater promo__floater--2" aria-hidden="true">🦋</span>

          <div className="promo__content">
            <span className="promo__tag">{p.tag}</span>
            <h2 className="promo__title">
              {bannerPromo.name}
              <br />— <span>sleva až {Math.round(Number(bannerPromo.percent))} %</span>
            </h2>
            {bannerPromo.subtitle && <p className="promo__sub">{bannerPromo.subtitle}</p>}
            <button className="btn btn--primary btn--lg" onClick={onShop}>
              {bannerPromo.cta || p.cta} <ArrowIcon />
            </button>
          </div>

          <div className="promo__countdown" aria-hidden="true">
            <div className="promo__count"><strong>{pad(left.days)}</strong><span>{p.days}</span></div>
            <div className="promo__count"><strong>{pad(left.hrs)}</strong><span>{p.hrs}</span></div>
            <div className="promo__count"><strong>{pad(left.min)}</strong><span>{p.min}</span></div>
            <div className="promo__count"><strong>{pad(left.sec)}</strong><span>{p.sec}</span></div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

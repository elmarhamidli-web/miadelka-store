import { motion } from 'framer-motion'
import { ArrowIcon } from './icons'
import { useI18n } from '../i18n'
import { fadeUp, reveal } from '../lib/motion'

interface Props {
  onShop: () => void
}

export function PromoBanner({ onShop }: Props) {
  const { dict } = useI18n()
  const p = dict.ui.promo
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
              {p.titleA}<br />— <span>{p.titleHighlight}</span>
            </h2>
            <p className="promo__sub">{p.sub}</p>
            <button className="btn btn--primary btn--lg" onClick={onShop}>
              {p.cta} <ArrowIcon />
            </button>
          </div>

          <div className="promo__countdown" aria-hidden="true">
            <div className="promo__count"><strong>04</strong><span>{p.days}</span></div>
            <div className="promo__count"><strong>12</strong><span>{p.hrs}</span></div>
            <div className="promo__count"><strong>38</strong><span>{p.min}</span></div>
            <div className="promo__count"><strong>20</strong><span>{p.sec}</span></div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

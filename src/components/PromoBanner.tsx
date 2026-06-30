import { motion } from 'framer-motion'
import { ArrowIcon } from './icons'
import { fadeUp, reveal } from '../lib/motion'

interface Props {
  onShop: () => void
}

export function PromoBanner({ onShop }: Props) {
  return (
    <section className="section section--tight">
      <div className="container">
        <motion.div className="promo" {...reveal} variants={fadeUp}>
          <div className="promo__shape promo__shape--1" />
          <div className="promo__shape promo__shape--2" />
          <span className="promo__floater promo__floater--1" aria-hidden="true">🌷</span>
          <span className="promo__floater promo__floater--2" aria-hidden="true">🦋</span>

          <div className="promo__content">
            <span className="promo__tag">Limited time</span>
            <h2 className="promo__title">
              New Spring Collection<br />— up to <span>30% off</span>
            </h2>
            <p className="promo__sub">
              Fresh pastels, breezy cottons and pieces made to twirl in. Bloom into the
              new season with TinyMode Kids.
            </p>
            <button className="btn btn--primary btn--lg" onClick={onShop}>
              Shop the sale <ArrowIcon />
            </button>
          </div>

          <div className="promo__countdown" aria-hidden="true">
            <div className="promo__count"><strong>04</strong><span>days</span></div>
            <div className="promo__count"><strong>12</strong><span>hrs</span></div>
            <div className="promo__count"><strong>38</strong><span>min</span></div>
            <div className="promo__count"><strong>20</strong><span>sec</span></div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

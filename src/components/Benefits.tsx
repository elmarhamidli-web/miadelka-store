import { motion } from 'framer-motion'
import { LeafIcon, TruckIcon, ReturnIcon, ShieldIcon } from './icons'
import { popIn, reveal, stagger } from '../lib/motion'
import type { JSX } from 'react'

interface Benefit {
  icon: JSX.Element
  title: string
  text: string
  tint: string
}

const benefits: Benefit[] = [
  {
    icon: <LeafIcon />,
    title: 'Organic Cotton',
    text: 'GOTS-certified, pesticide-free fibres that are gentle on delicate skin.',
    tint: 'var(--mint)',
  },
  {
    icon: <TruckIcon />,
    title: 'Fast Delivery',
    text: 'Carbon-neutral shipping in 2–4 days, free on orders over $60.',
    tint: 'var(--sky)',
  },
  {
    icon: <ReturnIcon />,
    title: 'Easy Returns',
    text: 'Changed your mind? Enjoy a relaxed, no-questions 30-day return window.',
    tint: 'var(--butter)',
  },
  {
    icon: <ShieldIcon />,
    title: 'Safe Payment',
    text: 'Bank-level encryption and trusted checkout you can rely on.',
    tint: 'var(--blush)',
  },
]

export function Benefits() {
  return (
    <section className="section section--soft">
      <div className="container">
        <motion.div className="benefit-grid" variants={stagger} {...reveal}>
          {benefits.map((b) => (
            <motion.div
              className="benefit"
              key={b.title}
              variants={popIn}
              whileHover={{ y: -6 }}
            >
              <span className="benefit__icon" style={{ background: b.tint }}>
                {b.icon}
              </span>
              <strong>{b.title}</strong>
              <p>{b.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

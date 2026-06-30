import { motion } from 'framer-motion'
import { LeafIcon, TruckIcon, ReturnIcon, ShieldIcon } from './icons'
import { useI18n } from '../i18n'
import { popIn, reveal, stagger } from '../lib/motion'
import type { JSX } from 'react'

export function Benefits() {
  const { dict } = useI18n()
  const b = dict.ui.benefits

  const benefits: { icon: JSX.Element; title: string; text: string; tint: string }[] = [
    { icon: <LeafIcon />, title: b.organic.title, text: b.organic.text, tint: 'var(--mint)' },
    { icon: <TruckIcon />, title: b.delivery.title, text: b.delivery.text, tint: 'var(--sky)' },
    { icon: <ReturnIcon />, title: b.returns.title, text: b.returns.text, tint: 'var(--butter)' },
    { icon: <ShieldIcon />, title: b.payment.title, text: b.payment.text, tint: 'var(--blush)' },
  ]

  return (
    <section className="section section--soft">
      <div className="container">
        <motion.div className="benefit-grid" variants={stagger} {...reveal}>
          {benefits.map((item) => (
            <motion.div
              className="benefit"
              key={item.title}
              variants={popIn}
              whileHover={{ y: -6 }}
            >
              <span className="benefit__icon" style={{ background: item.tint }}>
                {item.icon}
              </span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

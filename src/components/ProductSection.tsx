import { motion } from 'framer-motion'
import type { Product } from '../types'
import { ProductCard } from './ProductCard'
import { useI18n } from '../i18n'
import { fadeUp, reveal, stagger } from '../lib/motion'

interface Props {
  id?: string
  eyebrow: string
  title: string
  subtitle?: string
  products: Product[]
  onViewAll?: () => void
  tone?: 'default' | 'soft'
}

export function ProductSection({
  id,
  eyebrow,
  title,
  subtitle,
  products,
  onViewAll,
  tone = 'default',
}: Props) {
  const { dict } = useI18n()
  return (
    <section className={`section ${tone === 'soft' ? 'section--soft' : ''}`} id={id}>
      <div className="container">
        <motion.div className="section-head" {...reveal} variants={fadeUp}>
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="section-title">{title}</h2>
            {subtitle && <p className="section-sub">{subtitle}</p>}
          </div>
          {onViewAll && (
            <button className="text-link" onClick={onViewAll}>
              {dict.ui.viewAll} →
            </button>
          )}
        </motion.div>

        <motion.div className="product-grid" variants={stagger} {...reveal}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import type { Product } from '../types'
import { ProductCard } from './ProductCard'
import { fadeUp, reveal, stagger } from '../lib/motion'

interface Props {
  id?: string
  eyebrow: string
  title: string
  subtitle?: string
  products: Product[]
  onOpen: (product: Product) => void
  onViewAll?: () => void
  tone?: 'default' | 'soft'
}

export function ProductSection({
  id,
  eyebrow,
  title,
  subtitle,
  products,
  onOpen,
  onViewAll,
  tone = 'default',
}: Props) {
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
              View all →
            </button>
          )}
        </motion.div>

        <motion.div className="product-grid" variants={stagger} {...reveal}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

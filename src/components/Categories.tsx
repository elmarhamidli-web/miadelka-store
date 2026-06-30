import { motion } from 'framer-motion'
import { categories } from '../data/categories'
import { fadeUp, popIn, reveal, stagger } from '../lib/motion'

interface Props {
  onSelect: (categoryId: string) => void
}

export function Categories({ onSelect }: Props) {
  return (
    <section className="section" id="categories">
      <div className="container">
        <motion.div className="section-head" {...reveal} variants={fadeUp}>
          <div>
            <span className="eyebrow">Shop by category</span>
            <h2 className="section-title">Find their new favourite</h2>
            <p className="section-sub">
              From first cuddles to playground heroes — curated edits for every age and stage.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="cat-grid"
          variants={stagger}
          {...reveal}
        >
          {categories.map((c) => (
            <motion.button
              key={c.id}
              className="cat-card"
              style={{ background: c.gradient }}
              variants={popIn}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => onSelect(c.id)}
            >
              <span className="cat-card__emoji" aria-hidden="true">{c.emoji}</span>
              <div className="cat-card__text">
                <strong>{c.name}</strong>
                <span>{c.tagline}</span>
              </div>
              <span className="cat-card__arrow" aria-hidden="true">→</span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

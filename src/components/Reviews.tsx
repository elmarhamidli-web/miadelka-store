import { motion } from 'framer-motion'
import { reviews } from '../data/reviews'
import { fadeUp, popIn, reveal, stagger } from '../lib/motion'

export function Reviews() {
  return (
    <section className="section" id="reviews">
      <div className="container">
        <motion.div className="section-head section-head--center" {...reveal} variants={fadeUp}>
          <div>
            <span className="eyebrow">Loved by parents</span>
            <h2 className="section-title">50,000+ happy little customers</h2>
            <p className="section-sub" style={{ margin: '10px auto 0' }}>
              Real words from the families who dress their tiny humans in TinyMode.
            </p>
          </div>
        </motion.div>

        <motion.div className="review-grid" variants={stagger} {...reveal}>
          {reviews.map((r) => (
            <motion.figure
              className="review"
              key={r.id}
              variants={popIn}
              whileHover={{ y: -6 }}
            >
              <span className="stars" aria-hidden="true">{'★'.repeat(r.rating)}</span>
              <blockquote>“{r.text}”</blockquote>
              <figcaption>
                <span className="review__avatar" aria-hidden="true">{r.avatar}</span>
                <span>
                  <strong>{r.name}</strong>
                  <small>{r.location}</small>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

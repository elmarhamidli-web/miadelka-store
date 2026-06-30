import { motion } from 'framer-motion'
import { reviews } from '../data/reviews'
import { useI18n } from '../i18n'
import { fadeUp, popIn, reveal, stagger } from '../lib/motion'

export function Reviews() {
  const { dict, reviewText, reviewLocation } = useI18n()
  return (
    <section className="section" id="reviews">
      <div className="container">
        <motion.div className="section-head section-head--center" {...reveal} variants={fadeUp}>
          <div>
            <span className="eyebrow">{dict.ui.reviewsSection.eyebrow}</span>
            <h2 className="section-title">{dict.ui.reviewsSection.title}</h2>
            <p className="section-sub" style={{ margin: '10px auto 0' }}>
              {dict.ui.reviewsSection.sub}
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
              <blockquote>“{reviewText(r.id, r.text)}”</blockquote>
              <figcaption>
                <span className="review__avatar" aria-hidden="true">{r.avatar}</span>
                <span>
                  <strong>{r.name}</strong>
                  <small>{reviewLocation(r.id, r.location)}</small>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

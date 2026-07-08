// Homepage reviews — real, verified customer reviews approved by the store
// owner in the admin panel. The whole section is hidden until the first
// review is approved.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { fadeUp, popIn, reveal, stagger } from '../lib/motion'
import { fetchApprovedReviews, type ReviewRow } from '../lib/reviews'
import { useProducts } from '../data/productsStore'

const AVATARS = ['👩🏻', '👨🏽', '👩🏼', '👨🏻', '👩🏽', '👨🏼']

export function Reviews() {
  const { dict, productName } = useI18n()
  const { byId } = useProducts()
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)

  useEffect(() => {
    let alive = true
    void fetchApprovedReviews(undefined, 8).then((r) => {
      if (alive) setReviews(r)
    })
    return () => {
      alive = false
    }
  }, [])

  // Nothing approved yet → no section at all (no fake content).
  if (!reviews || reviews.length === 0) return null

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
          {reviews.slice(0, 4).map((r, i) => (
            <motion.figure className="review" key={r.id} variants={popIn} whileHover={{ y: -6 }}>
              <span className="stars" aria-hidden="true">{'★'.repeat(r.rating)}</span>
              <blockquote>“{r.text}”</blockquote>
              <figcaption>
                <span className="review__avatar" aria-hidden="true">
                  {AVATARS[i % AVATARS.length]}
                </span>
                <span>
                  <strong>{r.author}</strong>
                  <small>
                    ✓ {dict.ui.review.verified}
                    {byId(r.product_id)
                      ? ` · ${productName(r.product_id, byId(r.product_id)!.name)}`
                      : ''}
                  </small>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

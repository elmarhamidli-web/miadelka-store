import { motion } from 'framer-motion'
import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { fadeUp, reveal } from '../lib/motion'

export function Newsletter() {
  const { pushToast } = useStore()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setDone(true)
    pushToast('Welcome to the family! Check your inbox 💌', '🎉')
    setEmail('')
    window.setTimeout(() => setDone(false), 3000)
  }

  return (
    <section className="section">
      <div className="container">
        <motion.div className="newsletter" {...reveal} variants={fadeUp}>
          <span className="newsletter__emoji" aria-hidden="true">💌</span>
          <h2 className="newsletter__title">Join the TinyMode family</h2>
          <p className="newsletter__sub">
            Get 10% off your first order plus early access to new drops, parenting tips
            and pastel-perfect inspiration.
          </p>
          <form className="newsletter__form" onSubmit={submit}>
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button className="btn btn--primary" type="submit">
              {done ? 'Subscribed ✓' : 'Get 10% off'}
            </button>
          </form>
          <small className="newsletter__fine">
            No spam, ever. Unsubscribe anytime. It's a prototype 🙂
          </small>
        </motion.div>
      </div>
    </section>
  )
}

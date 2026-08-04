import { motion } from 'framer-motion'
import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { fadeUp, reveal } from '../lib/motion'

export function Newsletter() {
  const { pushToast } = useStore()
  const { dict } = useI18n()
  const n = dict.ui.newsletter
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error('subscribe failed')
      setDone(true)
      pushToast(n.toast, '🎉')
      setEmail('')
      window.setTimeout(() => setDone(false), 3000)
    } catch {
      pushToast('Něco se nepovedlo — zkuste to prosím znovu.', '😔')
    }
    setBusy(false)
  }

  return (
    <section className="section">
      <div className="container">
        <motion.div className="newsletter" {...reveal} variants={fadeUp}>
          <span className="newsletter__emoji" aria-hidden="true">💌</span>
          <h2 className="newsletter__title">{n.title}</h2>
          <p className="newsletter__sub">{n.sub}</p>
          <form className="newsletter__form" onSubmit={submit}>
            <input
              type="email"
              required
              placeholder={n.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={n.placeholder}
            />
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? '…' : done ? n.done : n.cta}
            </button>
          </form>
          <small className="newsletter__fine">{n.fine}</small>
        </motion.div>
      </div>
    </section>
  )
}

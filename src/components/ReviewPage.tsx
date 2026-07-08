// Public review form, reached from the review-request e-mail
// (/recenze/<token>). One star rating + text per purchased product.
// Submitted reviews are "pending" until the store owner approves them.
import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { applyPageSeo } from '../lib/seo'

interface Info {
  orderNumber: number
  firstName: string
  alreadyReviewed: boolean
  products: { id: string; name: string }[]
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="review-form__stars" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}/5`}
          className={n <= value ? 'is-on' : ''}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function ReviewPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { dict, locale, productName } = useI18n()
  const r = dict.ui.review

  const [state, setState] = useState<'loading' | 'form' | 'done' | 'already' | 'invalid'>('loading')
  const [info, setInfo] = useState<Info | null>(null)
  const [author, setAuthor] = useState('')
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    applyPageSeo(locale, r.formTitle, r.formIntro, `/recenze`)
    window.scrollTo({ top: 0 })
  }, [locale, r.formTitle, r.formIntro])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetch(`/api/review-info?token=${encodeURIComponent(token || '')}`)
        if (!res.ok) {
          if (alive) setState('invalid')
          return
        }
        const data = (await res.json()) as Info
        if (!alive) return
        setInfo(data)
        setAuthor(data.firstName || '')
        setState(data.alreadyReviewed ? 'already' : 'form')
      } catch {
        if (alive) setState('invalid')
      }
    })()
    return () => {
      alive = false
    }
  }, [token])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!info || busy) return
    const reviews = info.products
      .filter((p) => (ratings[p.id] || 0) > 0 && (texts[p.id] || '').trim().length >= 3)
      .map((p) => ({ productId: p.id, rating: ratings[p.id], text: texts[p.id].trim() }))
    if (reviews.length === 0 || author.trim().length < 2) {
      setError(r.errorGeneric)
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, author: author.trim(), reviews }),
      })
      if (res.status === 409) {
        setState('already')
        return
      }
      if (!res.ok) throw new Error('failed')
      setState('done')
      window.scrollTo({ top: 0 })
    } catch {
      setError(r.errorGeneric)
    }
    setBusy(false)
  }

  const message = (emoji: string, title: string, sub: string) => (
    <section className="section checkout">
      <div className="container checkout__success">
        <span className="checkout__success-emoji" aria-hidden="true">{emoji}</span>
        <h1>{title}</h1>
        <p>{sub}</p>
        <button className="btn btn--primary btn--lg" onClick={() => navigate('/')}>
          {dict.ui.checkout.backToShop}
        </button>
      </div>
    </section>
  )

  if (state === 'loading')
    return (
      <section className="section checkout">
        <div className="container checkout__success">
          <p>…</p>
        </div>
      </section>
    )
  if (state === 'invalid') return message('🔍', r.invalidTitle, r.invalidSub)
  if (state === 'already') return message('💌', r.alreadyTitle, r.alreadySub)
  if (state === 'done') return message('💝', r.thanksTitle, r.thanksSub)

  return (
    <section className="section info-page">
      <div className="container info-page__container">
        <motion.div
          className="info-page__panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="info-page__title">{r.formTitle}</h1>
          <p className="info-page__intro">{r.formIntro}</p>

          <form onSubmit={submit} className="review-form">
            <label className="review-form__name">
              {r.nameLabel}
              <input
                required
                minLength={2}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </label>

            {info?.products.map((p) => (
              <div className="review-form__product" key={p.id}>
                <strong>{productName(p.id, p.name)}</strong>
                <Stars
                  value={ratings[p.id] || 0}
                  onChange={(n) => setRatings((s) => ({ ...s, [p.id]: n }))}
                />
                <textarea
                  rows={3}
                  placeholder={r.textPlaceholder}
                  value={texts[p.id] || ''}
                  onChange={(e) => setTexts((s) => ({ ...s, [p.id]: e.target.value }))}
                />
              </div>
            ))}

            {error && <p className="checkout__promo-err">{error}</p>}
            <button className="btn btn--primary btn--lg btn--full" disabled={busy}>
              {busy ? '…' : r.submit}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  )
}

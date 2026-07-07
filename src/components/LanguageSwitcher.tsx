import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { dictionaries, locales } from '../i18n/registry'

interface Props {
  /** Render all languages as a row of buttons (used in the mobile menu). */
  inline?: boolean
}

export function LanguageSwitcher({ inline = false }: Props) {
  const { locale, setLocale, dict } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = dictionaries[locale]

  // Close on click/tap outside — works on both desktop and touch devices.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (inline) {
    return (
      <div className="lang lang--inline" role="group" aria-label={dict.ui.nav.language}>
        {locales.map((l) => (
          <button
            key={l}
            className={`lang__pill ${l === locale ? 'is-active' : ''}`}
            aria-pressed={l === locale}
            onClick={() => setLocale(l)}
          >
            <span aria-hidden="true">{dictionaries[l].flag}</span> {l.toUpperCase()}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="lang" ref={rootRef}>
      <button
        className="lang__btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={dict.ui.nav.language}
      >
        <span aria-hidden="true">{current.flag}</span>
        <span className="lang__code">{locale.toUpperCase()}</span>
        <span className={`lang__caret ${open ? 'is-open' : ''}`} aria-hidden="true">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="lang__menu"
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {locales.map((l) => (
              <li key={l}>
                <button
                  role="option"
                  aria-selected={l === locale}
                  className={`lang__item ${l === locale ? 'is-active' : ''}`}
                  onClick={() => {
                    setLocale(l)
                    setOpen(false)
                  }}
                >
                  <span aria-hidden="true">{dictionaries[l].flag}</span>
                  {dictionaries[l].localeName}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

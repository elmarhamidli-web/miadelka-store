import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { dictionaries, locales } from '../i18n/registry'

export function LanguageSwitcher() {
  const { locale, setLocale, dict } = useI18n()
  const [open, setOpen] = useState(false)
  const current = dictionaries[locale]

  return (
    <div className="lang" onMouseLeave={() => setOpen(false)}>
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

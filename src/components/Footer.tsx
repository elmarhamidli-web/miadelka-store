import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { InstagramIcon } from './icons'

interface Props {
  onNavigate: (categoryId?: string) => void
}

const INSTAGRAM_URL = 'https://www.instagram.com/_little_one_store_/'

export function Footer({ onNavigate }: Props) {
  const { dict } = useI18n()
  const f = dict.ui.footer

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <a className="logo" href="#top" onClick={(e) => { e.preventDefault(); onNavigate() }}>
            <span className="logo__mark" aria-hidden="true">🧸</span>
            <span className="logo__text">
              LittleOne<span className="logo__accent">Store</span>
            </span>
          </a>
          <p>{f.tagline}</p>
          <div className="footer__socials">
            <a
              href={INSTAGRAM_URL}
              className="footer__social"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={f.instagramAria}
            >
              <InstagramIcon />
            </a>
            <a
              href={INSTAGRAM_URL}
              className="footer__insta-handle"
              target="_blank"
              rel="noopener noreferrer"
            >
              @_little_one_store_
            </a>
          </div>
        </div>

        {f.columns.map((col) => (
          <div className="footer__col" key={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="footer__col footer__contact">
          <h4>{f.contactTitle}</h4>
          <ul>
            {f.contact.map((c) => (
              <li key={c}>
                {c.includes('info@littleonestore.cz') ? (
                  <a href="mailto:info@littleonestore.cz">{c}</a>
                ) : c.includes('+420') ? (
                  <a href="tel:+420604364804">{c}</a>
                ) : (
                  c
                )}
              </li>
            ))}
          </ul>
          <h4 className="footer__company-title">{f.companyTitle}</h4>
          <ul>
            {f.company.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>{f.rights}</span>
        <div className="footer__pay">
          <span>{f.secure}</span>
          <span aria-hidden="true">💳 🅿️ 🍎 🟦</span>
        </div>
      </div>

      <div className="container footer__credit">
        <a href="https://rakaprime.cz" target="_blank" rel="noopener noreferrer">
          {f.credit} · rakaprime.cz
        </a>
      </div>
    </footer>
  )
}

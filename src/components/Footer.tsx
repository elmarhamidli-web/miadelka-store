import { useI18n } from '../i18n'

interface Props {
  onNavigate: (categoryId?: string) => void
}

const socials = ['📷', '📘', '🎵', '📌', '▶️']

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
            {socials.map((s, i) => (
              <a key={i} href="#" className="footer__social" aria-label="Social link">
                <span aria-hidden="true">{s}</span>
              </a>
            ))}
          </div>
        </div>

        {f.columns.map((col) => (
          <div className="footer__col" key={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onNavigate() }}>{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="footer__col footer__contact">
          <h4>{f.contactTitle}</h4>
          <ul>
            {f.contact.map((c) => (
              <li key={c}>{c}</li>
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

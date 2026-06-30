interface Props {
  onNavigate: (categoryId?: string) => void
}

const columns = [
  {
    title: 'Shop',
    links: ['New Collection', 'Baby', 'Girls', 'Boys', 'Shoes', 'Accessories'],
  },
  {
    title: 'Help',
    links: ['Size Guide', 'Shipping', 'Returns & Exchanges', 'Track Order', 'Contact Us'],
  },
  {
    title: 'Company',
    links: ['Our Story', 'Sustainability', 'Careers', 'Press', 'Stores'],
  },
]

const socials = ['📷', '📘', '🎵', '📌', '▶️']

export function Footer({ onNavigate }: Props) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <a className="logo" href="#top" onClick={(e) => { e.preventDefault(); onNavigate() }}>
            <span className="logo__mark" aria-hidden="true">🧸</span>
            <span className="logo__text">
              TinyMode<span className="logo__accent">Kids</span>
            </span>
          </a>
          <p>
            Premium, planet-friendly clothing for tiny adventurers. Designed with love,
            made to be handed down.
          </p>
          <div className="footer__socials">
            {socials.map((s, i) => (
              <a key={i} href="#" className="footer__social" aria-label="Social link">
                <span aria-hidden="true">{s}</span>
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
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
          <h4>Get in touch</h4>
          <ul>
            <li>✉️ hello@tinymode.kids</li>
            <li>📞 +1 (800) 555-0142</li>
            <li>📍 14 Maple Lane, Portland, OR</li>
          </ul>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© 2026 TinyMode Kids — a design prototype. All rights reserved.</span>
        <div className="footer__pay">
          <span>🔒 Secure checkout</span>
          <span aria-hidden="true">💳 🅿️ 🍎 🟦</span>
        </div>
      </div>
    </footer>
  )
}

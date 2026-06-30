import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { categories } from '../data/categories'
import {
  CartIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  CloseIcon,
} from './icons'

interface Props {
  onNavigate: (categoryId?: string) => void
  onSearch: (query: string) => void
}

export function Header({ onNavigate, onSearch }: Props) {
  const { cartCount, wishlist, openCart } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [bump, setBump] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Animate cart icon whenever count changes
  useEffect(() => {
    if (cartCount === 0) return
    setBump(true)
    const t = window.setTimeout(() => setBump(false), 450)
    return () => window.clearTimeout(t)
  }, [cartCount])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
    setSearchOpen(false)
  }

  return (
    <>
      <div className="announce">
        ✨ Free carbon-neutral delivery over $60 · Easy 30-day returns ✨
      </div>

      <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container header__inner">
          <button
            className="header__burger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

          <a
            className="logo"
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              onNavigate()
            }}
          >
            <span className="logo__mark" aria-hidden="true">🧸</span>
            <span className="logo__text">
              TinyMode<span className="logo__accent">Kids</span>
            </span>
          </a>

          <nav className="header__nav" aria-label="Primary">
            {categories.map((c) => (
              <button key={c.id} className="nav-link" onClick={() => onNavigate(c.id)}>
                {c.name}
              </button>
            ))}
          </nav>

          <div className="header__actions">
            <button
              className="icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen((s) => !s)}
            >
              <SearchIcon />
            </button>
            <button
              className="icon-btn header__wish"
              aria-label="Wishlist"
              onClick={() => onNavigate()}
            >
              <HeartIcon />
              {wishlist.length > 0 && <span className="badge-count">{wishlist.length}</span>}
            </button>
            <motion.button
              className="icon-btn"
              aria-label="Open cart"
              onClick={openCart}
              animate={bump ? { scale: [1, 1.3, 0.92, 1] } : {}}
              transition={{ duration: 0.45 }}
            >
              <CartIcon />
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              className="search-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <form className="container search-bar__form" onSubmit={submitSearch}>
                <SearchIcon />
                <input
                  autoFocus
                  type="search"
                  placeholder="Search for hoodies, dresses, sneakers…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="btn btn--primary">
                  Search
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              className="mobile-menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <div className="mobile-menu__head">
                <span className="logo__text">
                  TinyMode<span className="logo__accent">Kids</span>
                </span>
                <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <CloseIcon />
                </button>
              </div>
              <nav className="mobile-menu__nav">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onNavigate(c.id)
                      setMenuOpen(false)
                    }}
                  >
                    <span aria-hidden="true">{c.emoji}</span> {c.name}
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

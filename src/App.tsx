import { lazy, Suspense, useCallback } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HomePage } from './components/HomePage'
import { ProductPage } from './components/ProductPage'
import { CartDrawer } from './components/CartDrawer'
import { Toasts } from './components/Toasts'

const AdminPanel = lazy(() => import('./admin/AdminPanel'))

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/adminpanel')

  const handleNavigate = useCallback(
    (categoryId?: string) => {
      if (categoryId) {
        navigate(`/?category=${categoryId}`)
      } else {
        navigate('/')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [navigate],
  )

  const handleSearch = useCallback(
    (query: string) => {
      navigate(query ? `/?q=${encodeURIComponent(query)}` : '/')
    },
    [navigate],
  )

  if (isAdmin) {
    return (
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Načítání…</div>}>
        <Routes>
          <Route path="/adminpanel/*" element={<AdminPanel />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <>
      <Header onNavigate={handleNavigate} onSearch={handleSearch} />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      <Footer onNavigate={handleNavigate} />

      <CartDrawer />
      <Toasts />
    </>
  )
}

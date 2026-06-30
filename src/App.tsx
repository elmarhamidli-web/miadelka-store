import { useCallback, useEffect, useRef, useState } from 'react'
import type { CategoryId, Product } from './types'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Categories } from './components/Categories'
import { ProductSection } from './components/ProductSection'
import { PromoBanner } from './components/PromoBanner'
import { Benefits } from './components/Benefits'
import { Reviews } from './components/Reviews'
import { Newsletter } from './components/Newsletter'
import { Footer } from './components/Footer'
import { Shop } from './components/Shop'
import { CartDrawer } from './components/CartDrawer'
import { ProductDetail } from './components/ProductDetail'
import { Toasts } from './components/Toasts'
import { featuredProducts, bestSellers, seasonalProducts } from './data/products'

export default function App() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [shopCategory, setShopCategory] = useState<CategoryId | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [shopKey, setShopKey] = useState(0)
  const shopRef = useRef<HTMLDivElement>(null)

  const openProduct = useCallback((product: Product) => setActiveProduct(product), [])

  const scrollToShop = useCallback(() => {
    shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNavigate = useCallback(
    (categoryId?: string) => {
      if (categoryId) {
        setShopCategory(categoryId as CategoryId)
        setSearchQuery('')
        setShopKey((k) => k + 1)
        window.setTimeout(scrollToShop, 60)
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [scrollToShop],
  )

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      setShopCategory('all')
      setShopKey((k) => k + 1)
      window.setTimeout(scrollToShop, 60)
    },
    [scrollToShop],
  )

  useEffect(() => {
    document.title = 'TinyMode Kids — Premium Children\'s Clothing'
  }, [])

  return (
    <>
      <Header onNavigate={handleNavigate} onSearch={handleSearch} />

      <main>
        <Hero onShop={scrollToShop} onExplore={() => scrollTo('categories')} />

        <Categories onSelect={(id) => handleNavigate(id)} />

        <ProductSection
          id="featured"
          eyebrow="Handpicked for you"
          title="Featured favourites"
          subtitle="The pieces parents keep coming back for — soft, durable and effortlessly cute."
          products={featuredProducts}
          onOpen={openProduct}
          onViewAll={scrollToShop}
        />

        <PromoBanner onShop={scrollToShop} />

        <ProductSection
          id="bestsellers"
          eyebrow="Crowd pleasers"
          title="This week's best sellers"
          subtitle="Loved by thousands of little ones and their grown-ups."
          products={bestSellers}
          onOpen={openProduct}
          onViewAll={scrollToShop}
          tone="soft"
        />

        <ProductSection
          id="seasonal"
          eyebrow="Spring 2026"
          title="The seasonal collection"
          subtitle="Breezy layers and sun-ready styles for warmer days ahead."
          products={seasonalProducts}
          onOpen={openProduct}
          onViewAll={scrollToShop}
        />

        <Benefits />

        <div ref={shopRef}>
          <Shop
            key={shopKey}
            initialCategory={shopCategory}
            searchQuery={searchQuery}
            onOpen={openProduct}
          />
        </div>

        <Reviews />
        <Newsletter />
      </main>

      <Footer onNavigate={handleNavigate} />

      <CartDrawer />
      <ProductDetail product={activeProduct} onClose={() => setActiveProduct(null)} onOpen={openProduct} />
      <Toasts />
    </>
  )
}

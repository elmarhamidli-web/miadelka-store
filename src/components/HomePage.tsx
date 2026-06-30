import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CategoryId } from '../types'
import { Hero } from './Hero'
import { Categories } from './Categories'
import { ProductSection } from './ProductSection'
import { PromoBanner } from './PromoBanner'
import { Benefits } from './Benefits'
import { Reviews } from './Reviews'
import { Newsletter } from './Newsletter'
import { Shop } from './Shop'
import { useI18n } from '../i18n'
import { featuredProducts, bestSellers, seasonalProducts } from '../data/products'

export function HomePage() {
  const [searchParams] = useSearchParams()
  const { dict } = useI18n()
  const shopRef = useRef<HTMLDivElement>(null)

  const category = (searchParams.get('category') as CategoryId | null) ?? 'all'
  const search = searchParams.get('q') ?? ''

  const scrollToShop = () => {
    shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // When arriving with a category/search query, jump to the shop area.
  useEffect(() => {
    if (searchParams.get('category') || searchParams.get('q')) {
      const t = window.setTimeout(scrollToShop, 80)
      return () => window.clearTimeout(t)
    }
  }, [searchParams])

  return (
    <>
      <Hero onShop={scrollToShop} onExplore={() => scrollTo('categories')} />

      <Categories onSelect={scrollToShop} />

      <ProductSection
        id="featured"
        eyebrow={dict.ui.featured.eyebrow}
        title={dict.ui.featured.title}
        subtitle={dict.ui.featured.sub}
        products={featuredProducts}
        onViewAll={scrollToShop}
      />

      <PromoBanner onShop={scrollToShop} />

      <ProductSection
        id="bestsellers"
        eyebrow={dict.ui.bestsellers.eyebrow}
        title={dict.ui.bestsellers.title}
        subtitle={dict.ui.bestsellers.sub}
        products={bestSellers}
        onViewAll={scrollToShop}
        tone="soft"
      />

      <ProductSection
        id="seasonal"
        eyebrow={dict.ui.seasonal.eyebrow}
        title={dict.ui.seasonal.title}
        subtitle={dict.ui.seasonal.sub}
        products={seasonalProducts}
        onViewAll={scrollToShop}
      />

      <Benefits />

      <div ref={shopRef}>
        <Shop key={`${category}-${search}`} initialCategory={category} searchQuery={search} />
      </div>

      <Reviews />
      <Newsletter />
    </>
  )
}

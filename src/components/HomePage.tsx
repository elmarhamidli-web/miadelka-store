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
import { useProducts } from '../data/productsStore'
import { applyHomeSeo } from '../lib/seo'

const HOME_SEO: Record<string, { title: string; description: string }> = {
  cs: {
    title: 'Little One Store — Prémiové dětské oblečení 0–24 měsíců | Brno',
    description:
      'Prémiové oblečení z biobavlny pro miminka a děti 0–24 měsíců. Soupravy, overaly a letní komplety. Doprava 90 Kč, zdarma nad 2 000 Kč. Vrácení do 30 dnů.',
  },
  en: {
    title: 'Little One Store — Premium Baby & Kids Clothing 0–24 months',
    description:
      'Premium organic-cotton clothing for babies and toddlers 0–24 months. Sets, rompers and summer outfits. Shipping 90 Kč, free over 2,000 Kč. 30-day returns.',
  },
  uk: {
    title: 'Little One Store — Преміальний дитячий одяг 0–24 місяці',
    description:
      'Преміальний одяг з органічної бавовни для малюків 0–24 місяці. Комплекти, чоловічки та літні набори. Доставка 90 Kč, безкоштовно від 2 000 Kč.',
  },
}

export function HomePage() {
  const [searchParams] = useSearchParams()
  const { dict, locale } = useI18n()
  const { featured: featuredProducts, bestSellers, seasonal: seasonalProducts } = useProducts()
  const shopRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const seo = HOME_SEO[locale] ?? HOME_SEO.cs
    applyHomeSeo(locale, seo.title, seo.description)
  }, [locale])

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

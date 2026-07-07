import type { Product } from '../types'

const SITE = 'https://www.littleonestore.cz'
const JSONLD_ID = 'seo-jsonld'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

function setJsonLd(data: object | null) {
  document.getElementById(JSONLD_ID)?.remove()
  if (!data) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = JSONLD_ID
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

export function applyHomeSeo(locale: string, title: string, description: string) {
  document.title = title
  document.documentElement.lang = locale
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:url', SITE + '/')
  setMeta('property', 'og:image', `${SITE}/products/bunny-3piece-set/beige-1.jpg`)
  setMeta('name', 'twitter:card', 'summary_large_image')
  setCanonical(SITE + '/')
  setJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'Little One Store',
    url: SITE,
    description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Hviezdoslavova 545/41',
      addressLocality: 'Brno',
      addressCountry: 'CZ',
    },
    parentOrganization: { '@type': 'Organization', name: 'Azruk s.r.o.', taxID: '14420333' },
  })
}

export function applyProductSeo(
  locale: string,
  product: Product,
  name: string,
  description: string,
) {
  const priceCzk = Math.round(product.price * 24)
  const image = product.colors.find((c) => c.images?.length)?.images?.[0]
  const url = `${SITE}/product/${product.id}`
  const title = `${name} · Little One Store`
  document.title = title
  document.documentElement.lang = locale
  setMeta('name', 'description', description.slice(0, 160))
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description.slice(0, 200))
  setMeta('property', 'og:type', 'product')
  setMeta('property', 'og:url', url)
  if (image) setMeta('property', 'og:image', image.startsWith('http') ? image : SITE + image)
  setMeta('name', 'twitter:card', 'summary_large_image')
  setCanonical(url)
  setJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image ? (image.startsWith('http') ? image : SITE + image) : undefined,
    url,
    brand: { '@type': 'Brand', name: 'Little One Store' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CZK',
      price: priceCzk,
      availability:
        product.inStock === false
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url,
    },
  })
}

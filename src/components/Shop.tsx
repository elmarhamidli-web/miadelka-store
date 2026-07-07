import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { CategoryId } from '../types'
import { useProducts } from '../data/productsStore'
import { categories } from '../data/categories'
import { ProductCard } from './ProductCard'
import { useI18n } from '../i18n'
import { fadeUp, reveal, stagger } from '../lib/motion'

interface Props {
  initialCategory?: CategoryId | 'all'
  searchQuery?: string
}

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating'

const PRICE_STEPS = [200 / 24, 300 / 24, 400 / 24]

export function Shop({ initialCategory = 'all', searchQuery = '' }: Props) {
  const { dict, formatPrice, plural, categoryName, colorName } = useI18n()
  const { products } = useProducts()
  const s = dict.ui.shop

  const allSizes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.sizes))),
    [products],
  )
  const allColors = useMemo(
    () =>
      Array.from(
        new Map(products.flatMap((p) => p.colors).map((c) => [c.name, c])).values(),
      ),
    [products],
  )
  const allAges = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.ages))).sort(),
    [products],
  )

  const [category, setCategory] = useState<CategoryId | 'all'>(initialCategory)
  const [size, setSize] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [age, setAge] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [sort, setSort] = useState<SortKey>('featured')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = products.slice()
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    }
    if (category !== 'all') {
      list = list.filter((p) => p.category === category || (category === 'new-collection' && p.isNew))
    }
    if (size) list = list.filter((p) => p.sizes.includes(size))
    if (color) list = list.filter((p) => p.colors.some((c) => c.name === color))
    if (age) list = list.filter((p) => p.ages.includes(age))
    if (maxPrice) list = list.filter((p) => p.price <= maxPrice)

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      default:
        list.sort((a, b) => Number(b.featured) - Number(a.featured))
    }
    return list
  }, [products, category, size, color, age, maxPrice, sort, searchQuery])

  const clearAll = () => {
    setCategory('all')
    setSize(null)
    setColor(null)
    setAge(null)
    setMaxPrice(null)
  }

  const activeCount =
    (category !== 'all' ? 1 : 0) +
    (size ? 1 : 0) +
    (color ? 1 : 0) +
    (age ? 1 : 0) +
    (maxPrice ? 1 : 0)

  const pieceWord = plural(filtered.length, s.pieces)

  return (
    <section className="section shop" id="shop">
      <div className="container">
        <motion.div className="shop__head" {...reveal} variants={fadeUp}>
          <div>
            <span className="eyebrow">{s.eyebrow}</span>
            <h2 className="section-title">
              {searchQuery ? `${s.resultsFor} “${searchQuery}”` : s.titleAll}
            </h2>
            <p className="section-sub">
              {filtered.length} {pieceWord} {s.countTail}
            </p>
          </div>
          <div className="shop__sortwrap">
            <button
              className="btn btn--ghost shop__filter-toggle"
              onClick={() => setShowFilters((v) => !v)}
            >
              {s.filters} {activeCount > 0 && <span className="badge-count badge-count--inline">{activeCount}</span>}
            </button>
            <label className="shop__sort">
              <span>{s.sort}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="featured">{s.sortFeatured}</option>
                <option value="price-asc">{s.sortPriceAsc}</option>
                <option value="price-desc">{s.sortPriceDesc}</option>
                <option value="rating">{s.sortRating}</option>
              </select>
            </label>
          </div>
        </motion.div>

        <div className="shop__layout">
          <aside className={`filters ${showFilters ? 'is-open' : ''}`}>
            <div className="filters__head">
              <strong>{s.filters}</strong>
              {activeCount > 0 && (
                <button className="filters__clear" onClick={clearAll}>
                  {s.clearAll}
                </button>
              )}
            </div>

            <div className="filter-group">
              <h4>{s.category}</h4>
              <div className="filter-chips">
                <button
                  className={`pill ${category === 'all' ? 'pill--active' : ''}`}
                  onClick={() => setCategory('all')}
                >
                  {s.all}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={`pill ${category === c.id ? 'pill--active' : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.emoji} {categoryName(c.id)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>{s.size}</h4>
              <div className="filter-chips">
                {allSizes.map((sz) => (
                  <button
                    key={sz}
                    className={`pill ${size === sz ? 'pill--active' : ''}`}
                    onClick={() => setSize(size === sz ? null : sz)}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>{s.colour}</h4>
              <div className="filter-dots">
                {allColors.map((c) => (
                  <button
                    key={c.name}
                    className={`color-dot color-dot--lg ${color === c.name ? 'is-active' : ''}`}
                    style={{ background: c.hex }}
                    title={colorName(c.name)}
                    aria-label={colorName(c.name)}
                    onClick={() => setColor(color === c.name ? null : c.name)}
                  />
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>{s.age}</h4>
              <div className="filter-chips">
                {allAges.map((a) => (
                  <button
                    key={a}
                    className={`pill ${age === a ? 'pill--active' : ''}`}
                    onClick={() => setAge(age === a ? null : a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>{s.maxPrice}</h4>
              <div className="filter-chips">
                {PRICE_STEPS.map((pr) => (
                  <button
                    key={pr}
                    className={`pill ${maxPrice === pr ? 'pill--active' : ''}`}
                    onClick={() => setMaxPrice(maxPrice === pr ? null : pr)}
                  >
                    {'\u2264'} {formatPrice(pr)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="shop__results">
            {filtered.length === 0 ? (
              <div className="shop__empty">
                <span aria-hidden="true">🔍</span>
                <strong>{s.emptyTitle}</strong>
                <p>{s.emptySub}</p>
                <button className="btn btn--soft" onClick={clearAll}>{s.reset}</button>
              </div>
            ) : (
              <motion.div
                className="product-grid"
                variants={stagger}
                initial="hidden"
                animate="show"
                key={`${category}-${size}-${color}-${age}-${maxPrice}-${sort}-${searchQuery}`}
              >
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

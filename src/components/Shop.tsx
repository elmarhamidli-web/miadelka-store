import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { CategoryId, Product } from '../types'
import { products } from '../data/products'
import { categories } from '../data/categories'
import { ProductCard } from './ProductCard'
import { fadeUp, reveal, stagger } from '../lib/motion'

interface Props {
  initialCategory?: CategoryId | 'all'
  searchQuery?: string
  onOpen: (product: Product) => void
}

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating'

const allSizes = Array.from(new Set(products.flatMap((p) => p.sizes)))
const allColors = Array.from(
  new Map(products.flatMap((p) => p.colors).map((c) => [c.name, c])).values(),
)
const allAges = Array.from(new Set(products.flatMap((p) => p.ages))).sort()
const PRICE_STEPS = [20, 40, 60, 100]

export function Shop({ initialCategory = 'all', searchQuery = '', onOpen }: Props) {
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
  }, [category, size, color, age, maxPrice, sort, searchQuery])

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

  return (
    <section className="section shop" id="shop">
      <div className="container">
        <motion.div className="shop__head" {...reveal} variants={fadeUp}>
          <div>
            <span className="eyebrow">Shop all</span>
            <h2 className="section-title">
              {searchQuery ? `Results for “${searchQuery}”` : 'The full collection'}
            </h2>
            <p className="section-sub">
              {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'} crafted for comfy, confident little ones.
            </p>
          </div>
          <div className="shop__sortwrap">
            <button
              className="btn btn--ghost shop__filter-toggle"
              onClick={() => setShowFilters((s) => !s)}
            >
              Filters {activeCount > 0 && <span className="badge-count badge-count--inline">{activeCount}</span>}
            </button>
            <label className="shop__sort">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>
        </motion.div>

        <div className="shop__layout">
          <aside className={`filters ${showFilters ? 'is-open' : ''}`}>
            <div className="filters__head">
              <strong>Filters</strong>
              {activeCount > 0 && (
                <button className="filters__clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>

            <div className="filter-group">
              <h4>Category</h4>
              <div className="filter-chips">
                <button
                  className={`pill ${category === 'all' ? 'pill--active' : ''}`}
                  onClick={() => setCategory('all')}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={`pill ${category === c.id ? 'pill--active' : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Size</h4>
              <div className="filter-chips">
                {allSizes.map((s) => (
                  <button
                    key={s}
                    className={`pill ${size === s ? 'pill--active' : ''}`}
                    onClick={() => setSize(size === s ? null : s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Colour</h4>
              <div className="filter-dots">
                {allColors.map((c) => (
                  <button
                    key={c.name}
                    className={`color-dot color-dot--lg ${color === c.name ? 'is-active' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    aria-label={c.name}
                    onClick={() => setColor(color === c.name ? null : c.name)}
                  />
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Age</h4>
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
              <h4>Max price</h4>
              <div className="filter-chips">
                {PRICE_STEPS.map((p) => (
                  <button
                    key={p}
                    className={`pill ${maxPrice === p ? 'pill--active' : ''}`}
                    onClick={() => setMaxPrice(maxPrice === p ? null : p)}
                  >
                    ${'\u2264'}{p}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="shop__results">
            {filtered.length === 0 ? (
              <div className="shop__empty">
                <span aria-hidden="true">🔍</span>
                <strong>No matches just yet</strong>
                <p>Try clearing a filter or two.</p>
                <button className="btn btn--soft" onClick={clearAll}>Reset filters</button>
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
                  <ProductCard key={p.id} product={p} onOpen={onOpen} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

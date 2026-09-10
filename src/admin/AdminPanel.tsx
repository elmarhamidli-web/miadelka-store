import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, STORAGE_BUCKET } from '../lib/supabase'
import type { ProductRow, SiteSettings } from '../data/productsStore'
import { DEFAULT_SETTINGS } from '../data/productsStore'
import type { CategoryId, ColorOption } from '../types'
import { CARRIERS, makeTrackingUrl } from '../lib/carriers'
import { parseVariants, variantKey, type StockVariants } from '../lib/stock'
import './admin.css'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'baby', label: 'Miminka' },
  { id: 'girls', label: 'Holky' },
  { id: 'boys', label: 'Kluci' },
  { id: 'new-collection', label: 'Nová kolekce' },
  { id: 'gift-cards', label: 'Dárkové poukazy' },
]

const GRADIENTS: Record<string, string> = {
  'Růžová': 'linear-gradient(140deg, #ffe3ec 0%, #ffc9d8 60%, #ffb6c8 100%)',
  'Broskvová': 'linear-gradient(140deg, #ffeadd 0%, #ffd8c2 60%, #ffc9ad 100%)',
  'Modrá': 'linear-gradient(140deg, #ddefff 0%, #c2ddff 60%, #aacdf5 100%)',
  'Zelená': 'linear-gradient(140deg, #e2f5e4 0%, #cdeccd 60%, #b5e0b8 100%)',
  'Béžová': 'linear-gradient(140deg, #f7eede 0%, #efe0c8 60%, #e6d2b2 100%)',
  'Červená': 'linear-gradient(140deg, #ffe0e0 0%, #ffc4c4 60%, #ffabab 100%)',
  'Šedá': 'linear-gradient(140deg, #eceef2 0%, #dcdfe6 60%, #c9cdd6 100%)',
  'Fialová': 'linear-gradient(140deg, #efe8ff 0%, #ded1ff 60%, #cbbcf5 100%)',
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `produkt-${Date.now()}`

const emptyRow = (): ProductRow => ({
  id: '',
  sort: 100,
  category: 'baby',
  price_czk: 299,
  old_price_czk: null,
  rating: 4.8,
  reviews: 0,
  emoji: '🧸',
  gradient: GRADIENTS['Růžová'],
  sizes: [],
  ages: ['0-6m'],
  colors: [{ name: 'Pink', hex: '#f4b9c8', images: [] }],
  badge: null,
  featured: false,
  best_seller: false,
  seasonal: false,
  is_new: true,
  hidden: false,
  in_stock: true,
  name_cs: '',
  name_en: null,
  name_uk: null,
  desc_cs: '',
  desc_en: null,
  desc_uk: null,
  material_cs: '100 % bavlna',
  material_en: null,
  material_uk: null,
  stock_qty: null,
  stock_variants: {},
  is_gift_card: false,
  seasons: [],
})

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!supabase) {
    return (
      <div className="admin admin--center">
        <div className="admin__card">
          <h1>Administrace</h1>
          <p>Backend zatím není nakonfigurován (chybí VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
        </div>
      </div>
    )
  }
  if (!ready) return <div className="admin admin--center"><p>Načítání…</p></div>
  return session ? <Dashboard onSignOut={() => supabase!.auth.signOut()} /> : <Login />
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) setError('Nesprávný e-mail nebo heslo.')
    setBusy(false)
  }

  return (
    <div className="admin admin--center">
      <form className="admin__card admin__login" onSubmit={submit}>
        <span className="admin__logo">🧸</span>
        <h1>Little One Store</h1>
        <p className="admin__muted">Administrace obchodu</p>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Heslo
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="admin__error">{error}</p>}
        <button className="admin__btn admin__btn--primary" disabled={busy}>
          {busy ? 'Přihlašování…' : 'Přihlásit se'}
        </button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/* The open tab (and the open product) live in the address bar, so a page
   refresh, a bookmark or the browser Back button all land where expected. */

type AdminView =
  | 'products'
  | 'orders'
  | 'inventory'
  | 'shipping'
  | 'promos'
  | 'sales'
  | 'reviews'
  | 'subscribers'
  | 'stats'
  | 'settings'

const ADMIN_VIEWS: AdminView[] = [
  'products',
  'orders',
  'inventory',
  'shipping',
  'promos',
  'sales',
  'reviews',
  'subscribers',
  'stats',
  'settings',
]

function readHash(): { view: AdminView; productId: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [tab, ...rest] = raw.split('/')
  const view = (ADMIN_VIEWS as string[]).includes(tab) ? (tab as AdminView) : 'products'
  const id = decodeURIComponent(rest.join('/'))
  return { view, productId: id || null }
}

function writeHash(view: AdminView, productId: string | null) {
  const next = `#${view}${productId ? `/${encodeURIComponent(productId)}` : ''}`
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', window.location.pathname + next)
  }
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [view, setView] = useState<AdminView>(() => readHash().view)
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState('')
  // Product id taken from the address bar on load — the form opens as soon as
  // the catalogue arrives, so a refresh keeps you exactly where you were.
  const [pendingEdit, setPendingEdit] = useState<string | null>(() => readHash().productId)

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3000)
  }, [])

  const load = useCallback(async () => {
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .order('sort', { ascending: true })
    if (!error && data) setRows(data as ProductRow[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Keep the address bar in sync with what is on screen.
  useEffect(() => {
    writeHash(view, editing ? (isNew ? 'new' : editing.id) : null)
  }, [view, editing, isNew])

  // Reopen the product that was open before the refresh.
  useEffect(() => {
    if (!pendingEdit || rows.length === 0) return
    if (pendingEdit === 'new') {
      setEditing(emptyRow())
      setIsNew(true)
    } else {
      const found = rows.find((r) => r.id === pendingEdit)
      if (found) {
        setEditing({ ...found })
        setIsNew(false)
      }
    }
    setPendingEdit(null)
  }, [pendingEdit, rows])

  // Browser Back / Forward inside the admin.
  useEffect(() => {
    const onPop = () => {
      const { view: v, productId } = readHash()
      setView(v)
      if (productId) setPendingEdit(productId)
      else setEditing(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /** Switching tabs always closes an open product form. */
  const go = (next: AdminView) => {
    setEditing(null)
    setIsNew(false)
    setView(next)
  }

  const patch = async (id: string, changes: Partial<ProductRow>) => {
    const { error } = await supabase!.from('products').update(changes).eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)))
      notify('Uloženo ✓')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Opravdu smazat tento produkt? Akce je nevratná.')) return
    const { error } = await supabase!.from('products').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else {
      setRows((rs) => rs.filter((r) => r.id !== id))
      notify('Produkt smazán')
    }
  }

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !filter ||
          (r.name_cs ?? '').toLowerCase().includes(filter.toLowerCase()) ||
          r.id.includes(filter.toLowerCase()),
      ),
    [rows, filter],
  )

  return (
    <div className="admin">
      <header className="admin__head">
        <div className="admin__head-brand">
          <span>🧸</span>
          <strong>Little One Store — administrace</strong>
        </div>
        <nav className="admin__tabs">
          <button
            className={view === 'products' ? 'is-active' : ''}
            onClick={() => go('products')}
          >
            Produkty
          </button>
          <button
            className={view === 'orders' ? 'is-active' : ''}
            onClick={() => go('orders')}
          >
            Objednávky
          </button>
          <button
            className={view === 'inventory' ? 'is-active' : ''}
            onClick={() => go('inventory')}
          >
            Sklad
          </button>
          <button
            className={view === 'shipping' ? 'is-active' : ''}
            onClick={() => go('shipping')}
          >
            Doprava
          </button>
          <button
            className={view === 'sales' ? 'is-active' : ''}
            onClick={() => go('sales')}
          >
            Akce
          </button>
          <button
            className={view === 'promos' ? 'is-active' : ''}
            onClick={() => go('promos')}
          >
            Slevy a poukazy
          </button>
          <button
            className={view === 'reviews' ? 'is-active' : ''}
            onClick={() => go('reviews')}
          >
            Recenze
          </button>
          <button
            className={view === 'subscribers' ? 'is-active' : ''}
            onClick={() => go('subscribers')}
          >
            Odběratelé
          </button>
          <button
            className={view === 'stats' ? 'is-active' : ''}
            onClick={() => go('stats')}
          >
            Statistiky
          </button>
          <button
            className={view === 'settings' ? 'is-active' : ''}
            onClick={() => go('settings')}
          >
            Nastavení
          </button>
        </nav>
        <div className="admin__head-actions">
          <a href="/" target="_blank" rel="noreferrer">Zobrazit web ↗</a>
          <button onClick={onSignOut}>Odhlásit</button>
        </div>
      </header>

      {view === 'settings' ? (
        <SettingsView notify={notify} products={rows} />
      ) : view === 'orders' ? (
        <OrdersView notify={notify} />
      ) : view === 'inventory' ? (
        <InventoryView
          notify={notify}
          products={rows.filter((r) => !r.is_gift_card)}
          onStockChange={(id, qty) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, stock_qty: qty } : r)))}
          onVariantsChange={(id, variants, qty) =>
            setRows((rs) =>
              rs.map((r) => (r.id === id ? { ...r, stock_variants: variants, stock_qty: qty } : r)),
            )
          }
          onSeasonsChange={(id, seasons) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, seasons } : r)))}
        />
      ) : view === 'shipping' ? (
        <ShippingView notify={notify} />
      ) : view === 'sales' ? (
        <SalesView notify={notify} products={rows} />
      ) : view === 'promos' ? (
        <PromosView notify={notify} />
      ) : view === 'reviews' ? (
        <ReviewsAdminView notify={notify} products={rows} />
      ) : view === 'subscribers' ? (
        <SubscribersView />
      ) : view === 'stats' ? (
        <StatsView products={rows} />
      ) : editing ? (
        <ProductForm
          row={editing}
          isNew={isNew}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setRows((rs) => {
              const exists = rs.some((r) => r.id === saved.id)
              return exists ? rs.map((r) => (r.id === saved.id ? saved : r)) : [...rs, saved]
            })
            setEditing(null)
          }}
        />
      ) : (
        <main className="admin__main">
          <div className="admin__toolbar">
            <input
              placeholder="Hledat produkt…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button
              className="admin__btn admin__btn--primary"
              onClick={() => {
                setEditing(emptyRow())
                setIsNew(true)
              }}
            >
              + Přidat produkt
            </button>
          </div>

          <div className="admin__list">
            {filtered.map((r) => (
              <div className={`admin__row ${r.hidden ? 'is-hidden' : ''}`} key={r.id}>
                <div
                  className="admin__thumb"
                  style={{ background: r.gradient ?? '#eee' }}
                >
                  {r.colors?.[0]?.images?.[0] ? (
                    <img src={r.colors[0].images[0]} alt="" loading="lazy" />
                  ) : (
                    <span>{r.emoji}</span>
                  )}
                </div>
                <div className="admin__row-main">
                  <strong>{r.name_cs || r.id}</strong>
                  <span className="admin__muted">
                    {CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category} ·{' '}
                    {r.price_czk} Kč
                    {r.badge ? ` · ${r.badge}` : ''}
                    {r.hidden ? ' · skrytý' : ''}
                    {!r.in_stock ? ' · vyprodáno' : ''}
                    {r.is_gift_card
                      ? ' · 🎁 dárkový poukaz'
                      : r.stock_qty != null
                        ? ` · sklad: ${r.stock_qty} ks`
                        : ' · sklad: nesleduje se'}
                  </span>
                </div>
                <div className="admin__row-actions">
                  <label className="admin__switch" title="Skladem">
                    <input
                      type="checkbox"
                      checked={r.in_stock}
                      onChange={(e) => void patch(r.id, { in_stock: e.target.checked })}
                    />
                    <span>Skladem</span>
                  </label>
                  <label className="admin__switch" title="Zveřejněno na webu">
                    <input
                      type="checkbox"
                      checked={!r.hidden}
                      onChange={(e) => void patch(r.id, { hidden: !e.target.checked })}
                    />
                    <span>Zveřejněno</span>
                  </label>
                  <button
                    className="admin__btn"
                    onClick={() => {
                      setEditing({ ...r })
                      setIsNew(false)
                    }}
                  >
                    Upravit
                  </button>
                  <button className="admin__btn admin__btn--danger" onClick={() => void remove(r.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="admin__muted">Žádné produkty.</p>}
          </div>
        </main>
      )}

      {toast && <div className="admin__toast">{toast}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

interface OrderRow {
  id: string
  order_number: number
  created_at: string
  status: string
  customer_name: string
  email: string
  phone: string
  address: string
  city: string
  zip: string
  note: string | null
  items: {
    id: string
    name_cs?: string
    name: string
    size: string
    color: string
    qty: number
    price_czk: number
  }[]
  subtotal_czk: number
  shipping_czk: number
  total_czk: number
  discount_code?: string | null
  discount_czk?: number | null
  gift_card_code?: string | null
  gift_card_czk?: number | null
  vat_rate?: number | null
  vat_czk?: number | null
  vat_base_czk?: number | null
  payment_method: string
  tracking_number?: string | null
  carrier?: string | null
  tracking_url?: string | null
  fulfilled_at?: string | null
  fulfilled_items?: number[] | null
  shipping_method?: string | null
  shipping_name?: string | null
  pickup_point_id?: string | null
  pickup_point_name?: string | null
  invoice_url?: string | null
  invoice_pdf?: string | null
}

const ORDER_STATUSES: Record<string, string> = {
  pending: 'Nedokončená (nezaplaceno)',
  new: 'Nová',
  paid: 'Zaplacená',
  shipped: 'Odesláno',
  done: 'Vyřízená',
  cancelled: 'Zrušená',
}

/** Real orders the shop owner must act on. */
const ACTIVE_STATUSES = ['new', 'paid', 'shipped', 'done']

const ORDER_FILTERS: { key: 'active' | 'pending' | 'cancelled' | 'all'; label: string }[] = [
  { key: 'active', label: '📦 Objednávky' },
  { key: 'pending', label: '⏳ Nedokončené' },
  { key: 'cancelled', label: '🚫 Zrušené' },
  { key: 'all', label: 'Vše' },
]

function OrdersView({ notify }: { notify: (m: string) => void }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [fulfillId, setFulfillId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'pending' | 'cancelled' | 'all'>('active')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase!
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error && data) setOrders(data as OrderRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase!.from('orders').update({ status }).eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else {
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)))
      notify('Stav objednávky uložen ✓')
    }
  }

  /** Persist tracking details, flip status to "shipped" and e-mail the customer. */
  const fulfill = async (
    order: OrderRow,
    payload: {
      tracking_number: string
      carrier: string
      tracking_url: string
      fulfilled_items: number[]
    },
  ): Promise<boolean> => {
    const changes = {
      status: 'shipped',
      tracking_number: payload.tracking_number || null,
      carrier: payload.carrier || null,
      tracking_url: payload.tracking_url || null,
      fulfilled_items: payload.fulfilled_items,
      fulfilled_at: new Date().toISOString(),
    }
    const { error } = await supabase!.from('orders').update(changes).eq('id', order.id)
    if (error) {
      notify('Chyba: ' + error.message)
      return false
    }
    const merged = { ...order, ...changes }
    setOrders((os) => os.map((o) => (o.id === order.id ? merged : o)))

    // Send the tracking e-mail to the customer (best-effort — never blocks).
    try {
      const { data } = await supabase!.auth.getSession()
      const token = data.session?.access_token
      const res = await fetch('/api/fulfill-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ order: merged }),
      })
      if (res.ok) notify('Objednávka odeslána ✓ E-mail zákazníkovi odeslán.')
      else notify('Objednávka označena jako odeslaná ✓ (e-mail se nepodařilo odeslat)')
    } catch {
      notify('Objednávka označena jako odeslaná ✓ (e-mail se nepodařilo odeslat)')
    }
    setFulfillId(null)
    return true
  }

  const remove = async (id: string) => {
    if (!window.confirm('Opravdu smazat tuto objednávku?')) return
    const { error } = await supabase!.from('orders').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else {
      setOrders((os) => os.filter((o) => o.id !== id))
      notify('Objednávka smazána')
    }
  }

  if (loading) return <main className="admin__main"><p className="admin__muted">Načítání…</p></main>

  const counts = {
    active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
    pending: orders.filter((o) => o.status === 'pending').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    all: orders.length,
  }
  const shown = orders.filter((o) =>
    filter === 'all'
      ? true
      : filter === 'active'
        ? ACTIVE_STATUSES.includes(o.status)
        : o.status === filter,
  )

  return (
    <main className="admin__main">
      <div className="admin__range">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`admin__range-pill ${filter === f.key ? 'is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="admin__range-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {filter === 'pending' && (
        <div className="admin__notice">
          <strong>⏳ Nedokončené pokusy o platbu</strong>
          <span>
            Zákazník začal platbu kartou, ale nedokončil ji — <strong>tyto objednávky nejsou
            zaplacené, nic neposílejte</strong>. Stripe je po čase sám zruší a zboží se vrátí na
            sklad. Do tržeb ani statistik se nepočítají.
          </span>
        </div>
      )}

      {shown.length === 0 && (
        <div className="admin__card admin__card--narrow">
          <p className="admin__muted">
            {filter === 'active'
              ? 'Zatím žádné objednávky. Jakmile zákazník dokončí pokladnu, objeví se tady.'
              : 'V této kategorii nic není.'}
          </p>
        </div>
      )}
      <div className="admin__list">
        {shown.map((o) => (
          <div className="admin__row admin__order" key={o.id}>
            <div className="admin__row-main" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
              <strong>
                #{o.order_number} · {o.customer_name} · {o.total_czk} Kč
              </strong>
              <span className="admin__muted">
                {new Date(o.created_at).toLocaleString('cs-CZ')} · {o.city} ·{' '}
                {o.items?.reduce((s, i) => s + i.qty, 0)} ks ·{' '}
                {o.payment_method === 'cod' ? 'dobírka/převod' : o.payment_method}
              </span>
            </div>
            <div className="admin__row-actions">
              <select
                className={`admin__status admin__status--${o.status}`}
                value={o.status}
                onChange={(e) => void setStatus(o.id, e.target.value)}
              >
                {Object.entries(ORDER_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {o.status !== 'pending' && (
                <button
                  className={`admin__btn ${o.status === 'shipped' || o.status === 'done' ? '' : 'admin__btn--primary'}`}
                  onClick={() => setFulfillId(o.id)}
                >
                  {o.status === 'shipped' || o.status === 'done' ? '📦 Upravit odeslání' : '📦 Odeslat objednávku'}
                </button>
              )}
              {(o.invoice_pdf || o.invoice_url) && (
                <a
                  className="admin__btn"
                  href={o.invoice_pdf || o.invoice_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  title="Stáhnout fakturu v PDF"
                >
                  📄 Faktura
                </a>
              )}
              <button className="admin__btn" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                {openId === o.id ? 'Skrýt' : 'Detail'}
              </button>
              <button className="admin__btn admin__btn--danger" onClick={() => void remove(o.id)}>
                Smazat
              </button>
            </div>

            {openId === o.id && (
              <div className="admin__order-detail">
                <div>
                  <h4>Zákazník</h4>
                  <p>
                    {o.customer_name}
                    <br />
                    ✉️ <a href={`mailto:${o.email}`}>{o.email}</a>
                    <br />
                    📞 <a href={`tel:${o.phone}`}>{o.phone}</a>
                  </p>
                  <h4>Doručovací adresa</h4>
                  <p>
                    {o.address}
                    <br />
                    {o.zip} {o.city}
                  </p>
                  {(o.shipping_name || o.pickup_point_name) && (
                    <>
                      <h4>Zvolená doprava</h4>
                      <p>
                        🚚 {o.shipping_name ?? o.shipping_method}
                        {o.pickup_point_name && (
                          <>
                            <br />
                            📍 <strong>{o.pickup_point_name}</strong>
                            {o.pickup_point_id ? ` (${o.pickup_point_id})` : ''}
                          </>
                        )}
                      </p>
                    </>
                  )}
                  {o.note && (
                    <>
                      <h4>Poznámka</h4>
                      <p>{o.note}</p>
                    </>
                  )}
                </div>
                <div>
                  <h4>Položky</h4>
                  <ul>
                    {o.items?.map((i, x) => (
                      <li key={x}>
                        {i.qty}× {i.name_cs ?? i.name} — {i.color}, {i.size} · {i.price_czk * i.qty} Kč
                      </li>
                    ))}
                  </ul>
                  <p className="admin__order-totals">
                    <span>Mezisoučet: {o.subtotal_czk} Kč</span>
                    {Number(o.discount_czk) > 0 && (
                      <span className="admin__minus">
                        Sleva {o.discount_code} −{o.discount_czk} Kč
                      </span>
                    )}
                    <span>Doprava: {o.shipping_czk} Kč</span>
                    {Number(o.gift_card_czk) > 0 && (
                      <span className="admin__minus">
                        🎁 Dárkový poukaz {o.gift_card_code} −{o.gift_card_czk} Kč
                      </span>
                    )}
                    <strong>Celkem: {o.total_czk} Kč</strong>
                    {Number(o.vat_czk) > 0 && (
                      <span className="admin__muted admin__small">
                        z toho základ daně {o.vat_base_czk} Kč · DPH {o.vat_rate} %{' '}
                        {o.vat_czk} Kč
                      </span>
                    )}
                  </p>
                  {(o.invoice_pdf || o.invoice_url) && (
                    <p>
                      <a
                        className="admin__btn"
                        href={o.invoice_pdf || o.invoice_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📄 Faktura (PDF)
                      </a>
                    </p>
                  )}
                  {o.tracking_number && (
                    <div className="admin__tracking-info">
                      <h4>Doprava</h4>
                      <p>
                        {o.carrier ? CARRIERS.find((c) => c.id === o.carrier)?.label ?? o.carrier : '—'} ·{' '}
                        <strong>{o.tracking_number}</strong>
                        {o.tracking_url && (
                          <>
                            <br />
                            <a href={o.tracking_url} target="_blank" rel="noreferrer">
                              Sledovat zásilku ↗
                            </a>
                          </>
                        )}
                        {o.fulfilled_at && (
                          <>
                            <br />
                            <span className="admin__muted">
                              Odesláno {new Date(o.fulfilled_at).toLocaleString('cs-CZ')}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {fulfillId && (
        <FulfillModal
          order={orders.find((o) => o.id === fulfillId)!}
          onClose={() => setFulfillId(null)}
          onFulfill={fulfill}
        />
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Fulfillment modal                                                   */
/* ------------------------------------------------------------------ */

function FulfillModal({
  order,
  onClose,
  onFulfill,
}: {
  order: OrderRow
  onClose: () => void
  onFulfill: (
    order: OrderRow,
    payload: { tracking_number: string; carrier: string; tracking_url: string; fulfilled_items: number[] },
  ) => Promise<boolean>
}) {
  const items = order.items ?? []
  const [carrier, setCarrier] = useState(order.carrier || 'zasilkovna')
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '')
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url || '')
  const [urlTouched, setUrlTouched] = useState(false)
  const [selected, setSelected] = useState<number[]>(
    order.fulfilled_items && order.fulfilled_items.length
      ? order.fulfilled_items
      : items.map((_, i) => i),
  )
  const [busy, setBusy] = useState(false)

  const placeholder = CARRIERS.find((c) => c.id === carrier)?.placeholder

  // Auto-generate the tracking URL from carrier + number unless the admin edited it.
  useEffect(() => {
    if (urlTouched) return
    setTrackingUrl(makeTrackingUrl(carrier, trackingNumber))
  }, [carrier, trackingNumber, urlTouched])

  const toggle = (i: number) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await onFulfill(order, {
      tracking_number: trackingNumber.trim(),
      carrier,
      tracking_url: trackingUrl.trim(),
      fulfilled_items: selected,
    })
    if (!ok) setBusy(false)
  }

  return (
    <div className="admin__modal-overlay" onClick={onClose}>
      <div className="admin__modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="admin__modal-head">
            <h2>Odeslat objednávku #{order.order_number}</h2>
            <button type="button" className="admin__modal-close" onClick={onClose} aria-label="Zavřít">
              ×
            </button>
          </div>

          <div className="admin__modal-body">
            <div className="admin__fulfill-grid">
              <div className="admin__fulfill-col">
                <h4>Zákazník</h4>
                <p className="admin__fulfill-customer">
                  {order.customer_name}
                  <br />
                  ✉️ <a href={`mailto:${order.email}`}>{order.email}</a>
                  <br />
                  📞 <a href={`tel:${order.phone}`}>{order.phone}</a>
                  <br />
                  📍 {order.address}, {order.zip} {order.city}
                </p>
              </div>
              <div className="admin__fulfill-col">
                <h4>Souhrn</h4>
                <p className="admin__muted">
                  {items.reduce((s, i) => s + i.qty, 0)} ks ·{' '}
                  {order.payment_method === 'cod' ? 'dobírka/převod' : order.payment_method}
                  <br />
                  Celkem: <strong>{order.total_czk} Kč</strong>
                </p>
              </div>
            </div>

            <h4>Položky k odeslání</h4>
            <div className="admin__fulfill-items">
              {items.map((i, x) => (
                <label key={x} className="admin__fulfill-item">
                  <input type="checkbox" checked={selected.includes(x)} onChange={() => toggle(x)} />
                  <span>
                    <strong>{i.qty}×</strong> {i.name_cs ?? i.name}
                    <span className="admin__muted"> — {i.color}, {i.size}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="admin__fulfill-grid">
              <label>
                Přepravce
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                  {CARRIERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sledovací číslo
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={placeholder || 'Zadejte sledovací číslo'}
                />
              </label>
            </div>

            <label>
              Sledovací odkaz (generuje se automaticky)
              <input
                value={trackingUrl}
                onChange={(e) => {
                  setUrlTouched(true)
                  setTrackingUrl(e.target.value)
                }}
                placeholder="https://…"
              />
            </label>
            {urlTouched && (
              <button
                type="button"
                className="admin__btn admin__btn--small"
                onClick={() => {
                  setUrlTouched(false)
                  setTrackingUrl(makeTrackingUrl(carrier, trackingNumber))
                }}
              >
                ↺ Vygenerovat odkaz automaticky
              </button>
            )}

            <p className="admin__muted admin__fulfill-note">
              Po odeslání se stav objednávky změní na <strong>Odesláno</strong> a zákazníkovi se
              automaticky odešle e-mail se sledovacím číslem a odkazem (česky).
            </p>
          </div>

          <div className="admin__modal-foot">
            <button type="button" className="admin__btn" onClick={onClose}>
              Zrušit
            </button>
            <button className="admin__btn admin__btn--primary" disabled={busy}>
              {busy ? 'Odesílám…' : '📦 Označit jako odesláno a poslat e-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shipping methods (Doprava)                                          */
/* ------------------------------------------------------------------ */

interface ShippingRow {
  id: string
  code: string
  name_cs: string
  name_en: string | null
  name_uk: string | null
  note_cs: string | null
  price_czk: number
  free_over_czk: number | null
  kind: 'address' | 'pickup'
  carrier: string | null
  cod_allowed: boolean
  active: boolean
  sort: number
}

const CARRIER_LABELS: Record<string, string> = {
  zasilkovna: 'Zásilkovna / Packeta',
  ppl: 'PPL',
  balikovna: 'Balíkovna / Česká pošta',
  dpd: 'DPD',
  gls: 'GLS',
  other: 'Jiný',
}

function ShippingView({ notify }: { notify: (m: string) => void }) {
  const [rows, setRows] = useState<ShippingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [edited, setEdited] = useState<Record<string, Partial<ShippingRow>>>({})
  const [packetaKey, setPacketaKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  // New method form
  const [nName, setNName] = useState('')
  const [nPrice, setNPrice] = useState('90')
  const [nFree, setNFree] = useState('2000')
  const [nKind, setNKind] = useState<'address' | 'pickup'>('address')
  const [nCarrier, setNCarrier] = useState('zasilkovna')

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([
      supabase!.from('shipping_methods').select('*').order('sort', { ascending: true }),
      supabase!.from('site_settings').select('value').eq('key', 'shipping').maybeSingle(),
    ])
    if (m.data) setRows(m.data as ShippingRow[])
    const cfg = (s.data?.value ?? {}) as { packeta_api_key?: string }
    setPacketaKey(cfg.packeta_api_key ?? '')
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patch = (id: string, changes: Partial<ShippingRow>) =>
    setEdited((e) => ({ ...e, [id]: { ...e[id], ...changes } }))

  const save = async (row: ShippingRow) => {
    const changes = edited[row.id]
    if (!changes) return
    const { error } = await supabase!.from('shipping_methods').update(changes).eq('id', row.id)
    if (error) {
      notify('Chyba: ' + error.message)
      return
    }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...changes } : r)))
    setEdited((e) => {
      const c = { ...e }
      delete c[row.id]
      return c
    })
    notify('Doprava uložena ✓')
  }

  const toggle = async (row: ShippingRow) => {
    const { error } = await supabase!
      .from('shipping_methods')
      .update({ active: !row.active })
      .eq('id', row.id)
    if (error) notify('Chyba: ' + error.message)
    else setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, active: !row.active } : r)))
  }

  const remove = async (id: string) => {
    if (!window.confirm('Opravdu smazat tento způsob dopravy?')) return
    const { error } = await supabase!.from('shipping_methods').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else setRows((rs) => rs.filter((r) => r.id !== id))
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!nName.trim()) {
      notify('Zadejte název dopravy.')
      return
    }
    const code = `${nCarrier}-${nKind}-${Date.now().toString(36).slice(-4)}`
    const { data, error } = await supabase!
      .from('shipping_methods')
      .insert({
        code,
        name_cs: nName.trim(),
        price_czk: Number(nPrice) || 0,
        free_over_czk: nFree.trim() === '' ? null : Number(nFree),
        kind: nKind,
        carrier: nCarrier,
        sort: (rows[rows.length - 1]?.sort ?? 0) + 10,
      })
      .select()
      .single()
    if (error) {
      notify('Chyba: ' + error.message)
      return
    }
    setRows((rs) => [...rs, data as ShippingRow])
    setNName('')
    notify('Doprava přidána ✓')
  }

  const savePacketaKey = async () => {
    setSavingKey(true)
    const { data } = await supabase!
      .from('site_settings')
      .select('value')
      .eq('key', 'shipping')
      .maybeSingle()
    const cur = (data?.value ?? {}) as Record<string, unknown>
    const { error } = await supabase!
      .from('site_settings')
      .upsert({ key: 'shipping', value: { ...cur, packeta_api_key: packetaKey.trim() || null } })
    setSavingKey(false)
    notify(error ? 'Chyba: ' + error.message : 'Klíč uložen ✓')
  }

  if (loading)
    return (
      <main className="admin__main">
        <p className="admin__muted">Načítání…</p>
      </main>
    )

  return (
    <main className="admin__main">
      <div className="admin__card">
        <h2 className="admin__chart-title">🚚 Způsoby dopravy</h2>
        <p className="admin__muted admin__small">
          Zákazník si v pokladně vybere jeden ze zapnutých způsobů. „Výdejní místo" znamená, že si
          zákazník musí vybrat konkrétní pobočku (u Zásilkovny přes mapu). Prázdné pole „Zdarma od"
          = doprava nikdy není zdarma.
        </p>

        <table className="admin__table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Cena (Kč)</th>
              <th>Zdarma od (Kč)</th>
              <th>Typ</th>
              <th>Dobírka</th>
              <th>Stav</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const e = edited[r.id] ?? {}
              const val = <K extends keyof ShippingRow>(k: K): ShippingRow[K] =>
                (e[k] !== undefined ? e[k] : r[k]) as ShippingRow[K]
              return (
                <tr key={r.id} className={r.active ? '' : 'is-muted'}>
                  <td>
                    <input
                      className="admin__ship-name"
                      value={String(val('name_cs'))}
                      onChange={(ev) => patch(r.id, { name_cs: ev.target.value })}
                    />
                    <div className="admin__muted admin__small">
                      {CARRIER_LABELS[r.carrier ?? 'other'] ?? r.carrier}
                    </div>
                  </td>
                  <td>
                    <input
                      className="admin__stock-input"
                      type="number"
                      min="0"
                      value={String(val('price_czk'))}
                      onChange={(ev) => patch(r.id, { price_czk: Number(ev.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin__stock-input"
                      type="number"
                      min="0"
                      placeholder="nikdy"
                      value={val('free_over_czk') == null ? '' : String(val('free_over_czk'))}
                      onChange={(ev) =>
                        patch(r.id, {
                          free_over_czk: ev.target.value === '' ? null : Number(ev.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="admin__small">
                    {r.kind === 'pickup' ? '📍 Výdejní místo' : '🏠 Na adresu'}
                  </td>
                  <td>
                    <label className="admin__switch">
                      <input
                        type="checkbox"
                        checked={Boolean(val('cod_allowed'))}
                        onChange={(ev) => patch(r.id, { cod_allowed: ev.target.checked })}
                      />
                      <span>{val('cod_allowed') ? 'Ano' : 'Ne'}</span>
                    </label>
                  </td>
                  <td>
                    <label className="admin__switch">
                      <input type="checkbox" checked={r.active} onChange={() => void toggle(r)} />
                      <span>{r.active ? 'Zapnuto' : 'Vypnuto'}</span>
                    </label>
                  </td>
                  <td>
                    {edited[r.id] && (
                      <button className="admin__btn admin__btn--primary" onClick={() => void save(r)}>
                        Uložit
                      </button>
                    )}{' '}
                    <button className="admin__btn admin__btn--danger" onClick={() => void remove(r.id)}>
                      Smazat
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <h3 style={{ marginTop: 24 }}>+ Přidat způsob dopravy</h3>
        <form className="admin__promo-form" onSubmit={create}>
          <div className="admin__promo-grid">
            <label>
              Název (česky)
              <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="DPD — na adresu" />
            </label>
            <label>
              Přepravce
              <select value={nCarrier} onChange={(e) => setNCarrier(e.target.value)}>
                {Object.entries(CARRIER_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Typ
              <select value={nKind} onChange={(e) => setNKind(e.target.value as 'address' | 'pickup')}>
                <option value="address">Na adresu</option>
                <option value="pickup">Výdejní místo</option>
              </select>
            </label>
            <label>
              Cena (Kč)
              <input type="number" min="0" value={nPrice} onChange={(e) => setNPrice(e.target.value)} />
            </label>
            <label>
              Zdarma od (Kč)
              <input type="number" min="0" value={nFree} onChange={(e) => setNFree(e.target.value)} placeholder="nikdy" />
            </label>
          </div>
          <button className="admin__btn admin__btn--primary">+ Přidat</button>
        </form>
      </div>

      <div className="admin__card" style={{ marginTop: 18 }}>
        <h2 className="admin__chart-title">📍 Widget Zásilkovny (výběr výdejního místa)</h2>
        <p className="admin__muted admin__small">
          Aby si zákazník mohl vybrat výdejní místo přímo na mapě, vložte sem API klíč z účtu
          Zásilkovna (client.packeta.com → Nastavení → API). Bez klíče se zákazníkovi otevře
          veřejná mapa a název pobočky vypíše ručně — objednávka funguje v obou případech.
        </p>
        <div className="admin__promo-grid">
          <label>
            Packeta API klíč
            <input
              value={packetaKey}
              onChange={(e) => setPacketaKey(e.target.value)}
              placeholder="např. a1b2c3d4e5f6..."
            />
          </label>
        </div>
        <button className="admin__btn admin__btn--primary" disabled={savingKey} onClick={() => void savePacketaKey()}>
          {savingKey ? 'Ukládám…' : 'Uložit klíč'}
        </button>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Inventory (Sklad)                                                   */
/* ------------------------------------------------------------------ */

interface MovementRow {
  id: string
  created_at: string
  type: 'delivery' | 'order' | 'restock' | 'adjustment'
  note: string | null
  order_number: number | null
  items: { id: string; name?: string; qty: number; size?: string | null; color?: string | null }[]
  created_by: string | null
}

const MOVEMENT_LABELS: Record<string, string> = {
  delivery: '📦 Naskladnění',
  order: '🛒 Objednávka',
  restock: '↩️ Vráceno na sklad',
  adjustment: '✏️ Ruční úprava',
}

/* ---- Read-only breakdown by colour + size ------------------------- */
/* Editing lives in the product form (tab „Produkty"), so there is only
   one place where the shop owner types numbers.                        */

function VariantBreakdown({ row }: { row: ProductRow }) {
  const saved = parseVariants(row.stock_variants)
  const colors = row.colors ?? []
  const sizes = row.sizes ?? []

  if (Object.keys(saved).length === 0) {
    return (
      <p className="admin__muted admin__small">
        Sklad se u tohoto produktu nesleduje po variantách. Rozepíšete ho v záložce
        <strong> Produkty</strong> → otevřít produkt → sekce <strong>Barevné varianty a fotky</strong>.
      </p>
    )
  }

  return (
    <div className="admin__breakdown">
      {colors.map((c) => {
        const lines = sizes
          .map((s) => ({ size: s, qty: saved[variantKey(s, c.name)] }))
          .filter((x) => x.qty != null)
        if (lines.length === 0) return null
        const total = lines.reduce((a, b) => a + (b.qty ?? 0), 0)
        return (
          <div className="admin__breakdown-col" key={c.name}>
            <div className="admin__breakdown-head">
              <span className="admin__matrix-dot" style={{ background: c.hex }} />
              {c.name}
              <span className="admin__breakdown-total">{total} ks</span>
            </div>
            {lines.map((l) => (
              <div
                className={`admin__breakdown-line ${(l.qty ?? 0) <= 0 ? 'is-out' : ''}`}
                key={l.size}
              >
                <span>{l.size}</span>
                <strong>{l.qty} ks</strong>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function InventoryView({
  notify,
  products,
  onStockChange,
  onVariantsChange,
  onSeasonsChange,
}: {
  notify: (m: string) => void
  products: ProductRow[]
  onStockChange: (id: string, qty: number | null) => void
  onVariantsChange: (id: string, variants: StockVariants, qty: number) => void
  onSeasonsChange: (id: string, seasons: string[]) => void
}) {
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [openMatrix, setOpenMatrix] = useState<string | null>(null)
  const [deliveryRows, setDeliveryRows] = useState<
    { id: string; qty: string; size: string; color: string }[]
  >([{ id: '', qty: '', size: '', color: '' }])
  const [deliveryNote, setDeliveryNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [edited, setEdited] = useState<Record<string, string>>({})

  const loadMovements = useCallback(async () => {
    const { data } = await supabase!
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setMovements(data as MovementRow[])
  }, [])

  useEffect(() => {
    void loadMovements()
  }, [loadMovements])

  const userEmail = async () => (await supabase!.auth.getUser()).data.user?.email ?? null

  const name = (id: string) => products.find((p) => p.id === id)?.name_cs ?? id

  /** Quick season toggle straight from the stock table. */
  const toggleSeason = async (row: ProductRow, season: string) => {
    const current = row.seasons ?? []
    const next = current.includes(season)
      ? current.filter((s) => s !== season)
      : [...current, season]
    const { error } = await supabase!.from('products').update({ seasons: next }).eq('id', row.id)
    if (error) notify('Chyba: ' + error.message)
    else onSeasonsChange(row.id, next)
  }

  /** Manual stock correction for a single product (logged as adjustment). */
  const saveAdjustment = async (row: ProductRow) => {
    const raw = edited[row.id]
    if (raw === undefined) return
    const newQty = raw.trim() === '' ? null : Math.max(0, parseInt(raw, 10) || 0)
    const { error } = await supabase!.from('products').update({ stock_qty: newQty }).eq('id', row.id)
    if (error) {
      notify('Chyba: ' + error.message)
      return
    }
    const delta = (newQty ?? 0) - (row.stock_qty ?? 0)
    if (newQty !== null && delta !== 0) {
      await supabase!.from('stock_movements').insert({
        type: 'adjustment',
        note: 'Ruční úprava stavu',
        items: [{ id: row.id, name: row.name_cs, qty: delta }],
        created_by: await userEmail(),
      })
    }
    onStockChange(row.id, newQty)
    setEdited((e) => {
      const c = { ...e }
      delete c[row.id]
      return c
    })
    notify('Stav skladu uložen ✓')
    void loadMovements()
  }

  /** Register an incoming delivery: increments stock + writes history. */
  const submitDelivery = async (e: FormEvent) => {
    e.preventDefault()
    const items = deliveryRows
      .map((r) => ({
        id: r.id,
        qty: parseInt(r.qty, 10) || 0,
        size: r.size.trim(),
        color: r.color.trim(),
      }))
      .filter((r) => r.id && r.qty > 0)
    if (items.length === 0) {
      notify('Vyberte alespoň jeden produkt a množství.')
      return
    }
    setBusy(true)
    for (const it of items) {
      const row = products.find((p) => p.id === it.id)
      if (!row) continue
      // A delivery of a specific size + colour lands in that cell of the
      // matrix; the total is then recomputed from the matrix.
      if (it.size && it.color) {
        const variants = parseVariants(row.stock_variants)
        const k = variantKey(it.size, it.color)
        variants[k] = (variants[k] ?? 0) + it.qty
        const sum = Object.values(variants).reduce((a, b) => a + b, 0)
        const { error } = await supabase!
          .from('products')
          .update({ stock_variants: variants, stock_qty: sum })
          .eq('id', it.id)
        if (error) {
          notify('Chyba: ' + error.message)
          setBusy(false)
          return
        }
        onVariantsChange(it.id, variants, sum)
      } else {
        const current = row.stock_qty ?? 0
        const { error } = await supabase!
          .from('products')
          .update({ stock_qty: current + it.qty })
          .eq('id', it.id)
        if (error) {
          notify('Chyba: ' + error.message)
          setBusy(false)
          return
        }
        onStockChange(it.id, current + it.qty)
      }
    }
    const { error: mErr } = await supabase!.from('stock_movements').insert({
      type: 'delivery',
      note: deliveryNote.trim() || null,
      items: items.map((it) => ({
        id: it.id,
        name: name(it.id),
        size: it.size || null,
        color: it.color || null,
        qty: it.qty,
      })),
      created_by: await userEmail(),
    })
    if (mErr) notify('Chyba záznamu: ' + mErr.message)
    else notify('Naskladnění uloženo ✓')
    setDeliveryRows([{ id: '', qty: '', size: '', color: '' }])
    setDeliveryNote('')
    setBusy(false)
    void loadMovements()
  }

  return (
    <main className="admin__main">
      <div className="admin__chart-grid">
        {/* -------- Incoming delivery -------- */}
        <div className="admin__card">
          <h2 className="admin__chart-title">📦 Naskladnit zboží</h2>
          <form onSubmit={submitDelivery}>
            {deliveryRows.map((r, i) => {
              const picked = products.find((p) => p.id === r.id)
              return (
              <div className="admin__delivery-row" key={i}>
                <select
                  value={r.id}
                  onChange={(e) =>
                    setDeliveryRows((rs) =>
                      rs.map((x, j) =>
                        j === i ? { ...x, id: e.target.value, size: '', color: '' } : x,
                      ),
                    )
                  }
                >
                  <option value="">— vyberte produkt —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_cs ?? p.id}
                    </option>
                  ))}
                </select>
                <select
                  value={r.size}
                  disabled={!picked || (picked.sizes ?? []).length === 0}
                  onChange={(e) =>
                    setDeliveryRows((rs) => rs.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))
                  }
                >
                  <option value="">velikost — vše</option>
                  {(picked?.sizes ?? []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={r.color}
                  disabled={!picked || (picked.colors ?? []).length === 0}
                  onChange={(e) =>
                    setDeliveryRows((rs) => rs.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))
                  }
                >
                  <option value="">barva — vše</option>
                  {(picked?.colors ?? []).map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="ks"
                  value={r.qty}
                  onChange={(e) =>
                    setDeliveryRows((rs) => rs.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))
                  }
                />
                {deliveryRows.length > 1 && (
                  <button
                    type="button"
                    className="admin__btn admin__btn--danger"
                    onClick={() => setDeliveryRows((rs) => rs.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                )}
              </div>
              )
            })}
            <p className="admin__muted admin__small">
              Vyberte velikost i barvu, pokud chcete naskladnit konkrétní variantu. Bez výběru
              se kusy přičtou jen k celkovému stavu.
            </p>
            <div className="admin__delivery-actions">
              <button
                type="button"
                className="admin__btn"
                onClick={() =>
                  setDeliveryRows((rs) => [...rs, { id: '', qty: '', size: '', color: '' }])
                }
              >
                + Další produkt
              </button>
            </div>
            <label className="admin__delivery-note">
              Poznámka (nepovinné)
              <input
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="např. dodávka od dodavatele XY"
              />
            </label>
            <button className="admin__btn admin__btn--primary" disabled={busy}>
              {busy ? 'Ukládám…' : '✓ Naskladnit a zapsat do historie'}
            </button>
          </form>
        </div>

        {/* -------- Stock levels -------- */}
        <div className="admin__card">
          <h2 className="admin__chart-title">Stav skladu</h2>
          <p className="admin__muted admin__small">
            Prázdné pole = sklad se u produktu nesleduje. 0 = vyprodáno (produkt se na webu označí
            jako nedostupný). Objednávky odečítají kusy automaticky, zrušené objednávky je vrací.
            Sklad po barvách a velikostech se vyplňuje v záložce <strong>Produkty</strong> u každé
            barevné varianty; tady je jen přehled a naskladnění.
          </p>
          <table className="admin__table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Skladem</th>
                <th></th>
                <th>Sezóny</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const variants = parseVariants(p.stock_variants)
                const byVariant = Object.keys(variants).length > 0
                const open = openMatrix === p.id
                return (
                <Fragment key={p.id}>
                <tr className={p.stock_qty != null && p.stock_qty <= 0 ? 'is-muted' : ''}>
                  <td>
                    <div className="admin__stock-product">
                      <span className="admin__thumb admin__thumb--sm" style={{ background: p.gradient ?? '#eee' }}>
                        {p.colors?.[0]?.images?.[0] ? (
                          <img src={p.colors[0].images[0]} alt="" loading="lazy" />
                        ) : (
                          <span>{p.emoji}</span>
                        )}
                      </span>
                      {p.name_cs ?? p.id}
                    </div>
                  </td>
                  <td>
                    {byVariant ? (
                      <span className="admin__stock-sum" title="Součet všech variant">
                        {p.stock_qty ?? 0} ks
                      </span>
                    ) : (
                      <input
                        className="admin__stock-input"
                        type="number"
                        min="0"
                        placeholder="—"
                        value={edited[p.id] ?? (p.stock_qty == null ? '' : String(p.stock_qty))}
                        onChange={(e) => setEdited((s) => ({ ...s, [p.id]: e.target.value }))}
                      />
                    )}
                  </td>
                  <td>
                    <div className="admin__stock-actions">
                      {!byVariant && edited[p.id] !== undefined && (
                        <button className="admin__btn admin__btn--primary" onClick={() => void saveAdjustment(p)}>
                          Uložit
                        </button>
                      )}
                      {byVariant && (
                        <button
                          className={`admin__btn admin__btn--ghost ${open ? 'is-open' : ''}`}
                          onClick={() => setOpenMatrix(open ? null : p.id)}
                        >
                          🎨 Podle barev {open ? '▴' : '▾'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin__season-mini">
                      {SEASON_OPTIONS.map((s) => (
                        <label key={s.id} title={s.label}>
                          <input
                            type="checkbox"
                            checked={(p.seasons ?? []).includes(s.id)}
                            onChange={() => void toggleSeason(p, s.id)}
                          />
                          <span>{s.label.slice(0, 1)}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="admin__matrix-row">
                    <td colSpan={4}>
                      <VariantBreakdown row={p} />
                    </td>
                  </tr>
                )}
                </Fragment>
                )
              })}
            </tbody>
          </table>
          <p className="admin__muted admin__small">
            Sezóny: J = Jaro, L = Léto, P = Podzim, Z = Zima. Používají je sezónní akce v záložce
            „Akce" — produkt s danou sezónou dostane během akce automaticky slevu.
          </p>
        </div>
      </div>

      {/* -------- Movement history -------- */}
      <div className="admin__card" style={{ marginTop: 18 }}>
        <h2 className="admin__chart-title">Historie pohybů</h2>
        {movements.length === 0 ? (
          <p className="admin__muted">Zatím žádné pohyby na skladu.</p>
        ) : (
          <table className="admin__table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Typ</th>
                <th>Položky</th>
                <th>Poznámka</th>
                <th>Kdo</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString('cs-CZ')}</td>
                  <td>
                    {MOVEMENT_LABELS[m.type] ?? m.type}
                    {m.order_number ? ` #${m.order_number}` : ''}
                  </td>
                  <td>
                    {(m.items ?? []).map((it, i) => (
                      <div key={i}>
                        <strong>{it.qty > 0 ? `+${it.qty}` : it.qty}</strong>{' '}
                        {it.name ?? name(it.id)}
                        {(it.size || it.color) && (
                          <span className="admin__muted admin__small">
                            {' '}
                            ({[it.size, it.color].filter(Boolean).join(' · ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="admin__muted">{m.note ?? ''}</td>
                  <td className="admin__muted">{m.created_by ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Seasonal promotions (Akce)                                          */
/* ------------------------------------------------------------------ */

interface PromotionRow {
  id: string
  name: string
  subtitle: string | null
  percent: number
  cta: string | null
  starts_at: string
  ends_at: string
  seasons: string[]
  banner: boolean
  active: boolean
}

const SEASON_OPTIONS = [
  { id: 'spring', label: 'Jaro' },
  { id: 'summer', label: 'Léto' },
  { id: 'autumn', label: 'Podzim' },
  { id: 'winter', label: 'Zima' },
]

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function SalesView({ notify, products }: { notify: (m: string) => void; products: ProductRow[] }) {
  /** How many products a promotion with the given seasons would discount. */
  const matchCount = (seasons: string[]) =>
    seasons.length === 0
      ? products.length
      : products.filter((p) => (p.seasons ?? []).some((s) => seasons.includes(s))).length
  const [rows, setRows] = useState<PromotionRow[]>([])
  const [loading, setLoading] = useState(true)

  const [fName, setFName] = useState('')
  const [fSubtitle, setFSubtitle] = useState('')
  const [fPercent, setFPercent] = useState('20')
  const [fCta, setFCta] = useState('Nakoupit ve slevě')
  const [fStarts, setFStarts] = useState(toLocalInput(new Date().toISOString()))
  const [fEnds, setFEnds] = useState(
    toLocalInput(new Date(Date.now() + 7 * 86400000).toISOString()),
  )
  const [fSeasons, setFSeasons] = useState<string[]>([])
  const [fBanner, setFBanner] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase!
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setRows(data as PromotionRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const percent = Number(fPercent)
    if (!fName.trim() || !(percent > 0) || percent > 90) {
      notify('Vyplňte název a slevu 1–90 %.')
      return
    }
    const starts = new Date(fStarts)
    const ends = new Date(fEnds)
    if (!(ends > starts)) {
      notify('Konec akce musí být po jejím začátku.')
      return
    }
    const { data, error } = await supabase!
      .from('promotions')
      .insert({
        name: fName.trim(),
        subtitle: fSubtitle.trim() || null,
        percent,
        cta: fCta.trim() || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        seasons: fSeasons,
        banner: fBanner,
      })
      .select()
      .single()
    if (error) {
      notify('Chyba: ' + error.message)
      return
    }
    setRows((rs) => [data as PromotionRow, ...rs])
    setFName('')
    setFSubtitle('')
    notify('Akce vytvořena ✓')
  }

  const toggle = async (row: PromotionRow) => {
    const { error } = await supabase!
      .from('promotions')
      .update({ active: !row.active })
      .eq('id', row.id)
    if (error) notify('Chyba: ' + error.message)
    else setRows((rs) => rs.map((x) => (x.id === row.id ? { ...x, active: !row.active } : x)))
  }

  const remove = async (id: string) => {
    if (!window.confirm('Opravdu smazat tuto akci?')) return
    const { error } = await supabase!.from('promotions').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else setRows((rs) => rs.filter((x) => x.id !== id))
  }

  const statusOf = (r: PromotionRow) => {
    if (!r.active) return { label: 'Vypnutá', cls: 'off' }
    const now = Date.now()
    if (new Date(r.starts_at).getTime() > now) return { label: 'Naplánovaná', cls: 'planned' }
    if (new Date(r.ends_at).getTime() < now) return { label: 'Skončila', cls: 'ended' }
    return { label: '● Běží', cls: 'running' }
  }

  if (loading)
    return (
      <main className="admin__main">
        <p className="admin__muted">Načítání…</p>
      </main>
    )

  return (
    <main className="admin__main">
      <div className="admin__card">
        <h2 className="admin__chart-title">🎉 Nová akce / sezónní výprodej</h2>
        <p className="admin__muted admin__small">
          Akce se sama spustí a skončí podle zvolených dat. Produkty s vybranou sezónou automaticky
          dostanou slevu (na webu i v pokladně) a po skončení akce se ceny samy vrátí. Bez vybrané
          sezóny platí sleva na všechny produkty. „Banner" akci zobrazí na úvodní stránce s
          odpočtem.
        </p>
        <form className="admin__promo-form" onSubmit={create}>
          <div className="admin__promo-grid">
            <label>
              Název akce
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Letní výprodej" />
            </label>
            <label>
              Podtitulek
              <input value={fSubtitle} onChange={(e) => setFSubtitle(e.target.value)} placeholder="Vzdušné kousky za skvělé ceny" />
            </label>
            <label>
              Sleva (%)
              <input type="number" min="1" max="90" value={fPercent} onChange={(e) => setFPercent(e.target.value)} />
            </label>
            <label>
              Text tlačítka
              <input value={fCta} onChange={(e) => setFCta(e.target.value)} />
            </label>
            <label>
              Začátek
              <input type="datetime-local" value={fStarts} onChange={(e) => setFStarts(e.target.value)} />
            </label>
            <label>
              Konec
              <input type="datetime-local" value={fEnds} onChange={(e) => setFEnds(e.target.value)} />
            </label>
          </div>
          <div className="admin__season-row">
            <span>Platí pro sezóny:</span>
            {SEASON_OPTIONS.map((s) => (
              <label key={s.id} className="admin__switch">
                <input
                  type="checkbox"
                  checked={fSeasons.includes(s.id)}
                  onChange={(e) =>
                    setFSeasons((cur) =>
                      e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id),
                    )
                  }
                />
                <span>{s.label}</span>
              </label>
            ))}
            <label className="admin__switch">
              <input type="checkbox" checked={fBanner} onChange={(e) => setFBanner(e.target.checked)} />
              <span>Zobrazit banner na úvodní stránce</span>
            </label>
          </div>
          <p className={matchCount(fSeasons) === 0 ? 'admin__promo-warn' : 'admin__muted admin__small'}>
            {matchCount(fSeasons) === 0
              ? '⚠ Žádný produkt nemá vybrané sezóny — sleva by se na nic nevztahovala. Sezóny produktům přiřadíte v záložce Sklad.'
              : `Sleva se bude vztahovat na ${matchCount(fSeasons)} produktů.`}
          </p>
          <button className="admin__btn admin__btn--primary">+ Vytvořit akci</button>
        </form>

        {rows.length === 0 ? (
          <p className="admin__muted">Zatím žádné akce.</p>
        ) : (
          <table className="admin__table">
            <thead>
              <tr>
                <th>Akce</th>
                <th>Sleva</th>
                <th>Období</th>
                <th>Sezóny</th>
                <th>Stav</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = statusOf(r)
                return (
                  <tr key={r.id} className={st.cls === 'running' ? '' : 'is-muted'}>
                    <td>
                      <strong>{r.name}</strong>
                      {r.banner && <div className="admin__muted admin__small">banner na úvodu</div>}
                    </td>
                    <td>{Math.round(Number(r.percent))} %</td>
                    <td className="admin__small">
                      {new Date(r.starts_at).toLocaleString('cs-CZ')}
                      <br />→ {new Date(r.ends_at).toLocaleString('cs-CZ')}
                    </td>
                    <td className="admin__small">
                      {(r.seasons ?? []).length === 0
                        ? 'všechny produkty'
                        : r.seasons.map((s) => SEASON_OPTIONS.find((x) => x.id === s)?.label ?? s).join(', ')}
                      <div className="admin__muted">{matchCount(r.seasons ?? [])} produktů</div>
                    </td>
                    <td>
                      <span className={`admin__promo-status admin__promo-status--${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      <button className="admin__btn" onClick={() => void toggle(r)}>
                        {r.active ? 'Vypnout' : 'Zapnout'}
                      </button>{' '}
                      <button className="admin__btn admin__btn--danger" onClick={() => void remove(r.id)}>
                        Smazat
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Newsletter subscribers                                              */
/* ------------------------------------------------------------------ */

interface SubscriberRow {
  id: string
  email: string
  discount_code: string | null
  created_at: string
}

function SubscribersView() {
  const [subs, setSubs] = useState<SubscriberRow[]>([])
  const [orderAgg, setOrderAgg] = useState<Record<string, { count: number; total: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [s, o] = await Promise.all([
        supabase!.from('subscribers').select('*').order('created_at', { ascending: false }),
        supabase!.from('orders').select('email,total_czk,status'),
      ])
      if (s.data) setSubs(s.data as SubscriberRow[])
      if (o.data) {
        const agg: Record<string, { count: number; total: number }> = {}
        for (const row of o.data as { email: string; total_czk: number; status: string }[]) {
          if (row.status === 'cancelled' || row.status === 'pending') continue
          const key = (row.email || '').toLowerCase()
          agg[key] = agg[key] || { count: 0, total: 0 }
          agg[key].count++
          agg[key].total += Number(row.total_czk)
        }
        setOrderAgg(agg)
      }
      setLoading(false)
    })()
  }, [])

  const remove = async (id: string) => {
    if (!window.confirm('Odstranit tohoto odběratele?')) return
    const { error } = await supabase!.from('subscribers').delete().eq('id', id)
    if (!error) setSubs((ss) => ss.filter((x) => x.id !== id))
  }

  if (loading)
    return (
      <main className="admin__main">
        <p className="admin__muted">Načítání…</p>
      </main>
    )

  return (
    <main className="admin__main">
      <div className="admin__card">
        <h2 className="admin__chart-title">💌 Odběratelé novinek ({subs.length})</h2>
        {subs.length === 0 ? (
          <p className="admin__muted">
            Zatím žádní odběratelé. Návštěvníci se přihlašují přes formulář na úvodní stránce a
            automaticky dostanou e-mail s osobním 10% kódem.
          </p>
        ) : (
          <table className="admin__table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Přihlášen</th>
                <th>Objednávky</th>
                <th>Utraceno</th>
                <th>Stav</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const a = orderAgg[s.email.toLowerCase()]
                return (
                  <tr key={s.id}>
                    <td>
                      {s.email}
                      {s.discount_code && (
                        <div className="admin__muted admin__small">kód: {s.discount_code}</div>
                      )}
                    </td>
                    <td>{new Date(s.created_at).toLocaleDateString('cs-CZ')}</td>
                    <td>{a?.count ?? 0}</td>
                    <td>{a ? `${Math.round(a.total).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                    <td>
                      <span className={`admin__promo-status admin__promo-status--${a ? 'running' : 'planned'}`}>
                        {a ? 'Zákazník' : 'Jen newsletter'}
                      </span>
                    </td>
                    <td>
                      <button className="admin__btn admin__btn--danger" onClick={() => void remove(s.id)}>
                        Odstranit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Reviews moderation                                                  */
/* ------------------------------------------------------------------ */

interface AdminReviewRow {
  id: string
  product_id: string
  order_number: number | null
  author: string
  rating: number
  text: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const REVIEW_FILTERS: { key: 'pending' | 'approved' | 'rejected' | 'all'; label: string }[] = [
  { key: 'pending', label: 'Čeká na schválení' },
  { key: 'approved', label: 'Schválené' },
  { key: 'rejected', label: 'Zamítnuté' },
  { key: 'all', label: 'Vše' },
]

function ReviewsAdminView({
  notify,
  products,
}: {
  notify: (m: string) => void
  products: ProductRow[]
}) {
  const [rows, setRows] = useState<AdminReviewRow[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase!
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error && data) setRows(data as AdminReviewRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (id: string, status: AdminReviewRow['status']) => {
    const { error } = await supabase!.from('reviews').update({ status }).eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
      notify(status === 'approved' ? 'Recenze schválena ✓ Je teď na webu.' : 'Recenze zamítnuta.')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Opravdu smazat tuto recenzi?')) return
    const { error } = await supabase!.from('reviews').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else setRows((rs) => rs.filter((r) => r.id !== id))
  }

  const name = (id: string) => products.find((p) => p.id === id)?.name_cs ?? id
  const shown = rows.filter((r) => filter === 'all' || r.status === filter)
  const pendingCount = rows.filter((r) => r.status === 'pending').length

  if (loading)
    return (
      <main className="admin__main">
        <p className="admin__muted">Načítání…</p>
      </main>
    )

  return (
    <main className="admin__main">
      <div className="admin__range">
        {REVIEW_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`admin__range-pill ${filter === f.key ? 'is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && (
              <span className="admin__range-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="admin__card admin__card--narrow">
          <p className="admin__muted">
            {filter === 'pending'
              ? 'Žádné recenze nečekají na schválení. Zákazníci dostanou žádost o recenzi e-mailem 20 dní po objednávce.'
              : 'Žádné recenze v této kategorii.'}
          </p>
        </div>
      ) : (
        <div className="admin__list">
          {shown.map((r) => (
            <div className={`admin__row admin__review admin__review--${r.status}`} key={r.id}>
              <div className="admin__row-main">
                <strong>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)} · {name(r.product_id)}
                </strong>
                <p className="admin__review-text">“{r.text}”</p>
                <span className="admin__muted">
                  {r.author}
                  {r.order_number ? ` · objednávka #${r.order_number}` : ''} ·{' '}
                  {new Date(r.created_at).toLocaleDateString('cs-CZ')} ·{' '}
                  {r.status === 'pending'
                    ? '⏳ čeká na schválení'
                    : r.status === 'approved'
                      ? '✅ zveřejněna'
                      : '🚫 zamítnuta'}
                </span>
              </div>
              <div className="admin__row-actions">
                {r.status !== 'approved' && (
                  <button
                    className="admin__btn admin__btn--primary"
                    onClick={() => void setStatus(r.id, 'approved')}
                  >
                    ✓ Schválit
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button className="admin__btn" onClick={() => void setStatus(r.id, 'rejected')}>
                    Zamítnout
                  </button>
                )}
                <button className="admin__btn admin__btn--danger" onClick={() => void remove(r.id)}>
                  Smazat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Discount codes + gift cards                                         */
/* ------------------------------------------------------------------ */

interface DiscountRow {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_subtotal_czk: number
  expires_at: string | null
  max_uses: number | null
  used_count: number
  active: boolean
  note: string | null
}

interface GiftRow {
  id: string
  code: string
  initial_czk: number
  balance_czk: number
  active: boolean
  note: string | null
  expires_at: string | null
  /** Set when the voucher was bought in the e-shop (not created by hand). */
  order_number: number | null
  recipient_email: string | null
  sold_at: string | null
}

const genCode = (prefix: string, blocks = 2) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}${Array.from({ length: blocks }, block).join('-')}`
}

interface RedemptionRow {
  id: string
  kind: 'discount' | 'gift'
  code: string
  order_number: number | null
  amount_czk: number
  balance_before: number | null
  balance_after: number | null
  created_at: string
}

function PromosView({ notify }: { notify: (m: string) => void }) {
  const [codes, setCodes] = useState<DiscountRow[]>([])
  const [gifts, setGifts] = useState<GiftRow[]>([])
  const [uses, setUses] = useState<RedemptionRow[]>([])
  const [loading, setLoading] = useState(true)

  // New discount form
  const [dCode, setDCode] = useState('')
  const [dType, setDType] = useState<'percent' | 'fixed'>('percent')
  const [dValue, setDValue] = useState('10')
  const [dMin, setDMin] = useState('0')
  const [dMaxUses, setDMaxUses] = useState('')
  const [dExpires, setDExpires] = useState('')

  // New gift card form
  const [gValue, setGValue] = useState('500')
  const [gCode, setGCode] = useState(genCode('GIFT-'))
  const [gNote, setGNote] = useState('')

  const load = useCallback(async () => {
    const [d, g, u] = await Promise.all([
      supabase!.from('discount_codes').select('*').order('created_at', { ascending: false }),
      supabase!.from('gift_cards').select('*').order('created_at', { ascending: false }),
      supabase!
        .from('code_redemptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    if (d.data) setCodes(d.data as DiscountRow[])
    if (g.data) setGifts(g.data as GiftRow[])
    if (u.data) setUses(u.data as RedemptionRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createDiscount = async (e: FormEvent) => {
    e.preventDefault()
    const code = dCode.trim().toUpperCase()
    const value = Number(dValue)
    if (!code || !(value > 0)) {
      notify('Vyplňte kód a hodnotu slevy.')
      return
    }
    if (dType === 'percent' && value > 100) {
      notify('Procentní sleva nemůže být vyšší než 100 %.')
      return
    }
    const { data, error } = await supabase!
      .from('discount_codes')
      .insert({
        code,
        type: dType,
        value,
        min_subtotal_czk: Number(dMin) || 0,
        max_uses: dMaxUses ? Number(dMaxUses) : null,
        expires_at: dExpires ? new Date(dExpires + 'T23:59:59').toISOString() : null,
      })
      .select()
      .single()
    if (error) {
      notify(error.code === '23505' ? 'Tento kód už existuje.' : 'Chyba: ' + error.message)
      return
    }
    setCodes((cs) => [data as DiscountRow, ...cs])
    setDCode('')
    setDValue(dType === 'percent' ? '10' : '100')
    setDMaxUses('')
    setDExpires('')
    notify('Slevový kód vytvořen ✓')
  }

  const createGift = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(gValue)
    const code = gCode.trim().toUpperCase()
    if (!code || !(value > 0)) {
      notify('Vyplňte kód a hodnotu poukazu.')
      return
    }
    const { data, error } = await supabase!
      .from('gift_cards')
      .insert({ code, initial_czk: value, balance_czk: value, note: gNote.trim() || null })
      .select()
      .single()
    if (error) {
      notify(error.code === '23505' ? 'Tento kód už existuje.' : 'Chyba: ' + error.message)
      return
    }
    setGifts((gs) => [data as GiftRow, ...gs])
    setGCode(genCode('GIFT-'))
    setGNote('')
    notify('Dárkový poukaz vytvořen ✓')
  }

  const toggleDiscount = async (row: DiscountRow) => {
    const { error } = await supabase!
      .from('discount_codes')
      .update({ active: !row.active })
      .eq('id', row.id)
    if (error) notify('Chyba: ' + error.message)
    else setCodes((cs) => cs.map((x) => (x.id === row.id ? { ...x, active: !row.active } : x)))
  }

  const toggleGift = async (row: GiftRow) => {
    const { error } = await supabase!
      .from('gift_cards')
      .update({ active: !row.active })
      .eq('id', row.id)
    if (error) notify('Chyba: ' + error.message)
    else setGifts((gs) => gs.map((x) => (x.id === row.id ? { ...x, active: !row.active } : x)))
  }

  const removeDiscount = async (id: string) => {
    if (!window.confirm('Opravdu smazat tento slevový kód?')) return
    const { error } = await supabase!.from('discount_codes').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else setCodes((cs) => cs.filter((x) => x.id !== id))
  }

  const removeGift = async (id: string) => {
    if (!window.confirm('Opravdu smazat tento dárkový poukaz?')) return
    const { error } = await supabase!.from('gift_cards').delete().eq('id', id)
    if (error) notify('Chyba: ' + error.message)
    else setGifts((gs) => gs.filter((x) => x.id !== id))
  }

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => notify(`Zkopírováno: ${text}`))
  }

  if (loading)
    return (
      <main className="admin__main">
        <p className="admin__muted">Načítání…</p>
      </main>
    )

  return (
    <main className="admin__main">
      <div className="admin__chart-grid">
        {/* -------- Discount codes -------- */}
        <div className="admin__card">
          <h2 className="admin__chart-title">🏷️ Slevové kódy</h2>
          <form className="admin__promo-form" onSubmit={createDiscount}>
            <div className="admin__promo-grid">
              <label>
                Kód
                <div className="admin__promo-codegen">
                  <input
                    value={dCode}
                    onChange={(e) => setDCode(e.target.value.toUpperCase())}
                    placeholder="LETO10"
                  />
                  <button
                    type="button"
                    className="admin__btn"
                    title="Vygenerovat kód"
                    onClick={() => setDCode(genCode('SLEVA-', 1))}
                  >
                    🎲
                  </button>
                </div>
              </label>
              <label>
                Typ slevy
                <select value={dType} onChange={(e) => setDType(e.target.value as 'percent' | 'fixed')}>
                  <option value="percent">Procenta (%)</option>
                  <option value="fixed">Částka (Kč)</option>
                </select>
              </label>
              <label>
                {dType === 'percent' ? 'Sleva v %' : 'Sleva v Kč'}
                <input type="number" min="1" value={dValue} onChange={(e) => setDValue(e.target.value)} />
              </label>
              <label>
                Min. objednávka (Kč)
                <input type="number" min="0" value={dMin} onChange={(e) => setDMin(e.target.value)} />
              </label>
              <label>
                Max. počet použití
                <input
                  type="number"
                  min="1"
                  value={dMaxUses}
                  onChange={(e) => setDMaxUses(e.target.value)}
                  placeholder="neomezeno"
                />
              </label>
              <label>
                Platí do
                <input type="date" value={dExpires} onChange={(e) => setDExpires(e.target.value)} />
              </label>
            </div>
            <button className="admin__btn admin__btn--primary">+ Vytvořit slevový kód</button>
          </form>

          {codes.length === 0 ? (
            <p className="admin__muted">Zatím žádné slevové kódy.</p>
          ) : (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Kód</th>
                  <th>Sleva</th>
                  <th>Použito</th>
                  <th>Stav</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((r) => (
                  <tr key={r.id} className={r.active ? '' : 'is-muted'}>
                    <td>
                      <button className="admin__code" title="Kopírovat" onClick={() => copy(r.code)}>
                        {r.code}
                      </button>
                      {r.expires_at && (
                        <div className="admin__muted admin__small">
                          do {new Date(r.expires_at).toLocaleDateString('cs-CZ')}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.type === 'percent' ? `${r.value} %` : `${r.value} Kč`}
                      {Number(r.min_subtotal_czk) > 0 && (
                        <div className="admin__muted admin__small">od {r.min_subtotal_czk} Kč</div>
                      )}
                    </td>
                    <td>
                      {r.used_count}
                      {r.max_uses != null ? ` / ${r.max_uses}` : '×'}
                    </td>
                    <td>
                      <label className="admin__switch">
                        <input type="checkbox" checked={r.active} onChange={() => void toggleDiscount(r)} />
                        <span>{r.active ? 'Aktivní' : 'Vypnutý'}</span>
                      </label>
                    </td>
                    <td>
                      <button className="admin__btn admin__btn--danger" onClick={() => void removeDiscount(r.id)}>
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* -------- Gift cards -------- */}
        <div className="admin__card">
          <h2 className="admin__chart-title">🎁 Dárkové poukazy</h2>
          <form className="admin__promo-form" onSubmit={createGift}>
            <div className="admin__promo-grid">
              <label>
                Kód poukazu
                <div className="admin__promo-codegen">
                  <input value={gCode} onChange={(e) => setGCode(e.target.value.toUpperCase())} />
                  <button
                    type="button"
                    className="admin__btn"
                    title="Vygenerovat kód"
                    onClick={() => setGCode(genCode('GIFT-'))}
                  >
                    🎲
                  </button>
                </div>
              </label>
              <label>
                Hodnota (Kč)
                <input type="number" min="1" value={gValue} onChange={(e) => setGValue(e.target.value)} />
              </label>
              <label>
                Poznámka (pro koho)
                <input value={gNote} onChange={(e) => setGNote(e.target.value)} placeholder="např. paní Nováková" />
              </label>
            </div>
            <button className="admin__btn admin__btn--primary">+ Vytvořit poukaz</button>
          </form>
          <p className="admin__muted admin__small">
            Kód předejte zákazníkovi (e-mailem či vytištěný) — uplatní ho v pokladně. Zůstatek se
            čerpá postupně.
          </p>

          {gifts.length === 0 ? (
            <p className="admin__muted">Zatím žádné poukazy.</p>
          ) : (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Kód</th>
                  <th>Zůstatek</th>
                  <th>Původ</th>
                  <th>Stav</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gifts.map((r) => (
                  <tr key={r.id} className={r.active ? '' : 'is-muted'}>
                    <td>
                      <button className="admin__code" title="Kopírovat" onClick={() => copy(r.code)}>
                        {r.code}
                      </button>
                      {r.note && <div className="admin__muted admin__small">{r.note}</div>}
                    </td>
                    <td>
                      <strong>{Number(r.balance_czk).toLocaleString('cs-CZ')} Kč</strong>
                      <div className="admin__muted admin__small">
                        z {Number(r.initial_czk).toLocaleString('cs-CZ')} Kč
                      </div>
                    </td>
                    <td>
                      {r.order_number ? (
                        <>
                          <strong>🛒 Prodáno</strong>
                          <div className="admin__muted admin__small">
                            objednávka #{r.order_number}
                            {r.recipient_email ? ` · ${r.recipient_email}` : ''}
                          </div>
                        </>
                      ) : (
                        <span className="admin__muted admin__small">Vytvořeno ručně</span>
                      )}
                    </td>
                    <td>
                      <label className="admin__switch">
                        <input type="checkbox" checked={r.active} onChange={() => void toggleGift(r)} />
                        <span>{r.active ? 'Aktivní' : 'Vypnutý'}</span>
                      </label>
                    </td>
                    <td>
                      <button className="admin__btn admin__btn--danger" onClick={() => void removeGift(r.id)}>
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* -------- Redemption ledger -------- */}
      <div className="admin__card" style={{ marginTop: 18 }}>
        <h2 className="admin__chart-title">Historie uplatnění kódů</h2>
        <p className="admin__muted admin__small">
          Každé použití slevového kódu i dárkového poukazu, tak jak je uloženo v databázi.
          U poukazu je vidět, kolik z něj ubylo a kolik zbývá.
        </p>
        {uses.length === 0 ? (
          <p className="admin__muted">Zatím nebyl uplatněn žádný kód.</p>
        ) : (
          <table className="admin__table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Typ</th>
                <th>Kód</th>
                <th>Objednávka</th>
                <th>Uplatněno</th>
                <th>Zůstatek</th>
              </tr>
            </thead>
            <tbody>
              {uses.map((u) => (
                <tr key={u.id}>
                  <td>{new Date(u.created_at).toLocaleString('cs-CZ')}</td>
                  <td>{u.kind === 'gift' ? '🎁 Poukaz' : '🏷️ Sleva'}</td>
                  <td>
                    <button className="admin__code" title="Kopírovat" onClick={() => copy(u.code)}>
                      {u.code}
                    </button>
                  </td>
                  <td>{u.order_number ? `#${u.order_number}` : '—'}</td>
                  <td>
                    <strong>−{Number(u.amount_czk).toLocaleString('cs-CZ')} Kč</strong>
                  </td>
                  <td>
                    {u.balance_after != null ? (
                      <>
                        {Number(u.balance_after).toLocaleString('cs-CZ')} Kč
                        {u.balance_before != null && (
                          <div className="admin__muted admin__small">
                            před: {Number(u.balance_before).toLocaleString('cs-CZ')} Kč
                          </div>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

type RangeKey = 'today' | '7d' | '30d' | 'custom'

interface EvRow {
  session_id: string
  type: string
  product_id: string | null
  created_at: string
}
interface OrdStatRow {
  created_at: string
  total_czk: number
  status: string
  items: { id: string; name_cs?: string; name?: string; qty: number; price_czk: number }[] | null
}

const czk = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`
const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const toInputDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Paginated select — Supabase caps a single request at 1 000 rows. */
async function fetchAll<T>(table: string, columns: string, fromIso: string): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase!
      .from(table)
      .select(columns)
      .gte('created_at', fromIso)
      .order('created_at', { ascending: true })
      .range(page * 1000, page * 1000 + 999)
    if (error || !data) break
    out.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return out
}

function pctDelta(cur: number, prev: number): string | null {
  if (prev === 0) return cur > 0 ? null : '0 %'
  const d = ((cur - prev) / prev) * 100
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)} %`
}

/** Lightweight SVG trend chart (line + area, or bars). No dependencies. */
function TrendChart({
  labels,
  values,
  prevValues,
  color,
  kind,
  format,
}: {
  labels: string[]
  values: number[]
  prevValues?: number[]
  color: string
  kind: 'line' | 'bar'
  format: (n: number) => string
}) {
  const W = 640
  const H = 220
  const PAD = { t: 14, r: 12, b: 26, l: 44 }
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const max = Math.max(1, ...values, ...(prevValues ?? []))
  const n = values.length
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const prevPath = prevValues
    ? prevValues.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    : null
  const gridLines = [0.25, 0.5, 0.75, 1]
  const labelEvery = Math.max(1, Math.ceil(n / 8))
  const barW = n > 0 ? Math.min(34, (iw / n) * 0.6) : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="admin__chart" role="img">
      {gridLines.map((g) => (
        <g key={g}>
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih - g * ih} y2={PAD.t + ih - g * ih} stroke="#f0e3dd" strokeWidth="1" />
          <text x={PAD.l - 6} y={PAD.t + ih - g * ih + 4} textAnchor="end" fontSize="10" fill="#9a8a96">
            {format(max * g)}
          </text>
        </g>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} stroke="#e5d5cd" strokeWidth="1" />
      {kind === 'bar'
        ? values.map((v, i) => (
            <rect
              key={i}
              x={x(i) - barW / 2}
              y={y(v)}
              width={barW}
              height={Math.max(0, PAD.t + ih - y(v))}
              rx={4}
              fill={color}
              opacity={0.85}
            >
              <title>{`${labels[i]}: ${format(v)}`}</title>
            </rect>
          ))
        : (
          <>
            <path d={`${path} L${x(n - 1)},${PAD.t + ih} L${x(0)},${PAD.t + ih} Z`} fill={color} opacity={0.12} />
            {prevPath && <path d={prevPath} fill="none" stroke="#b3a6b3" strokeWidth="1.6" strokeDasharray="5 4" />}
            <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={color}>
                <title>{`${labels[i]}: ${format(v)}`}</title>
              </circle>
            ))}
          </>
        )}
      {labels.map((l, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#9a8a96">
            {l}
          </text>
        ) : null,
      )}
    </svg>
  )
}

function StatsView({ products }: { products: ProductRow[] }) {
  const [range, setRange] = useState<RangeKey>('7d')
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date(Date.now() - 6 * 86400000)))
  const [customTo, setCustomTo] = useState(toInputDate(new Date()))
  const [events, setEvents] = useState<EvRow[]>([])
  const [orders, setOrders] = useState<OrdStatRow[]>([])
  const [loading, setLoading] = useState(true)

  // Current + previous window boundaries.
  const win = useMemo(() => {
    const now = new Date()
    let from: Date
    let to: Date
    if (range === 'today') {
      from = startOfDay(now)
      to = now
    } else if (range === '7d') {
      from = startOfDay(new Date(now.getTime() - 6 * 86400000))
      to = now
    } else if (range === '30d') {
      from = startOfDay(new Date(now.getTime() - 29 * 86400000))
      to = now
    } else {
      from = startOfDay(new Date(customFrom + 'T00:00:00'))
      to = new Date(customTo + 'T23:59:59.999')
      if (to < from) to = new Date(from.getTime() + 86399999)
    }
    const len = to.getTime() - from.getTime()
    return { from, to, prevFrom: new Date(from.getTime() - len), prevTo: from, hourly: range === 'today' }
  }, [range, customFrom, customTo])

  useEffect(() => {
    let alive = true
    setLoading(true)
    void (async () => {
      const fromIso = win.prevFrom.toISOString()
      const [ev, or] = await Promise.all([
        fetchAll<EvRow>('events', 'session_id,type,product_id,created_at', fromIso),
        fetchAll<OrdStatRow>('orders', 'created_at,total_czk,status,items', fromIso),
      ])
      if (!alive) return
      setEvents(ev)
      setOrders(or)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [win])

  const stats = useMemo(() => {
    const inWin = (iso: string, a: Date, b: Date) => {
      const t = new Date(iso).getTime()
      return t >= a.getTime() && t <= b.getTime()
    }
    const cur = events.filter((e) => inWin(e.created_at, win.from, win.to))
    const prev = events.filter((e) => inWin(e.created_at, win.prevFrom, win.prevTo))
    // Abandoned (pending) and cancelled checkouts are not revenue.
    const counts_ = (o: OrdStatRow) => o.status !== 'cancelled' && o.status !== 'pending'
    const curOrd = orders.filter((o) => counts_(o) && inWin(o.created_at, win.from, win.to))
    const prevOrd = orders.filter((o) => counts_(o) && inWin(o.created_at, win.prevFrom, win.prevTo))

    const agg = (evs: EvRow[], ords: OrdStatRow[]) => ({
      sessions: new Set(evs.map((e) => e.session_id)).size,
      pageViews: evs.filter((e) => e.type === 'page_view').length,
      productViews: evs.filter((e) => e.type === 'product_view').length,
      carts: evs.filter((e) => e.type === 'add_to_cart').length,
      orders: ords.length,
      revenue: ords.reduce((s, o) => s + Number(o.total_czk), 0),
    })
    const a = agg(cur, curOrd)
    const p = agg(prev, prevOrd)

    // Time buckets (hours for "today", days otherwise).
    const buckets: { label: string; key: string }[] = []
    const keyOf = (d: Date) =>
      win.hourly
        ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
        : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (win.hourly) {
      for (let h = 0; h <= new Date().getHours(); h++) {
        const d = new Date(win.from)
        d.setHours(h)
        buckets.push({ label: `${h}:00`, key: keyOf(d) })
      }
    } else {
      for (let t = win.from.getTime(); t <= win.to.getTime(); t += 86400000) {
        const d = new Date(t)
        buckets.push({ label: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }), key: keyOf(d) })
      }
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]))
    const sessionsSeries = buckets.map(() => new Set<string>())
    const revenueSeries = buckets.map(() => 0)
    const ordersSeries = buckets.map(() => 0)
    const prevSessionsSeries = buckets.map(() => new Set<string>())
    const prevRevenueSeries = buckets.map(() => 0)
    const lenMs = win.prevTo.getTime() - win.prevFrom.getTime()
    cur.forEach((e) => {
      const i = idx.get(keyOf(new Date(e.created_at)))
      if (i != null) sessionsSeries[i].add(e.session_id)
    })
    curOrd.forEach((o) => {
      const i = idx.get(keyOf(new Date(o.created_at)))
      if (i != null) {
        revenueSeries[i] += Number(o.total_czk)
        ordersSeries[i] += 1
      }
    })
    // Previous window mapped onto the same buckets (shifted by one period).
    prev.forEach((e) => {
      const i = idx.get(keyOf(new Date(new Date(e.created_at).getTime() + lenMs)))
      if (i != null) prevSessionsSeries[i].add(e.session_id)
    })
    prevOrd.forEach((o) => {
      const i = idx.get(keyOf(new Date(new Date(o.created_at).getTime() + lenMs)))
      if (i != null) prevRevenueSeries[i] += Number(o.total_czk)
    })

    // Top products by views / by sales.
    const views = new Map<string, { views: number; carts: number }>()
    cur.forEach((e) => {
      if (!e.product_id) return
      const v = views.get(e.product_id) ?? { views: 0, carts: 0 }
      if (e.type === 'product_view') v.views++
      if (e.type === 'add_to_cart') v.carts++
      views.set(e.product_id, v)
    })
    const topViewed = [...views.entries()]
      .filter(([, v]) => v.views > 0 || v.carts > 0)
      .sort((x, y) => y[1].views - x[1].views)
      .slice(0, 8)

    const sales = new Map<string, { name: string; qty: number; revenue: number }>()
    curOrd.forEach((o) =>
      (o.items ?? []).forEach((it) => {
        const s = sales.get(it.id) ?? { name: it.name_cs ?? it.name ?? it.id, qty: 0, revenue: 0 }
        s.qty += it.qty
        s.revenue += it.qty * Number(it.price_czk)
        sales.set(it.id, s)
      }),
    )
    const bestSellers = [...sales.entries()].sort((x, y) => y[1].qty - x[1].qty).slice(0, 8)

    return {
      a,
      p,
      labels: buckets.map((b) => b.label),
      sessionsSeries: sessionsSeries.map((s) => s.size),
      revenueSeries,
      ordersSeries,
      prevSessionsSeries: prevSessionsSeries.map((s) => s.size),
      prevRevenueSeries,
      topViewed,
      bestSellers,
    }
  }, [events, orders, win])

  const name = (id: string) => products.find((p) => p.id === id)?.name_cs ?? id
  const conv = stats.a.sessions > 0 ? (stats.a.orders / stats.a.sessions) * 100 : 0
  const prevConv = stats.p.sessions > 0 ? (stats.p.orders / stats.p.sessions) * 100 : 0

  const cards: { label: string; value: string; delta: string | null; up?: boolean }[] = [
    { label: 'Tržby', value: czk(stats.a.revenue), delta: pctDelta(stats.a.revenue, stats.p.revenue) },
    { label: 'Objednávky', value: String(stats.a.orders), delta: pctDelta(stats.a.orders, stats.p.orders) },
    { label: 'Konverzní poměr', value: `${conv.toFixed(1)} %`, delta: pctDelta(conv, prevConv) },
    { label: 'Návštěvy (sessions)', value: String(stats.a.sessions), delta: pctDelta(stats.a.sessions, stats.p.sessions) },
    { label: 'Zobrazení stránek', value: String(stats.a.pageViews), delta: pctDelta(stats.a.pageViews, stats.p.pageViews) },
    { label: 'Zobrazení produktů', value: String(stats.a.productViews), delta: pctDelta(stats.a.productViews, stats.p.productViews) },
    { label: 'Přidání do košíku', value: String(stats.a.carts), delta: pctDelta(stats.a.carts, stats.p.carts) },
    {
      label: 'Průměrná objednávka',
      value: stats.a.orders > 0 ? czk(stats.a.revenue / stats.a.orders) : '—',
      delta: pctDelta(
        stats.a.orders > 0 ? stats.a.revenue / stats.a.orders : 0,
        stats.p.orders > 0 ? stats.p.revenue / stats.p.orders : 0,
      ),
    },
  ]

  const presets: { key: RangeKey; label: string }[] = [
    { key: 'today', label: 'Dnes' },
    { key: '7d', label: 'Posledních 7 dní' },
    { key: '30d', label: 'Posledních 30 dní' },
    { key: 'custom', label: 'Vlastní období' },
  ]

  return (
    <main className="admin__main">
      <div className="admin__range">
        {presets.map((pr) => (
          <button
            key={pr.key}
            className={`admin__range-pill ${range === pr.key ? 'is-active' : ''}`}
            onClick={() => setRange(pr.key)}
          >
            {pr.label}
          </button>
        ))}
        {range === 'custom' && (
          <span className="admin__range-custom">
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>—</span>
            <input type="date" value={customTo} min={customFrom} max={toInputDate(new Date())} onChange={(e) => setCustomTo(e.target.value)} />
          </span>
        )}
        <span className="admin__muted admin__range-note">
          srovnání: předchozí období (přerušovaná čára)
        </span>
      </div>

      {loading ? (
        <p className="admin__muted">Načítání statistik…</p>
      ) : (
        <>
          <div className="admin__stat-grid">
            {cards.map((cd) => (
              <div className="admin__card admin__stat" key={cd.label}>
                <strong>{cd.value}</strong>
                <span className="admin__muted">{cd.label}</span>
                {cd.delta && (
                  <span className={`admin__delta ${cd.delta.startsWith('+') ? 'is-up' : cd.delta.startsWith('-') ? 'is-down' : ''}`}>
                    {cd.delta}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="admin__chart-grid">
            <div className="admin__card">
              <h2 className="admin__chart-title">Návštěvy v čase</h2>
              <TrendChart
                labels={stats.labels}
                values={stats.sessionsSeries}
                prevValues={stats.prevSessionsSeries}
                color="#8e7cff"
                kind="line"
                format={(n) => String(Math.round(n))}
              />
            </div>
            <div className="admin__card">
              <h2 className="admin__chart-title">Tržby v čase</h2>
              <TrendChart
                labels={stats.labels}
                values={stats.revenueSeries}
                prevValues={stats.prevRevenueSeries}
                color="#ff5d83"
                kind="line"
                format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)))}
              />
            </div>
            <div className="admin__card">
              <h2 className="admin__chart-title">Objednávky v čase</h2>
              <TrendChart
                labels={stats.labels}
                values={stats.ordersSeries}
                color="#1f9d63"
                kind="bar"
                format={(n) => String(Math.round(n))}
              />
            </div>
          </div>

          <div className="admin__chart-grid">
            <div className="admin__card">
              <h2 className="admin__chart-title">Nejprohlíženější produkty</h2>
              {stats.topViewed.length === 0 ? (
                <p className="admin__muted">V tomto období žádná data.</p>
              ) : (
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Zobrazení</th>
                      <th>Do košíku</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topViewed.map(([id, v]) => (
                      <tr key={id}>
                        <td>{name(id)}</td>
                        <td>{v.views}</td>
                        <td>{v.carts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="admin__card">
              <h2 className="admin__chart-title">Nejprodávanější produkty</h2>
              {stats.bestSellers.length === 0 ? (
                <p className="admin__muted">V tomto období žádné objednávky.</p>
              ) : (
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Prodáno ks</th>
                      <th>Tržby</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bestSellers.map(([id, s]) => (
                      <tr key={id}>
                        <td>{s.name || name(id)}</td>
                        <td>{s.qty}</td>
                        <td>{czk(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function SettingsView({
  notify,
  products,
}: {
  notify: (m: string) => void
  products: ProductRow[]
}) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void supabase!
      .from('site_settings')
      .select('*')
      .eq('key', 'shipping')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setSettings({ ...DEFAULT_SETTINGS, ...(data.value as SiteSettings) })
      })
  }, [])

  const save = async () => {
    setBusy(true)
    const { error } = await supabase!
      .from('site_settings')
      .upsert({ key: 'shipping', value: settings })
    notify(error ? 'Chyba: ' + error.message : 'Nastavení uloženo ✓')
    setBusy(false)
  }

  const heroPick = products.find((p) => p.id === settings.hero_product_id)

  return (
    <main className="admin__main">
      <div className="admin__card admin__card--narrow">
        <h2>Doprava</h2>
        <label>
          Cena dopravy (Kč)
          <input
            type="number"
            value={settings.shipping_czk}
            onChange={(e) => setSettings((s) => ({ ...s, shipping_czk: Number(e.target.value) }))}
          />
        </label>
        <label>
          Doprava zdarma od (Kč)
          <input
            type="number"
            value={settings.free_over_czk}
            onChange={(e) => setSettings((s) => ({ ...s, free_over_czk: Number(e.target.value) }))}
          />
        </label>
        <button className="admin__btn admin__btn--primary" onClick={() => void save()} disabled={busy}>
          Uložit nastavení
        </button>
      </div>

      {/* -------- DPH on invoices -------- */}
      <div className="admin__card admin__card--narrow" style={{ marginTop: 18 }}>
        <h2>DPH na fakturách</h2>
        <p className="admin__muted admin__small">
          Ceny na webu jsou vždy konečné — DPH je v nich obsažena, nikdy se nepřičítá navrch.
          Sleva i dárkový poukaz snižují základ daně, takže DPH se počítá až z částky,
          kterou zákazník opravdu zaplatí.
        </p>
        <label className="admin__switch admin__switch--row">
          <input
            type="checkbox"
            checked={settings.vat_payer !== false}
            onChange={(e) => setSettings((s) => ({ ...s, vat_payer: e.target.checked }))}
          />
          <span>Jsme plátce DPH — rozepsat daň na faktuře</span>
        </label>
        {settings.vat_payer !== false && (
          <label>
            Sazba DPH (%)
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={settings.vat_rate ?? 21}
              onChange={(e) => setSettings((s) => ({ ...s, vat_rate: Number(e.target.value) }))}
            />
          </label>
        )}
        <p className="admin__muted admin__small">
          Základní sazba v ČR je 21 %. Pokud nejste plátce DPH, přepínač vypněte — na faktuře
          se pak žádná daň nerozepisuje.
        </p>
        <button className="admin__btn admin__btn--primary" onClick={() => void save()} disabled={busy}>
          Uložit
        </button>
      </div>

      {/* -------- Hero product on the homepage -------- */}
      <div className="admin__card admin__card--narrow" style={{ marginTop: 18 }}>
        <h2>Hlavní stránka</h2>
        <p className="admin__muted admin__small">
          Produkt, který se ukáže ve velké kartě nahoře na úvodní stránce. Použije se jeho první
          fotka, název a aktuální cena.
        </p>
        <label>
          Produkt v hlavní kartě
          <select
            value={settings.hero_product_id ?? ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, hero_product_id: e.target.value || undefined }))
            }
          >
            <option value="">— automaticky (první nejprodávanější) —</option>
            {products
              .filter((p) => !p.hidden)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_cs ?? p.id}
                </option>
              ))}
          </select>
        </label>
        {heroPick && (
          <div className="admin__hero-preview">
            <span className="admin__thumb" style={{ background: heroPick.gradient ?? '#eee' }}>
              {heroPick.colors?.[0]?.images?.[0] ? (
                <img src={heroPick.colors[0].images[0]} alt="" loading="lazy" />
              ) : (
                <span>{heroPick.emoji}</span>
              )}
            </span>
            <div>
              <strong>{heroPick.name_cs ?? heroPick.id}</strong>
              <span className="admin__muted admin__small">{heroPick.price_czk} Kč</span>
              {!heroPick.colors?.[0]?.images?.[0] && (
                <span className="admin__small" style={{ color: '#b45309' }}>
                  ⚠ Produkt nemá fotku — na úvodní stránce se ukáže jen emoji.
                </span>
              )}
            </div>
          </div>
        )}
        <button className="admin__btn admin__btn--primary" onClick={() => void save()} disabled={busy}>
          Uložit
        </button>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Product form                                                        */
/* ------------------------------------------------------------------ */

function ProductForm({
  row,
  isNew,
  notify,
  onClose,
  onSaved,
}: {
  row: ProductRow
  isNew: boolean
  notify: (m: string) => void
  onClose: () => void
  onSaved: (r: ProductRow) => void
}) {
  const [r, setR] = useState<ProductRow>(row)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof ProductRow>(key: K, value: ProductRow[K]) =>
    setR((prev) => ({ ...prev, [key]: value }))

  /* ---- stock per colour ------------------------------------------- */
  // Rows are kept per colour *index*, so renaming or reordering a colour
  // keeps its pieces with the right swatch.
  const [stockRows, setStockRows] = useState<{ size: string; qty: string }[][]>(() => {
    const saved = parseVariants(row.stock_variants)
    const order = row.sizes ?? []
    return row.colors.map((c) => {
      const suffix = `__${c.name}`
      return Object.entries(saved)
        .filter(([k]) => k.endsWith(suffix))
        .map(([k, v]) => ({ size: k.slice(0, k.length - suffix.length), qty: String(v) }))
        .sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size))
    })
  })

  const rowsFor = (ci: number) => stockRows[ci] ?? []
  const setRowsFor = (ci: number, next: { size: string; qty: string }[]) =>
    setStockRows((rs) => {
      const copy = r.colors.map((_, j) => rs[j] ?? [])
      copy[ci] = next
      return copy
    })
  const colorTotal = (ci: number) =>
    rowsFor(ci).reduce((sum, x) => sum + (parseInt(x.qty, 10) || 0), 0)
  /** Suggests the next size the shop owner has not used for this colour yet. */
  const nextSize = (ci: number) => {
    const used = new Set(rowsFor(ci).map((x) => x.size.trim()))
    return (r.sizes ?? []).find((s) => s && !used.has(s)) ?? ''
  }

  /** Turns the per-colour rows into the stock_variants map + size list. */
  const buildStock = () => {
    const variants: StockVariants = {}
    const sizes = [...(r.sizes ?? [])]
    r.colors.forEach((c, ci) => {
      for (const line of rowsFor(ci)) {
        const s = line.size.trim()
        if (!s || line.qty.trim() === '') continue
        variants[variantKey(s, c.name)] = Math.max(0, parseInt(line.qty, 10) || 0)
        if (!sizes.includes(s)) sizes.push(s)
      }
    })
    return { variants, sizes }
  }

  const uploadImages = async (colorIndex: number, files: FileList) => {
    setBusy(true)
    const productId = r.id || slugify(r.name_cs ?? '')
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
      if (error) {
        notify('Chyba nahrávání: ' + error.message)
        continue
      }
      const { data } = supabase!.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    const colors = [...r.colors]
    colors[colorIndex] = {
      ...colors[colorIndex],
      images: [...(colors[colorIndex].images ?? []), ...urls],
    }
    set('colors', colors)
    setBusy(false)
    if (urls.length) notify(`Nahráno ${urls.length} fotek ✓`)
  }

  const updateColor = (i: number, changes: Partial<ColorOption>) => {
    const colors = [...r.colors]
    colors[i] = { ...colors[i], ...changes }
    set('colors', colors)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!r.name_cs?.trim()) {
      notify('Vyplňte český název produktu.')
      return
    }
    setBusy(true)
    const { variants, sizes } = buildStock()
    const tracked = !r.is_gift_card && Object.keys(variants).length > 0
    const record: ProductRow = {
      ...r,
      id: r.id || slugify(r.name_cs),
      // Sizes typed into the stock table are added to the product's size list
      // automatically, so the owner never has to fill them in twice.
      sizes: r.is_gift_card ? [] : (tracked ? sizes : r.sizes).filter(Boolean),
      ages: r.is_gift_card ? [] : r.ages.filter(Boolean),
      stock_variants: tracked ? variants : {},
      stock_qty: r.is_gift_card
        ? null
        : tracked
          ? Object.values(variants).reduce((a, b) => a + b, 0)
          : r.stock_qty,
    }
    const { error } = await supabase!.from('products').upsert(record)
    setBusy(false)
    if (error) notify('Chyba: ' + error.message)
    else {
      notify(isNew ? 'Produkt vytvořen ✓' : 'Produkt uložen ✓')
      onSaved(record)
    }
  }

  const csv = (arr: string[]) => arr.join(', ')
  const parseCsv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  return (
    <main className="admin__main">
      <form className="admin__card admin__form" onSubmit={save}>
        <div className="admin__form-head">
          <h2>{isNew ? 'Nový produkt' : `Upravit: ${row.name_cs}`}</h2>
          <button type="button" className="admin__btn" onClick={onClose}>← Zpět na seznam</button>
        </div>

        {/* A voucher is a product too — same photos, but no sizes or stock. */}
        <label className={`admin__giftswitch ${r.is_gift_card ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={r.is_gift_card}
            onChange={(e) => {
              const on = e.target.checked
              setR((prev) => ({
                ...prev,
                is_gift_card: on,
                category: on ? 'gift-cards' : prev.category,
                sizes: on ? [] : prev.sizes,
                ages: on ? [] : prev.ages,
                stock_qty: on ? null : prev.stock_qty,
                stock_variants: on ? {} : prev.stock_variants,
                old_price_czk: on ? null : prev.old_price_czk,
              }))
            }}
          />
          <span>
            <strong>🎁 Tohle je dárkový poukaz</strong>
            <small>
              Cena níže je hodnota poukazu — částka je konečná, včetně DPH. Po zaplacení se
              zákazníkovi automaticky vygeneruje kód na tuto částku a pošle se mu e-mailem.
              Poukaz se neposílá poštou a nesleduje se u něj sklad.
            </small>
          </span>
        </label>

        <h3>Základní údaje</h3>
        <div className="admin__grid">
          <label>
            Název (česky) *
            <input value={r.name_cs ?? ''} onChange={(e) => set('name_cs', e.target.value)} required />
          </label>
          <label>
            Kategorie
            <select value={r.category} onChange={(e) => set('category', e.target.value as CategoryId)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label>
            {r.is_gift_card ? 'Hodnota poukazu (Kč, včetně DPH) *' : 'Cena (Kč) *'}
            <input
              type="number"
              min={1}
              value={r.price_czk}
              onChange={(e) => set('price_czk', Number(e.target.value))}
              required
            />
          </label>
          {!r.is_gift_card && (
            <label>
              Původní cena (Kč, pro slevu)
              <input
                type="number"
                value={r.old_price_czk ?? ''}
                onChange={(e) => set('old_price_czk', e.target.value ? Number(e.target.value) : null)}
              />
            </label>
          )}
          {!r.is_gift_card && (
            <label>
              Velikosti (oddělené čárkou)
              <input
                value={csv(r.sizes)}
                onChange={(e) => set('sizes', parseCsv(e.target.value))}
                placeholder="0-3m, 3-6m, 6-9m"
              />
            </label>
          )}
          {!r.is_gift_card && (
            <label>
              Věk (filtr; oddělený čárkou)
              <input
                value={csv(r.ages)}
                onChange={(e) => set('ages', parseCsv(e.target.value))}
                placeholder="0-6m, 6-12m, 12-24m"
              />
            </label>
          )}
          <label>
            Štítek
            <select value={r.badge ?? ''} onChange={(e) => set('badge', e.target.value || null)}>
              <option value="">— žádný —</option>
              <option value="New">Novinka</option>
              <option value="Bestseller">Nejprodávanější</option>
            </select>
          </label>
          <label>
            Emoji (záložní obrázek)
            <input value={r.emoji} onChange={(e) => set('emoji', e.target.value)} />
          </label>
          <label>
            Barva pozadí karty
            <select
              value={r.gradient ?? ''}
              onChange={(e) => set('gradient', e.target.value)}
            >
              {Object.entries(GRADIENTS).map(([name, g]) => (
                <option key={name} value={g}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Pořadí (nižší = výš)
            <input type="number" value={r.sort} onChange={(e) => set('sort', Number(e.target.value))} />
          </label>
          <label>
            Počet kusů skladem
            <input
              type="number"
              min="0"
              placeholder="nesledovat"
              value={r.stock_qty == null ? '' : String(r.stock_qty)}
              onChange={(e) =>
                set('stock_qty', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
              }
            />
          </label>
        </div>

        <div className="admin__season-row">
          <span>Sezóny (pro sezónní akce):</span>
          {(
            [
              ['spring', 'Jaro'],
              ['summer', 'Léto'],
              ['autumn', 'Podzim'],
              ['winter', 'Zima'],
            ] as [string, string][]
          ).map(([id, label]) => (
            <label key={id} className="admin__switch">
              <input
                type="checkbox"
                checked={(r.seasons ?? []).includes(id)}
                onChange={(e) =>
                  set(
                    'seasons',
                    e.target.checked
                      ? [...(r.seasons ?? []), id]
                      : (r.seasons ?? []).filter((x) => x !== id),
                  )
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="admin__flags">
          {(
            [
              ['in_stock', 'Skladem'],
              ['featured', 'Oblíbené kousky (úvodní strana)'],
              ['best_seller', 'Nejprodávanější (úvodní strana)'],
              ['seasonal', 'Sezónní kolekce (úvodní strana)'],
              ['is_new', 'Nová kolekce'],
              ['hidden', 'Skrýt z webu'],
            ] as [keyof ProductRow, string][]
          ).map(([key, label]) => (
            <label key={key} className="admin__switch">
              <input
                type="checkbox"
                checked={Boolean(r[key])}
                onChange={(e) => set(key, e.target.checked as never)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <h3>Popis</h3>
        <label>
          Popis (česky) *
          <textarea
            rows={4}
            value={r.desc_cs ?? ''}
            onChange={(e) => set('desc_cs', e.target.value)}
            required
          />
        </label>
        <label>
          Materiál (česky)
          <input value={r.material_cs ?? ''} onChange={(e) => set('material_cs', e.target.value)} />
        </label>

        <details className="admin__details">
          <summary>Překlady (EN / UK) — nepovinné, jinak se použije čeština</summary>
          <div className="admin__grid">
            <label>Název (anglicky)<input value={r.name_en ?? ''} onChange={(e) => set('name_en', e.target.value || null)} /></label>
            <label>Název (ukrajinsky)<input value={r.name_uk ?? ''} onChange={(e) => set('name_uk', e.target.value || null)} /></label>
          </div>
          <label>Popis (anglicky)<textarea rows={3} value={r.desc_en ?? ''} onChange={(e) => set('desc_en', e.target.value || null)} /></label>
          <label>Popis (ukrajinsky)<textarea rows={3} value={r.desc_uk ?? ''} onChange={(e) => set('desc_uk', e.target.value || null)} /></label>
          <div className="admin__grid">
            <label>Materiál (anglicky)<input value={r.material_en ?? ''} onChange={(e) => set('material_en', e.target.value || null)} /></label>
            <label>Materiál (ukrajinsky)<input value={r.material_uk ?? ''} onChange={(e) => set('material_uk', e.target.value || null)} /></label>
          </div>
        </details>

        <h3>{r.is_gift_card ? 'Fotka poukazu' : 'Barevné varianty a fotky'}</h3>
        {r.is_gift_card && (
          <p className="admin__muted admin__small">
            Nahrajte obrázek poukazu — ukáže se zákazníkovi na webu i v e-mailu s kódem.
          </p>
        )}
        {r.colors.map((c, i) => (
          <div className="admin__color" key={i}>
            <div className="admin__color-head">
              <input
                className="admin__color-name"
                value={c.name}
                onChange={(e) => updateColor(i, { name: e.target.value })}
                placeholder="Název barvy (např. Pink)"
              />
              <input
                type="color"
                value={c.hex}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                title="Barva tečky"
              />
              <label className="admin__btn admin__btn--small">
                + Nahrát fotky
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => e.target.files && void uploadImages(i, e.target.files)}
                />
              </label>
              {r.colors.length > 1 && (
                <button
                  type="button"
                  className="admin__btn admin__btn--small admin__btn--danger"
                  onClick={() => {
                    set('colors', r.colors.filter((_, x) => x !== i))
                    setStockRows((rs) =>
                      r.colors.map((_, j) => rs[j] ?? []).filter((_, x) => x !== i),
                    )
                  }}
                >
                  Odebrat barvu
                </button>
              )}
            </div>
            <div className="admin__photos">
              {(c.images ?? []).map((url, x) => (
                <div className="admin__photo" key={url}>
                  <img src={url} alt="" loading="lazy" />
                  <button
                    type="button"
                    aria-label="Smazat fotku"
                    onClick={() =>
                      updateColor(i, { images: (c.images ?? []).filter((_, y) => y !== x) })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              {(c.images ?? []).length === 0 && (
                <span className="admin__muted">Zatím žádné fotky.</span>
              )}
            </div>

            {/* -------- stock for this colour, size by size -------- */}
            {!r.is_gift_card && (
            <div className="admin__color-stock">
              <div className="admin__color-stock-head">
                <strong>Sklad této barvy</strong>
                <span className="admin__color-stock-total">{colorTotal(i)} ks</span>
              </div>
              {rowsFor(i).length === 0 && (
                <p className="admin__muted admin__small">
                  Zatím nevyplněno — sklad se u této barvy nesleduje.
                </p>
              )}
              {rowsFor(i).map((line, x) => (
                <div className="admin__stock-line" key={x}>
                  <input
                    list={`sizes-${i}`}
                    placeholder="velikost"
                    value={line.size}
                    onChange={(e) =>
                      setRowsFor(
                        i,
                        rowsFor(i).map((y, j) => (j === x ? { ...y, size: e.target.value } : y)),
                      )
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="ks"
                    value={line.qty}
                    onChange={(e) =>
                      setRowsFor(
                        i,
                        rowsFor(i).map((y, j) => (j === x ? { ...y, qty: e.target.value } : y)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="admin__btn admin__btn--small admin__btn--danger"
                    aria-label="Odebrat řádek"
                    onClick={() => setRowsFor(i, rowsFor(i).filter((_, j) => j !== x))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <datalist id={`sizes-${i}`}>
                {(r.sizes ?? []).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <button
                type="button"
                className="admin__btn admin__btn--small"
                onClick={() => setRowsFor(i, [...rowsFor(i), { size: nextSize(i), qty: '' }])}
              >
                + Přidat velikost
              </button>
            </div>
            )}
          </div>
        ))}
        {!r.is_gift_card && (
          <p className="admin__muted admin__small">
            Velikosti si u každé barvy napíšete sami — do produktu se doplní automaticky. Celkový
            stav skladu se spočítá jako součet všech barev a velikostí. Vyprodaná kombinace se na
            webu zákazníkovi zašedne a nepůjde vybrat.
          </p>
        )}
        <button
          type="button"
          className="admin__btn"
          onClick={() => {
            set('colors', [...r.colors, { name: 'Nová barva', hex: '#f4b9c8', images: [] }])
            setStockRows((rs) => [...r.colors.map((_, j) => rs[j] ?? []), []])
          }}
        >
          + Přidat barevnou variantu
        </button>

        <div className="admin__form-foot">
          <button type="button" className="admin__btn" onClick={onClose}>Zrušit</button>
          <button className="admin__btn admin__btn--primary" disabled={busy}>
            {busy ? 'Ukládám…' : isNew ? 'Vytvořit produkt' : 'Uložit změny'}
          </button>
        </div>
      </form>
    </main>
  )
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, STORAGE_BUCKET } from '../lib/supabase'
import type { ProductRow, SiteSettings } from '../data/productsStore'
import { DEFAULT_SETTINGS } from '../data/productsStore'
import type { CategoryId, ColorOption } from '../types'
import './admin.css'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'baby', label: 'Miminka' },
  { id: 'girls', label: 'Holky' },
  { id: 'boys', label: 'Kluci' },
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

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [view, setView] = useState<'products' | 'orders' | 'stats' | 'settings'>('products')
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState('')

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
            onClick={() => setView('products')}
          >
            Produkty
          </button>
          <button
            className={view === 'orders' ? 'is-active' : ''}
            onClick={() => setView('orders')}
          >
            Objednávky
          </button>
          <button
            className={view === 'stats' ? 'is-active' : ''}
            onClick={() => setView('stats')}
          >
            Statistiky
          </button>
          <button
            className={view === 'settings' ? 'is-active' : ''}
            onClick={() => setView('settings')}
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
        <SettingsView notify={notify} />
      ) : view === 'orders' ? (
        <OrdersView notify={notify} />
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
  payment_method: string
}

const ORDER_STATUSES: Record<string, string> = {
  new: 'Nová',
  paid: 'Zaplacená',
  shipped: 'Odesláno',
  done: 'Vyřízená',
  cancelled: 'Zrušená',
}

function OrdersView({ notify }: { notify: (m: string) => void }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
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

  return (
    <main className="admin__main">
      {orders.length === 0 && (
        <div className="admin__card admin__card--narrow">
          <p className="admin__muted">
            Zatím žádné objednávky. Jakmile zákazník dokončí pokladnu, objeví se tady.
          </p>
        </div>
      )}
      <div className="admin__list">
        {orders.map((o) => (
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
                  <p>
                    Mezisoučet: {o.subtotal_czk} Kč · Doprava: {o.shipping_czk} Kč ·{' '}
                    <strong>Celkem: {o.total_czk} Kč</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

interface StatsSummary {
  sessions: number
  page_views: number
  product_views: number
  add_to_carts: number
}

interface TopProduct {
  product_id: string
  views: number
  carts: number
}

function StatsView({ products }: { products: ProductRow[] }) {
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [top, setTop] = useState<TopProduct[]>([])
  const [orderStats, setOrderStats] = useState<{ count: number; revenue: number } | null>(null)

  useEffect(() => {
    void (async () => {
      const [s, t, o] = await Promise.all([
        supabase!.from('v_stats_summary').select('*').maybeSingle(),
        supabase!.from('v_top_products').select('*'),
        supabase!.from('orders').select('total_czk,status'),
      ])
      if (s.data) setSummary(s.data as StatsSummary)
      if (t.data) setTop(t.data as TopProduct[])
      if (o.data) {
        const valid = (o.data as { total_czk: number; status: string }[]).filter(
          (x) => x.status !== 'cancelled',
        )
        setOrderStats({
          count: valid.length,
          revenue: valid.reduce((sum, x) => sum + Number(x.total_czk), 0),
        })
      }
    })()
  }, [])

  const name = (id: string) =>
    products.find((p) => p.id === id)?.name_cs ?? id

  const cards: { label: string; value: string }[] = [
    { label: 'Návštěvy (sessions)', value: String(summary?.sessions ?? '—') },
    { label: 'Zobrazení stránek', value: String(summary?.page_views ?? '—') },
    { label: 'Zobrazení produktů', value: String(summary?.product_views ?? '—') },
    { label: 'Přidání do košíku', value: String(summary?.add_to_carts ?? '—') },
    { label: 'Objednávky', value: String(orderStats?.count ?? '—') },
    { label: 'Tržby', value: orderStats ? `${orderStats.revenue.toLocaleString('cs-CZ')} Kč` : '—' },
  ]

  return (
    <main className="admin__main">
      <div className="admin__stat-grid">
        {cards.map((cd) => (
          <div className="admin__card admin__stat" key={cd.label}>
            <strong>{cd.value}</strong>
            <span className="admin__muted">{cd.label}</span>
          </div>
        ))}
      </div>

      <div className="admin__card" style={{ marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>Nejprohlíženější produkty</h2>
        {top.length === 0 ? (
          <p className="admin__muted">Zatím žádná data — statistiky se začnou sbírat z návštěv webu.</p>
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
              {top.map((t) => (
                <tr key={t.product_id}>
                  <td>{name(t.product_id)}</td>
                  <td>{t.views}</td>
                  <td>{t.carts}</td>
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
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function SettingsView({ notify }: { notify: (m: string) => void }) {
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
    const record: ProductRow = {
      ...r,
      id: r.id || slugify(r.name_cs),
      sizes: r.sizes.filter(Boolean),
      ages: r.ages.filter(Boolean),
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
            Cena (Kč) *
            <input
              type="number"
              min={1}
              value={r.price_czk}
              onChange={(e) => set('price_czk', Number(e.target.value))}
              required
            />
          </label>
          <label>
            Původní cena (Kč, pro slevu)
            <input
              type="number"
              value={r.old_price_czk ?? ''}
              onChange={(e) => set('old_price_czk', e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label>
            Velikosti (oddělené čárkou)
            <input
              value={csv(r.sizes)}
              onChange={(e) => set('sizes', parseCsv(e.target.value))}
              placeholder="0-3m, 3-6m, 6-9m"
            />
          </label>
          <label>
            Věk (filtr; oddělený čárkou)
            <input
              value={csv(r.ages)}
              onChange={(e) => set('ages', parseCsv(e.target.value))}
              placeholder="0-6m, 6-12m, 12-24m"
            />
          </label>
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

        <h3>Barevné varianty a fotky</h3>
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
                  onClick={() => set('colors', r.colors.filter((_, x) => x !== i))}
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
          </div>
        ))}
        <button
          type="button"
          className="admin__btn"
          onClick={() =>
            set('colors', [...r.colors, { name: 'Nová barva', hex: '#f4b9c8', images: [] }])
          }
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

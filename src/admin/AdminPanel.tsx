import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, STORAGE_BUCKET } from '../lib/supabase'
import type { ProductRow, SiteSettings } from '../data/productsStore'
import { DEFAULT_SETTINGS } from '../data/productsStore'
import type { CategoryId, ColorOption } from '../types'
import { CARRIERS, makeTrackingUrl } from '../lib/carriers'
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
  tracking_number?: string | null
  carrier?: string | null
  tracking_url?: string | null
  fulfilled_at?: string | null
  fulfilled_items?: number[] | null
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
  const [fulfillId, setFulfillId] = useState<string | null>(null)
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
              <button
                className={`admin__btn ${o.status === 'shipped' || o.status === 'done' ? '' : 'admin__btn--primary'}`}
                onClick={() => setFulfillId(o.id)}
              >
                {o.status === 'shipped' || o.status === 'done' ? '📦 Upravit odeslání' : '📦 Odeslat objednávku'}
              </button>
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
    const curOrd = orders.filter((o) => o.status !== 'cancelled' && inWin(o.created_at, win.from, win.to))
    const prevOrd = orders.filter((o) => o.status !== 'cancelled' && inWin(o.created_at, win.prevFrom, win.prevTo))

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

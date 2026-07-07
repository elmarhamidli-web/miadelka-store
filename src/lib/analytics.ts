import { supabase } from './supabase'

/** Anonymous per-browser-session id (no cookies, no personal data). */
function sessionId(): string {
  try {
    let sid = window.sessionStorage.getItem('los_sid')
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      window.sessionStorage.setItem('los_sid', sid)
    }
    return sid
  } catch {
    return 'anon'
  }
}

export type EventType = 'page_view' | 'product_view' | 'add_to_cart' | 'order_placed'

/** Fire-and-forget analytics event. Never blocks or breaks the UI. */
export function track(type: EventType, data: { productId?: string; path?: string } = {}) {
  if (!supabase) return
  try {
    void supabase
      .from('events')
      .insert({
        session_id: sessionId(),
        type,
        product_id: data.productId ?? null,
        path: data.path ?? window.location.pathname,
        locale: document.documentElement.lang || null,
      })
      .then(() => undefined)
  } catch {
    /* analytics must never break the shop */
  }
}

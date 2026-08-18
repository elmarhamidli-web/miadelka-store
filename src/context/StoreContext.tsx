import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem, Product } from '../types'
import { useI18n } from '../i18n'
import { useProducts } from '../data/productsStore'
import { track } from '../lib/analytics'

/* ------------------------------------------------------------------ */
/* Persistence — the cart survives reloads and browser restarts.       */
/* Only ids/size/color/qty are stored; product data (price, photos) is */
/* re-read from the live catalogue so nothing goes stale.              */
/* ------------------------------------------------------------------ */

const CART_KEY = 'los_cart_v1'
const WISH_KEY = 'los_wishlist_v1'

interface StoredLine {
  id: string
  size: string
  color: string
  quantity: number
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / full storage — cart just won't persist */
  }
}

interface Toast {
  id: number
  message: string
  emoji: string
}

interface StoreContextValue {
  cart: CartItem[]
  wishlist: string[]
  toasts: Toast[]
  cartCount: number
  subtotal: number
  isCartOpen: boolean
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void
  removeFromCart: (id: string, size: string, color: string) => void
  updateQuantity: (id: string, size: string, color: string, quantity: number) => void
  clearCart: () => void
  toggleWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  openCart: () => void
  closeCart: () => void
  pushToast: (message: string, emoji?: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

const lineKey = (id: string, size: string, color: string) => `${id}__${size}__${color}`

export function StoreProvider({ children }: { children: ReactNode }) {
  const { dict, fmt, productName } = useI18n()
  const { products, byId } = useProducts()
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<string[]>(() => readStored<string[]>(WISH_KEY, []))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [restored, setRestored] = useState(false)

  // Rebuild the saved cart once the catalogue is available (products load
  // asynchronously). Lines whose product no longer exists are dropped.
  useEffect(() => {
    if (restored || products.length === 0) return
    const lines = readStored<StoredLine[]>(CART_KEY, [])
    if (lines.length > 0) {
      const rebuilt: CartItem[] = []
      for (const line of lines) {
        const product = byId(line.id)
        if (!product || product.inStock === false) continue
        rebuilt.push({
          product,
          size: line.size,
          color: line.color,
          quantity: Math.max(1, Math.min(20, Number(line.quantity) || 1)),
        })
      }
      if (rebuilt.length > 0) setCart(rebuilt)
    }
    setRestored(true)
  }, [products, byId, restored])

  // Persist after every change (only once the restore pass has run, so an
  // empty initial state can't wipe a saved cart).
  useEffect(() => {
    if (!restored) return
    writeStored(
      CART_KEY,
      cart.map((item) => ({
        id: item.product.id,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      })),
    )
  }, [cart, restored])

  useEffect(() => {
    writeStored(WISH_KEY, wishlist)
  }, [wishlist])

  const pushToast = useCallback((message: string, emoji = '🛍️') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, emoji }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const addToCart = useCallback(
    (product: Product, size: string, color: string, quantity = 1) => {
      setCart((prev) => {
        const key = lineKey(product.id, size, color)
        const existing = prev.find(
          (item) => lineKey(item.product.id, item.size, item.color) === key,
        )
        if (existing) {
          return prev.map((item) =>
            lineKey(item.product.id, item.size, item.color) === key
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
        }
        return [...prev, { product, size, color, quantity }]
      })
      pushToast(fmt(dict.ui.toast.added, { name: productName(product.id, product.name) }), '🛒')
      track('add_to_cart', { productId: product.id })
    },
    [pushToast, fmt, dict, productName],
  )

  const removeFromCart = useCallback((id: string, size: string, color: string) => {
    const key = lineKey(id, size, color)
    setCart((prev) =>
      prev.filter((item) => lineKey(item.product.id, item.size, item.color) !== key),
    )
  }, [])

  const updateQuantity = useCallback(
    (id: string, size: string, color: string, quantity: number) => {
      const key = lineKey(id, size, color)
      setCart((prev) =>
        prev
          .map((item) =>
            lineKey(item.product.id, item.size, item.color) === key
              ? { ...item, quantity: Math.max(0, quantity) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      )
    },
    [],
  )

  const clearCart = useCallback(() => setCart([]), [])

  const toggleWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        if (prev.includes(productId)) {
          pushToast(dict.ui.toast.wishOff, '🤍')
          return prev.filter((id) => id !== productId)
        }
        pushToast(dict.ui.toast.wishOn, '💖')
        return [...prev, productId]
      })
    },
    [pushToast, dict],
  )

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  )

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  )

  const value: StoreContextValue = {
    cart,
    wishlist,
    toasts,
    cartCount,
    subtotal,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleWishlist,
    isWishlisted,
    openCart,
    closeCart,
    pushToast,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { useI18n } from '../i18n'
import { useProducts } from '../data/productsStore'
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon, ArrowIcon } from './icons'

// 1 base currency unit = 24 Kč
const CZK = 24

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    subtotal,
    cartCount,
    pushToast,
    clearCart,
  } = useStore()
  const { dict, fmt, formatPrice, productName, colorName } = useI18n()
  const { settings } = useProducts()
  const c = dict.ui.cart

  const FREE_SHIP = settings.free_over_czk / CZK
  const SHIPPING_FEE = settings.shipping_czk / CZK
  const remaining = Math.max(0, FREE_SHIP - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIP) * 100)
  const shippingFree = subtotal >= FREE_SHIP
  const total = subtotal + (shippingFree ? 0 : SHIPPING_FEE)

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            className="cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            aria-label={c.title}
          >
            <header className="cart__head">
              <h3>{c.title} {cartCount > 0 && <span>({cartCount})</span>}</h3>
              <button className="icon-btn" onClick={closeCart} aria-label={dict.ui.nav.cartClose}>
                <CloseIcon />
              </button>
            </header>

            {cart.length > 0 && (
              <div className="cart__ship">
                {remaining > 0 ? (
                  <span>{fmt(c.addMore, { amount: formatPrice(remaining) })}</span>
                ) : (
                  <span>{c.freeUnlocked}</span>
                )}
                <div className="cart__ship-bar">
                  <motion.div
                    className="cart__ship-fill"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            )}

            <div className="cart__body">
              {cart.length === 0 ? (
                <div className="cart__empty">
                  <span aria-hidden="true">🛒</span>
                  <strong>{c.emptyTitle}</strong>
                  <p>{c.emptySub}</p>
                  <button className="btn btn--primary" onClick={closeCart}>
                    {c.continue}
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      className="cart-item"
                      key={`${item.product.id}-${item.size}-${item.color}`}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, x: 40, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div
                        className="cart-item__media"
                        style={{ background: item.product.gradient }}
                      >
                        {(() => {
                          const imgs =
                            item.product.colors.find((c) => c.name === item.color)?.images ??
                            item.product.colors.find((c) => c.images)?.images
                          return imgs ? (
                            <img src={imgs[0]} alt="" loading="lazy" />
                          ) : (
                            <span aria-hidden="true">{item.product.emoji}</span>
                          )
                        })()}
                      </div>
                      <div className="cart-item__info">
                        <strong>{productName(item.product.id, item.product.name)}</strong>
                        <span className="cart-item__variant">
                          {colorName(item.color)} · {c.sizeLabel} {item.size}
                        </span>
                        <div className="cart-item__row">
                          <div className="qty">
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)
                              }
                              aria-label={c.decrease}
                            >
                              <MinusIcon />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)
                              }
                              aria-label={c.increase}
                            >
                              <PlusIcon />
                            </button>
                          </div>
                          <span className="cart-item__price">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="cart-item__remove"
                        onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                        aria-label={c.remove}
                      >
                        <TrashIcon />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {cart.length > 0 && (
              <footer className="cart__foot">
                <div className="cart__subtotal cart__subtotal--line">
                  <span>{c.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="cart__subtotal cart__subtotal--line">
                  <span>{c.shipping}</span>
                  <span className={shippingFree ? 'cart__ship-free' : ''}>
                    {shippingFree ? c.shippingFree : formatPrice(SHIPPING_FEE)}
                  </span>
                </div>
                <div className="cart__subtotal">
                  <span>{c.total}</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
                <p className="cart__note">{c.note}</p>
                <button
                  className="btn btn--primary btn--full btn--lg"
                  onClick={() => pushToast(c.checkoutToast, '🔒')}
                >
                  {c.checkout} <ArrowIcon />
                </button>
                <div className="cart__foot-row">
                  <button className="btn btn--soft" onClick={closeCart}>
                    {c.continue}
                  </button>
                  <button className="cart__clear" onClick={clearCart}>
                    {c.clear}
                  </button>
                </div>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

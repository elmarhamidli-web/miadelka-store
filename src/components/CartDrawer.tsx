import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon, ArrowIcon } from './icons'

const FREE_SHIP = 60

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

  const remaining = Math.max(0, FREE_SHIP - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIP) * 100)

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
            aria-label="Shopping cart"
          >
            <header className="cart__head">
              <h3>Your cart {cartCount > 0 && <span>({cartCount})</span>}</h3>
              <button className="icon-btn" onClick={closeCart} aria-label="Close cart">
                <CloseIcon />
              </button>
            </header>

            {cart.length > 0 && (
              <div className="cart__ship">
                {remaining > 0 ? (
                  <span>Add <strong>${remaining}</strong> more for free shipping 🚚</span>
                ) : (
                  <span>🎉 You've unlocked free shipping!</span>
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
                  <strong>Your cart is feeling light</strong>
                  <p>Add some adorable pieces to get started.</p>
                  <button className="btn btn--primary" onClick={closeCart}>
                    Continue shopping
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
                        <span aria-hidden="true">{item.product.emoji}</span>
                      </div>
                      <div className="cart-item__info">
                        <strong>{item.product.name}</strong>
                        <span className="cart-item__variant">
                          {item.color} · Size {item.size}
                        </span>
                        <div className="cart-item__row">
                          <div className="qty">
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)
                              }
                              aria-label="Decrease quantity"
                            >
                              <MinusIcon />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)
                              }
                              aria-label="Increase quantity"
                            >
                              <PlusIcon />
                            </button>
                          </div>
                          <span className="cart-item__price">
                            ${item.product.price * item.quantity}
                          </span>
                        </div>
                      </div>
                      <button
                        className="cart-item__remove"
                        onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                        aria-label={`Remove ${item.product.name}`}
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
                <div className="cart__subtotal">
                  <span>Subtotal</span>
                  <strong>${subtotal}</strong>
                </div>
                <p className="cart__note">Shipping & taxes calculated at checkout.</p>
                <button
                  className="btn btn--primary btn--full btn--lg"
                  onClick={() => pushToast('Checkout is a prototype — nothing was charged 💖', '🔒')}
                >
                  Checkout <ArrowIcon />
                </button>
                <div className="cart__foot-row">
                  <button className="btn btn--soft" onClick={closeCart}>
                    Continue shopping
                  </button>
                  <button className="cart__clear" onClick={clearCart}>
                    Clear cart
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

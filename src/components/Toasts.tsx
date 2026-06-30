import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="toast__emoji" aria-hidden="true">{t.emoji}</span>
            <span className="toast__msg">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

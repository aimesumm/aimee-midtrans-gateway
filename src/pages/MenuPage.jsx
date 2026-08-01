import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { useOrderDraft } from '../context/OrderDraftContext'
import Header from '../components/Header'
import Hero from '../components/Hero'
import MenuSection from '../components/MenuSection'
import Footer from '../components/Footer'
import { currency, getSubtotal } from '../data/siteConfig'

function CartIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M0 1.5A.5.5 0 0 1 .5 1h1a.5.5 0 0 1 .485.379L2.89 5H14.5a.5.5 0 0 1 .485.62l-1.5 6A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.485-.379L1.61 2H.5a.5.5 0 0 1-.5-.5zM4 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
    </svg>
  )
}

const sectionVariants = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function MenuPage() {
  const navigate = useNavigate()
  const cartBarRef = useRef(null)
  const { cart } = useCart()
  const { preferredMethod } = useOrderDraft()

  const subtotal = useMemo(() => getSubtotal(cart), [cart])
  const total = subtotal
  const itemCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)

  const goCheckout = () => {
    navigate('/order', { state: { method: preferredMethod } })
  }

  return (
    <div className="app-shell app-shell-menu">
      <Header />

      <main className="container home-stack menu-page-stack">
        <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="show">
          <Hero />
        </motion.div>

        <motion.div custom={0.08} variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          <MenuSection cartBarRef={cartBarRef} />
        </motion.div>
      </main>

      <motion.button
        ref={cartBarRef}
        className={`floating-checkout glass-card ${cart.length ? 'floating-checkout-active' : 'floating-checkout-hidden'}`.trim()}
        type="button"
        onClick={goCheckout}
        aria-label="Checkout"
        initial={false}
        animate={cart.length ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 90, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="floating-checkout-icon-wrap" aria-hidden="true">
          <span className="floating-checkout-icon-bubble">
            <CartIcon />
          </span>
          <span className="floating-checkout-badge">{itemCount}</span>
        </span>

        <span className="floating-checkout-copy">
          <span className="floating-checkout-copy-head">
            <span className="floating-checkout-title">Total</span>
            <span className="floating-checkout-action-text">CHECK OUT ({itemCount})</span>
          </span>
          <strong>{currency.format(total)}</strong>
          <small>{itemCount} item{itemCount > 1 ? 's' : ''}</small>
        </span>
      </motion.button>

      <Footer />
    </div>
  )
}

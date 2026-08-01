import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { useOrderDraft } from '../context/OrderDraftContext'
import { useMenu } from '../context/MenuContext'
import {
  currency,
  formatItemVariant,
  getBaseSubtotal,
  getSubtotal,
  getVariantSubtotal,
} from '../data/siteConfig'
import { MENU_PLACEHOLDER_IMAGE } from '../data/menuItems'

function RelatedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 20h4l10.5-10.5a1.7 1.7 0 0 0 0-2.4L16.9 5.5a1.7 1.7 0 0 0-2.4 0L4 16v4z" />
      <path d="M13.5 7.5l3 3" />
    </svg>
  )
}

export default function OrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cart, updateQty, addItem } = useCart()
  const { customer, setCustomer, preferredMethod, setPreferredMethod } = useOrderDraft()
  const { items: menuItems, loading: menuLoading } = useMenu()
  const [error, setError] = useState('')

  const subtotal = useMemo(() => getSubtotal(cart), [cart])
  const menuSubtotal = useMemo(() => getBaseSubtotal(cart), [cart])
  const variantSubtotal = useMemo(() => getVariantSubtotal(cart), [cart])
  const total = subtotal
  const selectedMethod = String(location.state?.method || preferredMethod || 'QRIS').toUpperCase()

  const handleRelatedAdd = (item) => {
    if (item.available === false) return
    if (item.hasVariantPage) {
      navigate(`/variant/${item.id}`)
      return
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      basePrice: item.price,
      variantPrice: 0,
      category: item.category,
      emoji: item.emoji,
      image: item.image,
      available: item.available,
      variant: '',
      variantLabel: '',
    })
  }

  const handleContinue = () => {
    setError('')

    if (!cart.length) {
      setError('Keranjang masih kosong.')
      return
    }

    setPreferredMethod(selectedMethod)
    navigate('/payment-confirmation', { state: { method: selectedMethod } })
  }

  return (
    <div className="app-shell">
      <main className="container checkout-only-page order-page-layout">
        <motion.section
          className="order-head glass-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <p className="eyebrow">Order</p>
            <h1>Pesanan anda yang sudah dipilih</h1>
            <p className="hero-text">Edit jumlah item dibawah ini, atau masih kurang?? Klik +Add order for btambah menu</p>
          </div>
        </motion.section>

        <div className="order-content-grid">
          <div className="order-main-column">
            <section className="order-items-panel glass-card">
              <div className="section-head compact order-items-head">
                <div>
                  <p className="eyebrow">Ordered Items</p>
                </div>
                <button className="ghost-btn order-add-more-btn" type="button" onClick={() => navigate('/')}>
                  + Add order
                </button>
              </div>

              {!cart.length ? (
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <p>Belum ada item yang masuk ke keranjang.</p>
                </div>
              ) : (
                <div className="order-scroll order-scroll-list" role="list" aria-label="Daftar pesanan">
                  {cart.map((item) => {
                    const variantLabel = formatItemVariant(item)
                    return (
                      <motion.article
                        key={`${item.id}-${item.variant || ''}`}
                        className="order-item-card"
                        whileHover={{ y: -2 }}
                      >
                        <div className="order-item-thumb" aria-hidden="true">
                          {item.image || MENU_PLACEHOLDER_IMAGE ? <img src={item.image || MENU_PLACEHOLDER_IMAGE} alt="" /> : (item.emoji || '🥟')}
                        </div>
                        <div className="order-item-copy">
                          <strong>{item.name}</strong>
                          <span>{variantLabel || 'Tanpa varian'}</span>
                          <small>{currency.format(item.price)}</small>
                        </div>
                        <div className="order-item-actions">
                          <div className="qty-control order-qty">
                            <button type="button" onClick={() => updateQty(item.id, -1, item.variant)} aria-label={`Kurangi ${item.name}`}>−</button>
                            <span>{item.qty}</span>
                            <button type="button" onClick={() => updateQty(item.id, 1, item.variant)} aria-label={`Tambah ${item.name}`}>+</button>
                          </div>
                          <button
                            type="button"
                            className="order-edit-btn"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => {
                              if (item.variant) {
                                navigate(`/variant/${item.id}`)
                                return
                              }
                              navigate('/')
                            }}
                          >
                            <EditIcon />
                          </button>
                        </div>
                      </motion.article>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="order-note-card glass-card">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Add another notes</p>
                </div>
              </div>

              <label className="field field-full">
                <span>Catatan untuk pesanan anda</span>
                <textarea
                  value={customer.note}
                  onChange={(event) => setCustomer((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Isi catatan pesanan anda (Opsional)"
                  rows={3}
                />
              </label>
            </section>

            <section className="payment-detail-card glass-card">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Payment detail</p>
                </div>
              </div>

              <div className="summary-stack">
                <div className="summary-row"><span>Subtotal menu</span><strong>{currency.format(menuSubtotal)}</strong></div>
                <div className="summary-row"><span>Varian yang dipilih</span><strong>{currency.format(variantSubtotal)}</strong></div>
                <div className="summary-row total"><span>Total</span><strong>{currency.format(total)}</strong></div>
              </div>
            </section>

            <button className="primary-btn order-continue-btn" type="button" onClick={handleContinue}>
              Continue to payment
            </button>

            {error ? <div className="notice error">{error}</div> : null}
          </div>

          <aside className="order-related-column">
            <section className="related-menu-panel glass-card">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Related Menu</p>
                </div>
              </div>

              <div className="related-menu-scroll">
                {menuLoading ? (
                  <div className="related-menu-empty">Memuat menu...</div>
                ) : menuItems.length ? (
                  menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`related-menu-card${item.available === false ? ' is-unavailable' : ''}`}
                      onClick={() => handleRelatedAdd(item)}
                      disabled={item.available === false}
                    >
                      <span className="related-menu-thumb">
                        <img src={item.image || MENU_PLACEHOLDER_IMAGE} alt={item.name} />
                      </span>
                      <span className="related-menu-copy">
                        <strong>{item.name}</strong>
                        <small>{item.available === false ? 'Stok Kosong' : currency.format(item.price)}</small>
                      </span>
                      <span className="related-menu-add" aria-hidden="true">
                        <RelatedIcon />
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="related-menu-empty">Belum ada menu tersedia.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

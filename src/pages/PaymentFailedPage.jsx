
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { currency, formatOrderTime, getAdminContactUrl, getMethodLabel, getStatusLabel, pickupPoint } from '../data/siteConfig'
import { checkPayment } from '../services/paymentGateway'
import { normalizeOrder, readLastOrder, writeLastOrder } from '../lib/orderHelpers'

function MapPreview() {
  return (
    <a className="map-preview failed-map" href={pickupPoint.map} target="_blank" rel="noreferrer">
      <div className="map-preview-top">
        <span className="map-pin">📍</span>
        <div>
          <strong>{pickupPoint.name}</strong>
          <p>{pickupPoint.detail}</p>
        </div>
      </div>
      <div className="map-mini-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="map-preview-footer">{pickupPoint.note}</div>
    </a>
  )
}

export default function PaymentFailedPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [order, setOrder] = useState(() => {
    const initial = normalizeOrder(location.state?.order || readLastOrder())
    return initial && String(initial.orderId) === String(orderId) ? initial : null
  })

  useEffect(() => {
    if (!order?.orderId) {
      navigate('/order', { replace: true })
    }
  }, [order, orderId, navigate])

  useEffect(() => {
    if (!order?.orderId) return
    const timer = setInterval(async () => {
      try {
        const latest = await checkPayment(order.orderId)
        if (latest?.orderId) {
          const normalized = normalizeOrder(latest, order)
          setOrder(normalized)
          writeLastOrder(normalized)
        }
      } catch {
        // ignore
      }
    }, 12000)
    return () => clearInterval(timer)
  }, [order])

  if (!order?.orderId) return null

  const contact = getAdminContactUrl(order)

  return (
    <div className="app-shell">
      <main className="container checkout-only-page">
        <motion.section
          className="payment-panel failure-panel glass-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="success-hero">
            <p className="eyebrow">Pembayaran gagal</p>
            <h2>Silakan kirim pesan ke admin</h2>
            <p className="qris-note">
              Order ID {orderId || order.orderId} • {getMethodLabel(order.method)} • {formatOrderTime(order.time)}
            </p>
            <div className="payment-total">{currency.format(Number(order.total || 0))}</div>
          </div>

          <div className="notice error">
            Pembayaran belum dikonfirmasi setelah beberapa kali cek status. Silakan kirim pesan ke admin untuk membantu konfirmasi manual.
          </div>

          <MapPreview />

          <div className="failure-actions">
            <a className="primary-btn" href={contact.href} target="_blank" rel="noreferrer" onClick={(e) => {
              if (contact.href === '#') e.preventDefault()
            }}>
              Kirim Pesan ke {contact.label}
            </a>
            <button className="ghost-btn" type="button" onClick={() => navigate(`/payment/${String(order.method || 'qris').toLowerCase()}/${order.orderId}`, { replace: true, state: { order } })}>
              Cek Lagi
            </button>
          </div>

          <div className="summary-stack failure-summary">
            <div className="summary-row"><span>Status</span><strong>{getStatusLabel(order.status)}</strong></div>
            <div className="summary-row"><span>Metode</span><strong>{getMethodLabel(order.method)}</strong></div>
            <div className="summary-row"><span>Waktu</span><strong>{formatOrderTime(order.time)}</strong></div>
          </div>
        </motion.section>
      </main>
    </div>
  )
}

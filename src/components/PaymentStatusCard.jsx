
import React from 'react'
import { motion } from 'framer-motion'
import { currency, formatOrderTime, getMethodLabel, getStatusLabel } from '../data/siteConfig'

export default function PaymentStatusCard({ order, variant, onCheck, checking, statusText, children }) {
  const paymentStatus = String(order?.paymentStatus || order?.status || 'pending').toLowerCase()

  return (
    <div className="payment-status-shell">
      <motion.div
        className="payment-status-card glass-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="payment-status-head">
          <div>
            <p className="eyebrow">{variant === 'qris' ? 'QRIS dinamis' : 'Pembayaran tunai'}</p>
            <h1>{getStatusLabel(paymentStatus)}</h1>
            <p className="status-subline">
              Order ID: {order.orderId} • {getMethodLabel(order.paymentMethod || order.method)} • {formatOrderTime(order.createdAt || order.time)}
            </p>
          </div>
          <div className="status-total">{currency.format(Number(order.total || 0))}</div>
        </div>

        <div className="status-pill-stack">
          <span className={paymentStatus === 'paid' ? 'status-pill live' : 'status-pill'}>
            {statusText || getStatusLabel(paymentStatus)}
          </span>
        </div>

        {children}

        <button className="ghost-btn" type="button" onClick={onCheck} disabled={checking}>
          {checking ? 'Mengecek status...' : 'Periksa Status Pembayaran'}
        </button>
      </motion.div>
    </div>
  )
}

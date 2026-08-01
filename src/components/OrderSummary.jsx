
import React from 'react'
import { currency, formatOrderTime, getMethodLabel, getStatusLabel, getSubtotal, getOrderItemsCount, formatItemVariant } from '../data/siteConfig'

export default function OrderSummary({ order, cart = [] }) {
  const items = order?.items || cart
  const subtotal = order?.subtotal ?? getSubtotal(items)
  const total = order?.total ?? subtotal

  return (
    <div className="order-summary">
      <div className="summary-head">
        <div>
          <p className="eyebrow">Ringkasan order</p>
          <h3>{order?.orderId || 'Keranjang aktif'}</h3>
        </div>
        {order ? <span className="status-pill live">{getStatusLabel(order.status)}</span> : null}
      </div>

      <div className="summary-stack">
        <div className="summary-row"><span>Nama customer</span><strong>{order?.name || order?.customerName || '-'}</strong></div>
        <div className="summary-row"><span>Nomor customer</span><strong>{order?.phone || order?.customerPhone || order?.customer_phone || order?.whatsapp || '-'}</strong></div>
        <div className="summary-row"><span>Email customer</span><strong>{order?.email || order?.customerEmail || order?.customer_email || '-'}</strong></div>
        <div className="summary-row"><span>Catatan</span><strong>{order?.note || order?.customerNote || '-'}</strong></div>
        <div className="summary-row"><span>Metode pembayaran</span><strong>{order ? getMethodLabel(order.method) : '-'}</strong></div>
        <div className="summary-row"><span>Jumlah item</span><strong>{getOrderItemsCount(items)}</strong></div>
        <div className="summary-row"><span>Waktu</span><strong>{formatOrderTime(order?.time)}</strong></div>
      </div>

      <div className="summary-items">
        {items.length ? items.map((item) => (
          <div key={`${item.id || item.name}-${item.variant || ''}`} className="summary-row">
            <span>
              {item.name}{formatItemVariant(item) ? ` ${formatItemVariant(item)}` : ''} x{item.qty ?? item.quantity ?? 0}
            </span>
            <strong>{currency.format((item.price || 0) * (item.qty ?? item.quantity ?? 0))}</strong>
          </div>
        )) : <p className="summary-empty">Belum ada item.</p>}
      </div>

      <div className="summary-total-box">
        <div className="summary-row"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
        <div className="summary-row total"><span>Total</span><strong>{currency.format(total)}</strong></div>
      </div>
    </div>
  )
}

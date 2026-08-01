import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { currency } from '../data/siteConfig'
import OrderSummary from './OrderSummary'

function QrisPreview({ qris, orderId, total, countdown, generating, error, onRetry }) {
  const nominal = Number(qris?.nominal ?? total ?? 0)
  const [imageSrc, setImageSrc] = useState(qris?.link_qris || '')

  useEffect(() => {
    let cancelled = false

    const buildFallback = async () => {
      if (qris?.link_qris) {
        setImageSrc(qris.link_qris)
        return
      }

      const qrString = String(qris?.qr_string || '').trim()
      if (!qrString) return

      try {
        if (!QRCode?.toDataURL) return
        const dataUrl = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 8,
          type: 'image/png',
        })
        if (!cancelled && dataUrl) {
          setImageSrc(dataUrl)
        }
      } catch {
        // keep empty so the UI can show the existing error state
      }
    }

    buildFallback()

    return () => {
      cancelled = true
    }
  }, [qris?.link_qris, qris?.qr_string])

  if (!imageSrc) {
    if (generating) {
      return (
        <div className="confirm-qris-box">
          <div className="payment-loader-box">
            <div className="loading-spinner" />
            <strong>Sedang membuat QRIS...</strong>
            <p>Menunggu respons API Midtrans.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="confirm-qris-box">
        <div className="payment-error-box">
          <strong>Gagal generate QRIS</strong>
          <p>{error || 'QR belum tersedia.'}</p>
          <button className="primary-btn" type="button" onClick={onRetry} disabled={generating}>
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="confirm-qris-box">
      <div className="confirm-qris-image-wrap">
        <img src={imageSrc} alt="QRIS pembayaran" className="confirm-qris-image" />
      </div>

      <div className="confirm-qris-meta">
        <div className="summary-row"><span>UID</span><strong>{orderId || '-'}</strong></div>
        <div className="summary-row"><span>Total bayar</span><strong>{currency.format(nominal)}</strong></div>
        <div className="summary-row"><span>Status QRIS</span><strong>{qris?.status || 'success'}</strong></div>
        {countdown ? <div className="summary-row"><span>Sisa waktu</span><strong>{countdown}</strong></div> : null}
      </div>
    </div>
  )
}

function CashPreview({ orderId, total }) {
  return (
    <div className="cash-confirm-box">
      <div className="cash-confirm-badge">💵</div>
      <h3>Menunggu konfirmasi pesanan</h3>
      <div className="summary-row"><span>UID</span><strong>{orderId || '-'}</strong></div>
      <div className="summary-row"><span>Total bayar</span><strong>{currency.format(Number(total || 0))}</strong></div>
    </div>
  )
}

export default function PaymentConfirmationCard({
  order,
  isQris,
  attemptsLeft,
  checking,
  onConfirm,
  qris,
  countdown,
  generating,
  qrisError,
  onRetryQris,
  children,
}) {
  return (
    <motion.section
      className="payment-confirmation-card glass-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <OrderSummary order={order} />

      {isQris ? (
        <QrisPreview
          qris={qris}
          orderId={order?.orderId}
          total={order?.total}
          countdown={countdown}
          generating={generating}
          error={qrisError}
          onRetry={onRetryQris}
        />
      ) : (
        <CashPreview orderId={order?.orderId} total={order?.total} />
      )}

      <div className="confirm-actions">
        <button className="primary-btn checkout-continue confirm-order-btn" type="button" onClick={onConfirm} disabled={checking || attemptsLeft <= 0}>
          {checking ? 'Mengecek...' : attemptsLeft > 0 ? `Konfirmasi Pesanan (${attemptsLeft})` : 'Tiket habis'}
        </button>
      </div>

      {children}
    </motion.section>
  )
}

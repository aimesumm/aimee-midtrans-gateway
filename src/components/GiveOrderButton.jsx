
import React from 'react'
import { OWNER_WHATSAPP, getCustomerOrderMessage } from '../data/siteConfig'

export default function GiveOrderButton({ order }) {
  const phone = String(OWNER_WHATSAPP || '').replace(/[^\d]/g, '')
  const href = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(getCustomerOrderMessage(order))}`
    : '#'

  return (
    <a
      className={`primary-btn ${phone ? '' : 'disabled-link'}`.trim()}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!phone}
      onClick={(event) => {
        if (!phone) event.preventDefault()
      }}
    >
      Kirim Pesanan Anda ke WhatsApp
    </a>
  )
}

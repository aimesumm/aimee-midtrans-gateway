import React from 'react'
import { motion } from 'framer-motion'
import { useOrderDraft } from '../context/OrderDraftContext'

export default function CustomerDetailsCard({ hideNote = false, title = 'Customer information', copy = 'Data ini akan ikut terkirim ke backend dan ke pesan admin untuk konfirmasi pesanan.' }) {
  const { customer, setCustomer } = useOrderDraft()

  return (
    <motion.section
      className="customer-card glass-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45 }}
    >
      <div className="section-head compact">
        <div>
          <p className="eyebrow">Customer information</p>
          <h2>{title}</h2>
          <p className="section-copy">{copy}</p>
        </div>
      </div>

      <div className="field-grid customer-grid">
        <label className="field">
          <span>Nama</span>
          <input
            value={customer.name}
            onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nama pelanggan"
          />
        </label>

        <label className="field">
          <span>Nomor WhatsApp</span>
          <input
            value={customer.phone}
            onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="08xxxxxxxxxx"
          />
        </label>

        <label className="field field-full">
          <span>Email</span>
          <input
            type="email"
            value={customer.email}
            onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="nama@email.com"
          />
        </label>

        {hideNote ? null : (
          <label className="field field-full">
            <span>Add another notes</span>
            <textarea
              value={customer.note}
              onChange={(event) => setCustomer((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Tambah catatan tambahan untuk admin"
              rows={3}
            />
          </label>
        )}
      </div>
    </motion.section>
  )
}

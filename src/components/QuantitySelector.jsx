
import React from 'react'

export default function QuantitySelector({ quantity, onChange, min = 1 }) {
  const decrease = () => onChange(Math.max(min, quantity - 1))
  const increase = () => onChange(quantity + 1)

  return (
    <div className="qty-selector">
      <button type="button" className="qty-selector-btn" onClick={decrease} aria-label="Kurangi jumlah">
        −
      </button>
      <span className="qty-selector-value">{quantity}</span>
      <button type="button" className="qty-selector-btn" onClick={increase} aria-label="Tambah jumlah">
        +
      </button>
    </div>
  )
}


import React from 'react'
import { currency } from '../data/siteConfig'

export default function PriceSummary({ basePrice, variantPrice = 0, quantity, total }) {
  return (
    <div className="price-summary">
      <div className="price-summary-row">
        <span>Harga dasar</span>
        <span>{currency.format(basePrice)}</span>
      </div>
      {variantPrice ? (
        <div className="price-summary-row">
          <span>Varian</span>
          <span>+{currency.format(variantPrice)}</span>
        </div>
      ) : null}
      <div className="price-summary-row">
        <span>Quantity</span>
        <span>x{quantity}</span>
      </div>
      <div className="price-summary-row total">
        <span>Total</span>
        <strong>{currency.format(total)}</strong>
      </div>
    </div>
  )
}

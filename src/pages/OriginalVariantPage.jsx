
import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { currency } from '../data/siteConfig'
import { MENU_PLACEHOLDER_IMAGE } from '../data/menuItems'
import { useCart } from '../context/CartContext'
import { useMenu } from '../context/MenuContext'
import VariantSelector from '../components/VariantSelector'
import QuantitySelector from '../components/QuantitySelector'
import PriceSummary from '../components/PriceSummary'

export default function OriginalVariantPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { items, loading } = useMenu()

  const item = useMemo(() => items.find((m) => String(m.id) === String(id)), [id, items])

  const [selectedKey, setSelectedKey] = useState(null)
  const [quantity, setQuantity] = useState(1)

  if (!item && loading) {
    return (
      <div className="app-shell">
        <div className="container variant-page-empty">
          <p>Memuat menu...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="app-shell">
        <div className="container variant-page-empty">
          <p>Menu tidak ditemukan.</p>
          <button className="ghost-btn" type="button" onClick={() => navigate('/')}>Kembali ke Menu</button>
        </div>
      </div>
    )
  }

  const selectedOption = item.variantOptions?.find((opt) => opt.key === selectedKey) || null
  const variantPrice = selectedOption?.price || 0
  const unitPrice = item.price + variantPrice
  const total = unitPrice * quantity
  const isAvailable = item.available !== false

  const handleClose = () => navigate(-1)

  const handleAddOrder = () => {
    if (!isAvailable) return

    addItem(
      {
        id: item.id,
        name: item.name,
        price: unitPrice,
        basePrice: item.price,
        variantPrice: variantPrice,
        variant: selectedOption?.key || '',
        variantLabel: selectedOption?.label || '',
        category: item.category,
        emoji: item.emoji,
        image: item.image,
        available: item.available,
      },
      quantity,
    )
    navigate('/')
  }

  return (
    <div className="app-shell variant-page">
      <div className="variant-hero">
        <button className="variant-close-btn" type="button" onClick={handleClose} aria-label="Tutup">
          ×
        </button>
        <div className="variant-hero-image">
          {(item.image || MENU_PLACEHOLDER_IMAGE) ? (
            <img src={item.image || MENU_PLACEHOLDER_IMAGE} alt={item.name} />
          ) : (
            <span aria-hidden="true">{item.emoji}</span>
          )}
        </div>
      </div>

      <motion.main
        className="container variant-body"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="variant-name">{item.name.toUpperCase()}</h1>
        <strong className="variant-base-price">{currency.format(item.price)}</strong>
        <p className="variant-desc">{item.desc}</p>
        {!isAvailable ? <p className="variant-stock-note">Stok kosong — menu ini tidak bisa ditambahkan ke keranjang.</p> : null}

        {item.variantOptions?.length ? (
          <VariantSelector
            options={item.variantOptions}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
          />
        ) : null}

        <div className="variant-qty-row">
          <span className="variant-qty-label">Quantity</span>
          <QuantitySelector quantity={quantity} onChange={setQuantity} />
        </div>

        <PriceSummary
          basePrice={item.price}
          variantPrice={variantPrice}
          quantity={quantity}
          total={total}
        />
      </motion.main>

      <div className="variant-footer">
        <button className="variant-add-order-btn" type="button" onClick={handleAddOrder} disabled={!isAvailable}>
          <span>{isAvailable ? 'Add Orders' : 'Stok Kosong'}</span>
          {isAvailable ? <span>•</span> : null}
          <span>{isAvailable ? currency.format(total) : ''}</span>
        </button>
      </div>
    </div>
  )
}

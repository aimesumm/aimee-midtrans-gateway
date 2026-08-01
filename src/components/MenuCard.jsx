import React from 'react'
import { motion } from 'framer-motion'
import { currency } from '../data/siteConfig'
import { MENU_PLACEHOLDER_IMAGE } from '../data/menuItems'

export default function MenuCard({
  item,
  index = 0,
  cartQty = 0,
  onAdd,
  onIncrease,
  onDecrease,
}) {
  const isAvailable = item.available !== false
  const hasStepper = isAvailable && !item.hasVariantPage && Number(cartQty) > 0

  return (
    <motion.article
      className={`menu-card-v2 glass-card${isAvailable ? '' : ' is-unavailable'}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.38, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
      whileHover={isAvailable ? { y: -3 } : undefined}
    >
      <div className="menu-card-v2-image">
        <img src={item.image || MENU_PLACEHOLDER_IMAGE} alt={item.name} loading="lazy" />
        {item.badge ? <span className="menu-badge">{item.badge}</span> : null}
        {!isAvailable ? <span className="menu-card-v2-stock-badge">Stok Kosong</span> : null}
      </div>

      <div className="menu-card-v2-body">
        <h3>{item.name}</h3>
        <strong className="menu-card-v2-price">{currency.format(item.price)}</strong>
      </div>

      <div className="menu-card-v2-footer">
        {!isAvailable ? (
          <button
            className="menu-card-v2-add menu-card-v2-add-disabled"
            type="button"
            disabled
            aria-disabled="true"
            aria-label={`${item.name} stok kosong`}
          >
            Stok Kosong
          </button>
        ) : item.hasVariantPage ? (
          <button
            className="menu-card-v2-add"
            type="button"
            onClick={(event) => onAdd?.(item, event.currentTarget)}
            aria-label={`Add ${item.name}`}
          >
            Add
          </button>
        ) : hasStepper ? (
          <div className="menu-card-v2-qty" aria-label={`Jumlah ${item.name}`}>
            <button
              type="button"
              className="menu-card-v2-qty-btn"
              onClick={(event) => onDecrease?.(item, event.currentTarget)}
              aria-label={`Kurangi ${item.name}`}
            >
              −
            </button>
            <span className="menu-card-v2-qty-value">{cartQty}</span>
            <button
              type="button"
              className="menu-card-v2-qty-btn"
              onClick={(event) => onIncrease?.(item, event.currentTarget)}
              aria-label={`Tambah ${item.name}`}
            >
              +
            </button>
          </div>
        ) : (
          <button
            className="menu-card-v2-add"
            type="button"
            onClick={(event) => onAdd?.(item, event.currentTarget)}
            aria-label={`Tambah ${item.name} ke keranjang`}
          >
            Add
          </button>
        )}
      </div>
    </motion.article>
  )
}

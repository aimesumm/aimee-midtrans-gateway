
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const CART_KEY = 'aime_dimsum_cart_v2'

function readStoredCart() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function itemKey(item = {}) {
  return `${String(item.id || '')}__${String(item.variant || '').toLowerCase()}`
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => readStoredCart())

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      // ignore storage failures
    }
  }, [cart])

  const api = useMemo(() => {
    const addItem = (item, quantity = 1) => {
      const qtyToAdd = Math.max(1, Number(quantity) || 1)
      const isAvailable = item?.available !== false && item?.inStock !== false
      if (!isAvailable) return

      const nextItem = {
        ...item,
        available: true,
        variant: item.variant || '',
        variantLabel: item.variantLabel || item.variant || '',
      }

      setCart((prev) => {
        const found = prev.find((x) => itemKey(x) === itemKey(nextItem))
        if (found) {
          return prev.map((x) => (itemKey(x) === itemKey(nextItem) ? { ...x, qty: Number(x.qty || 0) + qtyToAdd } : x))
        }
        return [...prev, { ...nextItem, qty: qtyToAdd }]
      })
    }

    const updateQty = (id, delta, variant = '') => {
      setCart((prev) =>
        prev
          .map((item) => {
            const matchId = String(item.id) === String(id)
            const matchVariant = String(item.variant || '').toLowerCase() === String(variant || '').toLowerCase()
            return matchId && matchVariant ? { ...item, qty: Number(item.qty || 0) + delta } : item
          })
          .filter((item) => Number(item.qty || 0) > 0)
      )
    }

    const removeItem = (id, variant = '') => updateQty(id, -Number.MAX_SAFE_INTEGER, variant)
    const clearCart = () => setCart([])

    return { cart, setCart, addItem, updateQty, removeItem, clearCart }
  }, [cart])

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart harus dipakai di dalam CartProvider')
  return ctx
}

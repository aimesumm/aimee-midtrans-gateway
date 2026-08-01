import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'aime_dimsum_order_draft_v2'
const METHOD_KEY = 'aime_dimsum_preferred_method_v2'

const OrderDraftContext = createContext(null)

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function OrderDraftProvider({ children }) {
  const [customer, setCustomer] = useState(() => readJson(STORAGE_KEY, {
    name: '',
    phone: '',
    email: '',
    note: '',
  }))
  const [preferredMethod, setPreferredMethod] = useState(() => {
    if (typeof window === 'undefined') return 'QRIS'
    return window.localStorage.getItem(METHOD_KEY) || 'QRIS'
  })

  useEffect(() => {
    writeJson(STORAGE_KEY, customer)
  }, [customer])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(METHOD_KEY, preferredMethod)
  }, [preferredMethod])

  const value = useMemo(() => ({
    customer,
    setCustomer,
    preferredMethod,
    setPreferredMethod,
  }), [customer, preferredMethod])

  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>
}

export function useOrderDraft() {
  const ctx = useContext(OrderDraftContext)
  if (!ctx) throw new Error('useOrderDraft harus dipakai di dalam OrderDraftProvider')
  return ctx
}

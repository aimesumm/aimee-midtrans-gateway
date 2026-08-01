import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CustomerDetailsCard from '../components/CustomerDetailsCard'
import PaymentMethodPicker from '../components/PaymentMethodPicker'
import PaymentConfirmationCard from '../components/PaymentConfirmationCard'
import { checkPayment, createOrder, createQris, getOrderStatus } from '../services/paymentGateway'
import { useCart } from '../context/CartContext'
import { useOrderDraft } from '../context/OrderDraftContext'
import { supabaseBrowser } from '../lib/supabaseClient'
import { normalizeOrder, readLastOrder, writeLastOrder } from '../lib/orderHelpers'

const QRIS_TTL_MS = 10 * 60 * 1000
const POLL_INTERVAL_MS = 3000

function timeLeft(expiresAt, referenceTime = Date.now()) {
  if (!expiresAt) return ''
  const diff = Math.max(0, new Date(expiresAt).getTime() - referenceTime)
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function PaymentPage() {
  const { method: routeMethod, orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { cart, clearCart } = useCart()
  const { customer, preferredMethod, setPreferredMethod } = useOrderDraft()

  const initialOrder = useMemo(() => {
    const stateOrder = location.state?.order || readLastOrder()
    if (!orderId) return null
    if (stateOrder?.orderId && String(stateOrder.orderId) === String(orderId)) return normalizeOrder(stateOrder)
    return null
  }, [location.state, orderId])

  const draftMode = !orderId
  const [order, setOrder] = useState(() => initialOrder || null)
  const [bootstrapping, setBootstrapping] = useState(Boolean(orderId && !initialOrder))
  const [bootstrapError, setBootstrapError] = useState('')
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [checkAttempts, setCheckAttempts] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState(() => String(routeMethod || initialOrder?.paymentMethod || initialOrder?.method || preferredMethod || 'QRIS').toUpperCase())

  const stableQrisRef = useRef(initialOrder?.qris || null)
  const checkoutTransitionRef = useRef(false)

  const mergeStableOrder = (payload, fallback = order) => {
    const merged = normalizeOrder(payload, fallback)
    const qris = payload?.qris || fallback?.qris || stableQrisRef.current
    if (qris) {
      merged.qris = qris
      if (qris.link_qris) stableQrisRef.current = qris
    }
    return merged
  }

  const currentMethod = String(order?.paymentMethod || order?.method || selectedMethod || routeMethod || 'QRIS').toUpperCase()
  const isQris = currentMethod === 'QRIS'
  const displayQris = order?.qris?.link_qris ? order.qris : stableQrisRef.current || order?.qris || null
  const expiresAt = displayQris?.expiresAt || (order?.createdAt ? new Date(new Date(order.createdAt).getTime() + QRIS_TTL_MS).toISOString() : '')
  const qrisCountdown = isQris ? timeLeft(expiresAt, now) : ''
  const attemptsLeft = Math.max(0, 3 - checkAttempts)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (draftMode) return
    if (!orderId || bootstrapping) return
    if (!order) {
      setBootstrapError('Order belum ditemukan. Silakan kembali ke order dan coba lagi.')
    }
  }, [draftMode, order, orderId, bootstrapping])

  useEffect(() => {
    if (draftMode && !cart.length && !checkoutTransitionRef.current) navigate('/order', { replace: true })
  }, [draftMode, cart.length, navigate])

  useEffect(() => {
    let cancelled = false

    const loadInitialOrder = async () => {
      if (order || !orderId) return
      try {
        const latest = await getOrderStatus(orderId)
        if (!cancelled && latest?.orderId) {
          const normalized = mergeStableOrder(latest)
          const status = String(normalized.paymentStatus || normalized.status || 'pending').toLowerCase()
          setOrder(normalized)
          writeLastOrder(normalized)
          setSelectedMethod(String(normalized.paymentMethod || normalized.method || routeMethod || preferredMethod || 'QRIS').toUpperCase())
          if (status === 'paid') {
            navigate(`/success/${String(normalized.paymentMethod || normalized.method || routeMethod || 'qris').toLowerCase()}/${normalized.orderId}`, { replace: true, state: { order: normalized } })
          }
        }
      } catch (err) {
        if (!cancelled) setBootstrapError(err.message || 'Gagal memuat order.')
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    loadInitialOrder()
    return () => {
      cancelled = true
    }
  }, [order, orderId, navigate, routeMethod, preferredMethod])

  useEffect(() => {
    if (!order?.orderId || String(order.paymentStatus || order.status || '').toLowerCase() === 'completed') return

    const poll = setInterval(async () => {
      try {
        const latest = await getOrderStatus(order.orderId)
        if (latest?.orderId) {
          const normalized = mergeStableOrder(latest, order)
          setOrder(normalized)
          writeLastOrder(normalized)
          const status = String(normalized.paymentStatus || normalized.status || 'pending').toLowerCase()
          if (status === 'paid') {
            const method = String(normalized.paymentMethod || normalized.method || routeMethod || 'qris').toLowerCase()
            navigate(`/success/${method}/${normalized.orderId}`, { replace: true, state: { order: normalized } })
          }
          setBootstrapping(false)
        }
      } catch {
        // keep silent, polling will retry
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(poll)
  }, [order, navigate, routeMethod])

  useEffect(() => {
    if (!supabaseBrowser || !order?.orderId) return

    const channel = supabaseBrowser
      .channel(`orders:${order.orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `order_id=eq.${order.orderId}`,
        },
        async () => {
          try {
            const latest = await getOrderStatus(order.orderId)
            if (latest?.orderId) {
              const normalized = mergeStableOrder(latest, order)
              setOrder(normalized)
              writeLastOrder(normalized)
              const status = String(normalized.paymentStatus || normalized.status || 'pending').toLowerCase()
              if (status === 'paid') {
                const method = String(normalized.paymentMethod || normalized.method || routeMethod || 'qris').toLowerCase()
                navigate(`/success/${method}/${normalized.orderId}`, { replace: true, state: { order: normalized } })
              }
              setBootstrapping(false)
            }
          } catch {
            // fallback to polling
          }
        },
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [order?.orderId, navigate, routeMethod])

  useEffect(() => {
    const ensureQris = async () => {
      if (!order?.orderId) return
      if (currentMethod !== 'QRIS') return
      if (order.qris?.link_qris || stableQrisRef.current?.link_qris) return

      setGenerating(true)
      setError('')
      try {
        const qris = await createQris({ orderId: order.orderId, total: order.total })
        const nextOrder = mergeStableOrder({ ...order, qris }, order)
        setOrder(nextOrder)
        writeLastOrder(nextOrder)
        setBootstrapping(false)
      } catch (err) {
        setError(err.message || 'Gagal generate QR.')
      } finally {
        setGenerating(false)
      }
    }

    ensureQris()
  }, [order?.orderId, currentMethod])

  const submitDraftPayment = async () => {
    if (!cart.length) {
      setError('Keranjang masih kosong.')
      return
    }

    if (!customer.name.trim() || !customer.phone.trim() || !customer.email.trim()) {
      setError('Isi nama, nomor WhatsApp, dan email pelanggan terlebih dahulu.')
      return
    }

    setSubmitting(true)
    setError('')
    setPreferredMethod(selectedMethod)

    try {
      const items = cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        basePrice: item.basePrice ?? item.price,
        variantPrice: item.variantPrice ?? 0,
        qty: item.qty,
        category: item.category,
        variant: item.variant,
        variantLabel: item.variantLabel,
      }))

      const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
      const payload = {
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        customerEmail: customer.email.trim(),
        note: customer.note.trim(),
        items,
        itemCount: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        subtotal,
        total: subtotal,
        paymentMethod: selectedMethod,
      }

      const created = await createOrder(payload)
      const nextOrder = normalizeOrder(created)

      writeLastOrder(nextOrder)
      checkoutTransitionRef.current = true

      navigate(`/payment-confirmation/${String(selectedMethod || 'QRIS').toLowerCase()}/${created.orderId}`, {
        replace: true,
        state: { order: nextOrder },
      })

      window.setTimeout(() => {
        clearCart()
      }, 0)
    } catch (err) {
      setError(err.message || 'Checkout gagal.')
    } finally {
      setSubmitting(false)
    }
  }

  const retryQris = async () => {
    if (!order?.orderId) return
    setGenerating(true)
    setError('')
    try {
      const qris = await createQris({ orderId: order.orderId, total: order.total })
      const next = mergeStableOrder({ ...order, qris }, order)
      setOrder(next)
      writeLastOrder(next)
    } catch (err) {
      setError(err.message || 'Gagal generate QR.')
    } finally {
      setGenerating(false)
    }
  }

  const goSuccess = (payload) => {
    const method = String(payload.paymentMethod || payload.method || routeMethod || 'qris').toLowerCase()
    navigate(`/success/${method}/${payload.orderId}`, { replace: true, state: { order: payload } })
  }

  const goFailed = (payload) => {
    navigate(`/payment-failed/${payload.orderId}`, { replace: true, state: { order: payload } })
  }

  const onCheck = async () => {
    if (!order?.orderId) return
    setChecking(true)
    setError('')

    try {
      const latest = await checkPayment(order.orderId)
      if (latest?.orderId) {
        const normalized = mergeStableOrder(latest, order)
        const status = String(normalized.paymentStatus || normalized.status || 'pending').toLowerCase()

        setOrder(normalized)
        writeLastOrder(normalized)

        if (status === 'paid') {
          goSuccess(normalized)
          return
        }

        const nextAttempts = checkAttempts + 1
        setCheckAttempts(nextAttempts)
        if (nextAttempts >= 3) {
          goFailed(normalized)
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal mengecek status pembayaran.')
    } finally {
      setChecking(false)
    }
  }

  if (draftMode) {
    return (
      <div className="app-shell">
        <main className="container payment-gateway-page payment-draft-page">
          <CustomerDetailsCard
            hideNote
            title="Isi data diri anda"
            copy="Nama, nomor WhatsApp, dan email. agar admin bisa mengkonfirmasi pesanan kamu."
          />

          <PaymentMethodPicker
            value={selectedMethod}
            onChange={setSelectedMethod}
            onContinue={submitDraftPayment}
            loading={submitting}
          />

          {error ? <div className="notice error">{error}</div> : null}
        </main>
      </div>
    )
  }

  if (bootstrapping && !order?.orderId) {
    return (
      <div className="app-shell">
        <main className="container payment-gateway-page">
          <div className="payment-loader-box">
            <div className="loading-spinner" />
            <strong>Memuat status pembayaran...</strong>
          </div>
        </main>
      </div>
    )
  }

  if (!order?.orderId) {
    return (
      <div className="app-shell">
        <main className="container payment-gateway-page">
          <div className="payment-error-box">
            <strong>Order belum ditemukan</strong>
            <p>{bootstrapError || 'Silakan kembali ke order dan coba lagi.'}</p>
            <button className="primary-btn" type="button" onClick={() => navigate('/order', { replace: true })}>
              Kembali ke Order
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="container payment-gateway-page">
        <PaymentConfirmationCard
          order={order}
          isQris={isQris}
          attemptsLeft={attemptsLeft}
          checking={checking}
          onConfirm={onCheck}
          qris={displayQris}
          expiresAt={isQris ? expiresAt : ''}
          countdown={qrisCountdown}
          generating={generating}
          qrisError={error}
          onRetryQris={retryQris}
        >
          {error && !(isQris && !displayQris?.link_qris) ? <div className="notice error">{error}</div> : null}

          <div className="notice warning">
            {attemptsLeft > 0
              ? `Menunggu konfirmasi admin • sisa percobaan ${attemptsLeft}`
              : 'Percobaan habis, sistem akan diarahkan ke halaman gagal jika status masih belum berubah.'}
          </div>
        </PaymentConfirmationCard>
      </main>
    </div>
  )
}

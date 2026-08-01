import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PaymentConfirmationCard from '../components/PaymentConfirmationCard'
import { checkPayment, createQris, getOrderStatus } from '../services/paymentGateway'
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

export default function PaymentConfirmationPage() {
  const { method: routeMethod, orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Ambil order dari state atau localStorage
  const initialOrder = useMemo(() => {
    const stateOrder = location.state?.order || readLastOrder()
    if (!orderId) return null
    if (stateOrder?.orderId && String(stateOrder.orderId) === String(orderId)) return normalizeOrder(stateOrder)
    return null
  }, [location.state, orderId])

  const [order, setOrder] = useState(() => initialOrder || null)
  const [bootstrapping, setBootstrapping] = useState(Boolean(orderId && !initialOrder))
  const [bootstrapError, setBootstrapError] = useState('')
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [checkAttempts, setCheckAttempts] = useState(0)

  const stableQrisRef = useRef(initialOrder?.qris || null)

  const mergeStableOrder = (payload, fallback = order) => {
    const merged = normalizeOrder(payload, fallback)
    const qris = payload?.qris || fallback?.qris || stableQrisRef.current
    if (qris) {
      merged.qris = qris
      if (qris.link_qris) stableQrisRef.current = qris
    }
    return merged
  }

  const currentMethod = String(order?.paymentMethod || order?.method || routeMethod || 'QRIS').toUpperCase()
  const isQris = currentMethod === 'QRIS'
  const displayQris = order?.qris?.link_qris ? order.qris : stableQrisRef.current || order?.qris || null
  const expiresAt = displayQris?.expiresAt || (order?.createdAt ? new Date(new Date(order.createdAt).getTime() + QRIS_TTL_MS).toISOString() : '')
  const qrisCountdown = isQris ? timeLeft(expiresAt, now) : ''
  const attemptsLeft = Math.max(0, 3 - checkAttempts)

  // Update waktu setiap detik
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Redirect jika tidak ada orderId
  useEffect(() => {
    if (!orderId) {
      navigate('/order', { replace: true })
    }
  }, [orderId, navigate])

  // Load order dari backend jika belum ada
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
          
          // Jika sudah paid, redirect ke success page
          if (status === 'paid') {
            const method = String(normalized.paymentMethod || normalized.method || routeMethod || 'qris').toLowerCase()
            navigate(`/success/${method}/${normalized.orderId}`, { replace: true, state: { order: normalized } })
            return
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
  }, [order, orderId, navigate, routeMethod])

  // Polling untuk cek status pembayaran
  useEffect(() => {
    if (!order?.orderId || String(order.paymentStatus || order.status || '').toLowerCase() === 'paid') return

    const poll = setInterval(async () => {
      try {
        const latest = await getOrderStatus(order.orderId)
        if (latest?.orderId) {
          const normalized = mergeStableOrder(latest, order)
          setOrder(normalized)
          writeLastOrder(normalized)
          const status = String(normalized.paymentStatus || normalized.status || 'pending').toLowerCase()
          
          // Jika status berubah jadi paid, redirect
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

  // Real-time update via Supabase
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
              
              // Jika status berubah jadi paid, redirect
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

  // Generate QRIS jika method QRIS dan belum ada QRIS
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

  // Retry QRIS generation
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

  // Check payment status (max 3x)
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
          const method = String(normalized.paymentMethod || normalized.method || routeMethod || 'qris').toLowerCase()
          navigate(`/success/${method}/${normalized.orderId}`, { replace: true, state: { order: normalized } })
          return
        }

        const nextAttempts = checkAttempts + 1
        setCheckAttempts(nextAttempts)
        
        // Jika sudah 3x gagal, redirect ke payment failed
        if (nextAttempts >= 3) {
          navigate(`/payment-failed/${normalized.orderId}`, { replace: true, state: { order: normalized } })
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal mengecek status pembayaran.')
    } finally {
      setChecking(false)
    }
  }

  // Loading state
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

  // Error state
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

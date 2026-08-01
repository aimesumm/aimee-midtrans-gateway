
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PaymentSuccessCard from '../components/PaymentSuccess'
import { checkPayment } from '../services/paymentGateway'
import { normalizeOrder, readLastOrder, writeLastOrder } from '../lib/orderHelpers'

export default function QrisSuccessPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [order, setOrder] = useState(() => {
    const initial = normalizeOrder(location.state?.order || readLastOrder())
    return initial && String(initial.orderId) === String(orderId) ? initial : null
  })

  useEffect(() => {
    if (!order?.orderId) {
      navigate('/order', { replace: true })
    }
  }, [order, orderId, navigate])

  useEffect(() => {
    if (!order?.orderId) return
    const timer = setInterval(async () => {
      try {
        const latest = await checkPayment(order.orderId)
        if (latest?.orderId) {
          const normalized = normalizeOrder(latest, order)
          setOrder(normalized)
          writeLastOrder(normalized)
        }
      } catch {
        // ignore
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [order])

  if (!order?.orderId) return null

  return (
    <div className="app-shell">
      <main className="container checkout-only-page">
        <PaymentSuccessCard order={order} variant="qris" />
      </main>
    </div>
  )
}

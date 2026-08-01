import { getOrder } from './_store.js'
import { getMethodLabel, getStatusLabel, formatOrderTime } from './_shared.js'

export default async function handler(req, res) {
  const orderId = String(req.query.orderId || '').trim()

  if (!orderId) {
    return res.status(400).json({ message: 'orderId is required' })
  }

  try {
    const order = await getOrder(orderId)

    if (!order) {
      console.error('[CHECK PAYMENT] ORDER NOT FOUND', { orderId })
      return res.status(404).json({ message: 'Order not found' })
    }

    return res.status(200).json({
      ...order,
      paymentStatus: order.paymentStatus || order.status || 'pending',
      status: order.paymentStatus || order.status || 'pending',
      statusLabel: getStatusLabel(order.paymentStatus || order.status),
      methodLabel: getMethodLabel(order.paymentMethod || order.method),
      timeLabel: formatOrderTime(order.createdAt || order.time),
    })
  } catch (error) {
    console.error('[CHECK PAYMENT] FAILED', { orderId, message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to check payment' })
  }
}

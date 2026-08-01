import { getOrder } from '../../_store.js'
import { getMethodLabel, getStatusLabel, formatOrderTime } from '../../_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const resolvedOrderId = String(req.query.orderId || '').trim()

    if (!resolvedOrderId) {
      return res.status(400).json({ message: 'orderId is required' })
    }

    const order = await getOrder(resolvedOrderId)

    if (!order) {
      console.error('[ORDER STATUS] ORDER NOT FOUND', { orderId: resolvedOrderId })
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
    console.error('[ORDER STATUS] FAILED', { orderId: req.query.orderId, message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to load order status' })
  }
}

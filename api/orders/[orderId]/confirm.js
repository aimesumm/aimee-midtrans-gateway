import { confirmOrder, getOrder } from '../../_store.js'
import { getStatusLabel, formatOrderTime, getMethodLabel } from '../../_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const orderId = String(req.query.orderId || '').trim()
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' })
    }

    const current = await getOrder(orderId)
    if (!current) {
      console.error('[CONFIRM ORDER] ORDER NOT FOUND', { orderId })
      return res.status(404).json({ message: 'Order not found' })
    }

    const result = await confirmOrder(orderId, {
      confirmedAt: req.body?.confirmedAt,
    })

    if (!result.ok) {
      return res.status(result.status).json({
        message: result.message,
        order: result.order || current,
      })
    }

    const order = result.order

    return res.status(200).json({
      ...order,
      paymentStatus: order.paymentStatus,
      status: order.paymentStatus,
      statusLabel: getStatusLabel(order.paymentStatus),
      methodLabel: getMethodLabel(order.paymentMethod || order.method),
      timeLabel: formatOrderTime(order.createdAt || order.time),
    })
  } catch (error) {
    console.error('[CONFIRM ORDER] FAILED', { orderId: req.query.orderId, message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to confirm order' })
  }
}

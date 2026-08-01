import { getOrder, updateOrder } from './_store.js'
import { getStatusLabel, getMethodLabel, formatOrderTime, nowIso, normalizePaymentStatus } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { orderId, status, note, confirmedAt } = req.body || {}
    if (!orderId || !status) {
      return res.status(400).json({ message: 'orderId and status are required' })
    }

    const current = await getOrder(orderId)
    if (!current) {
      console.error('[UPDATE ORDER STATUS] ORDER NOT FOUND', { orderId, status })
      return res.status(404).json({ message: 'Order not found' })
    }

    const nextStatus = normalizePaymentStatus(status)
    const updated = await updateOrder(orderId, {
      paymentStatus: nextStatus,
      status: nextStatus,
      note: note || undefined,
      confirmedAt: confirmedAt || (nextStatus === 'paid' ? nowIso() : undefined),
    })

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' })
    }

    console.log('[UPDATE ORDER STATUS] UPDATE SUCCESS', { orderId, status: nextStatus })

    return res.status(200).json({
      ...updated,
      paymentStatus: updated.paymentStatus,
      status: updated.paymentStatus,
      statusLabel: getStatusLabel(updated.paymentStatus),
      methodLabel: getMethodLabel(updated.paymentMethod || updated.method),
      timeLabel: formatOrderTime(updated.createdAt || updated.time),
    })
  } catch (error) {
    console.error('[UPDATE ORDER STATUS] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to update order status' })
  }
}

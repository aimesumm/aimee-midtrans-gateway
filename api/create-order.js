import { createOrderRecord } from './_store.js'
import { formatOrderTime, getMethodLabel, getOrderItemsCount, getStatusLabel } from './_shared.js'

function buildResponse(order, telegramMessageId = null) {
  return {
    ...order,
    paymentStatus: order.paymentStatus || order.status || 'pending',
    status: order.paymentStatus || order.status || 'pending',
    statusLabel: getStatusLabel(order.paymentStatus || order.status),
    methodLabel: getMethodLabel(order.paymentMethod || order.method),
    timeLabel: formatOrderTime(order.createdAt || order.time),
    itemCount: getOrderItemsCount(order.items || []),
    telegramMessageId: telegramMessageId || order.telegramMessageId || null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const paymentMethod = String(body.paymentMethod || body.method || 'QRIS').toUpperCase() === 'CASH' ? 'CASH' : 'QRIS'
    const items = Array.isArray(body.items) ? body.items : []
    const itemCount = getOrderItemsCount(items)
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || item.quantity || 0), 0)
    const total = Number(body.total || subtotal)

    console.log('[CREATE ORDER] payload received', {
      paymentMethod,
      itemCount,
      total,
    })

    const created = await createOrderRecord({
      customerName: body.customerName || body.name || 'Pelanggan',
      customerPhone: body.customerPhone || body.phone || '-',
      customerEmail: body.customerEmail || body.email || '-',
      note: body.note || '',
      items,
      itemCount,
      subtotal,
      total,
      paymentMethod,
      paymentStatus: 'pending',
    })

    return res.status(200).json(buildResponse({
      ...created,
    }))
  } catch (error) {
    console.error('[CREATE ORDER] FAILED', {
      message: error.message,
    })
    return res.status(500).json({ message: error.message || 'Failed to create order' })
  }
}

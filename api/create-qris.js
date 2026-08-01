import { getOrder, updateOrder } from './_store.js'
import { createMidtransQrisCharge } from './_midtrans.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const orderId = String(req.body?.orderId || '').trim()
    const bodyTotal = Number(req.body?.total || 0)

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' })
    }

    const order = await getOrder(orderId)
    if (!order) {
      console.error('[CREATE QRIS] ORDER NOT FOUND', { orderId })
      return res.status(404).json({ message: 'Order not found', orderId })
    }

    const total = Number(order.total || bodyTotal || 0)
    if (!total || Number.isNaN(total)) {
      return res.status(400).json({ message: 'total is required' })
    }

    const charge = await createMidtransQrisCharge({
      ...order,
      total,
    })

    const normalizedQris = {
      status: String(charge?.transaction_status || 'pending'),
      payment_type: String(charge?.payment_type || 'qris'),
      transaction_id: String(charge?.transaction_id || ''),
      transaction_status: String(charge?.transaction_status || 'pending'),
      gross_amount: String(charge?.gross_amount || total),
      order_id: String(charge?.order_id || orderId),
      acquirer: String(charge?.acquirer || 'gopay'),
      currency: String(charge?.currency || 'IDR'),
      actions: Array.isArray(charge?.actions) ? charge.actions : [],
      qr_string: String(charge?.qris?.qr_string || charge?.qr_string || ''),
      link_qris: String(charge?.qris?.link_qris || ''),
      nominal: String(charge?.qris?.nominal || total),
      generated_at: String(charge?.qris?.generated_at || new Date().toISOString()),
      expiresAt: String(charge?.qris?.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString()),
      raw: charge,
    }

    const updated = await updateOrder(orderId, { qris: normalizedQris })
    if (!updated) {
      console.error('[CREATE QRIS] UPDATE FAILED - ORDER NOT FOUND', { orderId })
      return res.status(404).json({ message: 'Order not found', orderId })
    }

    return res.status(200).json({
      status: 'success',
      orderId,
      ...normalizedQris,
    })
  } catch (error) {
    console.error('[CREATE QRIS] FAILED', {
      message: error.message,
      status: error.status || null,
      details: error.details || null,
    })
    return res.status(500).json({
      message: error.message || 'Failed to generate QRIS',
      details: error.details || null,
    })
  }
}

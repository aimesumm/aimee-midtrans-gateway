import { attachTelegramMessageId, getOrder, updateOrder } from './_store.js'
import { buildTelegramPaidMessage, nowIso } from './_shared.js'
import {
  buildMidtransWebhookSummary,
  normalizeMidtransPaymentStatus,
  verifyMidtransNotificationSignature,
} from './_midtrans.js'

async function telegramApi(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    return await response.json().catch(() => null)
  } catch {
    return null
  }
}

async function sendPaidTelegram(order) {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return null

  const response = await telegramApi('sendMessage', {
    chat_id: chatId,
    text: buildTelegramPaidMessage(order),
  })

  if (!response?.ok) {
    throw new Error(response?.description || 'Failed to send Telegram notification')
  }

  return response.result || null
}

function mergeQris(order = {}, notification = {}) {
  return {
    ...(order.qris || {}),
    status: String(notification.transaction_status || order.qris?.status || 'pending'),
    transaction_status: String(notification.transaction_status || order.qris?.transaction_status || 'pending'),
    transaction_id: String(notification.transaction_id || order.qris?.transaction_id || ''),
    payment_type: String(notification.payment_type || order.qris?.payment_type || 'qris'),
    order_id: String(notification.order_id || order.orderId || ''),
    gross_amount: String(notification.gross_amount || order.qris?.gross_amount || order.total || ''),
    fraud_status: String(notification.fraud_status || order.qris?.fraud_status || ''),
    acquirer: String(notification.acquirer || order.qris?.acquirer || 'gopay'),
    transaction_time: String(notification.transaction_time || order.qris?.transaction_time || ''),
    settlement_time: String(notification.settlement_time || order.qris?.settlement_time || ''),
    raw_notification: notification,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const notification = req.body || {}

    if (!verifyMidtransNotificationSignature(notification)) {
      return res.status(401).json({ message: 'Invalid Midtrans signature' })
    }

    const summary = buildMidtransWebhookSummary(notification)
    const orderId = String(notification.order_id || '').trim()

    if (!orderId) {
      return res.status(400).json({ message: 'order_id is required' })
    }

    const order = await getOrder(orderId)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const currentStatus = String(order.paymentStatus || order.status || 'pending').toLowerCase()
    const nextStatus = normalizeMidtransPaymentStatus(notification.transaction_status, notification.fraud_status)
    const shouldMarkPaid = nextStatus === 'paid'

    if (!shouldMarkPaid) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        orderId,
        paymentStatus: currentStatus,
        transactionStatus: summary.transactionStatus,
      })
    }

    const paidAt = notification.settlement_time || notification.transaction_time || nowIso()

    const updated = await updateOrder(orderId, {
      paymentStatus: 'paid',
      status: 'paid',
      confirmedAt: paidAt,
      qris: mergeQris(order, notification),
    })

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' })
    }

    let telegramMessage = null
    if (!updated.telegramMessageId) {
      telegramMessage = await sendPaidTelegram({
        ...updated,
        confirmedAt: paidAt,
      })
      if (telegramMessage?.message_id) {
        await attachTelegramMessageId(orderId, telegramMessage.message_id)
      }
    }

    return res.status(200).json({
      ok: true,
      orderId,
      paymentStatus: 'paid',
      transactionStatus: notification.transaction_status || 'settlement',
      updated: {
        ...updated,
        telegramMessageId: telegramMessage?.message_id || updated.telegramMessageId || null,
      },
    })
  } catch (error) {
    console.error('[MIDTRANS NOTIFICATION] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Webhook error' })
  }
}

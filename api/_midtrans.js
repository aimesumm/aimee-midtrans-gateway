import crypto from 'crypto'

const DEFAULT_BASE_URL = 'https://api.sandbox.midtrans.com'

function trimSlash(value = '') {
  return String(value || '').trim().replace(/\/$/, '')
}

export function getMidtransBaseUrl() {
  const isProduction = String(process.env.MIDTRANS_IS_PRODUCTION || process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || '').toLowerCase() === 'true'
  return isProduction ? 'https://api.midtrans.com' : DEFAULT_BASE_URL
}

export function getMidtransServerKey() {
  return String(process.env.MIDTRANS_SERVER_KEY || '').trim()
}

function getAuthHeader() {
  const serverKey = getMidtransServerKey()
  if (!serverKey) return ''
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

export function buildMidtransCustomerDetails(order = {}) {
  const fullName = String(order.customerName || order.name || 'Pelanggan').trim() || 'Pelanggan'
  const [firstName, ...rest] = fullName.split(/\s+/)
  return {
    first_name: firstName || 'Pelanggan',
    last_name: rest.join(' ') || undefined,
    email: String(order.customerEmail || order.email || '').trim() || undefined,
    phone: String(order.customerPhone || order.phone || '').trim() || undefined,
  }
}

export function buildMidtransItemDetails(order = {}) {
  return (Array.isArray(order.items) ? order.items : [])
    .map((item, index) => {
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1)
      const price = Number(item.price ?? item.basePrice ?? 0)
      return {
        id: String(item.id || item.menuId || `item-${index + 1}`),
        price: Math.max(0, Math.round(price)),
        quantity: qty,
        name: String(item.name || `Item ${index + 1}`).slice(0, 50),
      }
    })
    .filter((item) => item.price >= 0 && item.quantity > 0)
}

export function selectQrisAction(actions = []) {
  const normalized = Array.isArray(actions) ? actions : []
  const preferred = normalized.find((action) => String(action?.name || '').toLowerCase() === 'generate-qr-code-v2')
    || normalized.find((action) => String(action?.name || '').toLowerCase() === 'generate-qr-code')
    || normalized.find((action) => String(action?.url || '').includes('/qr-code'))
  return preferred?.url ? String(preferred.url) : ''
}

export async function createMidtransQrisCharge(order = {}) {
  const serverKey = getMidtransServerKey()
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY is required')
  }

  const orderId = String(order.orderId || '').trim()
  if (!orderId) {
    throw new Error('orderId is required')
  }

  const grossAmount = Math.max(0, Math.round(Number(order.total || 0)))
  if (!grossAmount) {
    throw new Error('total is required')
  }

  const payload = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: buildMidtransItemDetails(order),
    customer_details: buildMidtransCustomerDetails(order),
    qris: {
      acquirer: 'gopay',
    },
  }

  const response = await fetch(`${getMidtransBaseUrl()}/v2/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.status_message || data?.message || 'Failed to create Midtrans QRIS'
    throw new Error(message)
  }

  const qrisLink = selectQrisAction(data.actions)
  if (!qrisLink) {
    throw new Error('Midtrans QRIS QR image is unavailable')
  }

  return {
    ...data,
    qris: {
      ...(data.qris || {}),
      link_qris: qrisLink,
      nominal: String(data.gross_amount || grossAmount),
      status: String(data.transaction_status || 'pending'),
      generated_at: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
  }
}

export function verifyMidtransNotificationSignature(notification = {}) {
  const serverKey = getMidtransServerKey()
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY is required')
  }

  const orderId = String(notification.order_id || '').trim()
  const statusCode = String(notification.status_code || '').trim()
  const grossAmount = String(notification.gross_amount || '').trim()
  const signatureKey = String(notification.signature_key || '').trim()

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return false
  }

  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`
  const expected = crypto.createHash('sha512').update(payload).digest('hex')
  if (signatureKey.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signatureKey), Buffer.from(expected))
}

export function normalizeMidtransPaymentStatus(transactionStatus = '', fraudStatus = '') {
  const status = String(transactionStatus || '').toLowerCase()
  const fraud = String(fraudStatus || '').toLowerCase()

  if (status === 'settlement') return 'paid'
  if (status === 'capture' && (fraud === 'accept' || !fraud)) return 'paid'
  if (status === 'pending') return 'pending'
  if (status === 'expire' || status === 'deny' || status === 'cancel') return 'failed'
  return status || 'pending'
}

export function buildMidtransWebhookSummary(notification = {}) {
  return {
    transactionId: String(notification.transaction_id || '').trim() || null,
    transactionStatus: String(notification.transaction_status || '').trim() || 'pending',
    paymentType: String(notification.payment_type || 'qris').trim() || 'qris',
    fraudStatus: String(notification.fraud_status || '').trim() || '',
    grossAmount: Number(notification.gross_amount || 0) || 0,
    signatureKey: String(notification.signature_key || '').trim() || '',
    paymentStatus: normalizeMidtransPaymentStatus(notification.transaction_status, notification.fraud_status),
  }
}

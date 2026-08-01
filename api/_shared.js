const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
}

const PAYMENT_METHOD = {
  QRIS: 'QRIS',
  CASH: 'Tunai',
}

const STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Menunggu Konfirmasi Owner',
  [PAYMENT_STATUS.PAID]: 'Pembayaran Berhasil',
  [PAYMENT_STATUS.PROCESSING]: 'Pesanan Diproses',
  [PAYMENT_STATUS.COMPLETED]: 'Pesanan Selesai',
}

const METHOD_LABELS = {
  [PAYMENT_METHOD.QRIS]: 'QRIS',
  [PAYMENT_METHOD.CASH]: 'Tunai',
}

export function nowIso() {
  return new Date().toISOString()
}

function getAdminSecret() {
  return String(process.env.ADMIN_PASSWORD || 'admindimsum').trim()
}

export async function getAdminToken(password) {
  const secret = getAdminSecret()
  if (String(password || '') !== secret) return null

  const cryptoModule = await import('crypto')
  return cryptoModule.createHmac('sha256', secret).update('aime-dimsum-admin').digest('hex')
}

export async function isValidAdminToken(token) {
  if (!token) return false
  const cryptoModule = await import('crypto')
  const secret = getAdminSecret()
  const expected = cryptoModule.createHmac('sha256', secret).update('aime-dimsum-admin').digest('hex')
  if (String(token).length !== expected.length) return false
  return cryptoModule.timingSafeEqual(Buffer.from(String(token)), Buffer.from(expected))
}

export async function requireAdmin(req, res) {
  const token = req.headers['x-admin-token'] || req.headers['X-Admin-Token']
  const valid = await isValidAdminToken(token)
  if (!valid) {
    res.status(401).json({ message: 'Unauthorized: admin login required' })
    return false
  }
  return true
}

export function getStatusLabel(status) {
  return STATUS_LABELS[String(status || '').toLowerCase()] || status || 'Draft Pesanan'
}

export function getMethodLabel(method) {
  const normalized = String(method || '').toUpperCase()
  return METHOD_LABELS[normalized] || method || '-'
}

export function formatOrderTime(value) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Makassar',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function getOrderItemsCount(items = []) {
  return items.reduce((sum, item) => sum + Number(item.qty ?? item.quantity ?? 0), 0)
}

export function normalizePaymentMethod(value) {
  return String(value || 'QRIS').toUpperCase() === 'CASH' ? 'CASH' : 'QRIS'
}

export function normalizePaymentStatus(value) {
  const normalized = String(value || 'pending').toLowerCase()
  if (normalized === 'paid' || normalized === 'processing' || normalized === 'completed') return normalized
  return 'pending'
}

function formatVariant(item = {}) {
  const label = String(item.variantLabel || item.variant_name || '').trim()
  if (label) return `(${label})`
  const variant = String(item.variant || '').trim()
  if (!variant) return ''
  if (/-variant-\d+$/i.test(variant)) return ''
  return `(${variant})`
}

function buildItemsText(order = {}) {
  return (order.items || [])
    .map((item) => `- ${item.name}${formatVariant(item) ? ` ${formatVariant(item)}` : ''} x${item.qty ?? item.quantity ?? 0}`)
    .join('\n')
}

function buildCustomerBlock(order = {}) {
  const note = String(order.note || order.customerNote || '').trim()
  return `👤 Nama Customer:
${order.customerName || order.name || '-'}

📱 Nomor Customer:
${order.customerPhone || order.customer_phone || order.phone || order.whatsapp || '-'}

✉️ Email Customer:
${order.customerEmail || order.customer_email || order.email || '-'}

📝 Catatan Tambahan:
${note || '-'}`
}

export function buildOwnerMessage(order = {}) {
  return `🍱 PESANAN BARU AIME-Dimsum

🆔 Order ID:
${order.orderId || '-'}

${buildCustomerBlock(order)}

🛒 Detail Pesanan:

${buildItemsText(order) || '-'}

Jumlah Item:
${getOrderItemsCount(order.items || [])}

💰 Total:
Rp ${Number(order.total || 0).toLocaleString('id-ID')}

💳 Metode Pembayaran:
${getMethodLabel(order.paymentMethod || order.method)}

📌 Status:
${getStatusLabel(order.paymentStatus || order.status)}

⏰ Waktu:
${formatOrderTime(order.createdAt || order.time)}`
}

export function buildTelegramPendingMessage(order = {}) {
  return `🍱 PESANAN BARU AIME-Dimsum

🆔 Order ID:
${order.orderId || '-'}

${buildCustomerBlock(order)}

💰 Nominal:
Rp ${Number(order.total || 0).toLocaleString('id-ID')}

💳 Metode:
${getMethodLabel(order.paymentMethod || order.method)}

Status :
🟡 MENUNGGU KONFIRMASI

Tekan tombol di bawah jika pembayaran sudah diterima.`
}

export function buildTelegramConfirmedMessage(order = {}) {
  return `✅ Pembayaran berhasil dikonfirmasi

━━━━━━━━━━━━━━━━━━

Order ID :
${order.orderId || '-'}

${buildCustomerBlock(order)}

Status :
🟢 PAID

Nominal :
Rp ${Number(order.total || 0).toLocaleString('id-ID')}

Metode :
${getMethodLabel(order.paymentMethod || order.method)}

Waktu Konfirmasi :
${formatOrderTime(order.confirmedAt)}

Website pelanggan telah diperbarui.

Silakan tunggu pelanggan menekan tombol
"Kirim Pesanan Saya".

━━━━━━━━━━━━━━━━━━`
}

export function buildTelegramPaidMessage(order = {}) {
  const paidAt = order.confirmedAt || order.paidAt || order.updatedAt || order.createdAt
  return `✅ PESANAN SUDAH DIBAYAR

━━━━━━━━━━━━━━━━━━

Order ID :
${order.orderId || '-'}

${buildCustomerBlock(order)}

🛒 Detail Pesanan :

${buildItemsText(order) || '-'}

Jumlah Item :
${getOrderItemsCount(order.items || [])}

💰 Total :
Rp ${Number(order.total || 0).toLocaleString('id-ID')}

💳 Metode Pembayaran :
${getMethodLabel(order.paymentMethod || order.method)}

📌 Status :
Lunas

⏰ Waktu Transaksi :
${formatOrderTime(paidAt)}

━━━━━━━━━━━━━━━━━━`
}

export function buildTelegramAlreadyConfirmedMessage(order = {}) {
  return `⚠️ Order ini sudah dikonfirmasi sebelumnya.

Order ID :
${order.orderId || '-'}

Status :
🟢 PAID

Waktu Konfirmasi :
${formatOrderTime(order.confirmedAt)}`
}

export function buildTelegramFailedMessage() {
  return `❌ Gagal mengkonfirmasi pembayaran.

Backend tidak merespon.

Silakan coba kembali.`
}

export function getWebhookBaseUrl(req) {
  const proto = (req?.headers?.['x-forwarded-proto'] || 'https').toString().split(',')[0].trim()
  const host = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || process.env.VERCEL_URL || '').toString().split(',')[0].trim()
  if (!host) return ''
  if (host.startsWith('http://') || host.startsWith('https://')) return host.replace(/\/$/, '')
  return `${proto}://${host.replace(/\/$/, '')}`
}

export function getTelegramWebhookUrl(req) {
  const configuredBaseUrl = String(process.env.APP_BASE_URL || process.env.SITE_URL || '').trim().replace(/\/$/, '')
  const baseUrl = configuredBaseUrl || getWebhookBaseUrl(req)
  if (!baseUrl) return ''
  return `${baseUrl}/api/telegram-webhook`
}

export async function ensureTelegramWebhook(req) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const webhookUrl = getTelegramWebhookUrl(req)

  if (!token || !webhookUrl) {
    return { ok: false, skipped: true, webhookUrl }
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: false,
        allowed_updates: ['callback_query'],
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.ok) {
      throw new Error(data?.description || 'Failed to set Telegram webhook')
    }

    return { ok: true, webhookUrl, result: data.result || null }
  } catch (error) {
    console.warn('[TELEGRAM WEBHOOK] setup failed', { webhookUrl, message: error.message })
    return { ok: false, webhookUrl, message: error.message }
  }
}

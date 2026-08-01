export const menuCategories = ['Semua', 'Paket', 'Makanan', 'Minuman', 'Lainnya']

export const categories = menuCategories

export const dimsumVariants = [
  'Original',
  'Naori',
  'Chili Oil',
  'Mentai Keju',
  'Mentai Hot',
]

export const pickupPoint = {
  name: 'LAPAK - AIME',
  detail: 'Jika pesanan anda telah selesai, silahkan (pickup) pesanan anda sesuai titik maps ini.',
  note: 'Segera kirim orderan anda denga mengklik tombol dibawah ini, agar cepat untuk di pickup.',
  map: 'https://maps.app.goo.gl/zAxbsxVBaEr7S3iG7',
}

export const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
}

export const PAYMENT_METHOD = {
  QRIS: 'QRIS',
  CASH: 'Tunai',
}

export const ORDER_STATUS_STEPS = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.PROCESSING,
  PAYMENT_STATUS.COMPLETED,
]

export const OWNER_WHATSAPP = import.meta.env.VITE_OWNER_WHATSAPP || ''
export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''

export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || ''

export const socialLinks = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: '📷',
    handle: import.meta.env.VITE_INSTAGRAM_HANDLE || '',
    url: import.meta.env.VITE_INSTAGRAM_URL || '',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    handle: import.meta.env.VITE_TIKTOK_HANDLE || '',
    url: import.meta.env.VITE_TIKTOK_URL || '',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: '📘',
    handle: import.meta.env.VITE_FACEBOOK_HANDLE || '',
    url: import.meta.env.VITE_FACEBOOK_URL || '',
  },
]

export function getContactWhatsAppUrl() {
  const phone = String(OWNER_WHATSAPP || '').replace(/[^\d]/g, '')
  if (!phone) return ''
  return `https://wa.me/${phone}`
}

const STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Menunggu Konfirmasi Pesanan',
  [PAYMENT_STATUS.PAID]: 'Pembayaran Berhasil',
  [PAYMENT_STATUS.PROCESSING]: 'Pesanan Diproses',
  [PAYMENT_STATUS.COMPLETED]: 'Pesanan Selesai',
}

export function getStatusLabel(status) {
  const normalized = String(status || '').toLowerCase()
  return STATUS_LABELS[normalized] || status || 'Draft Pesanan'
}

export function getMethodLabel(method) {
  const normalized = String(method || '').toUpperCase()
  return PAYMENT_METHOD[normalized] || method || '-'
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

export function getSubtotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.qty ?? item.quantity ?? 0), 0)
}

export function getBaseSubtotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.basePrice ?? item.price ?? 0) * Number(item.qty ?? item.quantity ?? 0), 0)
}

export function getVariantSubtotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.variantPrice ?? 0) * Number(item.qty ?? item.quantity ?? 0), 0)
}

export function formatItemVariant(item = {}) {
  const variantLabel = String(item.variantLabel || item.variant_name || '').trim()
  if (variantLabel) return `(${variantLabel})`

  const variant = String(item.variant || '').trim()
  if (!variant) return ''

  const looksLikeBackendKey =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-variant-\d+)?$/i.test(variant) ||
    /-variant-\d+$/i.test(variant)

  if (looksLikeBackendKey) return ''
  return `(${variant})`
}

export function getOwnerOrderMessage(order = {}) {
  const items = (order.items || [])
    .map((item) => {
      const variant = formatItemVariant(item)
      return `- ${item.name}${variant ? ` ${variant}` : ''} x${item.qty ?? item.quantity ?? 0}`
    })
    .join('\n')

  const note = String(order.note || order.customerNote || '').trim()

  return `🍱 PESANAN BARU AIME-Dimsum\n\n🆔 Order ID:\n${order.orderId || '-'}\n\n👤 Nama Customer:\n${order.customerName || order.name || '-'}\n\n📱 Nomor Customer:\n${order.customerPhone || order.customer_phone || order.phone || order.whatsapp || '-'}\n\n✉️ Email Customer:\n${order.customerEmail || order.customer_email || order.email || '-'}\n\n🛒 Detail Pesanan:\n\n${items || '-'}\n\n📝 Catatan Tambahan:\n${note || '-'}\n\nJumlah Item:\n${getOrderItemsCount(order.items || [])}\n\n💰 Total:\n${currency.format(Number(order.total || 0))}\n\n💳 Metode Pembayaran:\n${getMethodLabel(order.paymentMethod || order.method)}\n\n📌 Status:\n${getStatusLabel(order.paymentStatus || order.status)}\n\n⏰ Waktu:\n${formatOrderTime(order.createdAt || order.time)}`
}

export function getCustomerOrderMessage(order = {}) {
  return getOwnerOrderMessage(order)
}

export function getFollowupMessage(order = {}) {
  return `Halo kakak, pembayaran untuk order ${order.orderId || '-'} masih belum dikonfirmasi. Mohon bantu cek dan konfirmasi ya.`
}

export function getWhatsAppOrderUrl(order = {}) {
  const phone = String(OWNER_WHATSAPP || '').replace(/[^\d]/g, '')
  if (!phone) return ''
  return `https://wa.me/${phone}?text=${encodeURIComponent(getOwnerOrderMessage(order))}`
}

export function getAdminContactUrl(order = {}) {
  const phone = String(OWNER_WHATSAPP || '').replace(/[^\d]/g, '')
  if (phone) {
    return {
      href: `https://wa.me/${phone}?text=${encodeURIComponent(getFollowupMessage(order))}`,
      label: 'WhatsApp Admin',
    }
  }

  const telegram = String(TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim()
  if (telegram) {
    return {
      href: `https://t.me/${telegram}`,
      label: 'Telegram Admin',
    }
  }

  return {
    href: '#',
    label: 'Admin',
  }
}

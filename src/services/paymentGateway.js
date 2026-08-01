export async function createQris(payload) {
  const response = await fetch('/api/create-qris', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Gagal membuat QRIS')
  }

  if (data.status !== 'success') {
    throw new Error(data.message || 'Gagal generate QRIS')
  }

  return data
}

export const createQRIS = createQris

export async function createOrder(payload) {
  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Gagal membuat order')
  }

  return data
}

export async function getOrderStatus(orderId) {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Gagal mengambil status order')
  }

  return data
}

export async function checkPayment(orderId) {
  const response = await fetch(`/api/check-payment?orderId=${encodeURIComponent(orderId)}`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Gagal mengecek pembayaran')
  }

  return data
}

export async function updateOrderStatus(payload) {
  const response = await fetch('/api/update-order-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Gagal update status order')
  }

  return data
}

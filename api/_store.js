import { supabase } from '../lib/supabase.js'
import { nowIso, normalizePaymentMethod, normalizePaymentStatus } from './_shared.js'

const ORDERS_TABLE = 'orders'

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function log(label, message, extra = null) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : ''
  console.log(`[${label}] ${message}${suffix}`)
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getMissingColumn(error) {
  const message = String(error?.message || '')

  const match = message.match(/could not find the '([^']+)' column/i)
  if (match) return match[1]

  const match2 = message.match(/column ["']?([^"']+)["']? does not exist/i)
  if (match2) return match2[1]

  return null
}

async function retryWithMissingColumnFallback(basePayload, queryFn, options = {}) {
  const {
    label = 'SUPABASE',
    maxRetries = 20,
    onMissingColumn = null,
  } = options

  let payload = { ...basePayload }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await queryFn(payload)

    if (!result?.error) {
      return result
    }

    const missingColumn = getMissingColumn(result.error)
    if (!missingColumn) {
      return result
    }

    console.warn(`[${label}] Missing column '${missingColumn}', retrying without it...`)

    if (typeof onMissingColumn === 'function') {
      onMissingColumn(missingColumn, payload)
    } else {
      delete payload[missingColumn]
    }
  }

  return {
    error: new Error('Too many missing columns while retrying Supabase request'),
  }
}

function mapRow(row) {
  if (!row) return null

  const paymentMethod = normalizePaymentMethod(row.payment_method ?? row.paymentMethod)
  const paymentStatus = normalizePaymentStatus(row.payment_status ?? row.paymentStatus ?? row.status)

  const order = {
    orderId: String(row.order_id ?? row.orderId ?? ''),
    customerName: row.customer_name ?? row.customerName ?? '',
    customerPhone: row.customer_phone ?? row.customerPhone ?? row.phone ?? row.whatsapp ?? '',
    customerEmail: row.customer_email ?? row.customerEmail ?? row.email ?? '',
    note: row.note ?? row.customerNote ?? row.customer_note ?? '',
    customerNote: row.note ?? row.customerNote ?? row.customer_note ?? '',
    items: Array.isArray(row.items) ? clone(row.items) : [],
    itemCount: toNumber(row.item_count ?? row.itemCount, 0),
    subtotal: toNumber(row.subtotal, 0),
    total: toNumber(row.total, 0),
    paymentMethod,
    paymentStatus,
    status: paymentStatus,
    telegramMessageId: row.telegram_message_id ?? row.telegramMessageId ?? null,
    confirmedAt: row.confirmed_at ?? row.confirmedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? nowIso(),
    updatedAt: row.updated_at ?? row.updatedAt ?? nowIso(),
    qris: row.qris ?? null,
  }

  order.name = order.customerName
  order.phone = order.customerPhone
  order.email = order.customerEmail
  order.customer_phone = order.customerPhone
  order.customer_email = order.customerEmail
  order.customerNote = order.note
  order.customer_note = order.note
  order.method = order.paymentMethod
  order.time = order.createdAt

  return order
}

function buildOrderRow(order = {}) {
  const row = {
    order_id: String(order.orderId || ''),
    customer_name: order.customerName || order.name || '',
    customer_phone: order.customerPhone || order.phone || '',
    customer_email: order.customerEmail || order.email || '',
    note: order.note || '',
    items: Array.isArray(order.items) ? clone(order.items) : [],
    item_count: toNumber(order.itemCount, 0),
    subtotal: toNumber(order.subtotal, 0),
    total: toNumber(order.total, 0),
    payment_method: normalizePaymentMethod(order.paymentMethod || order.method),
    payment_status: normalizePaymentStatus(order.paymentStatus || order.status),
    created_at: order.createdAt || nowIso(),
    updated_at: nowIso(),
  }

  if (order.telegramMessageId !== undefined && order.telegramMessageId !== null && order.telegramMessageId !== '') {
    row.telegram_message_id = order.telegramMessageId
  }

  if (order.confirmedAt !== undefined && order.confirmedAt !== null && order.confirmedAt !== '') {
    row.confirmed_at = order.confirmedAt
  }

  if (order.qris !== undefined && order.qris !== null && order.qris !== '') {
    row.qris = order.qris
  }

  return row
}

function toDbPatch(patch = {}) {
  const next = {}

  if (patch.customerName !== undefined || patch.name !== undefined) next.customer_name = patch.customerName ?? patch.name ?? ''
  if (patch.customerPhone !== undefined || patch.phone !== undefined) next.customer_phone = patch.customerPhone ?? patch.phone ?? ''
  if (patch.customerEmail !== undefined || patch.email !== undefined) next.customer_email = patch.customerEmail ?? patch.email ?? ''
  if (patch.note !== undefined) next.note = patch.note ?? ''
  if (patch.items !== undefined) next.items = Array.isArray(patch.items) ? clone(patch.items) : []
  if (patch.itemCount !== undefined) next.item_count = toNumber(patch.itemCount, 0)
  if (patch.subtotal !== undefined) next.subtotal = toNumber(patch.subtotal, 0)
  if (patch.total !== undefined) next.total = toNumber(patch.total, 0)
  if (patch.paymentMethod !== undefined || patch.method !== undefined) next.payment_method = normalizePaymentMethod(patch.paymentMethod ?? patch.method)
  if (patch.paymentStatus !== undefined || patch.status !== undefined) next.payment_status = normalizePaymentStatus(patch.paymentStatus ?? patch.status)

  if (patch.telegramMessageId !== undefined && patch.telegramMessageId !== null && patch.telegramMessageId !== '') {
    next.telegram_message_id = patch.telegramMessageId
  }

  if (patch.confirmedAt !== undefined && patch.confirmedAt !== null && patch.confirmedAt !== '') {
    next.confirmed_at = patch.confirmedAt
  }

  if (patch.qris !== undefined && patch.qris !== null && patch.qris !== '') {
    next.qris = patch.qris
  }

  next.updated_at = nowIso()
  return next
}

async function selectOrder(orderId) {
  const resolvedOrderId = String(orderId || '').trim()
  if (!resolvedOrderId) return null

  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select('*')
    .eq('order_id', resolvedOrderId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load order ${resolvedOrderId}: ${error.message}`)
  }

  return mapRow(data)
}

export function createOrderId() {
  return crypto.randomUUID()
}

export async function getOrder(orderId) {
  const resolvedOrderId = String(orderId || '').trim()
  log('CHECK ORDER', `UUID: ${resolvedOrderId || '-'}`)

  const order = await selectOrder(resolvedOrderId)

  if (order) {
    log('CHECK ORDER', `UUID: ${resolvedOrderId} FOUND`)
  } else {
    log('CHECK ORDER', `UUID: ${resolvedOrderId} NOT FOUND`)
  }

  return clone(order)
}

export async function saveOrder(order) {
  if (!order?.orderId) {
    throw new Error('orderId is required to save order')
  }

  const row = buildOrderRow(order)

  const { data, error } = await retryWithMissingColumnFallback(
    row,
    async (payload) =>
      supabase
        .from(ORDERS_TABLE)
        .upsert(payload, { onConflict: 'order_id' })
        .select('*')
        .single(),
    {
      label: 'SAVE ORDER',
    }
  )

  if (error) {
    console.error('[SAVE ORDER] UPSERT FAILED', {
      orderId: row.order_id,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw new Error(`Failed to save order ${row.order_id}: ${error.message}`)
  }

  return clone(mapRow(data))
}

export async function updateOrder(orderId, patch = {}) {
  const resolvedOrderId = String(orderId || '').trim()
  if (!resolvedOrderId) return null

  const payload = toDbPatch(patch)

  const { data, error } = await retryWithMissingColumnFallback(
    payload,
    async (nextPayload) =>
      supabase
        .from(ORDERS_TABLE)
        .update(nextPayload)
        .eq('order_id', resolvedOrderId)
        .select('*')
        .maybeSingle(),
    {
      label: 'UPDATE ORDER',
    }
  )

  if (error) {
    throw new Error(`Failed to update order ${resolvedOrderId}: ${error.message}`)
  }

  if (!data) return null

  const mapped = mapRow(data)

  if (patch.qris !== undefined) {
    mapped.qris = patch.qris ?? null
  }

  if (patch.confirmedAt !== undefined) {
    mapped.confirmedAt = patch.confirmedAt ?? null
  }

  if (patch.telegramMessageId !== undefined) {
    mapped.telegramMessageId = patch.telegramMessageId ?? null
  }

  return clone(mapped)
}

export async function createOrderRecord(data = {}) {
  const orderId = String(data.orderId || createOrderId())
  const paymentMethod = normalizePaymentMethod(data.paymentMethod || data.method)
  const paymentStatus = normalizePaymentStatus(data.paymentStatus || data.status)
  const createdAt = data.createdAt || nowIso()

  const row = buildOrderRow({
    ...data,
    orderId,
    paymentMethod,
    paymentStatus,
    createdAt,
  })

  log('CREATE ORDER', `UUID: ${orderId}`)

  const { data: inserted, error } = await retryWithMissingColumnFallback(
    row,
    async (payload) =>
      supabase
        .from(ORDERS_TABLE)
        .insert(payload)
        .select('*')
        .single(),
    {
      label: 'CREATE ORDER',
    }
  )

  if (error) {
    console.error('[CREATE ORDER] INSERT FAILED', {
      orderId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw new Error(`INSERT gagal untuk order ${orderId}: ${error.message}`)
  }

  log('CREATE ORDER', `UUID: ${orderId} INSERT SUCCESS`)
  return clone(mapRow(inserted))
}

export async function attachTelegramMessageId(orderId, telegramMessageId) {
  if (!telegramMessageId) {
    return getOrder(orderId)
  }

  return updateOrder(orderId, { telegramMessageId })
}

export async function confirmOrder(orderId, extraPatch = {}) {
  const resolvedOrderId = String(orderId || '').trim()
  const current = await getOrder(resolvedOrderId)

  if (!current) {
    return { ok: false, status: 404, message: 'Order not found' }
  }

  if (normalizePaymentStatus(current.paymentStatus || current.status) === 'paid') {
    return { ok: false, status: 409, message: 'Order already confirmed', order: clone(current) }
  }

  const updated = await updateOrder(resolvedOrderId, {
    paymentStatus: 'paid',
    confirmedAt: extraPatch.confirmedAt || current.confirmedAt || nowIso(),
    ...extraPatch,
  })

  if (!updated) {
    return { ok: false, status: 404, message: 'Order not found' }
  }

  log('CONFIRM ORDER', `UUID: ${resolvedOrderId} UPDATE SUCCESS`)

  return { ok: true, order: updated }
}

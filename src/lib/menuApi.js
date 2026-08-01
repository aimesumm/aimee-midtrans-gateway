
const ADMIN_TOKEN_KEY = 'aime_admin_token'
const LOCAL_MENU_KEY = 'aime_menu_local_items'

function isBrowser() {
  return typeof window !== 'undefined'
}

function safeReadStorage(key, fallback) {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function safeWriteStorage(key, value) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

function safeRemoveStorage(key) {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore storage failures
  }
}

function createUuid() {
  if (isBrowser() && window.crypto?.randomUUID) return window.crypto.randomUUID()
  // Fallback for very old browsers / SSR
  return `menu-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const MENU_CATEGORIES = ['Makanan', 'Minuman', 'Lainnya', 'Paket']

function normalizeCategory(value) {
  const raw = String(value || '').trim()
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  if (MENU_CATEGORIES.includes(title)) return title
  if (title === 'Dimsum') return 'Makanan'
  return MENU_CATEGORIES.includes(raw) ? raw : 'Makanan'
}


function normalizeVariant(variant) {
  return {
    label: String(variant?.label || variant?.name || '').trim(),
    price: normalizeNumber(variant?.price, 0),
  }
}

function normalizeMenuItem(item) {
  if (!item) return null

  const variants = Array.isArray(item.variants)
    ? item.variants.map(normalizeVariant).filter((variant) => variant.label)
    : []

  return {
    id: String(item.id || '').trim() || createUuid(),
    name: String(item.name || '').trim(),
    category: normalizeCategory(item.category),
    price: normalizeNumber(item.price, 0),
    imageUrl: String(item.imageUrl || item.image_url || '').trim() || '/placeholder.png',
    imagePath: item.imagePath ?? item.image_path ?? null,
    badge: String(item.badge || '').trim(),
    description: String(item.description || item.desc || '').trim(),
    available: item.available === false ? false : item.inStock === false ? false : true,
    hasVariant: Boolean(item.hasVariant ?? item.has_variant ?? variants.length),
    variants,
    sortOrder: normalizeNumber(item.sortOrder ?? item.sort_order, 0),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  }
}

function readLocalMenuItems() {
  const rawItems = safeReadStorage(LOCAL_MENU_KEY, [])
  return Array.isArray(rawItems) ? rawItems.map(normalizeMenuItem).filter(Boolean) : []
}

function writeLocalMenuItems(items) {
  safeWriteStorage(LOCAL_MENU_KEY, Array.isArray(items) ? items.map(normalizeMenuItem).filter(Boolean) : [])
}

function upsertLocalMenuItem(item) {
  const nextItem = normalizeMenuItem(item)
  const items = readLocalMenuItems()
  const index = items.findIndex((row) => String(row.id) === String(nextItem.id))
  const now = new Date().toISOString()
  const stored = {
    ...nextItem,
    createdAt: index >= 0 ? items[index].createdAt : nextItem.createdAt || now,
    updatedAt: now,
  }

  if (index >= 0) {
    items[index] = stored
  } else {
    items.unshift(stored)
  }

  writeLocalMenuItems(items)
  return stored
}

function removeLocalMenuItem(id) {
  const resolvedId = String(id || '').trim()
  const items = readLocalMenuItems()
  const nextItems = items.filter((item) => String(item.id) !== resolvedId)
  writeLocalMenuItems(nextItems)
  return { ok: true, id: resolvedId }
}

function sortMenuItems(items) {
  return [...items].sort((a, b) => {
    const sortDiff = normalizeNumber(a?.sortOrder, 0) - normalizeNumber(b?.sortOrder, 0)
    if (sortDiff !== 0) return sortDiff
    const aTime = Date.parse(a?.updatedAt || a?.createdAt || 0) || 0
    const bTime = Date.parse(b?.updatedAt || b?.createdAt || 0) || 0
    return aTime - bTime
  })
}

function mergeMenuItemLists(primaryItems = [], fallbackItems = []) {
  const merged = []
  const seen = new Set()

  for (const item of Array.isArray(primaryItems) ? primaryItems : []) {
    const next = normalizeMenuItem(item)
    if (!next) continue
    merged.push(next)
    seen.add(String(next.id))
  }

  for (const item of Array.isArray(fallbackItems) ? fallbackItems : []) {
    const next = normalizeMenuItem(item)
    if (!next) continue
    const key = String(next.id)
    if (seen.has(key)) continue
    merged.push(next)
    seen.add(key)
  }

  return sortMenuItems(merged)
}

function shouldFallbackToLocal(error) {
  const status = Number(error?.status)
  if (status === 400 || status === 401 || status === 403) return false
  if (status && status < 500 && status !== 404) return false

  const message = String(error?.message || error || '').toLowerCase()
  return (
    !message ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('fetch') ||
    message.includes('not found') ||
    message.includes('method not allowed') ||
    message.includes('supabase') ||
    message.includes('server error') ||
    message.includes('unexpected end of json input')
  )
}

export function getAdminToken() {
  if (!isBrowser()) return ''
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setAdminToken(token) {
  if (!isBrowser()) return
  try {
    if (token) {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY)
    }
  } catch {
    // ignore storage failures
  }
}

async function parseResponse(response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.message || 'Terjadi kesalahan, coba lagi.')
    error.status = response.status
    error.details = data
    throw error
  }
  return data
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options)
  return parseResponse(response)
}

export async function fetchMenuItems() {
  try {
    const data = await apiJson('/api/menu-list')
    const backendItems = Array.isArray(data?.items) ? data.items.map(normalizeMenuItem).filter(Boolean) : []
    const localItems = readLocalMenuItems()
    const items = mergeMenuItemLists(backendItems, localItems)

    // Keep the browser cache in sync without losing items that were created
    // while the backend was temporarily unavailable or not fully migrated yet.
    writeLocalMenuItems(items)

    const source = backendItems.length && localItems.length && items.length > backendItems.length
      ? 'mixed'
      : 'backend'

    return { items, source }
  } catch (error) {
    if (!shouldFallbackToLocal(error)) {
      throw error
    }

    const items = readLocalMenuItems()
    return { items: sortMenuItems(items), source: 'local' }
  }
}

export async function adminLogin(password) {
  const data = await apiJson('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return data.token
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': getAdminToken(),
  }
}

export async function createMenuItem(payload) {
  const body = JSON.stringify(payload)
  try {
    const data = await apiJson('/api/menu-create', {
      method: 'POST',
      headers: authHeaders(),
      body,
    })
    if (data?.item) {
      const next = normalizeMenuItem(data.item)
      upsertLocalMenuItem(next)
      return next
    }
    return null
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error

    const localItem = upsertLocalMenuItem({
      id: createUuid(),
      name: payload.name,
      category: normalizeCategory(payload.category),
      price: payload.price,
      imageUrl: payload.imageUrl,
      imagePath: payload.imagePath,
      badge: payload.badge,
      description: payload.description,
      available: payload.available,
      hasVariant: payload.hasVariant,
      variants: payload.variants,
      sortOrder: payload.sortOrder,
    })
    return localItem
  }
}

export async function updateMenuItem(id, payload) {
  const resolvedId = String(id || '').trim()
  if (!resolvedId) throw new Error('Menu item id is required')

  try {
    const data = await apiJson('/api/menu-update', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ ...payload, id: resolvedId }),
    })
    if (data?.item) {
      const next = normalizeMenuItem(data.item)
      upsertLocalMenuItem(next)
      return next
    }
    return null
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error

    const items = readLocalMenuItems()
    const index = items.findIndex((item) => String(item.id) === resolvedId)
    if (index < 0) return null

    const current = items[index]
    const next = upsertLocalMenuItem({
      ...current,
      ...payload,
      id: resolvedId,
    })
    return next
  }
}

export async function deleteMenuItem(id) {
  const resolvedId = String(id || '').trim()
  if (!resolvedId) throw new Error('Menu item id is required')

  try {
    const data = await apiJson('/api/menu-delete', {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ id: resolvedId }),
    })
    removeLocalMenuItem(resolvedId)
    return data
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error

    return removeLocalMenuItem(resolvedId)
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'))
    reader.readAsDataURL(file)
  })
}

export function getLocalMenuItemsForDebug() {
  return readLocalMenuItems()
}

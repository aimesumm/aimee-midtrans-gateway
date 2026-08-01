import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { MENU_PLACEHOLDER_IMAGE } from '../src/data/menuItems.js'
import { nowIso } from './_shared.js'

const MENU_TABLE = 'menu_items'
const LOCAL_STORE_PATH = process.env.MENU_STORE_PATH || path.join(os.tmpdir(), 'aime-dimsum-menu-items.json')

let localStoreCache = null
let supabaseClientPromise = null

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const MENU_CATEGORIES = ['Makanan', 'Minuman', 'Lainnya', 'Paket']

function normalizeCategory(value) {
  const raw = String(value || '').trim()
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  if (MENU_CATEGORIES.includes(title)) return title
  if (title === 'Dimsum') return 'Makanan'
  return 'Makanan'
}

function slugifyCategory(value) {
  const normalized = normalizeCategory(value)
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'makanan'
}


function getMissingColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(/could not find the '([^']+)' column/i)
  if (match) return match[1]
  const match2 = message.match(/column [\"']?([^\"']+)[\"']? does not exist/i)
  if (match2) return match2[1]
  return null
}

function isMenuBackendUnavailable(error) {
  const message = String(error?.message || error || '').toLowerCase()
  return (
    message.includes('schema cache') ||
    message.includes(`public.${MENU_TABLE}`) ||
    message.includes(MENU_TABLE) ||
    (message.includes('relation') && message.includes('does not exist')) ||
    message.includes('could not find the table') ||
    message.includes('supabase environment variables are missing') ||
    message.includes('supabase client unavailable') ||
    (message.includes('storage') && message.includes('not found'))
  )
}

async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('../lib/supabase.js')
      .then((mod) => mod.supabase || null)
      .catch(() => null)
  }

  return supabaseClientPromise
}

function normalizeVariants(variants) {
  if (!Array.isArray(variants)) return []

  return variants
    .map((variant) => ({
      label: String(variant?.label || variant?.name || '').trim(),
      price: toNumber(variant?.price, 0),
    }))
    .filter((variant) => variant.label)
}

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name || '',
    category: normalizeCategory(row.category),
    price: toNumber(row.price, 0),
    imageUrl: row.image_url || MENU_PLACEHOLDER_IMAGE,
    imagePath: row.image_path || null,
    badge: row.badge || '',
    description: row.description || '',
    available: row.available === false ? false : row.in_stock === false ? false : true,
    hasVariant: Boolean(row.has_variant),
    variants: normalizeVariants(row.variants),
    sortOrder: toNumber(row.sort_order, 0),
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || nowIso(),
  }
}

function buildRow(item = {}, existing = null) {
  const existingVariants = normalizeVariants(existing?.variants)
  const nextVariants = item.variants !== undefined ? normalizeVariants(item.variants) : existingVariants
  const hasVariant = item.hasVariant !== undefined ? Boolean(item.hasVariant) : Boolean(existing?.has_variant ?? existing?.hasVariant)

  const existingAvailable =
    existing?.available !== undefined
      ? existing.available !== false
      : existing?.in_stock !== undefined
        ? existing.in_stock !== false
        : true

  const available =
    item.available !== undefined
      ? Boolean(item.available)
      : item.inStock !== undefined
        ? Boolean(item.inStock)
        : existingAvailable

  return {
    name: String(item.name ?? existing?.name ?? '').trim(),
    category: normalizeCategory(item.category ?? existing?.category),
    price: toNumber(item.price ?? existing?.price, 0),
    image_url: item.imageUrl ?? existing?.image_url ?? existing?.imageUrl ?? MENU_PLACEHOLDER_IMAGE,
    image_path: item.imagePath !== undefined ? (item.imagePath || null) : (existing?.image_path ?? existing?.imagePath ?? null),
    badge: item.badge !== undefined ? (item.badge || null) : (existing?.badge || null),
    description: item.description !== undefined ? (item.description || null) : (existing?.description || null),
    available,
    has_variant: hasVariant,
    variants: nextVariants,
    sort_order: item.sortOrder !== undefined ? toNumber(item.sortOrder, toNumber(existing?.sort_order, 0)) : toNumber(existing?.sort_order, 0),
    updated_at: nowIso(),
  }
}

async function readLocalRows() {
  if (Array.isArray(localStoreCache)) {
    return clone(localStoreCache)
  }

  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      localStoreCache = parsed
      return clone(parsed)
    }
  } catch {
    // fall through: no local file yet, start empty (no dummy/demo data)
  }

  localStoreCache = []
  await writeLocalRows([])
  return []
}

async function writeLocalRows(rows) {
  localStoreCache = clone(rows)
  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true })
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(localStoreCache, null, 2), 'utf8')
}

async function querySupabase(handler) {
  const supabase = await getSupabaseClient()
  if (!supabase) return { error: new Error('Supabase client unavailable') }
  return handler(supabase)
}

export async function listMenuItems() {
  try {
    const supabase = await getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client unavailable')
    }

    const { data, error } = await supabase
      .from(MENU_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // No auto-seeding of demo/dummy menu items: an empty table simply
    // means the admin hasn't added any menu yet via "Tambah Menu".
    return clone((data || []).map(mapRow))
  } catch (error) {
    if (!isMenuBackendUnavailable(error)) {
      throw new Error(`Failed to load menu items: ${error.message}`)
    }

    const localRows = await readLocalRows()
    return clone(localRows.map(mapRow))
  }
}

export async function createMenuItem(item = {}) {
  const row = buildRow(item)

  const buildInsertPayload = (dropColumns = []) => {
    const dropSet = new Set(dropColumns)
    const payload = {
      name: row.name,
      category: row.category,
      price: row.price,
      image_url: row.image_url,
      image_path: row.image_path,
      badge: row.badge,
      description: row.description,
      available: row.available,
      has_variant: row.has_variant,
      variants: row.variants,
      sort_order: row.sort_order,
      updated_at: row.updated_at,
    }

    for (const key of dropSet) {
      delete payload[key]
    }

    return payload
  }

  const insertOnce = async (payload) => {
    return querySupabase((supabase) =>
      supabase
        .from(MENU_TABLE)
        .insert(payload)
        .select('*')
        .single(),
    )
  }

  try {
    let result = await insertOnce(buildInsertPayload())

    if (result.error) {
      const missingColumn = getMissingColumn(result.error)
      if (missingColumn && missingColumn in buildInsertPayload()) {
        result = await insertOnce(buildInsertPayload([missingColumn]))
      }
    }

    if (result.error) {
      throw result.error
    }

    return clone(mapRow(result.data))
  } catch (error) {
    if (!isMenuBackendUnavailable(error)) {
      throw new Error(`Failed to create menu item: ${error.message}`)
    }

    const localRows = await readLocalRows()
    const storedRow = {
      id: String(item.id || randomUUID()),
      ...row,
      created_at: nowIso(),
    }

    const nextRows = [...localRows, storedRow]
    await writeLocalRows(nextRows)
    return clone(mapRow(storedRow))
  }
}

export async function updateMenuItem(id, patch = {}) {
  const resolvedId = String(id || '').trim()
  if (!resolvedId) throw new Error('Menu item id is required')

  const buildUpdatePayload = (existing, dropColumns = []) => {
    const dropSet = new Set(dropColumns)
    const payload = buildRow(patch, existing)
    for (const key of dropSet) {
      delete payload[key]
    }
    return payload
  }

  try {
    const supabase = await getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client unavailable')
    }

    const { data: existing, error: fetchError } = await supabase
      .from(MENU_TABLE)
      .select('*')
      .eq('id', resolvedId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!existing) {
      return null
    }

    let merged = buildUpdatePayload(existing)
    let { data, error } = await supabase
      .from(MENU_TABLE)
      .update(merged)
      .eq('id', resolvedId)
      .select('*')
      .maybeSingle()

    if (error) {
      const missingColumn = getMissingColumn(error)
      if (missingColumn && missingColumn in merged) {
        merged = buildUpdatePayload(existing, [missingColumn])
        const retry = await supabase
          .from(MENU_TABLE)
          .update(merged)
          .eq('id', resolvedId)
          .select('*')
          .maybeSingle()
        data = retry.data
        error = retry.error
      }
    }

    if (error) {
      throw error
    }

    const oldImagePath = existing?.image_path || null
    const newImagePath = merged.image_path || null
    if (patch.imagePath !== undefined && oldImagePath && oldImagePath !== newImagePath) {
      await deleteMenuImage(oldImagePath)
    }

    return clone(mapRow(data))
  } catch (error) {
    if (!isMenuBackendUnavailable(error)) {
      throw new Error(`Failed to update menu item ${resolvedId}: ${error.message}`)
    }

    const localRows = await readLocalRows()
    const index = localRows.findIndex((row) => String(row.id) === resolvedId)
    if (index < 0) return null

    const updatedRow = {
      ...localRows[index],
      ...buildRow(patch, localRows[index]),
      id: resolvedId,
      updated_at: nowIso(),
      created_at: localRows[index].created_at || nowIso(),
    }

    const nextRows = [...localRows]
    nextRows[index] = updatedRow
    await writeLocalRows(nextRows)
    return clone(mapRow(updatedRow))
  }
}

export async function deleteMenuItem(id) {
  const resolvedId = String(id || '').trim()
  if (!resolvedId) throw new Error('Menu item id is required')

  try {
    const existing = await getMenuItemById(resolvedId)
    if (existing?.imagePath) {
      await deleteMenuImage(existing.imagePath)
    }

    const result = await querySupabase((supabase) =>
      supabase.from(MENU_TABLE).delete().eq('id', resolvedId),
    )

    if (result.error) {
      throw result.error
    }

    return { ok: true, id: resolvedId }
  } catch (error) {
    if (!isMenuBackendUnavailable(error)) {
      throw new Error(`Failed to delete menu item ${resolvedId}: ${error.message}`)
    }

    const localRows = await readLocalRows()
    const nextRows = localRows.filter((row) => String(row.id) !== resolvedId)
    await writeLocalRows(nextRows)
    return { ok: true, id: resolvedId, fallback: true }
  }
}

const MENU_IMAGE_BUCKET = 'menu-images'

function getCategoryFolder(category) {
  return slugifyCategory(category)
}

// Uploads a base64-encoded image to the `menu-images` bucket under a
// category/ folder, using a unique (UUID + timestamp) filename.
// Returns { url, path } where `path` is the storage object path (to be
// stored in `image_path`) and `url` is the public URL (to be stored in
// `image_url`). Returns null if no base64 image was provided.
export async function uploadMenuImage(base64Data, fileName = 'menu.jpg', category = 'Makanan') {
  if (!base64Data) return null

  const input = String(base64Data)
  const matches = input.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/)
  if (!matches) {
    // Not a base64 data URL (e.g. an existing remote URL was passed through) -
    // nothing to upload, keep it as-is with no storage path.
    return { url: input, path: null }
  }

  const contentType = matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const safeName = String(fileName || 'menu')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 40)
  const folder = getCategoryFolder(category)
  const uniqueSuffix = `${Date.now()}-${randomUUID()}`
  const objectPath = `${folder}/${safeName}-${uniqueSuffix}.${extension}`

  try {
    const supabase = await getSupabaseClient()
    if (!supabase?.storage) {
      return { url: input, path: null }
    }

    const { error: uploadError } = await supabase.storage
      .from(MENU_IMAGE_BUCKET)
      .upload(objectPath, buffer, { contentType, upsert: true })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(objectPath)
    return { url: data?.publicUrl || input, path: objectPath }
  } catch (error) {
    if (isMenuBackendUnavailable(error)) {
      return { url: input, path: null }
    }
    throw new Error(`Gagal upload gambar: ${error.message}`)
  }
}

// Removes a previously uploaded image from the `menu-images` bucket.
// Best-effort: failures are logged but never thrown, so a storage hiccup
// never blocks a menu create/update/delete operation.
export async function deleteMenuImage(imagePath) {
  const resolvedPath = String(imagePath || '').trim()
  if (!resolvedPath) return { ok: true, skipped: true }

  try {
    const supabase = await getSupabaseClient()
    if (!supabase?.storage) {
      return { ok: true, skipped: true }
    }

    const { error } = await supabase.storage.from(MENU_IMAGE_BUCKET).remove([resolvedPath])
    if (error) {
      throw error
    }

    return { ok: true }
  } catch (error) {
    console.warn('[MENU IMAGE] Gagal menghapus file lama dari Storage', {
      path: resolvedPath,
      message: error.message,
    })
    return { ok: false, message: error.message }
  }
}

// Fetches a single menu item row (raw, without the local-file fallback)
// so callers (e.g. delete) can read fields like image_path before mutating.
export async function getMenuItemById(id) {
  const resolvedId = String(id || '').trim()
  if (!resolvedId) return null

  try {
    const supabase = await getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client unavailable')
    }

    const { data, error } = await supabase
      .from(MENU_TABLE)
      .select('*')
      .eq('id', resolvedId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? clone(mapRow(data)) : null
  } catch (error) {
    if (!isMenuBackendUnavailable(error)) {
      throw new Error(`Failed to load menu item ${resolvedId}: ${error.message}`)
    }

    const localRows = await readLocalRows()
    const row = localRows.find((item) => String(item.id) === resolvedId)
    return row ? clone(mapRow(row)) : null
  }
}

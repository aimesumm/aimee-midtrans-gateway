import { updateMenuItem, uploadMenuImage } from './_menu-store.js'
import { requireAdmin } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const isAdmin = await requireAdmin(req, res)
  if (!isAdmin) return

  try {
    const body = req.body || {}
    const id = body.id || req.query?.id

    if (!id) {
      return res.status(400).json({ message: 'Menu item id wajib diisi' })
    }

    if (!String(body.name || '').trim()) {
      return res.status(400).json({ message: 'Nama menu wajib diisi' })
    }

    if (!(Number(body.price) > 0)) {
      return res.status(400).json({ message: 'Harga menu harus lebih dari 0' })
    }

    const patch = {
      name: body.name,
      category: body.category,
      price: body.price,
      badge: body.badge,
      description: body.description,
      available: body.available,
      hasVariant: body.hasVariant,
      variants: body.variants,
      sortOrder: body.sortOrder,
    }

    if (body.imageBase64) {
      // New image uploaded: store it under the category folder with a
      // unique name, then let updateMenuItem clean up the old file once
      // the row is safely updated (see _menu-store.js).
      const uploaded = await uploadMenuImage(body.imageBase64, body.name, body.category)
      patch.imageUrl = uploaded?.url || body.imageUrl || null
      patch.imagePath = uploaded?.path || null
    } else if (body.imageUrl) {
      patch.imageUrl = body.imageUrl
    }

    const updated = await updateMenuItem(id, patch)

    if (!updated) {
      return res.status(404).json({ message: 'Menu item tidak ditemukan' })
    }

    return res.status(200).json({ item: updated })
  } catch (error) {
    console.error('[MENU UPDATE] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to update menu item' })
  }
}

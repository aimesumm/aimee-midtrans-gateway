import { createMenuItem, uploadMenuImage } from './_menu-store.js'
import { requireAdmin } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const isAdmin = await requireAdmin(req, res)
  if (!isAdmin) return

  try {
    const body = req.body || {}

    if (!String(body.name || '').trim()) {
      return res.status(400).json({ message: 'Nama menu wajib diisi' })
    }

    if (!(Number(body.price) > 0)) {
      return res.status(400).json({ message: 'Harga menu harus lebih dari 0' })
    }

    let imageUrl = body.imageUrl || null
    let imagePath = null

    if (body.imageBase64) {
      const uploaded = await uploadMenuImage(body.imageBase64, body.name, body.category)
      imageUrl = uploaded?.url || imageUrl
      imagePath = uploaded?.path || null
    }

    const created = await createMenuItem({
      name: body.name,
      category: body.category,
      price: body.price,
      imageUrl,
      imagePath,
      badge: body.badge,
      description: body.description,
      available: body.available,
      hasVariant: body.hasVariant,
      variants: body.variants,
      sortOrder: body.sortOrder,
    })

    return res.status(200).json({ item: created })
  } catch (error) {
    console.error('[MENU CREATE] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to create menu item' })
  }
}

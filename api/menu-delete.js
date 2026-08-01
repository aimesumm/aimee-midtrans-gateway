import { deleteMenuItem } from './_menu-store.js'
import { requireAdmin } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const isAdmin = await requireAdmin(req, res)
  if (!isAdmin) return

  try {
    const id = (req.body && req.body.id) || req.query?.id

    if (!id) {
      return res.status(400).json({ message: 'Menu item id wajib diisi' })
    }

    const result = await deleteMenuItem(id)
    return res.status(200).json(result)
  } catch (error) {
    console.error('[MENU DELETE] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to delete menu item' })
  }
}

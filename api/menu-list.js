import { listMenuItems } from './_menu-store.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const items = await listMenuItems()
    return res.status(200).json({ items })
  } catch (error) {
    console.error('[MENU LIST] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Failed to load menu items' })
  }
}

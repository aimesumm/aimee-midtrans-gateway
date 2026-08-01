import { getAdminToken } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const password = String(body.password || '')

    if (!password) {
      return res.status(400).json({ message: 'Password wajib diisi' })
    }

    const token = await getAdminToken(password)

    if (!token) {
      return res.status(401).json({ message: 'Password salah' })
    }

    return res.status(200).json({ token })
  } catch (error) {
    console.error('[ADMIN LOGIN] FAILED', { message: error.message })
    return res.status(500).json({ message: error.message || 'Login gagal' })
  }
}

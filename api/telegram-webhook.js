import { nowIso } from './_shared.js'

async function telegramApi(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    return await response.json().catch(() => null)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const callback = body.callback_query

    if (!callback?.data) {
      return res.status(200).json({ ok: true, ignored: true })
    }

    await telegramApi('answerCallbackQuery', {
      callback_query_id: callback.id,
      text: 'Konfirmasi manual melalui Telegram sudah dinonaktifkan.',
      show_alert: true,
    })

    return res.status(200).json({
      ok: true,
      ignored: true,
      timestamp: nowIso(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Webhook error' })
  }
}

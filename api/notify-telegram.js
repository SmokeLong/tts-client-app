export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const botToken = process.env.TG_BOT_TOKEN
  const chatId = process.env.TELEGRAM_SELLER_CHAT_ID || process.env.TG_CHAT_ID

  if (!botToken || !chatId) {
    console.error('Missing TG_BOT_TOKEN or TELEGRAM_SELLER_CHAT_ID env vars')
    return res.status(500).json({ error: 'Telegram not configured' })
  }

  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Missing text' })
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })

    if (!tgRes.ok) {
      const errBody = await tgRes.text()
      console.error('Telegram API error:', errBody)
      return res.status(502).json({ error: 'Telegram API error' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Telegram notify error:', error)
    return res.status(500).json({ error: 'Failed to send notification' })
  }
}

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const SMSRU_API_ID = process.env.SMSRU_API_ID

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' })

    const phoneClean = phone.replace(/\D/g, '')
    if (phoneClean.length !== 11) return res.status(400).json({ error: 'Неверный формат номера' })

    const phoneFormatted = '+' + phoneClean

    // Generate 4-digit code
    const code = String(Math.floor(1000 + Math.random() * 9000))

    // Expire in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Save to смс_коды table
    const { error: dbError } = await supabase
      .from('смс_коды')
      .insert({
        телефон: phoneFormatted,
        код: code,
        использован: false,
        истекает: expiresAt,
      })

    if (dbError) {
      console.error('DB error:', dbError)
      return res.status(500).json({ error: 'Ошибка сохранения кода' })
    }

    // Send SMS via sms.ru
    const smsUrl = `https://sms.ru/sms/send?api_id=${SMSRU_API_ID}&to=${phoneClean}&msg=${encodeURIComponent(`TTS Shop: ваш код ${code}`)}&json=1`
    const smsRes = await fetch(smsUrl)
    const smsData = await smsRes.json()

    if (smsData.status !== 'OK') {
      console.error('SMS.ru error:', smsData)
      return res.status(500).json({ error: 'Ошибка отправки SMS' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Send SMS error:', error)
    res.status(500).json({ error: 'Ошибка отправки SMS' })
  }
}

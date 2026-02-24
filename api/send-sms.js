import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { телефон } = req.body
    if (!телефон) return res.status(400).json({ error: 'Укажите номер телефона' })

    // Генерируем 4-значный код
    const код = String(Math.floor(1000 + Math.random() * 9000))

    // Сохраняем в базу
    const { error: dbError } = await supabase
      .from('смс_коды')
      .insert({ телефон, код })

    if (dbError) throw dbError

    // Отправляем через SMS.ru
    const phone = телефон.replace(/[^0-9]/g, '')
    const smsUrl = `https://sms.ru/sms/send?api_id=${process.env.SMSRU_API_ID}&to=${phone}&msg=${encodeURIComponent('TTS Shop: ваш код ' + код)}&json=1`

    const smsResponse = await fetch(smsUrl)
    const smsData = await smsResponse.json()

    if (smsData.status === 'OK') {
      res.status(200).json({ success: true, message: 'Код отправлен' })
    } else {
      console.error('SMS.ru error:', smsData)
      res.status(400).json({ success: false, error: 'Не удалось отправить SMS' })
    }
  } catch (error) {
    console.error('Send SMS error:', error)
    res.status(500).json({ error: 'Ошибка отправки SMS' })
  }
}

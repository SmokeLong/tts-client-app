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

  try {
    const { phone, code } = req.body
    if (!phone || !code) return res.status(400).json({ error: 'Укажите телефон и код' })

    const phoneClean = phone.replace(/\D/g, '')
    const phoneFormatted = '+' + phoneClean

    const { data, error } = await supabase
      .from('смс_коды')
      .select('*')
      .eq('телефон', phoneFormatted)
      .eq('код', code)
      .eq('использован', false)
      .gt('истекает', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return res.status(400).json({ error: 'Неверный или просроченный код' })
    }

    // Mark code as used
    await supabase
      .from('смс_коды')
      .update({ использован: true })
      .eq('id', data.id)

    res.status(200).json({ success: true, verified: true })
  } catch (error) {
    console.error('Verify SMS error:', error)
    res.status(500).json({ error: 'Ошибка проверки кода' })
  }
}

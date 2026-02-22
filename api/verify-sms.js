import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { телефон, код } = req.body

    // Ищем неиспользованный код за последние 5 минут
    const { data: codes, error } = await supabase
      .from('смс_коды')
      .select('*')
      .eq('телефон', телефон)
      .eq('код', код)
      .eq('использован', false)
      .gte('истекает', new Date().toISOString())
      .order('создан_в', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!codes || codes.length === 0) {
      return res.status(400).json({ error: 'Неверный или просроченный код' })
    }

    // Помечаем как использованный
    await supabase
      .from('смс_коды')
      .update({ использован: true })
      .eq('id', codes[0].id)

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Verify SMS error:', error)
    res.status(500).json({ error: 'Ошибка проверки кода' })
  }
}

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

  try {
    const { логин, пароль_хеш } = req.body

    const { data: client, error } = await supabase
      .from('клиенты')
      .select('*')
      .eq('логин', логин)
      .eq('пароль_хеш', пароль_хеш)
      .single()

    if (error || !client) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    // Обновляем активность
    await supabase
      .from('клиенты')
      .update({ последняя_активность: new Date().toISOString() })
      .eq('id', client.id)

    res.status(200).json({ success: true, client })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Ошибка входа' })
  }
}

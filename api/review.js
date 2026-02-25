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
    const { клиент_id, товар_id, оценка, текст } = req.body

    if (!клиент_id || !товар_id || !оценка) {
      return res.status(400).json({ error: 'клиент_id, товар_id и оценка обязательны' })
    }
    if (оценка < 1 || оценка > 5) {
      return res.status(400).json({ error: 'Оценка от 1 до 5' })
    }

    // Upsert — один отзыв на товар от клиента
    const { data, error } = await supabase
      .from('отзывы')
      .upsert(
        { клиент_id, товар_id, оценка, текст: текст || null, created_at: new Date().toISOString() },
        { onConflict: 'клиент_id,товар_id' }
      )
      .select()
      .single()

    if (error) throw error

    // Пересчитываем рейтинг этого товара
    const { data: stats } = await supabase
      .from('отзывы')
      .select('оценка')
      .eq('товар_id', товар_id)

    if (stats && stats.length > 0) {
      const avg = stats.reduce((s, r) => s + r.оценка, 0) / stats.length
      await supabase
        .from('товары')
        .update({ рейтинг: Math.round(avg * 100) / 100 })
        .eq('id', товар_id)
    }

    return res.status(200).json({ success: true, review: data })
  } catch (error) {
    console.error('Review error:', error)
    res.status(500).json({ error: error.message || 'Ошибка сохранения отзыва' })
  }
}

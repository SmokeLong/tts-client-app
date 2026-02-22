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
    const { логин, пароль_хеш, телефон, имя, telegram_id, telegram_username } = req.body

    // Проверяем уникальность логина
    const { data: existing } = await supabase
      .from('клиенты')
      .select('id')
      .eq('логин', логин)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Логин уже занят' })
    }

    // Проверяем — может клиент уже есть по telegram_id
    let clientId = null
    if (telegram_id) {
      const { data: existingTg } = await supabase
        .from('клиенты')
        .select('id')
        .eq('telegram_id', String(telegram_id))
        .single()

      if (existingTg) clientId = existingTg.id
    }

    const last4 = телефон ? телефон.slice(-4) : null
    const uniqueNum = 'W' + Date.now().toString(36).toUpperCase()

    if (clientId) {
      // Обновляем существующего
      const { data, error } = await supabase
        .from('клиенты')
        .update({
          логин, пароль_хеш, телефон, имя,
          telegram_username: telegram_username || null,
          телефон_последние4: last4,
        })
        .eq('id', clientId)
        .select()
        .single()

      if (error) throw error
      return res.status(200).json({ success: true, client: data })
    } else {
      // Создаём нового
      const { data, error } = await supabase
        .from('клиенты')
        .insert({
          логин, пароль_хеш, телефон, имя,
          telegram_id: telegram_id ? String(telegram_id) : null,
          telegram_username: telegram_username || null,
          телефон_последние4: last4,
          уникальный_номер: uniqueNum,
          дата_регистрации: new Date().toISOString(),
          статус: 'Активен',
          баланс_ткоинов: 0,
          сумма_всех_покупок: 0,
          количество_покупок: 0,
        })
        .select()
        .single()

      if (error) throw error
      return res.status(200).json({ success: true, client: data })
    }
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: error.message || 'Ошибка регистрации' })
  }
}

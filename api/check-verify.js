import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token обязателен' })
    }

    const { data: verify } = await supabase
      .from('telegram_верификация')
      .select('*')
      .eq('токен', token)
      .single()

    if (!verify) {
      return res.status(404).json({ error: 'Токен не найден' })
    }

    if (!verify.подтверждён) {
      return res.status(200).json({ verified: false })
    }

    // === РЕГИСТРАЦИЯ ===
    if (verify.тип === 'register') {
      const данные = verify.данные
      const phoneClean = данные.телефон.replace(/\D/g, '')
      const phoneFormatted = '+' + phoneClean
      const last4 = phoneClean.slice(-4)

      // Проверяем — может клиент уже создан (повторный polling)
      const { data: existingClient } = await supabase
        .from('клиенты')
        .select('*')
        .eq('логин', phoneFormatted)
        .single()

      if (existingClient) {
        // Уже создан — просто возвращаем
        await supabase.from('telegram_верификация').delete().eq('id', verify.id)
        return res.status(200).json({ verified: true, client: existingClient })
      }

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(данные.пароль, 10)

      // Уникальный номер
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const uniqueNum = Array.from({ length: 4 }, () =>
        letters[Math.floor(Math.random() * 26)]
      ).join('') + Math.floor(Math.random() * 10)

      const { data: client, error } = await supabase
        .from('клиенты')
        .insert({
          логин: phoneFormatted,
          пароль_хеш: passwordHash,
          телефон: phoneFormatted,
          телефон_последние4: last4,
          имя: данные.имя || null,
          дата_рождения: данные.дата_рождения || null,
          telegram_id: verify.telegram_id,
          telegram_username: verify.telegram_username,
          уникальный_номер: uniqueNum,
          дата_регистрации: new Date().toISOString(),
          статус: 'Активен',
          баланс_ткоинов: 0,
          сумма_всех_покупок: 0,
          количество_покупок: 0,
          согласие_на_обработку: данные.согласие_на_обработку || false,
          согласие_на_уведомления: данные.согласие_на_уведомления || false,
        })
        .select()
        .single()

      if (error) throw error

      // Удаляем токен
      await supabase.from('telegram_верификация').delete().eq('id', verify.id)

      return res.status(200).json({ verified: true, client })
    }

    // === ВОССТАНОВЛЕНИЕ ПАРОЛЯ ===
    if (verify.тип === 'recovery') {
      return res.status(200).json({
        verified: true,
        телефон: verify.телефон,
        verify_token: verify.токен,
      })
    }

    return res.status(200).json({ verified: false })
  } catch (error) {
    console.error('Check verify error:', error)
    res.status(500).json({ error: error.message || 'Ошибка проверки' })
  }
}

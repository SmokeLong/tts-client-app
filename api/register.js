import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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
    const { phone, telegram_id, login, password } = req.body

    if (!phone || !login || !password) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' })
    }

    const phoneClean = phone.replace(/\D/g, '')
    const phoneFormatted = '+' + phoneClean
    const last4 = phoneClean.slice(-4)

    // Check if user already exists
    const { data: existing } = await supabase
      .from('клиенты')
      .select('id')
      .eq('логин', login)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' })
    }

    // SHA-256 hash password
    const пароль_хеш = crypto.createHash('sha256').update(password).digest('hex')

    // Unique client number
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const uniqueNum = Array.from({ length: 4 }, () =>
      letters[Math.floor(Math.random() * 26)]
    ).join('') + Math.floor(Math.random() * 10)

    // Insert new client
    const { data: client, error } = await supabase
      .from('клиенты')
      .insert({
        логин: login,
        пароль_хеш,
        телефон: phoneFormatted,
        телефон_последние4: last4,
        telegram_id: telegram_id || null,
        уникальный_номер: uniqueNum,
        дата_регистрации: new Date().toISOString(),
        статус: 'Активен',
        баланс_ткоинов: 0,
        сумма_всех_покупок: 0,
        количество_покупок: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Register error:', error)
      return res.status(500).json({ error: 'Ошибка регистрации' })
    }

    res.status(200).json({ success: true, client })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Ошибка регистрации' })
  }
}

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
    const { телефон, пароль, имя, дата_рождения, уникальный_номер, согласие_на_обработку, согласие_на_уведомления } = req.body

    if (!телефон || !пароль) {
      return res.status(400).json({ error: 'Телефон и пароль обязательны' })
    }
    if (пароль.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' })
    }

    const phoneClean = телефон.replace(/\D/g, '')
    const phoneFormatted = '+' + phoneClean
    const last4 = phoneClean.slice(-4)

    // Проверяем — не зарегистрирован ли уже этот номер
    const { data: existing } = await supabase
      .from('клиенты')
      .select('id')
      .eq('логин', phoneFormatted)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Этот номер уже зарегистрирован' })
    }

    // Хешируем пароль bcrypt
    const passwordHash = await bcrypt.hash(пароль, 10)

    // Уникальный номер — от клиента или генерируем
    const uniqueNum = уникальный_номер || (() => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * 26)]).join('') + Math.floor(Math.random() * 10)
    })()

    const { data, error } = await supabase
      .from('клиенты')
      .insert({
        логин: phoneFormatted,
        пароль_хеш: passwordHash,
        телефон: phoneFormatted,
        телефон_последние4: last4,
        имя: имя || null,
        дата_рождения: дата_рождения || null,
        telegram_id: String(Date.now()),
        уникальный_номер: uniqueNum,
        дата_регистрации: new Date().toISOString(),
        статус: 'Активен',
        баланс_ткоинов: 0,
        сумма_всех_покупок: 0,
        количество_покупок: 0,
        согласие_на_обработку: согласие_на_обработку || false,
        согласие_на_уведомления: согласие_на_уведомления || false,
      })
      .select()
      .single()

    if (error) throw error
    return res.status(200).json({ success: true, client: data })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: error.message || 'Ошибка регистрации' })
  }
}

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
    const { телефон, пароль, verify_token } = req.body

    if (!телефон || !пароль || !verify_token) {
      return res.status(400).json({ error: 'Телефон, пароль и verify_token обязательны' })
    }
    if (пароль.length < 6) {
      return res.status(400).json({ error: 'Минимум 6 символов' })
    }

    const phoneClean = телефон.replace(/\D/g, '')
    const phoneFormatted = '+' + phoneClean

    // Проверяем verify_token — должен быть подтверждённый recovery токен
    const { data: verify } = await supabase
      .from('telegram_верификация')
      .select('id')
      .eq('токен', verify_token)
      .eq('тип', 'recovery')
      .eq('телефон', phoneFormatted)
      .eq('подтверждён', true)
      .single()

    if (!verify) {
      return res.status(403).json({ error: 'Токен верификации недействителен' })
    }

    // Ищем клиента по телефону
    const { data: client } = await supabase
      .from('клиенты')
      .select('id')
      .eq('логин', phoneFormatted)
      .single()

    if (!client) {
      return res.status(404).json({ error: 'Клиент с таким номером не найден' })
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(пароль, 10)

    const { error } = await supabase
      .from('клиенты')
      .update({ пароль_хеш: passwordHash })
      .eq('id', client.id)

    if (error) throw error

    // Удаляем использованный токен
    await supabase.from('telegram_верификация').delete().eq('id', verify.id)

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Ошибка сброса пароля' })
  }
}

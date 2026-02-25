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
    const { телефон, пароль } = req.body

    if (!телефон || !пароль) {
      return res.status(400).json({ error: 'Введите телефон и пароль' })
    }

    const phoneClean = телефон.replace(/\D/g, '')
    const phoneFormatted = '+' + phoneClean

    // Ищем клиента по телефону (логин = телефон)
    const { data: client, error } = await supabase
      .from('клиенты')
      .select('*')
      .eq('логин', phoneFormatted)
      .single()

    if (error || !client) {
      return res.status(401).json({ error: 'Неверный телефон или пароль' })
    }

    // Сравниваем пароль через bcrypt
    const valid = await bcrypt.compare(пароль, client.пароль_хеш)
    if (!valid) {
      return res.status(401).json({ error: 'Неверный телефон или пароль' })
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

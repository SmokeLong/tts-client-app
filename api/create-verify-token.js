import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { тип, данные } = req.body

    if (!тип || !данные?.телефон) {
      return res.status(400).json({ error: 'Тип и телефон обязательны' })
    }

    const phoneClean = данные.телефон.replace(/\D/g, '')
    const phoneFormatted = '+' + phoneClean

    // Для регистрации: проверяем что номер не занят
    if (тип === 'register') {
      if (!данные.пароль || данные.пароль.length < 6) {
        return res.status(400).json({ error: 'Пароль минимум 6 символов' })
      }
      const { data: existing } = await supabase
        .from('клиенты')
        .select('id')
        .eq('логин', phoneFormatted)
        .single()

      if (existing) {
        return res.status(400).json({ error: 'Этот номер уже зарегистрирован' })
      }
    }

    // Для восстановления: проверяем что клиент существует
    if (тип === 'recovery') {
      const { data: existing } = await supabase
        .from('клиенты')
        .select('id')
        .eq('логин', phoneFormatted)
        .single()

      if (!existing) {
        return res.status(404).json({ error: 'Клиент с таким номером не найден' })
      }
    }

    // Удаляем старые неподтверждённые токены для этого телефона
    await supabase
      .from('telegram_верификация')
      .delete()
      .eq('телефон', phoneFormatted)
      .eq('подтверждён', false)

    const token = generateToken()

    const { error } = await supabase
      .from('telegram_верификация')
      .insert({
        токен: token,
        тип,
        телефон: phoneFormatted,
        данные,
        подтверждён: false,
      })

    if (error) throw error

    return res.status(200).json({
      success: true,
      token,
      verify_url: `https://t.me/TTS_SHOP_BOT?start=VERIFY_${token}`,
    })
  } catch (error) {
    console.error('Create verify token error:', error)
    res.status(500).json({ error: error.message || 'Ошибка создания токена' })
  }
}

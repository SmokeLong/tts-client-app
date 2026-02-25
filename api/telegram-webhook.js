import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const message = req.body?.message
    if (!message?.text) return res.status(200).json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()
    const telegramId = String(message.from.id)
    const username = message.from.username || null

    // /start VERIFY_{token}
    if (text.startsWith('/start VERIFY_')) {
      const token = text.replace('/start VERIFY_', '').trim()

      // Ищем токен
      const { data: verify } = await supabase
        .from('telegram_верификация')
        .select('*')
        .eq('токен', token)
        .eq('подтверждён', false)
        .single()

      if (!verify) {
        await sendMessage(chatId, '❌ Токен не найден или уже использован.')
        return res.status(200).json({ ok: true })
      }

      // Проверяем срок (10 минут)
      const age = Date.now() - new Date(verify.created_at).getTime()
      if (age > 10 * 60 * 1000) {
        await sendMessage(chatId, '❌ Токен истёк. Запросите новый в приложении.')
        return res.status(200).json({ ok: true })
      }

      // Для восстановления: проверяем что telegram_id совпадает с клиентом
      if (verify.тип === 'recovery') {
        const { data: client } = await supabase
          .from('клиенты')
          .select('telegram_id')
          .eq('логин', verify.телефон)
          .single()

        if (client && client.telegram_id !== telegramId) {
          await sendMessage(chatId, '❌ Этот Telegram не привязан к указанному номеру.')
          return res.status(200).json({ ok: true })
        }
      }

      // Для регистрации: проверяем что telegram_id не занят другим клиентом
      if (verify.тип === 'register') {
        const { data: existingClient } = await supabase
          .from('клиенты')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (existingClient) {
          await sendMessage(chatId, '❌ Этот Telegram уже привязан к другому аккаунту.')
          return res.status(200).json({ ok: true })
        }
      }

      // Подтверждаем
      await supabase
        .from('telegram_верификация')
        .update({
          telegram_id: telegramId,
          telegram_username: username,
          подтверждён: true,
        })
        .eq('id', verify.id)

      const msg = verify.тип === 'register'
        ? '✅ Аккаунт подтверждён! Вернитесь в приложение.'
        : '✅ Личность подтверждена! Вернитесь в приложение для смены пароля.'

      await sendMessage(chatId, msg)
      return res.status(200).json({ ok: true })
    }

    // /start без параметра
    if (text === '/start') {
      await sendMessage(chatId,
        '👋 Привет! Я бот <b>Time to Snus</b>.\n\n' +
        'Я помогаю с верификацией аккаунта и уведомлениями о заказах.\n\n' +
        '🔗 Перейдите на сайт для регистрации: tts-shop.agency'
      )
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return res.status(200).json({ ok: true }) // Всегда 200 для Telegram
  }
}

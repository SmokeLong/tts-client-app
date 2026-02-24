// Shared Telegram notification logic (underscore prefix = not exposed as Vercel endpoint)

const LOCATION_CHAT_ENV = {
  'ЦЕНТР': 'TELEGRAM_CHAT_CENTER',
  'СЕВЕРНЫЙ': 'TELEGRAM_CHAT_NORTH',
  'ЛБ': 'TELEGRAM_CHAT_LB',
  // Also support numeric IDs
  2: 'TELEGRAM_CHAT_CENTER',
  3: 'TELEGRAM_CHAT_NORTH',
  4: 'TELEGRAM_CHAT_LB',
}

async function sendTgMessage(botToken, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Telegram error (chat ${chatId}):`, body)
  }
}

export async function sendOrderNotification({
  order_id,
  client_name,
  location_id,
  location_name,
  items,
  total,
  payment_type,
  status,
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.error('Missing TELEGRAM_BOT_TOKEN')
    return
  }

  const time = new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  })

  const itemsList = items
    .map((i) => `- ${i.name} × ${i.qty} — ${i.sum}₽`)
    .join('\n')

  const text =
    `🛒 <b>НОВЫЙ ЗАКАЗ #${order_id}</b>\n` +
    `👤 Клиент: ${client_name || 'Не указан'}\n` +
    `📍 Точка: ${location_name || 'Не указана'}\n` +
    `💰 Сумма: ${total}₽ (${payment_type})\n` +
    `📦 Товары:\n${itemsList}\n` +
    `⏰ Время: ${time}` +
    (status ? `\n${status}` : '')

  const sends = []

  // Always send to accountant
  const accountantChat = process.env.TELEGRAM_CHAT_ACCOUNTANT
  if (accountantChat) {
    sends.push(sendTgMessage(botToken, accountantChat, text))
  }

  // Send to location manager by name or id
  const envKey = LOCATION_CHAT_ENV[location_name] || LOCATION_CHAT_ENV[location_id]
  const managerChat = envKey && process.env[envKey]
  if (managerChat) {
    sends.push(sendTgMessage(botToken, managerChat, text))
  }

  await Promise.all(sends)
}

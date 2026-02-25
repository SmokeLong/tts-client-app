import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export default async function handler(req, res) {
  // Protect cron endpoint with secret
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Get all active subscriptions with client and product info
    const { data: subs } = await supabase
      .from('подписки_наличие')
      .select('id, клиент_id, товар_id, last_notified_at')
      .eq('active', true)

    if (!subs || subs.length === 0) {
      return res.status(200).json({ notified: 0 })
    }

    // Get unique product IDs
    const productIds = [...new Set(subs.map((s) => s.товар_id))]

    // Get inventory for these products
    const { data: inventory } = await supabase
      .from('инвентарь')
      .select('товар_id, точка_id, количество')
      .in('товар_id', productIds)
      .gt('количество', 0)

    if (!inventory || inventory.length === 0) {
      return res.status(200).json({ notified: 0 })
    }

    // Build set of products that are in stock somewhere
    const inStockProducts = new Set(inventory.map((i) => i.товар_id))

    // Filter subscriptions to only those with in-stock products
    // Skip if notified within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const toNotify = subs.filter(
      (s) => inStockProducts.has(s.товар_id) && (!s.last_notified_at || s.last_notified_at < oneDayAgo)
    )

    if (toNotify.length === 0) {
      return res.status(200).json({ notified: 0 })
    }

    // Get client telegram_ids
    const clientIds = [...new Set(toNotify.map((s) => s.клиент_id))]
    const { data: clients } = await supabase
      .from('клиенты')
      .select('id, telegram_id, имя')
      .in('id', clientIds)

    const clientMap = {}
    for (const c of clients || []) {
      clientMap[c.id] = c
    }

    // Get product names
    const { data: products } = await supabase
      .from('товары')
      .select('id, название, бренд')
      .in('id', productIds)

    const productMap = {}
    for (const p of products || []) {
      productMap[p.id] = p
    }

    // Build stock info per product
    const stockInfo = {}
    for (const inv of inventory) {
      if (!stockInfo[inv.товар_id]) stockInfo[inv.товар_id] = []
      const pointName = inv.точка_id === 2 ? 'ЦЕНТР' : inv.точка_id === 3 ? 'СЕВЕРНЫЙ' : inv.точка_id === 4 ? 'ЛБ' : ''
      if (pointName) stockInfo[inv.товар_id].push(`${pointName}: ${inv.количество} шт`)
    }

    // Send notifications
    let notified = 0
    const notifiedIds = []

    for (const sub of toNotify) {
      const client = clientMap[sub.клиент_id]
      const product = productMap[sub.товар_id]
      if (!client?.telegram_id || !product) continue

      const points = stockInfo[sub.товар_id]?.join(', ') || ''
      const msg =
        `🔔 <b>Товар в наличии!</b>\n\n` +
        `📦 ${product.бренд} — ${product.название}\n` +
        `📍 ${points}\n\n` +
        `🛒 Откройте приложение, чтобы заказать: tts-shop.agency`

      await sendTelegram(client.telegram_id, msg)
      notifiedIds.push(sub.id)
      notified++
    }

    // Update last_notified_at
    if (notifiedIds.length > 0) {
      await supabase
        .from('подписки_наличие')
        .update({ last_notified_at: new Date().toISOString() })
        .in('id', notifiedIds)
    }

    return res.status(200).json({ notified })
  } catch (error) {
    console.error('Cron stock notify error:', error)
    res.status(500).json({ error: error.message })
  }
}

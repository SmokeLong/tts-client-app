import { createClient } from '@supabase/supabase-js'

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
    const { клиент_id, товар_ids, enabled } = req.body

    if (!клиент_id || !Array.isArray(товар_ids)) {
      return res.status(400).json({ error: 'клиент_id и товар_ids обязательны' })
    }

    if (enabled) {
      // Upsert subscriptions for all favorite products
      const rows = товар_ids.map((tid) => ({
        клиент_id: клиент_id,
        товар_id: tid,
        active: true,
      }))

      if (rows.length > 0) {
        const { error } = await supabase
          .from('подписки_наличие')
          .upsert(rows, { onConflict: 'клиент_id,товар_id' })

        if (error) throw error
      }
    } else {
      // Deactivate all subscriptions for this client
      const { error } = await supabase
        .from('подписки_наличие')
        .update({ active: false })
        .eq('клиент_id', клиент_id)

      if (error) throw error
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Subscribe stock error:', error)
    res.status(500).json({ error: error.message || 'Ошибка подписки' })
  }
}

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { client_id, product_ids, enabled } = req.body

    if (!client_id || !Array.isArray(product_ids)) {
      return res.status(400).json({ error: 'client_id and product_ids required' })
    }

    if (enabled) {
      const rows = product_ids.map((tid) => ({
        клиент_id: client_id,
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
      const { error } = await supabase
        .from('подписки_наличие')
        .update({ active: false })
        .eq('клиент_id', client_id)

      if (error) throw error
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Subscribe stock error:', error)
    res.status(500).json({ error: error.message || 'Server error' })
  }
}

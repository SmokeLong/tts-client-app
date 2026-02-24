import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { order_id, клиент_id } = req.body

    if (!order_id || !клиент_id) {
      return res.status(400).json({ error: 'Укажите order_id и клиент_id' })
    }

    // Verify the order belongs to this client
    const { data: order, error: fetchError } = await supabase
      .from('заказы')
      .select('id, клиент_id, статус')
      .eq('id', order_id)
      .single()

    if (fetchError || !order) {
      return res.status(404).json({ error: 'Заказ не найден' })
    }

    if (order.клиент_id !== клиент_id) {
      return res.status(403).json({ error: 'Нет доступа к этому заказу' })
    }

    if (order.статус === 'Удалён') {
      return res.status(400).json({ error: 'Заказ уже удалён' })
    }

    // Soft delete — set status to "Удалён"
    const { error: updateError } = await supabase
      .from('заказы')
      .update({ статус: 'Удалён' })
      .eq('id', order_id)

    if (updateError) throw updateError

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Delete order error:', error)
    res.status(500).json({ error: error.message || 'Ошибка удаления заказа' })
  }
}

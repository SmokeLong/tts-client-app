import { createClient } from '@supabase/supabase-js'
import { sendOrderNotification } from './_telegram.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const {
      клиент_id,
      точка_id,
      тип_оплаты,
      статус,
      товары_json,
      итоговая_сумма,
      сумма_нал,
      сумма_безнал,
      выгода_за_нал,
      скидка_объём,
      скидка_постоянная,
      списано_ткоинов,
      начислено_ткоинов,
      шайба_в_подарок,
      комментарий,
      // Extra fields for Telegram notification
      имя_клиента,
      уникальный_номер,
    } = req.body

    if (!клиент_id || !товары_json || товары_json.length === 0) {
      return res.status(400).json({ error: 'Некорректные данные заказа' })
    }

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from('заказы')
      .insert({
        клиент_id,
        точка_id: точка_id || null,
        тип_оплаты: тип_оплаты || 'Наличные',
        статус: статус || 'Новый',
        товары_json,
        итоговая_сумма: итоговая_сумма || 0,
        сумма_нал: сумма_нал || 0,
        сумма_безнал: сумма_безнал || 0,
        выгода_за_нал: выгода_за_нал || 0,
        скидка_объём: скидка_объём || 0,
        скидка_постоянная: скидка_постоянная || 0,
        списано_ткоинов: списано_ткоинов || 0,
        начислено_ткоинов: начислено_ткоинов || 0,
        шайба_в_подарок: шайба_в_подарок || false,
        комментарий: комментарий || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Update inventory (decrease stock at the selected point)
    if (точка_id) {
      for (const item of товары_json) {
        const { data: inv } = await supabase
          .from('инвентарь')
          .select('id, количество')
          .eq('товар_id', item.id)
          .eq('точка_id', точка_id)
          .single()

        if (inv) {
          const newQty = Math.max(0, inv.количество - item.количество)
          await supabase
            .from('инвентарь')
            .update({ количество: newQty })
            .eq('id', inv.id)
        }
      }
    }

    // 3. Update client stats
    const { data: client } = await supabase
      .from('клиенты')
      .select('баланс_ткоинов, сумма_всех_покупок, количество_покупок')
      .eq('id', клиент_id)
      .single()

    let updatedClient = null
    if (client) {
      const newTcoins = Math.max(0, (client.баланс_ткоинов || 0) - (списано_ткоинов || 0) + (начислено_ткоинов || 0))
      const newTotal = (client.сумма_всех_покупок || 0) + (итоговая_сумма || 0)
      const newCount = (client.количество_покупок || 0) + 1

      // Calculate loyalty discount tier
      let discount = 0
      if (newTotal >= 59000) discount = 10
      else if (newTotal >= 44000) discount = 5
      else if (newTotal >= 24000) discount = 3

      await supabase
        .from('клиенты')
        .update({
          баланс_ткоинов: newTcoins,
          сумма_всех_покупок: newTotal,
          количество_покупок: newCount,
          постоянная_скидка: discount,
          последняя_активность: new Date().toISOString(),
        })
        .eq('id', клиент_id)

      updatedClient = {
        баланс_ткоинов: newTcoins,
        сумма_всех_покупок: newTotal,
        количество_покупок: newCount,
        постоянная_скидка: discount,
      }
    }

    // 4. Send Telegram notifications (accountant + location manager)
    let locationName = null
    if (точка_id) {
      const { data: loc } = await supabase
        .from('точки')
        .select('название')
        .eq('id', точка_id)
        .single()
      locationName = loc?.название
    }

    sendOrderNotification({
      order_id: order.id,
      client_name: имя_клиента || `Клиент #${клиент_id}`,
      client_id: уникальный_номер || клиент_id,
      location_id: точка_id,
      location_name: locationName,
      items: товары_json.map((i) => ({ name: i.название, qty: i.количество, sum: i.цена * i.количество })),
      total: итоговая_сумма,
      payment_type: тип_оплаты,
      status: статус === 'Предзаказ' ? '⏳ ПРЕДЗАКАЗ' : '',
    }).catch((e) => console.error('Telegram notify error:', e))

    return res.status(200).json({
      success: true,
      order,
      updatedClient,
    })
  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({ error: error.message || 'Ошибка создания заказа' })
  }
}

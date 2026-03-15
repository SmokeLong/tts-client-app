import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://eaazhodmkmejfmbrmmwl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const TG_BOT_TOKEN = '8075309689:AAGJ3XF1SnX661nrwCwai2zse_c1RxRP464'

function calcVolumeDiscount(qty, brand) {
  const upper = (brand || '').toUpperCase()
  const isSiberiaOdens = upper.includes('SIBERIA') || upper.includes('ODENS')

  let discountPerItem = 0
  if (isSiberiaOdens) {
    if (qty >= 10) discountPerItem = 70
    else if (qty >= 7) discountPerItem = 50
  } else {
    if (qty >= 10) discountPerItem = 90
    else if (qty >= 7) discountPerItem = 80
    else if (qty >= 5) discountPerItem = 50
    else if (qty >= 2) discountPerItem = 30
  }

  // Gift: 7+ → +1 free, 10+ → +1 free
  let freeItems = 0
  if (qty >= 10) freeItems = 1
  else if (qty >= 7) freeItems = 1

  return { discountPerItem, freeItems }
}

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
      товары,
      комментарий,
      сдача_с,
      списано_ткоинов,
      статус,
      имя_клиента,
      уникальный_номер,
    } = req.body

    if (!клиент_id || !товары || товары.length === 0) {
      return res.status(400).json({ error: 'Некорректные данные заказа' })
    }

    // 1. Load products from Supabase by IDs
    const productIds = товары.map((t) => t.товар_id)
    const { data: products, error: prodErr } = await supabase
      .from('товары_публичные')
      .select('id, название, бренд, линейка, цена_нал, цена_безнал')
      .in('id', productIds)

    if (prodErr) throw prodErr
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'Товары не найдены' })
    }

    const productMap = {}
    for (const p of products) productMap[p.id] = p

    // 2. Check inventory
    if (точка_id) {
      const { data: invData, error: invErr } = await supabase
        .from('инвентарь')
        .select('товар_id, количество')
        .in('товар_id', productIds)
        .eq('точка_id', точка_id)

      if (invErr) throw invErr

      const invMap = {}
      for (const inv of (invData || [])) invMap[inv.товар_id] = inv.количество

      for (const item of товары) {
        const available = invMap[item.товар_id] ?? 0
        if (available < item.количество) {
          const name = productMap[item.товар_id]?.название || `#${item.товар_id}`
          return res.status(400).json({
            error: `Недостаточно "${name}": в наличии ${available}, нужно ${item.количество}`,
          })
        }
      }
    }

    // 3. Calculate prices and volume discounts PER ITEM
    const payType = тип_оплаты || 'нал'
    let totalBeforeDiscount = 0
    let totalVolumeDiscount = 0
    let totalGiftItems = 0

    const товары_json = товары.map((item) => {
      const product = productMap[item.товар_id]
      if (!product) return null

      const itemPayType = item.тип_оплаты || payType
      const price = itemPayType === 'безнал'
        ? (product.цена_безнал || product.цена_нал || 0)
        : (product.цена_нал || 0)

      const { discountPerItem, freeItems } = calcVolumeDiscount(item.количество, product.бренд)

      const itemSum = price * item.количество
      const itemDiscount = discountPerItem * item.количество

      totalBeforeDiscount += itemSum
      totalVolumeDiscount += itemDiscount
      totalGiftItems += freeItems

      return {
        id: item.товар_id,
        название: product.название,
        количество: item.количество,
        цена: price,
        скидка_за_шт: discountPerItem,
        подарок: freeItems,
        тип_оплаты: itemPayType,
      }
    }).filter(Boolean)

    // 4. Final sum
    const tcoinsSpend = списано_ткоинов || 0
    const итоговая_сумма = Math.max(0, totalBeforeDiscount - totalVolumeDiscount - tcoinsSpend)

    // 5. Cashback (tcoins) — only if no tcoins spent
    const начислено_ткоинов = tcoinsSpend > 0 ? 0 : Math.ceil(итоговая_сумма * 0.015)

    // 6. Cash / card split
    let сумма_нал = 0
    let сумма_безнал = 0
    if (payType === 'нал') {
      сумма_нал = итоговая_сумма
    } else if (payType === 'безнал') {
      сумма_безнал = итоговая_сумма
    } else {
      for (const item of товары_json) {
        const net = item.цена * item.количество - item.скидка_за_шт * item.количество
        if (item.тип_оплаты === 'безнал') сумма_безнал += net
        else сумма_нал += net
      }
    }

    // 7. INSERT order
    const orderPayLabel = payType === 'нал' ? 'Наличные'
      : payType === 'безнал' ? 'Безналичный' : 'Смешанный'

    const { data: order, error: orderError } = await supabase
      .from('заказы')
      .insert({
        клиент_id,
        точка_id: точка_id || null,
        тип_оплаты: orderPayLabel,
        статус: статус || 'Новый',
        товары_json,
        итоговая_сумма,
        сумма_нал,
        сумма_безнал,
        скидка_объём: totalVolumeDiscount,
        списано_ткоинов: tcoinsSpend,
        начислено_ткоинов,
        шайба_в_подарок: totalGiftItems > 0,
        комментарий: комментарий || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 8. UPDATE inventory
    if (точка_id) {
      for (const item of товары) {
        const { data: inv } = await supabase
          .from('инвентарь')
          .select('id, количество')
          .eq('товар_id', item.товар_id)
          .eq('точка_id', точка_id)
          .single()

        if (inv) {
          await supabase
            .from('инвентарь')
            .update({ количество: Math.max(0, inv.количество - item.количество) })
            .eq('id', inv.id)
        }
      }
    }

    // 9. UPDATE client stats
    const { data: clientData } = await supabase
      .from('клиенты')
      .select('баланс_ткоинов, сумма_всех_покупок, количество_покупок')
      .eq('id', клиент_id)
      .single()

    let updatedClient = null
    if (clientData) {
      const newTcoins = Math.max(0, (clientData.баланс_ткоинов || 0) - tcoinsSpend + начислено_ткоинов)
      const newTotal = (clientData.сумма_всех_покупок || 0) + итоговая_сумма
      const newCount = (clientData.количество_покупок || 0) + 1

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

    // 10. Telegram notification → telegram_менеджера from точки table
    if (точка_id) {
      const { data: loc } = await supabase
        .from('точки')
        .select('название, telegram_менеджера')
        .eq('id', точка_id)
        .single()

      if (loc?.telegram_менеджера) {
        const itemsList = товары_json
          .map((i) => `- ${i.название} × ${i.количество} — ${i.цена * i.количество}₽`)
          .join('\n')

        const text =
          `🛒 Заказ #${order.id}\n` +
          `${itemsList}\n` +
          `Итого: ${итоговая_сумма}₽\n` +
          `Точка: ${loc.название || 'Не указана'}`

        fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: loc.telegram_менеджера, text }),
        }).catch((e) => console.error('Telegram error:', e))
      }
    }

    return res.status(200).json({
      success: true,
      order,
      начислено_ткоинов,
      скидка_объём: totalVolumeDiscount,
      шайба_в_подарок: totalGiftItems > 0,
      шайб_начислено: totalGiftItems,
      updatedClient,
    })
  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({ error: error.message || 'Ошибка создания заказа' })
  }
}

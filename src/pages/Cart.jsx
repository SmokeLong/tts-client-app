import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'

function getFlavorEmoji(flavor) {
  if (!flavor) return '📦'
  const f = (typeof flavor === 'string' ? flavor : '').toLowerCase()
  if (f.includes('мят')) return '🌿'
  if (f.includes('виноград') || f.includes('grape')) return '🍇'
  if (f.includes('манго') || f.includes('mango')) return '🥭'
  if (f.includes('арбуз') || f.includes('watermelon')) return '🍉'
  if (f.includes('ягод') || f.includes('berry')) return '🫐'
  if (f.includes('цитрус') || f.includes('лимон')) return '🍋'
  if (f.includes('кола') || f.includes('cola')) return '🥤'
  if (f.includes('лёд') || f.includes('ice') || f.includes('cool')) return '❄️'
  if (f.includes('кофе') || f.includes('coffee')) return '☕'
  if (f.includes('персик') || f.includes('peach')) return '🍑'
  if (f.includes('яблок') || f.includes('apple')) return '🍏'
  if (f.includes('вишн') || f.includes('cherry')) return '🍒'
  if (f.includes('red') || f.includes('красн')) return '🔴'
  return '📦'
}

const LOCATIONS = [
  { id: 1, name: 'ЦЕНТР', address: 'Куколкина 9', hours: '10:00 - 22:00' },
  { id: 2, name: 'СЕВЕРНЫЙ', address: 'Бульвар Победы 9', hours: '12:00 - 23:00' },
  { id: 3, name: 'ЛБ', address: 'Ленинский пр-кт 117', hours: '11:00 - 22:00' },
]

export default function Cart() {
  const navigate = useNavigate()
  const client = useAuthStore((s) => s.client)
  const items = useCartStore((s) => s.items)
  const pickupPointId = useCartStore((s) => s.pickupPointId)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const tcoinsToSpend = useCartStore((s) => s.tcoinsToSpend)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQty = useCartStore((s) => s.updateQty)
  const setItemPaymentType = useCartStore((s) => s.setItemPaymentType)
  const setPickupPoint = useCartStore((s) => s.setPickupPoint)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const setTcoins = useCartStore((s) => s.setTcoins)
  const setComment = useCartStore((s) => s.setComment)
  const clearCart = useCartStore((s) => s.clearCart)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getVolumeDiscount = useCartStore((s) => s.getVolumeDiscount)
  const getCashSavings = useCartStore((s) => s.getCashSavings)
  const getTotal = useCartStore((s) => s.getTotal)

  const [orderType, setOrderType] = useState('order') // 'order' | 'preorder'
  const [deliveryType, setDeliveryType] = useState('pickup') // 'pickup' | 'delivery'
  const [inventory, setInventory] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [tcoinsInput, setTcoinsInput] = useState(String(tcoinsToSpend))

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0)
  const clientTcoins = client?.баланс_ткоинов || 0

  useEffect(() => {
    if (items.length > 0) loadInventory()
  }, [items.length])

  useEffect(() => {
    if (!pickupPointId && LOCATIONS.length > 0) {
      setPickupPoint(LOCATIONS[0].id)
    }
  }, [])

  async function loadInventory() {
    const productIds = items.map((i) => i.product.id)
    const { data } = await supabase
      .from('инвентарь')
      .select('*')
      .in('товар_id', productIds)

    if (data) {
      const inv = {}
      for (const row of data) {
        if (!inv[row.товар_id]) inv[row.товар_id] = {}
        inv[row.товар_id][row.точка_id] = row.количество
      }
      setInventory(inv)
    }
  }

  function getItemStock(productId) {
    if (!pickupPointId || !inventory[productId]) return null
    return inventory[productId][pickupPointId] ?? 0
  }

  function getLocationStockStatus(locId) {
    let allAvailable = true
    let someAvailable = false
    for (const item of items) {
      const qty = inventory[item.product.id]?.[locId] ?? 0
      if (qty >= item.qty) someAvailable = true
      else allAvailable = false
    }
    if (allAvailable) return { label: 'Всё есть', color: 'green' }
    if (someAvailable) return { label: 'Частично', color: 'yellow' }
    return { label: 'Нет', color: 'red' }
  }

  // Calculate prices
  const subtotal = getSubtotal()
  const volumeDiscount = getVolumeDiscount()
  const cashSavings = getCashSavings()
  const total = getTotal()

  // Cashback
  const cashback = tcoinsToSpend > 0 ? 0 : Math.floor(subtotal * 0.015)
  const maxTcoins = Math.min(clientTcoins, Math.floor(subtotal * 0.5))

  function handleTcoinsChange(val) {
    const num = Math.min(maxTcoins, Math.max(0, parseInt(val) || 0))
    setTcoinsInput(String(num))
    setTcoins(num)
  }

  function handleMaxTcoins() {
    setTcoinsInput(String(maxTcoins))
    setTcoins(maxTcoins)
  }

  // Cash / card prices for payment options
  const cashTotal = items.reduce((sum, i) => sum + (i.product.priceCash || 0) * i.qty, 0)
  const cardTotal = items.reduce((sum, i) => sum + (i.product.priceCard || 0) * i.qty, 0)
  const cashBenefit = cardTotal - cashTotal

  async function handleCheckout() {
    if (items.length === 0 || submitting) return
    setSubmitting(true)

    try {
      const orderData = {
        клиент_id: client?.id,
        точка_id: pickupPointId,
        тип_оплаты: paymentMethod === 'cash' ? 'Наличные' : paymentMethod === 'card' ? 'Безналичный' : 'Смешанный',
        статус: orderType === 'preorder' ? 'Предзаказ' : 'Новый',
        товары_json: items.map((i) => ({
          id: i.product.id,
          название: i.product.name,
          количество: i.qty,
          цена: i.paymentType === 'card' ? i.product.priceCard : i.product.priceCash,
          тип_оплаты: i.paymentType,
        })),
        итоговая_сумма: total,
        сумма_нал: paymentMethod === 'cash' ? total : paymentMethod === 'mixed'
          ? items.filter((i) => i.paymentType === 'cash').reduce((s, i) => s + (i.product.priceCash || 0) * i.qty, 0)
          : 0,
        сумма_безнал: paymentMethod === 'card' ? total : paymentMethod === 'mixed'
          ? items.filter((i) => i.paymentType === 'card').reduce((s, i) => s + (i.product.priceCard || 0) * i.qty, 0)
          : 0,
        выгода_за_нал: cashSavings,
        скидка_объём: volumeDiscount.totalDiscount,
        списано_ткоинов: tcoinsToSpend,
        начислено_ткоинов: cashback,
        шайба_в_подарок: volumeDiscount.freeShayba,
        комментарий: useCartStore.getState().comment || null,
      }

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Ошибка создания заказа')
      }

      clearCart()
      navigate('/orders')
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen leather-bg">
        <div className="max-w-app mx-auto min-h-screen">
          <CartHeader onClear={null} />
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="text-[48px] mb-4">🛒</div>
            <p className="text-[14px] font-bold gold-gradient-text mb-2">Корзина пуста</p>
            <p className="text-[11px] text-[var(--text-muted)] mb-6">Добавьте товары из каталога</p>
            <button
              onClick={() => navigate('/catalog')}
              className="gold-gradient-bg text-[var(--bg-dark)] font-bold text-[11px] tracking-[2px] px-8 py-3 rounded-xl press-effect"
            >
              В КАТАЛОГ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen leather-bg">
      <div className="max-w-app mx-auto min-h-screen">
        <CartHeader onClear={clearCart} />

        <div className="pb-[220px] animate-fadeIn">
          {/* Order Type Toggle */}
          <div className="px-4 pt-3.5">
            <div className="flex bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[10px] p-[3px] mb-3.5">
              <button
                onClick={() => setOrderType('order')}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  orderType === 'order'
                    ? 'gold-gradient-bg text-[var(--bg-dark)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                ЗАКАЗ
              </button>
              <button
                onClick={() => setOrderType('preorder')}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  orderType === 'preorder'
                    ? 'gold-gradient-bg text-[var(--bg-dark)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                ПРЕДЗАКАЗ
              </button>
            </div>

            {/* Items */}
            <p className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px] mb-3">
              ТОВАРЫ ({totalQty} шт)
            </p>

            {items.map((item) => {
              const stock = getItemStock(item.product.id)
              const lowStock = stock !== null && stock < item.qty && stock > 0
              const noStock = stock !== null && stock === 0
              return (
                <div key={item.product.id} className="card p-3 mb-2.5 flex gap-3 relative">
                  {/* Image */}
                  <div className="w-[55px] h-[55px] rounded-[10px] bg-gradient-to-br from-[#1a1816] to-[#0d0c0a] flex items-center justify-center text-[28px] shrink-0">
                    {getFlavorEmoji(item.product.flavor)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] text-[var(--text-muted)] tracking-wider">
                      {item.product.brand}{item.product.lineup ? ` • ${item.product.lineup}` : ''}
                    </p>
                    <p className="text-[12px] font-bold text-[var(--gold-light)] mt-0.5 mb-1.5 truncate">
                      {item.product.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-extrabold text-[var(--gold)]">
                        {(item.paymentType === 'card' ? item.product.priceCard : item.product.priceCash) * item.qty} ₽
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Per-item payment toggle (visible in mixed mode) */}
                        {paymentMethod === 'mixed' && (
                          <div className="flex bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-md p-0.5">
                            <button
                              onClick={() => setItemPaymentType(item.product.id, 'cash')}
                              className={`w-[26px] h-[24px] rounded text-[12px] flex items-center justify-center ${
                                item.paymentType === 'cash' ? 'gold-gradient-bg' : ''
                              }`}
                            >
                              💵
                            </button>
                            <button
                              onClick={() => setItemPaymentType(item.product.id, 'card')}
                              className={`w-[26px] h-[24px] rounded text-[12px] flex items-center justify-center ${
                                item.paymentType === 'card' ? 'gold-gradient-bg' : ''
                              }`}
                            >
                              💳
                            </button>
                          </div>
                        )}
                        {/* Quantity */}
                        <div className="flex items-center bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-md p-0.5">
                          <button
                            onClick={() => updateQty(item.product.id, item.qty - 1)}
                            className="w-[26px] h-[24px] rounded flex items-center justify-center press-effect"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                              <path d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-6 text-center text-[12px] font-bold text-[var(--gold-light)]">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.product.id, item.qty + 1)}
                            className="w-[26px] h-[24px] rounded flex items-center justify-center press-effect"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                              <path d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stock warning */}
                    {lowStock && (
                      <div className="mt-2 p-2 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] rounded-lg flex items-center justify-between gap-2">
                        <span className="text-[9px] text-[var(--yellow)]">
                          В наличии только: <strong className="text-[var(--red)]">{stock} шт</strong> · Недостаточно {item.qty - stock}
                        </span>
                        <button className="px-2.5 py-1.5 bg-[rgba(251,191,36,0.2)] border border-[var(--yellow)] rounded-md text-[8px] font-bold text-[var(--yellow)] whitespace-nowrap">
                          ЗАМЕНИТЬ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="absolute top-2 right-2 w-[22px] h-[22px] bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] rounded-md flex items-center justify-center press-effect"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-4 my-1" />

          {/* Delivery/Pickup Toggle */}
          <div className="px-4 py-3.5">
            <div className="flex bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[10px] p-[3px] mb-3.5">
              <button
                onClick={() => setDeliveryType('pickup')}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  deliveryType === 'pickup'
                    ? 'gold-gradient-bg text-[var(--bg-dark)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                🏪 САМОВЫВОЗ
              </button>
              <button
                onClick={() => setDeliveryType('delivery')}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  deliveryType === 'delivery'
                    ? 'gold-gradient-bg text-[var(--bg-dark)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                🚗 ДОСТАВКА
              </button>
            </div>

            {deliveryType === 'pickup' ? (
              <div className="space-y-2">
                {LOCATIONS.map((loc) => {
                  const stockStatus = getLocationStockStatus(loc.id)
                  const isActive = pickupPointId === loc.id
                  return (
                    <div
                      key={loc.id}
                      onClick={() => setPickupPoint(loc.id)}
                      className={`card p-3 flex items-center gap-3 cursor-pointer transition-all ${
                        isActive ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.08)]' : ''
                      }`}
                    >
                      <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isActive ? 'border-[var(--gold)]' : 'border-[var(--border-gold)]'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-[var(--gold-light)]">{loc.name}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{loc.address}</p>
                        <p className="text-[9px] text-[var(--gold)] mt-1">🕐 {loc.hours}</p>
                      </div>
                      <span className={`text-[10px] font-bold text-[var(--${stockStatus.color})]`}>
                        {stockStatus.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Адрес доставки..."
                  className="w-full py-3 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                />
                <input
                  type="text"
                  placeholder="Подъезд, этаж, домофон..."
                  className="w-full py-3 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-4 my-1" />

          {/* Payment Method */}
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px] mb-3">ОПЛАТА</p>

            <div
              onClick={() => setPaymentMethod('cash')}
              className={`card p-3 mb-2 flex items-center gap-2.5 cursor-pointer transition-all ${
                paymentMethod === 'cash' ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.08)]' : ''
              }`}
            >
              <span className="text-[18px]">💵</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[var(--gold-light)]">НАЛИЧНЫЕ</p>
                {cashBenefit > 0 && (
                  <p className="text-[9px] text-[var(--green)]">Выгода -{cashBenefit} ₽</p>
                )}
              </div>
              <span className={`text-[13px] font-extrabold ${cashBenefit > 0 ? 'text-[var(--green)]' : 'text-[var(--gold)]'}`}>
                {cashTotal} ₽
              </span>
            </div>

            <div
              onClick={() => setPaymentMethod('card')}
              className={`card p-3 mb-2 flex items-center gap-2.5 cursor-pointer transition-all ${
                paymentMethod === 'card' ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.08)]' : ''
              }`}
            >
              <span className="text-[18px]">💳</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[var(--gold-light)]">БЕЗНАЛИЧНЫЙ</p>
                <p className="text-[9px] text-[var(--text-muted)]">Перевод на карту</p>
              </div>
              <span className="text-[13px] font-extrabold text-[var(--gold)]">{cardTotal} ₽</span>
            </div>

            <div
              onClick={() => setPaymentMethod('mixed')}
              className={`card p-3 mb-2 flex items-center gap-2.5 cursor-pointer transition-all ${
                paymentMethod === 'mixed' ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.08)]' : ''
              }`}
            >
              <span className="text-[18px]">💵💳</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[var(--gold-light)]">СМЕШАННЫЙ</p>
                <p className="text-[9px] text-[var(--text-muted)]">Выбор для каждого товара</p>
              </div>
              <span className="text-[13px] font-extrabold text-[var(--gold)]">от {cashTotal} ₽</span>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-4 my-1" />

          {/* Tcoins */}
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px] mb-3">СПИСАТЬ ТКОИНЫ</p>
            <div className="card p-3 flex items-center gap-2.5">
              <span className="text-[24px]">🪙</span>
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="number"
                  value={tcoinsInput}
                  onChange={(e) => handleTcoinsChange(e.target.value)}
                  min="0"
                  max={maxTcoins}
                  className="w-[60px] py-2 px-2 bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-md text-[14px] font-bold text-[var(--gold-light)] text-center outline-none font-[inherit]"
                />
                <span className="text-[10px] text-[var(--text-muted)]">из {clientTcoins} доступно</span>
              </div>
              <button
                onClick={handleMaxTcoins}
                className="py-2 px-3 bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-md text-[9px] font-bold text-[var(--gold)] press-effect"
              >
                МАКС
              </button>
            </div>

            {tcoinsToSpend > 0 ? (
              <div className="mt-2.5 p-2.5 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] rounded-lg flex items-center gap-2.5">
                <span className="text-[18px]">⚠️</span>
                <span className="text-[10px] text-[var(--yellow)]">При списании ткоинов кэшбэк не начисляется</span>
              </div>
            ) : (
              <div className="mt-2.5 p-2.5 bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)] rounded-lg flex items-center gap-2.5">
                <span className="text-[18px]">🎁</span>
                <span className="text-[10px] text-[var(--green)]">Начислим +{cashback} ткоинов за покупку (1.5%)</span>
              </div>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-4 my-1" />

          {/* Document Warning */}
          <div className="px-4 py-3.5">
            <div className="p-3 bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.25)] rounded-[10px] flex items-start gap-2.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.5" className="shrink-0 mt-0.5">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="text-[10px] text-[var(--yellow)] leading-relaxed">
                <strong className="block mb-0.5">При получении предъявите паспорт</strong>
                Для подтверждения возраста 18+
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-[linear-gradient(180deg,rgba(10,9,8,0.98),rgba(5,4,3,1))] border-t border-[var(--border-gold)] z-50 px-4 pt-3 pb-6">
          {/* Summary rows */}
          <div className="mb-3">
            <SumRow label={`Товары (${totalQty} шт)`} value={`${subtotal} ₽`} />
            {volumeDiscount.totalDiscount > 0 && (
              <SumRow
                label={`Скидка за объём (${totalQty} шт)`}
                value={`-${volumeDiscount.totalDiscount} ₽`}
                green
              />
            )}
            {cashSavings > 0 && paymentMethod === 'cash' && (
              <SumRow label="Выгода за оплату нал." value={`-${cashSavings} ₽`} green />
            )}
            {tcoinsToSpend > 0 && (
              <SumRow label="Списание ткоинов" value={`-${tcoinsToSpend} ₽`} green />
            )}
            <div className="flex justify-between items-center pt-2 mt-1.5 border-t border-[var(--border-gold)]">
              <span className="text-[12px] font-bold text-[var(--gold)]">ИТОГО</span>
              <span className="text-[18px] font-extrabold text-[var(--gold-light)]">{total} ₽</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={submitting}
            className={`w-full py-3.5 gold-gradient-bg rounded-xl text-[var(--bg-dark)] font-bold text-[12px] tracking-[2px] press-effect ${
              submitting ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {submitting ? 'ОФОРМЛЕНИЕ...' : orderType === 'preorder' ? 'ОФОРМИТЬ ПРЕДЗАКАЗ' : 'ОФОРМИТЬ ЗАКАЗ'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CartHeader({ onClear }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-50 px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-gold)] bg-[rgba(10,9,8,0.95)] backdrop-blur-lg">
      <button onClick={() => navigate(-1)} className="press-effect">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-[16px] font-extrabold text-[var(--gold-light)] tracking-[2px]">КОРЗИНА</span>
      {onClear ? (
        <button onClick={onClear} className="text-[10px] text-[var(--red)] tracking-wider press-effect font-bold">
          ОЧИСТИТЬ
        </button>
      ) : (
        <div className="w-16" />
      )}
    </header>
  )
}

function SumRow({ label, value, green }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      <span className={`text-[11px] font-bold ${green ? 'text-[var(--green)]' : 'text-[var(--gold)]'}`}>{value}</span>
    </div>
  )
}

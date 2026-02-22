import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

function Cart() {
  const navigate = useNavigate()
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotalCard, cartTotalCash, client } = useApp()

  const [step, setStep] = useState(1)
  const [paymentType, setPaymentType] = useState('cash')
  const [selectedPoint, setSelectedPoint] = useState('')
  const [diceRolls, setDiceRolls] = useState(0)
  const [diceDiscount, setDiceDiscount] = useState(0)
  const [changeMoney, setChangeMoney] = useState('')
  const [loading, setLoading] = useState(false)
  const [points, setPoints] = useState([])
  const [error, setError] = useState('')

  useEffect(() => { loadPoints() }, [])

  const loadPoints = async () => {
    try {
      const { data } = await supabase
        .from('точки')
        .select('*')
        .eq('тип', 'Магазин')
        .eq('активна', true)
        .order('порядок')
      setPoints(data || [])
      if (data && data.length > 0) setSelectedPoint(data[0].id)
    } catch (err) {
      console.error('Ошибка точек:', err)
    }
  }

  const baseTotal = paymentType === 'cash' ? cartTotalCash : cartTotalCard
  const volumeDiscount = cart.length >= 7 ? 0.1 : cart.length >= 5 ? 0.07 : cart.length >= 3 ? 0.05 : 0
  const volumeDiscountAmount = Math.round(baseTotal * volumeDiscount)
  const diceDiscountAmount = Math.round((baseTotal - volumeDiscountAmount) * (diceDiscount / 100))
  const finalTotal = baseTotal - volumeDiscountAmount - diceDiscountAmount
  const cashSavings = cartTotalCard - cartTotalCash

  const rollDice = () => {
    if (diceRolls >= 2) return
    const result = Math.floor(Math.random() * 6) + 1
    const discounts = [0, 3, 5, 7, 10, 15]
    setDiceRolls(prev => prev + 1)
    setDiceDiscount(discounts[result - 1])
  }

  const handleSubmit = async () => {
    if (!selectedPoint) { setError('Выберите точку'); return }
    setLoading(true)
    setError('')
    try {
      // Собираем товары в JSON
      const itemsJson = cart.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        qty: item.quantity,
        price: paymentType === 'cash' ? (item.price_cash || item.price_card) : (item.price_card || item.price_cash),
        sum: (paymentType === 'cash' ? (item.price_cash || item.price_card) : (item.price_card || item.price_cash)) * item.quantity
      }))

      const orderData = {
        точка_id: selectedPoint,
        тип_оплаты: paymentType === 'cash' ? 'Наличные' : 'Безнал',
        статус: 'Новый',
        итоговая_сумма: finalTotal,
        сумма_нал: paymentType === 'cash' ? finalTotal : 0,
        сумма_безнал: paymentType === 'card' ? finalTotal : 0,
        выгода_за_нал: paymentType === 'cash' ? cashSavings : 0,
        скидка_объём: volumeDiscountAmount,
        скидка_кубик: diceDiscountAmount,
        сдача_с: changeMoney ? parseInt(changeMoney) : null,
        товары_json: itemsJson,
        анонимный: true,
      }

      const { data: order, error: orderError } = await supabase
        .from('заказы')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      clearCart()
      navigate('/orders', { state: { newOrder: order } })
    } catch (err) {
      console.error('Ошибка заказа:', err)
      setError(err.message || 'Ошибка оформления')
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-tts-dark flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-white font-medium mb-2">Корзина пуста</p>
        <p className="text-tts-muted text-sm mb-6">Добавьте товары из каталога</p>
        <button onClick={() => navigate('/catalog')} className="bg-tts-primary text-white px-6 py-3 rounded-xl font-medium">Перейти в каталог</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tts-dark pb-40">
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
        <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">{step === 1 ? 'Корзина' : 'Оформление'}</h1>
        <span className="text-tts-muted ml-auto">{cart.length} шт</span>
      </div>

      {step === 1 ? (
        <div className="px-4">
          {cart.map(item => (
            <div key={item.id} className="bg-tts-card rounded-2xl p-4 mb-3 flex gap-4">
              <div className="w-16 h-16 bg-tts-dark rounded-xl overflow-hidden flex-shrink-0">
                {item.photo ? <img src={item.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-tts-primary text-xs">{item.brand}</p>
                <p className="text-white font-medium mb-2 truncate">{item.name}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center bg-tts-dark rounded-lg">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-white">−</button>
                    <span className="w-6 text-center text-white text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-white">+</button>
                  </div>
                  <p className="text-white font-medium">{(item.price_cash || item.price_card) * item.quantity} ₽</p>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-tts-muted self-start">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-tts-card rounded-2xl p-4 mb-4">
            <p className="text-tts-muted text-sm mb-3">📍 Точка самовывоза</p>
            <div className="space-y-2">
              {points.map(point => (
                <button key={point.id} onClick={() => setSelectedPoint(point.id)} className={`w-full p-3 rounded-xl text-left transition-all ${selectedPoint === point.id ? 'bg-tts-primary text-white' : 'bg-tts-dark text-white'}`}>
                  <p className="font-medium">{point.название}</p>
                  {point.адрес && <p className="text-sm opacity-70">{point.адрес}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-tts-card rounded-2xl p-4 mb-4">
            <p className="text-tts-muted text-sm mb-3">💳 Способ оплаты</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentType('cash')} className={`py-3 rounded-xl font-medium transition-all ${paymentType === 'cash' ? 'bg-tts-success text-white' : 'bg-tts-dark text-tts-muted'}`}>💵 Наличные</button>
              <button onClick={() => setPaymentType('card')} className={`py-3 rounded-xl font-medium transition-all ${paymentType === 'card' ? 'bg-tts-primary text-white' : 'bg-tts-dark text-tts-muted'}`}>💳 Безнал</button>
            </div>
            {paymentType === 'cash' && cashSavings > 0 && (
              <div className="mt-3 bg-tts-success/10 rounded-xl p-3 text-center">
                <p className="text-tts-success text-sm">💰 Выгода за нал: <span className="font-bold">{cashSavings} ₽</span></p>
              </div>
            )}
          </div>

          <div className="bg-tts-card rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-white font-medium">🎲 Бросить кубик</p>
                <p className="text-tts-muted text-xs">Шанс на скидку (макс 2)</p>
              </div>
              {diceDiscount > 0 && <span className="bg-tts-success text-white px-3 py-1 rounded-full text-sm font-bold">-{diceDiscount}%</span>}
            </div>
            <button onClick={rollDice} disabled={diceRolls >= 2} className={`w-full py-3 rounded-xl font-medium ${diceRolls >= 2 ? 'bg-tts-dark text-tts-muted' : 'bg-tts-primary text-white active:scale-95'}`}>
              {diceRolls >= 2 ? 'Лимит исчерпан' : '🎲 Бросить (' + (2 - diceRolls) + ' осталось)'}
            </button>
          </div>

          {paymentType === 'cash' && (
            <div className="bg-tts-card rounded-2xl p-4 mb-4">
              <p className="text-tts-muted text-sm mb-3">Сдача с</p>
              <div className="flex gap-2 flex-wrap">
                {['500', '1000', '2000', '5000'].map(sum => (
                  <button key={sum} onClick={() => setChangeMoney(sum)} className={`px-4 py-2 rounded-lg ${changeMoney === sum ? 'bg-tts-primary text-white' : 'bg-tts-dark text-tts-muted'}`}>{sum} ₽</button>
                ))}
                <button onClick={() => setChangeMoney('')} className={`px-4 py-2 rounded-lg ${changeMoney === '' ? 'bg-tts-primary text-white' : 'bg-tts-dark text-tts-muted'}`}>Без сдачи</button>
              </div>
            </div>
          )}

          {error && <div className="bg-tts-danger/20 text-tts-danger rounded-xl p-4 text-sm mb-4">❌ {error}</div>}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-tts-dark border-t border-tts-card p-4">
        <div className="mb-4 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-tts-muted">Товаров ({cart.length})</span><span className="text-white">{baseTotal} ₽</span></div>
          {volumeDiscountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-tts-muted">Скидка за объём ({Math.round(volumeDiscount*100)}%)</span><span className="text-tts-success">-{volumeDiscountAmount} ₽</span></div>}
          {diceDiscountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-tts-muted">Кубик (-{diceDiscount}%)</span><span className="text-tts-success">-{diceDiscountAmount} ₽</span></div>}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-tts-card"><span className="text-white">Итого</span><span className="text-white">{finalTotal} ₽</span></div>
        </div>
        {step === 1 ? (
          <button onClick={() => setStep(2)} className="w-full py-4 rounded-xl font-medium bg-tts-primary text-white active:scale-95 transition-all">Оформить заказ</button>
        ) : (
          <button onClick={handleSubmit} disabled={loading || !selectedPoint} className={`w-full py-4 rounded-xl font-medium transition-all ${loading || !selectedPoint ? 'bg-tts-card text-tts-muted' : 'bg-tts-success text-white active:scale-95'}`}>{loading ? 'Оформляем...' : '✅ Подтвердить заказ'}</button>
        )}
      </div>
    </div>
  )
}

export default Cart

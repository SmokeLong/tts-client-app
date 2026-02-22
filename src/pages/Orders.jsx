import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../App'
import BottomNav from '../components/BottomNav'

function Orders() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useApp()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    loadOrders()
    
    // Если пришли с нового заказа — показать уведомление
    if (location.state?.newOrder) {
      window.Telegram?.WebApp?.showPopup({
        title: 'Заказ оформлен! 🎉',
        message: `Номер заказа: ${location.state.newOrder.number}\n\nМенеджер скоро с вами свяжется.`,
        buttons: [{ type: 'ok' }]
      })
    }
  }, [])

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/tts-orders?telegram_id=${user?.telegram_id}`)
      const data = await response.json()
      if (data.orders) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.log('Ошибка загрузки заказов:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    const statuses = {
      'Новый': { emoji: '🟡', color: 'text-tts-warning', bg: 'bg-tts-warning/20' },
      'В обработке': { emoji: '🟠', color: 'text-orange-500', bg: 'bg-orange-500/20' },
      'Готов к выдаче': { emoji: '🟢', color: 'text-tts-success', bg: 'bg-tts-success/20' },
      'Передан курьеру': { emoji: '🚗', color: 'text-tts-primary', bg: 'bg-tts-primary/20' },
      'Выдан': { emoji: '✅', color: 'text-tts-success', bg: 'bg-tts-success/20' },
      'Отменён': { emoji: '❌', color: 'text-tts-danger', bg: 'bg-tts-danger/20' }
    }
    return statuses[status] || statuses['Новый']
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tts-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tts-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">История заказов</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-white font-medium mb-2">Заказов пока нет</p>
          <p className="text-tts-muted text-sm text-center mb-6">Ваши заказы будут отображаться здесь</p>
          <button onClick={() => navigate('/catalog')} className="btn-primary">
            Перейти в каталог
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.status)
            
            return (
              <div 
                key={order.id}
                onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                className="bg-tts-card rounded-2xl p-4 cursor-pointer active:scale-98 transition-transform"
              >
                {/* Основная информация */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-medium">{order.number}</p>
                    <p className="text-tts-muted text-sm">{formatDate(order.created_at)}</p>
                  </div>
                  <div className={`${statusInfo.bg} ${statusInfo.color} px-3 py-1 rounded-full text-sm font-medium`}>
                    {statusInfo.emoji} {order.status}
                  </div>
                </div>

                {/* Превью товаров */}
                <div className="flex gap-2 mb-3">
                  {order.items?.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="w-12 h-12 bg-tts-dark rounded-lg overflow-hidden">
                      {item.photo ? (
                        <img src={item.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                      )}
                    </div>
                  ))}
                  {order.items?.length > 4 && (
                    <div className="w-12 h-12 bg-tts-dark rounded-lg flex items-center justify-center">
                      <span className="text-tts-muted text-sm">+{order.items.length - 4}</span>
                    </div>
                  )}
                </div>

                {/* Итого */}
                <div className="flex justify-between items-center">
                  <p className="text-tts-muted text-sm">{order.items?.length} товаров</p>
                  <p className="text-white font-bold">{order.total} ₽</p>
                </div>

                {/* Детали (раскрываются) */}
                {selectedOrder === order.id && (
                  <div className="mt-4 pt-4 border-t border-tts-dark animate-fadeIn">
                    {/* Список товаров */}
                    <div className="space-y-2 mb-4">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-tts-muted">{item.name} × {item.quantity}</span>
                          <span className="text-white">{item.total} ₽</span>
                        </div>
                      ))}
                    </div>

                    {/* Скидки */}
                    {order.discounts && (
                      <div className="space-y-1 mb-4">
                        {order.discounts.volume > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-tts-muted">Скидка за объём</span>
                            <span className="text-tts-success">-{order.discounts.volume} ₽</span>
                          </div>
                        )}
                        {order.discounts.tcoins > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-tts-muted">Ткоины</span>
                            <span className="text-tts-warning">-{order.discounts.tcoins} ₽</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Точка */}
                    <div className="bg-tts-dark rounded-xl p-3 mb-4">
                      <p className="text-tts-muted text-xs mb-1">
                        {order.delivery_type === 'pickup' ? 'Самовывоз' : 'Доставка'}
                      </p>
                      <p className="text-white text-sm">{order.point_name}</p>
                      {order.point_address && (
                        <p className="text-tts-muted text-xs mt-1">{order.point_address}</p>
                      )}
                    </div>

                    {/* Начислено ткоинов */}
                    {order.earned_tcoins > 0 && (
                      <div className="bg-tts-warning/10 rounded-xl p-3 text-center">
                        <p className="text-tts-warning text-sm">
                          🪙 Начислено ткоинов: <span className="font-bold">+{order.earned_tcoins}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Orders

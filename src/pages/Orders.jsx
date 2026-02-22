import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

function Orders() {
  const navigate = useNavigate()
  const location = useLocation()
  const { client } = useApp()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      // Пока загружаем все заказы (позже — только клиента)
      const { data, error } = await supabase
        .from('заказы')
        .select('*, точки(название)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    const statuses = {
      'НОВЫЙ': { emoji: '🟡', color: 'text-tts-warning', bg: 'bg-tts-warning/20' },
      'В ОБРАБОТКЕ': { emoji: '🟠', color: 'text-orange-500', bg: 'bg-orange-500/20' },
      'ГОТОВ': { emoji: '🟢', color: 'text-tts-success', bg: 'bg-tts-success/20' },
      'ВЫДАН': { emoji: '✅', color: 'text-tts-success', bg: 'bg-tts-success/20' },
      'ОТМЕНЁН': { emoji: '❌', color: 'text-tts-danger', bg: 'bg-tts-danger/20' }
    }
    return statuses[status] || statuses['НОВЫЙ']
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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
          <p className="text-tts-muted text-sm text-center mb-6">Ваши заказы будут здесь</p>
          <button onClick={() => navigate('/catalog')} className="bg-tts-primary text-white px-6 py-3 rounded-xl">Перейти в каталог</button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.статус || 'НОВЫЙ')
            return (
              <div key={order.id} className="bg-tts-card rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-medium">Заказ #{order.id}</p>
                    <p className="text-tts-muted text-sm">{formatDate(order.created_at)}</p>
                  </div>
                  <div className={`${statusInfo.bg} ${statusInfo.color} px-3 py-1 rounded-full text-sm font-medium`}>
                    {statusInfo.emoji} {order.статус || 'НОВЫЙ'}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-tts-dark">
                  <p className="text-tts-muted text-sm">{order.тип_оплаты || ''}</p>
                  <p className="text-white font-bold">{order.сумма_итого || 0} ₽</p>
                </div>
                {order.точки?.название && (
                  <p className="text-tts-muted text-xs mt-2">📍 {order.точки.название}</p>
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

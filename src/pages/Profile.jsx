import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'

function Profile() {
  const navigate = useNavigate()
  const { client } = useApp()

  const getDiscountLevel = (totalSum) => {
    if (totalSum >= 200000) return { percent: 10, level: 'Легенда', next: null }
    if (totalSum >= 150000) return { percent: 7, level: 'VIP', next: 200000 }
    if (totalSum >= 100000) return { percent: 5, level: 'Постоянный', next: 150000 }
    if (totalSum >= 50000) return { percent: 3, level: 'Активный', next: 100000 }
    return { percent: 0, level: 'Новичок', next: 50000 }
  }

  const totalPurchases = client?.сумма_покупок || client?.total_purchases || 0
  const discountInfo = getDiscountLevel(totalPurchases)
  const progressToNext = discountInfo.next ? Math.min(100, (totalPurchases / discountInfo.next) * 100) : 100
  const tcoins = client?.баланс_ткоинов || client?.tcoins || 0
  const name = client?.имя || client?.first_name || 'Гость'
  const code = client?.уникальный_номер || client?.unique_id || 'WEB'

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      <div className="bg-gradient-to-b from-tts-primary/30 to-tts-dark px-4 pt-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card/50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Личный кабинет</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-tts-primary rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{name.charAt(0)}</span>
            </div>
            {discountInfo.percent > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-tts-success text-white text-xs font-bold px-2 py-1 rounded-full">-{discountInfo.percent}%</div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-tts-muted text-sm">#{code}</p>
            <p className="text-tts-primary text-sm font-medium mt-1">{discountInfo.level}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-tts-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-tts-warning/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🪙</span>
              </div>
              <div>
                <p className="text-tts-muted text-sm">Ткоины</p>
                <p className="text-white text-2xl font-bold">{tcoins}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-tts-card rounded-2xl p-4 mb-4 space-y-4">
          <div className="flex justify-between">
            <span className="text-tts-muted">Покупок</span>
            <span className="text-white">{client?.кол_во_покупок || client?.purchases_count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tts-muted">На сумму</span>
            <span className="text-white">{totalPurchases.toLocaleString()} ₽</span>
          </div>
        </div>

        <div className="bg-tts-card rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-tts-muted text-sm">Прогресс скидки</span>
            <span className="text-white font-medium">{discountInfo.percent}%</span>
          </div>
          <div className="h-2 bg-tts-dark rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-tts-primary to-tts-secondary transition-all" style={{ width: progressToNext + '%' }} />
          </div>
          {discountInfo.next && (
            <p className="text-tts-muted text-xs">До {discountInfo.next.toLocaleString()} ₽ осталось {(discountInfo.next - totalPurchases).toLocaleString()} ₽</p>
          )}
        </div>

        <div className="space-y-2">
          <button onClick={() => navigate('/orders')} className="w-full bg-tts-card rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="text-white">История заказов</span>
            </div>
            <svg className="w-5 h-5 text-tts-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/favorites')} className="w-full bg-tts-card rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">❤️</span>
              <span className="text-white">Избранное</span>
            </div>
            <svg className="w-5 h-5 text-tts-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/catalog')} className="w-full bg-tts-card rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🛍️</span>
              <span className="text-white">Каталог</span>
            </div>
            <svg className="w-5 h-5 text-tts-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default Profile

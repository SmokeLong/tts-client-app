import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../App'
import BottomNav from '../components/BottomNav'

function Profile() {
  const navigate = useNavigate()
  const { client, user, refreshClient } = useApp()
  const [activity, setActivity] = useState(null)
  const [frequentProduct, setFrequentProduct] = useState(null)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      const response = await fetch(`${API_BASE}/tts-profile?telegram_id=${user?.telegram_id}`)
      const data = await response.json()
      if (data.activity) setActivity(data.activity)
      if (data.frequent_product) setFrequentProduct(data.frequent_product)
    } catch (error) {
      console.log('Ошибка загрузки профиля:', error)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Расчёт уровня скидки по сумме покупок
  const getDiscountLevel = (totalSum) => {
    if (totalSum >= 200000) return { percent: 10, level: 'Легенда', next: null }
    if (totalSum >= 150000) return { percent: 7, level: 'VIP', next: 200000 }
    if (totalSum >= 100000) return { percent: 5, level: 'Постоянный', next: 150000 }
    if (totalSum >= 50000) return { percent: 3, level: 'Активный', next: 100000 }
    return { percent: 0, level: 'Новичок', next: 50000 }
  }

  const discountInfo = getDiscountLevel(client?.total_purchases || 0)
  const progressToNext = discountInfo.next 
    ? Math.min(100, ((client?.total_purchases || 0) / discountInfo.next) * 100)
    : 100

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      {/* Шапка */}
      <div className="bg-gradient-to-b from-tts-primary/30 to-tts-dark px-4 pt-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card/50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Личный кабинет</h1>
        </div>

        {/* Аватар и имя */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {client?.photo_url ? (
              <img src={client.photo_url} alt="" className="w-20 h-20 rounded-full" />
            ) : (
              <div className="w-20 h-20 bg-tts-primary rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{client?.first_name?.charAt(0) || 'U'}</span>
              </div>
            )}
            {discountInfo.percent > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-tts-success text-white text-xs font-bold px-2 py-1 rounded-full">
                -{discountInfo.percent}%
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{client?.first_name || 'Пользователь'}</h2>
            <p className="text-tts-muted text-sm">#{client?.unique_id || '000000'}</p>
            <p className="text-tts-primary text-sm font-medium mt-1">{discountInfo.level}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {/* Ткоины */}
        <div className="bg-tts-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-tts-warning/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🪙</span>
              </div>
              <div>
                <p className="text-tts-muted text-sm">Ткоины</p>
                <p className="text-white text-2xl font-bold">{client?.tcoins || 0}</p>
              </div>
            </div>
            <button className="text-tts-primary text-sm">История →</button>
          </div>
        </div>

        {/* Информация */}
        <div className="bg-tts-card rounded-2xl p-4 mb-4 space-y-4">
          <div className="flex justify-between">
            <span className="text-tts-muted">День рождения</span>
            <span className="text-white">{formatDate(client?.birth_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tts-muted">С нами с</span>
            <span className="text-white">{formatDate(client?.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tts-muted">Покупок</span>
            <span className="text-white">{client?.purchases_count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tts-muted">На сумму</span>
            <span className="text-white">{(client?.total_purchases || 0).toLocaleString()} ₽</span>
          </div>
        </div>

        {/* Прогресс скидки */}
        <div className="bg-tts-card rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-tts-muted text-sm">Прогресс скидки</span>
            <span className="text-white font-medium">{discountInfo.percent}%</span>
          </div>
          <div className="h-2 bg-tts-dark rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-tts-primary to-tts-secondary transition-all"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          {discountInfo.next && (
            <p className="text-tts-muted text-xs">
              До {discountInfo.next.toLocaleString()} ₽ осталось {(discountInfo.next - (client?.total_purchases || 0)).toLocaleString()} ₽
            </p>
          )}
        </div>

        {/* Активность месяца */}
        {activity && (
          <div className="bg-tts-card rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-white font-medium">Активность месяца</p>
                <p className="text-tts-muted text-xs">Выполни 5 заданий — получи шайбу бесплатно!</p>
              </div>
              <span className="text-tts-primary font-bold">{activity.completed}/5</span>
            </div>
            
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i <= activity.completed ? 'bg-tts-success' : 'bg-tts-dark'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-2">
              {activity.tasks?.map((task, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    task.completed ? 'bg-tts-success' : 'bg-tts-dark'
                  }`}>
                    {task.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${task.completed ? 'text-tts-muted line-through' : 'text-white'}`}>
                    {task.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Чаще всего брал */}
        {frequentProduct && (
          <div className="bg-tts-card rounded-2xl p-4 mb-4">
            <p className="text-tts-muted text-sm mb-3">Чаще всего берёте</p>
            <button 
              onClick={() => navigate(`/product/${frequentProduct.id}`)}
              className="flex gap-4 w-full"
            >
              <div className="w-16 h-16 bg-tts-dark rounded-xl overflow-hidden flex-shrink-0">
                {frequentProduct.photo ? (
                  <img src={frequentProduct.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-tts-primary text-xs">{frequentProduct.brand}</p>
                <p className="text-white font-medium">{frequentProduct.name}</p>
                <p className="text-tts-success text-sm">{frequentProduct.price_cash} ₽</p>
              </div>
            </button>
          </div>
        )}

        {/* Меню */}
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/orders')}
            className="w-full bg-tts-card rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="text-white">История заказов</span>
            </div>
            <svg className="w-5 h-5 text-tts-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button 
            onClick={() => navigate('/favorites')}
            className="w-full bg-tts-card rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">❤️</span>
              <span className="text-white">Избранное</span>
            </div>
            <svg className="w-5 h-5 text-tts-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button 
            onClick={() => navigate('/preorders')}
            className="w-full bg-tts-card rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <span className="text-white">Мои предзаказы</span>
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

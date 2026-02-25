import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { showToast } from '../stores/toastStore'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'

function getFlavorEmoji(name) {
  if (!name) return '📦'
  const n = name.toLowerCase()
  if (n.includes('мят') || n.includes('mint')) return '🌿'
  if (n.includes('виноград') || n.includes('grape')) return '🍇'
  if (n.includes('манго') || n.includes('mango')) return '🥭'
  if (n.includes('арбуз') || n.includes('watermelon')) return '🍉'
  if (n.includes('ягод') || n.includes('berry')) return '🫐'
  if (n.includes('лёд') || n.includes('ice') || n.includes('cool')) return '❄️'
  if (n.includes('энерг') || n.includes('energy')) return '⚡'
  return '📦'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatBirthday(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

// Discount thresholds
const DISCOUNT_LEVELS = [
  { percent: 3, amount: 24000 },
  { percent: 5, amount: 44000 },
  { percent: 10, amount: 59000 },
]

function getDiscountProgress(totalSpend) {
  if (totalSpend >= 59000) return 100
  if (totalSpend >= 44000) return 66 + (totalSpend - 44000) / (59000 - 44000) * 34
  if (totalSpend >= 24000) return 33 + (totalSpend - 24000) / (44000 - 24000) * 33
  return (totalSpend / 24000) * 33
}

export default function Profile() {
  const navigate = useNavigate()
  const client = useAuthStore((s) => s.client)

  const [ordersCount, setOrdersCount] = useState(0)
  const [totalSpend, setTotalSpend] = useState(0)
  const [favoriteProduct, setFavoriteProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTcoinsInfo, setShowTcoinsInfo] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showSupport, setShowSupport] = useState(false)

  useEffect(() => {
    if (client?.id) loadProfileData()
    else setLoading(false)
  }, [client?.id])

  async function loadProfileData() {
    setLoading(true)
    // Load orders stats
    const { data: orders } = await supabase
      .from('заказы')
      .select('итоговая_сумма, статус, товары_json')
      .eq('клиент_id', client.id)

    if (orders) {
      const completed = orders.filter((o) => o.статус === 'Выполнен')
      setOrdersCount(orders.length)
      setTotalSpend(completed.reduce((s, o) => s + (o.итоговая_сумма || 0), 0))

      // Find most ordered product
      const productCounts = {}
      for (const order of completed) {
        const items = order.товары_json || []
        for (const item of items) {
          const key = item.название || item.id
          if (key) {
            productCounts[key] = (productCounts[key] || { count: 0, item })
            productCounts[key].count += item.количество || 1
          }
        }
      }
      const topEntry = Object.entries(productCounts).sort((a, b) => b[1].count - a[1].count)[0]
      if (topEntry) {
        setFavoriteProduct({ name: topEntry[0], count: topEntry[1].count, item: topEntry[1].item })
      }
    }
    setLoading(false)
  }

  const initial = client?.имя?.charAt(0)?.toUpperCase() || 'T'
  const name = client?.имя || 'TTS Клиент'
  const uid = client?.уникальный_номер || client?.id || '0000'
  const discount = client?.постоянная_скидка || 0
  const tcoins = client?.баланс_ткоинов || 0
  const registrationDate = client?.дата_регистрации
  const birthday = client?.дата_рождения
  const actualTotalSpend = client?.сумма_всех_покупок || totalSpend
  const diceRolls = client?.бросков_кубика || 0
  const friendsInvited = client?.приглашённых_друзей || 0
  const monthActivity = client?.активность_месяц || 0

  const discountProgress = getDiscountProgress(actualTotalSpend)

  // Activity tasks
  const activities = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
      name: 'Сделай 3 покупки',
      progress: `${Math.min(ordersCount, 3)} из 3`,
      done: ordersCount >= 3,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /></svg>,
      name: 'Сыграй в кубик',
      progress: diceRolls > 0 ? 'Выполнено ✓' : 'Не выполнено',
      done: diceRolls > 0,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
      name: 'Пригласи 2 друзей',
      progress: `${Math.min(friendsInvited, 2)} из 2`,
      done: friendsInvited >= 2,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
      name: 'Отзыв о товаре',
      progress: 'Не выполнено',
      done: false,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
      name: 'Отзыв о сотруднике',
      progress: 'Не выполнено',
      done: false,
    },
  ]

  const completedActivities = activities.filter((a) => a.done).length

  const menuItems = [
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, title: 'ИСТОРИЯ ЗАКАЗОВ', desc: `${ordersCount} заказ(ов)`, path: '/orders' },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, title: 'ИЗБРАННОЕ', desc: 'Сохранённые товары', path: '/favorites' },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>, title: 'ПРИГЛАСИТЬ ДРУГА', desc: 'Получи 100 ткоинов', path: null, onClick: () => setShowInvite(true) },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, title: 'ПОДДЕРЖКА', desc: 'Ответим быстро', path: null, onClick: () => setShowSupport(true) },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, title: 'ПРАВИЛА И СКИДКИ', desc: 'Как работает система', path: null },
  ]

  if (loading) {
    return (
      <AppShell>
        <Header title="Профиль" />
        <div className="px-4 py-4 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="skeleton w-[70px] h-[70px] rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-28" />
              </div>
            </div>
            <div className="flex gap-4 pt-4 border-t border-[var(--border-gold)]">
              {[1,2,3].map(i => <div key={i} className="flex-1 flex flex-col items-center gap-1.5"><div className="skeleton h-5 w-12" /><div className="skeleton h-2 w-16" /></div>)}
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3.5">
            <div className="skeleton w-[50px] h-[50px] rounded-full" />
            <div className="flex-1 space-y-1.5"><div className="skeleton h-6 w-16" /><div className="skeleton h-3 w-28" /></div>
          </div>
          <div className="card p-4 space-y-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-2 w-full rounded-full" />
            <div className="flex justify-between">{[1,2,3].map(i => <div key={i} className="skeleton h-4 w-12" />)}</div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Профиль" rightActions={
        <button onClick={() => navigate('/settings')} className="press-effect p-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      } />

      <div className="animate-fadeIn">
        {/* Profile Card */}
        <div className="mx-4 mt-4 mb-4 p-5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[16px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none" />

          {/* Discount badge */}
          <div className="absolute top-4 right-4 px-3.5 py-2 bg-gradient-to-br from-[var(--green)] to-[#22c55e] rounded-[20px] text-[14px] font-extrabold text-[var(--bg-dark)]">
            {discount}%
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-[70px] h-[70px] rounded-full gold-gradient-bg flex items-center justify-center text-[28px] font-black text-[var(--bg-dark)] border-[3px] border-[var(--gold)] shadow-lg shadow-[rgba(212,175,55,0.3)]">
              {initial}
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-[var(--gold-light)] tracking-wider">{name.toUpperCase()}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">#{uid}</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-1">С нами с {formatDate(registrationDate)}</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-[var(--border-gold)]">
            <div className="flex-1 text-center">
              <p className="text-[16px] font-extrabold text-[var(--gold-light)]">{formatBirthday(birthday)}</p>
              <p className="text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5">ДЕНЬ РОЖДЕНИЯ</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[16px] font-extrabold text-[var(--gold-light)]">{ordersCount}</p>
              <p className="text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5">ЗАКАЗОВ</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[16px] font-extrabold text-[var(--gold-light)]">{actualTotalSpend.toLocaleString()} ₽</p>
              <p className="text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5">СУММА ВЫКУПА</p>
            </div>
          </div>
        </div>

        {/* Favorite Product - Premium Card */}
        {favoriteProduct && (
          <div className="mx-4 mb-4 p-[3px] rounded-[18px] shadow-lg shadow-[rgba(212,175,55,0.2)]" style={{ background: 'linear-gradient(145deg, var(--gold), var(--gold-dark), var(--gold-light), var(--gold))' }}>
            <div className="bg-gradient-to-br from-[rgba(20,18,15,1)] to-[rgba(12,11,9,1)] rounded-[15px] p-[18px]">
              <p className="text-[9px] text-[var(--gold)] tracking-[3px] text-center mb-3.5">★ ЛЮБИМАЯ ПОЗИЦИЯ ★</p>
              <div className="flex items-center gap-3.5">
                <div className="w-[65px] h-[65px] rounded-xl bg-gradient-to-br from-[rgba(35,32,28,1)] to-[rgba(18,16,14,1)] border border-[var(--gold)] flex items-center justify-center text-[32px] shadow-lg shadow-[rgba(0,0,0,0.4)] shrink-0">
                  {getFlavorEmoji(favoriteProduct.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-[var(--text-muted)] tracking-wider">{favoriteProduct.item?.бренд || client?.любимая_марка || ''}</p>
                  <p className="text-[13px] font-extrabold text-[var(--gold-light)] mt-0.5 truncate">{favoriteProduct.name}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">{favoriteProduct.item?.цена ? `${favoriteProduct.item.цена} ₽` : ''}</p>
                  <span className="inline-block mt-1.5 px-2.5 py-1 bg-[rgba(212,175,55,0.15)] border border-[var(--border-gold)] rounded-xl text-[10px] font-bold text-[var(--gold)]">
                    Куплено {favoriteProduct.count} раз
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tcoins Section */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[var(--gold-dark)]">★</span>
            <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">ТКОИНЫ</h3>
          </div>

          {/* Tcoins card */}
          <div className="p-4 bg-gradient-to-br from-[rgba(30,27,24,1)] to-[rgba(20,18,15,1)] border border-[var(--gold)] rounded-[14px] flex items-center gap-3.5 mb-3">
            <div className="w-[50px] h-[50px] rounded-full gold-gradient-bg flex items-center justify-center text-[24px] shadow-lg shadow-[rgba(212,175,55,0.4)] shrink-0">
              🪙
            </div>
            <div className="flex-1">
              <p className="text-[24px] font-black text-[var(--gold-light)]">{tcoins}</p>
              <p className="text-[9px] text-[var(--text-muted)] tracking-wider">ТКОИНОВ НА БАЛАНСЕ</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button className="px-3.5 py-2 bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-lg text-[9px] font-bold text-[var(--gold)] press-effect">
                ИСТОРИЯ
              </button>
              <button onClick={() => setShowTcoinsInfo(true)} className="px-3.5 py-2 bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-lg text-[9px] font-bold text-[var(--gold)] press-effect">
                КАК РАБОТАЕТ
              </button>
            </div>
          </div>

          {/* Dice card */}
          <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[20px]">
              🎲
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-[var(--gold-light)]">КУБИК УДАЧИ</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Шанс получить скидку 15% или 50%</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button disabled className="px-4 py-2.5 bg-[rgba(255,255,255,0.1)] rounded-lg text-[10px] font-bold text-[var(--text-muted)] opacity-50 cursor-not-allowed">
                БРОСИТЬ
              </button>
              <span className="text-[8px] text-[var(--text-muted)]">Скоро</span>
            </div>
          </div>
        </div>

        {/* Discount Progress */}
        <div className="mx-4 mb-4 p-4 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[11px] font-bold text-[var(--gold)] tracking-wider">ПОСТОЯННАЯ СКИДКА</p>
            <p className="text-[18px] font-black text-[var(--green)]">{discount}%</p>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[rgba(212,175,55,0.2)] rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${discountProgress}%`,
                background: 'linear-gradient(90deg, var(--gold-dark), var(--gold), var(--green))',
              }}
            />
          </div>

          {/* Levels */}
          <div className="flex justify-between">
            {DISCOUNT_LEVELS.map((level) => {
              const isActive = actualTotalSpend >= level.amount
              const isCurrent = discount === level.percent
              return (
                <div key={level.percent} className="text-center">
                  <p className={`text-[11px] font-bold ${isActive ? 'text-[var(--green)]' : isCurrent ? 'text-[var(--gold-light)]' : 'text-[var(--text-muted)]'}`}>
                    {level.percent}%
                  </p>
                  <p className="text-[8px] text-[var(--text-muted)] mt-0.5">{level.amount.toLocaleString()} ₽</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity Cards */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[var(--gold-dark)]">★</span>
            <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">АКТИВНОСТЬ ЗА МЕСЯЦ</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {activities.slice(0, 4).map((a, i) => (
              <div
                key={i}
                className={`p-3.5 bg-[var(--bg-card)] border rounded-xl flex flex-col items-center text-center transition-all ${
                  a.done ? 'border-[var(--green)] bg-[rgba(74,222,128,0.05)]' : 'border-[var(--border-gold)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-2 ${
                  a.done ? 'bg-[rgba(74,222,128,0.15)]' : 'bg-[rgba(212,175,55,0.1)]'
                }`}>
                  <div className={`w-5 h-5 ${a.done ? 'text-[var(--green)]' : 'text-[var(--gold)]'}`}>
                    {a.icon}
                  </div>
                </div>
                <p className="text-[9px] font-bold text-[var(--gold-light)] leading-tight">{a.name}</p>
                <p className={`text-[8px] mt-1 ${a.done ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`}>
                  {a.progress}
                </p>
              </div>
            ))}
          </div>

          {/* 5th activity */}
          {activities[4] && (
            <div className={`p-3.5 bg-[var(--bg-card)] border rounded-xl flex items-center gap-3 mb-3 ${
              activities[4].done ? 'border-[var(--green)] bg-[rgba(74,222,128,0.05)]' : 'border-[var(--border-gold)]'
            }`}>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                activities[4].done ? 'bg-[rgba(74,222,128,0.15)]' : 'bg-[rgba(212,175,55,0.1)]'
              }`}>
                <div className={`w-5 h-5 ${activities[4].done ? 'text-[var(--green)]' : 'text-[var(--gold)]'}`}>
                  {activities[4].icon}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-[var(--gold-light)]">{activities[4].name}</p>
                <p className={`text-[8px] mt-0.5 ${activities[4].done ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`}>
                  {activities[4].progress}
                </p>
              </div>
            </div>
          )}

          {/* Reward card */}
          <div className="relative p-4 rounded-[14px] text-center overflow-hidden border-2 border-[var(--green)] shadow-lg shadow-[rgba(74,222,128,0.15)]" style={{ background: 'linear-gradient(145deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))' }}>
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[shine_3s_infinite]" style={{ background: 'linear-gradient(45deg, transparent 40%, rgba(74,222,128,0.1) 50%, transparent 60%)' }} />
            <div className="text-[28px] mb-2">🎁</div>
            <p className="text-[10px] text-[rgba(74,222,128,0.8)] tracking-[2px] mb-1.5">ВЫПОЛНИ ВСЕ ЗАДАНИЯ</p>
            <p className="text-[14px] font-extrabold text-[var(--green)]" style={{ textShadow: '0 0 20px rgba(74,222,128,0.3)' }}>
              100% СКИДКА НА 1 ШАЙБУ!
            </p>
            <p className="text-[9px] text-[rgba(74,222,128,0.6)] mt-1.5">
              Осталось выполнить: {5 - completedActivities} из 5
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[var(--gold-dark)]">★</span>
            <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">МЕНЮ</h3>
          </div>

          <div className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => item.onClick ? item.onClick() : item.path && navigate(item.path)}
                className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl flex items-center gap-3.5 press-effect transition-all hover:border-[var(--gold)] hover:bg-[rgba(212,175,55,0.05)] w-full text-left"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 text-[var(--gold)]">{item.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[var(--gold-light)]">{item.title}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TCoins Info Modal */}
      {showTcoinsInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setShowTcoinsInfo(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[var(--bg-card)] border border-[var(--gold)] rounded-[18px] p-6 max-w-sm w-full animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowTcoinsInfo(false)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--gold)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-4">
              <span className="text-[28px]">🪙</span>
              <h3 className="text-[14px] font-bold text-[var(--gold)] tracking-[2px] mt-2">КАК РАБОТАЮТ ТКОИНЫ</h3>
            </div>
            <div className="space-y-4 text-[11px] text-[var(--gold-light)] leading-relaxed">
              <div className="text-center">
                <p className="text-[16px] font-black text-[var(--gold)]">1 ТКОИН = 1 РУБЛЬ</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--gold)] tracking-[1.5px] mb-1.5">НАЧИСЛЕНИЕ:</p>
                <ul className="space-y-1 text-[var(--text-muted)]">
                  <li>1.5% от суммы заказа (без доп.скидок)</li>
                  <li>0.5% от заказов друзей по вашей ссылке</li>
                  <li>Пополнение наличными в магазине</li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--gold)] tracking-[1.5px] mb-1.5">ИСПОЛЬЗОВАНИЕ:</p>
                <ul className="space-y-1 text-[var(--text-muted)]">
                  <li>Списать как скидку</li>
                  <li>Бросить кубик удачи</li>
                  <li>Участие в аукционе</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Friend Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setShowInvite(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[var(--bg-card)] border border-[var(--gold)] rounded-[18px] p-6 max-w-sm w-full animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInvite(false)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--gold)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-5">
              <span className="text-[28px]">🤝</span>
              <h3 className="text-[14px] font-bold text-[var(--gold)] tracking-[2px] mt-2">ПРИГЛАСИТЬ ДРУГА</h3>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Получите 0.5% от заказов друзей</p>
            </div>
            <div className="mb-4">
              <p className="text-[9px] text-[var(--text-muted)] tracking-wider mb-1.5">ВАША ССЫЛКА:</p>
              <div className="flex items-center gap-2 p-3 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl">
                <p className="text-[11px] text-[var(--gold-light)] flex-1 truncate select-all">tts-shop.agency/?ref={uid}</p>
                <button
                  onClick={() => { navigator.clipboard?.writeText(`https://tts-shop.agency/?ref=${uid}`); showToast('Ссылка скопирована', 'success') }}
                  className="shrink-0 px-2.5 py-1.5 bg-[rgba(212,175,55,0.15)] border border-[var(--border-gold)] rounded-lg text-[9px] font-bold text-[var(--gold)] press-effect"
                >
                  КОПИРОВАТЬ
                </button>
              </div>
            </div>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent('https://tts-shop.agency/?ref=' + uid)}&text=${encodeURIComponent('Я в TTS Shop — крутой снюс с доставкой по Мурманску 🔥 Переходи, получи бонус на первый заказ! 💰')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 bg-[#2AABEE] rounded-xl text-[11px] font-bold text-white tracking-[1px] text-center press-effect"
            >
              ПОДЕЛИТЬСЯ В TELEGRAM
            </a>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setShowSupport(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[var(--bg-card)] border border-[var(--gold)] rounded-[18px] p-6 max-w-sm w-full animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSupport(false)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--gold)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-5">
              <span className="text-[28px]">💬</span>
              <h3 className="text-[14px] font-bold text-[var(--gold)] tracking-[2px] mt-2">ПОДДЕРЖКА</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://t.me/TTS_SHOP_BOT?start=SUPPORT_quality"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl flex items-center gap-3 press-effect hover:border-[var(--gold)] transition-all"
              >
                <span className="text-[20px]">📦</span>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[var(--gold-light)]">Проблема с качеством товара</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Брак, несоответствие, повреждение</p>
                </div>
              </a>
              <a
                href="https://t.me/TTS_SHOP_BOT?start=SUPPORT_complaint"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl flex items-center gap-3 press-effect hover:border-[var(--gold)] transition-all"
              >
                <span className="text-[20px]">🔒</span>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[var(--gold-light)]">Анонимная жалоба на сотрудника</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Конфиденциально и безопасно</p>
                </div>
              </a>
              <a
                href="https://t.me/TTS_SHOP_BOT?start=SUPPORT_collab"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl flex items-center gap-3 press-effect hover:border-[var(--gold)] transition-all"
              >
                <span className="text-[20px]">🤝</span>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[var(--gold-light)]">Предложение сотрудничества</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Партнёрство и бизнес</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

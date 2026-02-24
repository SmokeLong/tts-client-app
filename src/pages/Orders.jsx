import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'

const STATUS_MAP = {
  'Новый': { label: 'НОВЫЙ', cls: 'pending' },
  'Собирается': { label: 'СОБИРАЕТСЯ', cls: 'pending' },
  'В пути': { label: 'В ПУТИ', cls: 'in-progress' },
  'Готов': { label: 'ГОТОВ', cls: 'in-progress' },
  'Выполнен': { label: 'ВЫПОЛНЕН', cls: 'completed' },
  'Отменён': { label: 'ОТМЕНЁН', cls: 'cancelled' },
  'Предзаказ': { label: 'ПРЕДЗАКАЗ', cls: 'pending' },
}

const STATUS_STYLES = {
  'completed': 'bg-[rgba(74,222,128,0.15)] text-[var(--green)]',
  'in-progress': 'bg-[rgba(96,165,250,0.15)] text-[var(--blue)]',
  'cancelled': 'bg-[rgba(248,113,113,0.15)] text-[var(--red)]',
  'pending': 'bg-[rgba(251,191,36,0.15)] text-[var(--yellow)]',
}

const FILTER_TABS = ['ВСЕ', 'АКТИВНЫЕ', 'ЗАВЕРШЁННЫЕ', 'ОТМЕНЁННЫЕ']

const POINT_NAMES = {
  2: 'ЦЕНТР',
  3: 'СЕВЕРНЫЙ',
  4: 'ЛБ',
}

const POINT_ADDRESSES = {
  2: 'Куколкина 9',
  3: 'Бульвар Победы 9',
  4: 'Ленинский пр-кт 117',
}

function getFlavorEmoji(name) {
  if (!name) return '📦'
  const n = name.toLowerCase()
  if (n.includes('мят') || n.includes('mint')) return '🌿'
  if (n.includes('виноград') || n.includes('grape')) return '🍇'
  if (n.includes('арбуз')) return '🍉'
  if (n.includes('ягод') || n.includes('berry')) return '🫐'
  if (n.includes('red') || n.includes('красн')) return '🔴'
  if (n.includes('ice') || n.includes('cool')) return '❄️'
  return '📦'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const oneDay = 86400000

  if (diff < oneDay && d.getDate() === now.getDate()) {
    return `Сегодня, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (diff < 2 * oneDay) {
    return `Вчера, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function Orders() {
  const navigate = useNavigate()
  const client = useAuthStore((s) => s.client)
  const addItem = useCartStore((s) => s.addItem)

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ВСЕ')

  useEffect(() => {
    if (client?.id) loadOrders()
  }, [client?.id])

  async function loadOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('заказы')
      .select('*')
      .eq('клиент_id', client.id)
      .neq('статус', 'Удалён')
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
  }

  async function handleDelete(orderId) {
    const res = await fetch('/api/delete-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, клиент_id: client.id }),
    })
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    }
  }

  const filteredOrders = useMemo(() => {
    if (activeTab === 'ВСЕ') return orders
    if (activeTab === 'АКТИВНЫЕ') return orders.filter((o) => ['Новый', 'Собирается', 'В пути', 'Готов', 'Предзаказ'].includes(o.статус))
    if (activeTab === 'ЗАВЕРШЁННЫЕ') return orders.filter((o) => o.статус === 'Выполнен')
    if (activeTab === 'ОТМЕНЁННЫЕ') return orders.filter((o) => o.статус === 'Отменён')
    return orders
  }, [orders, activeTab])

  // Stats
  const totalOrders = orders.length
  const totalSum = orders.filter((o) => o.статус === 'Выполнен').reduce((s, o) => s + (o.итоговая_сумма || 0), 0)
  const totalTcoins = orders.reduce((s, o) => s + (o.начислено_ткоинов || 0), 0)

  function handleRepeat(order) {
    const items = order.товары_json || []
    for (const item of items) {
      for (let i = 0; i < (item.количество || 1); i++) {
        addItem({
          id: item.id,
          name: item.название,
          priceCash: item.цена,
          priceCard: item.цена,
        })
      }
    }
    navigate('/cart')
  }

  return (
    <AppShell>
      <PageHeader title="ИСТОРИЯ ЗАКАЗОВ" />

      <div className="animate-fadeIn">
        {/* Stats Bar */}
        <div className="flex gap-2 px-4 py-3.5 border-b border-[var(--border-gold)]">
          <div className="flex-1 card p-3 text-center">
            <p className="text-[18px] font-extrabold text-[var(--gold-light)]">{totalOrders}</p>
            <p className="text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5">ВСЕГО</p>
          </div>
          <div className="flex-1 card p-3 text-center">
            <p className="text-[16px] font-extrabold text-[var(--gold-light)]">{totalSum.toLocaleString()} ₽</p>
            <p className="text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5">СУММА ВЫКУПА</p>
          </div>
          <div className="flex-1 card p-3 text-center">
            <p className="text-[18px] font-extrabold text-[var(--gold-light)]">+{totalTcoins}</p>
            <p className="text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5">ТКОИНОВ</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 py-3.5 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-bold tracking-wider press-effect transition-all ${
                activeTab === tab
                  ? 'gold-gradient-bg text-[var(--bg-dark)]'
                  : 'card text-[var(--text-muted)] hover:text-[var(--gold)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-[48px] mb-4 opacity-50">📋</div>
              <p className="text-[14px] font-bold gold-gradient-text mb-2">Заказов пока нет</p>
              <p className="text-[11px] text-[var(--text-muted)]">Ваши заказы появятся здесь</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const statusInfo = STATUS_MAP[order.статус] || { label: order.статус, cls: 'pending' }
              const statusStyle = STATUS_STYLES[statusInfo.cls]
              const items = order.товары_json || []
              const isActive = ['Новый', 'Собирается', 'В пути', 'Готов', 'Предзаказ'].includes(order.статус)
              const isCompleted = order.статус === 'Выполнен'
              const isCancelled = order.статус === 'Отменён'

              return (
                <div key={order.id} className="card overflow-hidden mb-3">
                  {/* Header */}
                  <div className="px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-gold)]">
                    <div>
                      <p className="text-[12px] font-bold text-[var(--gold-light)]">Заказ #{order.id}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold tracking-wider ${statusStyle}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 py-2 ${
                          idx < items.length - 1 ? 'border-b border-[rgba(212,175,55,0.1)]' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1816] to-[#0d0c0a] flex items-center justify-center text-[20px] shrink-0">
                          {getFlavorEmoji(item.название)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--gold-light)] truncate">{item.название}</p>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">×{item.количество || 1}</span>
                        <span className="text-[11px] font-bold text-[var(--gold)] shrink-0">
                          {((item.цена || 0) * (item.количество || 1)).toLocaleString()} ₽
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-[rgba(212,175,55,0.03)] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {POINT_NAMES[order.точка_id] || '—'} • {POINT_ADDRESSES[order.точка_id] || ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-[var(--text-muted)]">Итого</p>
                      <p className="text-[16px] font-extrabold text-[var(--gold-light)]">
                        {(order.итоговая_сумма || 0).toLocaleString()} ₽
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-3.5 flex gap-2.5">
                    {isActive && (
                      <>
                        <button className="flex-1 py-2.5 card text-[var(--gold)] text-[9px] font-bold tracking-wider press-effect text-center">
                          ОТМЕНИТЬ
                        </button>
                        <button className="flex-1 py-2.5 card text-[var(--gold)] text-[9px] font-bold tracking-wider press-effect text-center">
                          СВЯЗАТЬСЯ
                        </button>
                      </>
                    )}
                    {isCompleted && (
                      <>
                        <button className="flex-1 py-2.5 card text-[var(--gold)] text-[9px] font-bold tracking-wider press-effect text-center">
                          ОСТАВИТЬ ОТЗЫВ
                        </button>
                        <button
                          onClick={() => handleRepeat(order)}
                          className="flex-1 py-2.5 gold-gradient-bg rounded-[10px] text-[var(--bg-dark)] text-[9px] font-bold tracking-wider press-effect text-center"
                        >
                          ПОВТОРИТЬ
                        </button>
                      </>
                    )}
                    {isCancelled && (
                      <>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="flex-1 py-2.5 card text-[var(--red)] text-[9px] font-bold tracking-wider press-effect text-center"
                        >
                          УДАЛИТЬ
                        </button>
                        <button
                          onClick={() => handleRepeat(order)}
                          className="flex-1 py-2.5 gold-gradient-bg rounded-[10px] text-[var(--bg-dark)] text-[9px] font-bold tracking-wider press-effect text-center"
                        >
                          ПОВТОРИТЬ
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </AppShell>
  )
}

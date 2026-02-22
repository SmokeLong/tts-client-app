import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useFavoritesStore } from '../stores/favoritesStore'
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
  if (n.includes('red') || n.includes('красн')) return '🔴'
  return '📦'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const oneDay = 86400000
  if (diff < oneDay && d.getDate() === now.getDate()) return 'Сегодня'
  if (diff < 2 * oneDay) return 'Вчера'
  return `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}`
}

const POINTS = [
  { id: 1, name: 'ЦЕНТР' },
  { id: 2, name: 'СЕВЕРНЫЙ' },
  { id: 3, name: 'ЛБ' },
]

export default function QuickOrder() {
  const navigate = useNavigate()
  const client = useAuthStore((s) => s.client)
  const addItem = useCartStore((s) => s.addItem)
  const setPickupPoint = useCartStore((s) => s.setPickupPoint)
  const favoriteIds = useFavoritesStore((s) => s.ids)

  const [selectedPoint, setSelectedPoint] = useState(1)
  const [lastOrders, setLastOrders] = useState([])
  const [frequentProducts, setFrequentProducts] = useState([])
  const [pointStock, setPointStock] = useState({}) // { productId: quantity }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (client?.id) loadData()
  }, [client?.id])

  async function loadData() {
    setLoading(true)

    // Load last 5 orders
    const { data: orders } = await supabase
      .from('заказы')
      .select('*')
      .eq('клиент_id', client.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (orders) {
      setLastOrders(orders)

      // Build frequent products from all orders
      const productCounts = {}
      for (const order of orders) {
        const items = order.товары_json || []
        for (const item of items) {
          const key = item.название || item.id
          if (key) {
            if (!productCounts[key]) {
              productCounts[key] = { count: 0, item }
            }
            productCounts[key].count += item.количество || 1
          }
        }
      }
      const sorted = Object.entries(productCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([name, data]) => ({ name, count: data.count, ...data.item }))
      setFrequentProducts(sorted)
    }

    // Load stock for selected point
    await loadPointStock(selectedPoint)
    setLoading(false)
  }

  async function loadPointStock(pointId) {
    const { data: inventory } = await supabase
      .from('инвентарь')
      .select('товар_id, количество')
      .eq('точка_id', pointId)

    if (inventory) {
      const map = {}
      for (const inv of inventory) {
        map[inv.товар_id] = inv.количество
      }
      setPointStock(map)
    }
  }

  function handlePointSelect(pointId) {
    setSelectedPoint(pointId)
    setPickupPoint(pointId)
    loadPointStock(pointId)
  }

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

  function handleAddFrequent(product) {
    addItem({
      id: product.id,
      name: product.название || product.name,
      priceCash: product.цена || product.цена_нал,
      priceCard: product.цена || product.цена_безнал,
    })
  }

  const lastOrder = lastOrders[0]

  return (
    <AppShell>
      <Header title="Быстрый заказ" showBack />

      <div className="animate-fadeIn">
        {/* Hero */}
        <div className="py-6 text-center border-b border-[var(--border-gold)]">
          <div className="w-[70px] h-[70px] mx-auto mb-4 rounded-full gold-gradient-bg flex items-center justify-center shadow-lg shadow-[rgba(212,175,55,0.3)]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-[18px] font-extrabold text-[var(--gold-light)] tracking-wider mb-2">ЗАКАЗ В 2 КЛИКА</h1>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed px-8">
            Повтори прошлый заказ или выбери из часто заказываемых позиций
          </p>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            {/* Repeat last */}
            <div
              onClick={() => lastOrder && handleRepeat(lastOrder)}
              className={`p-4 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] text-center press-effect transition-all hover:border-[var(--gold)] ${
                lastOrder ? 'cursor-pointer' : 'opacity-50'
              }`}
            >
              <div className="w-11 h-11 mx-auto mb-2.5 rounded-xl bg-[rgba(212,175,55,0.1)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-[var(--gold-light)] mb-1">ПОВТОРИТЬ ПОСЛЕДНИЙ</p>
              <p className="text-[9px] text-[var(--text-muted)]">
                {lastOrder
                  ? `Заказ #${lastOrder.id} • ${(lastOrder.итоговая_сумма || 0).toLocaleString()} ₽`
                  : 'Нет заказов'
                }
              </p>
            </div>

            {/* From favorites */}
            <div
              onClick={() => navigate('/favorites')}
              className="p-4 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] text-center cursor-pointer press-effect transition-all hover:border-[var(--gold)]"
            >
              <div className="w-11 h-11 mx-auto mb-2.5 rounded-xl bg-[rgba(212,175,55,0.1)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-[var(--gold-light)] mb-1">ИЗ ИЗБРАННОГО</p>
              <p className="text-[9px] text-[var(--text-muted)]">{favoriteIds.length} товаров</p>
            </div>
          </div>
        </div>

        {/* Location Selection */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[var(--gold-dark)]">★</span>
            <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">СПОСОБ ПОЛУЧЕНИЯ</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {POINTS.map((point) => (
              <button
                key={point.id}
                onClick={() => handlePointSelect(point.id)}
                className={`px-4 py-2.5 rounded-full text-[10px] font-bold press-effect transition-all flex items-center gap-1.5 ${
                  selectedPoint === point.id
                    ? 'gold-gradient-bg text-[var(--bg-dark)] border border-[var(--gold)]'
                    : 'bg-[var(--bg-card)] border border-[var(--border-gold)] text-[var(--text-muted)]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedPoint === point.id ? 'bg-[var(--bg-dark)]' : 'bg-[var(--green)]'}`} />
                {point.name}
              </button>
            ))}
          </div>
        </div>

        {/* Last Orders */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[var(--gold-dark)]">★</span>
            <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">ПОСЛЕДНИЕ ЗАКАЗЫ</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lastOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-[11px] text-[var(--text-muted)]">Нет предыдущих заказов</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lastOrders.map((order) => {
                const items = order.товары_json || []
                const firstItem = items[0]
                const itemsText = items.map((i) => `${i.название} ×${i.количество || 1}`).join(', ')

                return (
                  <div
                    key={order.id}
                    className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl flex items-center gap-3 press-effect transition-all hover:border-[var(--gold)] cursor-pointer"
                  >
                    <div className="w-[50px] h-[50px] rounded-[10px] bg-gradient-to-br from-[#1a1816] to-[#0d0c0a] flex items-center justify-center text-[26px] shrink-0">
                      {firstItem ? getFlavorEmoji(firstItem.название) : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[var(--gold-light)] truncate">{itemsText || 'Заказ'}</p>
                      <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                        {formatDate(order.created_at)} • {
                          order.точка_id === 1 ? 'ЦЕНТР' :
                          order.точка_id === 2 ? 'СЕВЕРНЫЙ' :
                          order.точка_id === 3 ? 'ЛБ' : '—'
                        }
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[14px] font-extrabold text-[var(--gold)] mb-1.5">
                        {(order.итоговая_сумма || 0).toLocaleString()} ₽
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRepeat(order) }}
                        className="px-3.5 py-2 gold-gradient-bg rounded-lg text-[9px] font-bold text-[var(--bg-dark)] press-effect"
                      >
                        ПОВТОРИТЬ
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Frequent Items */}
        {frequentProducts.length > 0 && (
          <div className="px-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[var(--gold-dark)]">★</span>
              <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">ЧАСТО ЗАКАЗЫВАЕШЬ</h3>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {frequentProducts.map((product, i) => (
                <div
                  key={i}
                  className="min-w-[140px] p-3.5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl text-center shrink-0 press-effect transition-all hover:border-[var(--gold)] cursor-pointer"
                >
                  <div className="w-[50px] h-[50px] mx-auto mb-2.5 rounded-[10px] bg-gradient-to-br from-[#1a1816] to-[#0d0c0a] flex items-center justify-center text-[28px]">
                    {getFlavorEmoji(product.name || product.название)}
                  </div>
                  <p className="text-[10px] font-bold text-[var(--gold-light)] mb-1 leading-tight line-clamp-2">
                    {product.name || product.название}
                  </p>
                  <p className="text-[8px] text-[var(--text-muted)] mb-1">{product.бренд || ''}</p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div>
                      <p className="text-[12px] font-extrabold text-[var(--gold)]">
                        {(product.цена || 0).toLocaleString()} ₽
                      </p>
                      <p className="text-[8px] text-[var(--text-muted)]">{product.count} раз</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddFrequent(product) }}
                      className="w-8 h-8 rounded-lg gold-gradient-bg flex items-center justify-center press-effect"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" strokeWidth="2.5">
                        <path d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </AppShell>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { showToast } from '../stores/toastStore'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import PullToRefresh from '../components/ui/PullToRefresh'

function getFlavorEmoji(flavor) {
  if (!flavor) return '📦'
  const f = flavor.toLowerCase()
  if (f.includes('мят') || f.includes('mint')) return '🌿'
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
  if (f.includes('энерг') || f.includes('energy')) return '⚡'
  return '📦'
}

export default function Home() {
  const navigate = useNavigate()
  const client = useAuthStore((s) => s.client)
  const addItem = useCartStore((s) => s.addItem)

  const [topProducts, setTopProducts] = useState([])
  const [newProducts, setNewProducts] = useState([])
  const [topIndex, setTopIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const { data: products, error } = await supabase
        .from('товары_публичные')
        .select('*')
        .eq('активен', true)
        .limit(20)

      if (error) console.error('Home products load error:', error)

      if (products && products.length > 0) {
        const mapped = products.map(mapProduct)
        setTopProducts(mapped.slice(0, 10))
        setNewProducts(mapped.slice(10, 20).length ? mapped.slice(10, 20) : mapped.slice(0, 8))
      }
    } catch (err) {
      showToast('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  function mapProduct(raw) {
    return {
      id: raw.id,
      name: raw.название,
      brand: raw.бренд,
      lineup: raw.линейка,
      priceCash: raw.цена_нал,
      priceCard: raw.цена_безнал,
      strength: raw.крепость,
      flavor: raw.вкус,
      packets: raw.кол_во_пакетов,
      photo: raw.фото_url,
    }
  }

  const initial = client?.имя?.charAt(0)?.toUpperCase() || 'T'
  const name = client?.имя || 'TTS Клиент'
  const uid = client?.уникальный_номер || client?.id || '0000'
  const discount = client?.постоянная_скидка || 0
  const tcoins = client?.баланс_ткоинов || 0

  const quickActions = [
    { label: 'Каталог', emoji: '🏪', path: '/catalog' },
    { label: 'Заказ', emoji: '⚡', path: '/quick-order' },
    { label: 'История', emoji: '📋', path: '/orders' },
    { label: 'Избранное', emoji: '❤️', path: '/favorites' },
    { label: 'Корзина', emoji: '🛒', path: '/cart' },
  ]

  // Top demand: show one product at a time as a panel
  const currentTop = topProducts[topIndex]

  function nextTop() {
    setTopIndex((i) => (i + 1) % topProducts.length)
  }
  function prevTop() {
    setTopIndex((i) => (i - 1 + topProducts.length) % topProducts.length)
  }

  return (
    <AppShell>
      <Header showSearch showCart />

      <PullToRefresh onRefresh={loadProducts}>
      <div className="px-4 py-4 space-y-4 animate-fadeIn">
        {/* Profile Card */}
        <div
          className="card p-4 press-effect cursor-pointer"
          onClick={() => navigate('/profile')}
        >
          <div className="flex items-center gap-3">
            <div className="w-[50px] h-[50px] rounded-full gold-gradient-bg flex items-center justify-center text-[var(--bg-dark)] font-bold text-[18px] shadow-lg shadow-[rgba(212,175,55,0.3)] border-2 border-[var(--gold)]">
              {initial}
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold gold-gradient-text">{name.toUpperCase()}</p>
              <p className="text-[10px] text-[var(--text-muted)]">ID: #{uid}</p>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 rounded-full bg-[rgba(74,222,128,0.15)] text-[var(--green)] text-[12px] font-bold mb-1">
                {discount}%
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[12px]">🪙</span>
                <span className="text-[12px] font-bold text-[var(--gold-light)]">{tcoins}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-5 gap-2">
          {quickActions.map((action) => (
            <div
              key={action.label}
              onClick={() => navigate(action.path)}
              className="card p-2 flex flex-col items-center gap-1.5 press-effect cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[16px]">
                {action.emoji}
              </div>
              <span className="text-[8px] text-[var(--text-muted)] text-center leading-tight font-semibold">
                {action.label}
              </span>
            </div>
          ))}
        </div>

        {/* Top Demand Panel */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-bold tracking-[2px] uppercase gold-gradient-text">
              ТОП-СПРОС СЕГОДНЯ
            </h2>
            <span
              onClick={() => navigate('/catalog')}
              className="text-[9px] text-[var(--text-muted)] tracking-wider cursor-pointer press-effect"
            >
              СМОТРЕТЬ ВСЕ →
            </span>
          </div>

          {loading ? (
            <div className="card p-4 flex items-center gap-4 h-[140px]">
              <div className="skeleton w-[60px] h-[60px] rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-5 w-16" />
              </div>
            </div>
          ) : currentTop ? (
            <div className="card p-4 relative">
              <div className="flex items-center gap-4">
                {/* Left arrow */}
                <button onClick={prevTop} className="p-1 press-effect shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {/* Product info */}
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => navigate(`/product/${currentTop.id}`)}
                >
                  <div className="w-[60px] h-[60px] rounded-xl bg-gradient-to-br from-[#1a1816] to-[#0d0c0a] border border-[var(--border-gold)] flex items-center justify-center text-[28px] shrink-0">
                    {getFlavorEmoji(currentTop.flavor || currentTop.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] text-[var(--text-muted)] tracking-wider">
                      {currentTop.brand}{currentTop.lineup ? ` • ${currentTop.lineup}` : ''}
                    </p>
                    <p className="text-[13px] font-bold text-[var(--gold-light)] truncate mt-0.5">
                      {currentTop.name}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {currentTop.strength && (
                        <span className="text-[8px] text-[var(--text-muted)]">⚡{currentTop.strength}</span>
                      )}
                      {currentTop.packets && (
                        <span className="text-[8px] text-[var(--text-muted)]">📦{currentTop.packets}шт</span>
                      )}
                    </div>
                    <p className="text-[16px] font-extrabold text-[var(--gold)] mt-1">
                      {currentTop.priceCash} ₽
                    </p>
                  </div>
                </div>

                {/* Add to cart */}
                <button
                  onClick={(e) => { e.stopPropagation(); addItem(currentTop) }}
                  className="w-10 h-10 rounded-xl gold-gradient-bg flex items-center justify-center press-effect shadow-md shadow-[rgba(212,175,55,0.3)] shrink-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" strokeWidth="2.5">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Right arrow */}
                <button onClick={nextTop} className="p-1 press-effect shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-1.5 mt-3">
                {topProducts.slice(0, 5).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === topIndex % 5 ? 'bg-[var(--gold)] w-4' : 'bg-[var(--border-gold)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-4 flex items-center justify-center h-[100px]">
              <p className="text-[11px] text-[var(--text-muted)]">Нет товаров</p>
            </div>
          )}
        </div>

        {/* Latest Products */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-bold tracking-[2px] uppercase gold-gradient-text">
              ПОСЛЕДНИЕ НОВИНКИ
            </h2>
            <span
              onClick={() => navigate('/catalog')}
              className="text-[9px] text-[var(--text-muted)] tracking-wider cursor-pointer press-effect"
            >
              СМОТРЕТЬ ВСЕ →
            </span>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-3 min-w-[140px] flex flex-col items-center gap-2 shrink-0">
                  <div className="skeleton w-14 h-14 rounded-xl" />
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-4 w-14 mt-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {newProducts.map((product) => (
                <div
                  key={product.id}
                  className="card p-3 min-w-[140px] flex flex-col items-center gap-2 cursor-pointer press-effect shrink-0"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a1816] to-[#0d0c0a] border border-[var(--border-gold)] flex items-center justify-center text-[26px]">
                    {getFlavorEmoji(product.flavor || product.name)}
                  </div>
                  <p className="text-[9px] font-bold text-[var(--gold-light)] text-center leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-[8px] text-[var(--text-muted)]">{product.brand}</p>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="text-[12px] font-extrabold text-[var(--gold)]">{product.priceCash} ₽</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); addItem(product) }}
                      className="w-7 h-7 rounded-lg gold-gradient-bg flex items-center justify-center press-effect"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" strokeWidth="2.5">
                        <path d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate('/catalog')}
            className="w-full gold-gradient-bg text-[var(--bg-dark)] font-bold text-[12px] tracking-[2px] py-4 rounded-[14px] press-effect shadow-lg shadow-[rgba(212,175,55,0.2)]"
          >
            ВЫБРАТЬ САМОСТОЯТЕЛЬНО
          </button>
          <button className="w-full card text-[var(--gold)] font-bold text-[12px] tracking-[2px] py-4 press-effect">
            ВЫБРАТЬ С ПОМОЩЬЮ ИИ
          </button>
        </div>
      </div>
      </PullToRefresh>
    </AppShell>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import StockDots from '../components/product/StockDots'

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

export default function Favorites() {
  const navigate = useNavigate()
  const favoriteIds = useFavoritesStore((s) => s.ids)
  const toggle = useFavoritesStore((s) => s.toggle)
  const notifyEnabled = useFavoritesStore((s) => s.notifyEnabled)
  const setNotify = useFavoritesStore((s) => s.setNotify)
  const addItem = useCartStore((s) => s.addItem)
  const client = useAuthStore((s) => s.client)

  const [products, setProducts] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (favoriteIds.length > 0) {
      loadProducts()
    } else {
      setLoading(false)
    }
  }, [favoriteIds])

  async function loadProducts() {
    setLoading(true)

    const { data: rawProducts } = await supabase
      .from('товары_публичные')
      .select('*')
      .in('id', favoriteIds)
      .eq('активен', true)

    if (rawProducts) {
      setProducts(rawProducts.map(mapProduct))

      // Load stock for these products
      const { data: inventory } = await supabase
        .from('инвентарь')
        .select('*')
        .in('товар_id', favoriteIds)

      if (inventory) {
        const sm = {}
        for (const inv of inventory) {
          if (!sm[inv.товар_id]) sm[inv.товар_id] = {}
          // Map point IDs to labels
          if (inv.точка_id === 2) sm[inv.товар_id].center = inv.количество
          if (inv.точка_id === 3) sm[inv.товар_id].north = inv.количество
          if (inv.точка_id === 4) sm[inv.товар_id].lb = inv.количество
        }
        setStockMap(sm)
      }
    }

    setLoading(false)
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

  function isOutOfStock(productId) {
    const s = stockMap[productId]
    if (!s) return true
    return (s.center || 0) === 0 && (s.north || 0) === 0 && (s.lb || 0) === 0
  }

  function handleRemove(productId) {
    toggle(productId)
  }

  return (
    <AppShell>
      <PageHeader
        title="ИЗБРАННОЕ"
        showCart
        rightAction={
          <span className="text-[11px] text-[var(--text-muted)]">{favoriteIds.length} товаров</span>
        }
      />

      <div className="animate-fadeIn">
        {/* Notification Banner */}
        <div className="mx-4 mt-3 mb-4 p-3 rounded-xl flex items-center gap-3 border" style={{
          background: 'rgba(96,165,250,0.1)',
          borderColor: 'rgba(96,165,250,0.3)',
        }}>
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(96,165,250,0.15)] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-[#60a5fa]">УВЕДОМЛЕНИЯ О НАЛИЧИИ</p>
            <p className="text-[9px] text-[rgba(96,165,250,0.8)] mt-0.5">Сообщим, когда товар появится</p>
          </div>
          <div
            onClick={() => {
              const newVal = !notifyEnabled
              setNotify(newVal)
              if (client?.id && favoriteIds.length > 0) {
                fetch('/api/subscribe-stock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    клиент_id: client.id,
                    товар_ids: favoriteIds,
                    enabled: newVal,
                  }),
                }).catch(() => {})
              }
            }}
            className={`w-[44px] h-[24px] rounded-full relative cursor-pointer transition-all ${
              notifyEnabled ? 'bg-[#60a5fa]' : 'bg-[rgba(96,165,250,0.2)]'
            }`}
          >
            <div className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-all ${
              notifyEnabled ? 'left-[22px]' : 'left-[2px]'
            }`} />
          </div>
        </div>

        {loading ? (
          <div className="px-4 grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-[120px] rounded-none" />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-4 w-full" />
                  <div className="flex justify-between items-center mt-2">
                    <div className="skeleton h-4 w-14" />
                    <div className="skeleton w-9 h-9 rounded-[10px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : favoriteIds.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-20 h-20 rounded-full bg-[rgba(212,175,55,0.1)] flex items-center justify-center mb-5">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-[14px] font-bold gold-gradient-text mb-2">Добавьте товары в избранное</p>
            <p className="text-[11px] text-[var(--text-muted)] text-center mb-5">
              Нажмите на сердечко в каталоге, чтобы сохранить товар
            </p>
            <button
              onClick={() => navigate('/catalog')}
              className="px-7 py-3.5 gold-gradient-bg rounded-xl text-[11px] font-bold text-[var(--bg-dark)] press-effect"
            >
              ПЕРЕЙТИ В КАТАЛОГ
            </button>
          </div>
        ) : (
          /* Products Grid */
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[var(--text-muted)]">Найдено: {products.length} товаров</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {products.map((product, idx) => {
                const stock = stockMap[product.id] || {}
                const outOfStock = isOutOfStock(product.id)

                return (
                  <div
                    key={product.id}
                    style={{animationDelay: `${Math.min(idx * 0.06, 0.4)}s`}}
                    className={`bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] overflow-hidden relative stagger-item ${
                      outOfStock ? 'opacity-80' : ''
                    }`}
                  >
                    {/* Image */}
                    <div className="h-[120px] bg-gradient-to-b from-[#1a1816] to-[#0d0c0a] flex items-center justify-center relative">
                      <span className="text-[50px]">{getFlavorEmoji(product.flavor || product.name)}</span>

                      {/* Favorite heart */}
                      <button
                        onClick={() => handleRemove(product.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[rgba(0,0,0,0.5)] flex items-center justify-center press-effect transition-transform hover:scale-110"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--red)" stroke="var(--red)" strokeWidth="1.5">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>

                      {/* Out of stock overlay */}
                      {outOfStock && (
                        <>
                          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)]" />
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-[rgba(248,113,113,0.9)] rounded-md text-[9px] font-bold text-white z-10">
                            НЕТ В НАЛИЧИИ
                          </span>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div
                      className="p-3 cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <p className="text-[8px] text-[var(--text-muted)] tracking-wider mb-1">
                        {product.brand}{product.lineup ? ` • ${product.lineup}` : ''}
                      </p>
                      <p className="text-[11px] font-bold text-[var(--gold-light)] leading-tight mb-1.5 min-h-[28px]">
                        {product.name}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.strength && (
                          <span className="px-1.5 py-0.5 bg-[rgba(212,175,55,0.1)] rounded text-[7px] text-[var(--text-muted)]">
                            {product.strength}
                          </span>
                        )}
                        {product.packets && (
                          <span className="px-1.5 py-0.5 bg-[rgba(212,175,55,0.1)] rounded text-[7px] text-[var(--text-muted)]">
                            {product.packets} ПАКОВ
                          </span>
                        )}
                      </div>

                      {/* Stock dots */}
                      <div className="mb-2.5">
                        <StockDots stock={stock} />
                      </div>

                      {/* Price + Add */}
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-extrabold text-[var(--gold)]">
                          {product.priceCash} ₽
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!outOfStock) addItem(product)
                          }}
                          className={`w-9 h-9 rounded-[10px] flex items-center justify-center press-effect ${
                            outOfStock
                              ? 'bg-[rgba(100,100,100,0.3)] cursor-not-allowed'
                              : 'gold-gradient-bg shadow-md shadow-[rgba(212,175,55,0.3)]'
                          }`}
                          disabled={outOfStock}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={outOfStock ? 'rgba(255,255,255,0.3)' : 'var(--bg-dark)'} strokeWidth="2.5">
                            <path d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

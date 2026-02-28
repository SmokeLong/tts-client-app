import { useState, useEffect, Component } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../stores/cartStore'
import QuantitySelector from '../components/ui/QuantitySelector'

class ProductErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('Product render crash:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen leather-bg flex flex-col items-center justify-center gap-3">
          <p className="text-[36px]">💥</p>
          <p className="text-[12px] text-[var(--text-muted)]">Ошибка отображения товара</p>
          <p className="text-[10px] text-[var(--red)] max-w-[250px] text-center">
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          <button onClick={() => window.history.back()} className="text-[11px] text-[var(--gold)] mt-2">
            ← Назад
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function mapProduct(raw) {
  return {
    id: raw.id,
    name: raw.название ?? '',
    brand: raw.бренд ?? '',
    lineup: raw.линейка ?? '',
    category: raw.категория ?? '',
    priceCash: raw.цена_нал ?? 0,
    priceCard: raw.цена_безнал ?? 0,
    strength: raw.крепость != null ? String(raw.крепость) : '',
    flavor: raw.вкус != null ? String(raw.вкус) : '',
    format: raw.формат_пакетов != null ? String(raw.формат_пакетов) : '',
    packets: raw.кол_во_пакетов,
    photo: raw.фото_url,
    active: raw.активен,
  }
}

function getFlavorEmoji(flavor) {
  if (!flavor) return '📦'
  const f = String(flavor).toLowerCase()
  if (f.includes('мят')) return '🌿'
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
  return '📦'
}

function dotColor(qty) {
  if (qty >= 5) return 'green'
  if (qty >= 1) return 'yellow'
  return 'red'
}

function stockLabel(qty) {
  if (qty >= 5) return '5+'
  if (qty >= 1) return String(qty)
  return '0'
}

const LOCATIONS = [
  { id: 2, name: 'ЦЕНТР', address: 'У Атмосферы' },
  { id: 3, name: 'СЕВЕРНЫЙ', address: '17 квартал' },
  { id: 4, name: 'ЛБ', address: 'Вкусно И. на Димитрова' },
]

export default function ProductPage() {
  return (
    <ProductErrorBoundary>
      <Product />
    </ProductErrorBoundary>
  )
}

function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  const [product, setProduct] = useState(null)
  const [stock, setStock] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [qty, setQty] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [id])

  async function loadProduct() {
    setLoading(true)
    setLoadError(null)
    try {
      const [prodRes, invRes] = await Promise.all([
        supabase.from('товары_публичные').select('*').eq('id', id).single(),
        supabase.from('инвентарь').select('*').eq('товар_id', id),
      ])

      if (prodRes.error) {
        console.error('Product load error:', prodRes.error)
        setLoadError(prodRes.error.message)
        setLoading(false)
        return
      }

      if (prodRes.data) setProduct(mapProduct(prodRes.data))

      if (invRes.data) {
        const s = {}
        for (const row of invRes.data) {
          s[row.точка_id] = row.количество
        }
        setStock(s)
      }
    } catch (err) {
      console.error('Product load error:', err)
      setLoadError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  function handleAddToCart() {
    if (!product) return
    for (let i = 0; i < qty; i++) {
      addItem(product)
    }
    navigate('/cart')
  }

  function handlePreorder() {
    if (!product) return
    for (let i = 0; i < qty; i++) {
      addItem(product)
    }
    navigate('/cart')
  }

  if (loading) {
    return (
      <div className="min-h-screen leather-bg">
        <div className="max-w-app mx-auto">
          <div className="h-14 border-b border-[var(--border-gold)]" />
          <div className="skeleton h-[280px] rounded-none" />
          <div className="px-5 py-6 space-y-3">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="card p-3.5 flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-[10px]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-2 w-12" />
                    <div className="skeleton h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen leather-bg flex flex-col items-center justify-center gap-3">
        <p className="text-[36px]">⚠️</p>
        <p className="text-[12px] text-[var(--text-muted)]">Ошибка загрузки товара</p>
        <p className="text-[10px] text-[var(--red)] max-w-[250px] text-center">{loadError}</p>
        <button onClick={() => navigate(-1)} className="text-[11px] text-[var(--gold)] mt-2">← Назад</button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen leather-bg flex flex-col items-center justify-center gap-3">
        <p className="text-[36px]">😕</p>
        <p className="text-[12px] text-[var(--text-muted)]">Товар не найден</p>
        <button onClick={() => navigate(-1)} className="text-[11px] text-[var(--gold)] mt-2">← Назад</button>
      </div>
    )
  }

  const emoji = getFlavorEmoji(product.flavor)
  const cartCount = cartItems.reduce((sum, i) => sum + (i.qty || 0), 0)

  const specs = [
    { icon: '⚡', label: 'КРЕПОСТЬ', value: product.strength || '—' },
    { icon: '📦', label: 'ПАКЕТИКОВ', value: product.packets ? `${product.packets} ШТ` : '—' },
    { icon: '💨', label: 'ТИП ЭФФЕКТА', value: product.category || '—' },
    { icon: '🎯', label: 'ФОРМАТ', value: product.format || '—' },
    { icon: '🧪', label: 'ТИП ПРОДУКТА', value: product.category || '—' },
    { icon: '🍃', label: 'АРОМКА', value: product.flavor || '—' },
  ]

  // Effect bars (hardcoded for now as we don't have this data)
  const effects = [
    { label: 'КРЕПОСТЬ', value: getStrengthLevel(product.strength) },
    { label: 'СИЛА ЖЖЕНИЯ', value: Math.max(3, getStrengthLevel(product.strength) - 1) },
    { label: 'НАСЫЩЕННОСТЬ АРОМКИ', value: 7 },
    { label: 'ОБЩАЯ ОЦЕНКА КАЧЕСТВА', value: 8 },
  ]

  return (
    <div className="min-h-screen leather-bg">
      <div className="max-w-app mx-auto min-h-screen relative pb-[180px]">
        {/* Header */}
        <header className="sticky top-0 z-50 px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-gold)] bg-[rgba(10,9,8,0.95)] backdrop-blur-lg">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 press-effect">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[12px] text-[var(--text-muted)] tracking-wider">{product.lineup || product.brand}</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`w-10 h-10 card flex items-center justify-center press-effect ${isFavorite ? 'bg-[rgba(212,175,55,0.2)] border-[var(--gold)]' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill={isFavorite ? 'var(--gold)' : 'none'}
                stroke={isFavorite ? 'var(--gold)' : 'var(--gold)'}
                strokeWidth="1.5"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="w-10 h-10 card flex items-center justify-center press-effect relative"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full gold-gradient-bg text-[var(--bg-dark)] text-[10px] font-extrabold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        <div className="relative py-8 flex items-center justify-center min-h-[280px] bg-gradient-to-b from-[rgba(25,22,20,0.9)] to-[rgba(10,9,8,0.95)] animate-scaleIn">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none" />
          {product.badge && (
            <div className="absolute top-5 left-5 flex flex-col gap-2">
              <span className="px-3.5 py-2 gold-gradient-bg rounded-full text-[10px] font-bold text-[var(--bg-dark)] tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.3)]">
                {product.badge}
              </span>
            </div>
          )}
{product.photo ? (
            <img src={product.photo} alt={product.name} className="w-[220px] h-[220px] object-contain relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
          ) : (
            <div className="text-[120px] relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {emoji}
            </div>
          )}            {emoji}
          </div>
        </div>

        {/* Product Info */}
        <div className="px-5 py-6 animate-fadeInUp">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-[var(--text-muted)] tracking-[2px]">{product.brand}</span>
            {product.lineup && (
              <span className="text-[11px] text-[var(--gold)] tracking-wider px-2.5 py-1 bg-[rgba(212,175,55,0.1)] rounded-xl">
                {product.lineup}
              </span>
            )}
          </div>
          <h1 className="text-[26px] font-black tracking-[2px] leading-tight mb-4 gold-gradient-text">
            {product.name}
          </h1>
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mb-5">
            {product.flavor ? `${product.flavor}. ` : ''}
            {product.strength ? `Крепость: ${product.strength}. ` : ''}
            {product.format ? `Формат: ${product.format}.` : ''}
          </p>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {specs.map((spec) => (
              <div key={spec.label} className="card p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[18px] shrink-0">
                  {spec.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-[var(--text-muted)] tracking-wider mb-0.5">{spec.label}</p>
                  <p className="text-[12px] font-bold text-[var(--gold-light)] truncate">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-5" />

        {/* Stock by Location */}
        <div className="px-5 py-5">
          <h3 className="text-[12px] font-bold text-[var(--gold)] tracking-[2px] mb-3.5 flex items-center gap-2">
            <span className="text-[10px]">★</span> НАЛИЧИЕ НА ТОЧКАХ
          </h3>
          <div className="flex flex-col gap-2.5">
            {LOCATIONS.map((loc) => {
              const qty_val = stock[loc.id] ?? 0
              const color = dotColor(qty_val)
              return (
                <div key={loc.id} className="card p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full bg-[var(--${color})]`}
                      style={{ boxShadow: `0 0 10px var(--${color})` }}
                    />
                    <div>
                      <p className="text-[12px] font-bold text-[var(--gold-light)] mb-0.5">{loc.name}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">{loc.address}</p>
                    </div>
                  </div>
                  <span className={`text-[14px] font-extrabold text-[var(--${color})]`}>
                    {stockLabel(qty_val)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-5" />

        {/* Effect Bars */}
        <div className="px-5 py-5">
          <h3 className="text-[12px] font-bold text-[var(--gold)] tracking-[2px] mb-3.5 flex items-center gap-2">
            <span className="text-[10px]">★</span> ХАРАКТЕРИСТИКИ
          </h3>
          <div className="flex flex-col gap-3.5">
            {effects.map((eff) => (
              <div key={eff.label} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)] tracking-wider">{eff.label}</span>
                  <span className="text-[10px] font-bold text-[var(--gold)]">{eff.value}/10</span>
                </div>
                <div className="h-1.5 bg-[rgba(212,175,55,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] transition-all duration-500"
                    style={{ width: `${eff.value * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-5" />

        {/* Reviews placeholder */}
        <div className="px-5 py-5">
          <div className="flex justify-between items-center mb-3.5">
            <h3 className="text-[12px] font-bold text-[var(--gold)] tracking-[2px] flex items-center gap-2">
              <span className="text-[10px]">★</span> ОТЗЫВЫ
            </h3>
            <span className="text-[11px] text-[var(--gold)] tracking-wider cursor-pointer">СМОТРЕТЬ ВСЕ →</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} width="16" height="16" viewBox="0 0 24 24"
                  fill={star <= 4 ? 'var(--gold)' : 'var(--border-gold)'}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">4.0 · 0 отзывов</span>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-[linear-gradient(180deg,rgba(10,9,8,0.98),rgba(5,4,3,1))] border-t border-[var(--border-gold)] z-50 backdrop-blur-xl">
          <div className="px-5 pt-4 pb-7">
            {/* Price row */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[28px] font-black text-[var(--gold-light)]">
                  {product.priceCash} <span className="text-[16px] text-[var(--gold)]">₽</span>
                </span>
                {product.priceCard > product.priceCash && (
                  <span className="text-[16px] text-[var(--text-muted)] line-through">
                    {product.priceCard}₽
                  </span>
                )}
              </div>
              <QuantitySelector value={qty} onChange={setQty} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePreorder}
                className="flex-1 py-4 card text-[var(--gold)] font-bold text-[11px] tracking-wider press-effect"
              >
                ПРЕДЗАКАЗ НА ТОЧКУ
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-[2] py-4 gold-gradient-bg rounded-[14px] text-[var(--bg-dark)] font-bold text-[12px] tracking-wider press-effect shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
              >
                ОФОРМИТЬ ЗАКАЗ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStrengthLevel(strength) {
  if (!strength && strength !== 0) return 5
  const s = String(strength).toLowerCase()
  if (s.includes('очень крепк')) return 10
  if (s.includes('крепк')) return 8
  if (s.includes('средне-крепк')) return 7
  if (s.includes('средн')) return 5
  if (s.includes('средне-лёг') || s.includes('средне-лег')) return 4
  if (s.includes('лёг') || s.includes('лег')) return 3
  if (s.includes('очень лёг') || s.includes('очень лег')) return 1
  return 5
}

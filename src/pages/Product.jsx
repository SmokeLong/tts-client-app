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
    strength: raw.крепость != null ? Number(raw.крепость) : null,
    strengthCategory: raw.категория_крепости ?? '',
    flavor: raw.вкус != null ? String(raw.вкус) : '',
    format: raw.формат_пакетов != null ? String(raw.формат_пакетов) : '',
    packets: raw.количество_пакетов ?? null,
    weight: raw.вес_нетто ?? null,
    photo: raw.фото_url,
    active: raw.активен,
    effectType: raw.тип_эффекта ?? '',
    aromaType: raw.тип_аромки ?? '',
    aromaSaturation: raw.насыщенность_аромки ?? null,
    moisture: raw.влажность ?? '',
    fluidity: raw.текучесть ?? '',
    burnStrength: raw.сила_жжения != null ? Number(raw.сила_жжения) : null,
    overallRating: raw.общая_оценка != null ? Number(raw.общая_оценка) : null,
    description: raw.описание ?? '',
    flavorDescription: raw.описание_вкуса ?? '',
    tcoins: raw.ткоины_за_покупку ?? 0,
    popularity: raw.популярность ?? 0,
    isNew: raw.новинка ?? false,
    productCode: raw.код_товара ?? '',
    analogCodes: raw.аналоги_коды ?? '',
    flavorOrder: raw.порядок_вкуса ?? 0,
    lineupOrder: raw.порядок_линейки ?? 0,
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

function strengthToBar(mg) {
  if (!mg || mg <= 0) return 0
  if (mg <= 30) return 3
  if (mg <= 50) return 4
  if (mg <= 65) return 5
  if (mg <= 75) return 6
  if (mg <= 100) return 7
  if (mg <= 120) return 8
  if (mg <= 150) return 9
  return 10
}

function aromaSaturationToBar(val) {
  if (!val) return null
  const s = String(val).toLowerCase()
  if (s.includes('приторн')) return 9
  if (s.includes('сладк')) return 7
  if (s.includes('освежающ')) return 6
  if (s.includes('терпк')) return 5
  const n = Number(val)
  if (!isNaN(n) && n > 0) return Math.min(Math.round(n), 10)
  return null
}

function getDiscountTiers(brand, priceCash) {
  const b = (brand || '').toUpperCase()
  const isSibOdens = b.includes('SIBERIA') || b.includes('ODENS')

  if (isSibOdens) {
    return [
      { from: 7, discount: 50, gift: null },
      { from: 10, discount: 70, gift: null },
    ]
  }
  return [
    { from: 2, discount: 30, gift: null },
    { from: 5, discount: 50, gift: null },
    { from: 7, discount: 80, gift: '8 шт' },
    { from: 10, discount: 90, gift: '11 шт' },
  ]
}

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
  const [locations, setLocations] = useState([])
  const [recommendations, setRecommendations] = useState([])
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
      const [prodRes, invRes, locRes, recRes] = await Promise.all([
        supabase.from('товары_публичные').select('*').eq('id', id).single(),
        supabase.from('инвентарь').select('*').eq('товар_id', id),
        supabase.from('точки').select('*').eq('активна', true).eq('тип', 'Магазин').order('порядок'),
        supabase.from('рекомендации').select('рекомендация_id').eq('товар_id', id),
      ])

      if (prodRes.error) {
        setLoadError(prodRes.error.message)
        setLoading(false)
        return
      }

      if (prodRes.data) setProduct(mapProduct(prodRes.data))

      if (invRes.data) {
        const s = {}
        for (const row of invRes.data) s[row.точка_id] = row.количество
        setStock(s)
      }

      // Filter locations: only Магазин type
      if (locRes.data) {
        setLocations(locRes.data.filter(l => l.тип === 'Магазин'))
      }

      // Load recommended products
      if (recRes.data && recRes.data.length > 0) {
        const recIds = recRes.data.map(r => r.рекомендация_id)
        const { data: recProducts } = await supabase
          .from('товары_публичные')
          .select('*')
          .in('id', recIds)
          .eq('активен', true)
        if (recProducts) setRecommendations(recProducts.map(mapProduct))
      }
    } catch (err) {
      setLoadError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  function handleAddToCart() {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
    navigate('/cart')
  }

  function handlePreorder() {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
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
    { icon: '⚡', label: 'КРЕПОСТЬ', value: product.strength ? `${product.strength} MG` : '—' },
    { icon: '📦', label: 'ПАКЕТИКОВ', value: product.packets ? `${product.packets} шт` : '—' },
    { icon: '🎯', label: 'ФОРМАТ', value: product.format || '—' },
    { icon: '🔥', label: 'КАТЕГОРИЯ', value: product.strengthCategory || '—' },
    { icon: '💨', label: 'ТИП ЭФФЕКТА', value: product.effectType || '—' },
    { icon: '🍃', label: 'ТИП АРОМКИ', value: product.aromaType || '—' },
    { icon: '💧', label: 'ВЛАЖНОСТЬ', value: product.moisture || '—' },
    { icon: '🌊', label: 'ТЕКУЧЕСТЬ', value: product.fluidity || '—' },
  ]

  const bars = [
    { label: 'КРЕПОСТЬ', value: product.strength ? strengthToBar(product.strength) : null },
    { label: 'СИЛА ЖЖЕНИЯ', value: product.burnStrength ? Math.min(Math.round(Number(product.burnStrength)), 10) : null },
    { label: 'СИЛА ЭФФЕКТА', value: product.strength ? strengthToBar(product.strength) : null },
    { label: 'НАСЫЩЕННОСТЬ АРОМКИ', value: aromaSaturationToBar(product.aromaSaturation) },
    { label: 'ОБЩАЯ ОЦЕНКА', value: product.overallRating ? Math.min(Math.round(Number(product.overallRating)), 10) : null },
  ]

  const tcoinsCalc = Math.ceil(product.priceCash * 0.015)
  const discountTiers = getDiscountTiers(product.brand, product.priceCash)

  const descText = product.flavorDescription || product.description || ''

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
                stroke="var(--gold)" strokeWidth="1.5"
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
        <div className="relative py-8 flex items-center justify-center min-h-[280px] bg-gradient-to-b from-[rgba(25,22,20,0.9)] to-[rgba(10,9,8,0.95)]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none" />
          {product.photo ? (
            <img src={product.photo} alt={product.name} className="w-[220px] h-[220px] object-contain relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
          ) : (
            <div className="text-[120px] relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {emoji}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-[var(--text-muted)] tracking-[2px]">{product.brand}</span>
            {product.lineup && (
              <span className="text-[11px] text-[var(--gold)] tracking-wider px-2.5 py-1 bg-[rgba(212,175,55,0.1)] rounded-xl">
                {product.lineup}
              </span>
            )}
          </div>
          <h1 className="text-[24px] font-black tracking-[1px] leading-tight mb-3 gold-gradient-text">
            {product.name}
          </h1>

          {/* Price block */}
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[22px] font-black text-[var(--gold-light)]">
              {product.priceCash} ₽
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">нал</span>
            {product.priceCard !== product.priceCash && (
              <>
                <span className="text-[16px] font-bold text-[var(--text-muted)]">
                  {product.priceCard} ₽
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">безнал</span>
              </>
            )}
          </div>

          {/* Tcoins */}
          {tcoinsCalc > 0 && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[rgba(212,175,55,0.08)] rounded-xl border border-[rgba(212,175,55,0.15)]">
              <span className="text-[14px]">🪙</span>
              <span className="text-[11px] text-[var(--gold)]">Получите <strong>{tcoinsCalc} ткоинов</strong> за покупку</span>
            </div>
          )}

          {/* Description */}
          {descText && (
            <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mb-5">{descText}</p>
          )}

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-2">
            {specs.map((spec) => (
              <div key={spec.label} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[16px] shrink-0">
                  {spec.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] text-[var(--text-muted)] tracking-wider mb-0.5">{spec.label}</p>
                  <p className="text-[11px] font-bold text-[var(--gold-light)] truncate">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* Characteristics bars */}
        <div className="px-5 py-5">
          <SectionTitle>ХАРАКТЕРИСТИКИ</SectionTitle>
          <div className="flex flex-col gap-3.5">
            {bars.map((bar) => (
              <div key={bar.label} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)] tracking-wider">{bar.label}</span>
                  <span className="text-[10px] font-bold text-[var(--gold)]">{bar.value != null ? `${bar.value}/10` : '—'}</span>
                </div>
                {bar.value != null ? (
                  <div className="h-1.5 bg-[rgba(212,175,55,0.1)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] transition-all duration-500"
                      style={{ width: `${bar.value * 10}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-1.5 bg-[rgba(212,175,55,0.05)] rounded-full" />
                )}
              </div>
            ))}
          </div>
          {/* Text characteristics */}
          {(product.effectType || product.fluidity || product.aromaSaturation || product.strengthCategory) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {product.effectType && <Tag label="Эффект" value={product.effectType} />}
              {product.fluidity && <Tag label="Текучесть" value={product.fluidity} />}
              {product.aromaSaturation && <Tag label="Аромка" value={String(product.aromaSaturation)} />}
              {product.strengthCategory && <Tag label="Категория" value={product.strengthCategory} />}
            </div>
          )}
        </div>

        <Divider />

        {/* Volume discounts */}
        <div className="px-5 py-5">
          <SectionTitle>СКИДКИ ЗА ОБЪЁМ</SectionTitle>
          <div className="flex flex-col gap-2">
            {discountTiers.map((tier, i) => {
              const finalPrice = product.priceCash - tier.discount
              const total = finalPrice * tier.from
              return (
                <div key={i} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--gold-light)]">от {tier.from} шт</p>
                    {tier.gift && (
                      <p className="text-[9px] text-[var(--green)] mt-0.5">+ подарок ({tier.gift})</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-extrabold text-[var(--gold)]">{finalPrice} ₽/шт</p>
                    <p className="text-[9px] text-[var(--text-muted)]">−{tier.discount} ₽ · итого {total} ₽</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <Divider />

        {/* Stock by Location */}
        <div className="px-5 py-5">
          <SectionTitle>НАЛИЧИЕ</SectionTitle>
          <div className="flex flex-col gap-2">
            {locations.map((loc) => {
              const qty_val = stock[loc.id] ?? 0
              const color = dotColor(qty_val)
              const isDelivery = loc.название === 'ДОСТАВКА'
              return (
                <div key={loc.id} className="card p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: `var(--${color})`, boxShadow: `0 0 10px var(--${color})` }}
                    />
                    <div>
                      <p className="text-[12px] font-bold text-[var(--gold-light)] mb-0.5 flex items-center gap-1.5">
                        {isDelivery && <span className="text-[11px]">🚗</span>}
                        {loc.название}
                      </p>
                      {loc.адрес && <p className="text-[9px] text-[var(--text-muted)]">{loc.адрес}</p>}
                    </div>
                  </div>
                  <span className="text-[14px] font-extrabold" style={{ color: `var(--${color})` }}>
                    {isDelivery ? (qty_val > 0 ? 'Есть' : '—') : stockLabel(qty_val)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <Divider />

        {/* Reviews placeholder */}
        <div className="px-5 py-5">
          <div className="flex justify-between items-center mb-3.5">
            <SectionTitle noMargin>ОТЗЫВЫ</SectionTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} width="16" height="16" viewBox="0 0 24 24"
                  fill={star <= Math.round(product.overallRating || 0) ? 'var(--gold)' : 'var(--border-gold)'}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{product.overallRating ? `${product.overallRating}.0` : '—'} · 0 отзывов</span>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <>
            <Divider />
            <div className="px-5 py-5">
              <SectionTitle>С ЭТИМ БЕРУТ</SectionTitle>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="card min-w-[140px] max-w-[140px] overflow-hidden cursor-pointer shrink-0 press-effect"
                    onClick={() => navigate(`/product/${rec.id}`)}
                  >
                    <div className="h-[100px] bg-gradient-to-b from-[rgba(26,24,22,1)] to-[rgba(13,12,10,1)] flex items-center justify-center">
                      {rec.photo ? (
                        <img src={rec.photo} alt={rec.name} className="w-full h-full object-contain p-2" loading="lazy" />
                      ) : (
                        <span className="text-[28px]">{getFlavorEmoji(rec.flavor)}</span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[8px] text-[var(--text-muted)] tracking-wider mb-0.5">{rec.brand}</p>
                      <p className="text-[10px] font-bold text-[var(--gold-light)] leading-tight mb-1.5 line-clamp-2">{rec.name}</p>
                      <p className="text-[12px] font-extrabold text-[var(--gold)]">{rec.priceCash} ₽</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-[linear-gradient(180deg,rgba(10,9,8,0.98),rgba(5,4,3,1))] border-t border-[var(--border-gold)] z-50 backdrop-blur-xl">
          <div className="px-5 pt-4 pb-7">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-black text-[var(--gold-light)]">
                  {product.priceCash} ₽
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">нал</span>
                <span className="text-[11px] text-[var(--text-muted)] mx-0.5">·</span>
                <span className="text-[16px] font-bold text-[var(--text-muted)]">
                  {product.priceCard} ₽
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">безнал</span>
              </div>
              <QuantitySelector value={qty} onChange={setQty} />
            </div>
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

function SectionTitle({ children, noMargin }) {
  return (
    <h3 className={`text-[12px] font-bold text-[var(--gold)] tracking-[2px] flex items-center gap-2 ${noMargin ? '' : 'mb-3.5'}`}>
      <span className="text-[10px]">★</span> {children}
    </h3>
  )
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent mx-5" />
}

function Tag({ label, value }) {
  return (
    <div className="px-3 py-1.5 bg-[rgba(212,175,55,0.08)] rounded-lg border border-[rgba(212,175,55,0.12)]">
      <span className="text-[8px] text-[var(--text-muted)] tracking-wider">{label}: </span>
      <span className="text-[10px] font-bold text-[var(--gold-light)]">{value}</span>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import ProductCardSmall from '../components/product/ProductCardSmall'

function mapProduct(raw) {
  return {
    id: raw.id,
    name: raw.название,
    brand: raw.бренд,
    lineup: raw.линейка,
    category: raw.категория,
    priceCash: raw.цена_нал,
    priceCard: raw.цена_безнал,
    strength: raw.крепость,
    strengthCategory: raw.категория_крепости,
    flavor: raw.вкус,
    format: raw.формат_пакетов,
    packets: raw.количество_пакетов,
    netWeight: raw.вес_нетто,
    photo: raw.фото_url,
    active: raw.активен,
    type: raw.тип,
    description: raw.описание,
    flavorDescription: raw.описание_вкуса,
    effectType: raw.тип_эффекта,
    aromaType: raw.тип_аромки,
    aromaSaturation: raw.насыщенность_аромки,
    moisture: raw.влажность,
    flow: raw.текучесть,
    burning: raw.сила_жжения,
    rating: raw.общая_оценка,
    tcoins: raw.ткоины_за_покупку,
    popularity: raw.популярность,
    isNew: raw.новинка,
    newPosition: raw.позиция_новинки,
    productCode: raw.код_товара,
    analogCodes: raw.аналоги_коды,
    flavorOrder: raw.порядок_вкуса,
    lineupOrder: raw.порядок_линейки,
  }
}

function getBrandEmoji(brandName) {
  const b = (brandName || '').toLowerCase()
  if (b.includes('siberia')) return '❄️'
  if (b.includes('lyft') || b.includes('velo')) return '🍃'
  if (b.includes('iceberg')) return '🧊'
  if (b.includes('kurwa')) return '🔥'
  if (b.includes('fedrs')) return '🌿'
  if (b.includes('zyn')) return '💚'
  if (b.includes('white fox')) return '🦊'
  if (b.includes('thunder')) return '⚡'
  if (b.includes('pablo')) return '💀'
  if (b.includes('grant')) return '👑'
  return '📦'
}

function getLineupEmoji(lineupName) {
  const l = (lineupName || '').toLowerCase()
  if (l.includes('ice') || l.includes('cool') || l.includes('frost')) return '❄️'
  if (l.includes('mint') || l.includes('мят')) return '🌿'
  if (l.includes('berry') || l.includes('ягод')) return '🫐'
  if (l.includes('fruit') || l.includes('фрукт')) return '🍊'
  if (l.includes('grape') || l.includes('виноград')) return '🍇'
  if (l.includes('mango') || l.includes('манго')) return '🥭'
  if (l.includes('classic') || l.includes('классик')) return '👑'
  if (l.includes('strong') || l.includes('крепк')) return '💪'
  return '📦'
}

export default function Brand() {
  const { id: brandName } = useParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const decodedBrand = decodeURIComponent(brandName)

  useEffect(() => {
    loadProducts()
  }, [brandName])

  async function loadProducts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('товары_публичные')
        .select('*')
        .eq('бренд', decodedBrand)
        .eq('активен', true)

      if (error) console.error('Brand load error:', error)
      if (data) setProducts(data.map(mapProduct))
    } catch (err) {
      console.error('Brand load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group by lineup
  const lineups = useMemo(() => {
    const map = {}
    for (const p of products) {
      const key = p.lineup || 'Без линейки'
      if (!map[key]) map[key] = { name: key, products: [] }
      map[key].products.push(p)
    }
    return Object.values(map).sort((a, b) => b.products.length - a.products.length)
  }, [products])

  // Stats
  const totalFlavors = products.length
  const priceRange = products.length > 0
    ? { min: Math.min(...products.map((p) => p.priceCash || 0)), max: Math.max(...products.map((p) => p.priceCash || 0)) }
    : { min: 0, max: 0 }

  // Popular products (top 6 by cheapest = most popular assumption)
  const popular = useMemo(() =>
    [...products].sort((a, b) => (a.priceCash || 0) - (b.priceCash || 0)).slice(0, 6),
    [products]
  )

  return (
    <AppShell>
      <PageHeader title={decodedBrand} showCart />
      <div className="px-4 py-4 animate-fadeIn">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="flex flex-col items-center py-6 mb-4">
              <div
                className="w-[120px] h-[120px] rounded-full border-2 border-[var(--gold)] flex items-center justify-center text-[56px] mb-4"
                style={{
                  background: 'linear-gradient(145deg, rgba(30,27,24,1), rgba(15,13,11,1))',
                  boxShadow: '0 0 40px rgba(212,175,55,0.2)',
                }}
              >
                {getBrandEmoji(decodedBrand)}
              </div>
              <h1 className="text-[22px] font-extrabold gold-gradient-text tracking-[3px] mb-1">
                {decodedBrand}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] text-center">
                {lineups.length} {lineups.length === 1 ? 'линейка' : 'линеек'} · {totalFlavors} вкусов
              </p>
            </div>

            <div className="gold-divider mb-4" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="card p-3 text-center">
                <p className="text-[16px] font-extrabold gold-gradient-text">{lineups.length}</p>
                <p className="text-[8px] text-[var(--text-muted)] tracking-wider">ЛИНЕЕК</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-[16px] font-extrabold gold-gradient-text">{totalFlavors}</p>
                <p className="text-[8px] text-[var(--text-muted)] tracking-wider">ВКУСОВ</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-[14px] font-extrabold gold-gradient-text">от {priceRange.min}₽</p>
                <p className="text-[8px] text-[var(--text-muted)] tracking-wider">ЦЕНА</p>
              </div>
            </div>

            {/* Lineups list */}
            <h2 className="text-[12px] font-bold tracking-[2px] text-[var(--gold)] mb-3 flex items-center gap-2">
              <span className="text-[10px]">★</span> ЛИНЕЙКИ
            </h2>
            <div className="space-y-2.5 mb-6">
              {lineups.map((lineup) => (
                <div
                  key={lineup.name}
                  onClick={() => navigate(`/lineup/${encodeURIComponent(decodedBrand + '::' + lineup.name)}`)}
                  className="card p-4 flex items-center gap-3.5 press-effect cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[20px] shrink-0">
                    {getLineupEmoji(lineup.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[var(--gold-light)] truncate">{lineup.name}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{lineup.products.length} вкусов</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" className="shrink-0 group-hover:stroke-[var(--gold)] transition-colors">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Popular products */}
            {popular.length > 0 && (
              <>
                <h2 className="text-[12px] font-bold tracking-[2px] text-[var(--gold)] mb-3 flex items-center gap-2">
                  <span className="text-[10px]">★</span> ПОПУЛЯРНОЕ
                </h2>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
                  {popular.map((p) => (
                    <ProductCardSmall key={p.id} product={p} />
                  ))}
                </div>
              </>
            )}

            {/* View all button */}
            <button
              onClick={() => navigate(`/lineup/${encodeURIComponent(decodedBrand + '::all')}`)}
              className="w-full py-4 mt-2 mb-4 card text-[var(--gold)] font-bold text-[11px] tracking-[2px] press-effect text-center"
            >
              СМОТРЕТЬ ВСЕ {totalFlavors} ТОВАРОВ →
            </button>
          </>
        )}
      </div>
    </AppShell>
  )
}

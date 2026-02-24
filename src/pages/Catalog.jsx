import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFiltersStore } from '../stores/filtersStore'
import { showToast } from '../stores/toastStore'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import ProductCard from '../components/product/ProductCard'

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
    flavor: raw.вкус,
    format: raw.формат_пакетов,
    packets: raw.кол_во_пакетов,
    photo: raw.фото_url,
    active: raw.активен,
  }
}

const CATEGORIES = [
  { label: 'ВСЕ', filter: null },
  { label: '🔥 ТОП', filter: 'top' },
  { label: '🆕 НОВИНКИ', filter: 'new' },
  { label: '💪 STRONG', filter: 'strong' },
  { label: '🍃 LIGHT', filter: 'light' },
]

export default function Catalog() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const searchQuery = useFiltersStore((s) => s.searchQuery)
  const setSearch = useFiltersStore((s) => s.setSearch)
  const filtersActive = useFiltersStore((s) => s.getActiveCount())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [prodRes, invRes] = await Promise.all([
        supabase.from('товары').select('*').eq('активен', true),
        supabase.from('инвентарь').select('*'),
      ])

      if (prodRes.error) console.error('Catalog load error:', prodRes.error)
      if (prodRes.data) setProducts(prodRes.data.map(mapProduct))

      if (invRes.data) {
        const inv = {}
        for (const row of invRes.data) {
          if (!inv[row.товар_id]) inv[row.товар_id] = {}
          inv[row.товар_id][row.точка_id] = row.количество
        }
        setInventory(inv)
      }
    } catch (err) {
      showToast('Ошибка загрузки каталога')
    } finally {
      setLoading(false)
    }
  }

  // Group by brand
  const brands = useMemo(() => {
    const map = {}
    for (const p of products) {
      if (!p.brand) continue
      if (!map[p.brand]) {
        map[p.brand] = { name: p.brand, products: [], lineups: new Set() }
      }
      map[p.brand].products.push(p)
      if (p.lineup) map[p.brand].lineups.add(p.lineup)
    }
    return Object.values(map).sort((a, b) => b.products.length - a.products.length)
  }, [products])

  // Filter products based on search & category
  const filteredProducts = useMemo(() => {
    let result = products

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.lineup?.toLowerCase().includes(q) ||
          p.flavor?.toLowerCase().includes(q)
      )
    }

    if (activeCategory === 'strong') {
      result = result.filter((p) => {
        const s = p.strength?.toLowerCase() || ''
        return s.includes('крепк') || s.includes('strong') || s.includes('очень')
      })
    } else if (activeCategory === 'light') {
      result = result.filter((p) => {
        const s = p.strength?.toLowerCase() || ''
        return s.includes('лёг') || s.includes('лег') || s.includes('light')
      })
    }

    return result
  }, [products, searchQuery, activeCategory])

  function getStock(productId) {
    const inv = inventory[productId]
    if (!inv) return null
    return { center: inv[2] ?? 0, north: inv[3] ?? 0, lb: inv[4] ?? 0 }
  }

  function getBrandEmoji(brandName) {
    const b = brandName.toLowerCase()
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

  // Show brands or search results
  const showSearch = !!searchQuery || !!activeCategory

  return (
    <AppShell>
      <Header title="КАТАЛОГ" showCart rightActions={
        <button
          onClick={() => navigate('/filters')}
          className="w-10 h-10 card flex items-center justify-center press-effect relative"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--gold)">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
          {filtersActive > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gold-gradient-bg text-[var(--bg-dark)] text-[9px] font-bold flex items-center justify-center">
              {filtersActive}
            </span>
          )}
        </button>
      } />

      <div className="px-4 py-3 animate-fadeIn">
        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" viewBox="0 0 24 24" fill="var(--gold)">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по каталогу..."
            className="w-full py-3.5 pl-12 pr-4 bg-[linear-gradient(145deg,rgba(25,25,25,0.9),rgba(15,15,15,0.95))] border border-[var(--border-gold)] rounded-xl text-[14px] text-[var(--gold)] placeholder-[rgba(212,175,55,0.4)] outline-none focus:border-[rgba(212,175,55,0.5)] focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all font-[inherit]"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-4 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(activeCategory === cat.filter ? null : cat.filter)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wider press-effect transition-all ${
                activeCategory === cat.filter
                  ? 'gold-gradient-bg text-[var(--bg-dark)] shadow-[0_4px_15px_rgba(212,175,55,0.3)]'
                  : 'bg-[linear-gradient(145deg,rgba(25,25,25,0.8),rgba(10,10,10,0.9))] border border-[var(--border-gold)] text-[rgba(212,175,55,0.7)] hover:border-[rgba(212,175,55,0.5)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {/* Brand skeletons */}
            <div className="skeleton h-5 w-24 mb-3" />
            <div className="grid grid-cols-2 gap-3.5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="card p-4 flex flex-col items-center gap-3" style={{animationDelay: `${i*0.1}s`}}>
                  <div className="skeleton w-16 h-16 rounded-full" />
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : showSearch ? (
          <>
            {/* Search/filter results - product grid */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="text-[14px] font-bold text-[rgba(212,175,55,0.6)] tracking-[2px] flex items-center gap-2.5">
                <span className="text-[10px] text-[var(--gold)]">★</span>
                ТОВАРЫ
                <span className="text-[10px] text-[var(--gold)]">★</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{filteredProducts.length} шт</span>
            </div>
            <div className="grid grid-cols-2 gap-3.5 pb-4">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} stock={getStock(p.id)} showFavorite />
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[36px] mb-3">🔍</p>
                <p className="text-[12px] text-[var(--text-muted)]">Ничего не найдено</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Brands grid */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="text-[14px] font-bold text-[rgba(212,175,55,0.6)] tracking-[2px] flex items-center gap-2.5">
                <span className="text-[10px] text-[var(--gold)]">★</span>
                БРЕНДЫ
                <span className="text-[10px] text-[var(--gold)]">★</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{brands.length} шт</span>
            </div>
            <div className="grid grid-cols-2 gap-3.5 pb-4">
              {brands.map((brand) => (
                <div
                  key={brand.name}
                  onClick={() => navigate(`/brand/${encodeURIComponent(brand.name)}`)}
                  className="card overflow-hidden relative group cursor-pointer press-effect"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-4 flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full border-2 border-[var(--border-gold)] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center text-[28px]">
                      {getBrandEmoji(brand.name)}
                    </div>
                    <p className="text-[13px] font-bold gold-gradient-text text-center leading-tight">
                      {brand.name}
                    </p>
                    <p className="text-[9px] text-[var(--text-muted)] text-center">
                      {brand.lineups.size} {brand.lineups.size === 1 ? 'линейка' : 'линеек'} · {brand.products.length} товаров
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

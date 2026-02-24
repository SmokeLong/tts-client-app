import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFiltersStore } from '../stores/filtersStore'
import PageHeader from '../components/layout/PageHeader'

const STRENGTHS = [
  { name: 'ОЧЕНЬ КРЕПКИЙ', fill: 100 },
  { name: 'КРЕПКИЙ', fill: 85 },
  { name: 'СРЕДНЕ-КРЕПКИЙ С УПОРОМ В КРЕП.', fill: 70 },
  { name: 'СРЕДНЕ-КРЕПКИЙ С УПОРОМ В СРЕД.', fill: 60 },
  { name: 'СРЕДНИЙ', fill: 50 },
  { name: 'СРЕДНЕ-ЛЕГКИЙ С УПОРОМ В СРЕД.', fill: 40 },
  { name: 'СРЕДНЕ-ЛЕГКИЙ С УПОРОМ В ЛЕГ.', fill: 30 },
  { name: 'ЛЁГКИЙ', fill: 20 },
  { name: 'ОЧЕНЬ ЛЁГКИЙ', fill: 10 },
]

const POINTS = [
  { id: 2, name: 'ЦЕНТР' },
  { id: 3, name: 'СЕВЕРНЫЙ' },
  { id: 4, name: 'ЛБ' },
]

const EFFECT_TYPES = ['РЕЗКИЙ', 'ПЛАВНЫЙ']
const POUCH_TYPES = ['КЛАССИЧЕСКИЕ', 'СЛИМ', 'МИНИ-СЛИМ']
const PACK_COUNTS = ['<20', '20', '30', '55']
const FLAVORS = [
  { label: '🌿 МЯТА', value: 'мята' },
  { label: '🍇 ФРУКТЫ', value: 'фрукты' },
  { label: '🍓 ЯГОДЫ', value: 'ягоды' },
  { label: '🍬 ЖВАЧКИ', value: 'жвачки' },
  { label: '🥤 НАПИТКИ', value: 'напитки' },
  { label: '🍰 ДЕСЕРТЫ', value: 'десерты' },
]

export default function Filters() {
  const navigate = useNavigate()
  const filters = useFiltersStore()
  const [productCount, setProductCount] = useState(0)
  const [pointStocks, setPointStocks] = useState({})

  // Local filter state (commit on apply)
  const [pointId, setPointId] = useState(filters.pointId)
  const [productType, setProductType] = useState(filters.productType)
  const [strengths, setStrengths] = useState([...filters.strengths])
  const [effectType, setEffectType] = useState(filters.effectType)
  const [pouchType, setPouchType] = useState(filters.pouchType)
  const [packCount, setPackCount] = useState(filters.packCount)
  const [flavor, setFlavor] = useState(filters.flavor)
  const [flavors, setFlavors] = useState(filters.flavor ? filters.flavor.split(',') : [])

  // Load point stock levels
  useEffect(() => {
    loadPointStocks()
  }, [])

  // Count matching products
  useEffect(() => {
    countProducts()
  }, [pointId, productType, strengths, effectType, pouchType, packCount, flavors])

  async function loadPointStocks() {
    const { data } = await supabase.from('инвентарь').select('точка_id, количество')
    if (data) {
      const totals = {}
      for (const row of data) {
        totals[row.точка_id] = (totals[row.точка_id] || 0) + row.количество
      }
      setPointStocks(totals)
    }
  }

  async function countProducts() {
    let query = supabase.from('товары').select('id', { count: 'exact', head: true }).eq('активен', true)

    if (productType) {
      query = query.eq('категория', productType)
    }
    if (strengths.length > 0) {
      query = query.in('крепость', strengths)
    }

    const { count } = await query
    setProductCount(count || 0)
  }

  function pointDotColor(pId) {
    const total = pointStocks[pId] || 0
    if (total >= 100) return 'green'
    if (total >= 20) return 'yellow'
    return 'red'
  }

  function toggleStrength(name) {
    setStrengths((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }

  function toggleFlavor(value) {
    setFlavors((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    )
  }

  function handleReset() {
    setPointId(null)
    setProductType(null)
    setStrengths([])
    setEffectType(null)
    setPouchType(null)
    setPackCount(null)
    setFlavors([])
  }

  function handleApply() {
    filters.setFilter('pointId', pointId)
    filters.setFilter('productType', productType)
    // Set strengths directly
    for (const s of filters.strengths) {
      if (!strengths.includes(s)) filters.toggleStrength(s)
    }
    for (const s of strengths) {
      if (!filters.strengths.includes(s)) filters.toggleStrength(s)
    }
    filters.setFilter('effectType', effectType)
    filters.setFilter('pouchType', pouchType)
    filters.setFilter('packCount', packCount)
    filters.setFilter('flavor', flavors.join(',') || null)
    navigate(-1)
  }

  return (
    <div className="min-h-screen leather-bg">
      <div className="max-w-app mx-auto min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-gold)] bg-[rgba(10,9,8,0.95)] backdrop-blur-lg">
          <button onClick={() => navigate(-1)} className="press-effect">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[16px] font-extrabold text-[var(--gold-light)] tracking-[2px]">ФИЛЬТРЫ</span>
          <button onClick={handleReset} className="text-[10px] text-[var(--red)] tracking-wider press-effect font-bold">
            СБРОСИТЬ
          </button>
        </header>

        <div className="pb-[100px]">
          {/* Point */}
          <FilterSection title="ТОЧКА" count={pointId ? 1 : 0}>
            <div className="flex flex-wrap gap-2">
              {POINTS.map((p) => (
                <Chip
                  key={p.id}
                  active={pointId === p.id}
                  onClick={() => setPointId(pointId === p.id ? null : p.id)}
                >
                  <span
                    className={`w-2 h-2 rounded-full bg-[var(--${pointDotColor(p.id)})]`}
                  />
                  {p.name}
                </Chip>
              ))}
            </div>
          </FilterSection>

          {/* Product Type */}
          <FilterSection title="ТИП ПРОДУКТА">
            <div className="flex flex-wrap gap-2">
              {['ТАБАЧНЫЙ', 'ЦЕЛЛЮЛОЗА'].map((type) => (
                <Chip
                  key={type}
                  active={productType === type}
                  onClick={() => setProductType(productType === type ? null : type)}
                >
                  {type}
                </Chip>
              ))}
            </div>
          </FilterSection>

          {/* Strength */}
          <FilterSection title="КРЕПОСТЬ" count={strengths.length}>
            <div className="flex flex-col gap-1.5">
              {STRENGTHS.map((s) => {
                const isActive = strengths.includes(s.name)
                return (
                  <div
                    key={s.name}
                    onClick={() => toggleStrength(s.name)}
                    className={`flex items-center gap-2.5 p-2.5 card cursor-pointer transition-all ${
                      isActive ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.1)]' : ''
                    }`}
                  >
                    <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? 'border-[var(--gold)] bg-[var(--gold)]'
                        : 'border-[var(--border-gold)]'
                    }`}>
                      {isActive && <span className="text-[12px] font-bold text-[var(--bg-dark)]">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[var(--gold-light)] tracking-wider mb-1.5">{s.name}</p>
                      <div className="h-1 bg-[rgba(212,175,55,0.2)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)]"
                          style={{ width: `${s.fill}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </FilterSection>

          {/* Effect Type */}
          <FilterSection title="ТИП ЭФФЕКТА">
            <div className="flex flex-wrap gap-2">
              {EFFECT_TYPES.map((type) => (
                <Chip
                  key={type}
                  active={effectType === type}
                  onClick={() => setEffectType(effectType === type ? null : type)}
                >
                  {type}
                </Chip>
              ))}
            </div>
          </FilterSection>

          {/* Pouch Type */}
          <FilterSection title="ПАКЕТИКИ">
            <div className="flex flex-wrap gap-2">
              {POUCH_TYPES.map((type) => (
                <Chip
                  key={type}
                  active={pouchType === type}
                  onClick={() => setPouchType(pouchType === type ? null : type)}
                >
                  {type}
                </Chip>
              ))}
            </div>
          </FilterSection>

          {/* Pack Count */}
          <FilterSection title="КОЛ-ВО ПАКОВ">
            <div className="flex flex-wrap gap-2">
              {PACK_COUNTS.map((count) => (
                <Chip
                  key={count}
                  active={packCount === count}
                  onClick={() => setPackCount(packCount === count ? null : count)}
                >
                  {count}
                </Chip>
              ))}
            </div>
          </FilterSection>

          {/* Flavor */}
          <FilterSection title="АРОМКА" count={flavors.length}>
            <div className="flex flex-wrap gap-2">
              {FLAVORS.map((f) => (
                <Chip
                  key={f.value}
                  active={flavors.includes(f.value)}
                  onClick={() => toggleFlavor(f.value)}
                >
                  {f.label}
                </Chip>
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-[linear-gradient(180deg,rgba(10,9,8,0.98),rgba(5,4,3,1))] border-t border-[var(--border-gold)] z-50 p-3 pb-6 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3.5 card text-[var(--gold)] font-bold text-[11px] tracking-wider press-effect"
          >
            СБРОСИТЬ
          </button>
          <button
            onClick={handleApply}
            className="flex-[2] py-3.5 gold-gradient-bg rounded-xl text-[var(--bg-dark)] font-bold text-[11px] tracking-wider press-effect"
          >
            ПОКАЗАТЬ <span className="font-normal opacity-80">({productCount})</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, count, children }) {
  return (
    <div className="px-4 py-4 border-b border-[var(--border-gold)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">{title}</h3>
        {count > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">выбрано: {count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[10px] font-bold tracking-wider press-effect transition-all ${
        active
          ? 'gold-gradient-bg text-[var(--bg-dark)] shadow-[0_4px_15px_rgba(212,175,55,0.3)]'
          : 'card text-[var(--text-muted)] hover:border-[var(--gold)] hover:text-[var(--gold)]'
      }`}
    >
      {children}
    </button>
  )
}

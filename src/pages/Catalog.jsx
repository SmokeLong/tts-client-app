import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'
import FilterModal from '../components/FilterModal'

function Catalog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [allProducts, setAllProducts] = useState([])
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: 'all',
    brand: [],
    strength: [],
    aroma: [],
    packets: [],
    format: [],
    point: []
  })

  const filterOptions = {
    category: [
      { value: 'all', label: 'Все' },
      { value: 'СНЮС', label: 'Снюс' },
      { value: 'ВАТКИ', label: 'Ватки' },
      { value: 'ГАЗИРОВКА', label: 'Газировка' }
    ],
    strength: [
      { value: 'ОЧЕНЬ КРЕПКИЙ', label: 'Мощное' },
      { value: 'КРЕПКИЙ', label: 'Крепкое' },
      { value: 'СРЕДНЕ-КРЕПКОЕ', label: 'Средне-крепкое' },
      { value: 'СРЕДНЕЕ', label: 'Среднее' },
      { value: 'ЛЕГКОЕ', label: 'Легкое' },
      { value: 'САМОЕ ЛЕГКОЕ', label: 'Самое легкое' }
    ],
    aroma: [
      { value: 'МЯТА', label: '🌿 Мята' },
      { value: 'ФРУКТЫ', label: '🍎 Фрукты' },
      { value: 'ЯГОДЫ', label: '🍇 Ягоды' },
      { value: 'НАПИТКИ', label: '🥤 Напитки' },
      { value: 'ДЕСЕРТЫ', label: '🍰 Десерты' }
    ],
    packets: [
      { value: '13', label: '13 пак.' },
      { value: '16', label: '16 пак.' },
      { value: '20', label: '20 пак.' },
      { value: '30', label: '30 пак.' }
    ],
    format: [
      { value: 'КЛАССИЧЕСКИЕ ШИРОКИЕ', label: 'Классические' },
      { value: 'СЛИМ', label: 'Слим' },
      { value: 'СЛИМ-МИНИ', label: 'Мини-слим' }
    ],
    point: [
      { value: 'Центр', label: 'Центр' },
      { value: 'Северный', label: 'Северный' },
      { value: 'ЛБ', label: 'ЛБ' }
    ]
  }

  // Загрузить все товары один раз
  useEffect(() => {
    loadAllProducts()
  }, [])

  // Фильтровать при изменении фильтров или поиска
  useEffect(() => {
    applyLocalFilters()
  }, [allProducts, filters, search])

  const loadAllProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('товары')
        .select('*')
        .eq('активен', true)
        .order('название')

      if (error) throw error

      setAllProducts(data || [])

      // Собираем уникальные бренды
      const uniqueBrands = [...new Set((data || []).map(p => p.бренд).filter(Boolean))].sort()
      setBrands(uniqueBrands)

      // Добавляем бренды в опции фильтров
      filterOptions.brand = uniqueBrands.map(b => ({ value: b, label: b }))
    } catch (error) {
      console.error('Ошибка загрузки каталога:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyLocalFilters = () => {
    let filtered = [...allProducts]

    // Поиск
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(p =>
        (p.название || '').toLowerCase().includes(q) ||
        (p.бренд || '').toLowerCase().includes(q) ||
        (p.вкус || '').toLowerCase().includes(q) ||
        (p.линейка || '').toLowerCase().includes(q)
      )
    }

    // Категория
    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.тип === filters.category)
    }

    // Бренд
    if (filters.brand.length > 0) {
      filtered = filtered.filter(p => filters.brand.includes(p.бренд))
    }

    // Крепость
    if (filters.strength.length > 0) {
      filtered = filtered.filter(p => filters.strength.includes(p.крепость_текст))
    }

    // Формат пакетов
    if (filters.format.length > 0) {
      filtered = filtered.filter(p => filters.format.includes(p.формат_пакетов))
    }

    // Кол-во пакетов
    if (filters.packets.length > 0) {
      filtered = filtered.filter(p => filters.packets.includes(String(p.кол_во_пакетов)))
    }

    setProducts(filtered)
  }

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters)
    localStorage.setItem('tts_filters', JSON.stringify(newFilters))
    setShowFilters(false)
  }

  const clearFilters = () => {
    const defaultFilters = {
      category: 'all',
      brand: [],
      strength: [],
      aroma: [],
      packets: [],
      format: [],
      point: []
    }
    setFilters(defaultFilters)
    setSearch('')
    localStorage.removeItem('tts_filters')
  }

  const activeFiltersCount =
    filters.brand.length +
    filters.strength.length +
    filters.aroma.length +
    filters.packets.length +
    filters.format.length +
    filters.point.length +
    (filters.category !== 'all' ? 1 : 0)

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, бренду, вкусу..."
              className="w-full bg-tts-card text-white pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 ring-tts-primary"
            />
            <svg className="w-5 h-5 text-tts-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="relative bg-tts-card px-4 rounded-xl flex items-center gap-2"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-tts-primary text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterOptions.category.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilters(prev => ({ ...prev, category: cat.value }))}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${
                filters.category === cat.value
                  ? 'bg-tts-primary text-white'
                  : 'bg-tts-card text-tts-muted'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {/* Быстрые бренды */}
          {brands.slice(0, 5).map(brand => (
            <button
              key={brand}
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  brand: prev.brand.includes(brand)
                    ? prev.brand.filter(b => b !== brand)
                    : [...prev.brand, brand]
                }))
              }}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${
                filters.brand.includes(brand)
                  ? 'bg-tts-secondary text-white'
                  : 'bg-tts-card text-tts-muted'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-tts-muted text-sm">Найдено: {products.length}</span>
          <button onClick={clearFilters} className="text-tts-danger text-sm">
            Сбросить фильтры
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-tts-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-white font-medium mb-2">Ничего не найдено</p>
          <p className="text-tts-muted text-sm">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {showFilters && (
        <FilterModal
          filters={filters}
          options={filterOptions}
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default Catalog

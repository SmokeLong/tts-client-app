import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'

function Home() {
  const navigate = useNavigate()
  const { client, cartCount } = useApp()
  const [panels, setPanels] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadHomeData()
  }, [])

  const loadHomeData = async () => {
    try {
      const { data: products, error: prodError } = await supabase
        .from('товары')
        .select('*')
        .eq('активен', true)
        .order('название')

      if (prodError) {
        console.error('Supabase error:', prodError)
        setError(prodError.message)
        throw prodError
      }

      console.log('Загружено товаров:', products?.length)
      setAllProducts(products || [])

      // Автоматические панели из товаров
      const autoPanels = []

      if (products && products.length > 0) {
        // Топ дня — случайные 10
        const shuffled = [...products].sort(() => Math.random() - 0.5)
        autoPanels.push({
          id: 'auto-top',
          название: '🔥 Топ дня',
          тип: 'top_day',
          products: shuffled.slice(0, 10)
        })

        // Новинки — последние 10
        const newest = [...products]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)
        autoPanels.push({
          id: 'auto-new',
          название: '🆕 Новинки',
          тип: 'new_arrivals',
          products: newest
        })

        // Топ бренды
        const brandCount = {}
        products.forEach(p => {
          if (p.бренд) brandCount[p.бренд] = (brandCount[p.бренд] || 0) + 1
        })
        const topBrands = Object.entries(brandCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([brand]) => brand)

        topBrands.forEach(brand => {
          autoPanels.push({
            id: 'auto-brand-' + brand,
            название: '⭐ ' + brand,
            тип: 'brand',
            products: products.filter(p => p.бренд === brand).slice(0, 10)
          })
        })
      }

      setPanels(autoPanels)
    } catch (err) {
      console.error('Ошибка загрузки:', err)
    } finally {
      setLoading(false)
    }
  }

  const PanelSection = ({ title, products, type }) => {
    if (!products || products.length === 0) return null
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3 px-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={() => navigate('/catalog?panel=' + type)}
            className="text-tts-primary text-sm"
          >
            Все →
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {products.map(product => (
            <div key={product.id} className="flex-shrink-0 w-40">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-tts-primary rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {client?.имя?.charAt(0) || client?.first_name?.charAt(0) || 'T'}
              </span>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">TTS</span>
            <span className="text-tts-muted">Shop</span>
          </div>
          <div className="flex items-center gap-2 bg-tts-card px-3 py-2 rounded-xl">
            <span className="text-tts-warning">🪙</span>
            <span className="text-white font-medium">{client?.баланс_ткоинов || 0}</span>
          </div>
        </div>
      </div>

      {/* Поиск */}
      <div className="px-4 mb-4">
        <button onClick={() => navigate('/catalog')} className="w-full bg-tts-card rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-tts-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-tts-muted">Найти товар...</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-tts-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center">
          <p className="text-tts-danger mb-2">Ошибка подключения к базе</p>
          <p className="text-tts-muted text-sm">{error}</p>
          <button onClick={() => { setError(null); setLoading(true); loadHomeData(); }}
            className="mt-4 bg-tts-primary text-white px-6 py-2 rounded-xl">
            Повторить
          </button>
        </div>
      ) : (
        <>
          {panels.map(panel => (
            <PanelSection key={panel.id} title={panel.название} products={panel.products} type={panel.тип} />
          ))}

          <div className="px-4 mb-6">
            <div className="bg-tts-card rounded-2xl p-4 text-center">
              <p className="text-tts-muted text-sm">В каталоге</p>
              <p className="text-2xl font-bold text-white">{allProducts.length}</p>
              <p className="text-tts-muted text-sm">товаров</p>
            </div>
          </div>

          <div className="px-4 mb-6 grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/catalog')} className="bg-tts-card rounded-2xl p-4 text-left">
              <div className="w-10 h-10 bg-tts-primary/20 rounded-xl flex items-center justify-center mb-3">
                <span className="text-xl">🔍</span>
              </div>
              <p className="text-white font-medium">Каталог</p>
              <p className="text-tts-muted text-sm">Весь ассортимент</p>
            </button>
            <button onClick={() => navigate('/favorites')} className="bg-tts-card rounded-2xl p-4 text-left">
              <div className="w-10 h-10 bg-tts-danger/20 rounded-xl flex items-center justify-center mb-3">
                <span className="text-xl">❤️</span>
              </div>
              <p className="text-white font-medium">Избранное</p>
              <p className="text-tts-muted text-sm">Ваши любимые</p>
            </button>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}

export default Home

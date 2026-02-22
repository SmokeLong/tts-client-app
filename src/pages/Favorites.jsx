import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../App'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'

function Favorites() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE}/tts-favorites?telegram_id=${user?.telegram_id}`)
      const data = await response.json()
      if (data.favorites) {
        setFavorites(data.favorites)
      }
    } catch (error) {
      console.log('Ошибка загрузки избранного:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tts-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tts-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Избранное</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-6xl mb-4">❤️</div>
          <p className="text-white font-medium mb-2">Избранное пусто</p>
          <p className="text-tts-muted text-sm text-center mb-6">
            Добавляйте товары в избранное,<br/>чтобы следить за наличием
          </p>
          <button onClick={() => navigate('/catalog')} className="btn-primary">
            Перейти в каталог
          </button>
        </div>
      ) : (
        <div className="px-4">
          <p className="text-tts-muted text-sm mb-4">
            Мы сообщим, когда любимый товар появится или будет на акции
          </p>
          <div className="grid grid-cols-2 gap-3">
            {favorites.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Favorites

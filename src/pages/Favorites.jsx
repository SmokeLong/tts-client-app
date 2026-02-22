import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'

function Favorites() {
  const navigate = useNavigate()
  const { favorites } = useApp()

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Избранное</h1>
        {favorites.length > 0 && <span className="text-tts-muted ml-auto">{favorites.length} шт</span>}
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-6xl mb-4">❤️</div>
          <p className="text-white font-medium mb-2">Избранное пусто</p>
          <p className="text-tts-muted text-sm text-center mb-6">Нажмите ❤️ на карточке товара</p>
          <button onClick={() => navigate('/catalog')} className="bg-tts-primary text-white px-6 py-3 rounded-xl">Перейти в каталог</button>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {favorites.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  )
}

export default Favorites

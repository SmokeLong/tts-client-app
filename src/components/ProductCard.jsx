import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function ProductCard({ product, compact = false, showDiscount = false }) {
  const navigate = useNavigate()
  const { addToCart } = useApp()

  const p = {
    id: product.id,
    name: product.название || product.name || '',
    brand: product.бренд || product.brand || '',
    photo: product.фото_url || product.photo || '',
    price_card: product.цена_безнал || product.price_card || 0,
    price_cash: product.цена_нал || product.price_cash || 0,
    strength: product.крепость || product.strength || 0,
    packets: product.кол_во_пакетов || product.packets || '',
    format: product.формат_пакетов || product.format || '',
    flavor: product.вкус || product.flavor || '',
  }

  const handleClick = () => {
    navigate('/product/' + product.id)
  }

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addToCart({
      id: p.id,
      name: p.name,
      brand: p.brand,
      photo: p.photo,
      price_card: p.price_card,
      price_cash: p.price_cash,
    })
  }

  if (compact) {
    return (
      <div onClick={handleClick} className="bg-tts-card rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform">
        <div className="aspect-square bg-tts-dark relative">
          {p.photo ? (
            <img src={p.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
          )}
        </div>
        <div className="p-2">
          <p className="text-tts-muted text-xs">{p.brand}</p>
          <p className="text-white text-sm font-medium line-clamp-1">{p.name}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-tts-success font-bold text-sm">{p.price_cash || p.price_card} ₽</p>
            {p.strength > 0 && (
              <span className="text-tts-muted text-xs">💪 {p.strength}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={handleClick} className="bg-tts-card rounded-2xl overflow-hidden cursor-pointer active:scale-98 transition-transform">
      <div className="aspect-square bg-tts-dark relative">
        {p.photo ? (
          <img src={p.photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        )}
        {p.strength > 0 && (
          <div className="absolute top-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">💪 {p.strength}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-tts-primary text-xs font-medium">{p.brand}</p>
        <p className="text-white font-medium line-clamp-2 h-10 mb-2">{p.name}</p>
        <div className="flex gap-1 mb-2">
          {p.packets && <span className="bg-tts-dark text-tts-muted text-xs px-2 py-0.5 rounded">{p.packets} пак</span>}
          {p.format && <span className="bg-tts-dark text-tts-muted text-xs px-2 py-0.5 rounded">{p.format}</span>}
          {p.flavor && <span className="bg-tts-dark text-tts-muted text-xs px-2 py-0.5 rounded">{p.flavor}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div>
            {p.price_card > 0 && p.price_card !== p.price_cash && (
              <p className="text-tts-muted text-xs line-through">{p.price_card} ₽</p>
            )}
            <p className="text-tts-success font-bold">{p.price_cash || p.price_card} ₽</p>
          </div>
          <button onClick={handleAddToCart} className="w-10 h-10 rounded-xl flex items-center justify-center bg-tts-primary text-white active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard

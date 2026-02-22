import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart, addToFavorites, removeFromFavorites, favorites } = useApp()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [analogues, setAnalogues] = useState([])
  const [inventory, setInventory] = useState([])

  const isFavorite = favorites.some(f => f.id === parseInt(id))

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      // Загрузить товар
      const { data: prod, error } = await supabase
        .from('товары')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setProduct(prod)

      // Загрузить остатки
      const { data: inv } = await supabase
        .from('инвентарь')
        .select('точка_id, количество, точки(название)')
        .eq('товар_id', id)

      setInventory(inv || [])

      // Загрузить аналоги (тот же бренд или вкус)
      if (prod) {
        const { data: similar } = await supabase
          .from('товары')
          .select('*')
          .eq('активен', true)
          .eq('бренд', prod.бренд)
          .neq('id', prod.id)
          .limit(6)

        setAnalogues(similar || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки товара:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.название,
        brand: product.бренд,
        photo: product.фото_url,
        price_card: product.цена_безнал,
        price_cash: product.цена_нал,
      }, quantity)

      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      navigate('/cart')
    }
  }

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(product.id)
    } else {
      addToFavorites(product)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tts-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tts-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-tts-dark flex flex-col items-center justify-center p-4">
        <div className="text-4xl mb-4">😕</div>
        <p className="text-white font-medium mb-4">Товар не найден</p>
        <button onClick={() => navigate(-1)} className="bg-tts-primary text-white px-6 py-2 rounded-xl">
          Назад
        </button>
      </div>
    )
  }

  const priceCash = product.цена_нал || 0
  const priceCard = product.цена_безнал || 0

  return (
    <div className="min-h-screen bg-tts-dark pb-32">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={handleToggleFavorite} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
          <svg
            className={`w-6 h-6 ${isFavorite ? 'text-tts-danger fill-current' : 'text-white'}`}
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Фото */}
      <div className="aspect-square bg-tts-card mx-4 rounded-2xl overflow-hidden mb-4">
        {product.фото_url ? (
          <img src={product.фото_url} alt={product.название} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
        )}
      </div>

      <div className="px-4">
        {/* Название и бренд */}
        <div className="mb-4">
          <p className="text-tts-primary text-sm font-medium mb-1">{product.бренд}</p>
          <h1 className="text-xl font-bold text-white">{product.название}</h1>
          {product.линейка && (
            <p className="text-tts-muted text-sm mt-1">{product.линейка}</p>
          )}
        </div>

        {/* Характеристики */}
        <div className="bg-tts-card rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            {product.крепость > 0 && (
              <div>
                <p className="text-tts-muted text-xs mb-1">Крепость</p>
                <p className="text-white font-medium">💪 {product.крепость}</p>
              </div>
            )}
            {product.крепость_текст && (
              <div>
                <p className="text-tts-muted text-xs mb-1">Уровень</p>
                <p className="text-white font-medium">{product.крепость_текст}</p>
              </div>
            )}
            {product.кол_во_пакетов > 0 && (
              <div>
                <p className="text-tts-muted text-xs mb-1">Пакетов</p>
                <p className="text-white font-medium">{product.кол_во_пакетов} шт</p>
              </div>
            )}
            {product.формат_пакетов && (
              <div>
                <p className="text-tts-muted text-xs mb-1">Формат</p>
                <p className="text-white font-medium">{product.формат_пакетов}</p>
              </div>
            )}
            {product.вкус && (
              <div>
                <p className="text-tts-muted text-xs mb-1">Вкус</p>
                <p className="text-white font-medium">{product.вкус}</p>
              </div>
            )}
            {product.тип && (
              <div>
                <p className="text-tts-muted text-xs mb-1">Тип</p>
                <p className="text-white font-medium">{product.тип}</p>
              </div>
            )}
          </div>
        </div>

        {/* Наличие на точках */}
        {inventory.length > 0 && (
          <div className="bg-tts-card rounded-2xl p-4 mb-4">
            <p className="text-tts-muted text-sm mb-3">Наличие на точках:</p>
            <div className="flex flex-wrap gap-2">
              {inventory.map((inv, i) => (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    inv.количество > 0
                      ? 'bg-tts-success/20 text-tts-success'
                      : 'bg-tts-danger/20 text-tts-danger'
                  }`}
                >
                  {inv.точки?.название || 'Точка'}: {inv.количество > 0 ? inv.количество + ' шт' : 'нет'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Цены */}
        <div className="bg-tts-card rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-tts-muted text-xs mb-1">💳 По карте</p>
              <p className="text-white text-xl font-bold">{priceCard} ₽</p>
            </div>
            <div className="text-right">
              <p className="text-tts-muted text-xs mb-1">💵 Наличными</p>
              <p className="text-tts-success text-xl font-bold">{priceCash} ₽</p>
            </div>
          </div>
          {priceCard > priceCash && priceCash > 0 && (
            <div className="bg-tts-success/10 rounded-xl p-3 text-center">
              <p className="text-tts-success text-sm">
                💰 За нал выгода: <span className="font-bold">{priceCard - priceCash} ₽</span>
              </p>
            </div>
          )}
        </div>

        {/* Аналоги */}
        {analogues.length > 0 && (
          <div className="mb-4">
            <p className="text-white font-medium mb-3">Ещё от {product.бренд}:</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {analogues.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate('/product/' + item.id)}
                  className="flex-shrink-0 w-28 bg-tts-card rounded-xl p-2"
                >
                  <div className="aspect-square bg-tts-dark rounded-lg mb-2 overflow-hidden">
                    {item.фото_url ? (
                      <img src={item.фото_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">📦</div>
                    )}
                  </div>
                  <p className="text-white text-xs truncate">{item.название}</p>
                  <p className="text-tts-success text-xs font-medium">{item.цена_нал || item.цена_безнал} ₽</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Нижняя панель — добавить в корзину */}
      <div className="fixed bottom-0 left-0 right-0 bg-tts-dark border-t border-tts-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-tts-card rounded-xl">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-white text-xl"
            >
              −
            </button>
            <span className="w-8 text-center text-white font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-white text-xl"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-tts-primary text-white py-3 rounded-xl font-medium active:scale-95 transition-transform"
          >
            В корзину · {((priceCash || priceCard) * quantity)} ₽
          </button>
        </div>
      </div>
    </div>
  )
}

export default Product

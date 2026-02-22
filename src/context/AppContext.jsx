import React, { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE } from '../App'

const AppContext = createContext()

export function AppProvider({ children, user }) {
  const [client, setClient] = useState(null)
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)

  // Загружаем данные клиента при старте
  useEffect(() => {
    const savedClient = localStorage.getItem('tts_client_data')
    if (savedClient) {
      setClient(JSON.parse(savedClient))
    }
    
    const savedCart = localStorage.getItem('tts_cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  // Сохраняем корзину при изменении
  useEffect(() => {
    localStorage.setItem('tts_cart', JSON.stringify(cart))
  }, [cart])

  // Добавить в корзину
  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { ...product, quantity }]
    })
    
    // Хаптик фидбек
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
  }

  // Удалить из корзины
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  // Изменить количество
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }

  // Очистить корзину
  const clearCart = () => {
    setCart([])
  }

  // Добавить в избранное
  const addToFavorites = async (product) => {
    setFavorites(prev => [...prev, product])
    
    // Отправляем на сервер
    try {
      await fetch(`${API_BASE}/tts-add-favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user?.telegram_id,
          product_id: product.id
        })
      })
    } catch (error) {
      console.log('Ошибка добавления в избранное:', error)
    }
  }

  // Удалить из избранного
  const removeFromFavorites = async (productId) => {
    setFavorites(prev => prev.filter(p => p.id !== productId))
    
    try {
      await fetch(`${API_BASE}/tts-remove-favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user?.telegram_id,
          product_id: productId
        })
      })
    } catch (error) {
      console.log('Ошибка удаления из избранного:', error)
    }
  }

  // Подсчёт суммы корзины
  const cartTotal = cart.reduce((sum, item) => {
    const price = item.price_cash || item.price_card || 0
    return sum + (price * item.quantity)
  }, 0)

  const cartTotalCard = cart.reduce((sum, item) => {
    return sum + ((item.price_card || 0) * item.quantity)
  }, 0)

  const cartTotalCash = cart.reduce((sum, item) => {
    return sum + ((item.price_cash || 0) * item.quantity)
  }, 0)

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Обновить данные клиента
  const refreshClient = async () => {
    if (!user?.telegram_id) return
    
    try {
      const response = await fetch(`${API_BASE}/tts-get-client?telegram_id=${user.telegram_id}`)
      const data = await response.json()
      if (data.client) {
        setClient(data.client)
        localStorage.setItem('tts_client_data', JSON.stringify(data.client))
      }
    } catch (error) {
      console.log('Ошибка обновления клиента:', error)
    }
  }

  const value = {
    user,
    client,
    setClient,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartTotalCard,
    cartTotalCash,
    cartCount,
    favorites,
    addToFavorites,
    removeFromFavorites,
    loading,
    setLoading,
    refreshClient
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

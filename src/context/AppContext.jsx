import React, { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

export function AppProvider({ children, user }) {
  const [client, setClient] = useState(null)
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)

  // Загружаем из localStorage при старте
  useEffect(() => {
    try {
      const savedClient = localStorage.getItem('tts_client_data')
      if (savedClient) setClient(JSON.parse(savedClient))

      const savedCart = localStorage.getItem('tts_cart')
      if (savedCart) setCart(JSON.parse(savedCart))

      const savedFavs = localStorage.getItem('tts_favorites')
      if (savedFavs) setFavorites(JSON.parse(savedFavs))
    } catch (e) {
      console.error('Ошибка чтения localStorage:', e)
    }
  }, [])

  // Сохраняем корзину
  useEffect(() => {
    localStorage.setItem('tts_cart', JSON.stringify(cart))
  }, [cart])

  // Сохраняем избранное
  useEffect(() => {
    localStorage.setItem('tts_favorites', JSON.stringify(favorites))
  }, [favorites])

  // Сохраняем клиента
  useEffect(() => {
    if (client) localStorage.setItem('tts_client_data', JSON.stringify(client))
  }, [client])

  // === КОРЗИНА ===
  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...prev, { ...product, quantity }]
    })
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) { removeFromCart(productId); return }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item))
  }

  const clearCart = () => setCart([])

  // === ИЗБРАННОЕ (localStorage) ===
  const addToFavorites = (product) => {
    setFavorites(prev => {
      if (prev.find(p => p.id === product.id)) return prev
      return [...prev, product]
    })
  }

  const removeFromFavorites = (productId) => {
    setFavorites(prev => prev.filter(p => p.id !== productId))
  }

  const isFavorite = (productId) => {
    return favorites.some(p => p.id === productId)
  }

  // === ПОДСЧЁТЫ ===
  const cartTotal = cart.reduce((sum, item) => sum + ((item.price_cash || item.price_card || 0) * item.quantity), 0)
  const cartTotalCard = cart.reduce((sum, item) => sum + ((item.price_card || 0) * item.quantity), 0)
  const cartTotalCash = cart.reduce((sum, item) => sum + ((item.price_cash || 0) * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const value = {
    user, client, setClient,
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    cartTotal, cartTotalCard, cartTotalCash, cartCount,
    favorites, addToFavorites, removeFromFavorites, isFavorite,
    loading, setLoading,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

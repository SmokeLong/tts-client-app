import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import SplashScreen from './pages/SplashScreen'
import AgeVerification from './pages/AgeVerification'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Auth from "./pages/Auth"
import Product from './pages/Product'
import Cart from './pages/Cart'
import Profile from './pages/Profile'
import Orders from './pages/Orders'
import Favorites from './pages/Favorites'
import Preorders from './pages/Preorders'

import { AppProvider } from './context/AppContext'

export const API_BASE = 'https://hook.eu2.make.com'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [ageVerified, setAgeVerified] = useState(false)

  useEffect(() => {
    // Telegram WebApp
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      const initData = tg.initDataUnsafe
      if (initData?.user) {
        setUser({
          telegram_id: initData.user.id,
          username: initData.user.username || '',
          first_name: initData.user.first_name || '',
          last_name: initData.user.last_name || '',
          photo_url: initData.user.photo_url || ''
        })
      }
    }

    // Для веб-версии — dev user
    if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
      setUser({
        telegram_id: null,
        username: 'web_user',
        first_name: 'Гость',
        last_name: '',
        photo_url: ''
      })
    }

    const ageCheck = localStorage.getItem('tts_age_verified')
    if (ageCheck === 'true') setAgeVerified(true)

    setTimeout(() => setIsLoading(false), 800)
  }, [])

  const handleAgeVerified = (verified) => {
    if (verified) {
      setAgeVerified(true)
      localStorage.setItem('tts_age_verified', 'true')
    }
  }

  if (isLoading) return <SplashScreen />
  if (!ageVerified) return <AgeVerification onVerified={handleAgeVerified} />

  return (
    <AppProvider user={user}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/preorders" element={<Preorders />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/auth" element={<Auth />} />
          </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App

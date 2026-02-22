import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Brand from './pages/Brand'
import Lineup from './pages/Lineup'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Filters from './pages/Filters'
import QuickOrder from './pages/QuickOrder'
import Orders from './pages/Orders'
import Favorites from './pages/Favorites'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Auth from './pages/Auth'

function AuthGuard({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="min-h-screen leather-bg flex items-center justify-center">
        <div className="text-[36px] font-black gold-gradient-text tracking-[4px] animate-logoPulse">
          TTS
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth" element={<Auth />} />

        {/* Protected routes */}
        <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
        <Route path="/catalog" element={<AuthGuard><Catalog /></AuthGuard>} />
        <Route path="/brand/:id" element={<AuthGuard><Brand /></AuthGuard>} />
        <Route path="/lineup/:id" element={<AuthGuard><Lineup /></AuthGuard>} />
        <Route path="/product/:id" element={<AuthGuard><Product /></AuthGuard>} />
        <Route path="/cart" element={<AuthGuard><Cart /></AuthGuard>} />
        <Route path="/filters" element={<AuthGuard><Filters /></AuthGuard>} />
        <Route path="/quick-order" element={<AuthGuard><QuickOrder /></AuthGuard>} />
        <Route path="/orders" element={<AuthGuard><Orders /></AuthGuard>} />
        <Route path="/favorites" element={<AuthGuard><Favorites /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

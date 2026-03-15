import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import ToastContainer from './components/ui/Toast'

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
        <img src="/assets/logo.png" alt="Time to Snus" className="w-[180px] h-auto animate-logoPulse" />
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
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth" element={<Auth />} />

        {/* Public routes — shop works without auth */}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/brand/:id" element={<Brand />} />
        <Route path="/lineup/:id" element={<Lineup />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/filters" element={<Filters />} />
        <Route path="/quick-order" element={<QuickOrder />} />
        <Route path="/favorites" element={<Favorites />} />

        {/* Auth-required routes */}
        <Route path="/orders" element={<AuthGuard><Orders /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

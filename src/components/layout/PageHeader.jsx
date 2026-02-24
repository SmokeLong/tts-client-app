import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../stores/cartStore'

export default function PageHeader({ title, rightAction, showCart = false }) {
  const navigate = useNavigate()
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0))

  return (
    <header className="sticky top-0 z-40 bg-[rgba(10,9,8,0.95)] backdrop-blur-xl border-b border-[var(--border-gold)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="press-effect p-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-[14px] font-bold tracking-[2px] uppercase gold-gradient-text">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {showCart && (
            <button onClick={() => navigate('/cart')} className="press-effect p-1 relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full gold-gradient-bg text-[10px] font-bold text-[var(--bg-dark)] flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          )}
          {rightAction && <div>{rightAction}</div>}
        </div>
      </div>
    </header>
  )
}

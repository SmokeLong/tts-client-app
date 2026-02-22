import { useLocation, useNavigate } from 'react-router-dom'
import { useCartStore } from '../../stores/cartStore'

const navItems = [
  {
    path: '/',
    label: 'Главная',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/catalog',
    label: 'Каталог',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/quick-order',
    label: 'Заказ',
    isCenter: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    path: '/favorites',
    label: 'Избранное',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const cartCount = useCartStore((s) => s.items.length)

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-50">
      <div className="bg-[rgba(10,9,8,0.95)] backdrop-blur-xl border-t border-[var(--border-gold)]">
        <div className="flex items-end justify-around px-2 pt-2 pb-3">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <div className={`
                    w-[60px] h-[56px] rounded-full flex items-center justify-center
                    gold-gradient-bg shadow-lg shadow-[rgba(212,175,55,0.3)]
                    border-2 border-[var(--gold-light)]
                    press-effect transition-transform
                  `}>
                    <div className="text-[var(--bg-dark)]">{item.icon}</div>
                  </div>
                  <span className="text-[9px] mt-1 font-bold tracking-wider text-[var(--gold)]">
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 relative press-effect transition-transform"
              >
                <div className={isActive ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'}>
                  {item.icon}
                </div>
                <span className={`text-[9px] font-semibold tracking-wider ${
                  isActive ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'
                }`}>
                  {item.label}
                </span>
                {item.path === '/favorites' && cartCount > 0 && null}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

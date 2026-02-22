import { useNavigate } from 'react-router-dom'

export default function PageHeader({ title, rightAction }) {
  const navigate = useNavigate()

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
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  )
}

import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../stores/cartStore'

export default function ProductCardSmall({ product }) {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)

  return (
    <div
      className="card min-w-[140px] p-3 flex flex-col items-center gap-2 cursor-pointer press-effect"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="w-[50px] h-[50px] rounded-full bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] flex items-center justify-center text-[22px]">
        📦
      </div>
      <p className="text-[10px] font-bold text-[var(--gold-light)] text-center leading-tight">{product.name}</p>
      <p className="text-[8px] text-[var(--text-muted)]">{product.brand}</p>
      {product.strength && (
        <span className="px-2 py-0.5 bg-[rgba(212,175,55,0.1)] rounded text-[8px] text-[var(--text-muted)]">
          ⚡ {product.strength}
        </span>
      )}
      <div className="flex items-center gap-2 mt-auto w-full">
        <span className="text-[12px] font-bold text-[var(--gold)] flex-1">{product.priceCash} ₽</span>
        <button
          onClick={(e) => { e.stopPropagation(); addItem(product) }}
          className="w-7 h-7 rounded-lg gold-gradient-bg flex items-center justify-center press-effect"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" strokeWidth="3">
            <path d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}

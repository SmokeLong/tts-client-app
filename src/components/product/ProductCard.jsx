import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../stores/cartStore'
import StockDots from './StockDots'

export default function ProductCard({ product, stock, showFavorite, isFavorite, onToggleFavorite }) {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)

  const emoji = getFlavorEmoji(product.flavor)

  return (
    <div
      className="card overflow-hidden relative group cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Gold top line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Image */}
      <div className="h-[120px] bg-gradient-to-b from-[rgba(26,24,22,1)] to-[rgba(13,12,10,1)] flex items-center justify-center relative">
        <div className="w-[70px] h-[70px] rounded-full border-2 border-[var(--border-gold)] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center text-[28px]">
          {emoji}
        </div>

        {/* Badge */}
        {product.badge && (
          <span className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[8px] font-bold ${
            product.badge === 'ТОП' ? 'gold-gradient-bg text-[var(--bg-dark)]' :
            product.badge === 'NEW' ? 'bg-gradient-to-br from-[var(--green)] to-[#22c55e] text-[var(--bg-dark)]' :
            'bg-gradient-to-br from-[var(--red)] to-[#ef4444] text-white'
          }`}>
            {product.badge}
          </span>
        )}

        {/* Favorite */}
        {showFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(product.id) }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[rgba(0,0,0,0.5)] border border-[var(--border-gold)] flex items-center justify-center press-effect"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill={isFavorite ? 'var(--red)' : 'none'}
              stroke={isFavorite ? 'var(--red)' : 'var(--gold)'}
              strokeWidth="1.5"
            >
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[8px] text-[var(--text-muted)] tracking-[1px] mb-1">
          {product.brand}{product.lineup ? ` • ${product.lineup}` : ''}
        </p>
        <p className="text-[11px] font-bold text-[var(--gold-light)] leading-tight mb-1.5 min-h-[28px]">
          {product.name}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {product.strength && (
            <span className="px-1.5 py-0.5 bg-[rgba(212,175,55,0.1)] rounded text-[7px] text-[var(--text-muted)]">
              ⚡ {product.strength}
            </span>
          )}
          {product.packets && (
            <span className="px-1.5 py-0.5 bg-[rgba(212,175,55,0.1)] rounded text-[7px] text-[var(--text-muted)]">
              📦 {product.packets}шт
            </span>
          )}
        </div>

        {/* Stock dots */}
        {stock && <div className="mb-2"><StockDots stock={stock} /></div>}

        {/* Price + Add */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-extrabold text-[var(--gold)]">
            {product.priceCash} <span className="text-[10px] text-[var(--text-muted)]">₽</span>
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); addItem(product) }}
            className="w-9 h-9 rounded-[10px] gold-gradient-bg flex items-center justify-center press-effect shadow-md shadow-[rgba(212,175,55,0.3)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function getFlavorEmoji(flavor) {
  if (!flavor) return '📦'
  const f = flavor.toLowerCase()
  if (f.includes('мят')) return '🌿'
  if (f.includes('виноград') || f.includes('grape')) return '🍇'
  if (f.includes('манго') || f.includes('mango')) return '🥭'
  if (f.includes('арбуз') || f.includes('watermelon')) return '🍉'
  if (f.includes('ягод') || f.includes('berry')) return '🫐'
  if (f.includes('цитрус') || f.includes('лимон')) return '🍋'
  if (f.includes('кола') || f.includes('cola')) return '🥤'
  if (f.includes('лёд') || f.includes('ice') || f.includes('cool')) return '❄️'
  if (f.includes('кофе') || f.includes('coffee')) return '☕'
  if (f.includes('персик') || f.includes('peach')) return '🍑'
  if (f.includes('яблок') || f.includes('apple')) return '🍏'
  if (f.includes('вишн') || f.includes('cherry')) return '🍒'
  return '📦'
}

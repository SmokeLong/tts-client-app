export default function QuantitySelector({ value, onChange, min = 1, max = 99 }) {
  return (
    <div className="flex items-center gap-1 p-1 card">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-lg bg-[rgba(212,175,55,0.1)] flex items-center justify-center press-effect"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
          <path d="M20 12H4" />
        </svg>
      </button>
      <span className="w-10 text-center text-[16px] font-extrabold text-[var(--gold-light)]">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-lg bg-[rgba(212,175,55,0.1)] flex items-center justify-center press-effect"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
          <path d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

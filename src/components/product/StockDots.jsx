// Stock indicators: Ц (ЦЕНТР), С (СЕВЕРНЫЙ), Л (ЛБ)
// quantity: 5+ = green, 1-4 = yellow, 0 = red
function dotColor(qty) {
  if (qty >= 5) return 'green'
  if (qty >= 1) return 'yellow'
  return 'red'
}

export default function StockDots({ stock = {} }) {
  // stock = { center: number, north: number, lb: number }
  const points = [
    { label: 'Ц', qty: stock.center ?? 0 },
    { label: 'С', qty: stock.north ?? 0 },
    { label: 'Л', qty: stock.lb ?? 0 },
  ]

  return (
    <div className="flex gap-1.5">
      {points.map((p) => {
        const color = dotColor(p.qty)
        return (
          <span
            key={p.label}
            className={`flex items-center gap-1 text-[8px] text-[var(--${color})]`}
          >
            <span className={`w-[6px] h-[6px] rounded-full bg-[var(--${color})]`} />
            {p.label}
          </span>
        )
      })}
    </div>
  )
}

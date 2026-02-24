import { useState, useRef, useCallback } from 'react'

const THRESHOLD = 60

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(diff * 0.5, 100))
    }
  }, [pulling, refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return
    setPulling(false)

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pulling, pullDistance, onRefresh])

  const showIndicator = pullDistance > 10 || refreshing
  const ready = pullDistance >= THRESHOLD

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: showIndicator ? Math.max(pullDistance, refreshing ? 40 : 0) : 0 }}
      >
        <div
          className={`w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={{
            opacity: Math.min(pullDistance / THRESHOLD, 1),
            transform: `rotate(${pullDistance * 3}deg) scale(${ready ? 1 : 0.7 + (pullDistance / THRESHOLD) * 0.3})`,
            transition: pulling ? 'none' : 'all 0.3s',
          }}
        />
      </div>
      {children}
    </div>
  )
}

import React, { useState } from 'react'

function FilterModal({ filters, options, onApply, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters)

  const toggleFilter = (category, value) => {
    setLocalFilters(prev => {
      const current = prev[category] || []
      const isSelected = current.includes(value)
      
      return {
        ...prev,
        [category]: isSelected
          ? current.filter(v => v !== value)
          : [...current, value]
      }
    })
  }

  const clearAll = () => {
    setLocalFilters({
      category: 'all',
      brand: [],
      strength: [],
      aroma: [],
      packets: [],
      format: [],
      point: []
    })
  }

  const FilterSection = ({ title, category, items }) => (
    <div className="mb-6">
      <p className="text-white font-medium mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const isSelected = (localFilters[category] || []).includes(item.value)
          
          return (
            <button
              key={item.value}
              onClick={() => toggleFilter(category, item.value)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                isSelected
                  ? 'bg-tts-primary text-white'
                  : 'bg-tts-card text-tts-muted'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  const activeCount = 
    (localFilters.brand?.length || 0) + 
    (localFilters.strength?.length || 0) + 
    (localFilters.aroma?.length || 0) + 
    (localFilters.packets?.length || 0) + 
    (localFilters.format?.length || 0) +
    (localFilters.point?.length || 0)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="bg-tts-dark w-full rounded-t-3xl max-h-[85vh] flex flex-col animate-fadeIn">
        {/* Шапка */}
        <div className="flex justify-between items-center p-4 border-b border-tts-card">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Фильтры</h2>
            {activeCount > 0 && (
              <span className="bg-tts-primary text-white text-xs px-2 py-1 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-tts-muted">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4">
          <FilterSection 
            title="Крепость" 
            category="strength" 
            items={options.strength} 
          />
          
          <FilterSection 
            title="Аромка" 
            category="aroma" 
            items={options.aroma} 
          />
          
          <FilterSection 
            title="Количество пакетов" 
            category="packets" 
            items={options.packets} 
          />
          
          <FilterSection 
            title="Формат пакетов" 
            category="format" 
            items={options.format} 
          />
          
          <FilterSection 
            title="Точка" 
            category="point" 
            items={options.point} 
          />
        </div>

        {/* Кнопки */}
        <div className="p-4 border-t border-tts-card flex gap-3">
          <button
            onClick={clearAll}
            className="flex-1 py-4 bg-tts-card text-tts-muted rounded-xl font-medium"
          >
            Сбросить
          </button>
          <button
            onClick={() => onApply(localFilters)}
            className="flex-1 py-4 bg-tts-primary text-white rounded-xl font-medium"
          >
            Показать
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterModal

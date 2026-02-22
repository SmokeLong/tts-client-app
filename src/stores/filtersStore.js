import { create } from 'zustand'

export const useFiltersStore = create((set) => ({
  pointId: null,
  productType: null,       // 'табачный' | 'целлюлоза'
  strengths: [],           // array of selected strength values
  effectType: null,        // 'резкий' | 'мягкий'
  pouchType: null,         // 'classic' | 'slim' | 'mini-slim'
  packCount: null,         // number
  flavor: null,            // string
  sortBy: 'name',          // 'name' | 'price_asc' | 'price_desc' | 'strength' | 'popular'
  searchQuery: '',

  setFilter(key, value) {
    set({ [key]: value })
  },

  toggleStrength(value) {
    set((state) => ({
      strengths: state.strengths.includes(value)
        ? state.strengths.filter((s) => s !== value)
        : [...state.strengths, value],
    }))
  },

  resetFilters() {
    set({
      pointId: null,
      productType: null,
      strengths: [],
      effectType: null,
      pouchType: null,
      packCount: null,
      flavor: null,
      sortBy: 'name',
      searchQuery: '',
    })
  },

  setSearch(query) {
    set({ searchQuery: query })
  },

  // Count active filters (for badge)
  getActiveCount() {
    let count = 0
    const state = useFiltersStore.getState()
    if (state.pointId) count++
    if (state.productType) count++
    if (state.strengths.length > 0) count++
    if (state.effectType) count++
    if (state.pouchType) count++
    if (state.packCount) count++
    if (state.flavor) count++
    return count
  },
}))

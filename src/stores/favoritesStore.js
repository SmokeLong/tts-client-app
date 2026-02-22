import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      ids: [], // Array of product IDs
      notifyEnabled: true,

      toggle(productId) {
        const ids = get().ids
        if (ids.includes(productId)) {
          set({ ids: ids.filter((id) => id !== productId) })
        } else {
          set({ ids: [...ids, productId] })
        }
      },

      isFavorite(productId) {
        return get().ids.includes(productId)
      },

      setNotify(enabled) {
        set({ notifyEnabled: enabled })
      },

      clear() {
        set({ ids: [] })
      },
    }),
    {
      name: 'tts-favorites',
    }
  )
)

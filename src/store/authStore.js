import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      client: null,
      isAuthenticated: false,
      ageVerified: false,

      setClient: (client) => set({ client, isAuthenticated: true }),
      setAgeVerified: () => set({ ageVerified: true }),
      logout: () => set({ user: null, client: null, isAuthenticated: false }),
      updateClient: (data) => set((state) => ({
        client: { ...state.client, ...data }
      })),
    }),
    { name: 'tts-auth' }
  )
)

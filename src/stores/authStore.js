import { create } from 'zustand'
import { getSavedSession, saveSession, clearSession } from '../lib/auth'

export const useAuthStore = create((set, get) => ({
  client: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize from localStorage
  init() {
    const session = getSavedSession()
    if (session) {
      set({
        client: session.client,
        token: session.token,
        isAuthenticated: true,
        isLoading: false,
      })
    } else {
      set({ isLoading: false })
    }
  },

  // Login / register
  setAuth(token, client) {
    saveSession(token, client)
    set({
      client,
      token,
      isAuthenticated: true,
    })
  },

  // Update client data
  updateClient(data) {
    const merged = { ...get().client, ...data }
    const token = get().token
    if (token) saveSession(token, merged)
    set({ client: merged })
  },

  // Logout
  logout() {
    clearSession()
    set({
      client: null,
      token: null,
      isAuthenticated: false,
    })
  },
}))

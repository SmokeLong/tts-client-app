import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
  toasts: [],

  show(message, type = 'error') {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, message, type, exiting: false }] })
    setTimeout(() => get().dismiss(id), 3500)
  },

  dismiss(id) {
    set({ toasts: get().toasts.map(t => t.id === id ? { ...t, exiting: true } : t) })
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) })
    }, 300)
  },
}))

// Shorthand
export function showToast(message, type) {
  useToastStore.getState().show(message, type)
}

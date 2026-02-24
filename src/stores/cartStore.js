import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Volume discount tiers
function getVolumeDiscount(qty) {
  if (qty >= 7) return { perItem: 60, freeShayba: true }
  if (qty >= 5) return { perItem: 50, freeShayba: true }
  if (qty >= 2) return { perItem: 30, freeShayba: false }
  return { perItem: 0, freeShayba: false }
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],          // [{ product, qty, paymentType: 'cash'|'card' }]
      pickupPointId: null,
      paymentMethod: 'cash', // 'cash' | 'card' | 'mixed'
      tcoinsToSpend: 0,
      comment: '',

      addItem(product) {
        const items = get().items
        const existing = items.find((i) => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
            ),
          })
        } else {
          set({ items: [...items, { product, qty: 1, paymentType: 'cash' }] })
        }
      },

      removeItem(productId) {
        set({ items: get().items.filter((i) => i.product.id !== productId) })
      },

      updateQty(productId, qty) {
        if (qty <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i
          ),
        })
      },

      setItemPaymentType(productId, paymentType) {
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, paymentType } : i
          ),
        })
      },

      setPickupPoint(pointId) {
        set({ pickupPointId: pointId })
      },

      setPaymentMethod(method) {
        set({ paymentMethod: method })
      },

      setTcoins(amount) {
        set({ tcoinsToSpend: amount })
      },

      setComment(text) {
        set({ comment: text })
      },

      clearCart() {
        set({
          items: [],
          pickupPointId: null,
          paymentMethod: 'cash',
          tcoinsToSpend: 0,
          comment: '',
        })
      },

      // Computed getters
      get totalQty() {
        return get().items.reduce((sum, i) => sum + i.qty, 0)
      },

      getSubtotal() {
        const { items, paymentMethod } = get()
        return items.reduce((sum, item) => {
          const price = paymentMethod === 'mixed'
            ? (item.paymentType === 'cash' ? item.product.priceCash : item.product.priceCard)
            : (paymentMethod === 'cash' ? item.product.priceCash : item.product.priceCard)
          return sum + price * item.qty
        }, 0)
      },

      getVolumeDiscount() {
        const totalQty = get().items.reduce((sum, i) => sum + i.qty, 0)
        const discount = getVolumeDiscount(totalQty)
        return {
          ...discount,
          totalDiscount: discount.perItem * totalQty,
        }
      },

      getCashSavings() {
        const { items, paymentMethod } = get()
        if (paymentMethod !== 'cash') return 0
        return items.reduce((sum, item) => {
          return sum + (item.product.priceCard - item.product.priceCash) * item.qty
        }, 0)
      },

      getLoyaltyDiscount(discountPercent = 0) {
        if (!discountPercent) return 0
        const subtotal = get().getSubtotal()
        return Math.floor(subtotal * discountPercent / 100)
      },

      getTotal(discountPercent = 0) {
        const subtotal = get().getSubtotal()
        const volumeDiscount = get().getVolumeDiscount().totalDiscount
        const loyaltyDiscount = Math.floor(subtotal * discountPercent / 100)
        const tcoins = get().tcoinsToSpend
        return Math.max(0, subtotal - volumeDiscount - loyaltyDiscount - tcoins)
      },
    }),
    {
      name: 'tts-cart',
      partialize: (state) => ({
        items: state.items,
        pickupPointId: state.pickupPointId,
        paymentMethod: state.paymentMethod,
      }),
    }
  )
)

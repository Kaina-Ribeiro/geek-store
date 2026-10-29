'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Client-side inventory (cart) and save slots. Prices here are display
// snapshots only: checkout (phase 3) revalidates price and stock on the server.
export type CartLine = {
  id: number
  title: string
  platform: string
  condition: string
  pixValue: number
  price: number
  cover: string
  href: string
  maxQty: number
  qty: number
}

type State = {
  lines: Record<number, CartLine>
  saves: Record<number, true>
  drawerOpen: boolean
  toast: string | null
  add: (line: Omit<CartLine, 'qty'>) => void
  setQty: (id: number, qty: number) => void
  remove: (id: number) => void
  toggleSave: (gameId: number) => void
  openDrawer: (open: boolean) => void
  say: (msg: string | null) => void
}

export const useCart = create<State>()(
  persist(
    (set, get) => ({
      lines: {},
      saves: {},
      drawerOpen: false,
      toast: null,
      add: (line) => {
        const cur = get().lines[line.id]
        const qty = Math.min(line.maxQty, (cur?.qty ?? 0) + 1)
        set({ lines: { ...get().lines, [line.id]: { ...line, qty } } })
        get().say(`${line.title} no inventário · +${Math.round(line.pixValue)} XP`)
      },
      setQty: (id, qty) => {
        const cur = get().lines[id]
        if (!cur) return
        if (qty <= 0) return get().remove(id)
        set({ lines: { ...get().lines, [id]: { ...cur, qty: Math.min(cur.maxQty, qty) } } })
      },
      remove: (id) => {
        const { [id]: _, ...rest } = get().lines
        set({ lines: rest })
      },
      toggleSave: (gameId) => {
        const { [gameId]: had, ...rest } = get().saves
        set({ saves: had ? rest : { ...rest, [gameId]: true } })
      },
      openDrawer: (drawerOpen) => set({ drawerOpen }),
      say: (toast) => set({ toast }),
    }),
    {
      name: 'checkpoint-inventario',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, saves: s.saves }),
      // Rehydrated from <StoreHydrator/> after mount so SSR and first client
      // render match (both start empty).
      skipHydration: true,
    },
  ),
)

export const cartCount = (s: State) => Object.values(s.lines).reduce((n, l) => n + l.qty, 0)
export const cartTotal = (s: State) => Object.values(s.lines).reduce((n, l) => n + l.qty * l.pixValue, 0)

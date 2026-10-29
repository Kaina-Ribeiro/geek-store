'use client'

import { useEffect } from 'react'

import { syncSavesAction } from '../app/(frontend)/actions'
import { useCart } from '../store/cart'

// Restores the inventory from localStorage after mount, then merges the save
// slots with the account (when logged in).
export function StoreHydrator() {
  useEffect(() => {
    void (async () => {
      await useCart.persist.rehydrate()
      const local = Object.keys(useCart.getState().saves).map(Number)
      const merged = await syncSavesAction(local).catch(() => null)
      if (merged) useCart.getState().setSaves(merged)
    })()
  }, [])
  return null
}

'use client'

import { useSyncExternalStore } from 'react'

import { useCart } from '../store/cart'

// True once the persisted inventory has been restored from localStorage, so
// pages that depend on it do not flash an empty state. False on the server.
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  )
}

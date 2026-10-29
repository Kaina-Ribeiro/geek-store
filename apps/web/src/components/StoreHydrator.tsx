'use client'

import { useEffect } from 'react'

import { useCart } from '../store/cart'

export function StoreHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate()
  }, [])
  return null
}

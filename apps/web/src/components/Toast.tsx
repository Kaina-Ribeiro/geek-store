'use client'

import { useEffect } from 'react'

import { useCart } from '../store/cart'

export function Toast() {
  const msg = useCart((s) => s.toast)
  const say = useCart((s) => s.say)

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => say(null), 2600)
    return () => clearTimeout(t)
  }, [msg, say])

  return (
    <div className="toast-host" aria-live="polite">
      {msg && (
        <div className="toast" key={msg}>
          <span className="toast-ic">★</span>
          {msg}
        </div>
      )}
    </div>
  )
}

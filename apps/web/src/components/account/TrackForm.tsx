'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { trackAction } from '../../app/(frontend)/actions'

export function TrackForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <form
      className="acc-card track-form"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        start(async () => {
          const r = await trackAction(String(f.get('n')), String(f.get('email')))
          if (!r.ok) return setError(r.error)
          router.push(r.href)
        })
      }}
    >
      <label className="co-field">
        <span>Número do pedido</span>
        <input name="n" required inputMode="numeric" placeholder="#1042" />
      </label>
      <label className="co-field">
        <span>E-mail da compra</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {error && (
        <p className="co-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-solid" disabled={pending}>
        Ver pedido
      </button>
    </form>
  )
}

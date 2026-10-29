'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { subscribeAction } from '../app/(frontend)/actions'

export function Newsletter() {
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="ftr-form"
      onSubmit={(e) => {
        e.preventDefault()
        const email = String(new FormData(e.currentTarget).get('email') || '')
        start(async () => {
          const r = await subscribeAction(email, 'newsletter')
          setMsg(r.ok ? '✓ Pronto! Você recebe o próximo drop por e-mail.' : r.error)
        })
      }}
    >
      <label htmlFor="news" className="sr-only">
        Seu e-mail
      </label>
      <input id="news" name="email" type="email" required placeholder="seu@email.com" autoComplete="email" />
      <button type="submit" className="btn btn-yellow" disabled={pending}>
        Entrar
      </button>
      <small className="ftr-msg" role="status">
        {msg ?? (
          <>
            Descadastre quando quiser. <Link href="/privacidade">Privacidade</Link>.
          </>
        )}
      </small>
    </form>
  )
}

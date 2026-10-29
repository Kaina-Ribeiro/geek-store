'use client'

import { useState } from 'react'

// Newsletter signup is wired to Resend in phase 5; for now it only confirms
// the address format and says when it opens, without pretending to subscribe.
export function Newsletter() {
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <form
      className="ftr-form"
      onSubmit={(e) => {
        e.preventDefault()
        setMsg('A newsletter abre junto com o lançamento da loja.')
      }}
    >
      <label htmlFor="news" className="sr-only">
        Seu e-mail
      </label>
      <input id="news" type="email" required placeholder="seu@email.com" autoComplete="email" />
      <button type="submit" className="btn btn-yellow">
        Entrar
      </button>
      {msg && (
        <small className="ftr-msg" role="status">
          {msg}
        </small>
      )}
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'

import { loginLinkAction } from '../../app/(frontend)/actions'

export function LoginForm({ next, error: initialError }: { next: string; error: string | null }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError)
  const [pending, start] = useTransition()

  if (sent) {
    return (
      <div className="acc-card" role="status">
        <b className="dsp">Confira seu e-mail</b>
        <p>
          Mandamos um link para <b>{email}</b>. Ele vale por 15 minutos e só funciona uma vez.
        </p>
        {devLink && (
          <p className="acc-dev">
            <span className="px">Modo de teste</span> Sem provedor de e-mail configurado, o link aparece aqui:{' '}
            <a href={devLink}>entrar agora</a>
          </p>
        )}
        <button className="btn btn-ghost" onClick={() => setSent(false)}>
          Usar outro e-mail
        </button>
      </div>
    )
  }

  return (
    <form
      className="acc-card"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const r = await loginLinkAction(email, next)
          if (!r.ok) return setError(r.error)
          setDevLink(r.devLink ?? null)
          setSent(true)
        })
      }}
    >
      <label className="co-field">
        <span>Seu e-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
      </label>
      {error && (
        <p className="co-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-yellow" type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Receber link para entrar'}
      </button>
      <small>Primeira vez? A conta é criada nesse mesmo passo.</small>
    </form>
  )
}

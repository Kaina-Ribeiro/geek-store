'use client'

import { useActionState } from 'react'

import { loginAction, type LoginState } from '../../app/(painel)/painel/actions'
import { AlertIcon, ArrowRight } from './icons'

export function LoginForm({ volta }: { volta: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { ok: false })
  return (
    <form action={action} noValidate>
      <input type="hidden" name="volta" value={volta} />
      {state.error && (
        <p className="pn-alert" role="alert">
          <AlertIcon />
          {state.error}
        </p>
      )}
      <div className="pn-fld">
        <label className="pn-lbl" htmlFor="pn-email">
          E-mail
        </label>
        <input id="pn-email" className="pn-inp" name="email" type="email" defaultValue={state.email} key={state.email} autoComplete="username" inputMode="email" required />
      </div>
      <div className="pn-fld">
        <label className="pn-lbl" htmlFor="pn-pass">
          Senha
        </label>
        <input id="pn-pass" className="pn-inp" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="pn-btn yellow" type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
        {!pending && <ArrowRight />}
      </button>
    </form>
  )
}

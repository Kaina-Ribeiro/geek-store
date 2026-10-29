'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { updateProfileAction } from '../../app/(frontend)/actions'

export function ProfileForm(props: { name: string; phone: string; email: string }) {
  const [name, setName] = useState(props.name)
  const [phone, setPhone] = useState(props.phone)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  return (
    <form
      className="acc-form"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await updateProfileAction(name, phone)
          setMsg(r.ok ? 'Salvo.' : r.error)
          router.refresh()
        })
      }}
    >
      <label className="co-field">
        <span>Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="co-field">
        <span>WhatsApp</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel-national" />
      </label>
      <label className="co-field">
        <span>E-mail</span>
        <input value={props.email} readOnly />
      </label>
      <div className="acc-form-row">
        <button className="btn btn-solid" type="submit" disabled={pending}>
          Salvar
        </button>
        {msg && <small role="status">{msg}</small>}
      </div>
    </form>
  )
}

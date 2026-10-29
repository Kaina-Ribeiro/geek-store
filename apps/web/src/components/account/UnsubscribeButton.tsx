'use client'

import { useState, useTransition } from 'react'

import { unsubscribeAction } from '../../app/(frontend)/actions'

export function UnsubscribeButton({ id, sig }: { id: number; sig: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [pending, start] = useTransition()
  if (state === 'ok') return <p role="status">✓ Pronto. Você não recebe mais esses e-mails.</p>
  if (state === 'bad') return <p role="alert">Link inválido. Responda qualquer e-mail nosso pedindo para sair.</p>
  return (
    <button
      className="btn btn-solid"
      disabled={pending}
      onClick={() => start(async () => setState((await unsubscribeAction(id, sig)).ok ? 'ok' : 'bad'))}
    >
      Confirmar descadastro
    </button>
  )
}

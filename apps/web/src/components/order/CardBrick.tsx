'use client'

import { useEffect, useRef, useState } from 'react'

import { payCardAction } from '../../app/(frontend)/actions'
import type { CardFormData } from '../../lib/mercadopago'

// Mercado Pago "Card Payment Brick": the card form is rendered and tokenized
// by Mercado Pago itself, so the card number never touches our servers.

type Brick = { unmount: () => void }
type MpInstance = {
  bricks: () => { create: (kind: string, container: string, settings: unknown) => Promise<Brick> }
}
declare global {
  interface Window {
    MercadoPago?: new (key: string, opts: { locale: string }) => MpInstance
  }
}

const SDK = 'https://sdk.mercadopago.com/js/v2'

function loadSdk() {
  if (window.MercadoPago) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK}"]`)
    const s = existing ?? document.createElement('script')
    s.addEventListener('load', () => resolve())
    s.addEventListener('error', () => reject(new Error('sdk')))
    if (!existing) {
      s.src = SDK
      s.async = true
      document.head.appendChild(s)
    }
  })
}

export function CardBrick(props: {
  orderId: number
  token: string
  amount: number
  email: string
  maxInstallments: number
  publicKey: string
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })

  useEffect(() => {
    let brick: Brick | null = null
    let cancelled = false
    loadSdk()
      .then(async () => {
        if (cancelled || !window.MercadoPago) return
        const mp = new window.MercadoPago(props.publicKey, { locale: 'pt-BR' })
        brick = await mp.bricks().create('cardPayment', 'card-brick', {
          initialization: { amount: props.amount, payer: { email: props.email } },
          customization: {
            paymentMethods: { maxInstallments: props.maxInstallments },
            visual: { style: { theme: 'default', customVariables: { baseColor: '#141416', borderRadiusLarge: '18px' } } },
          },
          callbacks: {
            onReady: () => setReady(true),
            onError: () => setError('Não foi possível carregar o formulário do cartão. Recarregue a página.'),
            onSubmit: async (form: CardFormData) => {
              setError(null)
              const p = latest.current
              const r = await payCardAction(p.orderId, p.token, form)
              p.onDone()
              if (!r.ok) {
                setError(r.error)
                throw new Error(r.error)
              }
            },
          },
        })
      })
      .catch(() => setError('Não foi possível falar com o Mercado Pago. Confira sua conexão.'))
    return () => {
      cancelled = true
      brick?.unmount()
    }
    // The brick is created once per order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.orderId])

  return (
    <div className="ord-brick">
      {!ready && !error && <p className="ord-note">Carregando o formulário seguro do Mercado Pago…</p>}
      <div id="card-brick" />
      {error && (
        <p className="co-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

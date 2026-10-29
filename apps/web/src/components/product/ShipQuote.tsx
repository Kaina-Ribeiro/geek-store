'use client'

import { TruckIcon } from '@checkpoint/ui'
import { useState, useTransition } from 'react'

import { quoteAction } from '../../app/(frontend)/actions'
import { brl } from '../../lib/catalog'
import { formatCep, onlyDigits, type ShipOption } from '../../lib/checkout-math'

// Shipping estimate by CEP on the product page (same quote as the checkout).
export function ShipQuote({ pixValue }: { pixValue: number }) {
  const [cep, setCep] = useState('')
  const [opts, setOpts] = useState<ShipOption[] | null>(null)
  const [where, setWhere] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const run = (raw: string) => {
    if (onlyDigits(raw).length !== 8) return
    start(async () => {
      const r = await quoteAction(raw, 1, pixValue)
      if (!r.ok) {
        setError(r.error)
        setOpts(null)
        return
      }
      setError(null)
      setWhere(`${r.address.city} - ${r.address.uf}`)
      setOpts(r.options)
    })
  }

  return (
    <div className="ship-box">
      <TruckIcon />
      <div className="ship-in">
        <b>Envio para todo o Brasil ou retirada em Taubaté</b>
        <form
          className="ship-form"
          onSubmit={(e) => {
            e.preventDefault()
            run(cep)
          }}
        >
          <label htmlFor="ship-cep" className="sr-only">
            CEP
          </label>
          <input
            id="ship-cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Seu CEP"
            value={formatCep(cep)}
            onChange={(e) => {
              setCep(e.target.value)
              if (onlyDigits(e.target.value).length === 8) run(e.target.value)
            }}
          />
          <button className="btn btn-ghost" disabled={pending}>
            {pending ? '…' : 'Calcular'}
          </button>
        </form>
        {error && <small role="alert">{error}</small>}
        {opts && (
          <ul className="ship-list" aria-label={`Frete para ${where}`}>
            {opts.map((o) => (
              <li key={o.id}>
                <span>
                  {o.name} <small>· {o.detail}</small>
                </span>
                <b className="mono">{o.price ? brl(o.price) : 'Grátis'}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

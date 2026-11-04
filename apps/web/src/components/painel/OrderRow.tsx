'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { moveOrderAction } from '../../app/(painel)/painel/actions'
import { TRACKING_MAX } from '../../lib/painel/order-panel'
import type { PanelOrder } from '../../lib/painel/order-store'
import { CheckIcon } from './icons'
import { Toast } from './ui'

export function OrderRow({ order: o }: { order: PanelOrder }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const go = async () => {
    if (!o.move) return
    if (o.move.asksTracking && !open) return setOpen(true)
    setBusy(true)
    try {
      const r = await moveOrderAction(o.id, o.status, code)
      if (!r.ok) {
        if ('session' in r && r.session) return router.push('/painel/entrar?volta=%2Fpainel%2Fpedidos')
        setErr(r.error)
      }
      router.refresh()
    } catch {
      setErr('Não deu para mudar o pedido. Confira a internet e tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pn-ord">
      <div className="pn-ord-txt">
        <span>
          <b className="mono">{o.number}</b>
          <span>{o.name}</span>
        </span>
        <b className="pn-ord-items">{o.items}</b>
      </div>
      <span className="pn-stchip" style={{ background: o.chip.bg, color: o.chip.ink }}>
        <i className="pn-dot" style={{ background: o.chip.ink }} />
        {o.statusLabel}
      </span>
      {o.move ? (
        <button type="button" className="pn-btn yellow sm" onClick={() => void go()} disabled={busy} aria-expanded={o.move.asksTracking ? open : undefined}>
          {busy ? 'Salvando…' : o.move.label}
        </button>
      ) : (
        <span className="pn-btn sm pn-done">
          <CheckIcon />
          Pronto
        </span>
      )}
      {open && o.move?.asksTracking && (
        <form
          className="pn-ord-sheet"
          onSubmit={(e) => {
            e.preventDefault()
            void go()
          }}
        >
          <div className="pn-fld pn-grow">
            <label className="pn-lbl" htmlFor={`pn-trk-${o.id}`}>
              Código de rastreio (opcional)
            </label>
            <input
              id={`pn-trk-${o.id}`}
              className="pn-inp mono"
              maxLength={TRACKING_MAX}
              placeholder="AA123456789BR"
              value={code}
              autoFocus
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <p className="pn-hint">O cliente recebe o código por e-mail.</p>
          </div>
          <div className="pn-acts">
            <button type="button" className="pn-btn outline sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="pn-btn yellow sm" disabled={busy}>
              {busy ? 'Salvando…' : 'Confirmar envio'}
            </button>
          </div>
        </form>
      )}
      <Toast msg={err} tone="red" onDone={() => setErr(null)} />
    </div>
  )
}

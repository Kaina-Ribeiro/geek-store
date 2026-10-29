'use client'

import { BagIcon, CloseIcon } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { brl } from '../lib/catalog'
import { cartTotal, useCart } from '../store/cart'

const FREE_SHIPPING = 299

// Inventory drawer (cart). Checkout with Mercado Pago and Melhor Envio
// arrives in phase 3; until then the CTA explains it instead of faking it.
export function Inventory() {
  const open = useCart((s) => s.drawerOpen)
  const setOpen = useCart((s) => s.openDrawer)
  const lines = useCart(useShallow((s) => Object.values(s.lines)))
  const total = useCart(cartTotal)
  const setQty = useCart((s) => s.setQty)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, setOpen])

  if (!open) return null
  const missing = Math.max(0, FREE_SHIPPING - total)

  return (
    <div className="inv-root theme-light">
      <button className="inv-scrim" aria-label="Fechar inventário" onClick={() => setOpen(false)} />
      <aside className="inv" role="dialog" aria-modal="true" aria-label="Inventário">
        <header className="inv-head">
          <h2 className="dsp">Inventário</h2>
          <span className="mono inv-n">{lines.length === 1 ? '1 item' : `${lines.length} itens`}</span>
          <button ref={closeRef} className="icon-btn" aria-label="Fechar" onClick={() => setOpen(false)}>
            <CloseIcon />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="inv-empty">
            <BagIcon size={40} />
            <b className="dsp">Inventário vazio</b>
            <p>Adicione jogos da loja para montar seu pedido.</p>
            <Link className="btn btn-solid" href="/loja" onClick={() => setOpen(false)}>
              Ver a loja
            </Link>
          </div>
        ) : (
          <>
            <div className="inv-free">
              <span>{missing > 0 ? `Faltam ${brl(missing)} para o frete grátis` : '✓ Frete grátis desbloqueado'}</span>
              <div className="inv-bar">
                <i style={{ width: `${Math.min(100, (total / FREE_SHIPPING) * 100)}%` }} />
              </div>
            </div>
            <ul className="inv-list">
              {lines.map((l) => (
                <li key={l.id} className="inv-line">
                  <Image src={l.cover} alt="" width={62} height={86} />
                  <div>
                    <Link href={l.href} className="inv-title" onClick={() => setOpen(false)}>
                      {l.title}
                    </Link>
                    <small>
                      {l.platform} · {l.condition}
                    </small>
                    <b className="mono">{brl(l.pixValue)}</b>
                  </div>
                  <div className="inv-qty" role="group" aria-label={`Quantidade de ${l.title}`}>
                    <button aria-label="Aumentar" disabled={l.qty >= l.maxQty} onClick={() => setQty(l.id, l.qty + 1)}>
                      +
                    </button>
                    <output className="mono">{l.qty}</output>
                    <button aria-label={l.qty === 1 ? 'Remover' : 'Diminuir'} onClick={() => setQty(l.id, l.qty - 1)}>
                      −
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="inv-foot">
              <div className="inv-total">
                <span>Total no Pix</span>
                <b className="mono">{brl(total)}</b>
              </div>
              <small className="px inv-xp">Você ganha +{Math.round(total)} XP</small>
              <button className="btn btn-yellow inv-cta" disabled title="Checkout chega na fase 3 (Mercado Pago)">
                Finalizar compra
              </button>
              <small className="inv-note">Pagamento por Pix e cartão chega na próxima etapa do projeto.</small>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}

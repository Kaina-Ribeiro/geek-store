'use client'

import { BagIcon, HeartIcon } from '@checkpoint/ui'

import type { CardItem } from '../../lib/data'
import { useCart } from '../../store/cart'
import { toLine } from '../ShopCard'

export function BuyBox({ item }: { item: CardItem }) {
  const inCart = useCart((s) => Boolean(s.lines[item.id]))
  const saved = useCart((s) => Boolean(s.saves[item.gameId]))
  const add = useCart((s) => s.add)
  const toggleSave = useCart((s) => s.toggleSave)
  const openDrawer = useCart((s) => s.openDrawer)

  const cta = (
    <button
      className="btn btn-yellow buy-cta"
      onClick={() => (inCart ? openDrawer(true) : add(toLine(item)))}
    >
      <BagIcon />
      {inCart ? 'Ver no inventário' : 'Adicionar ao inventário'}
    </button>
  )

  return (
    <>
      <div className="buybox theme-dark">
        <div className="buy-top">
          <div>
            <b className="mono buy-price">{item.pix}</b>
            <small>
              <em>no Pix (5% off)</em> · ou {item.installment} sem juros
            </small>
          </div>
          {item.lastUnit && (
            <span className="px buy-last">
              <i />
              Última unidade
            </span>
          )}
        </div>
        <div className="buy-actions">
          {cta}
          <button
            className="buy-heart"
            aria-pressed={saved}
            aria-label={saved ? 'Remover dos save slots' : 'Salvar nos save slots'}
            onClick={() => toggleSave(item.gameId)}
          >
            <HeartIcon size={18} filled={saved} />
          </button>
        </div>
      </div>

      {/* Phone: price and CTA stay pinned above the fold. */}
      <div className="buybar theme-dark">
        <div>
          <b className="mono">{item.pix}</b>
          <small>no Pix · ou {item.installment}</small>
        </div>
        {cta}
      </div>
    </>
  )
}

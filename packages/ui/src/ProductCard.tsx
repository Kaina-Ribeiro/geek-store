import type { ReactNode } from 'react'

import { BagIcon, HeartIcon } from './icons'

export type ProductCardData = {
  title: string
  href: string
  platform: string
  condition: string
  conditionColor: string
  pix: string
  installment: string
  lastUnit: boolean
}

type Props = {
  item: ProductCardData
  /** Cover element (usually next/image) so the app controls loading and sizes. */
  image: ReactNode
  /** Link component from the app (next/link); falls back to <a>. */
  Link?: (p: { href: string; className?: string; 'aria-label'?: string; children: ReactNode }) => ReactNode
  inCart?: boolean
  saved?: boolean
  onAdd?: () => void
  onSave?: () => void
}

const A = (p: { href: string; className?: string; 'aria-label'?: string; children: ReactNode }) => <a {...p} />

export function ProductCard({ item, image, Link = A, inCart = false, saved = false, onAdd, onSave }: Props) {
  return (
    <article className="card">
      <Link href={item.href} className="card-img" aria-label={item.title}>
        {image}
      </Link>
      <button
        type="button"
        className="heart"
        aria-pressed={saved}
        aria-label={`${saved ? 'Remover' : 'Salvar'} ${item.title} ${saved ? 'dos' : 'nos'} save slots`}
        onClick={onSave}
      >
        <HeartIcon filled={saved} />
      </button>
      <div className="card-body">
        <b className="cmeta">
          <i style={{ background: item.conditionColor }} />
          {item.platform} · {item.condition}
        </b>
        <Link href={item.href} className="cname">
          {item.title}
        </Link>
        <div className="cprow">
          <b className="cpix">{item.pix}</b>
          <small className="cpixl">no Pix</small>
        </div>
        <small className="cinst">ou {item.installment} sem juros</small>
        <b className={`cstock ${item.lastUnit ? 'is-last' : 'is-ok'}`}>
          <i />
          {item.lastUnit ? (
            'Só 1 em estoque'
          ) : (
            <>
              <span className="cstock-wide">Em estoque · envio em 24h</span>
              <span className="cstock-narrow">Envio em 24h</span>
            </>
          )}
        </b>
        <button
          type="button"
          className="cbtn"
          aria-pressed={inCart}
          aria-label={`Adicionar ${item.title} ao inventário`}
          onClick={onAdd}
        >
          <BagIcon />
          <span>{inCart ? '✓ No inventário' : 'Adicionar'}</span>
        </button>
      </div>
    </article>
  )
}

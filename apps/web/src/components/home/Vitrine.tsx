'use client'

import { TrustChips } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { PLATFORM_GROUPS, type PlatformGroup } from '../../lib/catalog'
import type { CardItem, Img } from '../../lib/data'
import { SegPill } from '../SegPill'
import { ShopCard } from '../ShopCard'

const SORTS = ['Destaques', 'Menor preço', 'Maior preço', 'Lacrados'] as const

export function Vitrine({
  items,
  total,
  groupCounts,
  retroMini,
}: {
  items: CardItem[]
  total: number
  groupCounts: Record<PlatformGroup, number>
  retroMini: Img[]
}) {
  const [tab, setTab] = useState<'Todos' | PlatformGroup>('Todos')
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Destaques')

  const shown = useMemo(() => {
    let l = items.filter((i) => tab === 'Todos' || i.group === tab)
    if (sort === 'Menor preço') l = [...l].sort((a, b) => a.pixValue - b.pixValue)
    if (sort === 'Maior preço') l = [...l].sort((a, b) => b.pixValue - a.pixValue)
    if (sort === 'Lacrados') l = l.filter((i) => i.conditionValue === 'lacrado')
    return l.slice(0, 11)
  }, [items, tab, sort])

  return (
    <section id="estante" className="vitrine theme-light">
      <i className="blob" style={{ background: '#2D6BF0', left: -160, top: 20 }} />
      <i className="blob" style={{ background: '#FFC61A', right: -140, top: 300 }} />
      <i className="blob" style={{ background: '#E8322B', left: '34%', bottom: -260 }} />
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="vit-head">
          <div>
            <div className="px eyebrow">
              <i className="blink" style={{ background: '#22B04B' }} />
              Vitrine · atualizada hoje
            </div>
            <h2 className="dsp vit-title">Acabou de chegar</h2>
            <TrustChips className="vit-trust" />
          </div>
          {retroMini.length > 0 && (
            <Link href="/#drop" className="mini" aria-label="Garimpo da semana: drop de sexta">
              {retroMini.map((c, k) => (
                <Image key={k} src={c.url} alt="" width={104} height={144} sizes="104px" />
              ))}
              <span className="mini-box">
                <span>
                  <b className="px">Garimpo da semana</b>
                  <small>Achados retrô · sexta 20h</small>
                </span>
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          )}
        </div>

        <div className="toolbar glass">
          <div className="seg" role="group" aria-label="Filtrar por plataforma">
            <SegPill />
            {(['Todos', ...PLATFORM_GROUPS] as const).map((g) => (
              <button key={g} aria-pressed={tab === g} onClick={() => setTab(g)}>
                {g}
                <b className="mono seg-n">{g === 'Todos' ? total : groupCounts[g]}</b>
              </button>
            ))}
          </div>
          <div className="vit-sort">
            <b className="px">Ordenar por</b>
            <div className="seg" role="group" aria-label="Ordenar">
              <SegPill />
              {SORTS.map((s) => (
                <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid-cards vit-grid">
          {shown.map((item, k) => (
            <ShopCard key={item.id} item={item} priority={k < 6} />
          ))}
          <Link href={tab === 'Todos' ? '/loja' : `/loja?grupo=${encodeURIComponent(tab)}`} className="more-card">
            <b className="px" style={{ color: '#FFC61A' }}>
              Ver todos
            </b>
            <b className="dsp" style={{ fontSize: 58, fontStretch: '90%' }}>
              +{total}
            </b>
            <small style={{ color: '#A7A7B0', fontSize: 14, lineHeight: 1.4 }}>
              jogos em estoque, com filtro por plataforma, estado e preço
            </small>
            <b className="more-arrow" aria-hidden="true">
              →
            </b>
          </Link>
        </div>
      </div>
    </section>
  )
}

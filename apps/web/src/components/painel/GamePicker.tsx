'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import { searchGamesAction } from '../../app/(painel)/painel/actions'
import type { PickGame } from '../../lib/painel/hero-store'
import { SearchIcon } from './icons'

// Search box and a grid of covers: only games with something in stock.
export function GamePicker({ selected, onPick }: { selected: number | null; onPick: (g: PickGame) => void }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<PickGame[] | null>(null)

  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      searchGamesAction(q)
        .then((r) => live && setList(r))
        .catch(() => live && setList([]))
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])

  return (
    <div className="pn-picker">
      <label className="pn-search">
        <SearchIcon />
        <span className="sr-only">Buscar jogo</span>
        <input className="pn-inp" type="search" placeholder="Buscar pelo nome" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {list === null ? (
        <p className="pn-hint">Carregando os jogos…</p>
      ) : list.length === 0 ? (
        <p className="pn-hint">Nenhum jogo com estoque{q ? ` com “${q}”` : ''}.</p>
      ) : (
        <div className="pn-picks">
          {list.map((g) => (
            <button
              key={g.id}
              type="button"
              className="pn-pick"
              aria-pressed={selected === g.id}
              aria-label={`${g.info.title} (${g.info.platform})`}
              title={`${g.info.title} · ${g.info.platform}`}
              onClick={() => onPick(g)}
            >
              <Image src={g.info.thumb.url} alt="" width={g.info.thumb.width} height={g.info.thumb.height} sizes="72px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

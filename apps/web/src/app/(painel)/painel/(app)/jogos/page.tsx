import Image from 'next/image'
import Link from 'next/link'

import { PlusIcon, SearchIcon } from '../../../../../components/painel/icons'
import { brl } from '../../../../../lib/catalog'
import { listGamesForPanel } from '../../../../../lib/painel/game-store'
import { requireStaff } from '../../../../../lib/painel/session'
import { getClient } from '../../../../../lib/payload'

export const metadata = { title: 'Jogos' }

const BADGE = { esgotado: 'Esgotado', escondido: 'Escondido' } as const

export default async function JogosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireStaff()
  const { q = '' } = await searchParams
  const games = await listGamesForPanel(await getClient(), user, q)

  return (
    <div className="pn-page">
      <div className="pn-head-row">
        <div className="pn-head">
          <span className="px pn-crumb">Início / Jogos</span>
          <h1 className="dsp pn-h1">Jogos</h1>
          <p className="pn-lead">Toque num jogo para mudar preço, cópias ou foto.</p>
        </div>
        <Link className="pn-btn yellow" href="/painel/jogos/novo">
          <PlusIcon />
          Adicionar jogo
        </Link>
      </div>

      <form className="pn-search pn-search-wide" role="search">
        <SearchIcon />
        <label className="sr-only" htmlFor="pn-q">
          Buscar jogo
        </label>
        <input id="pn-q" className="pn-inp" type="search" name="q" defaultValue={q} placeholder="Buscar pelo nome" />
      </form>

      {games.length === 0 ? (
        <div className="pn-card pn-empty">
          <b>{q ? `Nenhum jogo com “${q}”.` : 'Nenhum jogo ainda.'}</b>
          <Link className="pn-link" href="/painel/jogos/novo">
            Adicionar um jogo
          </Link>
        </div>
      ) : (
        <div className="pn-games">
          {games.map((g) => (
            <Link key={g.id} href={`/painel/jogos/${g.id}`} className={`pn-game${g.state === 'ok' ? '' : ' dim'}`}>
              <span className="pn-game-img">
                <Image src={g.cover.url} alt="" width={g.cover.width} height={g.cover.height} sizes="(max-width: 767px) 45vw, 200px" />
                {g.state !== 'ok' && <span className={`pn-tagb${g.state === 'escondido' ? ' grey' : ''}`}>{BADGE[g.state]}</span>}
              </span>
              <span className="pn-game-txt">
                <small>{g.platform}</small>
                <b>{g.title}</b>
                <span className="mono">{g.minPrice != null ? `a partir de ${brl(g.minPrice)}` : 'sem cópia à venda'}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

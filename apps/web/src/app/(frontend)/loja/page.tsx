import type { Metadata } from 'next'
import Link from 'next/link'

import { SearchIcon, TrustChips } from '@checkpoint/ui'

import { SegPill } from '../../../components/SegPill'
import { ShopCard } from '../../../components/ShopCard'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'
import { getShop, PRICE_RANGES, SORTS, type ShopFilters } from '../../../lib/data'

export const metadata: Metadata = {
  title: 'Loja',
  description: 'Todos os jogos em estoque, com filtro por plataforma, estado e preço.',
}

type SP = Promise<Record<string, string | string[] | undefined>>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined

// Every filter lives in the URL, so results can be shared and indexed.
export default async function LojaPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f: ShopFilters = {
    grupo: one(sp.grupo),
    plataforma: one(sp.plataforma),
    estado: one(sp.estado),
    preco: one(sp.preco),
    ordem: one(sp.ordem),
    q: one(sp.q),
  }
  const shop = await getShop(f)
  const focusSearch = one(sp.busca) === '1'

  const href = (patch: Partial<ShopFilters>) => {
    const next = { ...f, ...patch }
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v)
    const s = qs.toString()
    return s ? `/loja?${s}` : '/loja'
  }
  const hasFilters = Boolean(f.grupo || f.plataforma || f.estado || f.preco || f.q)

  return (
    <>
      <SiteHeader />
      <main className="theme-light shop">
        <section className="shop-band theme-dark">
          <div className="wrap">
            <div className="px eyebrow">
              <i className="blink" style={{ background: '#22B04B' }} />
              {shop.total} jogos testados · atualizado hoje
            </div>
            <h1 className="dsp shop-title">Loja</h1>
            <form className="shop-search" action="/loja" role="search">
              {f.grupo && <input type="hidden" name="grupo" value={f.grupo} />}
              <SearchIcon />
              <label htmlFor="q" className="sr-only">
                Buscar jogo ou console
              </label>
              <input id="q" name="q" defaultValue={f.q} placeholder="Zelda, PS2, lacrado…" autoFocus={focusSearch} />
              <button className="btn btn-yellow" type="submit">
                Buscar
              </button>
            </form>
          </div>
        </section>

        <div className="wrap shop-body">
          <nav className="toolbar glass shop-toolbar" aria-label="Filtros">
            <div className="seg" aria-label="Plataforma">
              <SegPill />
              <Link href={href({ grupo: undefined, plataforma: undefined })} aria-current={!f.grupo && !f.plataforma}>
                Todos<b className="mono seg-n">{shop.total}</b>
              </Link>
              {shop.groups.map((g) => (
                <Link key={g.value} href={href({ grupo: g.value, plataforma: undefined })} aria-current={f.grupo === g.value}>
                  {g.value}
                  <b className="mono seg-n">{g.count}</b>
                </Link>
              ))}
            </div>
            <div className="seg" aria-label="Ordenar">
              <SegPill />
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={href({ ordem: s.value === 'novos' ? undefined : s.value })}
                  aria-current={(f.ordem || 'novos') === s.value}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="shop-chips" aria-label="Estado e preço">
            {shop.conditions.map((c) => (
              <Link
                key={c.value}
                className="chip"
                href={href({ estado: f.estado === c.value ? undefined : c.value })}
                aria-current={f.estado === c.value}
              >
                <i style={{ background: c.color }} />
                {c.label}
                <b className="mono">{c.count}</b>
              </Link>
            ))}
            <span className="chip-sep" aria-hidden="true" />
            {PRICE_RANGES.map((r) => (
              <Link
                key={r.value}
                className="chip"
                href={href({ preco: f.preco === r.value ? undefined : r.value })}
                aria-current={f.preco === r.value}
              >
                {r.label}
              </Link>
            ))}
            {hasFilters && (
              <Link className="chip chip-clear" href="/loja">
                Limpar filtros
              </Link>
            )}
          </div>

          <p className="mono shop-count" aria-live="polite">
            {shop.items.length === 1 ? '1 jogo' : `${shop.items.length} jogos`}
            {f.q ? ` para “${f.q}”` : ''}
          </p>

          {shop.items.length > 0 ? (
            <div className="grid-cards">
              {shop.items.map((item, k) => (
                <ShopCard key={item.id} item={item} priority={k < 6} />
              ))}
            </div>
          ) : (
            <div className="shop-empty">
              <b className="dsp">Nada por aqui</b>
              <p>Nenhum jogo com esses filtros. Tente limpar o estado, o preço ou a busca.</p>
              <Link className="btn btn-solid" href="/loja">
                Ver todos os jogos
              </Link>
            </div>
          )}

          <TrustChips className="shop-trust" />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

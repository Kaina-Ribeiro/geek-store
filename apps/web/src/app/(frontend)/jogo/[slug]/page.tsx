import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TruckIcon } from '@checkpoint/ui'

import { BuyBox } from '../../../../components/product/BuyBox'
import { Gallery } from '../../../../components/product/Gallery'
import { ShopCard } from '../../../../components/ShopCard'
import { SiteFooter } from '../../../../components/SiteFooter'
import { SiteHeader } from '../../../../components/SiteHeader'
import { brl } from '../../../../lib/catalog'
import { getProduct, getRelated } from '../../../../lib/data'

type Params = Promise<{ slug: string }>
type SP = Promise<Record<string, string | string[] | undefined>>

export const revalidate = 60

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProduct(slug)
  if (!p) return { title: 'Jogo não encontrado' }
  return {
    title: `${p.game.title} (${p.game.platform})`,
    description: p.game.description || `${p.game.title} para ${p.game.platform}, com laudo Checkpoint.`,
    openGraph: { images: [p.game.cover.url] },
  }
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params
  const sp = await searchParams
  const p = await getProduct(slug)
  if (!p) notFound()

  const wanted = typeof sp.estado === 'string' ? sp.estado : undefined
  const current =
    p.variants.find((v) => v.value === wanted && v.available) ?? p.variants.find((v) => v.available) ?? null
  const copy = current?.copy ?? null
  const related = await getRelated(p.game.group, p.game.id)
  const laudo = current?.laudo
  const sealed = current?.value === 'lacrado'
  const checks = sealed
    ? [
        ['Disco lacrado', true],
        ['Capa original', true],
        ['Manual e encarte', true],
        ['Lacre de fábrica', true],
      ]
    : [
        ['Roda do boot ao save', laudo?.boot ?? false],
        ['Capa original', laudo?.capa ?? false],
        ['Manual e encarte', laudo?.manual ?? false],
        ['Higienizado', laudo?.higienizado ?? false],
      ]
  const tradeIn = copy ? Math.round(copy.pixValue * 0.69 * 100) / 100 : 0

  return (
    <>
      <SiteHeader />
      <main className="theme-light pdp">
        <div className="wrap">
          <nav className="px crumbs" aria-label="Você está em">
            <Link href="/">Início</Link>
            <span>/</span>
            <Link href={`/loja?grupo=${encodeURIComponent(p.game.group)}`}>{p.game.group}</Link>
            <span>/</span>
            <span aria-current="page">{p.game.title}</span>
          </nav>

          <div className="pdp-grid">
            <Gallery
              title={p.game.title}
              cover={p.game.cover}
              photos={current?.photos ?? []}
              glow={p.game.glow}
              caption={
                current
                  ? sealed
                    ? 'Lacrado de fábrica · 90 dias de garantia'
                    : `Laudo ${current.label}${laudo?.testedOn ? ` · testado no ${laudo.testedOn}` : ''} · 90 dias de garantia`
                  : 'Sem estoque no momento'
              }
            />

            <div className="pdp-info">
              <div className="pdp-tags">
                <span className="tag">
                  <i style={{ background: p.game.platformColor }} />
                  {p.game.platform}
                </span>
                {current && (
                  <span className="tag">
                    <i style={{ background: current.color }} />
                    {current.label}
                  </span>
                )}
                {p.game.ageRating && <span className="tag">{p.game.ageRating}</span>}
                {p.game.year && <span className="tag">{p.game.year}</span>}
              </div>
              <h1 className="dsp pdp-title">{p.game.title}</h1>
              {p.game.description && <p className="pdp-desc">{p.game.description}</p>}

              <section className="laudo-card" aria-label="Laudo Checkpoint">
                <header>
                  <span className="px">Laudo Checkpoint</span>
                  <b className="pill-green">90 dias de garantia</b>
                  <b className="dsp laudo-grade">{current?.label ?? '—'}</b>
                </header>
                <ul>
                  {checks.map(([t, ok]) => (
                    <li key={t as string} className={ok ? '' : 'is-off'}>
                      <i />
                      {t}
                    </li>
                  ))}
                </ul>
                {!sealed && (
                  <div className="laudo-photos">
                    {current && current.photos.length > 0
                      ? null
                      : ['Foto do disco', 'Foto da capa', 'Foto do manual', 'Foto da lombada'].map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                  </div>
                )}
                {laudo?.surface && <p className="laudo-surface">Superfície: {laudo.surface}</p>}
              </section>

              <div>
                <span className="px pdp-label">Escolha o estado</span>
                <div className="variants">
                  {p.variants.map((v) =>
                    v.available && v.copy ? (
                      <Link
                        key={v.value}
                        href={`/jogo/${p.game.slug}?estado=${v.value}`}
                        className="variant"
                        aria-current={current?.value === v.value}
                        scroll={false}
                      >
                        <b>
                          <i style={{ background: v.color }} />
                          {v.label}
                        </b>
                        <span className="mono">{v.copy.pix}</span>
                      </Link>
                    ) : (
                      <span key={v.value} className="variant is-off" aria-disabled="true">
                        <b>
                          <i style={{ background: v.color }} />
                          {v.label}
                        </b>
                        <span className="mono">Indisponível</span>
                      </span>
                    ),
                  )}
                </div>
              </div>

              {copy ? <BuyBox item={copy} /> : <p className="pdp-out">Esse jogo está sem estoque no momento.</p>}

              {copy && (
                <p className="trade-hint">
                  <b>Tem um usado parado?</b> Pagamos até <b className="mono">{brl(tradeIn)}</b> em crédito pelo seu
                  jogo na troca. <Link href="/#troca">Simular troca →</Link>
                </p>
              )}

              <div className="ship-box">
                <TruckIcon />
                <span>
                  <b>Envio para todo o Brasil ou retirada em Taubaté</b>
                  <small>O cálculo de frete por CEP (Correios e Jadlog) chega junto com o checkout.</small>
                </span>
              </div>
              {copy && <small className="px pdp-xp">Você ganha +{Math.round(copy.pixValue)} XP com esta compra</small>}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="related theme-dark">
            <div className="related-head">
              <h2 className="dsp">Quem levou, levou também</h2>
              <Link href="/loja">Voltar para a loja →</Link>
            </div>
            <div className="related-grid theme-light">
              {related.map((r) => (
                <ShopCard key={r.id} item={r} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

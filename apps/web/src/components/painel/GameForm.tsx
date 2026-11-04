'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { saveGameAction } from '../../app/(painel)/painel/actions'
import { brl, conditionOf, CONDITIONS, installments, pixPrice, PLATFORMS, platformOf } from '../../lib/catalog'
import type { CardItem, Img } from '../../lib/data'
import { parsePrice, type CopyDraft, type GameDraft } from '../../lib/painel/game-form'
import { ShopCard } from '../ShopCard'
import { Switch } from './controls'
import { CopyRow } from './CopyRow'
import { PlusIcon } from './icons'
import { ImageDrop } from './ImageDrop'
import { PublishBar, type BarStatus } from './PublishBar'
import { Confirm, FieldError, Toast } from './ui'

const EMPTY: GameDraft = {
  title: '',
  platform: '',
  coverId: null,
  year: '',
  ageRating: '',
  genre: '',
  description: '',
  showInHero: false,
  copies: [{ condition: 'lacrado', price: '', stock: 1, active: true }],
}

const FALLBACK: Img = { url: '/brand/cover-fallback.svg', width: 600, height: 800, alt: '' }

// The card the shopper will see: cheapest copy for sale right now.
function previewCard(d: GameDraft, cover: Img): CardItem | null {
  const live = d.copies.filter((c) => c.active && !c.sold && parsePrice(c.price))
  const best = [...live].sort((a, b) => parsePrice(a.price)! - parsePrice(b.price)!)[0]
  const plat = platformOf(d.platform || 'ps5')
  const price = best ? parsePrice(best.price)! : 0
  const cond = conditionOf(best?.condition || 'lacrado')
  const inst = installments(price)
  return {
    id: -1,
    gameId: -1,
    slug: 'previa',
    href: '#',
    title: d.title.trim() || 'Nome do jogo',
    platform: d.platform ? plat.label : 'Plataforma',
    platformColor: plat.color,
    group: plat.group,
    condition: cond.label,
    conditionValue: cond.value,
    conditionColor: cond.color,
    price,
    pixValue: pixPrice(price),
    pix: brl(pixPrice(price)),
    installment: `${inst.n}x de ${brl(inst.value)}`,
    stock: best?.stock ?? 0,
    lastUnit: best?.stock === 1,
    cover,
    glow: '#2D6BF0',
    ageRating: d.ageRating.trim() || null,
    createdAt: new Date(0).toISOString(),
  }
}

export function GameForm({ initial, images: initialImages, saved = false }: { initial?: GameDraft; images?: Record<number, Img>; saved?: boolean }) {
  const router = useRouter()
  const start = initial ?? EMPTY
  const [d, setD] = useState<GameDraft>(start)
  const [images, setImages] = useState<Record<number, Img>>(initialImages ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [dup, setDup] = useState<{ msg: string; id: number } | null>(null)
  const [hideAsk, setHideAsk] = useState(false)
  const [touched, setTouched] = useState(false)

  const edit = d.id != null
  const set = (p: Partial<GameDraft>) => {
    setD((x) => ({ ...x, ...p }))
    setTouched(true)
  }
  const setCopy = (i: number, c: CopyDraft) => set({ copies: d.copies.map((x, j) => (j === i ? c : x)) })
  const cover = d.coverId != null ? (images[d.coverId] ?? null) : null
  const card = useMemo(() => previewCard(d, cover ?? FALLBACK), [d, cover])
  const live = d.copies.filter((c) => c.active && !c.sold)
  const units = live.reduce((a, c) => a + (c.condition === 'lacrado' ? c.stock : 1), 0)

  const status: BarStatus = saved && !touched ? 'published' : edit && !touched ? 'clean' : 'dirty'
  const text =
    status === 'published'
      ? 'Publicado! Já está na loja.'
      : edit
        ? status === 'clean'
          ? 'Igual ao que está na loja agora.'
          : 'Você mexeu. Só muda na loja quando publicar.'
        : 'Ainda não está na loja. Confira e publique.'

  const save = async (draft = d) => {
    setBusy(true)
    setDup(null)
    try {
      const r = await saveGameAction(draft)
      if (r.ok) {
        setErrors({})
        router.push(`/painel/jogos/${r.id}?salvo=${Date.now().toString(36)}`)
        return
      }
      if (r.session) return router.push(`/painel/entrar?volta=${encodeURIComponent(edit ? `/painel/jogos/${d.id}` : '/painel/jogos/novo')}`)
      if (r.existingId) return setDup({ msg: r.error, id: r.existingId })
      setErrors(r.fields || {})
      setToast(r.error)
    } catch {
      setToast('Não deu para salvar. O que você digitou continua aqui, tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pn-page">
      <div className="pn-head">
        <span className="px pn-crumb">
          <Link href="/painel/jogos">Jogos</Link> / {edit ? 'Editar jogo' : 'Adicionar jogo'}
        </span>
        <h1 className="dsp pn-h1">{edit ? d.title || 'Editar jogo' : 'Adicionar um jogo'}</h1>
        <p className="pn-lead">Preencha os 4 passos. Ao lado aparece o jogo do jeito que o cliente vai ver.</p>
      </div>

      {dup && (
        <p className="pn-alert" role="alert">
          {dup.msg}{' '}
          <Link className="pn-link" href={`/painel/jogos/${dup.id}`}>
            Abrir o jogo
          </Link>
        </p>
      )}

      <div className="pn-split game">
        <div className="pn-form">
          <section className="pn-card pn-stack">
            <h2 className="pn-step">
              <span className="pn-stepn">1</span>Foto da capa
            </h2>
            <ImageDrop
              image={cover}
              alt={`Capa de ${d.title || 'jogo'}`}
              label="Arraste a capa aqui"
              sub="ou toque para escolher (no celular, pode tirar uma foto)"
              onSaved={(id, image) => {
                setImages((m) => ({ ...m, [id]: image }))
                set({ coverId: id })
              }}
            />
            <FieldError msg={errors.coverId} />
          </section>

          <section className="pn-card pn-stack">
            <h2 className="pn-step">
              <span className="pn-stepn">2</span>Nome e plataforma
            </h2>
            <div className="pn-fld">
              <label className="pn-lbl" htmlFor="pn-name">
                Nome do jogo
              </label>
              <input id="pn-name" className="pn-inp" value={d.title} aria-invalid={Boolean(errors.title)} onChange={(e) => set({ title: e.target.value })} />
              <FieldError msg={errors.title} />
            </div>
            <div className="pn-fld">
              <span className="pn-lbl">Plataforma</span>
              <div role="group" aria-label="Plataforma" className="pn-chips">
                {PLATFORMS.map((p) => (
                  <button key={p.value} type="button" className="pn-chip" aria-pressed={d.platform === p.value} onClick={() => set({ platform: p.value })}>
                    <i className="pn-dot" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
              <FieldError msg={errors.platform} />
            </div>
            <details className="pn-more">
              <summary>Mais detalhes (opcional)</summary>
              <div className="pn-cp-row">
                <div className="pn-fld">
                  <label className="pn-lbl" htmlFor="pn-year">
                    Ano
                  </label>
                  <input id="pn-year" className="pn-inp mono pn-w-sm" inputMode="numeric" maxLength={4} value={d.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="pn-fld pn-grow">
                  <label className="pn-lbl" htmlFor="pn-age">
                    Classificação
                  </label>
                  <input id="pn-age" className="pn-inp" placeholder="16 anos" value={d.ageRating} onChange={(e) => set({ ageRating: e.target.value })} />
                </div>
                <div className="pn-fld pn-grow">
                  <label className="pn-lbl" htmlFor="pn-genre">
                    Gênero
                  </label>
                  <input id="pn-genre" className="pn-inp" placeholder="Aventura" value={d.genre} onChange={(e) => set({ genre: e.target.value })} />
                </div>
              </div>
              <FieldError msg={errors.year} />
              <div className="pn-fld">
                <label className="pn-lbl" htmlFor="pn-desc">
                  Descrição
                </label>
                <textarea id="pn-desc" className="pn-inp" rows={4} value={d.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
            </details>
          </section>

          <section className="pn-card pn-stack">
            <h2 className="pn-step">
              <span className="pn-stepn">3</span>Quantas cópias você tem
            </h2>
            <p className="pn-hint">Uma linha para cada estado. Lacrado iguais: é só aumentar a quantidade. Usado: uma linha por cópia, com o laudo dela.</p>
            <FieldError msg={errors.copies} />
            {d.copies.map((c, i) => (
              <CopyRow
                key={c.id ?? `n${i}`}
                n={i + 1}
                copy={c}
                images={images}
                error={errors[`copies.${i}.price`]}
                gameTitle={d.title}
                onChange={(x) => setCopy(i, x)}
                onRemove={() => set({ copies: d.copies.filter((_, j) => j !== i) })}
                onImage={(id, image) => setImages((m) => ({ ...m, [id]: image }))}
              />
            ))}
            <button type="button" className="pn-chip dashed" onClick={() => set({ copies: [...d.copies, { condition: 'lacrado', price: '', stock: 1, active: true }] })}>
              <PlusIcon />
              Tenho outra cópia
            </button>
          </section>

          <section className="pn-card pn-row-card">
            <div className="pn-stack-sm">
              <h2 className="pn-step">
                <span className="pn-stepn">4</span>Mostrar no banner da home?
              </h2>
              <p className="pn-hint">Liga se esse jogo é destaque da semana. Dá para mudar depois.</p>
            </div>
            <Switch on={d.showInHero} onChange={(v) => set({ showInHero: v })} label="Mostrar no banner da home" />
          </section>

          {edit && (
            <section className="pn-card pn-row-card">
              <div className="pn-stack-sm">
                <b>Esconder da loja</b>
                <p className="pn-hint">Tira todas as cópias da loja. Nada é apagado: dá para voltar depois.</p>
              </div>
              <button type="button" className="pn-btn outline sm" onClick={() => setHideAsk(true)} disabled={!live.length}>
                Esconder
              </button>
            </section>
          )}
        </div>

        <div className="pn-side-pv">
          <div className="pn-pv pn-stack">
            <span className="pn-pv-title">
              <i className="pn-sdot" style={{ background: '#22B04B' }} />
              Assim aparece na loja
            </span>
            <div className="pn-gpv theme-light" inert>
              <div className="pn-gpv-card">{card && <ShopCard item={card} />}</div>
              <div className="pn-gpv-pdp">
                <span className="px">Na página do jogo</span>
                <b className="dsp">{d.title.trim() || 'Nome do jogo'}</b>
                <div className="pn-gpv-tags">
                  {live.map((c, i) => {
                    const cond = CONDITIONS.find((x) => x.value === c.condition)!
                    const p = parsePrice(c.price)
                    return (
                      <span key={i}>
                        <i className="pn-dot" style={{ background: cond.color }} />
                        {cond.label} · {p ? brl(p) : 'sem preço'}
                      </span>
                    )
                  })}
                </div>
                <span className="pn-gpv-total">{units === 1 ? '1 unidade à venda' : `${units} unidades à venda`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublishBar
        status={status}
        text={text}
        onReset={() => router.push('/painel/jogos')}
        resetLabel="Cancelar"
        onPublish={() => void save()}
        publishLabel="Publicar jogo"
        busy={busy}
      />

      <Confirm open={hideAsk} title="Esconder este jogo da loja?" text="Todas as cópias saem da loja. Nada é apagado." onClose={() => setHideAsk(false)}>
        <button type="button" className="pn-btn outline sm" onClick={() => setHideAsk(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className="pn-btn dark sm"
          onClick={() => {
            setHideAsk(false)
            const next = { ...d, showInHero: false, copies: d.copies.map((c) => ({ ...c, active: false })) }
            setD(next)
            void save(next)
          }}
        >
          Esconder
        </button>
      </Confirm>

      <Toast msg={toast} tone="red" onDone={() => setToast(null)} />
    </div>
  )
}

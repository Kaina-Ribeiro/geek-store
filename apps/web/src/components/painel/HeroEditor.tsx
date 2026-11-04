'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { publishHeroAction } from '../../app/(painel)/painel/actions'
import { PLATFORMS } from '../../lib/catalog'
import type { Featured, Img } from '../../lib/data'
import { HERO_LIMITS, resolveHeroSlides, type HeroDraft, type HeroSlideInput } from '../../lib/painel/hero'
import type { HeroLoad, PickGame, SlideGameInfo } from '../../lib/painel/hero-store'
import { Hero } from '../home/Hero'
import { GamePicker } from './GamePicker'
import { DownIcon, EyeIcon, EyeOffIcon, PlusIcon, TrashIcon, UpIcon } from './icons'
import { ImageDrop } from './ImageDrop'
import { LivePreview, type Device } from './LivePreview'
import { PublishBar, type BarStatus } from './PublishBar'
import { Confirm, Counter, FieldError, Toast } from './ui'

type Stored = { draft: HeroDraft; basedOn: string; savedAt: number }

const DESTINOS = [
  { value: '/loja', label: 'A loja toda' },
  ...PLATFORMS.map((p) => ({ value: `/loja?plataforma=${p.value}`, label: `Uma plataforma: ${p.label}` })),
  { value: '/drop', label: 'Drop de sexta' },
]

const same = (a: HeroDraft, b: HeroDraft) => JSON.stringify(a) === JSON.stringify(b)
const pad = (n: number) => String(n).padStart(2, '0')
const STATUS_TEXT: Record<BarStatus, string> = {
  clean: 'Igual ao que está no site agora.',
  dirty: 'Você mexeu. Só muda no site quando publicar.',
  published: 'Publicado! Já está no site.',
}

// Private mode or blocked storage: the draft then lives only in this tab.
function saveDraft(key: string, draft: HeroDraft, basedOn: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ draft, basedOn, savedAt: Date.now() } satisfies Stored))
  } catch {}
}

export function HeroEditor({ userId, initial }: { userId: number; initial: HeroLoad }) {
  const router = useRouter()
  const key = `painel:hero:${userId}`
  const [published, setPublished] = useState(initial.draft)
  const [draft, setDraft] = useState(initial.draft)
  const [basedOn, setBasedOn] = useState(initial.updatedAt)
  const [justPublished, setJustPublished] = useState(false)
  const [sel, setSel] = useState(0)
  const [adding, setAdding] = useState(false)
  const [device, setDevice] = useState<Device>('desk')
  const [showPreview, setShowPreview] = useState(false)
  const [featured, setFeatured] = useState<Record<number, Featured>>(initial.preview.featuredByGame)
  const [images, setImages] = useState<Record<number, Img>>(initial.preview.images)
  const [games, setGames] = useState<Record<number, SlideGameInfo>>(initial.preview.games)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone?: 'red' } | null>(null)
  const [ask, setAsk] = useState<null | 'stale-load' | 'stale-publish'>(null)
  const [delIdx, setDelIdx] = useState<number | null>(null)

  // Restore a draft left in this browser (closing the tab loses nothing).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const s = JSON.parse(raw) as Stored
      if (!s?.draft || same(s.draft, initial.draft)) return localStorage.removeItem(key)
      setDraft(s.draft) // eslint-disable-line react-hooks/set-state-in-effect -- one-time restore from storage
      if (s.basedOn !== initial.updatedAt) setAsk('stale-load')
      else setBasedOn(s.basedOn)
    } catch {
      // Storage blocked or broken: start from what is published.
    }
  }, [key, initial])

  const change = (next: HeroDraft) => {
    setDraft(next)
    setJustPublished(false)
    saveDraft(key, next, basedOn)
  }
  const setSlides = (fn: (s: HeroSlideInput[]) => HeroSlideInput[]) => change({ ...draft, slides: fn(draft.slides.map((x) => ({ ...x }))) })
  const patchSlide = (i: number, p: Partial<HeroSlideInput>) => setSlides((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)))

  const dirty = !same(draft, published)

  // New server data (after a refresh): adopt it when it came from someone
  // else and there is no draft in progress. Our own publish already matches.
  const [seen, setSeen] = useState(initial.updatedAt)
  if (initial.updatedAt !== seen) {
    setSeen(initial.updatedAt)
    setFeatured((m) => ({ ...m, ...initial.preview.featuredByGame }))
    setImages((m) => ({ ...m, ...initial.preview.images }))
    setGames((m) => ({ ...m, ...initial.preview.games }))
    if (initial.updatedAt !== basedOn && !dirty) {
      setPublished(initial.draft)
      setDraft(initial.draft)
      setBasedOn(initial.updatedAt)
    }
  }
  const status: BarStatus = justPublished && !dirty ? 'published' : dirty ? 'dirty' : 'clean'
  const idx = Math.min(sel, Math.max(0, draft.slides.length - 1))
  const cur = draft.slides[idx] as HeroSlideInput | undefined

  // What the site would show: visible slides; the selected one if hidden.
  const fMap = useMemo(() => new Map(Object.entries(featured).map(([k, v]) => [Number(k), v])), [featured])
  const iMap = useMemo(() => new Map(Object.entries(images).map(([k, v]) => [Number(k), v])), [images])
  const preview = useMemo(() => {
    if (cur && !cur.visible) return { slides: resolveHeroSlides([{ ...cur, visible: true }], fMap, iMap), index: 0, hidden: true }
    const visible = draft.slides.map((s, i) => ({ s, i })).filter(({ s }) => s.visible)
    const shown = visible.filter(({ s }) => resolveHeroSlides([s], fMap, iMap).length)
    const at = shown.findIndex(({ i }) => i === idx)
    return { slides: resolveHeroSlides(draft.slides, fMap, iMap), index: Math.max(0, at), hidden: false }
  }, [draft.slides, cur, idx, fMap, iMap])

  const discard = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {}
    setDraft(published)
    setBasedOn(initial.updatedAt)
    setErrors({})
    setAsk(null)
    router.refresh()
  }, [key, published, initial.updatedAt, router])

  const publish = async (force = false) => {
    setBusy(true)
    setAsk(null)
    try {
      const r = await publishHeroAction(draft, basedOn, force)
      if (r.ok) {
        try {
          localStorage.removeItem(key)
        } catch {}
        setPublished(draft)
        setBasedOn(r.updatedAt)
        setErrors({})
        setJustPublished(true)
        return
      }
      if (r.session) return router.push(`/painel/entrar?volta=${encodeURIComponent('/painel/banner')}`)
      if (r.stale) return setAsk('stale-publish')
      setErrors(r.fields || {})
      setToast({ msg: r.error, tone: 'red' })
    } catch {
      setToast({ msg: 'Não deu para publicar. Seu rascunho está guardado, tente de novo.', tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const addSlide = (kind: 'game' | 'campaign') => {
    const s: HeroSlideInput =
      kind === 'game' ? { kind, game: null, visible: true } : { kind, campaignTitle: 'Nova campanha', campaignLink: '/loja', visible: true }
    setSlides((list) => [...list, s])
    setSel(draft.slides.length)
    setAdding(false)
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= draft.slides.length) return
    setSlides((s) => {
      ;[s[i], s[j]] = [s[j], s[i]]
      return s
    })
    if (sel === i) setSel(j)
    else if (sel === j) setSel(i)
  }
  const pickGame = (g: PickGame) => {
    setFeatured((m) => ({ ...m, [g.id]: g.featured }))
    setGames((m) => ({ ...m, [g.id]: g.info }))
    patchSlide(idx, { game: g.id })
  }

  const err = (k: string) => errors[k]
  const L = HERO_LIMITS
  const full = draft.slides.length >= L.slides

  return (
    <div className="pn-page">
      <div className="pn-head">
        <span className="px pn-crumb">Início / Banner da home</span>
        <h1 className="dsp pn-h1">Banner da home</h1>
        <p className="pn-lead">Mexa à esquerda e veja o site mudar à direita. Só vai pro ar quando você apertar Publicar.</p>
      </div>

      <div className="pn-split">
        <div className="pn-form">
          <section className="pn-card pn-stack">
            <h2 className="pn-step">
              <span className="pn-stepn">1</span>Slides do topo
            </h2>
            <p className="pn-hint">Eles passam um depois do outro. Use as setas para mudar a ordem e o olho para esconder.</p>
            <FieldError msg={err('slides')} />
            <div className="pn-slides">
              {draft.slides.length === 0 && <p className="pn-hint">Sem slides: o topo do site mostra só o texto.</p>}
              {draft.slides.map((s, i) => {
                const info = s.kind === 'game' && s.game != null ? games[s.game] : null
                const noStock = s.kind === 'game' && s.game != null && !featured[s.game]
                const name = s.kind === 'game' ? info?.title || 'Escolha um jogo' : s.campaignTitle?.trim() || 'Campanha'
                const kind =
                  s.kind === 'game'
                    ? `Jogo${info ? ` · ${info.platform}` : ''}${s.visible ? '' : ' · escondido'}`
                    : `Campanha${s.visible ? '' : ' · escondida'}`
                const slideErr = err(`slides.${i}.game`) || err(`slides.${i}.campaignTitle`) || err(`slides.${i}.campaignLink`)
                return (
                  <div key={i} className={`pn-sl${i === idx ? ' sel' : ''}${s.visible ? '' : ' off'}`}>
                    <span className="mono pn-sl-n">{pad(i + 1)}</span>
                    <button
                      type="button"
                      className="pn-slm"
                      onClick={() => {
                        setSel(i)
                        setAdding(false)
                      }}
                      aria-label={`Editar slide ${pad(i + 1)}: ${name}`}
                      aria-current={i === idx ? 'true' : undefined}
                    >
                      {s.kind === 'game' ? (
                        info ? (
                          <Image className="pn-slthumb" src={info.thumb.url} alt="" width={52} height={66} sizes="52px" />
                        ) : (
                          <span className="pn-slthumb pn-slempty">?</span>
                        )
                      ) : s.campaignImage != null && images[s.campaignImage] ? (
                        <Image className="pn-slthumb" src={images[s.campaignImage].url} alt="" width={52} height={66} sizes="52px" />
                      ) : (
                        <span className="pn-slcamp">{name}</span>
                      )}
                      <span className="pn-sltxt">
                        <b>{name}</b>
                        <small>{kind}</small>
                        {noStock && <em className="pn-warn">Sem estoque: não aparece no site</em>}
                        {slideErr && <em className="pn-warn red">{slideErr}</em>}
                      </span>
                    </button>
                    <div className="pn-sl-acts">
                      <button type="button" className="pn-ib" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                        <UpIcon />
                      </button>
                      <button
                        type="button"
                        className="pn-ib"
                        onClick={() => move(i, 1)}
                        disabled={i === draft.slides.length - 1}
                        aria-label="Descer"
                      >
                        <DownIcon />
                      </button>
                      <button
                        type="button"
                        className="pn-ib"
                        onClick={() => patchSlide(i, { visible: !s.visible })}
                        aria-label={s.visible ? 'Esconder este slide' : 'Mostrar este slide'}
                        aria-pressed={!s.visible}
                      >
                        {s.visible ? <EyeIcon /> : <EyeOffIcon />}
                      </button>
                      <button type="button" className="pn-ib danger" onClick={() => setDelIdx(i)} aria-label="Apagar slide">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {adding ? (
              <div className="pn-addkind">
                <button type="button" className="pn-kind" onClick={() => addSlide('game')}>
                  <b>Um jogo da loja</b>
                  <span>Pega foto e preço sozinho</span>
                </button>
                <button type="button" className="pn-kind" onClick={() => addSlide('campaign')}>
                  <b>Uma campanha</b>
                  <span>Sua imagem e um texto</span>
                </button>
              </div>
            ) : (
              <button type="button" className="pn-chip dashed" onClick={() => setAdding(true)} disabled={full}>
                <PlusIcon />
                {full ? `Máximo de ${L.slides} slides` : 'Adicionar slide'}
              </button>
            )}
          </section>

          {cur?.kind === 'game' && (
            <section className="pn-card pn-stack">
              <h2 className="pn-step">
                <span className="pn-stepn">2</span>Qual jogo aparece no slide {pad(idx + 1)}?
              </h2>
              <p className="pn-hint">Toque na capa. Foto, nome e preço vêm da loja.</p>
              <FieldError msg={err(`slides.${idx}.game`)} />
              <GamePicker selected={cur.game ?? null} onPick={pickGame} />
            </section>
          )}
          {cur?.kind === 'campaign' && (
            <section className="pn-card pn-stack">
              <h2 className="pn-step">
                <span className="pn-stepn">2</span>Campanha do slide {pad(idx + 1)}
              </h2>
              <div className="pn-fld">
                <div className="pn-lbl-row">
                  <label className="pn-lbl" htmlFor="pn-camp">
                    Texto grande da campanha
                  </label>
                  <Counter value={cur.campaignTitle || ''} max={L.campaignTitle} />
                </div>
                <input
                  id="pn-camp"
                  className="pn-inp"
                  value={cur.campaignTitle || ''}
                  aria-invalid={Boolean(err(`slides.${idx}.campaignTitle`))}
                  onChange={(e) => patchSlide(idx, { campaignTitle: e.target.value })}
                />
                <FieldError msg={err(`slides.${idx}.campaignTitle`)} />
                <p className="pn-hint">Curto funciona melhor. Exemplo: Black Friday Geek</p>
              </div>
              <div className="pn-fld">
                <span className="pn-lbl">Imagem (opcional)</span>
                <ImageDrop
                  image={cur.campaignImage != null ? (images[cur.campaignImage] ?? null) : null}
                  alt={cur.campaignTitle || 'Campanha'}
                  onSaved={(id, image) => {
                    setImages((m) => ({ ...m, [id]: image }))
                    patchSlide(idx, { campaignImage: id })
                  }}
                  onRemove={() => patchSlide(idx, { campaignImage: null })}
                />
                <p className="pn-hint">Sem imagem, o site usa a arte colorida da loja.</p>
              </div>
              <div className="pn-fld">
                <label className="pn-lbl" htmlFor="pn-dest">
                  O botão “Ver ofertas” leva para
                </label>
                <select
                  id="pn-dest"
                  className="pn-inp"
                  value={DESTINOS.some((d) => d.value === cur.campaignLink) ? cur.campaignLink! : '/loja'}
                  onChange={(e) => patchSlide(idx, { campaignLink: e.target.value })}
                >
                  {DESTINOS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <FieldError msg={err(`slides.${idx}.campaignLink`)} />
              </div>
            </section>
          )}

          <section className="pn-card pn-stack">
            <h2 className="pn-step">
              <span className="pn-stepn">{cur ? 3 : 2}</span>Textos do topo
            </h2>
            <div className="pn-fld">
              <div className="pn-lbl-row">
                <label className="pn-lbl" htmlFor="pn-title">
                  Título grande
                </label>
                <Counter value={draft.title} max={L.title} />
              </div>
              <textarea
                id="pn-title"
                className="pn-inp"
                rows={3}
                value={draft.title}
                aria-invalid={Boolean(err('title'))}
                onChange={(e) => change({ ...draft, title: e.target.value })}
              />
              <FieldError msg={err('title')} />
              <p className="pn-hint">Aperte Enter para quebrar a linha. A última linha ganha o sublinhado colorido.</p>
            </div>
            <div className="pn-fld">
              <div className="pn-lbl-row">
                <label className="pn-lbl" htmlFor="pn-sub">
                  Frase embaixo do título
                </label>
                <Counter value={draft.subtitle} max={L.subtitle} />
              </div>
              <textarea
                id="pn-sub"
                className="pn-inp"
                rows={3}
                value={draft.subtitle}
                aria-invalid={Boolean(err('subtitle'))}
                onChange={(e) => change({ ...draft, subtitle: e.target.value })}
              />
              <FieldError msg={err('subtitle')} />
            </div>
            <div className="pn-fld">
              <div className="pn-lbl-row">
                <label className="pn-lbl" htmlFor="pn-cta">
                  Texto do botão amarelo
                </label>
                <Counter value={draft.ctaLabel} max={L.ctaLabel} />
              </div>
              <input
                id="pn-cta"
                className="pn-inp"
                value={draft.ctaLabel}
                aria-invalid={Boolean(err('ctaLabel'))}
                onChange={(e) => change({ ...draft, ctaLabel: e.target.value })}
              />
              <FieldError msg={err('ctaLabel')} />
            </div>
          </section>

          <button type="button" className="pn-btn outline pn-pv-toggle" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
            {showPreview ? 'Esconder prévia' : 'Ver prévia'}
          </button>
        </div>

        <div className={`pn-side-pv${showPreview ? ' open' : ''}`}>
          <LivePreview device={device} onDevice={setDevice} badge={preview.hidden ? 'Escondido · não aparece no site' : null}>
            <section className="hero-wrap theme-dark pn-pv-hero">
              <Hero
                title={draft.title}
                subtitle={draft.subtitle}
                ctaLabel={draft.ctaLabel || 'Abrir a loja'}
                slides={preview.slides}
                index={preview.index}
                strip={initial.preview.strip}
                total={initial.preview.total}
                preview
              />
            </section>
          </LivePreview>
        </div>
      </div>

      <PublishBar status={status} text={STATUS_TEXT[status]} onReset={discard} onPublish={() => void publish()} busy={busy} />

      <Confirm open={delIdx !== null} title="Apagar este slide?" text="Ele sai da lista. Só muda no site quando você publicar." onClose={() => setDelIdx(null)}>
        <button type="button" className="pn-btn outline sm" onClick={() => setDelIdx(null)}>
          Cancelar
        </button>
        <button
          type="button"
          className="pn-btn dark sm"
          onClick={() => {
            const i = delIdx!
            setSlides((s) => s.filter((_, j) => j !== i))
            setSel((v) => Math.max(0, v > i ? v - 1 : Math.min(v, draft.slides.length - 2)))
            setDelIdx(null)
          }}
        >
          Apagar
        </button>
      </Confirm>

      <Confirm
        open={ask !== null}
        title="O banner mudou desde que você começou."
        text="Usar o que está no site ou publicar o seu por cima?"
        onClose={() => setAsk(null)}
      >
        <button type="button" className="pn-btn outline sm" onClick={discard}>
          Usar o que está no site
        </button>
        <button
          type="button"
          className="pn-btn yellow sm"
          onClick={() => (ask === 'stale-publish' ? void publish(true) : (setBasedOn(initial.updatedAt), setAsk(null)))}
        >
          {ask === 'stale-publish' ? 'Publicar o meu por cima' : 'Continuar com o meu'}
        </button>
      </Confirm>

      <Toast msg={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  )
}

'use client'

import { ArrowIcon } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import type { Img } from '../../lib/data'
import { titleLines, type HeroSlideView } from '../../lib/painel/hero'
import { useCart } from '../../store/cart'
import { toLine } from '../ShopCard'

// Floating pixels behind the hero: fixed pseudo-random layout so the server
// and client render the same markup.
const COLORS = ['#E8322B', '#FFC61A', '#22B04B', '#2D6BF0']
const PIXELS = Array.from({ length: 28 }, (_, i) => {
  // Rounded so server and browser serialize identical style strings.
  const r = (n: number) => Math.round((((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1) * 1000) / 1000
  return {
    x: `${(r(1) * 100).toFixed(1)}%`,
    y: `${(r(2) * 100).toFixed(1)}%`,
    s: `${6 + Math.round(r(3) * 8)}px`,
    c: COLORS[i % 4],
    o: (0.35 + r(4) * 0.5).toFixed(2),
    d: `${(-r(5) * 7).toFixed(2)}s`,
  }
})

const CAMPAIGN_GLOW = '#FF7A1A'

export type HeroProps = {
  title: string
  subtitle: string
  ctaLabel: string
  slides: HeroSlideView[]
  strip: Img[]
  total: number
  // Rendered inside the owner's panel as a live preview: no priority images,
  // no cart, links inert (the panel also wraps it in `inert`).
  preview?: boolean
}

export function Hero({ title, subtitle, ctaLabel, slides, strip, total, preview = false }: HeroProps) {
  const [i, setI] = useState(0)
  const add = useCart((s) => s.add)
  const n = slides.length
  const idx = n ? Math.min(i, n - 1) : 0
  const cur = slides[idx]
  const go = (d: number) => setI((k) => (Math.min(k, n - 1) + d + n) % n)
  const lines = titleLines(title)
  const counter = (
    <span className="mono">
      <b>{String(idx + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}
    </span>
  )
  const nav =
    n > 1 ? (
      <>
        <button className="hero-nav" aria-label="Destaque anterior" onClick={() => go(-1)}>
          <ArrowIcon dir="left" size={16} />
        </button>
        <button className="hero-nav" aria-label="Próximo destaque" onClick={() => go(1)}>
          <ArrowIcon size={16} />
        </button>
      </>
    ) : null
  const glow = cur?.kind === 'game' ? cur.item.glow : cur ? CAMPAIGN_GLOW : undefined

  return (
    <div className="hero">
      <div className="hero-glow hero-glow-a" style={{ background: glow }} />
      <div className="hero-glow hero-glow-b" />
      {PIXELS.map((p, k) => (
        <i
          key={k}
          className="pxf"
          aria-hidden="true"
          style={{ left: p.x, top: p.y, width: p.s, height: p.s, backgroundColor: p.c, opacity: p.o, animationDelay: p.d }}
        />
      ))}

      <div className={`wrap hero-grid${cur ? '' : ' solo'}`}>
        <div className="hero-copy">
          <span className="px hero-pill">
            <i className="blink" />
            Loja de games · Taubaté → Brasil
          </span>
          <h1 className="dsp hero-title">
            {lines.map((l, k) =>
              k === lines.length - 1 ? (
                <span key={k} className="hero-under">
                  {l}
                </span>
              ) : (
                <span key={k}>
                  {l}
                  <br />
                </span>
              ),
            )}
            <i className="blink hero-caret" aria-hidden="true" />
          </h1>
          {subtitle && <p className="hero-sub">{subtitle}</p>}
          <div className="hero-ctas">
            <Link className="btn btn-yellow" href="/loja">
              {ctaLabel} <ArrowIcon />
            </Link>
            <Link className="btn btn-ghost" href="/#troca">
              Trocar meus jogos
            </Link>
          </div>
        </div>

        {cur?.kind === 'game' && (
          <>
            <div className="hero-stage" aria-hidden="true">
              <div className="case3d" key={cur.item.id}>
                <div className="c-disc" />
                <div className="c-spine" style={{ background: `linear-gradient(90deg, ${cur.item.glow}, #120D06)` }} />
                <div className="c-front">
                  <Image
                    src={cur.item.large.url}
                    alt=""
                    width={cur.item.large.width}
                    height={cur.item.large.height}
                    priority={!preview}
                    sizes="360px"
                  />
                </div>
              </div>
              <div className="case-shadow" />
            </div>

            <aside className="hero-card glass-dark" aria-label="Destaque da semana">
              <div className="px hero-card-top">
                <span>Destaque da semana</span>
                {counter}
              </div>
              <div className="hero-card-head">
                {/* Small cover for screens where the 3D case is hidden. */}
                <Link href={cur.item.href} className="hero-thumb" key={cur.item.id} tabIndex={-1} aria-hidden="true">
                  <Image src={cur.item.large.url} alt="" width={cur.item.large.width} height={cur.item.large.height} sizes="64px" />
                </Link>
                <div className="hero-card-text">
                  <Link href={cur.item.href} className="dsp hero-card-name">
                    {cur.item.title}
                  </Link>
                  <div className="hero-tags">
                    <span className="tag">
                      <i style={{ background: cur.item.platformColor }} />
                      {cur.item.platform}
                    </span>
                    <span className="tag">
                      <i style={{ background: cur.item.conditionColor }} />
                      {cur.item.condition}
                    </span>
                    {cur.item.ageRating && <span className="tag">{cur.item.ageRating}</span>}
                  </div>
                </div>
              </div>
              <div>
                <b className="mono hero-price">{cur.item.pix}</b>
                <small className="hero-inst">
                  <em>no Pix</em> · ou {cur.item.installment}
                </small>
              </div>
              <div className="hero-actions">
                <button className="hero-add" onClick={preview ? undefined : () => add(toLine(cur.item))}>
                  + Adicionar
                </button>
                {nav}
              </div>
            </aside>
          </>
        )}

        {cur?.kind === 'campaign' && (
          <aside className={`hero-camp${cur.image ? ' has-img' : ''}`} aria-label="Campanha" key={`c${idx}`}>
            {cur.image && (
              <Image
                className="hero-camp-img"
                src={cur.image.url}
                alt={cur.image.alt}
                fill
                priority={!preview}
                sizes="(max-width: 768px) 100vw, 880px"
              />
            )}
            <div className="px hero-camp-top">
              <span className="hero-camp-badge">Campanha</span>
              {n > 1 && counter}
            </div>
            <div className="hero-camp-body">
              <Link href={cur.href} className="dsp hero-camp-title">
                {cur.title}
              </Link>
              <div className="hero-actions">
                <Link href={cur.href} className="hero-camp-btn">
                  Ver ofertas <ArrowIcon size={16} />
                </Link>
                {nav}
              </div>
            </div>
          </aside>
        )}
      </div>

      <div className="strip" aria-hidden="true">
        <div className="tape-row strip-row">
          {[...strip, ...strip].map((c, k) => (
            <Image key={k} src={c.url} alt="" width={138} height={190} sizes="138px" />
          ))}
        </div>
      </div>
      <div className="wrap px hero-foot">
        <span>↓ Role para explorar</span>
        <span>{total} jogos em estoque</span>
        <span>Taubaté · aberto até 19h</span>
      </div>
    </div>
  )
}

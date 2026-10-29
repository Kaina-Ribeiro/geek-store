'use client'

import { ArrowIcon } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import type { Featured, Img } from '../../lib/data'
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

export function Hero({ featured, strip, total }: { featured: Featured[]; strip: Img[]; total: number }) {
  const [i, setI] = useState(0)
  const add = useCart((s) => s.add)
  const f = featured[i]
  const go = (d: number) => setI((n) => (n + d + featured.length) % featured.length)

  return (
    <div className="hero">
      <div className="hero-glow hero-glow-a" style={{ background: f?.glow }} />
      <div className="hero-glow hero-glow-b" />
      {PIXELS.map((p, k) => (
        <i
          key={k}
          className="pxf"
          aria-hidden="true"
          style={{ left: p.x, top: p.y, width: p.s, height: p.s, backgroundColor: p.c, opacity: p.o, animationDelay: p.d }}
        />
      ))}

      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="px hero-pill">
            <i className="blink" />
            Loja de games · Taubaté → Brasil
          </span>
          <h1 className="dsp hero-title">
            Continue
            <br />
            de onde <span className="hero-outline">você</span>
            <br />
            <span className="hero-under">parou.</span>
            <i className="blink hero-caret" aria-hidden="true" />
          </h1>
          <p className="hero-sub">
            Lacrados e seminovos <b>com laudo de cada disco</b>, do PS2 ao Switch 2. Separados à mão em Taubaté e
            enviados para todo o Brasil.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-yellow" href="/loja">
              Abrir a loja <ArrowIcon />
            </Link>
            <Link className="btn btn-ghost" href="/#troca">
              Trocar meus jogos
            </Link>
          </div>
        </div>

        {f && (
          <>
            <div className="hero-stage" aria-hidden="true">
              <div className="case3d" key={f.id}>
                <div className="c-disc" />
                <div className="c-spine" style={{ background: `linear-gradient(90deg, ${f.glow}, #120D06)` }} />
                <div className="c-front">
                  <Image src={f.large.url} alt="" width={f.large.width} height={f.large.height} priority sizes="360px" />
                </div>
              </div>
              <div className="case-shadow" />
            </div>

            <aside className="hero-card glass-dark" aria-label="Destaque da semana">
              <div className="px hero-card-top">
                <span>Destaque da semana</span>
                <span className="mono">
                  <b>{String(i + 1).padStart(2, '0')}</b> / {String(featured.length).padStart(2, '0')}
                </span>
              </div>
              <Link href={f.href} className="dsp hero-card-name">
                {f.title}
              </Link>
              <div className="hero-tags">
                <span className="tag">
                  <i style={{ background: f.platformColor }} />
                  {f.platform}
                </span>
                <span className="tag">
                  <i style={{ background: f.conditionColor }} />
                  {f.condition}
                </span>
                {f.ageRating && <span className="tag">{f.ageRating}</span>}
              </div>
              <div>
                <b className="mono hero-price">{f.pix}</b>
                <small className="hero-inst">
                  <em>no Pix</em> · ou {f.installment}
                </small>
              </div>
              <div className="hero-actions">
                <button className="hero-add" onClick={() => add(toLine(f))}>
                  + Adicionar
                </button>
                <button className="hero-nav" aria-label="Destaque anterior" onClick={() => go(-1)}>
                  <ArrowIcon dir="left" size={16} />
                </button>
                <button className="hero-nav" aria-label="Próximo destaque" onClick={() => go(1)}>
                  <ArrowIcon size={16} />
                </button>
              </div>
            </aside>
          </>
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

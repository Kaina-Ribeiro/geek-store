'use client'

import { ArrowIcon } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ConsoleSlide } from '../../lib/data'

const FAN = [
  { x: 4, r: -12, z: 1 },
  { x: 30, r: -2, z: 2 },
  { x: 56, r: 9, z: 1 },
]

// Native scroll-snap carousel: swipe on touch, drag with the mouse, arrows
// and dots on desktop. The big console name scales with the card (cqw).
export function Consoles({ slides }: { slides: ConsoleSlide[] }) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const [active, setActive] = useState(0)

  const goTo = useCallback((i: number) => {
    const el = track.current
    const card = el?.children[i] as HTMLElement | undefined
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => {
      const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1
      setActive(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / (w + 16)))))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [slides.length])

  return (
    <section id="plataformas" className="consoles theme-dark">
      <div className="wrap cons-head">
        <div>
          <div className="px eyebrow">
            <i style={{ background: '#2D6BF0' }} />
            Plataformas · {slides.length} consoles
          </div>
          <h2 className="dsp cons-title">Escolha seu console</h2>
        </div>
        <div className="cons-ctrl">
          <div role="group" aria-label="Escolher console" className="cons-dots">
            {slides.map((s, i) => (
              <button key={s.key} aria-label={s.title} aria-current={i === active} onClick={() => goTo(i)}>
                <i />
              </button>
            ))}
          </div>
          <span className="mono cons-count">
            {String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
          <button className="round-btn" aria-label="Console anterior" onClick={() => goTo(Math.max(0, active - 1))}>
            <ArrowIcon dir="left" />
          </button>
          <button
            className="round-btn is-solid"
            aria-label="Próximo console"
            onClick={() => goTo(Math.min(slides.length - 1, active + 1))}
          >
            <ArrowIcon />
          </button>
        </div>
      </div>

      <div
        ref={track}
        className="cons-track"
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || !track.current) return
          drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false }
          track.current.classList.add('is-dragging')
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || !track.current) return
          const dx = e.clientX - d.x
          if (Math.abs(dx) > 5) d.moved = true
          track.current.scrollLeft = d.left - dx
        }}
        onPointerUp={() => {
          if (!drag.current || !track.current) return
          const moved = drag.current.moved
          track.current.classList.remove('is-dragging')
          drag.current = moved ? { x: 0, left: 0, moved: true } : null
          if (moved) {
            goTo(active)
            setTimeout(() => (drag.current = null), 0)
          }
        }}
        onPointerLeave={() => {
          if (drag.current && track.current) {
            track.current.classList.remove('is-dragging')
            drag.current = null
            goTo(active)
          }
        }}
        onClickCapture={(e) => {
          if (drag.current?.moved) e.preventDefault()
        }}
      >
        {slides.map((s, i) => (
          <article
            key={s.key}
            className={`cons-card${i === active ? ' is-active' : ''}`}
            style={{ background: s.bg, color: s.ink }}
          >
            <div
              className="dsp cons-name"
              style={{ ['--fs' as string]: Math.min(18.5, 900 / (s.name.length * 0.74) / 10.8) }}
            >
              {s.name}
            </div>
            <div className="cons-info">
              <span className="px" style={{ opacity: 0.75 }}>
                {s.title}
              </span>
              <p>{s.text}</p>
              <div className="cons-stats">
                <div>
                  <b className="mono">{s.count}</b>
                  <span>jogos agora</span>
                </div>
                <div>
                  <b className="mono">{s.from}</b>
                  <span>a partir de</span>
                </div>
              </div>
              <Link className="btn" href={s.href} style={{ background: s.btnBg, color: s.btnInk }} draggable={false}>
                <span>Ver jogos de {s.name}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="fan" aria-hidden="true">
              {s.covers.map((c, k) => (
                <div
                  key={k}
                  className="fan-c"
                  style={{ left: `${FAN[k].x}%`, transform: `rotate(${FAN[k].r}deg)`, zIndex: FAN[k].z }}
                >
                  <Image src={c.url} alt="" width={c.width} height={c.height} sizes="230px" draggable={false} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

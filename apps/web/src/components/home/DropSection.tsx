'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'

import { subscribeAction } from '../../app/(frontend)/actions'
import type { DropView } from '../../lib/data'

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')

function useCountdown(target: string) {
  // Render zeros on the server, start ticking after mount (avoids hydration
  // mismatches from the clock).
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const t = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [])
  const ms = now === null ? 0 : Math.max(0, new Date(target).getTime() - now)
  const s = Math.floor(ms / 1000)
  return [
    { v: pad(Math.floor(s / 86400)), l: 'Dias' },
    { v: pad(Math.floor((s % 86400) / 3600)), l: 'Horas' },
    { v: pad(Math.floor((s % 3600) / 60)), l: 'Min' },
    { v: pad(s % 60), l: 'Seg' },
  ]
}

function NotifyForm() {
  const [state, setState] = useState<'idle' | 'form' | 'done'>('idle')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (state === 'done')
    return (
      <span className="btn drop-notified" role="status">
        ✓ Vamos te avisar
      </span>
    )
  if (state === 'idle')
    return (
      <button className="btn drop-notify" onClick={() => setState('form')}>
        Me avise quando abrir
      </button>
    )
  return (
    <form
      className="drop-form"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await subscribeAction(email, 'drop')
          if (!r.ok) return setError(r.error)
          setState('done')
        })
      }}
    >
      <label htmlFor="drop-email" className="sr-only">
        Seu e-mail
      </label>
      <input
        id="drop-email"
        type="email"
        required
        autoFocus
        autoComplete="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn btn-yellow" disabled={pending}>
        Avisar
      </button>
      {error && <small role="alert">{error}</small>}
    </form>
  )
}

export function DropSection({ drop, standalone = false }: { drop: DropView; standalone?: boolean }) {
  const clock = useCountdown(drop.opensAt)
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const left = Math.max(0, drop.slots - drop.reserved)
  const [first, ...rest] = drop.title.split(' ')
  const opens = new Date(drop.opensAt)
  const when = opens.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <section id="drop" className="drop">
      <div className="drop-grid-bg" aria-hidden="true" />
      <div className="wrap drop-grid">
        <div>
          <span className="px drop-when">
            <i className="blink" />
            Drop · {when}
          </span>
          <h2 className="dsp drop-title">
            {first} {rest.slice(0, 1).join(' ')}
            <br />
            {rest.slice(1).join(' ')}
          </h2>
          <p className="drop-blurb">
            {drop.blurb ||
              `Toda sexta abrimos um lote garimpado. Quem tem nível ${drop.earlyLevel} ou mais entra 30 minutos antes. Quando acaba, acaba.`}
          </p>
          {drop.open ? (
            <p className="px drop-live">
              <i className="blink" />
              Aberto agora · quando acaba, acaba
            </p>
          ) : (
          <div className="clock" role="timer" aria-label="Tempo até abrir o drop">
            {clock.map((c) => (
              <div key={c.l} className="clock-unit">
                <div className="clock-digits">
                  <span className="fl">{c.v[0]}</span>
                  <span className="fl">{c.v[1]}</span>
                </div>
                <small className="px">{c.l}</small>
              </div>
            ))}
          </div>
          )}
          <div className="drop-progress">
            <div>
              <span>
                {drop.reserved} de {drop.slots} já reservados
              </span>
              <span className="mono">só {left} restam</span>
            </div>
            <div className="drop-bar">
              <i style={{ width: `${(drop.reserved / drop.slots) * 100}%` }} />
            </div>
          </div>
          <div className="drop-cta">
            {drop.open ? (
              <Link className="btn drop-notify" href="/drop">
                O drop abriu · ver os jogos
              </Link>
            ) : (
              <>
                <NotifyForm />
                {!standalone && (
                  <Link className="drop-link" href="/drop">
                    Nível {drop.earlyLevel}+? Entre 30 min antes →
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
        {drop.open && drop.items.length > 0 ? (
          <div className="qgrid is-open">
            {drop.items.slice(0, 9).map((it) => (
              <Link key={it.id} href={it.href} className="qb qb-item" aria-label={`${it.title}, ${it.pix}`}>
                <Image src={it.cover.url} alt="" width={160} height={210} />
                <small className="mono">{it.pix}</small>
              </Link>
            ))}
          </div>
        ) : (
        <div className="qgrid">
          {drop.teasers.slice(0, 9).map((t, i) => (
            <button
              key={i}
              className={`qb${open[i] ? ' is-open' : ''}`}
              aria-label={open[i] ? t.name : 'Abrir bloco surpresa'}
              onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
            >
              {open[i] ? (
                <span className="qb-open">
                  <b>{t.name}</b>
                  <small className="px">{t.detail}</small>
                </span>
              ) : (
                <span className="qb-q">?</span>
              )}
            </button>
          ))}
        </div>
        )}
      </div>
    </section>
  )
}

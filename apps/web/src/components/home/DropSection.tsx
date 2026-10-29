'use client'

import { useEffect, useState } from 'react'

import type { DropView } from '../../lib/data'

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')

function useCountdown(target: string) {
  // Render zeros on the server, start ticking after mount (avoids hydration
  // mismatches from the clock).
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
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

export function DropSection({ drop }: { drop: DropView }) {
  const clock = useCountdown(drop.opensAt)
  const [notify, setNotify] = useState(false)
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
            <button
              className="btn"
              aria-pressed={notify}
              onClick={() => setNotify((n) => !n)}
              style={{ background: notify ? '#FFC61A' : '#141416', color: notify ? '#141000' : '#fff' }}
            >
              {notify ? '✓ Vamos te avisar' : 'Me avise quando abrir'}
            </button>
          </div>
        </div>
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
      </div>
    </section>
  )
}

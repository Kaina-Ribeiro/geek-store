'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  ['Check 01', 'Leitura completa', 'O jogo roda do boot até o primeiro save no console original.'],
  ['Check 02', 'Disco sob luz', 'Cada risco é fotografado contra a luz e descrito no anúncio.'],
  ['Check 03', 'Capa e manual', 'O que faltar aparece riscado no laudo, sem surpresa.'],
  ['Check 04', 'Higienização', 'Limpeza do disco e da caixa. Estojo trincado é trocado.'],
  ['Check 05', 'Nota final', 'Lacrado, Nota A, Nota B ou Só disco: é o que aparece na lombada.'],
] as const

const READS = [
  { label: 'Leitura', value: 'BOOT OK · 100%', pos: { left: -30, top: 60 } },
  { label: 'Superfície', value: '2 RISCOS LEVES', pos: { right: -30, top: 150 }, hi: true },
  { label: 'Capa / manual', value: 'ORIGINAL · SIM', pos: { left: -16, bottom: 110 } },
  { label: 'Embalagem', value: 'AGUARDANDO', pos: { right: -16, bottom: 40 }, mute: true },
]

export function Laudo() {
  const [step, setStep] = useState(2)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <section id="laudo" className="laudo theme-dark">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="px eyebrow">
              <i style={{ background: '#FFC61A' }} />
              Padrão Checkpoint
            </div>
            <h2 className="dsp laudo-title">
              Usado, nunca
              <br />
              no escuro
            </h2>
          </div>
          <p className="sec-lead">
            Cada seminovo passa por cinco checagens antes de entrar na loja. O resultado vira um laudo que você vê antes
            de comprar.
          </p>
        </div>
        <div className="laudo-grid">
          <div className="scanner" aria-hidden="true">
            <div className="scan-disc" />
            <div className="beam" />
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            {READS.map((r) => (
              <div key={r.label} className={`read${r.hi ? ' is-hi' : ''}`} style={r.pos}>
                <small className="px">{r.label}</small>
                <b className="mono" style={r.mute ? { color: 'var(--mute)' } : undefined}>
                  {r.value}
                </b>
              </div>
            ))}
            <div className="dsp scan-grade">B</div>
          </div>
          <ol className="steps">
            {STEPS.map(([k, t, d], i) => (
              <li key={k} className={i === step ? 'is-on' : i < step ? 'is-done' : ''}>
                <span className="px">{k}</span>
                <div>
                  <h3 className="dsp">{t}</h3>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

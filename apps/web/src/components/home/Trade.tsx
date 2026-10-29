'use client'

import { useState } from 'react'

// Base credit per game (R$) by platform and multiplier by average condition.
// Placeholder table until the owner defines the real buying prices.
const TP = { PS5: 95, 'Switch 2': 130, Switch: 85, PS4: 40, 'Xbox Series': 75, 'Xbox One': 30, Retrô: 60 } as const
const TC = { 'Nota A': 1, 'Nota B': 0.72, 'Só disco': 0.45 } as const
type Plat = keyof typeof TP
type Cond = keyof typeof TC

export function Trade() {
  const [plat, setPlat] = useState<Plat>('PS5')
  const [cond, setCond] = useState<Cond>('Nota A')
  const [qty, setQty] = useState(3)
  const [credit, setCredit] = useState(true)
  const value = Math.round(TP[plat] * TC[cond] * qty * (credit ? 1.25 : 1))

  return (
    <section id="troca" className="trade theme-light">
      <div className="wrap trade-grid">
        <div>
          <div className="px eyebrow">
            <i style={{ background: '#E8322B' }} />
            Trade-in
          </div>
          <h2 className="dsp trade-title">
            Zerou?
            <br />
            Troca.
          </h2>
          <p className="sec-lead" style={{ marginTop: 24 }}>
            Monte sua pilha no simulador, mande as fotos pelo WhatsApp e use o crédito no mesmo dia.
          </p>
          <ol className="trade-steps">
            <li>
              <span className="px">01</span>
              <span>
                <b>Simule aqui</b>
                <small>Plataforma, estado e quantidade.</small>
              </span>
            </li>
            <li>
              <span className="px">02</span>
              <span>
                <b>Fotos pelo WhatsApp</b>
                <small>Proposta final em até 2 horas.</small>
              </span>
            </li>
            <li>
              <span className="px">03</span>
              <span>
                <b>Crédito liberado</b>
                <small>Com 25% a mais que no Pix.</small>
              </span>
            </li>
          </ol>
        </div>

        <div className="device">
          <div className="px device-top">
            <span>Checkpoint · Simulador de troca</span>
            <span className="leds" aria-hidden="true">
              <i style={{ background: '#E8322B' }} />
              <i style={{ background: '#FFC61A' }} />
              <i style={{ background: '#22B04B' }} />
            </span>
          </div>
          <div className="lcd" aria-live="polite">
            <div className="px lcd-top">
              <span>&gt; Crédito estimado</span>
              <span className="blink">■</span>
            </div>
            <small className="px lcd-note">{credit ? 'Em crédito na loja' : 'No Pix'}</small>
            <b className="lcd-val">R${value}</b>
            <div className="px lcd-meta">
              <span>
                <small>Plat</small>
                {plat}
              </span>
              <span>
                <small>Nota</small>
                {cond.replace('Nota ', '')}
              </span>
              <span>
                <small>Qtd</small>
                {qty}
              </span>
            </div>
          </div>
          <div className="device-keys">
            <div>
              <span className="px key-label">Plataforma</span>
              <div className="keys">
                {(Object.keys(TP) as Plat[]).map((p) => (
                  <button key={p} className="key" aria-pressed={plat === p} onClick={() => setPlat(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="px key-label">Estado médio</span>
              <div className="keys">
                {(Object.keys(TC) as Cond[]).map((c) => (
                  <button key={c} className="key" aria-pressed={cond === c} onClick={() => setCond(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="device-row">
              <div>
                <span className="px key-label">Quantidade</span>
                <div className="qty">
                  <button className="key" aria-label="Diminuir" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    −
                  </button>
                  <output>{qty}</output>
                  <button className="key" aria-label="Aumentar" onClick={() => setQty((q) => Math.min(20, q + 1))}>
                    +
                  </button>
                </div>
              </div>
              <button className="switch" role="switch" aria-checked={credit} onClick={() => setCredit((c) => !c)}>
                <span className="switch-track">
                  <i />
                </span>
                <span>
                  Crédito na loja
                  <small>+25% sobre o Pix</small>
                </span>
              </button>
              <div className="ab">
                <button aria-label="Limpar simulação" onClick={() => (setQty(1), setPlat('PS5'), setCond('Nota A'))}>
                  B
                </button>
                <a
                  aria-label="Enviar simulação pelo WhatsApp"
                  href={`https://wa.me/?text=${encodeURIComponent(`Oi! Quero trocar ${qty} jogo(s) de ${plat}, estado ${cond}. Simulação: R$${value}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  A
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

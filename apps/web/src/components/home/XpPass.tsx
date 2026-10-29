// Demo of the loyalty pass. Real XP comes from paid orders in phase 4.
const TIERS = [
  { n: 1, t: 'Novato', r: 'Cupom de boas-vindas', req: 0, bg: '#22B04B', state: 1 },
  { n: 2, t: 'Aventureiro', r: 'Frete grátis na próxima', req: 500, bg: '#2D6BF0', state: 1 },
  { n: 3, t: 'Explorador', r: '5% off em acessórios', req: 1000, bg: '#FFC61A', state: 2 },
  { n: 4, t: 'Veterano', r: 'Entra antes nos drops', req: 2000, bg: 'var(--line2)', state: 0 },
  { n: 5, t: 'Lenda', r: '10% off em tudo, sempre', req: 5000, bg: 'var(--line2)', state: 0 },
]

const ACHS = [
  ['Primeira compra', '#FFC61A', 1],
  ['Colecionador PS2', '#22B04B', 1],
  ['5 trocas', '#2D6BF0', 1],
  ['10 saves', '#E8322B', 1],
  ['Lote completo', '#2D6BF0', 1],
  ['Retrô raiz', '#5D5D66', 0],
  ['Pré-venda', '#5D5D66', 0],
  ['Drop em 1 min', '#5D5D66', 0],
] as const

export function XpPass() {
  return (
    <section id="xp" className="xp theme-dark">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="px eyebrow">
              <i style={{ background: '#E8322B' }} />
              Passe Checkpoint
            </div>
            <h2 className="dsp xp-title">
              Cada compra
              <br />
              sobe de nível
            </h2>
          </div>
          <p className="sec-lead">
            R$ 1 vale 1 XP. Trocas e avaliações também contam. Os níveis destravam benefícios de verdade, para sempre.
          </p>
        </div>
        <div className="xp-grid">
          <div className="xp-card">
            <div className="xp-who">
              <div className="xp-avatar" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 8 8" shapeRendering="crispEdges">
                  <path fill="#fff" d="M2 0h4v1h1v1h1v6H7V7H6v1H5V7H3v1H2V7H1v1H0V2h1V1h1z" />
                  <path fill="#0B0B0D" d="M2 2h1v2H2zM5 2h1v2H5z" />
                </svg>
              </div>
              <div>
                <b className="dsp">Jogador exemplo</b>
                <span>Nível 3 · Explorador</span>
              </div>
            </div>
            <div>
              <div className="xp-num">
                <b className="mono">1.240</b>
                <small className="mono">760 XP para Veterano</small>
              </div>
              <div className="xp-bar" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ background: i < 15 ? '#FFC61A' : 'var(--line2)' }} />
                ))}
              </div>
            </div>
            <div>
              <span className="px" style={{ display: 'block', color: 'var(--mute)', marginBottom: 12 }}>
                Conquistas · 5 de 12
              </span>
              <ul className="achs">
                {ACHS.map(([n, c, ok]) => (
                  <li key={n} style={{ opacity: ok ? 1 : 0.35 }}>
                    <i style={{ background: c }} />
                    <small>{n}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="tiers">
            <div className="tiers-line">
              <i />
            </div>
            <ol>
              {TIERS.map((t) => (
                <li key={t.n}>
                  <span className="px tier-you">{t.state === 2 ? 'Você' : ''}</span>
                  <div
                    className={`px tier-n${t.state === 2 ? ' is-you' : ''}`}
                    style={{ background: t.bg, color: t.state ? '#0B0B0D' : 'var(--mute)' }}
                  >
                    {t.n}
                  </div>
                  <div className="tier-card">
                    <b className="dsp">{t.t}</b>
                    <p>{t.r}</p>
                    <span className="mono">{t.req.toLocaleString('pt-BR')} XP</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}

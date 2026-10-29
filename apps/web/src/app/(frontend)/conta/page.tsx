import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { LoginForm } from '../../../components/account/LoginForm'
import { ProfileForm } from '../../../components/account/ProfileForm'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'
import { getAccount } from '../../../lib/account'
import { getCustomer } from '../../../lib/auth'
import { brl } from '../../../lib/catalog'
import { STATUS_COLOR, STATUS_LABEL, statusStep } from '../../../lib/order-view'
import { TIERS } from '../../../lib/xp'

export const metadata: Metadata = { title: 'Sua conta', robots: { index: false } }
export const dynamic = 'force-dynamic'

type SP = Promise<Record<string, string | string[] | undefined>>

const Avatar = ({ color }: { color: string }) => (
  <div className="acc-avatar" style={{ background: color }} aria-hidden="true">
    <svg width="36" height="36" viewBox="0 0 8 8" shapeRendering="crispEdges">
      <path fill="#fff" d="M2 0h4v1h1v1h1v6H7V7H6v1H5V7H3v1H2V7H1v1H0V2h1V1h1z" />
      <path fill="#0B0B0D" d="M2 2h1v2H2zM5 2h1v2H5z" />
    </svg>
  </div>
)

export default async function ContaPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const next = typeof sp.next === 'string' ? sp.next : '/conta'
  const customer = await getCustomer()

  if (!customer) {
    return (
      <>
        <SiteHeader />
        <main className="theme-dark acc-login">
          <div className="wrap acc-login-in">
            <div>
              <span className="px eyebrow">
                <i style={{ background: '#FFC61A' }} />
                Passe Checkpoint
              </span>
              <h1 className="dsp acc-login-title">
                Continue
                <br />
                de onde parou
              </h1>
              <p className="acc-lead">
                Entre com seu e-mail, sem senha: mandamos um link que vale por 15 minutos. Seus pedidos, save slots e XP
                ficam guardados, inclusive das compras feitas sem conta.
              </p>
            </div>
            <LoginForm next={next} error={sp.erro === 'link' ? 'Esse link expirou ou já foi usado. Peça outro.' : null} />
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  const acc = await getAccount(customer)
  const { tier, next: nextTier, toNext, progress } = acc.level
  const since = new Date(acc.memberSince).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
  const bars = 20

  return (
    <>
      <SiteHeader />
      <main className="theme-light acc">
        <section className="acc-band theme-dark">
          <div className="wrap acc-band-in">
            <div className="acc-who">
              <Avatar color={tier.color} />
              <div>
                <b className="dsp acc-name">{customer.name || customer.email.split('@')[0]}</b>
                <span>
                  {tier.t} desde {since}
                </span>
              </div>
            </div>
            <div className="acc-xp">
              <div className="acc-xp-top">
                <b className="mono">{acc.xp.toLocaleString('pt-BR')}</b>
                <span className="px">Nível {tier.n}</span>
              </div>
              <div className="acc-xp-bar" aria-hidden="true">
                {Array.from({ length: bars }, (_, i) => (
                  <i key={i} style={{ background: i < Math.round(progress * bars) ? '#FFC61A' : undefined }} />
                ))}
              </div>
              <small>
                {nextTier ? `${toNext.toLocaleString('pt-BR')} XP para ${nextTier.t}: ${nextTier.r.toLowerCase()}` : 'Nível máximo. Lenda!'}
              </small>
            </div>
          </div>
        </section>

        <div className="wrap acc-grid">
          <div className="acc-col">
            <section aria-labelledby="acc-orders">
              <h2 id="acc-orders" className="px acc-h">
                Seus pedidos
              </h2>
              {acc.orders.length === 0 ? (
                <div className="acc-empty">
                  <p>Nenhum pedido ainda. O primeiro destrava a conquista &quot;Primeira compra&quot;.</p>
                  <Link className="btn btn-solid" href="/loja">
                    Ver a loja
                  </Link>
                </div>
              ) : (
                <ul className="acc-orders">
                  {acc.orders.map((o) => {
                    const step = o.status === 'pago' ? 2 : statusStep(o.status)
                    return (
                      <li key={o.id}>
                        <Link href={`/pedido/${o.id}`} className="acc-order">
                          <div className="acc-order-top">
                            <b>
                              {o.number} · {o.items.reduce((n, i) => n + i.qty, 0)}{' '}
                              {o.items.reduce((n, i) => n + i.qty, 0) === 1 ? 'jogo' : 'jogos'}
                            </b>
                            <span className="px" style={{ color: STATUS_COLOR[o.status] }}>
                              {STATUS_LABEL[o.status]}
                            </span>
                          </div>
                          {o.status !== 'expirado' && o.status !== 'cancelado' && (
                            <div className="acc-steps" aria-hidden="true">
                              {[0, 1, 2, 3].map((i) => (
                                <i key={i} className={i < step ? 'is-on' : ''} />
                              ))}
                            </div>
                          )}
                          <small>
                            {new Date(o.createdAt).toLocaleDateString('pt-BR')} · {brl(o.total)}
                            {o.trackingCode ? ` · rastreio ${o.trackingCode}` : ''}
                          </small>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="acc-saves">
              <h2 id="acc-saves" className="px acc-h">
                Save slots · {acc.saves.length}
              </h2>
              {acc.saves.length === 0 ? (
                <p className="acc-muted">Toque no coração de um jogo para guardar aqui e saber quando baixar de preço ou voltar ao estoque.</p>
              ) : (
                <ul className="acc-saves">
                  {acc.saves.map((s) => (
                    <li key={s.gameId}>
                      <Link href={s.best?.href ?? s.href}>
                        <Image src={s.cover} alt="" width={120} height={160} />
                        <b>{s.title}</b>
                        <small className={s.best ? 'mono' : ''}>{s.best ? s.best.pix : 'Sem estoque agora'}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="acc-col">
            <section aria-labelledby="acc-achs">
              <h2 id="acc-achs" className="px acc-h">
                Conquistas · {acc.achievements.filter((a) => a.unlocked).length} de {acc.achievements.length}
              </h2>
              <ul className="acc-achs">
                {acc.achievements.map((a) => (
                  <li key={a.id} className={a.unlocked ? '' : 'is-off'} title={'hint' in a ? a.hint : undefined}>
                    <i style={{ background: a.color }} />
                    <small>{a.name}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="acc-tiers">
              <h2 id="acc-tiers" className="px acc-h">
                Níveis
              </h2>
              <ol className="acc-tiers">
                {TIERS.map((t) => {
                  const reached = acc.xp >= t.req
                  return (
                    <li key={t.n} className={t.n === tier.n ? 'is-you' : reached ? '' : 'is-off'}>
                      <span className="px" style={{ background: reached ? t.color : undefined }}>
                        {t.n}
                      </span>
                      <span>
                        <b>{t.t}</b>
                        <small>{t.r}</small>
                      </span>
                      <span className="mono">{t.req.toLocaleString('pt-BR')} XP</span>
                    </li>
                  )
                })}
              </ol>
            </section>

            <section aria-labelledby="acc-data">
              <h2 id="acc-data" className="px acc-h">
                Seus dados
              </h2>
              <ProfileForm name={customer.name || ''} phone={customer.phone || ''} email={customer.email} />
              <form action="/conta/sair" method="post">
                <button className="btn btn-ghost acc-out" type="submit">
                  Sair da conta
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

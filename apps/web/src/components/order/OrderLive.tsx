'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'

import { orderStatusAction, simulateAction } from '../../app/(frontend)/actions'
import { brl } from '../../lib/catalog'
import { declineMessage } from '../../lib/payment-messages'
import { STATUS_COLOR, STATUS_LABEL, statusStep, type OrderView } from '../../lib/order-view'
import { trackPurchase } from '../analytics'
import { CardBrick } from './CardBrick'

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function OrderLive({
  initial,
  token,
  cardLive,
  publicKey,
  simulation,
}: {
  initial: OrderView
  token: string
  cardLive: boolean
  publicKey: string
  simulation: boolean
}) {
  const [o, setO] = useState(initial)
  const [now, setNow] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, start] = useTransition()
  const tracked = useRef(false)

  const waiting = o.status === 'aguardando'

  const refresh = async () => {
    const v = await orderStatusAction(o.id, token).catch(() => null)
    if (v) setO(v)
  }

  // Poll while waiting for the payment; tick the countdown every second.
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0)
    if (!waiting) return () => clearTimeout(first)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const poll = setInterval(refresh, 4000)
    return () => {
      clearTimeout(first)
      clearInterval(tick)
      clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting])

  useEffect(() => {
    if (o.status === 'pago' && !tracked.current) {
      tracked.current = true
      trackPurchase(o)
    }
  }, [o])

  const left = o.payment.expiresAt && now !== null ? new Date(o.payment.expiresAt).getTime() - now : null
  const sim = (outcome: 'approved' | 'rejected' | 'expired') =>
    start(async () => {
      await simulateAction(o.id, token, outcome)
      await refresh()
    })

  const copy = async () => {
    if (!o.payment.qrCode) return
    await navigator.clipboard.writeText(o.payment.qrCode).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // "Pago" already lights the laudo step: the team starts right away.
  const step = o.status === 'pago' ? 2 : statusStep(o.status)
  const rejected = waiting && o.payment.method === 'card' && o.payment.status === 'rejected'

  return (
    <div className="wrap ord-grid">
      <div className="ord-main">
        <nav className="px crumbs" aria-label="Você está em">
          <Link href="/conta">Conta</Link>
          <span>/</span>
          <span aria-current="page">Pedido {o.number}</span>
        </nav>

        {waiting && o.payment.method === 'pix' && (
          <section className="ord-pix theme-dark" aria-labelledby="pix-title">
            <span className="px ord-kicker" style={{ color: '#32BCAD' }}>
              Pagamento via Pix
            </span>
            <h1 id="pix-title" className="dsp ord-title">
              Falta só o Pix
            </h1>
            <p className="ord-sub">
              Pague em até <b className="mono">{left !== null ? mmss(left) : '30:00'}</b>. A gente já separou seus jogos.
            </p>
            <div className="ord-qr">
              {o.payment.qrBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/png;base64,${o.payment.qrBase64}`} alt="QR Code do Pix" width={220} height={220} />
              ) : (
                <span>QR Code indisponível</span>
              )}
            </div>
            <b className="mono ord-amount">{brl(o.total)}</b>
            <button className="btn ord-copy" onClick={copy} disabled={!o.payment.qrCode}>
              {copied ? '✓ Código copiado' : 'Copiar código Pix'}
            </button>
            <ol className="ord-steps">
              <li>
                <i style={{ background: '#22B04B' }} />
                <span>
                  <b>Pedido {o.number} criado</b>
                  <small>Reservamos seus jogos por 30 min</small>
                </span>
              </li>
              <li>
                <i style={{ background: '#FFC61A' }} className="blink" />
                <span>
                  <b>Aguardando Pix</b>
                  <small>Confirmação automática em segundos</small>
                </span>
              </li>
              <li className="is-off">
                <i />
                <span>
                  <b>Laudo e embalagem blindada</b>
                </span>
              </li>
            </ol>
          </section>
        )}

        {waiting && o.payment.method === 'card' && (
          <section className="ord-card" aria-labelledby="card-title">
            <span className="px ord-kicker">Cartão de crédito</span>
            <h1 id="card-title" className="dsp ord-title">
              Pague no cartão
            </h1>
            <p className="ord-sub">
              Até {o.maxInstallments}x sem juros. Seus jogos ficam reservados por{' '}
              <b className="mono">{left !== null ? mmss(left) : '30:00'}</b>.
            </p>
            {rejected && (
              <p className="co-error" role="alert">
                {declineMessage(o.payment.statusDetail || undefined)}
              </p>
            )}
            {o.payment.status === 'in_process' ? (
              <p className="ord-note">O banco está analisando o pagamento. Você recebe um e-mail quando confirmar.</p>
            ) : cardLive ? (
              <CardBrick
                orderId={o.id}
                token={token}
                amount={o.total}
                email={o.email}
                maxInstallments={o.maxInstallments}
                publicKey={publicKey}
                onDone={refresh}
              />
            ) : (
              !simulation && <p className="ord-note">O pagamento com cartão ainda não está disponível.</p>
            )}
          </section>
        )}

        {simulation && waiting && (
          <section className="ord-sim" aria-label="Simulação de pagamento">
            <b className="px">Modo de teste</b>
            <p>Sem chaves do Mercado Pago, o pagamento é simulado. Escolha o que acontece:</p>
            <div>
              <button className="btn btn-solid" disabled={busy} onClick={() => sim('approved')}>
                {o.payment.method === 'pix' ? 'Simular Pix pago' : 'Simular cartão aprovado'}
              </button>
              {o.payment.method === 'card' && (
                <button className="btn btn-ghost" disabled={busy} onClick={() => sim('rejected')}>
                  Simular cartão recusado
                </button>
              )}
              <button className="btn btn-ghost" disabled={busy} onClick={() => sim('expired')}>
                Simular expiração
              </button>
            </div>
          </section>
        )}

        {!waiting && (o.status === 'expirado' || o.status === 'cancelado') && (
          <section className="ord-done is-off">
            <span className="px ord-kicker" style={{ color: STATUS_COLOR[o.status] }}>
              {STATUS_LABEL[o.status]}
            </span>
            <h1 className="dsp ord-title">{o.status === 'expirado' ? 'O Pix expirou' : 'Pedido cancelado'}</h1>
            <p className="ord-sub">
              {o.status === 'expirado'
                ? 'O pagamento não chegou em 30 minutos e os jogos voltaram para a loja. Se ainda estiverem lá, é só montar o pedido de novo.'
                : o.payment.statusDetail || 'Se houve cobrança, o estorno é automático pelo Mercado Pago.'}
            </p>
            <Link className="btn btn-solid" href="/loja">
              Voltar para a loja
            </Link>
          </section>
        )}

        {!waiting && o.status !== 'expirado' && o.status !== 'cancelado' && (
          <section className="ord-done theme-dark">
            <span className="px ord-kicker" style={{ color: STATUS_COLOR[o.status] }}>
              {STATUS_LABEL[o.status]}
            </span>
            <h1 className="dsp ord-title">
              {o.status === 'pago' ? 'Pagamento confirmado' : o.status === 'pronto' ? 'Pronto para retirar' : o.status === 'entregue' ? 'Entregue. Bom jogo!' : 'A caminho'}
            </h1>
            <p className="ord-sub">
              {o.status === 'pago'
                ? o.shipping.pickup
                  ? 'Estamos conferindo o laudo de cada disco. Avisamos por e-mail quando puder retirar.'
                  : 'Estamos conferindo o laudo de cada disco e embalando. O rastreio chega por e-mail.'
                : o.status === 'pronto'
                  ? 'Retire na loja em Taubaté, de segunda a sábado, das 10h às 19h, com um documento.'
                  : o.status === 'enviado'
                    ? 'Seu pedido saiu de Taubaté.'
                    : 'Esperamos que curta. Conta pra gente no Instagram!'}
            </p>
            <div className="ord-progress" aria-label={`Etapa ${step} de 4`}>
              {['Pago', 'Laudo e embalagem', o.shipping.pickup ? 'Pronto' : 'Enviado', 'Entregue'].map((s, i) => (
                <div key={s} className={i < step ? 'is-on' : ''}>
                  <i />
                  <small>{s}</small>
                </div>
              ))}
            </div>
            {o.trackingCode && (
              <p className="ord-track">
                Rastreio <b className="mono">{o.trackingCode}</b> ·{' '}
                <a href={`https://melhorrastreio.com.br/rastreio/${encodeURIComponent(o.trackingCode)}`} target="_blank" rel="noreferrer">
                  acompanhar
                </a>
              </p>
            )}
            {o.xp > 0 && (
              <p className="px ord-xp">
                +{o.xp} XP {o.hasAccount ? 'no seu passe' : '· entre com este e-mail para guardar'}
              </p>
            )}
            {!o.hasAccount && (
              <Link className="btn btn-yellow" href={`/conta?next=/pedido/${o.id}`}>
                Guardar meu XP
              </Link>
            )}
            {o.payment.simulated && <small className="ord-note">Pagamento simulado (ambiente de teste).</small>}
          </section>
        )}
      </div>

      <aside className="ord-sum" aria-label="Resumo do pedido">
        <header>
          <b className="dsp">Pedido {o.number}</b>
          <span className="px" style={{ color: STATUS_COLOR[o.status] }}>
            {STATUS_LABEL[o.status]}
          </span>
        </header>
        <ul className="co-items">
          {o.items.map((i, n) => (
            <li key={n}>
              <Image src={i.cover} alt="" width={48} height={66} />
              <span>
                <b>{i.title}</b>
                <small>
                  {i.platform} · {i.condition}
                  {i.qty > 1 ? ` · ${i.qty}x` : ''}
                </small>
              </span>
              <b className="mono">{brl(i.unitPrice * i.qty)}</b>
            </li>
          ))}
        </ul>
        <dl className="co-totals">
          <div>
            <dt>Frete · {o.shipping.method}</dt>
            <dd className="mono">{o.shipping.price ? brl(o.shipping.price) : 'Grátis'}</dd>
          </div>
          {o.discount > 0 && (
            <div className="is-pix">
              <dt>Desconto Pix</dt>
              <dd className="mono">− {brl(o.discount)}</dd>
            </div>
          )}
          <div className="co-total">
            <dt>Total</dt>
            <dd className="mono">{brl(o.total)}</dd>
          </div>
        </dl>
        <p className="ord-addr">
          <span className="px">Entrega</span>
          {o.shipping.address}
          {o.shipping.days ? ` · ${o.shipping.days} dias úteis após a postagem` : ''}
        </p>
        <p className="ord-addr">
          <span className="px">Pagamento</span>
          {o.payment.method === 'pix'
            ? 'Pix'
            : `Cartão${o.payment.installments ? ` em ${o.payment.installments}x` : ''}`}
          {' · '}
          {o.email}
        </p>
      </aside>
    </div>
  )
}

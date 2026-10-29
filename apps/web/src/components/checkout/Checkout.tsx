'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { placeOrderAction, quoteAction } from '../../app/(frontend)/actions'
import { brl } from '../../lib/catalog'
import {
  FREE_SHIPPING_FROM,
  formatCep,
  isValidCpf,
  onlyDigits,
  orderTotals,
  type PayMethod,
  type ShipOption,
  subtotals,
} from '../../lib/checkout-math'
import { useCart } from '../../store/cart'
import { useHydrated } from '../useHydrated'

type Address = { cep: string; street: string; number: string; complement: string; district: string; city: string; uf: string }
type Prefill = { name: string; email: string; phone: string; address: Address } | null

const EMPTY_ADDRESS: Address = { cep: '', street: '', number: '', complement: '', district: '', city: '', uf: '' }
const PICKUP: ShipOption = {
  id: 'retirada',
  name: 'Retirar em Taubaté',
  detail: 'Seg a sáb, das 10h às 19h',
  days: 0,
  price: 0,
  fullPrice: 0,
  pickup: true,
}

const maskCpf = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
}

export function Checkout({
  prefill,
  loggedIn,
  cardLive,
  simulation,
}: {
  prefill: Prefill
  loggedIn: boolean
  cardLive: boolean
  simulation: boolean
}) {
  const hydrated = useHydrated()
  const lines = useCart(useShallow((s) => Object.values(s.lines)))
  const clear = useCart((s) => s.clear)
  const router = useRouter()

  const [name, setName] = useState(prefill?.name ?? '')
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [phone, setPhone] = useState(maskPhone(prefill?.phone ?? ''))
  const [cpf, setCpf] = useState('')
  const [addr, setAddr] = useState<Address>(prefill?.address ?? EMPTY_ADDRESS)
  // Last shipping quote, tagged with the inputs it was made for: "quoting" and
  // the options are derived from it instead of being set inside the effect.
  const [quote, setQuote] = useState<{ key: string; options: ShipOption[] | null; error: string | null } | null>(null)
  const [pickedShip, setPickedShip] = useState<string | null>(null)
  const [method, setMethod] = useState<PayMethod>('pix')
  const [newsletter, setNewsletter] = useState(false)
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null)
  const [pending, start] = useTransition()

  const priced = useMemo(() => lines.map((l) => ({ price: l.price, qty: l.qty })), [lines])
  const qty = lines.reduce((n, l) => n + l.qty, 0)
  const pixSub = subtotals(priced).pix
  const cepDigits = onlyDigits(addr.cep)
  const quoteKey = cepDigits.length === 8 && qty ? `${cepDigits}|${qty}|${pixSub}` : null
  const current = quote && quote.key === quoteKey ? quote : null
  const quoting = Boolean(quoteKey && !current)
  const cepError = current?.error ?? null
  const options = current?.options ?? [PICKUP]
  const shipId =
    pickedShip && options.some((o) => o.id === pickedShip)
      ? pickedShip
      : (options.find((o) => !o.pickup)?.id ?? 'retirada')
  const ship = options.find((o) => o.id === shipId) ?? PICKUP
  const totals = orderTotals(priced, method, ship.price)

  // Quote shipping whenever the CEP is complete or the inventory changes.
  useEffect(() => {
    if (!quoteKey) return
    let alive = true
    quoteAction(cepDigits, qty, pixSub).then((r) => {
      if (!alive) return
      if (!r.ok) return setQuote({ key: quoteKey, options: null, error: r.error })
      setQuote({ key: quoteKey, options: r.options, error: null })
      setAddr((a) => ({
        ...a,
        street: a.street || r.address.street,
        district: a.district || r.address.district,
        city: r.address.city,
        uf: r.address.uf,
      }))
    })
    return () => {
      alive = false
    }
    // quoteKey already encodes cep, qty and subtotal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey])

  const pickup = shipId === 'retirada'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isValidCpf(cpf)) return setError({ msg: 'Confira o CPF.', field: 'cpf' })
    if (!pickup && (!addr.street || !addr.number)) return setError({ msg: 'Complete o endereço.', field: 'address' })
    start(async () => {
      const r = await placeOrderAction({
        lines: lines.map((l) => ({ copyId: l.id, qty: l.qty })),
        method,
        shipId,
        name,
        email,
        phone,
        cpf,
        address: addr,
        newsletter,
      })
      if (!r.ok) {
        setError({ msg: r.error, field: r.field })
        return
      }
      clear()
      router.push(`/pedido/${r.id}?t=${r.token}`)
    })
  }

  if (!hydrated) return <div className="wrap co-loading" aria-busy="true" />

  if (!lines.length) {
    return (
      <div className="wrap co-empty">
        <h1 className="dsp">Inventário vazio</h1>
        <p>Adicione jogos da loja para fechar um pedido.</p>
        <Link className="btn btn-solid" href="/loja">
          Ver a loja
        </Link>
      </div>
    )
  }

  const fieldCls = (f: string) => (error?.field === f ? 'co-field is-bad' : 'co-field')

  return (
    <form className="wrap co-grid" onSubmit={submit} noValidate={false}>
      <div className="co-main">
        <nav className="px crumbs" aria-label="Você está em">
          <Link href="/loja">Loja</Link>
          <span>/</span>
          <span aria-current="page">Finalizar compra</span>
        </nav>
        <h1 className="dsp co-title">Finalizar compra</h1>
        {simulation && (
          <p className="co-sim" role="note">
            <b className="px">Modo de teste</b> O Mercado Pago ainda não está configurado: o pagamento será simulado e nenhum
            valor é cobrado.
          </p>
        )}

        <section className="co-sec" aria-labelledby="co-1">
          <h2 id="co-1" className="co-h">
            <span className="px">1</span>Seus dados
          </h2>
          {!loggedIn && (
            <p className="co-hint">
              Não precisa de conta. Já comprou aqui? <Link href="/conta?next=/checkout">Entre para somar XP</Link>.
            </p>
          )}
          <div className="co-fields">
            <label className={`${fieldCls('name')} co-span2`}>
              <span>Nome completo</span>
              <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={fieldCls('email')}>
              <span>E-mail</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                readOnly={loggedIn}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className={fieldCls('phone')}>
              <span>WhatsApp (opcional)</span>
              <input
                type="tel"
                autoComplete="tel-national"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(12) 99999-9999"
              />
            </label>
            <label className={fieldCls('cpf')}>
              <span>CPF</span>
              <input
                required
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                aria-describedby="cpf-why"
              />
              <small id="cpf-why">Pedido pelo Mercado Pago e nota fiscal.</small>
            </label>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="co-2">
          <h2 id="co-2" className="co-h">
            <span className="px">2</span>Entrega
          </h2>
          <div className="co-fields">
            <label className={fieldCls('cep')}>
              <span>CEP</span>
              <input
                inputMode="numeric"
                autoComplete="postal-code"
                value={formatCep(addr.cep)}
                onChange={(e) => setAddr({ ...addr, cep: e.target.value })}
                placeholder="12010-000"
                aria-describedby="cep-msg"
              />
              <small id="cep-msg" role="status">
                {quoting ? 'Calculando frete…' : cepError ? cepError : cepDigits.length === 8 ? `${addr.city} - ${addr.uf}` : 'Digite para ver os fretes'}
              </small>
            </label>
          </div>
          <div className="co-ships" role="radiogroup" aria-label="Forma de entrega">
            {options.map((o) => (
              <button
                type="button"
                key={o.id}
                role="radio"
                aria-checked={shipId === o.id}
                className="co-ship"
                onClick={() => setPickedShip(o.id)}
              >
                <i aria-hidden="true" />
                <span>
                  <b>{o.name}</b>
                  <small>{o.detail}</small>
                </span>
                <b className="mono">
                  {o.price === 0 ? (
                    <>
                      {o.fullPrice > 0 && <s>{brl(o.fullPrice)}</s>} Grátis
                    </>
                  ) : (
                    brl(o.price)
                  )}
                </b>
              </button>
            ))}
          </div>
          {pixSub < FREE_SHIPPING_FROM && (
            <p className="co-hint">Faltam {brl(FREE_SHIPPING_FROM - pixSub)} para o frete grátis.</p>
          )}
          {!pickup && (
            <div className="co-fields co-addr">
              <label className={`${fieldCls('address')} co-span2`}>
                <span>Rua</span>
                <input required autoComplete="address-line1" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
              </label>
              <label className={fieldCls('address')}>
                <span>Número</span>
                <input required autoComplete="address-line2" value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} />
              </label>
              <label className="co-field">
                <span>Complemento (opcional)</span>
                <input value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} />
              </label>
              <label className="co-field">
                <span>Bairro</span>
                <input value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} />
              </label>
              <label className="co-field">
                <span>Cidade</span>
                <input value={addr.city ? `${addr.city} - ${addr.uf}` : ''} readOnly tabIndex={-1} />
              </label>
            </div>
          )}
        </section>

        <section className="co-sec" aria-labelledby="co-3">
          <h2 id="co-3" className="co-h">
            <span className="px">3</span>Pagamento
          </h2>
          <div className="co-pays" role="radiogroup" aria-label="Forma de pagamento">
            <button type="button" role="radio" aria-checked={method === 'pix'} className="co-pay" onClick={() => setMethod('pix')}>
              <b>
                Pix <em>5% off</em>
              </b>
              <small>QR Code na próxima tela. Confirma na hora.</small>
            </button>
            <button type="button" role="radio" aria-checked={method === 'card'} className="co-pay" onClick={() => setMethod('card')}>
              <b>Cartão de crédito</b>
              <small>
                Até {totals.maxInstallments}x sem juros{cardLive || simulation ? '' : ' (em breve)'}
              </small>
            </button>
          </div>
          <p className="co-hint">
            Os dados do cartão são digitados no formulário do Mercado Pago. Eles nunca passam pela nossa loja.
          </p>
        </section>

        <label className="co-check">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          <span>Quero receber os drops de sexta e cupons por e-mail.</span>
        </label>
      </div>

      <aside className="co-sum theme-dark" aria-label="Resumo do pedido">
        <ul className="co-items">
          {lines.map((l) => (
            <li key={l.id}>
              <Image src={l.cover} alt="" width={48} height={66} />
              <span>
                <b>{l.title}</b>
                <small>
                  {l.platform} · {l.condition}
                  {l.qty > 1 ? ` · ${l.qty}x` : ''}
                </small>
              </span>
              <b className="mono">{brl((method === 'pix' ? l.pixValue : l.price) * l.qty)}</b>
            </li>
          ))}
        </ul>
        <dl className="co-totals">
          <div>
            <dt>Subtotal</dt>
            <dd className="mono">{brl(totals.subtotal)}</dd>
          </div>
          <div>
            <dt>Frete</dt>
            <dd className="mono">{ship.price ? brl(ship.price) : 'Grátis'}</dd>
          </div>
          {method === 'pix' && (
            <div className="is-pix">
              <dt>Desconto Pix</dt>
              <dd className="mono">− {brl(totals.discount)}</dd>
            </div>
          )}
          <div className="co-total">
            <dt>Total</dt>
            <dd className="mono">{brl(totals.total)}</dd>
          </div>
        </dl>
        <span className="px co-xp">Você ganha +{totals.xp} XP</span>
        {error && (
          <p className="co-error" role="alert">
            {error.msg}
            {error.field === 'lines' && (
              <>
                {' '}
                <button type="button" onClick={() => useCart.getState().openDrawer(true)}>
                  Abrir inventário
                </button>
              </>
            )}
          </p>
        )}
        <button type="submit" className="btn btn-yellow co-cta" disabled={pending || quoting || (method === 'card' && !cardLive && !simulation)}>
          {pending
            ? 'Reservando seus jogos…'
            : method === 'pix'
              ? `Pagar com Pix · ${brl(totals.total)}`
              : `Ir para o cartão · ${brl(totals.total)}`}
        </button>
        <small className="co-safe">
          Reservamos os jogos por 30 minutos enquanto você paga. Ao finalizar, você concorda com os{' '}
          <Link href="/termos">termos</Link> e a <Link href="/privacidade">política de privacidade</Link>.
        </small>
      </aside>

      {/* Phone: total and pay button stay pinned at the bottom. */}
      <div className="co-mbar theme-dark">
        <div>
          <b className="mono">{brl(totals.total)}</b>
          <small>{method === 'pix' ? 'no Pix · 5% off' : `até ${totals.maxInstallments}x no cartão`}</small>
        </div>
        <button type="submit" className="btn btn-yellow" disabled={pending || quoting || (method === 'card' && !cardLive && !simulation)}>
          {pending ? 'Reservando…' : method === 'pix' ? 'Pagar com Pix' : 'Ir para o cartão'}
        </button>
      </div>
    </form>
  )
}

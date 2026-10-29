import 'server-only'

import { randomBytes, timingSafeEqual } from 'crypto'
import { revalidatePath } from 'next/cache'
import QRCode from 'qrcode'

import type { Copy, Customer, Game, Media, Order } from '../payload-types'
import { conditionOf, platformOf } from './catalog'
import {
  isValidCpf,
  onlyDigits,
  orderTotals,
  PIX_MINUTES,
  type PayMethod,
  subtotals,
  unitPrice,
} from './checkout-math'
import { dropForCopies, lockedCopyIds } from './drops'
import { sendOrderCreatedEmail, sendPaidEmail } from './emails'
import { env, payments, simulationEnabled } from './env'
import {
  type CardFormData,
  createCardPayment,
  createPixPayment,
  declineMessage,
  getPayment,
  MpError,
  type MpPayment,
  refundPayment,
} from './mercadopago'
import { getClient } from './payload'
import { quoteShipping } from './shipping'
import { returnStock, takeStock } from './stock'

export type CheckoutInput = {
  lines: { copyId: number; qty: number }[]
  method: PayMethod
  shipId: string
  name: string
  email: string
  phone: string
  cpf: string
  address: { cep: string; street: string; number: string; complement: string; district: string; city: string; uf: string }
  newsletter: boolean
}

type Fail = { ok: false; error: string; field?: string }

const fail = (error: string, field?: string): Fail => ({ ok: false, error, field })

const refresh = () => {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Outside a request (scripts): nothing to revalidate.
  }
}

const coverUrl = (g: Game) => {
  const m = g.cover as Media | number | null | undefined
  return m && typeof m === 'object' ? m.sizes?.thumb?.url || m.url || '' : ''
}

// ---------------------------------------------------------------- checkout

export async function placeOrder(input: CheckoutInput, customer: Customer | null) {
  const payload = await getClient()
  const name = input.name.trim().replace(/\s+/g, ' ')
  const email = input.email.trim().toLowerCase()
  const cpf = onlyDigits(input.cpf)

  if (name.split(' ').length < 2 || name.length < 5) return fail('Escreva nome e sobrenome.', 'name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('Confira o e-mail.', 'email')
  if (!isValidCpf(cpf)) return fail('Confira o CPF.', 'cpf')
  if (input.method !== 'pix' && input.method !== 'card') return fail('Escolha a forma de pagamento.')
  if (!input.lines.length || input.lines.length > 30) return fail('Seu inventário está vazio.')

  // Merge duplicate lines and read the real prices from the database.
  const qtyById = new Map<number, number>()
  for (const l of input.lines) {
    const q = Math.floor(Number(l.qty))
    if (!Number.isInteger(l.copyId) || q < 1) return fail('Inventário inválido. Recarregue a página.')
    qtyById.set(l.copyId, (qtyById.get(l.copyId) ?? 0) + q)
  }
  const ids = [...qtyById.keys()]
  const found = await payload.find({
    collection: 'copies',
    where: { id: { in: ids } },
    depth: 2,
    limit: ids.length,
    overrideAccess: true,
  })
  const locked = await lockedCopyIds(customer ? (customer.xp ?? 0) : null)
  const copies = new Map(found.docs.map((c) => [c.id, c]))
  const gone: string[] = []
  for (const id of ids) {
    const c = copies.get(id)
    const g = c?.game as Game | undefined
    if (!c || !c.active || c.stock < (qtyById.get(id) ?? 1) || locked.has(id)) gone.push(g?.title ?? 'Um item')
  }
  if (gone.length) {
    return fail(
      `${gone.join(', ')} ${gone.length === 1 ? 'acabou de sair' : 'acabaram de sair'} do estoque. Remova do inventário para continuar.`,
      'lines',
    )
  }

  const priced = ids.map((id) => ({ copy: copies.get(id) as Copy, qty: qtyById.get(id) as number }))
  const pixSubtotal = subtotals(priced.map((p) => ({ price: p.copy.price, qty: p.qty }))).pix
  const qty = priced.reduce((n, p) => n + p.qty, 0)

  // Shipping is re-quoted here; the client only says which option it chose.
  const pickup = input.shipId === 'retirada'
  const a = input.address
  const cep = onlyDigits(a.cep)
  if (!pickup) {
    if (cep.length !== 8) return fail('Confira o CEP.', 'cep')
    if (!a.street.trim() || !a.number.trim() || !a.city.trim() || !a.uf.trim())
      return fail('Complete o endereço de entrega.', 'address')
  }
  const options = await quoteShipping(pickup ? env.originCep : cep, qty, pixSubtotal)
  const ship = options.find((o) => o.id === input.shipId)
  if (!ship) return fail('O frete mudou. Escolha a entrega de novo.', 'ship')

  const totals = orderTotals(
    priced.map((p) => ({ price: p.copy.price, qty: p.qty })),
    input.method,
    ship.price,
  )

  // Reserve stock first; roll back everything if any copy was just taken.
  const taken: { id: number; qty: number }[] = []
  for (const p of priced) {
    if (await takeStock(payload, p.copy.id, p.qty)) taken.push({ id: p.copy.id, qty: p.qty })
    else {
      for (const t of taken) await returnStock(payload, t.id, t.qty)
      const g = p.copy.game as Game
      return fail(`${g.title} acabou de sair do estoque. Remova do inventário para continuar.`, 'lines')
    }
  }

  const drop = await dropForCopies(ids)
  const expiresAt = new Date(Date.now() + PIX_MINUTES * 60_000)
  const accessToken = randomBytes(24).toString('hex')

  let order: Order
  try {
    order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        status: 'aguardando',
        customer: customer?.id,
        name,
        email,
        phone: input.phone.trim(),
        cpf,
        items: priced.map((p) => {
          const g = p.copy.game as Game
          const plat = platformOf(g.platform)
          return {
            copy: p.copy.id,
            title: g.title,
            platform: plat.label,
            group: plat.group,
            condition: conditionOf(p.copy.condition).label,
            unitPrice: unitPrice(p.copy.price, input.method),
            qty: p.qty,
            cover: coverUrl(g),
          }
        }),
        shipping: {
          method: ship.name,
          methodId: ship.id,
          price: ship.price,
          days: ship.days,
          ...(pickup
            ? {}
            : {
                cep,
                street: a.street.trim(),
                number: a.number.trim(),
                complement: a.complement.trim(),
                district: a.district.trim(),
                city: a.city.trim(),
                uf: a.uf.trim().toUpperCase().slice(0, 2),
              }),
        },
        payment: { method: input.method, status: 'pending', expiresAt: expiresAt.toISOString(), attempts: 0 },
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        xp: totals.xp,
        drop: drop?.id,
        accessToken,
      },
    })
  } catch (e) {
    for (const t of taken) await returnStock(payload, t.id, t.qty)
    payload.logger.error(e)
    return fail('Não conseguimos registrar o pedido. Tente de novo.')
  }

  if (input.method === 'pix') {
    const res = await startPix(order, name)
    if (!res.ok) {
      await releaseOrder(order.id, 'cancelado')
      return res
    }
  }

  if (customer) {
    await payload.update({
      collection: 'customers',
      id: customer.id,
      overrideAccess: true,
      data: {
        name: customer.name || name,
        phone: input.phone.trim() || customer.phone,
        ...(pickup ? {} : { address: { cep, street: a.street, number: a.number, complement: a.complement, district: a.district, city: a.city, uf: a.uf } }),
      },
    })
  }
  if (input.newsletter) await subscribe(email, { newsletter: true }, 'checkout')

  const fresh = await payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true, depth: 0 })
  await sendOrderCreatedEmail(payload, fresh).catch((e) => payload.logger.error(e))
  refresh()
  return { ok: true as const, id: order.id, token: accessToken }
}

// ---------------------------------------------------------------- Pix

// Static BR Code used only in simulation mode (clearly not a real charge).
function simulatedPixCode(amount: number, id: number) {
  const f = (k: string, v: string) => `${k}${String(v.length).padStart(2, '0')}${v}`
  const gui = f('00', 'br.gov.bcb.pix') + f('01', 'simulacao@checkpointgeek.com.br') + f('02', 'SIMULACAO')
  const body =
    f('00', '01') +
    f('26', gui) +
    f('52', '0000') +
    f('53', '986') +
    f('54', amount.toFixed(2)) +
    f('58', 'BR') +
    f('59', 'CHECKPOINT GEEK SIMULACAO') +
    f('60', 'TAUBATE') +
    f('62', f('05', `PED${1000 + id}`)) +
    '6304'
  let crc = 0xffff
  for (const ch of body) {
    crc ^= ch.charCodeAt(0) << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return body + crc.toString(16).toUpperCase().padStart(4, '0')
}

async function startPix(order: Order, name: string): Promise<{ ok: true } | Fail> {
  const payload = await getClient()
  const expiresAt = new Date(order.payment?.expiresAt || Date.now() + PIX_MINUTES * 60_000)
  try {
    let qrCode: string
    let qrBase64: string
    let mpId: string | undefined
    if (payments.live) {
      const [firstName, ...rest] = name.split(' ')
      const p = await createPixPayment({
        orderId: order.id,
        amount: order.total,
        description: `Checkpoint Geek pedido ${1000 + order.id}`,
        payer: { email: order.email, firstName, lastName: rest.join(' '), cpf: order.cpf || '' },
        expiresAt,
      })
      qrCode = p.point_of_interaction?.transaction_data?.qr_code || ''
      qrBase64 = p.point_of_interaction?.transaction_data?.qr_code_base64 || ''
      mpId = String(p.id)
    } else {
      qrCode = simulatedPixCode(order.total, order.id)
      qrBase64 = (await QRCode.toDataURL(qrCode, { margin: 1, width: 360 })).split(',')[1]
    }
    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: { payment: { ...order.payment, mpId, qrCode, qrBase64, simulated: !payments.live } },
    })
    return { ok: true }
  } catch (e) {
    payload.logger.error(e instanceof MpError ? { msg: e.message, detail: e.detail } : e)
    return fail('O Mercado Pago não gerou o Pix agora. Tente de novo em instantes ou escolha cartão.')
  }
}

// ---------------------------------------------------------------- card

export async function payOrderWithCard(id: number, token: string, form: CardFormData) {
  const payload = await getClient()
  const order = await authorizedOrder(id, token)
  if (!order) return fail('Pedido não encontrado.')
  if (order.status !== 'aguardando' || order.payment?.method !== 'card') return fail('Esse pedido não aceita pagamento agora.')
  if (!payments.cardLive) return fail('Pagamento com cartão não configurado.')
  const attempt = (order.payment?.attempts ?? 0) + 1
  if (attempt > 5) return fail('Limite de tentativas atingido. Faça um novo pedido com Pix.')
  try {
    const p = await createCardPayment({
      orderId: order.id,
      attempt,
      amount: order.total,
      description: `Checkpoint Geek pedido ${1000 + order.id}`,
      email: order.email,
      form,
    })
    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: { payment: { ...order.payment, attempts: attempt } },
    })
    await applyPayment(order.id, p)
    if (p.status === 'rejected') return fail(declineMessage(p.status_detail))
    return { ok: true as const, status: p.status }
  } catch (e) {
    payload.logger.error(e instanceof MpError ? { msg: e.message, detail: e.detail } : e)
    return fail('Não conseguimos falar com o Mercado Pago. Tente de novo.')
  }
}

// ---------------------------------------------------------------- status

// Applies a Mercado Pago payment to its order. Idempotent: webhook retries,
// polling and the card response can all call it with the same payment.
export async function applyPayment(orderId: number, p: MpPayment) {
  const payload = await getClient()
  const order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
  const base = { ...order.payment, mpId: String(p.id), status: p.status, statusDetail: p.status_detail }

  if (p.status === 'approved' || p.status === 'authorized') {
    if (p.installments) base.installments = p.installments
    await payload.update({ collection: 'orders', id: orderId, overrideAccess: true, data: { payment: base } })
    return markPaid(orderId)
  }
  if (p.status === 'refunded' || p.status === 'charged_back') {
    await payload.update({ collection: 'orders', id: orderId, overrideAccess: true, data: { payment: base } })
    if (order.status === 'aguardando' || order.status === 'pago') await releaseOrder(orderId, 'cancelado')
    return
  }
  if (p.status === 'cancelled' && order.status === 'aguardando' && order.payment?.method === 'pix') {
    await payload.update({ collection: 'orders', id: orderId, overrideAccess: true, data: { payment: base } })
    return releaseOrder(orderId, 'expirado')
  }
  if (order.status === 'aguardando') {
    await payload.update({ collection: 'orders', id: orderId, overrideAccess: true, data: { payment: base } })
  }
}

export async function markPaid(orderId: number, opts: { simulated?: boolean } = {}) {
  const payload = await getClient()
  const order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
  if (order.status !== 'aguardando' && order.status !== 'expirado') return

  // Paid after expiring: take the stock back if it is still there, otherwise
  // refund automatically and tell the store.
  if (order.stockReleased) {
    const taken: { id: number; qty: number }[] = []
    for (const i of order.items) {
      const id = typeof i.copy === 'number' ? i.copy : i.copy.id
      if (await takeStock(payload, id, i.qty)) taken.push({ id, qty: i.qty })
      else {
        for (const t of taken) await returnStock(payload, t.id, t.qty)
        if (payments.live && order.payment?.mpId) await refundPayment(order.payment.mpId).catch((e) => payload.logger.error(e))
        await payload.update({
          collection: 'orders',
          id: orderId,
          overrideAccess: true,
          data: {
            status: 'cancelado',
            payment: { ...order.payment, statusDetail: 'Pago depois de expirar e o item já tinha saído: estornado' },
          },
        })
        return
      }
    }
  }

  const paid = await payload.update({
    collection: 'orders',
    id: orderId,
    overrideAccess: true,
    data: {
      status: 'pago',
      stockReleased: false,
      payment: {
        ...order.payment,
        status: 'approved',
        paidAt: new Date().toISOString(),
        ...(opts.simulated ? { simulated: true } : {}),
      },
    },
  })
  await creditXp(orderId)
  await sendPaidEmail(payload, paid).catch((e) => payload.logger.error(e))
  refresh()
}

export async function releaseOrder(orderId: number, status: 'expirado' | 'cancelado') {
  const payload = await getClient()
  const order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
  if (!order.stockReleased) {
    for (const i of order.items) await returnStock(payload, typeof i.copy === 'number' ? i.copy : i.copy.id, i.qty)
  }
  if (order.xpCredited && order.customer) {
    const cid = typeof order.customer === 'number' ? order.customer : order.customer.id
    const c = await payload.findByID({ collection: 'customers', id: cid, overrideAccess: true, depth: 0 })
    await payload.update({
      collection: 'customers',
      id: cid,
      overrideAccess: true,
      data: { xp: Math.max(0, (c.xp ?? 0) - (order.xp ?? 0)) },
    })
  }
  await payload.update({
    collection: 'orders',
    id: orderId,
    overrideAccess: true,
    data: { status, stockReleased: true, xpCredited: false },
  })
  refresh()
}

export async function creditXp(orderId: number) {
  const payload = await getClient()
  const order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
  if (order.xpCredited || !order.customer || !order.xp) return
  const cid = typeof order.customer === 'number' ? order.customer : order.customer.id
  const c = await payload.findByID({ collection: 'customers', id: cid, overrideAccess: true, depth: 0 })
  await payload.update({ collection: 'customers', id: cid, overrideAccess: true, data: { xp: (c.xp ?? 0) + order.xp } })
  await payload.update({ collection: 'orders', id: orderId, overrideAccess: true, data: { xpCredited: true } })
}

// Unpaid orders give their copies back after the Pix window (+2 min margin
// for late confirmations). Runs on the cron route and lazily on page views.
export async function expireStaleOrders() {
  const payload = await getClient()
  const limit = new Date(Date.now() - 2 * 60_000).toISOString()
  const stale = await payload.find({
    collection: 'orders',
    where: { and: [{ status: { equals: 'aguardando' } }, { 'payment.expiresAt': { less_than: limit } }] },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  for (const o of stale.docs) {
    // Last check with Mercado Pago before giving the copies back.
    if (payments.live && o.payment?.mpId) {
      const p = await getPayment(o.payment.mpId).catch(() => null)
      if (p && (p.status === 'approved' || p.status === 'authorized')) {
        await applyPayment(o.id, p)
        continue
      }
    }
    await releaseOrder(o.id, 'expirado')
  }
  return stale.docs.length
}

// ---------------------------------------------------------------- viewing

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// An order is visible with its secret link (guests) or to its account owner.
export async function authorizedOrder(id: number, token: string | null, customer: Customer | null = null) {
  const payload = await getClient()
  const order = await payload
    .findByID({ collection: 'orders', id, overrideAccess: true, depth: 0 })
    .catch(() => null)
  if (!order) return null
  const owner = customer && order.customer && (typeof order.customer === 'number' ? order.customer : order.customer.id) === customer.id
  if (owner || (token && order.accessToken && sameToken(token, order.accessToken))) return order
  return null
}

// Brings a pending order up to date: expiry and, when the webhook cannot
// reach us (local development), the payment status straight from Mercado Pago.
export async function refreshOrder(order: Order) {
  if (order.status !== 'aguardando') return order
  const payload = await getClient()
  const expired = order.payment?.expiresAt && new Date(order.payment.expiresAt).getTime() < Date.now() - 2 * 60_000
  if (payments.live && order.payment?.mpId) {
    const p = await getPayment(order.payment.mpId).catch(() => null)
    if (p && p.status !== order.payment.status) await applyPayment(order.id, p)
  }
  const now = await payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true, depth: 0 })
  if (now.status === 'aguardando' && expired) {
    await releaseOrder(order.id, 'expirado')
    return payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true, depth: 0 })
  }
  return now
}

export async function simulate(id: number, token: string, outcome: 'approved' | 'rejected' | 'expired') {
  if (!simulationEnabled) return fail('Simulação desativada.')
  const order = await authorizedOrder(id, token)
  if (!order || order.status !== 'aguardando') return fail('Esse pedido não está aguardando pagamento.')
  const payload = await getClient()
  if (outcome === 'approved') await markPaid(id, { simulated: true })
  if (outcome === 'expired') await releaseOrder(id, 'expirado')
  if (outcome === 'rejected') {
    await payload.update({
      collection: 'orders',
      id,
      overrideAccess: true,
      data: {
        payment: {
          ...order.payment,
          status: 'rejected',
          statusDetail: 'cc_rejected_insufficient_amount',
          attempts: (order.payment?.attempts ?? 0) + 1,
          simulated: true,
        },
      },
    })
  }
  return { ok: true as const }
}

// ---------------------------------------------------------------- newsletter

export async function subscribe(rawEmail: string, what: { newsletter?: boolean; dropAlerts?: boolean }, source: string) {
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('Confira o e-mail.')
  const payload = await getClient()
  const found = await payload.find({
    collection: 'subscribers',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  const now = new Date().toISOString()
  if (found.docs[0]) {
    await payload.update({
      collection: 'subscribers',
      id: found.docs[0].id,
      overrideAccess: true,
      data: { ...what, unsubscribedAt: null, consentAt: now },
    })
  } else {
    await payload.create({ collection: 'subscribers', overrideAccess: true, data: { email, ...what, source, consentAt: now } })
  }
  return { ok: true as const }
}

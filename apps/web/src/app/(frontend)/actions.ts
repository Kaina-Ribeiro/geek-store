'use server'

import { getCustomer, requestLoginLink } from '../../lib/auth'
import { onlyDigits, type ShipOption } from '../../lib/checkout-math'
import type { CardFormData } from '../../lib/mercadopago'
import {
  authorizedOrder,
  type CheckoutInput,
  payOrderWithCard,
  placeOrder,
  refreshOrder,
  simulate,
  subscribe,
} from '../../lib/orders'
import { toOrderView } from '../../lib/order-view'
import { getClient } from '../../lib/payload'
import { lookupCep, quoteShipping } from '../../lib/shipping'
import { checkSigned } from '../../lib/sign'

// Server actions used by the storefront. Each one validates its own input:
// they are public endpoints.

export async function quoteAction(rawCep: string, qty: number, pixSubtotal: number) {
  const cep = onlyDigits(String(rawCep))
  if (cep.length !== 8) return { ok: false as const, error: 'CEP com 8 números.' }
  const q = Math.max(1, Math.min(30, Math.floor(Number(qty) || 1)))
  const sub = Math.max(0, Number(pixSubtotal) || 0)
  const [address, options] = await Promise.all([lookupCep(cep), quoteShipping(cep, q, sub)])
  if (!address) return { ok: false as const, error: 'Não achamos esse CEP.' }
  return { ok: true as const, address, options: options as ShipOption[] }
}

export async function placeOrderAction(input: CheckoutInput) {
  const customer = await getCustomer()
  return placeOrder(input, customer)
}

export async function orderStatusAction(id: number, token: string) {
  const customer = await getCustomer()
  const order = await authorizedOrder(Number(id), String(token || ''), customer)
  if (!order) return null
  return toOrderView(await refreshOrder(order))
}

export async function payCardAction(id: number, token: string, form: CardFormData) {
  return payOrderWithCard(Number(id), String(token || ''), form)
}

export async function simulateAction(id: number, token: string, outcome: 'approved' | 'rejected' | 'expired') {
  if (!['approved', 'rejected', 'expired'].includes(outcome)) return { ok: false as const, error: 'Opção inválida.' }
  return simulate(Number(id), String(token || ''), outcome)
}

export async function loginLinkAction(email: string, next?: string) {
  return requestLoginLink(String(email || ''), next)
}

export async function subscribeAction(email: string, kind: 'newsletter' | 'drop') {
  return subscribe(String(email || ''), kind === 'drop' ? { dropAlerts: true } : { newsletter: true }, kind)
}

export async function unsubscribeAction(id: number, sig: string) {
  if (!checkSigned('unsub', id, sig)) return { ok: false as const }
  const payload = await getClient()
  await payload
    .update({
      collection: 'subscribers',
      id,
      overrideAccess: true,
      data: { newsletter: false, dropAlerts: false, unsubscribedAt: new Date().toISOString() },
    })
    .catch(() => null)
  return { ok: true as const }
}

// Save slots: kept in the browser for visitors, mirrored on the account
// when logged in. Returns null for visitors.
export async function syncSavesAction(local: number[]) {
  const customer = await getCustomer()
  if (!customer) return null
  const payload = await getClient()
  const mine = (customer.saves || []).map((g) => (typeof g === 'number' ? g : g.id))
  const games = await payload.find({
    collection: 'games',
    where: { id: { in: [...new Set([...mine, ...local.map(Number)])] } },
    depth: 0,
    limit: 500,
  })
  const merged = games.docs.map((g) => g.id)
  if (merged.length !== mine.length) {
    await payload.update({ collection: 'customers', id: customer.id, overrideAccess: true, data: { saves: merged } })
  }
  return merged
}

export async function setSaveAction(gameId: number, on: boolean) {
  const customer = await getCustomer()
  if (!customer) return
  const payload = await getClient()
  const mine = new Set((customer.saves || []).map((g) => (typeof g === 'number' ? g : g.id)))
  if (on) mine.add(Number(gameId))
  else mine.delete(Number(gameId))
  await payload
    .update({ collection: 'customers', id: customer.id, overrideAccess: true, data: { saves: [...mine] } })
    .catch(() => null)
}

export async function updateProfileAction(name: string, phone: string) {
  const customer = await getCustomer()
  if (!customer) return { ok: false as const, error: 'Entre na sua conta.' }
  const n = String(name || '').trim().slice(0, 80)
  const p = String(phone || '').trim().slice(0, 30)
  const payload = await getClient()
  await payload.update({ collection: 'customers', id: customer.id, overrideAccess: true, data: { name: n, phone: p } })
  return { ok: true as const }
}

// "Rastrear pedido": order number + purchase e-mail open the order page.
export async function trackAction(rawNumber: string, rawEmail: string) {
  const n = Number(String(rawNumber || '').replace(/\D/g, ''))
  const email = String(rawEmail || '').trim().toLowerCase()
  if (!n || !email) return { ok: false as const, error: 'Preencha o número e o e-mail.' }
  const payload = await getClient()
  const order = await payload
    .findByID({ collection: 'orders', id: n - 1000, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!order || order.email !== email) return { ok: false as const, error: 'Não achamos um pedido com esse número e e-mail.' }
  return { ok: true as const, href: `/pedido/${order.id}?t=${order.accessToken}` }
}

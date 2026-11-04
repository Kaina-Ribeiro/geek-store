/* Concurrency and panel checks for order state (stock, XP, ownership), against
 * the local database in simulation mode. Run with: pnpm --filter web races
 * Consumes stock: reseed afterwards (pnpm seed). Each block reproduces a bug
 * found in the 04/11 audit (AUDITORIA.md) and asserts it stays fixed. */
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

import type { CheckoutInput } from '../lib/orders'
import type { Customer } from '../payload-types'

const { getClient } = await import('../lib/payload')
const orders = await import('../lib/orders')
const { lockedCopyIds } = await import('../lib/drops')

const payload = await getClient()
const log = (m: string) => console.log(`  ✓ ${m}`)

// Example CPF from the check-digit algorithm (not a real person's document).
const CPF = '111.444.777-35'

const input = (copyId: number, email: string): CheckoutInput => ({
  lines: [{ copyId, qty: 1 }],
  method: 'pix',
  shipId: 'retirada',
  name: 'Cliente Corrida',
  email,
  phone: '',
  cpf: CPF,
  address: { cep: '', street: '', number: '', complement: '', district: '', city: '', uf: '' },
  newsletter: false,
})

const stockOf = async (id: number) => (await payload.findByID({ collection: 'copies', id, depth: 0 })).stock
const orderOf = (id: number) => payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })
const xpOf = async (id: number) => (await payload.findByID({ collection: 'customers', id, depth: 0 })).xp ?? 0

const all = await payload.find({ collection: 'copies', where: { stock: { equals: 1 } }, depth: 0, limit: 200 })
const locked = await lockedCopyIds()
const free = all.docs.filter((c) => !locked.has(c.id))
assert(free.length >= 8, 'precisa de 8 cópias únicas livres: rode pnpm seed')
let next = 0
const takeCopy = () => free[next++].id

const newCustomer = async (tag: string) =>
  (await payload.create({
    collection: 'customers',
    overrideAccess: true,
    data: { email: `${tag}.${Date.now()}@example.com`, password: randomBytes(18).toString('base64url'), name: 'Corrida' },
  })) as Customer

const place = async (copyId: number, customer: Customer | null, email = 'corrida@example.com') => {
  const r = await orders.placeOrder(input(copyId, customer?.email ?? email), customer)
  assert(r.ok, !r.ok ? r.error : '')
  return r.id
}

console.log('C2 · expiração concorrente')
{
  const copy = takeCopy()
  const id = await place(copy, null)
  assert.equal(await stockOf(copy), 0)
  await Promise.all(Array.from({ length: 6 }, () => orders.releaseOrder(id, 'expirado')))
  assert.equal(await stockOf(copy), 1, 'estoque deve voltar uma vez só')
  assert.equal((await orderOf(id)).status, 'expirado')
  log('6 expirações ao mesmo tempo devolvem a cópia uma única vez')
}
{
  const copy = takeCopy()
  const id = await place(copy, null)
  await Promise.all([orders.markPaid(id), orders.releaseOrder(id, 'expirado'), orders.releaseOrder(id, 'expirado')])
  const o = await orderOf(id)
  assert.equal(o.status, 'pago')
  assert.equal(await stockOf(copy), 0, 'pedido pago segura a cópia')
  log('pagamento e expiração ao mesmo tempo terminam pago com a cópia reservada')
}

console.log('M1 · XP de dois pedidos pagos juntos')
{
  const c = await newCustomer('xp')
  const a = await place(takeCopy(), c)
  const b = await place(takeCopy(), c)
  const sum = ((await orderOf(a)).xp ?? 0) + ((await orderOf(b)).xp ?? 0)
  await Promise.all([orders.markPaid(a), orders.markPaid(b), orders.markPaid(a)])
  assert.equal(await xpOf(c.id), sum)
  log(`XP somado certo (${sum}), sem crédito em dobro`)
}

console.log('A1 · status mudado pelo painel')
const owner = (await payload.find({ collection: 'users', where: { role: { equals: 'dono' } }, limit: 1 })).docs[0]
assert(owner, 'seed cria o dono')
const staff = { ...owner, collection: 'users' as const }
const panel = (id: number, status: 'pago' | 'cancelado' | 'expirado') =>
  payload.update({ collection: 'orders', id, data: { status }, user: staff, overrideAccess: false })
{
  const c = await newCustomer('painel')
  const copy = takeCopy()
  const id = await place(copy, c)
  await orders.markPaid(id)
  const xp = await xpOf(c.id)
  assert(xp > 0)
  await panel(id, 'cancelado')
  assert.equal(await stockOf(copy), 1, 'cancelar no painel devolve a cópia')
  assert.equal(await xpOf(c.id), 0, 'e estorna o XP')
  log('cancelar pedido pago no painel devolve a cópia e o XP')

  await orders.releaseOrder(id, 'cancelado')
  assert.equal(await stockOf(copy), 1)
  log('cancelar de novo pelo sistema não devolve outra vez')
}
{
  const c = await newCustomer('manual')
  const copy = takeCopy()
  const id = await place(copy, c)
  await orders.releaseOrder(id, 'expirado')
  assert.equal(await stockOf(copy), 1)
  await panel(id, 'pago')
  const o = await orderOf(id)
  assert.equal(o.status, 'pago')
  assert.equal(await stockOf(copy), 0, 'marcar pago no painel tira a cópia de novo')
  assert(o.payment?.paidAt, 'data de pagamento gravada')
  assert.equal(await xpOf(c.id), o.xp, 'XP creditado')
  log('marcar como pago no painel retira a cópia, grava a data e credita XP')
}
{
  const copy = takeCopy()
  const id = await place(copy, null)
  await orders.releaseOrder(id, 'expirado')
  const other = await place(copy, null, 'outra@example.com')
  await assert.rejects(panel(id, 'pago'), /já foi vendida/)
  assert.equal((await orderOf(id)).status, 'expirado')
  assert.equal(await stockOf(copy), 0, 'a cópia segue com o outro pedido')
  await orders.releaseOrder(other, 'expirado')
  log('marcar como pago uma cópia já revendida é recusado com mensagem')
}

console.log('A2 · pagar pela conta, sem o link secreto')
{
  const c = await newCustomer('conta')
  const id = await place(takeCopy(), c)
  const stranger = await newCustomer('estranho')
  const denied = await orders.simulate(id, '', 'approved', stranger)
  assert(!denied.ok, 'outra conta não paga o pedido')
  const r = await orders.simulate(id, '', 'approved', c)
  assert(r.ok, !r.ok ? r.error : '')
  assert.equal((await orderOf(id)).status, 'pago')
  log('o dono logado paga o próprio pedido; outra conta não')
}

console.log('C1 · cliente não troca o próprio e-mail pela API')
{
  const c = await newCustomer('email')
  const self = { ...c, collection: 'customers' as const }
  await assert.rejects(
    payload.update({ collection: 'customers', id: c.id, data: { email: 'vitima@example.com' }, user: self, overrideAccess: false }),
  )
  assert.equal((await payload.findByID({ collection: 'customers', id: c.id, depth: 0 })).email, c.email)
  log('PATCH do próprio e-mail é recusado')
}

console.log('\nTudo certo.')
process.exit(0)

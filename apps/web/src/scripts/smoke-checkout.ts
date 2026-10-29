/* Smoke test of the purchase flow against the local database, in simulation
 * mode (no Mercado Pago keys). Run with: pnpm --filter web smoke
 * Creates real orders in the dev database; reseed afterwards if you want a
 * clean catalog. */
import assert from 'node:assert/strict'

import type { CheckoutInput } from '../lib/orders'

const { getClient } = await import('../lib/payload')
const orders = await import('../lib/orders')
const { lockedCopyIds } = await import('../lib/drops')

const payload = await getClient()
const log = (m: string) => console.log(`  ✓ ${m}`)

// Example CPF from the check-digit algorithm (not a real person's document).
const CPF = '111.444.777-35'

const base = (lines: CheckoutInput['lines'], method: 'pix' | 'card' = 'pix'): CheckoutInput => ({
  lines,
  method,
  shipId: 'retirada',
  name: 'Cliente Teste',
  email: 'cliente.teste@example.com',
  phone: '',
  cpf: CPF,
  address: { cep: '', street: '', number: '', complement: '', district: '', city: '', uf: '' },
  newsletter: false,
})

const stockOf = async (id: number) => (await payload.findByID({ collection: 'copies', id, depth: 0 })).stock

const all = await payload.find({ collection: 'copies', where: { stock: { greater_than: 0 } }, depth: 0, limit: 200 })
const locked = await lockedCopyIds()
const unique = all.docs.find((c) => c.stock === 1 && !locked.has(c.id))
const multi = all.docs.find((c) => c.stock > 1 && !locked.has(c.id))
const dropCopy = all.docs.find((c) => locked.has(c.id))
assert(unique && multi && dropCopy, 'seed precisa de cópia única, cópia com estoque e cópia de drop')

console.log('Checkout')
const bad = await orders.placeOrder({ ...base([{ copyId: multi.id, qty: 1 }]), cpf: '123.456.789-00' }, null)
assert(!bad.ok && bad.field === 'cpf')
log('CPF inválido é recusado')

const fromDrop = await orders.placeOrder(base([{ copyId: dropCopy.id, qty: 1 }]), null)
assert(!fromDrop.ok)
log('cópia de drop fechado não pode ser comprada')

const before = await stockOf(unique.id)
const o1 = await orders.placeOrder(base([{ copyId: unique.id, qty: 1 }]), null)
assert(o1.ok, !o1.ok ? o1.error : '')
assert.equal(await stockOf(unique.id), before - 1)
log('pedido Pix criado e cópia única reservada')

const twice = await orders.placeOrder(base([{ copyId: unique.id, qty: 1 }]), null)
assert(!twice.ok && twice.field === 'lines')
log('a mesma cópia não é vendida duas vezes')

const o1doc = await payload.findByID({ collection: 'orders', id: o1.id, depth: 0, overrideAccess: true })
assert.equal(o1doc.payment?.method, 'pix')
assert(o1doc.payment?.qrCode?.startsWith('000201'), 'código Pix simulado')
assert.equal(o1doc.number, `#${1000 + o1.id}`)
assert(o1doc.discount && o1doc.discount > 0, 'desconto Pix aplicado')
log(`QR Code gerado, número ${o1doc.number}, desconto Pix de R$ ${o1doc.discount}`)

const wrong = await orders.authorizedOrder(o1.id, 'token-errado')
assert.equal(wrong, null)
log('pedido não abre com token errado')

await orders.simulate(o1.id, o1.token, 'approved')
const paid = await payload.findByID({ collection: 'orders', id: o1.id, depth: 0, overrideAccess: true })
assert.equal(paid.status, 'pago')
assert.equal(await stockOf(unique.id), before - 1)
log('Pix simulado: pedido pago e estoque mantido')

console.log('Cartão e expiração')
const mBefore = await stockOf(multi.id)
const o2 = await orders.placeOrder(base([{ copyId: multi.id, qty: 2 }], 'card'), null)
assert(o2.ok, !o2.ok ? o2.error : '')
const o2doc = await payload.findByID({ collection: 'orders', id: o2.id, depth: 0, overrideAccess: true })
assert.equal(o2doc.discount, 0)
assert.equal(await stockOf(multi.id), mBefore - 2)
log('pedido no cartão sem desconto Pix, 2 unidades reservadas')

await orders.simulate(o2.id, o2.token, 'rejected')
const rej = await payload.findByID({ collection: 'orders', id: o2.id, depth: 0, overrideAccess: true })
assert.equal(rej.status, 'aguardando')
assert.equal(rej.payment?.status, 'rejected')
log('cartão recusado mantém o pedido aberto para nova tentativa')

await orders.simulate(o2.id, o2.token, 'expired')
const exp = await payload.findByID({ collection: 'orders', id: o2.id, depth: 0, overrideAccess: true })
assert.equal(exp.status, 'expirado')
assert.equal(await stockOf(multi.id), mBefore)
log('expirado devolve o estoque')

await orders.markPaid(o2.id)
const late = await payload.findByID({ collection: 'orders', id: o2.id, depth: 0, overrideAccess: true })
assert.equal(late.status, 'pago')
assert.equal(await stockOf(multi.id), mBefore - 2)
log('pagamento que chega depois de expirar retoma o estoque se ainda houver')

await orders.releaseOrder(o2.id, 'cancelado')
assert.equal(await stockOf(multi.id), mBefore)
log('cancelamento devolve o estoque')

console.log('Pedidos para abrir no navegador')
const o3 = await orders.placeOrder(base([{ copyId: multi.id, qty: 1 }]), null)
assert(o3.ok)
console.log(`  pago:      /pedido/${o1.id}?t=${o1.token}`)
console.log(`  aguardando: /pedido/${o3.id}?t=${o3.token}`)
console.log('\nTudo certo.')
process.exit(0)

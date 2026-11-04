/* Server smoke test of the owner panel (/painel) against the local database.
 * Run with: pnpm --filter web smoke:painel
 * Uses the owner and staff accounts from the seed; restores what it changes. */
import assert from 'node:assert/strict'
import sharp from 'sharp'

import type { User } from '../payload-types'

const { getClient } = await import('../lib/payload')
const { publishHero, loadHero } = await import('../lib/painel/hero-store')
const { saveImage } = await import('../lib/painel/media')

const payload = await getClient()
const log = (m: string) => console.log(`  ✓ ${m}`)

const userBy = async (role: 'dono' | 'equipe') => {
  const r = await payload.find({ collection: 'users', where: { role: { equals: role } }, limit: 1, overrideAccess: true })
  assert(r.docs[0], `seed precisa de um usuário ${role} (rode pnpm seed)`)
  return { ...r.docs[0], collection: 'users' } as User & { collection: 'users' }
}
const dono = await userBy('dono')
const equipe = await userBy('equipe')

// ---------------------------------------------------------------- Banner
console.log('Banner')
const original = await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })
const mediaIds: number[] = []
try {
  const start = await loadHero(payload, equipe)
  assert.equal(start.draft.title, original.title)

  const draft = { ...start.draft, title: 'Smoke\ndo painel' }
  const r1 = await publishHero(payload, equipe, draft, start.updatedAt)
  assert(r1.ok, JSON.stringify(r1))
  const after = await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })
  assert.equal(after.title, 'Smoke\ndo painel')
  log('equipe publica e o banner muda')

  const r2 = await publishHero(payload, equipe, { ...draft, title: 'Outro' }, start.updatedAt)
  assert(!r2.ok && r2.stale, 'rascunho velho deve voltar stale')
  const r3 = await publishHero(payload, dono, { ...draft, title: 'Por cima' }, start.updatedAt, true)
  assert(r3.ok)
  log('rascunho velho é recusado (stale); com force publica por cima')

  const r4 = await publishHero(payload, null, { ...draft, title: 'Visitante' }, r3.updatedAt, true)
  assert(!r4.ok)
  assert.equal((await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })).title, 'Por cima')
  log('visitante não publica')

  const r5 = await publishHero(payload, equipe, { ...draft, title: '' }, r3.updatedAt)
  assert(!r5.ok && r5.fields?.title === 'Escreva um título')
  log('título vazio volta com a mensagem do campo')

  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#FFC61A' } }).png().toBuffer()
  const i1 = await saveImage(payload, equipe, new File([new Uint8Array(png)], 'banner.png', { type: 'image/png' }), 'Banner')
  assert(i1.ok, JSON.stringify(i1))
  mediaIds.push(i1.id)
  log('foto PNG é gravada')

  const pdf = new File([new Uint8Array(Buffer.from('%PDF-1.4 fake'))], 'foto.jpg', { type: 'image/jpeg' })
  const i2 = await saveImage(payload, equipe, pdf, 'x')
  assert(!i2.ok && i2.error === 'Use uma foto JPG, PNG ou WebP', JSON.stringify(i2))
  const heic = new File([new Uint8Array(png)], 'foto.heic', { type: 'image/heic' })
  const i3 = await saveImage(payload, equipe, heic, 'x')
  assert(!i3.ok && i3.error === 'Use uma foto JPG, PNG ou WebP')
  const big = new File([new Uint8Array(9 * 1024 * 1024)], 'grande.jpg', { type: 'image/jpeg' })
  const i4 = await saveImage(payload, equipe, big, 'x')
  assert(!i4.ok && i4.error === 'Foto grande demais (máx. 8 MB)')
  const i5 = await saveImage(payload, null, new File([new Uint8Array(png)], 'v.png', { type: 'image/png' }), 'x')
  assert(!i5.ok)
  log('PDF renomeado, HEIC, 9 MB e visitante são recusados')
} finally {
  await payload.updateGlobal({
    slug: 'home-hero',
    data: { title: original.title, subtitle: original.subtitle, ctaLabel: original.ctaLabel, slides: original.slides },
    overrideAccess: true,
  })
  for (const id of mediaIds) await payload.delete({ collection: 'media', id, overrideAccess: true })
}

// ---------------------------------------------------------------- Jogos
console.log('Jogos')
const { saveGame, loadGameDraft, listGamesForPanel } = await import('../lib/painel/game-store')
const heroBefore = await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })
const anyCover = (await payload.find({ collection: 'media', limit: 1, depth: 0, overrideAccess: true })).docs[0]
assert(anyCover, 'seed precisa de imagens')
const stamp = Date.now().toString(36)
const title = `Smoke Painel ${stamp}`
const gameIds: number[] = []
const cleanupTitles = [title, `Smoke Rollback ${stamp}`]
try {
  const draft = {
    title,
    platform: 'ps2' as const,
    coverId: anyCover.id,
    year: '2005',
    ageRating: '',
    genre: '',
    description: '',
    showInHero: true,
    copies: [
      { condition: 'lacrado' as const, price: '99,90', stock: 2, active: true },
      { condition: 'b' as const, price: '79,90', stock: 1, active: true },
    ],
  }
  const g1 = await saveGame(payload, equipe, draft)
  assert(g1.ok, JSON.stringify(g1))
  gameIds.push(g1.id)
  const copies = await payload.find({ collection: 'copies', where: { game: { equals: g1.id } }, depth: 0, overrideAccess: true, sort: 'createdAt' })
  assert.equal(copies.totalDocs, 2)
  assert.deepEqual(copies.docs.map((c) => [c.condition, c.price, c.stock]).sort(), [['b', 79.9, 1], ['lacrado', 99.9, 2]])
  assert(copies.docs.find((c) => c.condition === 'b')?.laudo?.boot === true, 'Nota B ganha o laudo padrão')
  const game = await payload.findByID({ collection: 'games', id: g1.id, depth: 0, overrideAccess: true })
  assert.match(game.glow || '', /^#[0-9A-F]{6}$/, 'glow automático pela capa')
  const hero1 = await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })
  assert((hero1.slides || []).some((s) => s.game === g1.id && s.visible), 'slide do jogo no banner')
  log('cria jogo com 1 lacrado ×2 e 1 Nota B, glow automático e slide no banner')

  const loaded = await loadGameDraft(payload, equipe, g1.id)
  assert(loaded && loaded.draft.copies.length === 2 && loaded.draft.showInHero)
  const keep = loaded.draft.copies.filter((c) => c.condition === 'lacrado')
  const g2 = await saveGame(payload, equipe, { ...loaded.draft, copies: keep.map((c) => ({ ...c, price: '89,90' })), showInHero: false })
  assert(g2.ok, JSON.stringify(g2))
  const after = await payload.find({ collection: 'copies', where: { game: { equals: g1.id } }, depth: 0, overrideAccess: true })
  assert.equal(after.totalDocs, 2, 'nenhuma cópia apagada')
  assert.equal(after.docs.find((c) => c.condition === 'b')?.active, false)
  assert.equal(after.docs.find((c) => c.condition === 'lacrado')?.price, 89.9)
  const hero2 = await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })
  assert(!(hero2.slides || []).some((s) => s.game === g1.id), 'slide sai do banner')
  log('cópia removida fica fora da loja (active: false), preço muda e o slide sai')

  const dup = await saveGame(payload, equipe, { ...draft, showInHero: false })
  assert(!dup.ok && dup.existingId === g1.id && dup.error === 'Esse jogo já existe no PS2. Abrir ele?', JSON.stringify(dup))
  log('jogo repetido aponta para o existente')

  const bad = await saveGame(payload, equipe, {
    ...draft,
    title: `Smoke Rollback ${stamp}`,
    showInHero: true,
    copies: [draft.copies[0], { condition: 'invalida' as never, price: '10', stock: 1, active: true }],
  })
  assert(!bad.ok)
  const leftover = await payload.find({ collection: 'games', where: { title: { equals: `Smoke Rollback ${stamp}` } }, overrideAccess: true })
  assert.equal(leftover.totalDocs, 0, 'jogo não fica no banco')
  const heroBad = await payload.findGlobal({ slug: 'home-hero', depth: 0, overrideAccess: true })
  assert.equal((heroBad.slides || []).length, (hero2.slides || []).length, 'banner não muda')
  log('erro na 2ª cópia desfaz tudo (jogo, 1ª cópia e slide)')

  const visitor = await saveGame(payload, null, { ...draft, title: `Smoke Visitante ${stamp}` })
  assert(!visitor.ok)
  log('visitante não grava')

  const list = await listGamesForPanel(payload, equipe, title)
  assert(list.length === 1 && list[0].state === 'ok' && list[0].minPrice === 89.9, JSON.stringify(list))
  log('lista do painel acha o jogo pelo nome')
} finally {
  const extra = await payload.find({ collection: 'games', where: { title: { in: cleanupTitles } }, depth: 0, overrideAccess: true })
  for (const id of new Set([...gameIds, ...extra.docs.map((g) => g.id)])) {
    await payload.delete({ collection: 'copies', where: { game: { equals: id } }, overrideAccess: true })
    await payload.delete({ collection: 'games', id, overrideAccess: true })
  }
  await payload.updateGlobal({ slug: 'home-hero', data: { slides: heroBefore.slides }, overrideAccess: true })
}

// ---------------------------------------------------------------- Pedidos
console.log('Pedidos')
const { moveOrder, listOrdersForPanel } = await import('../lib/painel/order-store')
const orders = await import('../lib/orders')
const sent: string[] = []
const realSend = payload.sendEmail.bind(payload)
payload.sendEmail = (async (m: { subject?: string }) => {
  sent.push(String(m.subject))
  return realSend(m as never)
}) as typeof payload.sendEmail
const forSale = await payload.find({ collection: 'copies', where: { and: [{ active: { equals: true } }, { stock: { greater_than: 1 } }] }, depth: 0, limit: 1, overrideAccess: true })
const copy = forSale.docs[0]
assert(copy, 'seed precisa de uma cópia com estoque 2+')
const placed = await orders.placeOrder(
  {
    lines: [{ copyId: copy.id, qty: 1 }],
    method: 'pix',
    shipId: 'pac',
    name: 'Cliente Painel',
    email: 'cliente.painel@example.com',
    phone: '',
    // Example CPF from the check-digit algorithm (not a real person's document).
    cpf: '111.444.777-35',
    address: { cep: '12010-000', street: 'Rua Teste', number: '10', complement: '', district: 'Centro', city: 'Taubaté', uf: 'SP' },
    newsletter: false,
  },
  null,
)
assert(placed.ok, JSON.stringify(placed))
await orders.simulate(placed.id, placed.token, 'approved')
const stockPaid = (await payload.findByID({ collection: 'copies', id: copy.id, depth: 0, overrideAccess: true })).stock
const listed = await listOrdersForPanel(payload, equipe)
const row = listed.find((o) => o.id === placed.id)
assert(row && row.move?.label === 'Já enviei', JSON.stringify(row))
log('pedido pago de envio aparece com o botão "Já enviei"')

const m1 = await moveOrder(payload, equipe, placed.id, 'pago', '  BR123  ')
assert(m1.ok, JSON.stringify(m1))
const moved = await payload.findByID({ collection: 'orders', id: placed.id, depth: 0, overrideAccess: true })
assert.equal(moved.status, 'enviado')
assert.equal(moved.trackingCode, 'BR123')
assert(sent.some((s) => s.includes('a caminho')), `e-mail "a caminho": ${sent.join(' | ')}`)
log('Já enviei → enviado, rastreio BR123 e e-mail "a caminho"')

const m2 = await moveOrder(payload, equipe, placed.id, 'pago', 'BR999')
assert(!m2.ok && m2.error === 'Esse pedido já mudou. Atualize a página.')
log('clique duplo: "Esse pedido já mudou"')

assert.equal((await payload.findByID({ collection: 'copies', id: copy.id, depth: 0, overrideAccess: true })).stock, stockPaid)
log('estoque não muda com o envio')

const m3 = await moveOrder(payload, null, placed.id, 'enviado')
assert(!m3.ok)
log('visitante não mexe em pedido')

process.exit(0)

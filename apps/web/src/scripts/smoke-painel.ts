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

process.exit(0)

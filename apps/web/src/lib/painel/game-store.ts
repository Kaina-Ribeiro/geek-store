import 'server-only'

import { revalidatePath } from 'next/cache'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import type { Copy, Game, Media, User } from '../../payload-types'
import { platformOf, type ConditionValue, type PlatformValue } from '../catalog'
import { heroImage, thumbImage, type Img } from '../data'
import { LAUDO_DEFAULTS, normalizeCopy, parsePrice, priceText, slugify, validateGame, type GameDraft } from './game-form'

export type SaveGameResult =
  | { ok: true; id: number }
  | { ok: false; error: string; fields?: Record<string, string>; existingId?: number; session?: true }

const relId = (v: number | { id: number } | null | undefined) => (v == null ? null : typeof v === 'number' ? v : v.id)

// Creates or updates a game, its copies and its banner slide in ONE database
// transaction: if any step fails, nothing is saved. Copies are never deleted
// (orders point to them): a copy taken off the list becomes active: false.
export async function saveGame(payload: Payload, user: User | null, draft: GameDraft): Promise<SaveGameResult> {
  if (!user) return { ok: false, error: 'Sua sessão acabou. Entre de novo (o que você digitou continua aqui).', session: true }
  const fields = validateGame(draft)
  if (Object.keys(fields).length) return { ok: false, error: 'Confira os campos marcados.', fields }

  const platform = draft.platform as PlatformValue
  const slug = slugify(`${draft.title.trim()} ${platform}`)
  const as = { user, overrideAccess: false } as const
  const dup = await payload.find({ collection: 'games', where: { slug: { equals: slug } }, limit: 1, depth: 0, ...as })
  const other = dup.docs.find((g) => g.id !== draft.id)
  if (other) return duplicate(other.id, platform)

  const tx = await payload.db.beginTransaction()
  const req = (await createLocalReq({ user }, payload)) as PayloadRequest
  if (tx) req.transactionID = tx
  const opts = { req, ...as }
  try {
    const data = {
      title: draft.title.trim(),
      platform,
      cover: draft.coverId!,
      year: draft.year.trim() ? Number(draft.year) : null,
      ageRating: draft.ageRating.trim() || null,
      genre: draft.genre.trim() || null,
      description: draft.description.trim() || null,
    }
    const game =
      draft.id == null
        ? await payload.create({ collection: 'games', data, ...opts })
        : await payload.update({ collection: 'games', id: draft.id, data, ...opts })

    const existing = await payload.find({ collection: 'copies', where: { game: { equals: game.id } }, depth: 0, limit: 500, pagination: false, ...opts })
    const kept = new Set<number>()
    for (const raw of draft.copies) {
      const c = normalizeCopy(raw)
      const price = parsePrice(c.price)
      if (c.id != null) {
        if (!existing.docs.some((d) => d.id === c.id)) throw new Error(`cópia ${c.id} não é deste jogo`)
        kept.add(c.id)
        const sold = existing.docs.find((d) => d.id === c.id)!.stock === 0 && Boolean(raw.sold)
        await payload.update({
          collection: 'copies',
          id: c.id,
          // A sold copy keeps its stock (0) and laudo; only visibility changes.
          data: sold ? { active: c.active } : { condition: c.condition, price: price ?? undefined, stock: c.stock, active: c.active, laudo: laudoData(c) },
          ...opts,
        })
      } else if (c.active) {
        await payload.create({
          collection: 'copies',
          data: { game: game.id, condition: c.condition, price: price!, stock: c.stock, active: true, laudo: laudoData(c) },
          ...opts,
        })
      }
    }
    for (const d of existing.docs) {
      if (!kept.has(d.id) && d.active) await payload.update({ collection: 'copies', id: d.id, data: { active: false }, ...opts })
    }

    // Banner: a visible game slide at the end, or no slide for this game.
    const hero = await payload.findGlobal({ slug: 'home-hero', depth: 0, ...opts })
    const slides = hero.slides || []
    const has = slides.some((s) => relId(s.game) === game.id)
    if (draft.showInHero && !has) {
      if (slides.length >= 8) throw Object.assign(new Error('banner cheio'), { panel: 'O banner já tem 8 slides. Tire um na tela do Banner antes.' })
      await payload.updateGlobal({ slug: 'home-hero', data: { slides: [...slides, { kind: 'game', game: game.id, visible: true }] }, ...opts })
    } else if (!draft.showInHero && has) {
      await payload.updateGlobal({ slug: 'home-hero', data: { slides: slides.filter((s) => relId(s.game) !== game.id) }, ...opts })
    }

    if (tx) await payload.db.commitTransaction(tx)
    try {
      revalidatePath('/', 'layout')
    } catch {
      // Outside a request (scripts): nothing to revalidate.
    }
    return { ok: true, id: game.id }
  } catch (err) {
    if (tx) await payload.db.rollbackTransaction(tx)
    const e = err as { status?: number; panel?: string; message?: string }
    if (e.panel) return { ok: false, error: e.panel }
    if (e.status === 401 || e.status === 403) return { ok: false, error: 'Sua sessão acabou. Entre de novo.', session: true }
    if (/slug|unique|duplicate/i.test(e.message || '')) {
      const again = await payload.find({ collection: 'games', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
      if (again.docs[0]) return duplicate(again.docs[0].id, platform)
    }
    payload.logger.error({ err }, '[painel] falha ao salvar o jogo')
    return { ok: false, error: 'Não deu para salvar. O que você digitou continua aqui, tente de novo.' }
  }
}

const duplicate = (id: number, platform: PlatformValue): SaveGameResult => ({
  ok: false,
  error: `Esse jogo já existe no ${platformOf(platform).label}. Abrir ele?`,
  existingId: id,
})

const laudoData = (c: ReturnType<typeof normalizeCopy>) =>
  c.laudo
    ? {
        boot: c.laudo.boot,
        capa: c.laudo.capa,
        manual: c.laudo.manual,
        higienizado: c.laudo.higienizado,
        surface: c.laudo.surface.trim() || null,
        testedOn: c.laudo.testedOn.trim() || null,
        photos: c.laudo.photos,
      }
    : undefined

export type PanelGame = {
  id: number
  title: string
  platform: string
  cover: Img
  minPrice: number | null
  state: 'ok' | 'esgotado' | 'escondido'
}

// The panel's game list: every game (hidden or sold out too), newest first.
export async function listGamesForPanel(payload: Payload, user: User, q?: string): Promise<PanelGame[]> {
  const as = { user, overrideAccess: false } as const
  const term = q?.trim().slice(0, 60)
  const games = await payload.find({
    collection: 'games',
    where: term ? { title: { like: term } } : {},
    depth: 1,
    limit: 300,
    sort: '-updatedAt',
    ...as,
  })
  if (!games.docs.length) return []
  const copies = await payload.find({
    collection: 'copies',
    where: { game: { in: games.docs.map((g) => g.id) } },
    depth: 0,
    limit: 5000,
    pagination: false,
    select: { game: true, price: true, stock: true, active: true },
    ...as,
  })
  const RANK = { ok: 0, esgotado: 1, escondido: 2 } as const
  const rows: PanelGame[] = games.docs.map((g) => {
    const mine = copies.docs.filter((c) => relId(c.game as number) === g.id)
    const live = mine.filter((c) => c.active && c.stock > 0)
    return {
      id: g.id,
      title: g.title,
      platform: platformOf(g.platform).label,
      cover: thumbImage(g.cover as Media | number),
      minPrice: live.length ? Math.min(...live.map((c) => c.price)) : null,
      state: live.length ? 'ok' : mine.some((c) => c.active) ? 'esgotado' : 'escondido',
    }
  })
  // For sale first, then sold out, then hidden (stable: newest first in each).
  return rows.sort((a, b) => RANK[a.state] - RANK[b.state])
}

export type GameLoad = { draft: GameDraft; images: Record<number, Img> }

// A saved game as the form edits it, with the pictures it shows.
export async function loadGameDraft(payload: Payload, user: User, id: number): Promise<GameLoad | null> {
  const as = { user, overrideAccess: false } as const
  const game = (await payload.findByID({ collection: 'games', id, depth: 1, ...as }).catch(() => null)) as Game | null
  if (!game) return null
  const [copies, hero] = await Promise.all([
    payload.find({ collection: 'copies', where: { game: { equals: id } }, depth: 1, limit: 500, pagination: false, sort: 'createdAt', ...as }),
    payload.findGlobal({ slug: 'home-hero', depth: 0, ...as }),
  ])
  const images: Record<number, Img> = {}
  const cover = game.cover as Media | number
  if (cover && typeof cover === 'object') images[cover.id] = heroImage(cover)
  const toDraft = (c: Copy): GameDraft['copies'][number] => {
    const photos = (c.laudo?.photos || []).map((m) => {
      if (m && typeof m === 'object') images[m.id] = heroImage(m)
      return relId(m as Media | number)!
    })
    return {
      id: c.id,
      condition: c.condition as ConditionValue,
      price: priceText(c.price),
      stock: c.stock,
      active: c.active !== false,
      sold: c.stock === 0,
      ...(c.condition !== 'lacrado' && {
        laudo: {
          boot: c.laudo?.boot ?? LAUDO_DEFAULTS.boot,
          capa: c.laudo?.capa ?? LAUDO_DEFAULTS.capa,
          manual: c.laudo?.manual ?? LAUDO_DEFAULTS.manual,
          higienizado: c.laudo?.higienizado ?? LAUDO_DEFAULTS.higienizado,
          surface: c.laudo?.surface || '',
          testedOn: c.laudo?.testedOn || '',
          photos,
        },
      }),
    }
  }
  return {
    draft: {
      id: game.id,
      title: game.title,
      platform: game.platform as PlatformValue,
      coverId: relId(cover),
      year: game.year ? String(game.year) : '',
      ageRating: game.ageRating || '',
      genre: game.genre || '',
      description: game.description || '',
      showInHero: (hero.slides || []).some((s) => relId(s.game) === id),
      copies: copies.docs.map(toDraft),
    },
    images,
  }
}

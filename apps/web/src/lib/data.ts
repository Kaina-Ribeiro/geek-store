import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Where } from 'payload'
import { cache } from 'react'

import type { Copy, Drop, Game, Media } from '../payload-types'
import {
  brl,
  conditionOf,
  CONDITIONS,
  installments,
  pixPrice,
  platformOf,
  PLATFORM_GROUPS,
  PLATFORMS,
  type PlatformGroup,
} from './catalog'
import { lockedCopyIds } from './drops'
import { getClient } from './payload'

export type Img = { url: string; width: number; height: number; alt: string }

export type CardItem = {
  id: number
  gameId: number
  slug: string
  href: string
  title: string
  platform: string
  platformColor: string
  group: PlatformGroup
  condition: string
  conditionValue: string
  conditionColor: string
  price: number
  pixValue: number
  pix: string
  installment: string
  stock: number
  lastUnit: boolean
  cover: Img
  glow: string
  ageRating: string | null
  createdAt: string
}

const payload = getClient

const img = (m: number | Media | null | undefined, size: 'card' | 'large' | 'thumb' = 'card'): Img => {
  if (!m || typeof m === 'number') return { url: '/brand/cover-fallback.svg', width: 600, height: 800, alt: '' }
  const s = m.sizes?.[size]
  return {
    url: s?.url || m.url || '',
    width: s?.width || m.width || 600,
    height: s?.height || m.height || 800,
    alt: m.alt,
  }
}

export const toCard = (copy: Copy, size: 'card' | 'large' = 'card'): CardItem | null => {
  const game = copy.game as Game
  if (!game || typeof game === 'number') return null
  const plat = platformOf(game.platform)
  const cond = conditionOf(copy.condition)
  const inst = installments(copy.price)
  return {
    id: copy.id,
    gameId: game.id,
    slug: game.slug || String(game.id),
    href: `/jogo/${game.slug}?estado=${copy.condition}`,
    title: game.title,
    platform: plat.label,
    platformColor: plat.color,
    group: plat.group,
    condition: cond.label,
    conditionValue: cond.value,
    conditionColor: cond.color,
    price: copy.price,
    pixValue: pixPrice(copy.price),
    pix: brl(pixPrice(copy.price)),
    installment: `${inst.n}x de ${brl(inst.value)}`,
    stock: copy.stock,
    lastUnit: copy.stock === 1,
    cover: img(game.cover, size),
    glow: game.glow || '#2D6BF0',
    ageRating: game.ageRating ?? null,
    createdAt: copy.createdAt,
  }
}

const inStock: Where = { and: [{ active: { equals: true } }, { stock: { greater_than: 0 } }] }

const allCopies = cache(async () => {
  const p = await payload()
  const [res, locked] = await Promise.all([
    p.find({ collection: 'copies', where: inStock, depth: 2, limit: 1000, sort: '-createdAt' }),
    lockedCopyIds(),
  ])
  // Copies waiting for a Friday drop stay out of the catalog until it opens.
  return res.docs
    .filter((c) => !locked.has(c.id))
    .map((c) => toCard(c))
    .filter((c): c is CardItem => Boolean(c))
})

const onePerGame = (items: CardItem[]) => {
  const seen = new Set<number>()
  return items.filter((i) => (seen.has(i.gameId) ? false : (seen.add(i.gameId), true)))
}

export type ConsoleSlide = {
  key: string
  name: string
  title: string
  text: string
  count: number
  from: string
  bg: string
  ink: string
  btnBg: string
  btnInk: string
  href: string
  covers: Img[]
}

const CONSOLE_COPY: Record<string, Omit<ConsoleSlide, 'count' | 'from' | 'covers' | 'href'> & { platforms: string[] }> = {
  ps5: { key: 'ps5', name: 'PS5', title: 'PlayStation 5', text: 'Lançamentos lacrados no dia e seminovos com nota A. Steelbooks quando tiver.', bg: '#F1F1F3', ink: '#0B0B0D', btnBg: '#0B0B0D', btnInk: '#fff', platforms: ['ps5'] },
  switch: { key: 'switch', name: 'Switch', title: 'Nintendo Switch 2', text: 'Switch 2 e todo o catálogo do Switch 1, que roda no console novo.', bg: '#E8322B', ink: '#fff', btnBg: '#fff', btnInk: '#111', platforms: ['switch-2', 'switch'] },
  xbox: { key: 'xbox', name: 'Xbox', title: 'Xbox Series e One', text: 'Mídia física para quem coleciona. Retrocompatível do 360 ao Series X.', bg: '#107C10', ink: '#fff', btnBg: '#fff', btnInk: '#111', platforms: ['xbox-series', 'xbox-one'] },
  ps4: { key: 'ps4', name: 'PS4', title: 'PlayStation 4', text: 'O maior acervo da loja. Roda no PS5 também, e muita coisa sai por menos de R$ 100.', bg: '#2D6BF0', ink: '#fff', btnBg: '#fff', btnInk: '#111', platforms: ['ps4'] },
  retro: { key: 'retro', name: 'Retrô', title: 'PS2, 360 e importados', text: 'Garimpo de verdade: PS2, GameCube, Mega Drive e lotes japoneses toda sexta.', bg: '#FFC61A', ink: '#141000', btnBg: '#141000', btnInk: '#fff', platforms: ['ps2', 'xbox-360'] },
}

export type Featured = CardItem & { large: Img }

export type DropView = {
  id: number
  open: boolean
  items: CardItem[]
  title: string
  blurb: string
  opensAt: string
  slots: number
  reserved: number
  earlyLevel: number
  teasers: { name: string; detail: string }[]
}

const loadHome = async () => {
  const p = await payload()
  const items = await allCopies()
  const unique = onePerGame(items)

  const featuredGames = await p.find({ collection: 'games', where: { featured: { equals: true } }, limit: 4, depth: 1 })
  const featured: Featured[] = featuredGames.docs
    .map((g) => {
      const best = items.filter((i) => i.gameId === g.id).sort((a, b) => a.price - b.price)[0]
      return best ? { ...best, large: img(g.cover, 'large') } : null
    })
    .filter((f): f is Featured => Boolean(f))

  const groupCounts = Object.fromEntries(
    PLATFORM_GROUPS.map((g) => [g, unique.filter((i) => i.group === g).length]),
  ) as Record<PlatformGroup, number>

  const consoles: ConsoleSlide[] = Object.values(CONSOLE_COPY).map(({ platforms, ...c }) => {
    const labels: string[] = platforms.map((v) => platformOf(v).label)
    const mine = items.filter((i) => labels.includes(i.platform))
    const min = mine.length ? Math.min(...mine.map((i) => i.pixValue)) : 0
    return {
      ...c,
      count: onePerGame(mine).length,
      from: mine.length ? brl(Math.floor(min)).replace(',00', '') : '—',
      href: `/loja?plataforma=${platforms.join(',')}`,
      covers: onePerGame(mine).slice(0, 3).map((i) => i.cover),
    }
  })

  const now = new Date().toISOString()
  const drops = await p.find({ collection: 'drops', where: { opensAt: { greater_than: now } }, sort: 'opensAt', limit: 1 })
  const d: Drop | undefined =
    drops.docs[0] ?? (await p.find({ collection: 'drops', sort: '-opensAt', limit: 1 })).docs[0]
  const dropItems = d ? await dropCards(d) : []
  const sold = d ? (d.items || []).length - dropItems.length : 0
  const drop: DropView | null = d
    ? {
        id: d.id,
        open: new Date(d.opensAt).getTime() <= Date.now(),
        items: new Date(d.opensAt).getTime() <= Date.now() ? dropItems : [],
        title: d.title,
        blurb: d.blurb || '',
        opensAt: d.opensAt,
        slots: d.slots ?? 9,
        reserved: Math.min(d.slots ?? 9, (d.reserved ?? 0) + Math.max(0, sold)),
        earlyLevel: d.earlyLevel ?? 4,
        teasers: (d.teasers || []).map((t) => ({ name: t.name, detail: t.detail || '' })),
      }
    : null

  return {
    featured,
    vitrine: unique,
    total: unique.length,
    groupCounts,
    consoles,
    drop,
    strip: unique.map((i) => i.cover),
    retroMini: unique.filter((i) => i.group === 'Retrô').slice(0, 3).map((i) => i.cover),
  }
}

// The Home renders per request (so builds never need the database) but reads
// the catalog at most once a minute. revalidatePath('/') also clears it.
export const getHome = unstable_cache(loadHome, ['home'], { revalidate: 60 })
// Fresh read for pages where the drop opening must be exact to the second.
export const getHomeFresh = cache(loadHome)

// In-stock copies of a drop (ignores the drop lock: callers decide).
export async function dropCards(d: Drop) {
  const ids = (d.items || []).map((i) => (typeof i === 'number' ? i : i.id))
  if (!ids.length) return []
  const p = await payload()
  const res = await p.find({
    collection: 'copies',
    where: { and: [{ id: { in: ids } }, ...(inStock.and ?? [])] },
    depth: 2,
    limit: ids.length,
  })
  return res.docs.map((c) => toCard(c)).filter((c): c is CardItem => Boolean(c))
}

export type ShopFilters = {
  plataforma?: string
  grupo?: string
  estado?: string
  preco?: string
  ordem?: string
  q?: string
}

export const PRICE_RANGES = [
  { value: 'ate-100', label: 'Até R$ 100', min: 0, max: 100 },
  { value: '100-200', label: 'R$ 100 a 200', min: 100, max: 200 },
  { value: 'acima-200', label: 'Acima de R$ 200', min: 200, max: Infinity },
] as const

export const SORTS = [
  { value: 'novos', label: 'Novidades' },
  { value: 'menor', label: 'Menor preço' },
  { value: 'maior', label: 'Maior preço' },
] as const

export const getShop = cache(async (f: ShopFilters) => {
  const items = await allCopies()
  const q = f.q?.trim().toLowerCase()
  const plats: string[] | undefined = f.plataforma?.split(',').map((v) => platformOf(v).label)
  const range = PRICE_RANGES.find((r) => r.value === f.preco)

  let list = items.filter(
    (i) =>
      (!plats || plats.includes(i.platform)) &&
      (!f.grupo || i.group === f.grupo) &&
      (!f.estado || i.conditionValue === f.estado) &&
      (!range || (i.pixValue >= range.min && i.pixValue < range.max)) &&
      (!q || i.title.toLowerCase().includes(q) || i.platform.toLowerCase().includes(q)),
  )
  if (f.ordem === 'menor') list = [...list].sort((a, b) => a.pixValue - b.pixValue)
  if (f.ordem === 'maior') list = [...list].sort((a, b) => b.pixValue - a.pixValue)

  const base = items.filter((i) => !f.grupo || i.group === f.grupo)
  return {
    items: list,
    total: items.length,
    groups: PLATFORM_GROUPS.map((g) => ({ value: g, count: items.filter((i) => i.group === g).length })),
    conditions: CONDITIONS.map((c) => ({ ...c, count: base.filter((i) => i.conditionValue === c.value).length })),
  }
})

export type ProductView = {
  game: {
    id: number
    title: string
    slug: string
    platform: string
    platformColor: string
    group: PlatformGroup
    year: number | null
    ageRating: string | null
    description: string
    glow: string
    cover: Img
    thumb: Img
  }
  variants: {
    value: string
    label: string
    color: string
    available: boolean
    copy: CardItem | null
    laudo: Copy['laudo'] | null
    photos: Img[]
  }[]
}

export const getProduct = cache(async (slug: string): Promise<ProductView | null> => {
  const p = await payload()
  const games = await p.find({ collection: 'games', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  const game = games.docs[0]
  if (!game) return null
  const copies = await p.find({
    collection: 'copies',
    where: { and: [{ game: { equals: game.id } }, ...(inStock.and ?? [])] },
    depth: 2,
    sort: 'price',
    limit: 50,
  })
  const locked = await lockedCopyIds()
  copies.docs = copies.docs.filter((c) => !locked.has(c.id))
  const plat = platformOf(game.platform)
  return {
    game: {
      id: game.id,
      title: game.title,
      slug: game.slug || '',
      platform: plat.label,
      platformColor: plat.color,
      group: plat.group,
      year: game.year ?? null,
      ageRating: game.ageRating ?? null,
      description: game.description || '',
      glow: game.glow || '#2D6BF0',
      cover: img(game.cover, 'large'),
      thumb: img(game.cover, 'thumb'),
    },
    variants: CONDITIONS.map((c) => {
      const copy = copies.docs.find((d) => d.condition === c.value)
      return {
        value: c.value,
        label: c.label,
        color: c.color,
        available: Boolean(copy),
        copy: copy ? toCard(copy, 'large') : null,
        laudo: copy?.laudo ?? null,
        photos: (copy?.laudo?.photos || []).map((m) => img(m as Media, 'large')),
      }
    }),
  }
})

export const getRelated = cache(async (group: PlatformGroup, exceptGameId: number) => {
  const items = onePerGame(await allCopies())
  const same = items.filter((i) => i.group === group && i.gameId !== exceptGameId)
  const rest = items.filter((i) => i.group !== group && i.gameId !== exceptGameId)
  return [...same, ...rest].slice(0, 5)
})

export const allPlatforms = PLATFORMS

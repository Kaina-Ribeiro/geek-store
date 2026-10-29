import 'server-only'

import type { Customer, Drop, Game, Media } from '../payload-types'
import { platformOf } from './catalog'
import { getShop } from './data'
import { toOrderView } from './order-view'
import { getClient } from './payload'
import { achievementsOf, levelOf } from './xp'

const PAID = ['pago', 'enviado', 'pronto', 'entregue']

export async function getAccount(c: Customer) {
  const payload = await getClient()
  const orders = await payload.find({
    collection: 'orders',
    where: { customer: { equals: c.id } },
    sort: '-createdAt',
    depth: 1,
    limit: 50,
    overrideAccess: true,
  })
  const paid = orders.docs.filter((o) => PAID.includes(o.status))

  const saveIds = (c.saves || []).map((g) => (typeof g === 'number' ? g : g.id))
  const games = saveIds.length
    ? await payload.find({ collection: 'games', where: { id: { in: saveIds } }, depth: 1, limit: 200 })
    : { docs: [] as Game[] }
  const stock = (await getShop({})).items
  const saves = games.docs.map((g) => {
    const best = stock.filter((i) => i.gameId === g.id).sort((a, b) => a.pixValue - b.pixValue)[0] ?? null
    const cover = g.cover as Media | null
    return {
      gameId: g.id,
      title: g.title,
      platform: platformOf(g.platform).label,
      href: `/jogo/${g.slug}`,
      cover: (cover && typeof cover === 'object' && (cover.sizes?.card?.url || cover.url)) || '/brand/cover-fallback.svg',
      best,
    }
  })

  const xp = c.xp ?? 0
  return {
    xp,
    level: levelOf(xp),
    orders: orders.docs.map(toOrderView),
    saves,
    achievements: achievementsOf({
      saves: saveIds.length,
      paidOrders: paid.map((o) => ({
        platforms: o.items.map((i) => i.platform || ''),
        groups: o.items.map((i) => i.group || ''),
        placedAt: o.createdAt,
        dropOpenedAt: o.drop && typeof o.drop === 'object' ? (o.drop as Drop).opensAt : null,
      })),
    }),
    memberSince: c.createdAt,
  }
}

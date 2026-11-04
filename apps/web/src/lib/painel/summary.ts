import 'server-only'

import type { Payload } from 'payload'

import type { User } from '../../payload-types'
import { STORE_TZ } from '../catalog'

// Numbers on the panel's start screen, read as the signed-in person.
export async function panelSummary(payload: Payload, user: User) {
  const as = { user, overrideAccess: false } as const
  const [orders, copies, hero] = await Promise.all([
    payload.count({ collection: 'orders', where: { status: { in: ['pago', 'pronto'] } }, ...as }),
    payload.find({
      collection: 'copies',
      where: { and: [{ active: { equals: true } }, { stock: { greater_than: 0 } }] },
      depth: 0,
      limit: 5000,
      pagination: false,
      select: { game: true },
      ...as,
    }),
    payload.findGlobal({ slug: 'home-hero', depth: 0, ...as }),
  ])
  const games = new Set(copies.docs.map((c) => (typeof c.game === 'number' ? c.game : c.game?.id)))
  return {
    pendingOrders: orders.totalDocs,
    gamesInStock: games.size,
    visibleSlides: (hero.slides || []).filter((s) => s.visible !== false).length,
  }
}

// "Bom dia" until noon, "Boa tarde" until 18h, "Boa noite" after, store time.
export function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: STORE_TZ }).format(now))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

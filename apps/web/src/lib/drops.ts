import 'server-only'

import type { Drop } from '../payload-types'
import { getClient } from './payload'
import { EARLY_ACCESS_MS, levelOf } from './xp'

const idOf = (v: number | { id: number }) => (typeof v === 'number' ? v : v.id)

export type DropLock = {
  drop: Drop
  opensAt: number
  itemIds: number[]
}

// Drops that have not opened yet: their copies are hidden from the catalog
// and cannot be bought, except by customers with early access in the last
// 30 minutes before opening.
export async function pendingDrops(): Promise<DropLock[]> {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'drops',
    where: { opensAt: { greater_than: new Date().toISOString() } },
    depth: 0,
    limit: 20,
    overrideAccess: true,
  })
  return res.docs.map((d) => ({ drop: d, opensAt: new Date(d.opensAt).getTime(), itemIds: (d.items || []).map(idOf) }))
}

export const hasEarlyAccess = (lock: DropLock, xp: number, now = Date.now()) =>
  levelOf(xp).tier.n >= (lock.drop.earlyLevel ?? 4) && now >= lock.opensAt - EARLY_ACCESS_MS

export async function lockedCopyIds(xp: number | null = null) {
  const locks = await pendingDrops()
  const ids = new Set<number>()
  for (const l of locks) if (xp === null || !hasEarlyAccess(l, xp)) l.itemIds.forEach((i) => ids.add(i))
  return ids
}

// The drop (if any) an order belongs to: used for the "Drop em 1 min" badge.
export async function dropForCopies(copyIds: number[]) {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'drops',
    where: { items: { in: copyIds } },
    sort: '-opensAt',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

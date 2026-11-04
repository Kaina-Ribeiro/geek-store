import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload, PayloadRequest } from 'payload'

import type { OrderStatus } from '../collections/Orders'
import type { Order } from '../payload-types'
import { db, returnStock, takeStock } from './stock'

// Order state changes as single conditional UPDATEs. The cron, the order page
// polling, the webhook, the simulation and the panel can all touch the same
// order at the same moment: Postgres locks the row and re-checks the WHERE, so
// each effect (stock back, stock out, XP in, XP out) happens exactly once.
// These bypass Payload hooks on purpose; callers apply the side effects.

// Inside a panel save, Payload already holds the order row in its own
// transaction: statements must go through that same connection, or they wait
// on the lock the save is holding (same lookup as Payload's getTransaction).
type Sessions = { sessions?: Record<string | number, { db?: ReturnType<typeof db>['drizzle'] }> }

const conn = async (payload: Payload, req?: PayloadRequest) => {
  const tx = req?.transactionID ? await req.transactionID : undefined
  return (tx !== undefined && (payload.db as unknown as Sessions).sessions?.[tx]?.db) || db(payload).drizzle
}

const run = async (payload: Payload, q: unknown, req?: PayloadRequest) => (await (await conn(payload, req)).execute(q)).rows

// Moves the order to `to` if it is in one of `from`. "released" means this call
// took the stock-released flag, so it must give the copies back now.
export async function claimRelease(payload: Payload, id: number, to: 'expirado' | 'cancelado', from: OrderStatus[]) {
  const allowed = sql.join(
    from.map((f) => sql`${f}`),
    sql`, `,
  )
  const released = await run(
    payload,
    sql`UPDATE orders SET status = ${to}::enum_orders_status, stock_released = true, updated_at = now()
        WHERE id = ${id} AND status::text IN (${allowed}) AND stock_released = false RETURNING id`,
  )
  if (released.length) return 'released' as const
  const moved = await run(
    payload,
    sql`UPDATE orders SET status = ${to}::enum_orders_status, updated_at = now()
        WHERE id = ${id} AND status::text IN (${allowed}) AND stock_released = true RETURNING id`,
  )
  return moved.length ? ('moved' as const) : null
}

// Moves a pending (or expired) order to paid. "retake" means its copies had
// already gone back, so this call must take them out of stock again.
export async function claimPaid(payload: Payload, id: number) {
  const held = await run(
    payload,
    sql`UPDATE orders SET status = 'pago', updated_at = now()
        WHERE id = ${id} AND status IN ('aguardando', 'expirado') AND stock_released = false RETURNING id`,
  )
  if (held.length) return 'held' as const
  const retake = await run(
    payload,
    sql`UPDATE orders SET status = 'pago', stock_released = false, updated_at = now()
        WHERE id = ${id} AND status IN ('aguardando', 'expirado') AND stock_released = true RETURNING id`,
  )
  return retake.length ? ('retake' as const) : null
}

// Stock flag alone, for status changes already saved by the panel.
export async function claimStockBack(payload: Payload, id: number, req?: PayloadRequest) {
  const rows = await run(
    payload,
    sql`UPDATE orders SET stock_released = true WHERE id = ${id} AND stock_released = false RETURNING id`,
    req,
  )
  return rows.length === 1
}

export async function claimStockOut(payload: Payload, id: number, req?: PayloadRequest) {
  const rows = await run(
    payload,
    sql`UPDATE orders SET stock_released = false WHERE id = ${id} AND stock_released = true RETURNING id`,
    req,
  )
  return rows.length === 1
}

// XP in and out, each in one statement (flag and balance move together).
export async function creditXpOnce(payload: Payload, id: number, req?: PayloadRequest) {
  const rows = await run(
    payload,
    sql`WITH o AS (
          UPDATE orders SET xp_credited = true
          WHERE id = ${id} AND xp_credited = false AND customer_id IS NOT NULL AND xp > 0
          RETURNING customer_id, xp
        )
        UPDATE customers c SET xp = coalesce(c.xp, 0) + o.xp, updated_at = now() FROM o WHERE c.id = o.customer_id RETURNING c.id`,
    req,
  )
  return rows.length === 1
}

export async function revertXpOnce(payload: Payload, id: number, req?: PayloadRequest) {
  const rows = await run(
    payload,
    sql`WITH o AS (
          UPDATE orders SET xp_credited = false WHERE id = ${id} AND xp_credited = true RETURNING customer_id, xp
        )
        UPDATE customers c SET xp = greatest(0, coalesce(c.xp, 0) - o.xp), updated_at = now()
        FROM o WHERE c.id = o.customer_id RETURNING c.id`,
    req,
  )
  return rows.length === 1
}

// The copies of an order, back to the shelf or out of it again. Retaking is
// all or nothing: if one copy is gone, the ones already taken go back.
const lines = (order: Order) =>
  order.items.map((i) => ({ id: typeof i.copy === 'number' ? i.copy : i.copy.id, qty: i.qty }))

export async function giveBackStock(payload: Payload, order: Order) {
  for (const l of lines(order)) await returnStock(payload, l.id, l.qty)
}

export async function retakeStock(payload: Payload, order: Order) {
  const taken: { id: number; qty: number }[] = []
  for (const l of lines(order)) {
    if (!(await takeStock(payload, l.id, l.qty))) {
      for (const t of taken) await returnStock(payload, t.id, t.qty)
      return false
    }
    taken.push(l)
  }
  return true
}

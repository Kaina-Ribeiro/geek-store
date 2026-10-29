import 'server-only'

import { and, eq, gte, sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

// Stock moves are single conditional UPDATEs ("stock = stock - n WHERE stock
// >= n"), so two buyers can never take the same unique used copy. They bypass
// Payload hooks on purpose (nothing to run).

type DrizzleDb = {
  drizzle: {
    update: (t: unknown) => {
      set: (v: Record<string, unknown>) => {
        where: (w: unknown) => { returning: (r: Record<string, unknown>) => Promise<unknown[]> }
      }
    }
  }
  tables: Record<string, Record<string, never>>
}

const db = (payload: Payload) => payload.db as unknown as DrizzleDb

export async function takeStock(payload: Payload, copyId: number, qty: number) {
  const { drizzle, tables } = db(payload)
  const t = tables.copies
  const rows = await drizzle
    .update(t)
    .set({ stock: sql`${t.stock} - ${qty}` })
    .where(and(eq(t.id, copyId), gte(t.stock, qty), eq(t.active, true)))
    .returning({ id: t.id })
  return rows.length === 1
}

export async function returnStock(payload: Payload, copyId: number, qty: number) {
  const { drizzle, tables } = db(payload)
  const t = tables.copies
  await drizzle
    .update(t)
    .set({ stock: sql`${t.stock} + ${qty}` })
    .where(eq(t.id, copyId))
    .returning({ id: t.id })
}

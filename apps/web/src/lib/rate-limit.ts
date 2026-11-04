import 'server-only'

import { sql } from '@payloadcms/db-postgres/drizzle'
import { headers } from 'next/headers'

import { getClient } from './payload'
import { db } from './stock'

// Fixed-window limits for the public server actions (login link, newsletter,
// order tracking, CEP lookups, checkout), per visitor IP. One atomic upsert
// per attempt in Postgres, so the count holds across server instances.

export const LIMITS = {
  login: { max: 5, windowSec: 15 * 60 },
  subscribe: { max: 5, windowSec: 60 * 60 },
  track: { max: 10, windowSec: 15 * 60 },
  quote: { max: 40, windowSec: 5 * 60 },
  checkout: { max: 6, windowSec: 15 * 60 },
} as const

export type LimitName = keyof typeof LIMITS

export const TOO_MANY = 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'

// The proxy in front of the app (Traefik on Cubeship, Vercel's edge) sets
// X-Real-IP to the connecting address; otherwise the last X-Forwarded-For hop
// is the one our own proxy appended (earlier hops can be forged by the client).
export async function clientIp() {
  const h = await headers()
  return h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',').pop()?.trim() || 'local'
}

// Counts one attempt and says whether it is still within the limit.
export async function hit(name: LimitName, who: string) {
  const { max, windowSec } = LIMITS[name]
  const payload = await getClient()
  const key = `${name}:${who}`
  const rows = (
    await db(payload).drizzle.execute(sql`
      INSERT INTO rate_limits (key, hits, reset_at) VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.hits + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN now() + make_interval(secs => ${windowSec}) ELSE rate_limits.reset_at END,
        updated_at = now()
      RETURNING hits`)
  ).rows
  return Number(rows[0]?.hits ?? 1) <= max
}

// For server actions: null when allowed, the error result when over the limit.
export async function limited(name: LimitName) {
  return (await hit(name, await clientIp())) ? null : { ok: false as const, error: TOO_MANY, field: undefined }
}

// Expired counters, removed by the cron job.
export async function pruneRateLimits() {
  const payload = await getClient()
  await db(payload).drizzle.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`)
}

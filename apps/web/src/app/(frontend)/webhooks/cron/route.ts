import { NextResponse, type NextRequest } from 'next/server'

import { sendDropOpenEmail } from '../../../../lib/emails'
import { env } from '../../../../lib/env'
import { expireStaleOrders } from '../../../../lib/orders'
import { getClient } from '../../../../lib/payload'
import { signId } from '../../../../lib/sign'

export const dynamic = 'force-dynamic'

// Scheduled job (Vercel Cron every 5 minutes, see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  if (!env.cronSecret || req.headers.get('authorization') !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const payload = await getClient()
  const expired = await expireStaleOrders()

  // "O drop abriu": one e-mail per subscriber, once per drop, within 6 hours.
  const now = new Date()
  const drops = await payload.find({
    collection: 'drops',
    where: {
      and: [
        { opensAt: { less_than_equal: now.toISOString() } },
        { opensAt: { greater_than: new Date(now.getTime() - 6 * 3600_000).toISOString() } },
        { alertSentAt: { exists: false } },
      ],
    },
    depth: 0,
    limit: 5,
    overrideAccess: true,
  })
  let alerts = 0
  for (const d of drops.docs) {
    await payload.update({ collection: 'drops', id: d.id, overrideAccess: true, data: { alertSentAt: now.toISOString() } })
    const subs = await payload.find({
      collection: 'subscribers',
      where: { and: [{ dropAlerts: { equals: true } }, { unsubscribedAt: { exists: false } }] },
      depth: 0,
      limit: 5000,
      overrideAccess: true,
    })
    for (const s of subs.docs) {
      const unsub = `${env.siteUrl}/descadastrar?i=${s.id}&s=${signId('unsub', s.id)}`
      await sendDropOpenEmail(payload, s.email, d.title, unsub).catch((e) => payload.logger.error(e))
      alerts++
    }
  }
  return NextResponse.json({ ok: true, expired, alerts })
}

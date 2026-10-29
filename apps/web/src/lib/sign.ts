import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

// Short HMAC used in unsubscribe links (no login needed to opt out).
export const signId = (scope: string, id: number | string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || '')
    .update(`${scope}:${id}`)
    .digest('base64url')
    .slice(0, 24)

export const checkSigned = (scope: string, id: number | string, sig: string) => {
  const a = Buffer.from(signId(scope, id))
  const b = Buffer.from(sig || '')
  return a.length === b.length && timingSafeEqual(a, b)
}

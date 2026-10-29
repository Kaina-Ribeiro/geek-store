import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { headers } from 'next/headers'
import { createLocalReq, generatePayloadCookie, getFieldsToSign, jwtSign } from 'payload'
import { addSessionToUser } from 'payload/shared'
import { cache } from 'react'

import type { Customer } from '../payload-types'
import { sendLoginEmail } from './emails'
import { env, showDevLoginLink } from './env'
import { creditXp } from './orders'
import { getClient } from './payload'

const LINK_MINUTES = 15
const RESEND_AFTER_MS = 45_000

// Logged-in store customer (null for visitors and for admin users).
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user && user.collection === 'customers' ? (user as unknown as Customer) : null
})

const normalizeEmail = (e: string) => e.trim().toLowerCase()
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254

const safeNext = (next?: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/conta')

// Passwordless login. The e-mailed link carries a random secret; only its
// SHA-256 is stored, it expires in 15 minutes and is burned on first use. The
// session is then issued exactly like Payload's own login does it (session id,
// signed JWT, standard cookie), without ever touching the password, so other
// devices stay logged in.
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export async function requestLoginLink(rawEmail: string, next?: string) {
  const email = normalizeEmail(rawEmail)
  if (!isEmail(email)) return { ok: false as const, error: 'Confira o e-mail.' }
  const payload = await getClient()

  const found = await payload.find({
    collection: 'customers',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
    showHiddenFields: true,
  })
  let customer = found.docs[0]
  const sentAt = customer?.loginLink?.sentAt ? new Date(customer.loginLink.sentAt).getTime() : 0
  if (Date.now() - sentAt < RESEND_AFTER_MS) {
    return { ok: false as const, error: 'Acabamos de enviar um link. Espere alguns segundos para pedir outro.' }
  }

  const secret = randomBytes(24).toString('hex')
  const loginLink = {
    hash: sha(secret),
    expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000).toISOString(),
    sentAt: new Date().toISOString(),
  }
  if (!customer) {
    customer = await payload.create({
      collection: 'customers',
      // Random password nobody knows: the account only opens by e-mail link.
      data: { email, password: randomBytes(24).toString('hex'), loginLink },
      overrideAccess: true,
    })
  } else {
    await payload.update({ collection: 'customers', id: customer.id, data: { loginLink }, overrideAccess: true })
  }

  const link = `${env.siteUrl}/conta/entrar/link?u=${customer.id}&t=${secret}&next=${encodeURIComponent(safeNext(next))}`
  await sendLoginEmail(payload, email, link)
  return { ok: true as const, devLink: showDevLoginLink ? link : undefined }
}

// Validates the link and returns the cookie to set, or null when the link is
// invalid, expired or already used.
export async function consumeLoginLink(id: string, secret: string) {
  const payload = await getClient()
  const customer = await payload
    .findByID({ collection: 'customers', id, overrideAccess: true, showHiddenFields: true })
    .catch(() => null)
  const link = customer?.loginLink
  const exp = link?.expiresAt ? new Date(link.expiresAt).getTime() : 0
  if (!customer || !secret || !link?.hash || exp < Date.now()) return null
  const a = Buffer.from(sha(secret))
  const b = Buffer.from(link.hash)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  // Burn the link before issuing the session.
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { loginLink: { hash: null, expiresAt: null } },
    overrideAccess: true,
  })

  const collectionConfig = payload.collections.customers.config
  const req = await createLocalReq({}, payload)
  const raw = await payload.db.findOne({ collection: 'customers', where: { id: { equals: customer.id } }, req })
  if (!raw) return null
  const { sid } = await addSessionToUser({ collectionConfig, payload, req, user: raw as never })
  const { token } = await jwtSign({
    fieldsToSign: getFieldsToSign({ collectionConfig, email: customer.email, sid, user: { ...customer, collection: 'customers' } as never }),
    secret: payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  await claimGuestOrders(customer.id, customer.email)
  return generatePayloadCookie({
    collectionAuthConfig: collectionConfig.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  })
}

export async function logoutCookieName() {
  const payload = await getClient()
  return `${payload.config.cookiePrefix}-token`
}

// Orders placed as a visitor with the same e-mail join the account, and their
// XP is credited (the passe counts purchases made before signing up).
export async function claimGuestOrders(customerId: number, email: string) {
  const payload = await getClient()
  const guest = await payload.find({
    collection: 'orders',
    where: { and: [{ email: { equals: email } }, { customer: { exists: false } }] },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  for (const o of guest.docs) {
    await payload.update({ collection: 'orders', id: o.id, data: { customer: customerId }, overrideAccess: true })
    if (o.status !== 'aguardando' && o.status !== 'expirado' && o.status !== 'cancelado') await creditXp(o.id)
  }
}

import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

import { env } from './env'

// Thin client for the Mercado Pago Payments API (no SDK needed). Card numbers
// never reach this server: the browser tokenizes them with Mercado Pago's own
// form (Card Payment Brick) and we only receive a one-time token.

const API = 'https://api.mercadopago.com'

export type MpStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

export type MpPayment = {
  id: number
  status: MpStatus
  status_detail: string
  external_reference: string | null
  transaction_amount: number
  installments?: number
  date_of_expiration?: string | null
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string }
  }
}

export class MpError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message)
  }
}

async function mp<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      'Content-Type': 'application/json',
      ...(init.idempotencyKey ? { 'X-Idempotency-Key': init.idempotencyKey } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  const body = (await r.json().catch(() => ({}))) as T & { message?: string }
  if (!r.ok) throw new MpError(body?.message || `Mercado Pago respondeu ${r.status}`, r.status, body)
  return body
}

// Mercado Pago only accepts public https notification URLs.
const notificationUrl = () =>
  env.siteUrl.startsWith('https://') ? `${env.siteUrl}/webhooks/mercadopago` : undefined

type Payer = { email: string; firstName: string; lastName: string; cpf: string }

// Mercado Pago wants local time with offset (America/Sao_Paulo has no DST today).
const toMpDate = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().replace('Z', '-03:00')

export function createPixPayment(args: {
  orderId: number
  amount: number
  description: string
  payer: Payer
  expiresAt: Date
}) {
  return mp<MpPayment>('/v1/payments', {
    method: 'POST',
    idempotencyKey: `order-${args.orderId}-pix`,
    body: JSON.stringify({
      transaction_amount: args.amount,
      description: args.description,
      payment_method_id: 'pix',
      external_reference: String(args.orderId),
      notification_url: notificationUrl(),
      date_of_expiration: toMpDate(args.expiresAt),
      payer: {
        email: args.payer.email,
        first_name: args.payer.firstName,
        last_name: args.payer.lastName,
        identification: { type: 'CPF', number: args.payer.cpf },
      },
    }),
  })
}

export type CardFormData = {
  token: string
  issuer_id?: string
  payment_method_id: string
  installments: number
  payer: { email?: string; identification?: { type: string; number: string } }
}

export function createCardPayment(args: {
  orderId: number
  attempt: number
  amount: number
  description: string
  email: string
  form: CardFormData
}) {
  return mp<MpPayment>('/v1/payments', {
    method: 'POST',
    // A new key per attempt: a declined card can be retried with another one.
    idempotencyKey: `order-${args.orderId}-card-${args.attempt}`,
    body: JSON.stringify({
      transaction_amount: args.amount,
      token: args.form.token,
      description: args.description,
      installments: args.form.installments,
      payment_method_id: args.form.payment_method_id,
      issuer_id: args.form.issuer_id ? Number(args.form.issuer_id) : undefined,
      external_reference: String(args.orderId),
      notification_url: notificationUrl(),
      statement_descriptor: 'CHECKPOINTGEEK',
      payer: { email: args.form.payer.email || args.email, identification: args.form.payer.identification },
    }),
  })
}

export const getPayment = (id: number | string) => mp<MpPayment>(`/v1/payments/${id}`)

export const cancelPayment = (id: number | string) =>
  mp<MpPayment>(`/v1/payments/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) })

// Full refund (used when a Pix lands after the order expired and the copy was
// already sold to someone else).
export const refundPayment = (id: number | string) =>
  mp<{ id: number }>(`/v1/payments/${id}/refunds`, { method: 'POST', idempotencyKey: `refund-${id}`, body: '{}' })

// Webhook signature (x-signature: "ts=...,v1=..."), as documented by Mercado
// Pago: HMAC-SHA256 of "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
export function verifyWebhookSignature(args: {
  secret: string
  signature: string | null
  requestId: string | null
  dataId: string | null
}): boolean {
  if (!args.signature) return false
  const parts = Object.fromEntries(
    args.signature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k, v.join('=')]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false
  const id = args.dataId && /^[a-z0-9]+$/i.test(args.dataId) ? args.dataId.toLowerCase() : args.dataId
  let manifest = ''
  if (id) manifest += `id:${id};`
  if (args.requestId) manifest += `request-id:${args.requestId};`
  manifest += `ts:${ts};`
  const expected = createHmac('sha256', args.secret).update(manifest).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(v1, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export { declineMessage } from './payment-messages'

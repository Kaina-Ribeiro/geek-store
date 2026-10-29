import { NextResponse, type NextRequest } from 'next/server'

import { env, payments } from '../../../../lib/env'
import { getPayment, verifyWebhookSignature } from '../../../../lib/mercadopago'
import { applyPayment } from '../../../../lib/orders'
import { getClient } from '../../../../lib/payload'

export const dynamic = 'force-dynamic'

// Mercado Pago payment notifications. The body is never trusted: we only use
// the payment id to fetch the real status from Mercado Pago's API.
export async function POST(req: NextRequest) {
  if (!payments.live) return NextResponse.json({ ok: false }, { status: 404 })

  const url = req.nextUrl
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } }
  const type = url.searchParams.get('type') || body.type || url.searchParams.get('topic')
  const dataId = url.searchParams.get('data.id') || (body.data?.id != null ? String(body.data.id) : null)

  if (env.mpWebhookSecret) {
    const ok = verifyWebhookSignature({
      secret: env.mpWebhookSecret,
      signature: req.headers.get('x-signature'),
      requestId: req.headers.get('x-request-id'),
      dataId: url.searchParams.get('data.id') || dataId,
    })
    if (!ok) return NextResponse.json({ ok: false }, { status: 401 })
  }

  if (type !== 'payment' || !dataId) return NextResponse.json({ ok: true, ignored: true })

  const payload = await getClient()
  try {
    const p = await getPayment(dataId)
    const orderId = Number(p.external_reference)
    if (!Number.isInteger(orderId)) return NextResponse.json({ ok: true, ignored: true })
    await applyPayment(orderId, p)
    return NextResponse.json({ ok: true })
  } catch (e) {
    payload.logger.error({ msg: 'webhook mercadopago', err: e })
    // 500 makes Mercado Pago retry later.
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

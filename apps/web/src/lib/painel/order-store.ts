import 'server-only'

import { revalidatePath } from 'next/cache'
import type { Payload } from 'payload'

import type { Order, User } from '../../payload-types'
import { nextMove, statusChip, TRACKING_MAX } from './order-panel'

export type PanelOrder = {
  id: number
  number: string
  name: string
  items: string
  status: string
  statusLabel: string
  chip: { ink: string; bg: string }
  move: ReturnType<typeof nextMove>
}

const DAY = 86_400_000

const toRow = (o: Order): PanelOrder => {
  const chip = statusChip(o)
  const items = (o.items || []).map((i) => (i.qty > 1 ? `${i.qty}× ${i.title}` : i.title)).join(', ')
  return {
    id: o.id,
    number: o.number || `#${o.id}`,
    name: o.name,
    items,
    status: o.status,
    statusLabel: chip.label,
    chip: { ink: chip.ink, bg: chip.bg },
    move: nextMove(o),
  }
}

// Orders waiting for the team first (oldest first), then the ones shipped or
// delivered in the last 7 days.
export async function listOrdersForPanel(payload: Payload, user: User): Promise<PanelOrder[]> {
  const as = { user, overrideAccess: false, depth: 0 } as const
  const since = new Date(Date.now() - 7 * DAY).toISOString()
  const [open, done] = await Promise.all([
    payload.find({ collection: 'orders', where: { status: { in: ['pago', 'pronto'] } }, sort: 'createdAt', limit: 200, ...as }),
    payload.find({
      collection: 'orders',
      where: { and: [{ status: { in: ['enviado', 'entregue'] } }, { updatedAt: { greater_than: since } }] },
      sort: '-updatedAt',
      limit: 100,
      ...as,
    }),
  ])
  return [...open.docs, ...done.docs].map(toRow)
}

// The order's next step. Re-reads it first: a double click or someone else's
// move answers "Esse pedido já mudou". Goes through payload.update as the
// signed-in person (no ORDER_MOVE context), so the Orders hooks run exactly as
// in /admin (e-mail to the customer). Stock and XP are not touched here.
export async function moveOrder(
  payload: Payload,
  user: User | null,
  id: number,
  from: string,
  trackingCode?: string,
): Promise<{ ok: true } | { ok: false; error: string; session?: true }> {
  if (!user) return { ok: false, error: 'Sua sessão acabou. Entre de novo.', session: true }
  const as = { user, overrideAccess: false } as const
  const order = await payload.findByID({ collection: 'orders', id, depth: 0, ...as }).catch(() => null)
  if (!order) return { ok: false, error: 'Pedido não encontrado. Atualize a página.' }
  if (order.status !== from) return { ok: false, error: 'Esse pedido já mudou. Atualize a página.' }
  const move = nextMove(order)
  if (!move) return { ok: false, error: 'Esse pedido não tem próximo passo aqui.' }
  const code = move.asksTracking ? (trackingCode || '').trim().slice(0, TRACKING_MAX) : ''
  try {
    await payload.update({
      collection: 'orders',
      id,
      data: { status: move.to, ...(code && { trackingCode: code }) },
      ...as,
    })
  } catch (err) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return { ok: false, error: 'Sua sessão acabou. Entre de novo.', session: true }
    payload.logger.error({ err }, '[painel] falha ao mudar o pedido')
    return { ok: false, error: 'Não deu para mudar o pedido. Tente de novo.' }
  }
  try {
    revalidatePath('/painel', 'layout')
  } catch {
    // Outside a request (scripts).
  }
  return { ok: true }
}

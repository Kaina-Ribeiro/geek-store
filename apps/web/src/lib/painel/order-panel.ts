// Pure rules of the panel's order list: one button per order, the next step.

type OrderLike = { status: string; shipping?: { methodId?: string | null } | null }
export type NextMove = { to: 'enviado' | 'pronto' | 'entregue'; label: string; asksTracking: boolean }

// "Retirada" = shipping.methodId === 'retirada' (same rule as lib/emails and
// lib/orders); anything else is shipped.
export const isPickup = (o: OrderLike) => o.shipping?.methodId === 'retirada'

export function nextMove(o: OrderLike): NextMove | null {
  if (o.status === 'pago') {
    return isPickup(o)
      ? { to: 'pronto', label: 'Pronto para retirar', asksTracking: false }
      : { to: 'enviado', label: 'Já enviei', asksTracking: true }
  }
  if (o.status === 'pronto' && isPickup(o)) return { to: 'entregue', label: 'Cliente retirou', asksTracking: false }
  return null
}

// Status chip of the panel (plain words + the prototype's colours).
export function statusChip(o: OrderLike): { label: string; ink: string; bg: string } {
  switch (o.status) {
    case 'pago':
      return { label: isPickup(o) ? 'Pago · separar para retirada' : 'Pago · falta enviar', ink: '#9A6A00', bg: 'rgba(255, 198, 26, .24)' }
    case 'pronto':
      return { label: 'Esperando o cliente retirar', ink: '#2D6BF0', bg: 'rgba(45, 107, 240, .12)' }
    case 'enviado':
      return { label: 'Enviado', ink: '#178a39', bg: 'rgba(34, 176, 75, .14)' }
    case 'entregue':
      return { label: 'Entregue', ink: '#178a39', bg: 'rgba(34, 176, 75, .14)' }
    default:
      return { label: o.status, ink: '#5F5F68', bg: '#E3E4EA' }
  }
}

export const TRACKING_MAX = 40

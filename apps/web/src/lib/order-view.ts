import type { Order } from '../payload-types'
import { installments } from './catalog'

// What the order page and the account page are allowed to show. Never
// includes the CPF or the access token.
export type OrderView = {
  id: number
  number: string
  status: Order['status']
  createdAt: string
  name: string
  email: string
  items: { title: string; platform: string; condition: string; qty: number; unitPrice: number; cover: string }[]
  shipping: {
    method: string
    pickup: boolean
    price: number
    days: number | null
    address: string | null
  }
  trackingCode: string | null
  payment: {
    method: 'pix' | 'card'
    status: string
    statusDetail: string | null
    expiresAt: string | null
    paidAt: string | null
    qrCode: string | null
    qrBase64: string | null
    installments: number | null
    simulated: boolean
  }
  subtotal: number
  discount: number
  total: number
  xp: number
  maxInstallments: number
  hasAccount: boolean
}

export const STATUS_LABEL: Record<Order['status'], string> = {
  aguardando: 'Aguardando pagamento',
  pago: 'Pago · separando',
  enviado: 'A caminho',
  pronto: 'Pronto para retirar',
  entregue: 'Entregue',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

export const STATUS_COLOR: Record<Order['status'], string> = {
  aguardando: '#FFC61A',
  pago: '#2D6BF0',
  enviado: '#22B04B',
  pronto: '#22B04B',
  entregue: '#22B04B',
  expirado: '#8E8E97',
  cancelado: '#E8322B',
}

// Progress bar steps: pago, separado, enviado/pronto, entregue.
export const statusStep = (s: Order['status']) =>
  ({ aguardando: 0, pago: 1, enviado: 3, pronto: 3, entregue: 4, expirado: 0, cancelado: 0 })[s]

export function toOrderView(o: Order): OrderView {
  const s = o.shipping
  const pickup = s?.methodId === 'retirada'
  return {
    id: o.id,
    number: o.number || `#${1000 + o.id}`,
    status: o.status,
    createdAt: o.createdAt,
    name: o.name,
    email: o.email,
    items: o.items.map((i) => ({
      title: i.title,
      platform: i.platform || '',
      condition: i.condition || '',
      qty: i.qty,
      unitPrice: i.unitPrice,
      cover: i.cover || '/brand/cover-fallback.svg',
    })),
    shipping: {
      method: s?.method || '',
      pickup,
      price: s?.price ?? 0,
      days: s?.days ?? null,
      address: pickup
        ? 'Retirada na loja em Taubaté'
        : [
            [s?.street, s?.number].filter(Boolean).join(', '),
            s?.complement,
            s?.district,
            [s?.city, s?.uf].filter(Boolean).join(' - '),
            s?.cep ? `CEP ${s.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
    },
    trackingCode: o.trackingCode || null,
    payment: {
      method: (o.payment?.method as 'pix' | 'card') || 'pix',
      status: o.payment?.status || 'pending',
      statusDetail: o.payment?.statusDetail || null,
      expiresAt: o.payment?.expiresAt || null,
      paidAt: o.payment?.paidAt || null,
      qrCode: o.payment?.qrCode || null,
      qrBase64: o.payment?.qrBase64 || null,
      installments: o.payment?.installments ?? null,
      simulated: Boolean(o.payment?.simulated),
    },
    subtotal: o.subtotal,
    discount: o.discount ?? 0,
    total: o.total,
    xp: o.xp ?? 0,
    maxInstallments: installments(o.total).n,
    hasAccount: Boolean(o.customer),
  }
}

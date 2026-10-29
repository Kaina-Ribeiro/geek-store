// Pure pricing rules shared by the checkout screen and the server. The server
// always recomputes with prices read from the database; the client uses the
// same functions only to preview the totals.

import { installments, pixPrice } from './catalog'

export const FREE_SHIPPING_FROM = 299
export const PIX_MINUTES = 30

export type PayMethod = 'pix' | 'card'

export type PricedLine = { price: number; qty: number }

export type ShipOption = {
  id: string
  name: string
  detail: string
  days: number | null
  price: number
  // Price before the free-shipping rule, shown crossed out.
  fullPrice: number
  pickup?: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const unitPrice = (price: number, method: PayMethod) => (method === 'pix' ? pixPrice(price) : price)

export const subtotals = (lines: PricedLine[]) => {
  const full = round2(lines.reduce((n, l) => n + l.price * l.qty, 0))
  const pix = round2(lines.reduce((n, l) => n + pixPrice(l.price) * l.qty, 0))
  return { full, pix, pixDiscount: round2(full - pix) }
}

// Free shipping: from R$ 299 (Pix subtotal) the cheapest delivery service is
// free. Faster services keep their price minus the value of the cheapest one.
export const applyFreeShipping = (options: ShipOption[], pixSubtotal: number): ShipOption[] => {
  if (pixSubtotal < FREE_SHIPPING_FROM) return options
  const paid = options.filter((o) => !o.pickup)
  if (!paid.length) return options
  const cheapest = Math.min(...paid.map((o) => o.fullPrice))
  return options.map((o) => (o.pickup ? o : { ...o, price: round2(Math.max(0, o.fullPrice - cheapest)) }))
}

export const orderTotals = (lines: PricedLine[], method: PayMethod, shipping: number) => {
  const s = subtotals(lines)
  const items = method === 'pix' ? s.pix : s.full
  const total = round2(items + shipping)
  return {
    subtotal: s.full,
    discount: method === 'pix' ? s.pixDiscount : 0,
    shipping,
    total,
    // R$ 1 = 1 XP, counted on what the customer pays for the games.
    xp: Math.round(s.pix),
    maxInstallments: installments(total).n,
  }
}

export const onlyDigits = (s: string) => s.replace(/\D/g, '')
export const formatCep = (s: string) => {
  const d = onlyDigits(s).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

// CPF check digits (Mercado Pago rejects invalid CPFs; catch it earlier).
export const isValidCpf = (raw: string) => {
  const c = onlyDigits(raw)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dv = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10])
}

export const orderNumber = (id: number | string) => `#${1000 + Number(id)}`

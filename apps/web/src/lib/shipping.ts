import 'server-only'

import { applyFreeShipping, onlyDigits, type ShipOption } from './checkout-math'
import { env } from './env'

export type Address = {
  cep: string
  street: string
  district: string
  city: string
  uf: string
}

// Address lookup by CEP (ViaCEP, free, no key).
export async function lookupCep(raw: string): Promise<Address | null> {
  const cep = onlyDigits(raw)
  if (cep.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { next: { revalidate: 86400 } })
    if (!r.ok) return null
    const d = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
    if (d.erro) return null
    return { cep, street: d.logradouro || '', district: d.bairro || '', city: d.localidade || '', uf: d.uf || '' }
  } catch {
    return null
  }
}

// One game case is ~19 x 13.5 x 1.5 cm; the store ships in a padded box.
export const packageFor = (qty: number) => ({
  width: 20,
  length: 16,
  height: Math.min(40, 4 + Math.ceil(qty * 1.6)),
  weight: Math.round((0.2 + qty * 0.2) * 100) / 100,
})

const PICKUP: ShipOption = {
  id: 'retirada',
  name: 'Retirar em Taubaté',
  detail: 'Seg a sáb, das 10h às 19h',
  days: 0,
  price: 0,
  fullPrice: 0,
  pickup: true,
}

// Rough table used when Melhor Envio is not configured (development) or when
// its API is down, so the checkout never blocks. Origin: Taubaté-SP.
export function fallbackQuote(cep: string, qty: number): ShipOption[] {
  const first = Number(onlyDigits(cep)[0] ?? 9)
  // 0-1: São Paulo state; 2-3: RJ/ES/MG; 8-9: South; 4-7: other regions.
  const zone = first <= 1 ? 0 : first <= 3 || first >= 8 ? 1 : 2
  const extra = Math.max(0, qty - 1) * 2.5
  const pac = [18.9, 24.9, 32.9][zone] + extra
  const sedex = [29.9, 42.9, 59.9][zone] + extra
  const days = [
    [5, 2],
    [7, 3],
    [10, 5],
  ][zone]
  const r = (n: number) => Math.round(n * 100) / 100
  return [
    { id: 'pac', name: 'Correios PAC', detail: `${days[0]} dias úteis`, days: days[0], price: r(pac), fullPrice: r(pac) },
    { id: 'sedex', name: 'Correios SEDEX', detail: `${days[1]} dias úteis`, days: days[1], price: r(sedex), fullPrice: r(sedex) },
  ]
}

type MeService = {
  id: number
  name: string
  price?: string
  custom_price?: string
  delivery_time?: number
  custom_delivery_time?: number
  company?: { name: string }
  error?: string
}

async function melhorEnvioQuote(cep: string, qty: number, insurance: number): Promise<ShipOption[] | null> {
  const host = env.meSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br'
  try {
    const r = await fetch(`${host}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.meToken}`,
        'User-Agent': `Checkpoint Geek (${env.emailFrom})`,
      },
      body: JSON.stringify({
        from: { postal_code: env.originCep },
        to: { postal_code: cep },
        package: packageFor(qty),
        options: { insurance_value: Math.round(insurance * 100) / 100, receipt: false, own_hand: false },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    const list = (await r.json()) as MeService[]
    const ok = list
      .filter((s) => !s.error && (s.custom_price || s.price))
      .map((s): ShipOption => {
        const price = Number(s.custom_price || s.price)
        const days = s.custom_delivery_time ?? s.delivery_time ?? null
        return {
          id: `me-${s.id}`,
          name: `${s.company?.name ?? ''} ${s.name}`.trim(),
          detail: days ? `${days} dias úteis` : 'Prazo na confirmação',
          days,
          price,
          fullPrice: price,
        }
      })
      .sort((a, b) => a.price - b.price)
    // Keep it short: the cheapest and the fastest options.
    const fastest = [...ok].sort((a, b) => (a.days ?? 99) - (b.days ?? 99))[0]
    const picks = ok.slice(0, 2)
    if (fastest && !picks.includes(fastest)) picks.push(fastest)
    return picks.length ? picks : null
  } catch {
    return null
  }
}

export async function quoteShipping(rawCep: string, qty: number, pixSubtotal: number): Promise<ShipOption[]> {
  const cep = onlyDigits(rawCep)
  const delivery = (env.meToken && (await melhorEnvioQuote(cep, qty, pixSubtotal))) || fallbackQuote(cep, qty)
  return applyFreeShipping([PICKUP, ...delivery], pixSubtotal)
}

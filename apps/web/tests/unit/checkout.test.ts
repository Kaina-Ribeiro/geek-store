import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'

import { installments, pixPrice } from '../../src/lib/catalog'
import {
  applyFreeShipping,
  formatCep,
  isValidCpf,
  orderNumber,
  orderTotals,
  type ShipOption,
} from '../../src/lib/checkout-math'
import { verifyWebhookSignature } from '../../src/lib/mercadopago'
import { fallbackQuote, packageFor } from '../../src/lib/shipping'
import { achievementsOf, levelOf } from '../../src/lib/xp'

describe('preços', () => {
  it('Pix tem 5% de desconto, arredondado em centavos', () => {
    expect(pixPrice(189.9)).toBe(180.41)
    expect(pixPrice(100)).toBe(95)
  })
  it('parcelas: mínimo de R$ 40, no máximo 6x', () => {
    expect(installments(39.9).n).toBe(1)
    expect(installments(119.9).n).toBe(2)
    expect(installments(1000).n).toBe(6)
  })
  it('totais do pedido no Pix e no cartão', () => {
    const lines = [
      { price: 189.9, qty: 1 },
      { price: 156.9, qty: 1 },
    ]
    const pix = orderTotals(lines, 'pix', 0)
    expect(pix.subtotal).toBe(346.8)
    expect(pix.total).toBe(329.47) // rounded per item, as on the cards
    expect(pix.discount).toBe(17.33)
    expect(pix.xp).toBe(329)
    const card = orderTotals(lines, 'card', 11)
    expect(card.discount).toBe(0)
    expect(card.total).toBe(357.8)
    // XP counts the Pix value either way.
    expect(card.xp).toBe(329)
  })
})

describe('frete', () => {
  const opts: ShipOption[] = [
    { id: 'retirada', name: 'Retirar', detail: '', days: 0, price: 0, fullPrice: 0, pickup: true },
    { id: 'pac', name: 'PAC', detail: '', days: 5, price: 18.9, fullPrice: 18.9 },
    { id: 'sedex', name: 'SEDEX', detail: '', days: 2, price: 29.9, fullPrice: 29.9 },
  ]
  it('abaixo de R$ 299 cobra o frete cheio', () => {
    expect(applyFreeShipping(opts, 298.99).map((o) => o.price)).toEqual([0, 18.9, 29.9])
  })
  it('a partir de R$ 299 o mais barato é grátis e o rápido paga a diferença', () => {
    expect(applyFreeShipping(opts, 299).map((o) => o.price)).toEqual([0, 0, 11])
  })
  it('tabela de reserva por região quando o Melhor Envio não responde', () => {
    const sp = fallbackQuote('12010-000', 1)
    const north = fallbackQuote('69000-000', 1)
    expect(sp[0].price).toBeLessThan(north[0].price)
    expect(fallbackQuote('12010-000', 3)[0].price).toBeGreaterThan(sp[0].price)
  })
  it('caixa cresce com a quantidade', () => {
    expect(packageFor(3).height).toBeGreaterThan(packageFor(1).height)
  })
})

describe('validações', () => {
  it('CPF pelos dígitos verificadores', () => {
    expect(isValidCpf('111.444.777-35')).toBe(true)
    expect(isValidCpf('111.444.777-36')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('123')).toBe(false)
  })
  it('máscara de CEP e número do pedido', () => {
    expect(formatCep('12010000')).toBe('12010-000')
    expect(orderNumber(42)).toBe('#1042')
  })
})

describe('webhook do Mercado Pago', () => {
  const secret = 'segredo-de-teste'
  const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex')
  it('aceita assinatura válida', () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;')
    expect(
      verifyWebhookSignature({ secret, signature: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456' }),
    ).toBe(true)
  })
  it('recusa assinatura adulterada ou ausente', () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;')
    expect(verifyWebhookSignature({ secret, signature: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '999' })).toBe(false)
    expect(verifyWebhookSignature({ secret, signature: null, requestId: 'req-1', dataId: '123456' })).toBe(false)
    expect(verifyWebhookSignature({ secret, signature: 'ts=1,v1=zz', requestId: 'req-1', dataId: '123456' })).toBe(false)
  })
})

describe('passe Checkpoint', () => {
  it('níveis e progresso', () => {
    expect(levelOf(0).tier.n).toBe(1)
    expect(levelOf(1240).tier.t).toBe('Explorador')
    expect(levelOf(1240).toNext).toBe(760)
    expect(levelOf(9999).next).toBeNull()
  })
  it('conquistas calculadas dos pedidos pagos', () => {
    const a = achievementsOf({
      saves: 10,
      paidOrders: [
        { platforms: ['PS2', 'PS2', 'PS2'], groups: ['Retrô'], placedAt: '2026-10-30T20:00:30Z', dropOpenedAt: '2026-10-30T20:00:00Z' },
      ],
    })
    const on = a.filter((x) => x.unlocked).map((x) => x.id)
    expect(on).toEqual(expect.arrayContaining(['primeira', 'colecionador', 'retro', 'saves', 'drop']))
    expect(on).not.toContain('fiel')
  })
})

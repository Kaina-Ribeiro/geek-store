import { expect, it } from 'vitest'

import { nextMove } from '../../src/lib/painel/order-panel'

it.each([
  [{ status: 'pago', shipping: { methodId: 'sedex' } }, { to: 'enviado', label: 'Já enviei', asksTracking: true }],
  [{ status: 'pago', shipping: { methodId: 'retirada' } }, { to: 'pronto', label: 'Pronto para retirar', asksTracking: false }],
  [{ status: 'pronto', shipping: { methodId: 'retirada' } }, { to: 'entregue', label: 'Cliente retirou', asksTracking: false }],
  [{ status: 'pago', shipping: null }, { to: 'enviado', label: 'Já enviei', asksTracking: true }],
])('nextMove %o', (o, m) => expect(nextMove(o)).toEqual(m))

it.each(['aguardando', 'enviado', 'entregue', 'cancelado', 'expirado'])('sem ação em %s', (s) => expect(nextMove({ status: s })).toBeNull())
it('pronto de envio não tem botão', () => expect(nextMove({ status: 'pronto', shipping: { methodId: 'sedex' } })).toBeNull())

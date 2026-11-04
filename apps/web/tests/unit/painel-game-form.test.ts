import { describe, expect, it } from 'vitest'

import { normalizeCopy, parsePrice, validateGame, type GameDraft } from '../../src/lib/painel/game-form'

const base: GameDraft = {
  title: 'Ico',
  platform: 'ps2',
  coverId: 1,
  year: '',
  ageRating: '',
  genre: '',
  description: '',
  showInHero: false,
  copies: [{ condition: 'lacrado', price: '99,90', stock: 1, active: true }],
}

describe('parsePrice', () => {
  it.each([
    ['189,90', 189.9],
    ['R$ 189,90', 189.9],
    ['1.189,90', 1189.9],
    ['189.90', 189.9],
    [' 89 ', 89],
    ['1.189', 1189],
    ['0,50', 0.5],
  ])('%s → %s', (s, n) => expect(parsePrice(s)).toBe(n))
  it.each(['', '0', '0,00', '-5', 'abc', '12,345', '1.1.1', 'R$', '10,5,0'])('%s → null', (s) => expect(parsePrice(s)).toBeNull())
})

describe('normalizeCopy', () => {
  it('usado vira 1 com laudo padrão', () => {
    const c = normalizeCopy({ condition: 'b', price: '10', stock: 3, active: true })
    expect(c.stock).toBe(1)
    expect(c.laudo).toMatchObject({ boot: true, capa: true, manual: false, higienizado: true })
  })
  it('usado vendido fica com 0', () => expect(normalizeCopy({ condition: 'a', price: '10', stock: 0, active: true, sold: true }).stock).toBe(0))
  it('usado mantém o laudo que já tinha', () => {
    const laudo = { boot: false, capa: false, manual: true, higienizado: false, surface: 'riscos', testedOn: 'PS2', photos: [3] }
    expect(normalizeCopy({ condition: 'disco', price: '10', stock: 1, active: true, laudo }).laudo).toEqual(laudo)
  })
  it('lacrado mantém quantidade e não tem laudo', () => {
    const c = normalizeCopy({ condition: 'lacrado', price: '10', stock: 3, active: true })
    expect(c.stock).toBe(3)
    expect(c.laudo).toBeUndefined()
  })
  it('lacrado com 0 vira 1', () => expect(normalizeCopy({ condition: 'lacrado', price: '10', stock: 0, active: true }).stock).toBe(1))
})

describe('validateGame', () => {
  it('aceita o mínimo', () => expect(validateGame(base)).toEqual({}))
  it('sem nome, plataforma e capa', () =>
    expect(validateGame({ ...base, title: ' ', platform: '', coverId: null })).toEqual({
      title: 'Escreva o nome do jogo',
      platform: 'Escolha a plataforma',
      coverId: 'Coloque a foto da capa',
    }))
  it('preço ruim aponta a cópia', () =>
    expect(validateGame({ ...base, copies: [{ condition: 'lacrado', price: 'abc', stock: 1, active: true }] })['copies.0.price']).toBe(
      'Preço inválido',
    ))
  it('sem cópias', () => expect(validateGame({ ...base, copies: [] }).copies).toBe('Adicione pelo menos uma cópia'))
  it('cópia tirada da loja não conta e não é validada', () =>
    expect(validateGame({ ...base, copies: [{ condition: 'a', price: '', stock: 1, active: false }] }).copies).toBe(
      'Adicione pelo menos uma cópia',
    ))
})

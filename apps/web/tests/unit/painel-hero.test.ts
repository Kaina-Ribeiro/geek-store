import { describe, expect, it } from 'vitest'

import type { Featured } from '../../src/lib/data'
import {
  featuredToSlides,
  HERO_DEFAULTS,
  HERO_LIMITS,
  isInternalPath,
  resolveHeroSlides,
  titleLines,
} from '../../src/lib/painel/hero'

describe('featuredToSlides', () => {
  it('ordena do mais recente e marca visível', () => {
    expect(featuredToSlides([{ id: 1, updatedAt: '2026-10-01' }, { id: 2, updatedAt: '2026-11-01' }])).toEqual([
      { kind: 'game', game: 2, visible: true },
      { kind: 'game', game: 1, visible: true },
    ])
  })
  it('limita a 8', () => {
    const g = Array.from({ length: 12 }, (_, i) => ({ id: i, updatedAt: `2026-10-${10 + i}` }))
    expect(featuredToSlides(g)).toHaveLength(HERO_LIMITS.slides)
  })
  it('defaults cabem nos limites', () => {
    expect(HERO_DEFAULTS.title.length).toBeLessThanOrEqual(HERO_LIMITS.title)
    expect(HERO_DEFAULTS.subtitle.length).toBeLessThanOrEqual(HERO_LIMITS.subtitle)
    expect(HERO_DEFAULTS.ctaLabel.length).toBeLessThanOrEqual(HERO_LIMITS.ctaLabel)
  })
})

describe('titleLines', () => {
  it('quebra e limpa', () =>
    expect(titleLines(' Continue \n\n de onde você\nparou. ')).toEqual(['Continue', 'de onde você', 'parou.']))
  it('máx 4 linhas', () => expect(titleLines('a\nb\nc\nd\ne')).toHaveLength(4))
  it('aceita quebra de linha do Windows', () => expect(titleLines('a\r\nb')).toEqual(['a', 'b']))
})

describe('isInternalPath', () => {
  it.each(['/loja', '/loja?plataforma=ps2', '/drop'])('aceita %s', (p) => expect(isInternalPath(p)).toBe(true))
  it.each(['', 'loja', '//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/ evil'])(
    'recusa %s',
    (p) => expect(isInternalPath(p)).toBe(false),
  )
})

describe('resolveHeroSlides', () => {
  const f = { id: 10, gameId: 1 } as unknown as Featured
  it('pula escondido, apagado e sem estoque', () => {
    const out = resolveHeroSlides(
      [
        { kind: 'game', game: 1, visible: true },
        { kind: 'game', game: 2, visible: true },
        { kind: 'game', game: 1, visible: false },
        { kind: 'game', game: null, visible: true },
      ],
      new Map([[1, f]]),
      new Map(),
    )
    expect(out).toEqual([{ kind: 'game', item: f }])
  })
  it('campanha sem imagem e link ruim', () => {
    expect(
      resolveHeroSlides([{ kind: 'campaign', campaignTitle: 'Natal', campaignLink: '//x', visible: true }], new Map(), new Map()),
    ).toEqual([{ kind: 'campaign', title: 'Natal', image: null, href: '/loja' }])
  })
  it('campanha com imagem', () => {
    const im = { url: '/x.webp', width: 1, height: 1, alt: '' }
    expect(
      resolveHeroSlides(
        [{ kind: 'campaign', campaignTitle: 'Natal', campaignImage: 5, campaignLink: '/drop', visible: true }],
        new Map(),
        new Map([[5, im]]),
      ),
    ).toEqual([{ kind: 'campaign', title: 'Natal', image: im, href: '/drop' }])
  })
})

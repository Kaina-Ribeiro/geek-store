import { describe, expect, it } from 'vitest'

import { featuredToSlides, HERO_DEFAULTS, HERO_LIMITS } from '../../src/lib/painel/hero'

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

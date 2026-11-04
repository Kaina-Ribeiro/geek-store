// Pure logic for the home banner (Global "home-hero"). No server-only imports:
// the panel's client components and the unit tests use it too.

export type HeroSlideInput = {
  kind: 'game' | 'campaign'
  game?: number | null
  campaignTitle?: string | null
  campaignImage?: number | null
  campaignLink?: string | null
  visible: boolean
}

export type HeroDraft = { title: string; subtitle: string; ctaLabel: string; slides: HeroSlideInput[] }

export const HERO_LIMITS = { title: 60, subtitle: 220, ctaLabel: 24, campaignTitle: 40, slides: 8 } as const

// The texts the home had hard-coded before the panel existed.
export const HERO_DEFAULTS: Omit<HeroDraft, 'slides'> = {
  title: 'Continue\nde onde você\nparou.',
  subtitle:
    'Lacrados e seminovos com laudo de cada disco, do PS2 ao Switch 2. Separados à mão em Taubaté e enviados para todo o Brasil.',
  ctaLabel: 'Abrir a loja',
}

// Old "featured" games become game slides, most recently updated first.
export function featuredToSlides(games: { id: number; updatedAt: string }[]): HeroSlideInput[] {
  return [...games]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, HERO_LIMITS.slides)
    .map((g) => ({ kind: 'game', game: g.id, visible: true }))
}

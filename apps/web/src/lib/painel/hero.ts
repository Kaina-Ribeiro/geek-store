// Pure logic for the home banner (Global "home-hero"). No server-only imports:
// the panel's client components and the unit tests use it too.
import type { Featured, Img } from '../data'

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

// Each line of the title is one line on the site (max 4, blank lines dropped).
export const titleLines = (title: string): string[] =>
  title
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)

// Only same-site paths ("/loja", "/drop"): never "//host", "/\host" or URLs.
export const isInternalPath = (s: string | null | undefined): s is string =>
  typeof s === 'string' && s.startsWith('/') && s[1] !== '/' && s[1] !== '\\' && !/\s/.test(s)

export type HeroSlideView =
  | { kind: 'game'; item: Featured }
  | { kind: 'campaign'; title: string; image: Img | null; href: string }

// What the home actually shows: visible slides only; a game that was deleted
// or has nothing in stock is skipped; a bad link falls back to the shop.
export function resolveHeroSlides(
  slides: HeroSlideInput[],
  featuredByGame: Map<number, Featured>,
  imageById: Map<number, Img>,
): HeroSlideView[] {
  const out: HeroSlideView[] = []
  for (const s of slides) {
    if (!s.visible) continue
    if (s.kind === 'game') {
      const item = s.game != null ? featuredByGame.get(s.game) : undefined
      if (item) out.push({ kind: 'game', item })
      continue
    }
    const title = (s.campaignTitle || '').trim()
    if (!title) continue
    out.push({
      kind: 'campaign',
      title,
      image: s.campaignImage != null ? (imageById.get(s.campaignImage) ?? null) : null,
      href: isInternalPath(s.campaignLink) ? s.campaignLink : '/loja',
    })
  }
  return out
}

// Title as saved: each line trimmed, blank lines dropped (what the site shows).
export const normalizeTitle = (title: string) => titleLines(title).join('\n')

// Short messages next to each field, keyed by field path ("slides.2.game").
export function validateHero(d: HeroDraft): Record<string, string> {
  const e: Record<string, string> = {}
  const L = HERO_LIMITS
  const title = normalizeTitle(d.title)
  if (!title) e.title = 'Escreva um título'
  else if (title.length > L.title) e.title = `Título com até ${L.title} letras`
  if (d.subtitle.trim().length > L.subtitle) e.subtitle = `Frase com até ${L.subtitle} letras`
  if (!d.ctaLabel.trim()) e.ctaLabel = 'Escreva o texto do botão'
  else if (d.ctaLabel.trim().length > L.ctaLabel) e.ctaLabel = `Botão com até ${L.ctaLabel} letras`
  if (d.slides.length > L.slides) e.slides = `No máximo ${L.slides} slides`
  d.slides.forEach((s, i) => {
    if (s.kind === 'game') {
      if (s.game == null) e[`slides.${i}.game`] = 'Escolha um jogo'
      return
    }
    const t = (s.campaignTitle || '').trim()
    if (!t) e[`slides.${i}.campaignTitle`] = 'A campanha precisa de um texto'
    else if (t.length > L.campaignTitle) e[`slides.${i}.campaignTitle`] = `Texto com até ${L.campaignTitle} letras`
    if (s.campaignLink && !isInternalPath(s.campaignLink)) e[`slides.${i}.campaignLink`] = 'Escolha um destino da lista'
  })
  return e
}

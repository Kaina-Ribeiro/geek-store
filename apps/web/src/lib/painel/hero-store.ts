import 'server-only'

import { revalidatePath } from 'next/cache'
import type { Payload } from 'payload'

import type { Game, HomeHero, Media, User } from '../../payload-types'
import { platformOf } from '../catalog'
import { featuredFor, heroImage, heroStrip, thumbImage, toSlideInputs, type Featured, type Img } from '../data'
import { normalizeTitle, validateHero, type HeroDraft, type HeroSlideInput } from './hero'

export type SlideGameInfo = { title: string; platform: string; thumb: Img }

export type HeroLoad = {
  draft: HeroDraft
  updatedAt: string
  preview: {
    featuredByGame: Record<number, Featured>
    images: Record<number, Img>
    games: Record<number, SlideGameInfo>
    strip: Img[]
    total: number
  }
}

export type PublishResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string; fields?: Record<string, string>; stale?: true; session?: true }

const SESSION = 'Sua sessão acabou. Entre de novo para publicar (seu rascunho continua guardado).'

// The published banner, read as the signed-in person, plus what the live
// preview needs to draw it exactly like the site.
export async function loadHero(payload: Payload, user: User): Promise<HeroLoad> {
  const g = await payload.findGlobal({ slug: 'home-hero', depth: 2, user, overrideAccess: false })
  const draft: HeroDraft = { title: g.title, subtitle: g.subtitle ?? '', ctaLabel: g.ctaLabel, slides: toSlideInputs(g.slides) }
  const games: Record<number, SlideGameInfo> = {}
  const images: Record<number, Img> = {}
  for (const s of g.slides || []) {
    if (s.game && typeof s.game === 'object') games[s.game.id] = gameInfo(s.game)
    if (s.campaignImage && typeof s.campaignImage === 'object') images[s.campaignImage.id] = heroImage(s.campaignImage)
  }
  const [featured, home] = await Promise.all([featuredFor(Object.keys(games).map(Number)), heroStrip()])
  return {
    draft,
    updatedAt: g.updatedAt || '',
    preview: { featuredByGame: Object.fromEntries(featured), images, games, strip: home.strip, total: home.total },
  }
}

export const gameInfo = (g: Game): SlideGameInfo => ({
  title: g.title,
  platform: platformOf(g.platform).label,
  thumb: thumbImage(g.cover as Media | number),
})

// Only the fields of each slide kind, trimmed, with the default link.
const cleanSlides = (slides: HeroSlideInput[]): NonNullable<HomeHero['slides']> =>
  slides.map((s) =>
    s.kind === 'game'
      ? { kind: 'game', game: s.game ?? null, visible: s.visible }
      : {
          kind: 'campaign',
          campaignTitle: (s.campaignTitle || '').trim(),
          campaignImage: s.campaignImage ?? null,
          campaignLink: s.campaignLink || '/loja',
          visible: s.visible,
        },
  )

// Publishes the draft. `basedOn` is the updatedAt the draft started from: if
// someone published since, the answer is `stale` unless `force`.
export async function publishHero(
  payload: Payload,
  user: User | null,
  draft: HeroDraft,
  basedOn: string,
  force = false,
): Promise<PublishResult> {
  if (!user) return { ok: false, error: SESSION, session: true }
  const fields = validateHero(draft)
  if (Object.keys(fields).length) return { ok: false, error: 'Confira os campos marcados.', fields }

  try {
    const current = await payload.findGlobal({ slug: 'home-hero', depth: 0, user, overrideAccess: false })
    if (!force && (current.updatedAt || '') !== basedOn) {
      return { ok: false, error: 'O banner mudou desde que você começou.', stale: true }
    }
    const saved = await payload.updateGlobal({
      slug: 'home-hero',
      data: {
        title: normalizeTitle(draft.title),
        subtitle: draft.subtitle.trim(),
        ctaLabel: draft.ctaLabel.trim(),
        slides: cleanSlides(draft.slides),
      },
      user,
      overrideAccess: false,
    })
    try {
      revalidatePath('/', 'layout')
    } catch {
      // Outside a request (scripts): nothing to revalidate.
    }
    return { ok: true, updatedAt: saved.updatedAt || '' }
  } catch (err) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return { ok: false, error: SESSION, session: true }
    payload.logger.error({ err }, '[painel] falha ao publicar o banner')
    return { ok: false, error: 'Não deu para publicar. Seu rascunho está guardado, tente de novo.' }
  }
}

export type PickGame = { id: number; info: SlideGameInfo; featured: Featured }

// Games for a banner slide: only those with something in stock, max 24.
export async function searchGamesForHero(payload: Payload, user: User, q: string): Promise<PickGame[]> {
  const term = q.trim().slice(0, 60)
  const res = await payload.find({
    collection: 'games',
    where: term ? { title: { like: term } } : {},
    depth: 1,
    limit: 80,
    sort: '-updatedAt',
    user,
    overrideAccess: false,
  })
  const featured = await featuredFor(res.docs.map((g) => g.id))
  return res.docs
    .filter((g) => featured.has(g.id))
    .slice(0, 24)
    .map((g) => ({ id: g.id, info: gameInfo(g), featured: featured.get(g.id)! }))
}

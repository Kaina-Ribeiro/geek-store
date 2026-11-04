// Pure logic of the panel's game form (add and edit). No server imports: the
// client form and the unit tests use it too.
import { PLATFORMS, type ConditionValue, type PlatformValue } from '../catalog'

export type Laudo = {
  boot: boolean
  capa: boolean
  manual: boolean
  higienizado: boolean
  surface: string
  testedOn: string
  photos: number[]
}

export type CopyDraft = {
  id?: number
  condition: ConditionValue
  price: string
  stock: number
  active: boolean
  sold?: boolean
  // Stock when the form was loaded: saving applies only the change the person
  // made (+/-), so a sale that happened meanwhile is never undone.
  loadedStock?: number
  laudo?: Laudo
}

export type GameDraft = {
  id?: number
  title: string
  platform: PlatformValue | ''
  coverId: number | null
  year: string
  ageRating: string
  genre: string
  description: string
  showInHero: boolean
  copies: CopyDraft[]
}

// Same defaults as the "copies" collection.
export const LAUDO_DEFAULTS: Laudo = { boot: true, capa: true, manual: false, higienizado: true, surface: '', testedOn: '', photos: [] }

// "189,90", "R$ 189,90", "1.189,90", "189.90" and " 89 " are prices; empty,
// zero, negative, junk and more than 2 decimals are not (null).
export function parsePrice(s: string): number | null {
  const t = s.replace(/R\$/gi, '').replace(/\s+/g, '')
  let n: number | null = null
  if (/^\d+$/.test(t)) n = Number(t)
  else if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(t) || /^\d+,\d{1,2}$/.test(t)) n = Number(t.replace(/\./g, '').replace(',', '.'))
  else if (/^\d+\.\d{1,2}$/.test(t)) n = Number(t)
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) n = Number(t.replace(/\./g, ''))
  if (n === null || !Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

// Used games are one unit each (own price, own laudo); sealed ones are a batch.
export function normalizeCopy(c: CopyDraft): CopyDraft {
  if (c.condition === 'lacrado') {
    const { laudo: _laudo, ...rest } = c
    return { ...rest, stock: c.sold ? 0 : Math.max(1, Math.floor(c.stock || 1)) }
  }
  return { ...c, stock: c.sold ? 0 : 1, laudo: c.laudo ?? { ...LAUDO_DEFAULTS, photos: [] } }
}

export function validateGame(d: GameDraft): Record<string, string> {
  const e: Record<string, string> = {}
  if (!d.title.trim()) e.title = 'Escreva o nome do jogo'
  else if (d.title.trim().length > 120) e.title = 'Nome com até 120 letras'
  if (!d.platform || !PLATFORMS.some((p) => p.value === d.platform)) e.platform = 'Escolha a plataforma'
  if (d.coverId == null) e.coverId = 'Coloque a foto da capa'
  if (d.year.trim() && !/^(19[7-9]\d|20\d\d)$/.test(d.year.trim())) e.year = 'Ano com 4 números, como 2004'
  const live = d.copies.map((c, i) => ({ c, i })).filter(({ c }) => c.active && !c.sold)
  // A new game needs something to sell; an existing one may be fully hidden.
  if (!d.copies.length || (d.id == null && !live.length)) e.copies = 'Adicione pelo menos uma cópia'
  for (const { c, i } of live) {
    if (parsePrice(c.price) === null) e[`copies.${i}.price`] = 'Preço inválido'
  }
  return e
}

// Price as the form shows it: 189.9 → "189,90".
export const priceText = (n: number) => n.toFixed(2).replace('.', ',')

// Same rule as the "games" slug hook: title + platform, no accents.
export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

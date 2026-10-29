// Passe Checkpoint: R$ 1 paid on games = 1 XP, credited when an order is paid.

export const TIERS = [
  { n: 1, t: 'Novato', r: 'Cupom de boas-vindas', req: 0, color: '#22B04B' },
  { n: 2, t: 'Aventureiro', r: 'Frete grátis na próxima', req: 500, color: '#2D6BF0' },
  { n: 3, t: 'Explorador', r: '5% off em acessórios', req: 1000, color: '#FFC61A' },
  { n: 4, t: 'Veterano', r: 'Entra antes nos drops', req: 2000, color: '#E8322B' },
  { n: 5, t: 'Lenda', r: '10% off em tudo, sempre', req: 5000, color: '#B57BFF' },
] as const

export type Tier = (typeof TIERS)[number]

export function levelOf(xp: number) {
  const tier = [...TIERS].reverse().find((t) => xp >= t.req) ?? TIERS[0]
  const next = TIERS.find((t) => t.req > xp) ?? null
  const span = next ? next.req - tier.req : 1
  return {
    tier,
    next,
    toNext: next ? next.req - xp : 0,
    progress: next ? Math.min(1, (xp - tier.req) / span) : 1,
  }
}

// Early access to the Friday drop: 30 minutes before opening.
export const EARLY_ACCESS_MS = 30 * 60 * 1000

export type AchievementInput = {
  paidOrders: { platforms: string[]; groups: string[]; placedAt: string; dropOpenedAt: string | null }[]
  saves: number
}

export const ACHIEVEMENTS = [
  { id: 'primeira', name: 'Primeira compra', color: '#FFC61A' },
  { id: 'colecionador', name: 'Colecionador', color: '#22B04B', hint: '3 jogos da mesma plataforma' },
  { id: 'retro', name: 'Retrô raiz', color: '#5D5D66', hint: 'Um jogo retrô' },
  { id: 'saves', name: '10 saves', color: '#E8322B', hint: '10 jogos salvos' },
  { id: 'drop', name: 'Drop em 1 min', color: '#2D6BF0', hint: 'Pediu no primeiro minuto do drop' },
  { id: 'fiel', name: '5 pedidos', color: '#B57BFF', hint: '5 pedidos pagos' },
] as const

export function achievementsOf(input: AchievementInput) {
  const plats = input.paidOrders.flatMap((o) => o.platforms)
  const count = new Map<string, number>()
  for (const p of plats) count.set(p, (count.get(p) ?? 0) + 1)
  const unlocked = new Set<string>()
  if (input.paidOrders.length > 0) unlocked.add('primeira')
  if ([...count.values()].some((n) => n >= 3)) unlocked.add('colecionador')
  if (input.paidOrders.some((o) => o.groups.includes('Retrô'))) unlocked.add('retro')
  if (input.saves >= 10) unlocked.add('saves')
  if (
    input.paidOrders.some(
      (o) => o.dropOpenedAt && new Date(o.placedAt).getTime() - new Date(o.dropOpenedAt).getTime() <= 60_000,
    )
  )
    unlocked.add('drop')
  if (input.paidOrders.length >= 5) unlocked.add('fiel')
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }))
}

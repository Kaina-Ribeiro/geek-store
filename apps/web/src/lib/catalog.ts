// Shared catalog vocabulary: used by the Payload collections (admin selects)
// and by the storefront (labels, colors, filter groups).

export const PLATFORMS = [
  { value: 'ps5', label: 'PS5', group: 'PlayStation', color: '#D8D8DE' },
  { value: 'ps4', label: 'PS4', group: 'PlayStation', color: '#2D6BF0' },
  { value: 'ps2', label: 'PS2', group: 'Retrô', color: '#5B5B66' },
  { value: 'switch-2', label: 'Switch 2', group: 'Nintendo', color: '#E8322B' },
  { value: 'switch', label: 'Switch', group: 'Nintendo', color: '#E8322B' },
  { value: 'xbox-series', label: 'Xbox Series', group: 'Xbox', color: '#22B04B' },
  { value: 'xbox-one', label: 'Xbox One', group: 'Xbox', color: '#22B04B' },
  { value: 'xbox-360', label: 'Xbox 360', group: 'Retrô', color: '#22B04B' },
] as const

export type PlatformValue = (typeof PLATFORMS)[number]['value']

export const PLATFORM_GROUPS = ['PlayStation', 'Nintendo', 'Xbox', 'Retrô'] as const
export type PlatformGroup = (typeof PLATFORM_GROUPS)[number]

export const CONDITIONS = [
  { value: 'lacrado', label: 'Lacrado', color: '#2D6BF0' },
  { value: 'a', label: 'Nota A', color: '#22B04B' },
  { value: 'b', label: 'Nota B', color: '#FFC61A' },
  { value: 'disco', label: 'Só disco', color: '#E8322B' },
] as const

export type ConditionValue = (typeof CONDITIONS)[number]['value']

export const platformOf = (v: string) => PLATFORMS.find((p) => p.value === v) ?? PLATFORMS[0]
export const conditionOf = (v: string) => CONDITIONS.find((c) => c.value === v) ?? CONDITIONS[0]

// Pricing rules shown on every card: 5% off on Pix, up to 6 interest-free
// installments with a R$ 40 minimum per installment.
export const PIX_DISCOUNT = 0.05
export const pixPrice = (price: number) => Math.round(price * (1 - PIX_DISCOUNT) * 100) / 100
export const installments = (price: number) => {
  const n = Math.max(1, Math.min(6, Math.floor(price / 40)))
  return { n, value: Math.round((price / n) * 100) / 100 }
}

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ')

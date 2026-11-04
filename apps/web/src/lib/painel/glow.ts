import sharp from 'sharp'

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')

export const rgbToHex = (c: { r: number; g: number; b: number }) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase()

// Dominant colour of a cover, used for the glow behind it on the site.
export async function dominantGlow(input: Buffer | string): Promise<string> {
  const { dominant } = await sharp(input).stats()
  return rgbToHex(dominant)
}

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { dominantGlow, rgbToHex } from '../../src/lib/painel/glow'

describe('glow', () => {
  it('rgbToHex', () => expect(rgbToHex({ r: 140, g: 106, b: 43 })).toBe('#8C6A2B'))
  it('cor dominante de uma imagem lisa', async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#2D6BF0' } }).png().toBuffer()
    expect(await dominantGlow(png)).toMatch(/^#[0-9A-F]{6}$/)
  })
})

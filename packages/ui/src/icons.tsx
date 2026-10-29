import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const stroke = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  'aria-hidden': true,
  ...rest,
})

export const BagIcon = ({ size = 17, ...r }: P) => (
  <svg {...stroke(size, r)}>
    <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
    <path d="M9 7V6a3 3 0 0 1 6 0v1" />
  </svg>
)

export const SearchIcon = ({ size = 17, ...r }: P) => (
  <svg {...stroke(size, { strokeWidth: 2.2, ...r })}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const ArrowIcon = ({ size = 18, dir = 'right', ...r }: P & { dir?: 'left' | 'right' }) => (
  <svg {...stroke(size, { strokeWidth: 2.4, ...r })}>
    <path d={dir === 'right' ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 6l-6 6 6 6'} />
  </svg>
)

export const HeartIcon = ({ size = 16, filled = false, ...r }: P & { filled?: boolean }) => (
  <svg {...stroke(size, { strokeWidth: 2, fill: filled ? 'currentColor' : 'none', ...r })}>
    <path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z" />
  </svg>
)

export const HomeIcon = ({ size = 22, ...r }: P) => (
  <svg {...stroke(size, { strokeWidth: 2, ...r })}>
    <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
)

export const StoreIcon = ({ size = 22, ...r }: P) => (
  <svg {...stroke(size, { strokeWidth: 2, ...r })}>
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
    <path d="M5 12v8h14v-8M10 20v-5h4v5" />
  </svg>
)

export const UserIcon = ({ size = 22, ...r }: P) => (
  <svg {...stroke(size, { strokeWidth: 2, ...r })}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
)

export const TruckIcon = ({ size = 22, ...r }: P) => (
  <svg {...stroke(size, { strokeWidth: 2, ...r })}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
)

export const CloseIcon = ({ size = 18, ...r }: P) => (
  <svg {...stroke(size, { strokeWidth: 2.2, ...r })}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

// 9x9 pixel-art glyphs used on the trust chips (same bitmaps as the canvas).
const BITMAPS = {
  lupa: ['..1111...', '.1....1..', '1......1.', '1..11..1.', '1..11..1.', '.1....1..', '..11111..', '......11.', '.......11'],
  pix: ['....1....', '...111...', '..11.11..', '.11...11.', '11.....11', '.11...11.', '..11.11..', '...111...', '....1....'],
  truck: ['.........', '111111...', '111111.1.', '111111.11', '111111111', '111111111', '.11...11.', '.11...11.', '.........'],
  shield: ['111111111', '111111101', '111111011', '101110111', '110101111', '111011111', '.1111111.', '..11111..', '...111...'],
} as const

export type PixelGlyph = keyof typeof BITMAPS

export const PixelIcon = ({ glyph, size = 22, color = '#FFFFFF' }: { glyph: PixelGlyph; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" fill={color} aria-hidden="true">
    {BITMAPS[glyph].flatMap((row, y) =>
      [...row].map((ch, x) => (ch === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} /> : null)),
    )}
  </svg>
)

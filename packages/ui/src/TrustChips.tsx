import { PixelIcon, type PixelGlyph } from './icons'

const CHIPS: { glyph: PixelGlyph; color: string; shadow: string; title: string; detail: string }[] = [
  { glyph: 'lupa', color: '#22B04B', shadow: 'rgba(34,176,75,.55)', title: 'Laudo em cada disco', detail: 'com fotos reais' },
  { glyph: 'pix', color: '#1FA595', shadow: 'rgba(31,165,149,.55)', title: 'Pix com desconto', detail: 'ou até 6x sem juros' },
  { glyph: 'truck', color: '#2D6BF0', shadow: 'rgba(45,107,240,.55)', title: 'Frete grátis', detail: 'acima de R$ 299' },
  { glyph: 'shield', color: '#E8A800', shadow: 'rgba(232,168,0,.6)', title: 'Garantia de 90 dias', detail: '7 dias para trocar' },
]

export function TrustChips({ className = '' }: { className?: string }) {
  return (
    <ul className={`trust-row ${className}`} aria-label="Por que comprar aqui">
      {CHIPS.map((c, i) => (
        <li key={c.title} className="trust glass">
          <span
            className="trust-ic"
            style={{ background: c.color, ['--sh' as string]: c.shadow, ['--dl' as string]: `${-0.8 * i}s` }}
          >
            <PixelIcon glyph={c.glyph} />
          </span>
          <span>
            <b className="trust-t">{c.title}</b>
            <small className="trust-d">{c.detail}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

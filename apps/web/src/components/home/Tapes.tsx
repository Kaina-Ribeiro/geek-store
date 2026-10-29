const A = ['Lacrados', 'Seminovos com laudo', 'Retrô', 'Pré-venda', 'Colecionáveis']
const B = ['Testado um a um', 'Pix 5% off', 'Envio Brasil', 'Drop de sexta', 'Troca com crédito']

const Row = ({ words, reverse, dot }: { words: string[]; reverse?: boolean; dot: string }) => (
  <div className={`tape-row dsp tape-text${reverse ? ' r' : ''}`}>
    {[...words, ...words, ...words, ...words].map((w, i) => (
      <span key={i}>
        {w}
        <i style={{ background: dot }} />
      </span>
    ))}
  </div>
)

// Two crossing marquee tapes that bridge the dark hero into the light vitrine.
export function Tapes() {
  return (
    <div className="tapes" aria-hidden="true">
      <div className="tape tape-red">
        <Row words={B} reverse dot="#1A1A1E" />
      </div>
      <div className="tape tape-yellow">
        <Row words={A} dot="#141000" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main className="theme-light pdp" aria-busy="true" aria-label="Carregando o jogo">
      <div className="wrap pdp-grid">
        <div className="sk" style={{ aspectRatio: '4 / 5', borderRadius: 28 }} />
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="sk sk-line" style={{ width: 220 }} />
          <div className="sk sk-title" />
          <div className="sk" style={{ height: 160, borderRadius: 22 }} />
          <div className="sk" style={{ height: 120, borderRadius: 22 }} />
        </div>
      </div>
    </main>
  )
}

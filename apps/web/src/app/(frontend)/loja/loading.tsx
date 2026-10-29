// Skeleton while the catalog query runs (filters change the URL).
export default function Loading() {
  return (
    <main className="theme-light shop" aria-busy="true" aria-label="Carregando a loja">
      <section className="shop-band theme-dark">
        <div className="wrap">
          <div className="sk sk-line" style={{ width: 180 }} />
          <div className="sk sk-title" />
        </div>
      </section>
      <div className="wrap grid-cards sk-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="sk sk-card" />
        ))}
      </div>
    </main>
  )
}

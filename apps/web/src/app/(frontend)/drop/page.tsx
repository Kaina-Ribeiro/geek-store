import type { Metadata } from 'next'
import Link from 'next/link'

import { DropSection } from '../../../components/home/DropSection'
import { ShopCard } from '../../../components/ShopCard'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'
import { getCustomer } from '../../../lib/auth'
import { dropCards, getHomeFresh } from '../../../lib/data'
import { hasEarlyAccess, pendingDrops } from '../../../lib/drops'
import { getClient } from '../../../lib/payload'
import { levelOf } from '../../../lib/xp'

export const metadata: Metadata = {
  title: 'Drop de sexta',
  description: 'Toda sexta um lote garimpado. Quando acaba, acaba. Nível 4 entra 30 minutos antes.',
}
export const dynamic = 'force-dynamic'

export default async function DropPage() {
  const [{ drop }, customer, locks] = await Promise.all([getHomeFresh(), getCustomer(), pendingDrops()])
  if (!drop) {
    return (
      <>
        <SiteHeader />
        <main className="theme-light">
          <div className="wrap co-empty">
            <h1 className="dsp">Sem drop marcado</h1>
            <p>Siga o Instagram para saber do próximo lote.</p>
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  const xp = customer?.xp ?? 0
  const lock = locks.find((l) => l.drop.id === drop.id)
  const early = Boolean(lock && customer && hasEarlyAccess(lock, xp))
  let items = drop.items
  if (early && lock) {
    const payload = await getClient()
    items = await dropCards(await payload.findByID({ collection: 'drops', id: drop.id, depth: 0 }))
  }
  const level = levelOf(xp).tier.n

  return (
    <>
      <SiteHeader />
      <main className="theme-light">
        <DropSection drop={drop} standalone />
        <section className="wrap drop-page">
          {drop.open || early ? (
            <>
              <h2 className="dsp drop-page-title">{early ? 'Acesso antecipado liberado' : 'O drop está aberto'}</h2>
              {early && (
                <p className="acc-muted">Você é nível {level}: os jogos abaixo ainda não aparecem para o resto da loja.</p>
              )}
              {items.length ? (
                <div className="grid-cards">
                  {items.map((i) => (
                    <ShopCard key={i.id} item={i} />
                  ))}
                </div>
              ) : (
                <p className="acc-muted">Acabou! Todos os jogos deste lote já têm dono. Até a próxima sexta.</p>
              )}
            </>
          ) : (
            <div className="drop-wait">
              <h2 className="dsp drop-page-title">Os jogos aparecem aqui quando abrir</h2>
              <p className="acc-muted">
                Quem tem nível {drop.earlyLevel} ou mais vê o lote 30 minutos antes, nesta mesma página.
                {customer ? ` Você está no nível ${level}.` : ''}
              </p>
              {!customer && (
                <Link className="btn btn-solid" href="/conta?next=/drop">
                  Entrar para ver meu nível
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

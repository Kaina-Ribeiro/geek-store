import { Consoles } from '../../components/home/Consoles'
import { DropSection } from '../../components/home/DropSection'
import { Hero } from '../../components/home/Hero'
import { Laudo } from '../../components/home/Laudo'
import { Tapes } from '../../components/home/Tapes'
import { Trade } from '../../components/home/Trade'
import { Vitrine } from '../../components/home/Vitrine'
import { XpPass } from '../../components/home/XpPass'
import { SiteFooter } from '../../components/SiteFooter'
import { SiteHeader } from '../../components/SiteHeader'
import { getHome } from '../../lib/data'

// Rendered per request; getHome caches the catalog for a minute.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const home = await getHome()

  return (
    <>
      <section className="hero-wrap theme-dark">
        <SiteHeader variant="overlay" />
        <Hero featured={home.featured} strip={home.strip} total={home.total} />
      </section>
      <Tapes />
      <main>
        <Vitrine items={home.vitrine} total={home.total} groupCounts={home.groupCounts} retroMini={home.retroMini} />
        <Consoles slides={home.consoles} />
        <Laudo />
        {home.drop && <DropSection drop={home.drop} />}
        <Trade />
        <XpPass />
      </main>
      <SiteFooter />
    </>
  )
}

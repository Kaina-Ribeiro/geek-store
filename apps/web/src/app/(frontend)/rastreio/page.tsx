import type { Metadata } from 'next'

import { TrackForm } from '../../../components/account/TrackForm'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'

export const metadata: Metadata = { title: 'Rastrear pedido' }

export default function RastreioPage() {
  return (
    <>
      <SiteHeader />
      <main className="theme-light">
        <div className="wrap legal">
          <h1 className="dsp legal-title">Rastrear pedido</h1>
          <p className="acc-muted">Use o número que está no e-mail do pedido (por exemplo, #1042) e o e-mail da compra.</p>
          <TrackForm />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

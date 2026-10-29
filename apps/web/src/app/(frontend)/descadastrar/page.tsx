import type { Metadata } from 'next'

import { UnsubscribeButton } from '../../../components/account/UnsubscribeButton'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'

export const metadata: Metadata = { title: 'Descadastrar', robots: { index: false } }

type SP = Promise<Record<string, string | string[] | undefined>>

// A confirm button instead of unsubscribing on GET: e-mail scanners open links.
export default async function Descadastrar({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const id = Number(sp.i)
  const sig = typeof sp.s === 'string' ? sp.s : ''
  return (
    <>
      <SiteHeader />
      <main className="theme-light">
        <div className="wrap legal">
          <h1 className="dsp legal-title">Parar os e-mails</h1>
          <p className="acc-muted">Você deixa de receber a newsletter e os avisos de drop. Os e-mails de pedidos continuam.</p>
          <UnsubscribeButton id={id} sig={sig} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

import type { Metadata } from 'next'

import { Checkout } from '../../../components/checkout/Checkout'
import { SiteHeader } from '../../../components/SiteHeader'
import { getCustomer } from '../../../lib/auth'
import { payments, simulationEnabled } from '../../../lib/env'

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const c = await getCustomer()
  return (
    <>
      <SiteHeader />
      <main className="theme-light co">
        <Checkout
          prefill={
            c
              ? {
                  name: c.name || '',
                  email: c.email,
                  phone: c.phone || '',
                  address: {
                    cep: c.address?.cep || '',
                    street: c.address?.street || '',
                    number: c.address?.number || '',
                    complement: c.address?.complement || '',
                    district: c.address?.district || '',
                    city: c.address?.city || '',
                    uf: c.address?.uf || '',
                  },
                }
              : null
          }
          loggedIn={Boolean(c)}
          cardLive={payments.cardLive}
          simulation={simulationEnabled}
        />
      </main>
    </>
  )
}

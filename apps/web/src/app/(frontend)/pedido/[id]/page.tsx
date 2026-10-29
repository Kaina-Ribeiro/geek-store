import type { Metadata } from 'next'
import Link from 'next/link'

import { OrderLive } from '../../../../components/order/OrderLive'
import { SiteFooter } from '../../../../components/SiteFooter'
import { SiteHeader } from '../../../../components/SiteHeader'
import { getCustomer } from '../../../../lib/auth'
import { env, payments, simulationEnabled } from '../../../../lib/env'
import { authorizedOrder, refreshOrder } from '../../../../lib/orders'
import { toOrderView } from '../../../../lib/order-view'

export const metadata: Metadata = { title: 'Pedido', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>
type SP = Promise<Record<string, string | string[] | undefined>>

export default async function OrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { id } = await params
  const sp = await searchParams
  const token = typeof sp.t === 'string' ? sp.t : ''
  const customer = await getCustomer()
  const found = Number.isInteger(Number(id)) ? await authorizedOrder(Number(id), token, customer) : null

  return (
    <>
      <SiteHeader />
      <main className="theme-light ord">
        {found ? (
          <OrderLive
            initial={toOrderView(await refreshOrder(found))}
            token={token}
            cardLive={payments.cardLive}
            publicKey={env.mpPublicKey}
            simulation={simulationEnabled}
          />
        ) : (
          <div className="wrap co-empty">
            <h1 className="dsp">Pedido não encontrado</h1>
            <p>Abra pelo link do e-mail do pedido ou entre na conta usada na compra.</p>
            <Link className="btn btn-solid" href={`/conta?next=/pedido/${encodeURIComponent(id)}`}>
              Entrar na conta
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

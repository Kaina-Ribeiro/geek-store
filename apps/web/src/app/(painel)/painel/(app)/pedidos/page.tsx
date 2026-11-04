import { OrderRow } from '../../../../../components/painel/OrderRow'
import { listOrdersForPanel } from '../../../../../lib/painel/order-store'
import { requireStaff } from '../../../../../lib/painel/session'
import { getClient } from '../../../../../lib/payload'

export const metadata = { title: 'Pedidos' }

export default async function PedidosPage() {
  const user = await requireStaff()
  const orders = await listOrdersForPanel(await getClient(), user)
  return (
    <div className="pn-page pn-orders">
      <div className="pn-head">
        <span className="px pn-crumb">Início / Pedidos</span>
        <h1 className="dsp pn-h1">Pedidos</h1>
        <p className="pn-lead">Cada pedido tem um botão só: o próximo passo. O cliente recebe aviso por e-mail sozinho.</p>
      </div>
      {orders.length === 0 ? (
        <div className="pn-card pn-empty">
          <b>Nenhum pedido esperando.</b>
          <span className="pn-hint">Os pedidos pagos aparecem aqui assim que o pagamento cai.</span>
        </div>
      ) : (
        <div className="pn-ord-list">
          {orders.map((o) => (
            <OrderRow key={`${o.id}-${o.status}`} order={o} />
          ))}
        </div>
      )}
    </div>
  )
}

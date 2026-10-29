import type { Metadata } from 'next'

import { LegalPage } from '../../../components/legal/LegalPage'
import { STORE } from '../../../lib/store-info'

export const metadata: Metadata = { title: 'Frete e prazos' }

export default function Frete() {
  return (
    <LegalPage title="Frete e prazos" updated="29/10/2026">
      <h2>Para todo o Brasil</h2>
      <p>
        Enviamos por Correios (PAC e SEDEX) e transportadoras parceiras, com cotação em tempo real pelo CEP no checkout. O
        prazo mostrado conta em dias úteis a partir da postagem.
      </p>
      <h2>Quando postamos</h2>
      <p>
        Pedidos pagos até as 14h (dias úteis) são conferidos, embalados e postados no mesmo dia ou no dia útil seguinte. Você
        recebe o código de rastreio por e-mail assim que o pedido sai de Taubaté.
      </p>
      <h2>Frete grátis</h2>
      <p>
        A partir de R$ 299 em jogos (valor no Pix), o frete mais barato é grátis. Se preferir um serviço mais rápido, você paga
        só a diferença.
      </p>
      <h2>Retirada em Taubaté</h2>
      <p>
        Grátis. Escolha &quot;Retirar em Taubaté&quot; no checkout e espere o e-mail de pronto para retirar. Endereço:{' '}
        {STORE.address}. Horário: {STORE.hours}. Leve um documento com foto.
      </p>
      <h2>Embalagem</h2>
      <p>Cada jogo vai em caixa com proteção, e os usados levam a etiqueta do laudo Checkpoint.</p>
    </LegalPage>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '../../../components/legal/LegalPage'
import { STORE } from '../../../lib/store-info'

export const metadata: Metadata = { title: 'Termos de uso' }

export default function Termos() {
  return (
    <LegalPage title="Termos de uso" updated="29/10/2026">
      <p>
        Estes termos valem para compras no site da {STORE.name} ({STORE.legalName}, CNPJ {STORE.cnpj}, {STORE.address}).
      </p>
      <h2>Produtos e laudo</h2>
      <p>
        Jogos lacrados são novos, de fábrica. Jogos usados são cópias únicas: as fotos e o laudo da página são daquela cópia
        exata. A nota (A, B ou Só disco) segue o que está descrito no laudo, e todo usado é testado do boot ao save antes do
        envio.
      </p>
      <h2>Preços e pagamento</h2>
      <ul>
        <li>O preço no Pix já tem 5% de desconto. No cartão, vale o preço cheio, em até 6x sem juros (parcela mínima de R$ 40).</li>
        <li>Ao finalizar o pedido, reservamos os jogos por 30 minutos. Sem pagamento nesse prazo, o pedido expira e os jogos voltam para a loja.</li>
        <li>Se um Pix chegar depois de expirado e o jogo já tiver sido vendido, o valor é estornado automaticamente.</li>
      </ul>
      <h2>Entrega</h2>
      <p>
        Prazos e regras de frete estão em <Link href="/frete-e-prazos">Frete e prazos</Link>.
      </p>
      <h2>Trocas e devoluções</h2>
      <p>
        Veja <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>, incluindo o direito de arrependimento de 7 dias.
      </p>
      <h2>Passe Checkpoint (XP)</h2>
      <p>
        Cada R$ 1 pago em jogos vale 1 XP, creditado quando o pagamento é confirmado. Pedidos cancelados ou estornados
        perdem o XP correspondente. Os benefícios de cada nível podem mudar, com aviso no site.
      </p>
      <h2>Drop de sexta</h2>
      <p>
        Os jogos do drop ficam disponíveis no horário anunciado; clientes do nível indicado veem o lote 30 minutos antes. Cada
        cópia vai para o primeiro pedido pago.
      </p>
      <h2>Contato</h2>
      <p>
        <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
        {STORE.whatsapp ? ` · WhatsApp +${STORE.whatsapp}` : ''} · {STORE.hours}
      </p>
    </LegalPage>
  )
}

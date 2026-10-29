import type { Metadata } from 'next'

import { LegalPage } from '../../../components/legal/LegalPage'
import { STORE } from '../../../lib/store-info'

export const metadata: Metadata = { title: 'Trocas e devoluções' }

export default function Trocas() {
  return (
    <LegalPage title="Trocas e devoluções" updated="29/10/2026">
      <h2>Arrependimento: 7 dias</h2>
      <p>
        Comprou pelo site e mudou de ideia? Você tem 7 dias corridos a partir do recebimento para devolver, sem precisar
        explicar o motivo (Código de Defesa do Consumidor, art. 49). O jogo deve voltar no mesmo estado em que foi entregue;
        lacrados, com o lacre intacto. Devolvemos o valor pago, inclusive o frete, pelo mesmo meio de pagamento.
      </p>
      <h2>Garantia de 90 dias</h2>
      <p>
        Todo jogo tem 90 dias de garantia contra defeito de funcionamento. Se um disco não rodar como descrito no laudo,
        trocamos por outra cópia equivalente ou devolvemos o dinheiro, e o frete de volta é por nossa conta.
      </p>
      <h2>Como pedir</h2>
      <ol>
        <li>
          Fale com a gente por <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
          {STORE.whatsapp ? ` ou pelo WhatsApp +${STORE.whatsapp}` : ''}, com o número do pedido.
        </li>
        <li>Mandamos uma etiqueta de postagem reversa (ou combinamos a entrega na loja, em Taubaté).</li>
        <li>Conferimos o jogo e fazemos o estorno ou a troca em até 5 dias úteis depois de receber.</li>
      </ol>
      <h2>Não cobre</h2>
      <p>Riscos novos, quebra ou mau uso depois da entrega, e códigos de DLC já resgatados.</p>
    </LegalPage>
  )
}

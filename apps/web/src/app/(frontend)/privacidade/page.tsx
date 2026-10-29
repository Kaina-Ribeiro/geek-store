import type { Metadata } from 'next'

import { LegalPage } from '../../../components/legal/LegalPage'
import { STORE } from '../../../lib/store-info'

export const metadata: Metadata = { title: 'Política de privacidade' }

export default function Privacidade() {
  return (
    <LegalPage title="Privacidade" updated="29/10/2026">
      <p>
        Esta política explica quais dados a {STORE.name} ({STORE.legalName}, CNPJ {STORE.cnpj}) coleta, por que e o que
        você pode pedir, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>
      <h2>O que coletamos</h2>
      <ul>
        <li>
          <b>Para entregar seu pedido:</b> nome, e-mail, CPF, WhatsApp (opcional) e endereço. Base legal: execução do contrato
          de compra.
        </li>
        <li>
          <b>Para o pagamento:</b> o Mercado Pago processa Pix e cartão. Os dados do cartão são digitados no formulário do
          Mercado Pago e nunca passam pelos nossos servidores. Guardamos só o status e o número do pagamento.
        </li>
        <li>
          <b>Conta e passe Checkpoint:</b> e-mail, nome, XP, save slots e histórico de pedidos.
        </li>
        <li>
          <b>Newsletter e avisos de drop:</b> só o e-mail, com a data do seu consentimento. Base legal: consentimento.
        </li>
        <li>
          <b>Navegação:</b> o inventário fica salvo no seu navegador. Cookies de medição (Google Analytics e Meta Pixel) só
          carregam se você aceitar no aviso de cookies.
        </li>
      </ul>
      <h2>Com quem compartilhamos</h2>
      <p>
        Só com quem precisa para a compra acontecer: Mercado Pago (pagamento), Correios e transportadoras via Melhor Envio
        (entrega), Resend (envio de e-mails) e nossos provedores de hospedagem e banco de dados. Não vendemos dados.
      </p>
      <h2>Por quanto tempo</h2>
      <p>
        Dados de pedidos ficam guardados pelo prazo exigido pela legislação fiscal e de consumo (em geral, 5 anos). Dados de
        newsletter, até você descadastrar.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e retirar o consentimento a qualquer
        momento. Todo e-mail de newsletter tem o link para descadastrar. Para o resto, escreva para{' '}
        <a href={`mailto:${STORE.email}`}>{STORE.email}</a>. Respondemos em até 15 dias.
      </p>
      <h2>Segurança</h2>
      <p>
        O site usa conexão criptografada (HTTPS). O acesso à conta é feito por link de uso único enviado ao seu e-mail, sem
        senha. O painel da loja tem acesso restrito à equipe.
      </p>
    </LegalPage>
  )
}

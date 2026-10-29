# Checkpoint Geek

Loja de games de Taubaté-SP. Monorepo com a loja (Next.js) e o painel (Payload CMS) no mesmo app.

Planejamento completo, decisões e fases: [PLANEJAMENTO.md](PLANEJAMENTO.md).

## Estrutura

```
apps/web/              Next.js 16 + Payload 3: loja em /, painel em /admin
  src/collections/     Orders, Games, Copies (estoque), Drops, Subscribers, Media, Customers, Users (equipe)
  src/lib/             orders (checkout, estoque, pagamento), mercadopago, shipping (Melhor Envio),
                       auth (link mágico), emails, xp, drops, data (consultas da loja)
  src/app/(frontend)/  páginas da loja, server actions (actions.ts) e webhooks
  src/components/      seções da Home, checkout, pedido, conta, cards, inventário
  src/migrations/      migrações do Postgres (produção)
  src/seed/            17 jogos reais com capas para desenvolvimento
  tests/               unitários (Vitest) e ponta a ponta (Playwright)
packages/ui/           design system: tokens, ProductCard, TrustChips, ícones
prototipo/             protótipos HTML antigos (referência)
```

## Rodar local

Requisitos: Node 24.22+ e pnpm 10+.

```bash
pnpm install
```

```bash
cp apps/web/.env.example apps/web/.env
```

Gere um `PAYLOAD_SECRET` e cole no `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Popule o banco local (SQLite em `apps/web/checkpoint.db`):

```bash
pnpm seed
```

O seed cria a conta do dono e grava e-mail e senha em `apps/web/.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Ele apaga pedidos, clientes e catálogo a cada execução.

```bash
pnpm dev
```

- Loja: http://localhost:3100 (ajuste `NEXT_PUBLIC_SITE_URL` se usar outra porta)
- Painel: http://localhost:3100/admin

## Modo de simulação

Sem as chaves das integrações, tudo funciona localmente:

| Sem a chave de | Acontece |
|---|---|
| Mercado Pago | o pedido gera um Pix de teste e a página do pedido mostra botões "Simular Pix pago", "Simular cartão recusado" e "Simular expiração" |
| Melhor Envio | o frete vem de uma tabela aproximada por região (SP, Sudeste/Sul, demais) |
| Resend | os e-mails saem no log do servidor, e o link de login aparece na tela |

A simulação nunca liga em produção (`NODE_ENV=production`).

## Testes

```bash
pnpm --filter web test
```

Unitários: preço no Pix, parcelas, frete grátis, CPF, assinatura do webhook, níveis e conquistas.

```bash
pnpm smoke
```

Fluxo de compra no banco local (simulação): reserva de estoque, venda dupla, Pix, cartão recusado, expiração, pagamento atrasado e cancelamento. Cria pedidos de teste; rode `pnpm seed` depois para limpar.

```bash
pnpm e2e
```

Ponta a ponta no navegador (Playwright, com o Chrome instalado) com o servidor rodando na porta 3100.

Para testar o drop de sexta, `src/scripts/dev-drop.ts` muda o horário do drop e o XP de um cliente.

## Papéis no painel

| Papel | Pode |
|---|---|
| Dono | tudo, inclusive criar e remover pessoas da equipe e alterar dados de pagamento do pedido |
| Equipe | cadastrar jogos, cópias, laudos e drops; mudar status e rastreio dos pedidos; não apaga nem mexe na equipe |
| Cliente | entra por link no e-mail (sem senha); vê só os próprios pedidos, save slots e XP |

## Como um pedido anda

1. Checkout: o servidor relê preço e estoque, recalcula o frete e reserva as cópias por 30 minutos.
2. Pix (QR Code) ou cartão (formulário do Mercado Pago, o número do cartão nunca passa pela loja).
3. O webhook do Mercado Pago confirma: pedido vira **Pago**, o XP entra na conta, cliente e loja recebem e-mail.
4. Sem pagamento em 30 minutos, a tarefa agendada expira o pedido e devolve as cópias.
5. No painel, a equipe muda para **Enviado** com o código de rastreio (ou **Pronto para retirar**): o cliente recebe e-mail na hora.

## Produção

1. **Banco:** crie um Postgres (Neon) e use a URL `postgres://...` em `DATABASE_URL`. As migrações de `src/migrations` rodam sozinhas quando o servidor sobe. Ao mudar coleções, gere uma nova com `pnpm --filter web payload migrate:create nome`.
2. **Fotos:** bucket no Cloudflare R2 e as variáveis `S3_*`.
3. **Vercel:** projeto com raiz em `apps/web`. O `vercel.json` agenda `/webhooks/cron` a cada 5 minutos (plano Pro). Defina `CRON_SECRET`.
4. **Mercado Pago:** `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY` e, em Webhooks, a URL `https://<domínio>/webhooks/mercadopago` com o evento Pagamentos. Copie a assinatura secreta para `MP_WEBHOOK_SECRET`. Teste antes com as credenciais `TEST-`.
5. **Melhor Envio:** token da API em `MELHOR_ENVIO_TOKEN` (`MELHOR_ENVIO_SANDBOX=1` para testar).
6. **E-mail:** domínio verificado no Resend, `RESEND_API_KEY`, `EMAIL_FROM` e `STORE_NOTIFY_EMAIL`.
7. **Dados da loja:** CNPJ, razão social, endereço e WhatsApp nas variáveis `NEXT_PUBLIC_STORE_*`, que aparecem no rodapé e nas páginas legais.
8. **Métricas:** `NEXT_PUBLIC_GA_ID` e `NEXT_PUBLIC_META_PIXEL_ID`; o aviso de cookies só aparece quando eles existem.

Todas as variáveis estão comentadas em `apps/web/.env.example`.

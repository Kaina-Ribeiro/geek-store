# Checkpoint Geek

Loja de games de Taubaté-SP. Monorepo com a loja (Next.js) e o painel (Payload CMS) no mesmo app.

Planejamento completo, decisões e fases: [PLANEJAMENTO.md](PLANEJAMENTO.md).

## Estrutura

```
apps/web/            Next.js 16 + Payload 3: loja em /, painel em /admin
  src/collections/   Games, Copies (estoque), Drops, Media, Customers, Users (equipe)
  src/lib/           catalog.ts (plataformas, estados, preço Pix), data.ts (consultas)
  src/components/    seções da Home, cards, inventário, header
  src/seed/          17 jogos reais com capas para desenvolvimento
packages/ui/         design system: tokens, ProductCard, TrustChips, ícones
prototipo/           protótipos HTML antigos (referência)
```

## Rodar local

Requisitos: Node 24.22+ (ou 22.23+) e pnpm 10+.

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

Popule o banco local (SQLite em `apps/web/checkpoint.db`) com os jogos de exemplo:

```bash
pnpm seed
```

O seed cria a conta do dono e grava e-mail e senha em `apps/web/.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

```bash
pnpm dev
```

- Loja: http://localhost:3000 (ou a porta em `PORT`)
- Painel: http://localhost:3000/admin

## Papéis no painel

| Papel | Pode |
|---|---|
| Dono | tudo, inclusive criar e remover pessoas da equipe |
| Equipe | cadastrar jogos, cópias, laudos e drops; não apaga nem mexe na equipe |

## Produção (fase 6)

Trocar o adapter SQLite por `@payloadcms/db-postgres` (Neon), imagens para Cloudflare R2 e deploy na Vercel. O schema é o mesmo.

# Painel do dono — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O mestre troca o banner da home com prévia ao vivo, cadastra e edita jogos e avança pedidos em `/painel`, sem abrir o `/admin`.

**Architecture:** Novo route group `(painel)` no app Next (`apps/web`). As páginas são Server Components que leem com a Local API do Payload como o usuário logado (`overrideAccess: false`). Os formulários são Client Components que chamam server actions finas. As actions delegam para funções em `src/lib/painel/*` que recebem `(payload, user, …)`, o que permite testá-las por script. O banner vira o Global `home-hero`, lido por `getHome()` e renderizado pelo `Hero` real, o mesmo componente da prévia.

**Tech Stack:** Next 16.3 (App Router, server actions), Payload 3.92.1 + Postgres (migrações), React 19, sharp 0.35, Vitest, Playwright, CSS puro com os tokens de `site.css`.

**Spec:** `docs/superpowers/specs/2026-11-04-painel-do-dono-design.md`. Leia a spec inteira antes da Task 1. O protótipo visual está no canvas citado no topo da spec; em caso de conflito, vale a spec (§9).

## Global Constraints

- Todos os comandos rodam a partir de `apps/web` (`pnpm --filter web …` a partir da raiz). O banco de dev sobe com `pnpm db:up` (Postgres 17, porta 5434). O dev server é a config `checkpoint-web`, na porta 3100.
- `push: false`: toda mudança de schema exige `pnpm payload migrate:create <nome>`, depois `pnpm db:migrate` e `pnpm generate:types`.
- Toda leitura e gravação do painel usa `user` + `overrideAccess: false`. As regras de acesso ficam nas coleções (`staffOnly`), e o painel não cria regras paralelas.
- Toda server action devolve `{ ok: true, … } | { ok: false, error: string, fields?: Record<string, string> }`, com mensagens em português simples. Nunca mostra stack nem código.
- Não aparecem para o usuário as palavras "slug", "collection", "global", "draft" nem "ID".
- Limites (spec §4.1): título 60 · frase 220 · botão 24 · texto da campanha 40 · até 8 slides · imagem até 8 MB (jpeg/png/webp).
- Status do pedido mudado pelo painel usa `payload.update` com `user` e **sem** `context: ORDER_MOVE`. Nunca chamar `lib/order-moves.ts` direto.
- Mudança de status dentro de `lib/` sempre passa `req` para os hooks quando houver transação (memória do projeto: hook sem o `req` da transação trava a linha).
- Datas exibidas no fuso `STORE_TZ` (`lib/catalog.ts`).
- Entrada só com transform/opacity. Hover, press e transição em todo botão (padrão do protótipo).
- Cada tela funciona em 375, 768, 1024 e 1440 px, sem rolagem horizontal.
- Commits pequenos, por task, na branch `feat/painel-do-dono`. Nada de push sem pedir.

## Review Focus

1. **`?volta=` no login apontando para fora** (`//evil.com`, `https://…`, `/\evil`): o login deve sempre cair em `/painel…`. → teste em Task 3.
2. **Preço digitado de jeitos diferentes** ("R$ 189,90", "189.90", "1.189,90", " 89 ", "", "0", "-5", "abc"): só os válidos viram número, e vazio, zero, negativo ou lixo mostram "Preço inválido". → teste em Task 6.
3. **Slide apontando para um jogo apagado ou esgotado:** a home não quebra e pula o slide; o painel mostra "Sem estoque: não aparece no site". → testes em Task 2 e Task 5.
4. **Rascunho velho no navegador** (outra pessoa publicou depois, ou o rascunho é de ontem): ao publicar, o servidor recusa com `stale`, e o painel pergunta "O banner mudou desde que você começou. Usar o que está no site ou publicar o seu por cima?". → teste em Task 5.
5. **Foto do celular** (HEIC, PDF renomeado, arquivo de 20 MB): a mensagem é clara ("Use uma foto JPG, PNG ou WebP" / "Foto grande demais (máx. 8 MB)") e nada é gravado. → teste em Task 5.

---

### Task 1: Global `home-hero`, migração e `glow` automático

**Files:**
- Create: `src/globals/HomeHero.ts`
- Create: `src/lib/painel/hero.ts` (só lógica pura, sem `server-only`)
- Create: `src/lib/painel/glow.ts`
- Create: `src/migrations/<timestamp>_home_hero.ts` (gerado e depois editado)
- Modify: `src/payload.config.ts:84` (`globals: [HomeHero]`)
- Modify: `src/collections/Games.ts:61-67` (remove `featured`; `defaultColumns` sem `featured`; hook `beforeChange` de `glow`)
- Test: `tests/unit/painel-hero.test.ts`, `tests/unit/painel-glow.test.ts`

**Interfaces:**
- Produces (em `lib/painel/hero.ts`):
  - `type HeroSlideInput = { kind: 'game' | 'campaign'; game?: number | null; campaignTitle?: string | null; campaignImage?: number | null; campaignLink?: string | null; visible: boolean }`
  - `type HeroDraft = { title: string; subtitle: string; ctaLabel: string; slides: HeroSlideInput[] }`
  - `const HERO_LIMITS = { title: 60, subtitle: 220, ctaLabel: 24, campaignTitle: 40, slides: 8 } as const`
  - `const HERO_DEFAULTS: Omit<HeroDraft, 'slides'>`: os textos fixos de hoje em `components/home/Hero.tsx:53-63`, com título `'Continue\nde onde você\nparou.'`, subtítulo sem as tags `<b>` e `ctaLabel: 'Abrir a loja'`.
  - `featuredToSlides(games: { id: number; updatedAt: string }[]): HeroSlideInput[]`: `updatedAt` mais recente primeiro, `kind: 'game'`, `visible: true`, no máximo 8.
- Produces (em `lib/painel/glow.ts`): `rgbToHex(c: { r: number; g: number; b: number }): string` (`#RRGGBB`, maiúsculo) e `dominantGlow(input: Buffer | string): Promise<string>` (via `sharp(input).stats()` → `dominant`).
- Produces: Global slug `'home-hero'` com os campos da spec §4.1. Os nomes dos campos são exatamente `title`, `subtitle`, `ctaLabel`, `slides[].kind|game|campaignTitle|campaignImage|campaignLink|visible`.

- [ ] **Step 1: Criar a branch**
  Run: `git switch -c feat/painel-do-dono` (se ainda não existir).

- [ ] **Step 2: Escrever os testes que falham**

```ts
// tests/unit/painel-hero.test.ts
import { describe, expect, it } from 'vitest'
import { featuredToSlides, HERO_DEFAULTS, HERO_LIMITS } from '../../src/lib/painel/hero'

describe('featuredToSlides', () => {
  it('ordena do mais recente e marca visível', () => {
    expect(featuredToSlides([{ id: 1, updatedAt: '2026-10-01' }, { id: 2, updatedAt: '2026-11-01' }]))
      .toEqual([{ kind: 'game', game: 2, visible: true }, { kind: 'game', game: 1, visible: true }])
  })
  it('limita a 8', () => {
    const g = Array.from({ length: 12 }, (_, i) => ({ id: i, updatedAt: `2026-10-${10 + i}` }))
    expect(featuredToSlides(g)).toHaveLength(HERO_LIMITS.slides)
  })
  it('defaults cabem nos limites', () => {
    expect(HERO_DEFAULTS.title.length).toBeLessThanOrEqual(HERO_LIMITS.title)
    expect(HERO_DEFAULTS.subtitle.length).toBeLessThanOrEqual(HERO_LIMITS.subtitle)
  })
})
```

```ts
// tests/unit/painel-glow.test.ts
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { dominantGlow, rgbToHex } from '../../src/lib/painel/glow'

describe('glow', () => {
  it('rgbToHex', () => expect(rgbToHex({ r: 140, g: 106, b: 43 })).toBe('#8C6A2B'))
  it('cor dominante de uma imagem lisa', async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#2D6BF0' } }).png().toBuffer()
    expect(await dominantGlow(png)).toMatch(/^#[0-9A-F]{6}$/)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**
  Run: `pnpm test -- painel-`. Esperado: FAIL ("Cannot find module …/lib/painel/hero").

- [ ] **Step 4: Implementar `lib/painel/hero.ts` e `lib/painel/glow.ts`** com as assinaturas acima.

- [ ] **Step 5: Rodar e ver passar**
  Run: `pnpm test -- painel-`. Esperado: PASS (5 testes).

- [ ] **Step 6: Criar o Global e o hook de `glow`**
  - `HomeHero`:
    - `access: { read: anyone, update: staffOnly }`, `versions: { max: 20 }`, `label: 'Banner da home'`;
    - `validate` por campo com os `HERO_LIMITS`;
    - `slides`: `maxRows: 8`;
    - `game` com `admin.condition` para `kind === 'game'`; campos da campanha com condição para `campaign`;
    - `campaignLink` com `defaultValue: '/loja'` e `validate` que só aceita valor começando com `/` e sem `//`.
  - Hook em `Games`: se `!data.glow && data.cover`, busca o media (`req.payload.findByID`, com `req`) e grava `dominantGlow(<arquivo local ou URL baixada>)`. Se falhar, deixa vazio e loga, sem bloquear o salvamento.

- [ ] **Step 7: Gerar e editar a migração**
  Run: `pnpm payload migrate:create home_hero`. No `up`, depois do SQL gerado, adicione o bloco de dados:
  - lê `SELECT id, updated_at FROM games WHERE featured = true` **antes** do `DROP COLUMN` (reordene o SQL gerado se preciso);
  - grava o Global com `payload.updateGlobal({ slug: 'home-hero', data: { ...HERO_DEFAULTS, slides: featuredToSlides(rows) }, req })`.
  - No `down`, recria a coluna `featured` e marca `true` nos jogos dos slides de tipo `game`.

- [ ] **Step 8: Aplicar e conferir**
  Run: `pnpm db:migrate && pnpm generate:types && pnpm typecheck`. Esperado: migração aplicada, `payload-types.ts` com `HomeHero`, typecheck com erros **apenas** em `lib/data.ts` (uso de `featured`), que a Task 2 resolve.

- [ ] **Step 9: Commit**
  `git add src/globals src/lib/painel src/migrations src/payload.config.ts src/collections/Games.ts src/payload-types.ts tests/unit/painel-*.test.ts` → `git commit -m "Banner da home vira Global (home-hero) e glow automático"`

---

### Task 2: A home lê o Global e o `Hero` ganha título livre e campanha

**Files:**
- Modify: `src/lib/painel/hero.ts` (adiciona `titleLines`, `resolveHeroSlides`, `isInternalPath`, `HeroSlideView`)
- Modify: `src/lib/data.ts:135-161,200-205` (sai `featured`, entra `hero`)
- Modify: `src/components/home/Hero.tsx`
- Modify: `src/app/(frontend)/page.tsx:23`
- Modify: `src/app/(frontend)/site.css` (classes `.hero-camp*`; `.hero-grid.solo` para quando não houver slides)
- Modify: `src/seed/index.ts` (o seed grava o Global: `HERO_DEFAULTS` + 3 slides de jogo e 1 campanha sem imagem)
- Test: `tests/unit/painel-hero.test.ts` (novos `describe`)

**Interfaces:**
- Consumes: `HeroSlideInput`, `HERO_DEFAULTS` (Task 1); `Featured`, `Img` de `lib/data.ts` (com `import type`).
- Produces:
  - `titleLines(title: string): string[]`: corta nas quebras de linha, faz trim em cada linha, descarta linhas vazias, máximo de 4.
  - `isInternalPath(s: string): boolean`: `true` só para `/x…`; falso para `//…`, `/\…`, `http…` e vazio.
  - `type HeroSlideView = { kind: 'game'; item: Featured } | { kind: 'campaign'; title: string; image: Img | null; href: string }`
  - `resolveHeroSlides(slides: HeroSlideInput[], featuredByGame: Map<number, Featured>, imageById: Map<number, Img>): HeroSlideView[]`: só os visíveis; jogo ausente do mapa (apagado ou sem estoque) é pulado; `href` inválido vira `/loja`.
  - `getHome()` passa a devolver `hero: { title: string; subtitle: string; ctaLabel: string; slides: HeroSlideView[] }` no lugar de `featured`.
  - `Hero` props: `{ title: string; subtitle: string; ctaLabel: string; slides: HeroSlideView[]; strip: Img[]; total: number; preview?: boolean }`. Com `preview`, o componente não usa `priority` nas imagens e não liga o carrinho (o botão "+ Adicionar" fica inerte).

- [ ] **Step 1: Testes que falham**

```ts
describe('titleLines', () => {
  it('quebra e limpa', () => expect(titleLines(' Continue \n\n de onde você\nparou. ')).toEqual(['Continue', 'de onde você', 'parou.']))
  it('máx 4 linhas', () => expect(titleLines('a\nb\nc\nd\ne')).toHaveLength(4))
})
describe('isInternalPath', () => {
  it.each(['/loja', '/loja?plataforma=ps2', '/drop'])('aceita %s', (p) => expect(isInternalPath(p)).toBe(true))
  it.each(['', 'loja', '//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)'])('recusa %s', (p) => expect(isInternalPath(p)).toBe(false))
})
describe('resolveHeroSlides', () => {
  const f = { id: 10, gameId: 1 } as unknown as Featured
  it('pula escondido, apagado e sem estoque', () => {
    const out = resolveHeroSlides(
      [{ kind: 'game', game: 1, visible: true }, { kind: 'game', game: 2, visible: true }, { kind: 'game', game: 1, visible: false }, { kind: 'game', game: null, visible: true }],
      new Map([[1, f]]), new Map())
    expect(out).toEqual([{ kind: 'game', item: f }])
  })
  it('campanha sem imagem e link ruim', () => {
    expect(resolveHeroSlides([{ kind: 'campaign', campaignTitle: 'Natal', campaignLink: '//x', visible: true }], new Map(), new Map()))
      .toEqual([{ kind: 'campaign', title: 'Natal', image: null, href: '/loja' }])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.** `pnpm test -- painel-hero`. Esperado: FAIL nas funções novas.
- [ ] **Step 3: Implementar as funções puras.** Rodar e ver passar.
- [ ] **Step 4: `getHome` lê o Global**
  `p.findGlobal({ slug: 'home-hero', depth: 1 })`. O mapa `featuredByGame` usa a mesma regra de hoje (melhor cópia por jogo, `large: img(g.cover, 'large')`), só para os ids dos slides.
- [ ] **Step 5: `Hero` novo**
  - Título: `titleLines(title)`, uma linha por `<br/>`, e a última dentro de `<span className="hero-under">`. O caret piscando continua no fim.
  - Card da direita:
    - slide `game` → card atual;
    - slide `campaign` → `.hero-camp` (imagem `object-fit: cover` ou a arte padrão do protótipo: gradiente `#E8322B → #FF7A1A → #FFC61A` com o pixel `repeating-conic-gradient`, o título em `.dsp` e o botão "Ver ofertas →" com o `href`);
    - sem slides → `.hero-grid.solo`, e o texto ocupa a largura.
  - As setas e o contador `01 / 03` usam `slides.length`.
- [ ] **Step 6: Seed.** Grave o Global no fim do seed e confira com `pnpm seed`.
- [ ] **Step 7: Conferir de verdade**
  Run: `pnpm typecheck && pnpm test`. Esperado: verde.
  Depois, no navegador do app (`checkpoint-web`, porta 3100), faça prints da home em 375, 768, 1024 e 1440, comparados com a home de antes (mesmo título e mesmos jogos) e com a campanha. Sem corte de texto nem rolagem horizontal.
- [ ] **Step 8: Commit.** `git commit -m "Home lê o banner do painel: título livre, slides de jogo e campanha"`

---

### Task 3: Casca do painel e login

**Files:**
- Create: `src/app/fonts.ts` (move as 4 `next/font` de `app/(frontend)/layout.tsx:14-17`, que passa a importar daqui)
- Create: `src/app/(painel)/layout.tsx` (root layout próprio: `<html lang="pt-BR">`, fontes, `painel.css`, `robots: { index: false }`)
- Create: `src/app/(painel)/painel.css`
- Create: `src/app/(painel)/painel/(app)/layout.tsx` (guarda de login + topo + menu lateral ou abas de baixo)
- Create: `src/app/(painel)/painel/entrar/page.tsx` + `src/components/painel/LoginForm.tsx`
- Create: `src/app/(painel)/painel/actions.ts` (`loginAction`, `logoutAction`)
- Create: `src/lib/painel/session.ts`
- Create: `src/components/painel/Shell.tsx` (topo, `NavLink`s, cartão de ajuda)
- Modify: `src/lib/painel/hero.ts`, ou crie `src/lib/painel/paths.ts`, com `safeReturn`
- Modify: `src/seed/index.ts` (cria o usuário `equipe` com `SEED_STAFF_EMAIL` e `SEED_STAFF_PASSWORD` em `.env`, mesmo padrão de `ownerCredentials()`)
- Test: `tests/unit/painel-paths.test.ts`

**Interfaces:**
- Produces:
  - `safeReturn(volta: string | null | undefined): string`: devolve `volta` só se `isInternalPath(volta)` **e** começar com `/painel`; senão `/painel`.
  - `getStaffUser(): Promise<User | null>`: `payload.auth({ headers: await headers() })` e só aceita `user.collection === 'users'`.
  - `requireStaff(): Promise<User>`: sem usuário, `redirect('/painel/entrar?volta=' + encodeURIComponent(<path atual>))`. O path vem do header `x-pathname`, gravado por um `src/proxy.ts` novo (o projeto ainda não tem; no Next 16 o `middleware.ts` se chama `proxy.ts`), com `matcher: ['/painel/:path*']` e fallback para `/painel`.
  - `loginAction(prev: LoginState, form: FormData): Promise<LoginState>`, onde `type LoginState = { ok: boolean; error?: string }`:
    - `limited('login')` vem primeiro;
    - depois `payload.login({ collection: 'users', data: { email, password } })`;
    - grava o cookie `${payload.config.cookiePrefix}-token` (httpOnly, `sameSite: 'lax'`, `secure` em produção, `path: '/'`, `expires` = `exp`);
    - `redirect(safeReturn(form.get('volta')))`;
    - erro de credencial → `"E-mail ou senha errados."`; conta bloqueada → `"Muitas tentativas. Espere 15 minutos."`
  - `logoutAction(): Promise<void>` apaga o cookie e manda para `/painel/entrar`.
  - `Shell` props: `{ user: { name: string }; pending: number; children: ReactNode }`. O item ativo vem de `usePathname()`.

- [ ] **Step 1: Teste que falha**

```ts
import { safeReturn } from '../../src/lib/painel/paths'
it.each([
  [undefined, '/painel'], ['/painel/banner', '/painel/banner'], ['/loja', '/painel'],
  ['//evil.com', '/painel'], ['/\\evil.com', '/painel'], ['https://evil.com/painel', '/painel'], ['/painelx', '/painel'],
])('safeReturn(%s) = %s', (v, out) => expect(safeReturn(v as string)).toBe(out))
```
  (`/painelx` recusa: aceite só `/painel` exato ou `/painel/…`.)

- [ ] **Step 2: Ver falhar → implementar → ver passar.** `pnpm test -- painel-paths`.
- [ ] **Step 3: Layouts, login e casca**
  - Visual do protótipo: topo escuro com listra de 4 cores, menu lateral de 240 px.
  - Abaixo de 768 px, o menu vira abas fixas embaixo, com ícone e rótulo, e alvos de pelo menos 44 px.
  - O cartão "Travou em alguma coisa?" só aparece com `PAINEL_HELP_WHATSAPP` definido (`https://wa.me/<número>`).
  - "Esqueci a senha" leva ao fluxo nativo do Payload: `/admin/forgot`.
- [ ] **Step 4: Conferir de verdade**
  `pnpm seed` (cria dono e equipe). No navegador do app:
  - `/painel` sem login vai para `/painel/entrar?volta=%2Fpainel`;
  - login com a conta **equipe** do `.env` entra;
  - senha errada mostra a mensagem;
  - "Sair" volta para o login.
  - Prints do login e da casca em 375 e 1440.
- [ ] **Step 5: `pnpm typecheck && pnpm lint && pnpm test`.** Esperado: verde.
- [ ] **Step 6: Commit.** `git commit -m "Painel: casca, login e saída"`

---

### Task 4: Início

**Files:**
- Create: `src/app/(painel)/painel/(app)/page.tsx`
- Create: `src/lib/painel/summary.ts`

**Interfaces:**
- Consumes: `requireStaff()` (Task 3).
- Produces: `panelSummary(payload: Payload, user: User): Promise<{ pendingOrders: number; gamesInStock: number; visibleSlides: number }>`:
  - `pendingOrders` = pedidos com `status in ['pago', 'pronto']`;
  - `gamesInStock` = jogos com pelo menos uma cópia `active` e `stock > 0`;
  - `visibleSlides` = slides `visible` do Global.
  - Usado também pelo `(app)/layout.tsx` para o selo de Pedidos.

- [ ] **Step 1: Página igual ao protótipo** ("Olá, {primeiro nome}", 3 cartões grandes com hover e press, 3 números). Saudação por hora em `STORE_TZ`: "Bom dia" até 12h, "Boa tarde" até 18h, "Boa noite" depois.
- [ ] **Step 2: Conferir.** Com o seed, os números batem com `pnpm payload` → contagem manual no `/admin`. Prints em 375, 768, 1024 e 1440, lado a lado com o quadro "Painel · 1 Início".
- [ ] **Step 3: Commit.** `git commit -m "Painel: tela de início"`

---

### Task 5: Banner da home (editor, prévia ao vivo e publicar)

**Files:**
- Create: `src/app/(painel)/painel/(app)/banner/page.tsx`
- Create: `src/components/painel/HeroEditor.tsx` (client: slides, textos, rascunho)
- Create: `src/components/painel/LivePreview.tsx` (client: moldura, Computador/Celular, `zoom`)
- Create: `src/components/painel/PublishBar.tsx`, `ImageDrop.tsx`, `GamePicker.tsx`
- Create: `src/lib/painel/hero-store.ts`, `src/lib/painel/media.ts`
- Modify: `src/lib/painel/hero.ts` (`validateHero`)
- Modify: `src/app/(painel)/painel/actions.ts` (`publishHeroAction`, `uploadImageAction`)
- Create: `src/scripts/smoke-painel.ts` + script `"smoke:painel"` em `package.json` (mesmo formato de `smoke`)
- Test: `tests/unit/painel-hero.test.ts`, `src/scripts/smoke-painel.ts`

**Interfaces:**
- Consumes: `HeroDraft`, `HERO_LIMITS`, `resolveHeroSlides`, `HeroSlideView` (Tasks 1 e 2); `Hero` com `preview` (Task 2); `requireStaff` (Task 3).
- Produces:
  - `validateHero(d: HeroDraft): Record<string, string>`: chaves `title`, `subtitle`, `ctaLabel`, `slides.<i>.game`, `slides.<i>.campaignTitle`, `slides.<i>.campaignLink`, `slides`. Mensagens: "Escreva um título", "Título com até 60 letras", "A campanha precisa de um texto", "Escolha um jogo", "No máximo 8 slides".
  - `loadHero(payload: Payload, user: User): Promise<{ draft: HeroDraft; updatedAt: string; preview: { featuredByGame: Record<number, Featured>; images: Record<number, Img> } }>`.
  - `publishHero(payload, user, draft: HeroDraft, basedOn: string, force = false): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string; fields?: Record<string, string>; stale?: true }>`:
    - valida;
    - se `!force` e o `updatedAt` atual ≠ `basedOn`, devolve `stale`;
    - `updateGlobal` com `user` e `overrideAccess: false`;
    - `revalidatePath('/', 'layout')` dentro de `try` (fora de request não faz nada, igual a `lib/orders.ts:55`).
  - `saveImage(payload, user, file: File, alt: string): Promise<{ ok: true; id: number; url: string } | { ok: false; error: string }>`: tipos `image/jpeg|png|webp`, até 8 MB, e confere o tipo real com `sharp(buffer).metadata().format` (não confia na extensão).
  - `publishHeroAction(draft, basedOn, force?)`, `uploadImageAction(form: FormData)` (campos `file`, `alt`).
  - `GamePicker` busca na server action `searchGamesAction(q: string): Promise<{ id: number; title: string; platform: string; cover: Img; inStock: boolean }[]>` (máx. 24, só com estoque).
  - Rascunho no `localStorage`: chave `painel:hero:<userId>`, valor `{ draft, basedOn, savedAt }`. Na carga, se existir rascunho e `basedOn` ≠ `updatedAt` do servidor, mostra o aviso da Review Focus #4.
- `LivePreview`:
  - moldura de 1100 px (Computador) ou 390 px (Celular);
  - `zoom = min(1, larguraDisponível / moldura)` medido por `ResizeObserver`;
  - conteúdo com `inert`;
  - recebe `HeroSlideView[]` montado no cliente com `resolveHeroSlides(draft.slides, mapas de loadHero)` e mostra **apenas o slide selecionado** (passe `slides=[selecionado]` quando ele estiver visível; quando estiver escondido, mostre com o selo "Escondido").

- [ ] **Step 1: Testes unitários que falham**

```ts
describe('validateHero', () => {
  const ok: HeroDraft = { title: 'Oi', subtitle: '', ctaLabel: 'Abrir a loja', slides: [] }
  it('aceita o mínimo', () => expect(validateHero(ok)).toEqual({}))
  it('título vazio ou só espaços', () => expect(validateHero({ ...ok, title: '  \n ' }).title).toBe('Escreva um título'))
  it('título longo', () => expect(validateHero({ ...ok, title: 'x'.repeat(61) }).title).toBe('Título com até 60 letras'))
  it('campanha sem texto', () => expect(validateHero({ ...ok, slides: [{ kind: 'campaign', campaignTitle: '', visible: true }] })['slides.0.campaignTitle']).toBe('A campanha precisa de um texto'))
  it('jogo sem jogo', () => expect(validateHero({ ...ok, slides: [{ kind: 'game', game: null, visible: true }] })['slides.0.game']).toBe('Escolha um jogo'))
  it('link externo', () => expect(validateHero({ ...ok, slides: [{ kind: 'campaign', campaignTitle: 'a', campaignLink: 'https://x', visible: true }] })['slides.0.campaignLink']).toBeTruthy())
  it('9 slides', () => expect(validateHero({ ...ok, slides: Array(9).fill({ kind: 'game', game: 1, visible: true }) }).slides).toBe('No máximo 8 slides'))
})
```

- [ ] **Step 2: Ver falhar → implementar `validateHero` → ver passar.**
- [ ] **Step 3: Smoke de servidor que falha** (`src/scripts/smoke-painel.ts`, parte "Banner"), usando os usuários `dono` e `equipe` do banco:
  - `publishHero(payload, equipe, draft, atual.updatedAt)` → `ok`, e `findGlobal` devolve o título novo;
  - de novo com o `basedOn` antigo → `{ ok: false, stale: true }`; com `force` → `ok`;
  - visitante (`user: null`) → `ok: false` (Payload recusa) e o Global não muda;
  - `saveImage` com um buffer PNG de 1×1 → `ok`; com `Buffer.from('%PDF-1.4')` nomeado `foto.jpg` → "Use uma foto JPG, PNG ou WebP"; com 9 MB → "Foto grande demais (máx. 8 MB)";
  - no fim, restaura o Global original.
  Run: `pnpm smoke:painel`. Esperado: FAIL (módulos ausentes).
- [ ] **Step 4: Implementar `hero-store.ts`, `media.ts` e as actions.** Rodar `pnpm smoke:painel` → todos os `✓`.
- [ ] **Step 5: UI do editor igual ao quadro "Painel · 2 Banner da home"**, com os ajustes da spec §5.2:
  - destino da campanha como lista;
  - contador de letras;
  - confirmação ao apagar;
  - aviso "Sem estoque: não aparece no site";
  - abaixo de 768 px, a prévia fica atrás do botão "Ver prévia";
  - falha de rede ou de servidor ao publicar → toast vermelho "Não deu para publicar. Seu rascunho está guardado, tente de novo." (spec §7), sem perder o rascunho;
  - `ok: false` com `error` de sessão → vai para o login com `?volta=/painel/banner`.
- [ ] **Step 6: Conferir de verdade** (navegador do app, logado como equipe):
  - mudar título → a prévia muda na hora;
  - Publicar → `/` mostra o título novo;
  - "Voltar como estava" → volta ao publicado;
  - recarregar no meio da edição → o rascunho continua;
  - 2 abas: publicar numa e depois publicar na outra → aparece o aviso de `stale`.
  - Prints em 375, 768, 1024 e 1440, lado a lado com o protótipo.
- [ ] **Step 7: `pnpm typecheck && pnpm lint && pnpm test`.** Esperado: verde.
- [ ] **Step 8: Commit.** `git commit -m "Painel: banner da home com prévia ao vivo"`

---

### Task 6: Jogos — lista, adicionar e editar

**Files:**
- Create: `src/app/(painel)/painel/(app)/jogos/page.tsx`, `jogos/novo/page.tsx`, `jogos/[id]/page.tsx`
- Create: `src/components/painel/GameForm.tsx`, `CopyRow.tsx`, `Stepper.tsx`, `Switch.tsx`
- Create: `src/lib/painel/game-form.ts` (puro), `src/lib/painel/game-store.ts`
- Modify: `src/app/(painel)/painel/actions.ts` (`saveGameAction`)
- Modify: `src/scripts/smoke-painel.ts` (parte "Jogos")
- Test: `tests/unit/painel-game-form.test.ts`

**Interfaces:**
- Consumes: `PLATFORMS`, `CONDITIONS`, `pixPrice`, `brl` (`lib/catalog.ts`); `saveImage` / `uploadImageAction` (Task 5); `HeroSlideInput` (Task 1).
- Produces (em `game-form.ts`):
  - `parsePrice(s: string): number | null`: aceita "189,90", "R$ 189,90", "1.189,90", "189.90", " 89 "; devolve `null` para vazio, zero, negativo, lixo e mais de 2 casas decimais.
  - `type CopyDraft = { id?: number; condition: ConditionValue; price: string; stock: number; active: boolean; sold?: boolean; laudo?: { boot: boolean; capa: boolean; manual: boolean; higienizado: boolean; surface: string; testedOn: string; photos: number[] } }`
  - `type GameDraft = { id?: number; title: string; platform: PlatformValue | ''; coverId: number | null; year: string; ageRating: string; genre: string; description: string; showInHero: boolean; copies: CopyDraft[] }`
  - `normalizeCopy(c: CopyDraft): CopyDraft`: condição ≠ `lacrado` → `stock` = 1 (ou 0 se `sold`), e o `laudo` recebe os padrões da coleção (`boot: true, capa: true, manual: false, higienizado: true`); `lacrado` → sem `laudo`, `stock` ≥ 1.
  - `validateGame(d: GameDraft): Record<string, string>`: chaves `title`, `platform`, `coverId`, `copies`, `copies.<i>.price`. Mensagens: "Escreva o nome do jogo", "Escolha a plataforma", "Coloque a foto da capa", "Adicione pelo menos uma cópia", "Preço inválido".
- Produces (em `game-store.ts`):
  - `saveGame(payload, user, draft: GameDraft): Promise<{ ok: true; id: number } | { ok: false; error: string; fields?: Record<string, string>; existingId?: number }>`:
    - uma transação (`const tx = await payload.db.beginTransaction()`, `req = { transactionID: tx, user, payload }` em todas as chamadas, `commitTransaction` / `rollbackTransaction`);
    - cria ou atualiza o jogo, cria ou atualiza as cópias;
    - cópia removida da lista → `active: false`, nunca delete;
    - `showInHero` adiciona `{ kind: 'game', game: id, visible: true }` no fim dos slides (se ainda não estiver lá) ou remove os slides desse jogo;
    - `slug` duplicado → `{ ok: false, error: 'Esse jogo já existe no <Plataforma>. Abrir ele?', existingId }`;
    - no fim, `revalidatePath('/', 'layout')` em `try`.
  - `listGamesForPanel(payload, user, q?: string): Promise<{ id: number; title: string; platform: string; cover: Img; minPrice: number | null; state: 'ok' | 'esgotado' | 'escondido' }[]>`.
  - `loadGameDraft(payload, user, id: number): Promise<GameDraft | null>`.

- [ ] **Step 1: Testes unitários que falham**

```ts
describe('parsePrice', () => {
  it.each([['189,90', 189.9], ['R$ 189,90', 189.9], ['1.189,90', 1189.9], ['189.90', 189.9], [' 89 ', 89]])('%s → %s', (s, n) => expect(parsePrice(s)).toBe(n))
  it.each(['', '0', '0,00', '-5', 'abc', '12,345', '1.1.1'])('%s → null', (s) => expect(parsePrice(s)).toBeNull())
})
describe('normalizeCopy', () => {
  it('usado vira 1 com laudo padrão', () => {
    const c = normalizeCopy({ condition: 'b', price: '10', stock: 3, active: true })
    expect(c.stock).toBe(1); expect(c.laudo).toMatchObject({ boot: true, capa: true, manual: false, higienizado: true })
  })
  it('lacrado mantém quantidade e não tem laudo', () => {
    const c = normalizeCopy({ condition: 'lacrado', price: '10', stock: 3, active: true })
    expect(c.stock).toBe(3); expect(c.laudo).toBeUndefined()
  })
})
describe('validateGame', () => {
  it('preço ruim aponta a cópia', () => expect(validateGame({ ...base, copies: [{ condition: 'lacrado', price: 'abc', stock: 1, active: true }] })['copies.0.price']).toBe('Preço inválido'))
  it('sem cópias', () => expect(validateGame({ ...base, copies: [] }).copies).toBe('Adicione pelo menos uma cópia'))
})
```
  (Valores reais de `CONDITIONS`, em `lib/catalog.ts:20`: `'lacrado' | 'a' | 'b' | 'disco'`. `base` é um `GameDraft` válido com título, `platform: 'ps2'` (confira em `PLATFORMS`) e `coverId: 1`.)

- [ ] **Step 2: Ver falhar → implementar `game-form.ts` → ver passar.**
- [ ] **Step 3: Smoke "Jogos" que falha:**
  - `saveGame(equipe, novo jogo com 1 lacrado ×2 + 1 Nota B)` → `ok`; o banco tem 1 jogo e 2 cópias (`stock` 2 e 1); `showInHero` coloca o slide;
  - salvar de novo com uma cópia removida → essa cópia fica `active: false`;
  - jogo duplicado (mesmo título e plataforma) → `existingId`;
  - **rollback:** força erro na 2ª cópia (`condition: 'invalida'`) → `ok: false`, e nem o jogo nem a 1ª cópia ficam no banco;
  - limpeza no fim.
  Run: `pnpm smoke:painel`. Esperado: FAIL.
- [ ] **Step 4: Implementar `game-store.ts` e `saveGameAction`.** `pnpm smoke:painel` → todos os `✓`.
- [ ] **Step 5: UI igual ao quadro "Painel · 3 Adicionar jogo"**, com os ajustes da spec §5.4:
  - quantidade só no Lacrado;
  - laudo na cópia usada;
  - "Mais detalhes (opcional)";
  - selo "Vendida";
  - "Esconder da loja" na edição;
  - prévia com `ShopCard` real (`toCard`, no modo inerte).
  - Lista `/painel/jogos` com busca e selos "Esgotado" / "Escondido".
- [ ] **Step 6: Conferir de verdade:**
  - cadastrar pelo navegador um jogo com foto (arquivo de `src/seed/covers`), 1 lacrado ×2 e 1 Nota B → aparece em `/loja` e na página do jogo com o laudo;
  - editar o preço → `/loja` atualiza;
  - ligar "Mostrar no banner" → o slide aparece na tela do Banner.
  - Prints em 375, 768, 1024 e 1440.
- [ ] **Step 7: `pnpm typecheck && pnpm lint && pnpm test`.** Esperado: verde.
- [ ] **Step 8: Commit.** `git commit -m "Painel: lista, cadastro e edição de jogos"`

---

### Task 7: Pedidos

**Files:**
- Create: `src/app/(painel)/painel/(app)/pedidos/page.tsx`, `src/components/painel/OrderRow.tsx`
- Create: `src/lib/painel/order-panel.ts` (puro: `nextMove`), `src/lib/painel/order-store.ts`
- Modify: `src/app/(painel)/painel/actions.ts` (`moveOrderAction`)
- Modify: `src/scripts/smoke-painel.ts` (parte "Pedidos")
- Test: `tests/unit/painel-orders.test.ts`

**Interfaces:**
- Produces:
  - `nextMove(o: { status: string; shipping?: { methodId?: string | null } | null }): { to: 'enviado' | 'pronto' | 'entregue'; label: string; asksTracking: boolean } | null`, conforme a tabela da spec §5.5 (retirada = `methodId === 'retirada'`).
  - `listOrdersForPanel(payload, user): Promise<{ id: number; number: string; name: string; items: string; status: string; statusLabel: string; move: ReturnType<typeof nextMove> }[]>`: primeiro `pago` e `pronto` (mais antigos primeiro), depois `enviado` e `entregue` dos últimos 7 dias.
  - `moveOrder(payload, user, id: number, from: string, trackingCode?: string): Promise<{ ok: true } | { ok: false; error: string }>`:
    - relê o pedido; se o status ≠ `from`, devolve "Esse pedido já mudou. Atualize a página." (clique duplo, ou outra pessoa mexeu);
    - `payload.update({ collection: 'orders', id, data: { status: to, trackingCode? }, user, overrideAccess: false })`;
    - `trackingCode` com trim, até 40 caracteres.

- [ ] **Step 1: Testes unitários que falham**

```ts
it.each([
  [{ status: 'pago', shipping: { methodId: 'sedex' } }, { to: 'enviado', label: 'Já enviei', asksTracking: true }],
  [{ status: 'pago', shipping: { methodId: 'retirada' } }, { to: 'pronto', label: 'Pronto para retirar', asksTracking: false }],
  [{ status: 'pronto', shipping: { methodId: 'retirada' } }, { to: 'entregue', label: 'Cliente retirou', asksTracking: false }],
  [{ status: 'pago', shipping: null }, { to: 'enviado', label: 'Já enviei', asksTracking: true }],
])('nextMove %o', (o, m) => expect(nextMove(o)).toEqual(m))
it.each(['aguardando', 'enviado', 'entregue', 'cancelado', 'expirado'])('sem ação em %s', (s) => expect(nextMove({ status: s })).toBeNull())
```

- [ ] **Step 2: Ver falhar → implementar → ver passar.**
- [ ] **Step 3: Smoke "Pedidos" que falha:** cria um pedido `pago` de envio pelo fluxo de `lib/orders.ts` (como `smoke-checkout.ts` faz, com `simulate`).
  - `moveOrder(equipe, id, 'pago', 'BR123')` → `ok`; o status fica `enviado`, o `trackingCode` fica `BR123`, e o log mostra o e-mail "a caminho" (modo simulação);
  - de novo com `from: 'pago'` → "Esse pedido já mudou…";
  - o estoque **não** muda com o envio.
  Run: `pnpm smoke:painel` → FAIL → implementar → todos os `✓`.
- [ ] **Step 4: UI:** um botão por pedido, folha "Código de rastreio (opcional)" para envio, e o selo de status com as cores do protótipo. Prints em 375 e 1440.
- [ ] **Step 5: `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke && pnpm races`.** Esperado: verde (os fluxos antigos de pedido continuam intactos).
- [ ] **Step 6: Commit.** `git commit -m "Painel: pedidos com um botão por próximo passo"`

---

### Task 8: Ponta a ponta e passada visual final

**Files:**
- Create: `tests/e2e/painel.spec.ts`
- Modify: `HANDOFF.md` e `PLANEJAMENTO.md` (seção "Painel do dono": como entrar, variáveis `PAINEL_HELP_WHATSAPP` e `SEED_STAFF_*`, e o que fica no `/admin`)

**Interfaces:**
- Consumes: tudo das Tasks 1–7. Credenciais da equipe lidas de `apps/web/.env` no Playwright (sem imprimir).

- [ ] **Step 1: E2E**
  - login como **equipe** → Banner → título "Teste E2E" → Publicar → `/` contém "TESTE E2E";
  - Adicionar jogo (capa de `src/seed/covers`, PS2, 1 lacrado ×2 e 1 Nota B a 99,90) → `/loja?q=` mostra o jogo;
  - Pedidos mostra a lista sem erro;
  - no fim, restaura o Global e esconde o jogo pelo próprio painel.
  ⚠️ Não digitar CPF em navegador (regra do projeto): o e2e não passa pelo checkout.
  Run: `pnpm e2e -- painel`. Esperado: PASS.
- [ ] **Step 2: Passada visual:** cada tela em 375, 768, 1024 e 1440, lado a lado com os quadros do protótipo. Listar cada diferença e corrigir (spec §9 conta como diferença aceita). Conferir: texto cortado, rolagem horizontal, texto colado na borda, hover/press/foco visível, placeholders esquecidos.
- [ ] **Step 3: Verificação final**
  Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke && pnpm smoke:painel && pnpm races && pnpm build`. Esperado: tudo verde. Cole a saída resumida no relatório.
- [ ] **Step 4: Commit.** `git commit -m "Painel: e2e, docs e acabamento visual"`

# Painel do dono — SPEC

**Data:** 04/11/2026 · **Status:** aguardando revisão do Gabriel
**Protótipo aprovado:** canvas Checkpoint Geek → https://claude.ai/artifact/NjKpVGceL1HNvhB73wDUx5 (quadros "Painel · 1 Início", "Painel · 2 Banner da home", "Painel · 3 Adicionar jogo")

Quando esta SPEC e o protótipo discordarem, **vale a SPEC**. As diferenças estão listadas na seção 9.

---

## 1. Objetivo

O dono da loja (o "mestre") precisa trocar o banner do topo da home e cadastrar jogos **sozinho**, sem pedir ajuda.

- **Para quem:** uma pessoa que não sabe nada de tecnologia. Cada tela precisa ser óbvia, ter pouca coisa e não dar medo de errar.
- **Pronto quando:** o mestre entra em `/painel`, troca o título do banner vendo o resultado ao vivo, publica, e a home mostra a mudança. Cadastra um jogo com 2 cópias e ele aparece em `/loja`. Tudo sem abrir o `/admin`.

## 2. Decisões (não revisitar)

1. **Painel próprio dentro do app Next**, em `/painel` (route group `(painel)`). O Payload continua como banco, autenticação e `/admin` para o Gabriel.
   - Por que não customizar o `/admin`: o CSS do Payload briga com o do site, e a prévia precisaria de iframe. No painel próprio, a prévia é o **componente `Hero` real** do site, com os dados do rascunho.
2. **Login do painel é o usuário da coleção `users`** (dono ou equipe). É o mesmo cookie `payload-token` do `/admin`.
3. **O banner vira um Global do Payload (`home-hero`)**. O campo `featured` dos jogos deixa de existir e os slides do Global passam a ser a única fonte do banner.
4. **Publicar = gravar o Global e limpar o cache da home** (`revalidatePath('/', 'layout')`). Não existe agendamento.
5. **Visual igual ao protótipo:** tokens, fontes e listra de 4 cores do site. Telas claras, topo escuro.
6. **Linguagem:** português simples, sem jargão ("Publicar", "Voltar como estava", "Esconder"). Nunca aparecem as palavras "slug", "collection", "global", "draft" ou "ID".

## 3. Arquitetura

```
Navegador (/painel/*)
  → Server Components leem com a Local API do Payload (user = quem está logado, overrideAccess: false)
  → Server Actions gravam (mesma regra de acesso) → revalidatePath('/', 'layout')
  → Home (/) lê o Global home-hero em getHome()
```

### 3.1 Arquivos novos (previsão)
| Onde | O quê |
|---|---|
| `src/globals/HomeHero.ts` | Global `home-hero` |
| `src/app/(painel)/layout.tsx` | Layout do painel: topo, menu, guarda de login, `noindex` |
| `src/app/(painel)/painel/entrar/page.tsx` | Login |
| `src/app/(painel)/painel/page.tsx` | Início |
| `src/app/(painel)/painel/banner/page.tsx` | Banner da home |
| `src/app/(painel)/painel/jogos/page.tsx` | Lista de jogos |
| `src/app/(painel)/painel/jogos/novo/page.tsx` e `[id]/page.tsx` | Adicionar e editar jogo (mesmo formulário) |
| `src/app/(painel)/painel/pedidos/page.tsx` | Pedidos |
| `src/app/(painel)/painel/actions.ts` | Server actions: `login`, `logout`, `saveHero`, `uploadImage`, `saveGame`, `moveOrder` |
| `src/components/painel/*` | Componentes do painel (`HeroEditor`, `LivePreview`, `GameForm`, `CopyRow`, `Stepper`, `Switch`, `PublishBar`…) |
| `src/app/(painel)/painel.css` | Estilos do painel, usando os tokens de `site.css` |
| `src/migrations/<data>_home_hero.ts` | Cria o Global, copia os jogos `featured` para slides e remove a coluna `featured` |

### 3.2 Login e acesso
- `/painel/entrar` tem e-mail e senha, e chama `payload.login({ collection: 'users' })` numa server action. O cookie é gravado com as mesmas opções do Payload (`payload-token`, httpOnly, `sameSite: lax`, `secure` em produção).
- "Esqueci a senha" usa o `forgotPassword` nativo da coleção `users`. O e-mail sai pelo Resend, ou aparece no log no modo simulação.
- O `layout.tsx` do painel chama `payload.auth({ headers })`. Sem usuário da coleção `users`, redireciona para `/painel/entrar?volta=<rota>`.
- **Quem pode o quê:**

| Ação | Dono | Equipe |
|---|---|---|
| Banner da home | ✅ | ✅ |
| Adicionar e editar jogos | ✅ | ✅ |
| Pedidos | ✅ | ✅ |

  As regras ficam nas próprias coleções (`staffOnly`). O painel não cria regras paralelas.
- O token dura 8 h (já configurado). Se expirar no meio da edição, o rascunho fica salvo no navegador (seção 5.2) e a pessoa volta para o login.
- Limite de tentativas: o login reaproveita `lib/rate-limit.ts` (por IP), além do `maxLoginAttempts: 5` que a coleção já tem.

## 4. Dados

### 4.1 Global `home-hero`
| Campo | Tipo | Regras |
|---|---|---|
| `title` | textarea | obrigatório, até 60 caracteres; cada quebra de linha vira uma linha no site |
| `subtitle` | textarea | até 220 caracteres |
| `ctaLabel` | text | obrigatório, até 24 caracteres; o link é sempre `/loja` |
| `slides` | array | 0 a 8 itens, na ordem do array |
| `slides.kind` | select | `game` \| `campaign` |
| `slides.game` | relationship → games | obrigatório se `kind = game` |
| `slides.campaignTitle` | text | obrigatório se `kind = campaign`, até 40 caracteres |
| `slides.campaignImage` | upload → media | opcional; sem imagem, usa a arte padrão (gradiente vermelho → amarelo com pixels, como no protótipo) |
| `slides.campaignLink` | text | padrão `/loja`; aceita só caminhos internos (`/…`) |
| `slides.visible` | checkbox | padrão `true` |

- `versions: { max: 20 }` guarda o histórico de publicações. Restaurar uma versão antiga fica no `/admin` por enquanto.
- `access`: `read: anyone`, `update: staffOnly`.

### 4.2 Mudanças em `games`
- **Sai o campo `featured`.** A migração copia os jogos com `featured = true` para `slides` (`kind: game`, `visible: true`, ordenados por `updatedAt`). Também preenche `title`, `subtitle` e `ctaLabel` com os textos fixos de hoje, e depois remove a coluna.
- **`glow` passa a ser automático:** um hook `beforeChange` calcula a cor dominante da capa com `sharp().stats()` quando o campo está vazio. O mestre nunca vê esse campo.

### 4.3 `copies` não muda
O painel usa os campos que já existem: `condition`, `price`, `stock`, `laudo.*` e `active`.

## 5. Telas

Todas as telas funcionam em **375, 768, 1024 e 1440 px**. Em menos de 768 px:
- o menu lateral vira uma barra de abas embaixo;
- a prévia fica abaixo do formulário, atrás de um botão "Ver prévia";
- a barra de publicar fica fixa embaixo.

### 5.1 Início (`/painel`)
Igual ao protótipo:
- "Olá, {nome}" e 3 cartões grandes: Trocar o banner, Adicionar um jogo e Ver pedidos (com a contagem).
- Resumo com 3 números reais: pedidos em aberto (`pago` + `pronto`), jogos com estoque e slides visíveis.
- Cartão "Travou em alguma coisa?" com o botão "Chamar o Gabriel", que abre o WhatsApp do Gabriel. O link vem de `PAINEL_HELP_WHATSAPP`; sem essa variável, o cartão não aparece.

### 5.2 Banner da home (`/painel/banner`)
Igual ao protótipo, com estes detalhes:
- **Slides:** setas sobem e descem, o olho esconde ou mostra, a lixeira apaga (confirmando: "Apagar este slide?").
  - "Adicionar slide" pergunta "Um jogo da loja" ou "Uma campanha".
  - Um slide de jogo sem nenhuma cópia ativa com estoque ganha o aviso "Sem estoque: não aparece no site" e é pulado na home.
- **Escolher jogo:** campo de busca e grade de capas, só com jogos que têm estoque.
- **Campanha:** texto, imagem (arrastar, ou câmera no celular) e destino do botão. O destino é escolhido numa lista ("A loja toda", "Uma plataforma: …", "Drop de sexta"), nunca digitando a URL.
- **Textos do topo:** título (Enter quebra a linha), frase e texto do botão, cada um com um contador de letras que fica amarelo perto do limite.
- **Prévia ao vivo:**
  - renderiza o **`<Hero>` real** com os dados do rascunho;
  - "Computador" mostra o site com 1100 px de largura, reduzido com CSS `zoom` medido por `ResizeObserver`;
  - "Celular" mostra com 390 px;
  - a prévia não reage a cliques (`inert`);
  - o slide selecionado na lista é o que aparece.
- **Rascunho:** fica no estado do cliente e é salvo no `localStorage` a cada mudança (chave por usuário). Fechar a aba não perde nada.
- **Barra de baixo:** mostra o status ("Igual ao que está no site agora" / "Você mexeu. Só muda no site quando publicar." / "Publicado! Já está no site.") e os botões **Voltar como estava** (descarta o rascunho e recarrega o que está publicado) e **Publicar no site**.
- **Validação:** mensagens curtas ao lado do campo, por exemplo: "Escreva um título", "A campanha precisa de um texto".

### 5.3 Jogos (`/painel/jogos`) — não está no protótipo
- Busca por nome e grade de cards: capa, nome, plataforma, menor preço e selo "Esgotado" ou "Escondido".
- Botão "Adicionar jogo" no topo. Tocar num card abre a edição.

### 5.4 Adicionar e editar jogo (`/painel/jogos/novo`, `/painel/jogos/[id]`)
Os 4 passos do protótipo, com estes ajustes:

1. **Foto da capa:** arrastar, ou câmera no celular (`accept="image/*"`). É obrigatória.
2. **Nome e plataforma:** a plataforma é escolhida em botões (lista `PLATFORMS`). "Mais detalhes (opcional)" abre ano, classificação, gênero e descrição.
3. **Cópias:** cada linha tem o estado em botões, o preço (`R$`, aceita "189,90" e "1.189,90") e:
   - **Lacrado:** campo de quantidade com − e +.
   - **Nota A, Nota B e Só disco:** cada unidade é uma cópia, então não tem quantidade. A linha mostra o **laudo**:
     - 4 interruptores: Roda do boot ao save, Capa original, Manual e encarte, Higienizado (padrões da coleção);
     - "Fotos reais (opcional)";
     - "Detalhes (opcional)": superfície do disco e "testado em".
   - "Tenho outra cópia" adiciona uma linha.
   - Na edição, uma cópia vendida (`stock 0`) aparece apagada com o selo "Vendida". "Tirar da loja" grava `active: false`, nunca apaga, porque pedidos apontam para cópias.
4. **Mostrar no banner da home?** Ligar coloca um slide de jogo no fim do Global (visível). Desligar remove o slide desse jogo.

- **Prévia ao lado:** o `ShopCard` real e o cabeçalho da página do produto, com os dados do formulário.
- **Salvar ("Publicar jogo"):** uma server action numa **única transação** (`payload.db.beginTransaction` + `req` em todas as chamadas) cria ou atualiza o jogo, as cópias e o slide. Se qualquer passo falhar, nada fica gravado. Depois: `revalidatePath('/', 'layout')`.
- **Jogo repetido** (mesmo título e plataforma, `slug` único): "Esse jogo já existe no PS2. Abrir ele?", com link para a edição.
- **Sem botão de apagar jogo nesta versão.** "Esconder da loja" desativa todas as cópias.

### 5.5 Pedidos (`/painel/pedidos`)
- Lista primeiro os pedidos `pago` e `pronto`, depois os `enviado` e `entregue` dos últimos 7 dias.
- Cada pedido tem um botão só, o próximo passo. "Retirada" = `shipping.methodId === 'retirada'` (mesma regra de `lib/emails.ts` e `lib/orders.ts`); qualquer outro valor = envio.

| Status | Entrega | Botão | Vira |
|---|---|---|---|
| `pago` | envio | **Já enviei** (abre um campo "Código de rastreio", opcional) | `enviado` + `trackingCode` |
| `pago` | retirada | **Pronto para retirar** | `pronto` |
| `pronto` | retirada | **Cliente retirou** | `entregue` |

- A ação usa `payload.update` com o usuário logado, **sem** `context: ORDER_MOVE`, para os hooks de `Orders` rodarem como no `/admin` (e-mail de envio, etc.). Movimento de estoque e XP continuam só no checkout, webhook e cron.
- Não tem "Já separei": não existe esse status no pedido.

## 6. Home do site

- `getHome()` lê o Global (`depth: 2`) e monta `heroSlides`:
  - só os visíveis;
  - jogo sem estoque é pulado;
  - o jogo usa a melhor cópia, como o `featured` faz hoje.
- `Hero` passa a receber `{ title, subtitle, ctaLabel, slides, strip, total }`.
  - O título é dividido por linha, e a **última linha** recebe o sublinhado amarelo (`hero-under`).
  - Slide de campanha: a área da direita mostra o cartão da campanha (imagem ou arte padrão, título e botão com link).
  - Sem slides visíveis, o hero mostra só o texto, ocupando a largura toda.
- Os mesmos componentes renderizam a prévia do painel, e não existe cópia do Hero.

## 7. Erros

- Toda server action devolve `{ ok: true, … } | { ok: false, error, fields? }` (mesmo formato das actions da loja em `app/(frontend)/actions.ts`), com uma mensagem em português simples. Nunca mostra stack nem código.
- **Falha de rede ou de servidor:** um toast vermelho ("Não deu para publicar. Seu rascunho está guardado, tente de novo."), e o rascunho continua no navegador.
- **Upload grande:** imagens acima de 8 MB são recusadas com "Foto grande demais (máx. 8 MB)". As imagens são reduzidas pelos tamanhos que o `Media` já define.
- **Sessão expirada:** vai para o login com `?volta=` e o rascunho continua lá.

## 8. Testes (como vou provar que funciona)

| Tipo | O quê | Comando |
|---|---|---|
| Unidade (Vitest) | divisão do título em linhas; leitura de preço ("1.189,90" → 1189.9); montagem dos `heroSlides` (escondido, sem estoque, campanha sem imagem); migração de `featured` para slides | `pnpm --filter web test` |
| Servidor | `saveHero` publica e limpa o cache; `saveGame` desfaz tudo se uma cópia falhar; `moveOrder` `pago → enviado` dispara o e-mail no modo simulação; usuário da equipe consegue, visitante não | `pnpm smoke` (novos casos) |
| Ponta a ponta (Playwright) | login como dono → muda o título → publica → a home mostra o título novo; adiciona um jogo com 1 lacrado (2 unidades) e 1 Nota B → aparece em `/loja` | `pnpm e2e` |
| Visual | prints a 375, 768, 1024 e 1440 de cada tela, comparados lado a lado com o protótipo | navegador do app |

- **Contas de teste:** o seed já cria o dono. Passa a criar também um usuário **equipe** (`SEED_STAFF_EMAIL` e `SEED_STAFF_PASSWORD` gravados em `apps/web/.env`), para testar os dois papéis.

## 9. Diferenças em relação ao protótipo

| No protótipo | Na SPEC | Motivo |
|---|---|---|
| Quantidade em qualquer estado | Quantidade só no **Lacrado**; usado = 1 cópia por unidade, com laudo | Cada usado tem laudo e fotos próprios (regra da coleção `copies`) |
| Sem laudo | Laudo aparece na linha de cópia usada | Sem isso, o produto usado sai sem laudo na loja |
| "Já separei" nos pedidos | Não existe | Não há esse status; o fluxo real é pago → enviado/pronto → entregue |
| "você" vazado no título | Só a última linha tem destaque (sublinhado) | O título agora é texto livre; regra simples e previsível |
| Sem tela de lista de jogos | Tela "Jogos" com busca | Sem ela, o mestre não consegue corrigir um preço |

## 10. Fora do escopo (v1)

- Agendar publicação e restaurar versões antigas pelo painel (o `/admin` já faz).
- Apagar jogo e editar drops, newsletter, clientes ou outras seções da home.
- Equipe com permissões diferentes do dono dentro do painel.
- Recorte e edição de foto (só envio).

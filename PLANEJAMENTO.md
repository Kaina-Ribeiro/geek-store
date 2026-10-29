# Checkpoint Geek — Planejamento

> Loja de games de Taubaté-SP (lacrados e seminovos com laudo), com envio para todo o Brasil.
> Objetivo: sair de um site de template (como o houseofgamestaubate.com) para uma loja com cara de marca premium, que dá vontade de navegar e que seja fácil de operar no dia a dia.

**Protótipo aprovado (canvas):** https://claude.ai/artifact/NjKpVGceL1HNvhB73wDUx5
- Desktop · Home: `#play-15dd8cd198dd` · Desktop · Produto: `#play-6be57fc6df02` · Celular (7 telas): `#play-bbf51268af48`

---

## 1. Diagnóstico do site de referência (houseofgamestaubate.com)

| Problema | O que fazer na Checkpoint Geek |
|---|---|
| Template genérico (Loja Integrada), sem identidade | Identidade própria vinda do logo: 4 cores primárias, pixel art e preto profundo |
| Banner gigante em baixa resolução empurra os produtos para baixo | Hero compacto com produtos já visíveis na primeira dobra |
| Título do produto é o único dado ("Midia Física Usado") | Selo de **estado** padronizado (Lacrado / Nota A / Nota B / Só disco), plataforma e itens inclusos |
| Destaques duplicados no carrossel | Vitrines com curadoria: Acabou de chegar, Mais vendidos, Drop de sexta, Retrô |
| Nenhum motivo para voltar | Programa de XP, save slots (desejos) com alerta de preço e drops semanais |
| Busca e filtros fracos | Busca instantânea (Ctrl+K) e filtro por plataforma, estado, preço e gênero |

---

## 2. Referências

### Lojas de games e cultura geek
| Loja | O que roubar |
|---|---|
| **Limited Run Games** | Drops com contagem regressiva e escassez ("só 2 unidades") |
| **Fangamer** | Curadoria com personalidade, textos com humor |
| **iam8bit** | Colecionável como objeto de arte, fotografia de produto impecável |
| **Super Rare Games / Strictly Limited** | Páginas de produto com edições, tiragem e o que vem na caixa |
| **Analogue** | "Retrô premium": tipografia, espaço vazio, produto como herói |
| **8BitDo** | Paleta forte, nostalgia sem parecer brega |
| **PlayStation Direct / Nintendo Store / Steam / Xbox** | Fluxo de compra limpo, badges de plataforma, nome "Loja" na navegação |

### E-commerce premium (fora do nicho)
| Loja | O que roubar |
|---|---|
| **Nothing** | Fonte pixelada usada com elegância |
| **Teenage Engineering** | Produto + microinterações + respiro |
| **Aesop** | Ritmo editorial, luxo com poucos elementos |
| **Glossier** | Cards simples, carrinho em gaveta, prova social |
| **Apple Store** | Hierarquia de preço e parcelamento, liquid glass |

---

## 3. Conceito: "Continue de onde parou"

O nome **Checkpoint** vira o sistema de navegação da loja:

- **Carrinho = Inventário** — ao adicionar um item, uma moedinha voa até o carrinho.
- **Lista de desejos = Save slots** — com alerta quando o preço cai.
- **Conta = Perfil do jogador** — nível e XP (R$ 1 = 1 XP), conquistas e cupons por nível.
- **Troca de jogos = Trade-in** — simulador que mostra o crédito na hora.
- **Drops de sexta** — lote curado com contagem regressiva e blocos "?" de surpresa.
- **Laudo Checkpoint** — cada seminovo passa por 5 checagens (boot, disco sob luz, capa e manual, higienização, nota final) com fotos reais.

Visual: Home desktop e Início do celular com o contraste preto/claro aprovado (fixo, sem seletor de tema); todas as outras telas em tema claro. Liquid glass leve nos cards, barras e chips; animações no estilo Apple (spring `cubic-bezier(.32,.72,0,1)`).

---

## 4. Decisões de arquitetura (respostas às dúvidas)

### 4.1 Vendas e pagamento
**Mercado Pago (Checkout Transparente / Bricks)** — Pix, cartão parcelado e boleto.
- **Seguro por desenho:** o cartão é digitado num formulário do próprio Mercado Pago embutido no site; o número nunca chega ao nosso servidor. Não guardamos dado sensível, o que tira o site do escopo pesado de PCI.
- **Sem mensalidade**, taxa só por venda. Pix é a taxa mais baixa — por isso o site empurra o Pix com 5% de desconto. Conferir as taxas vigentes ao abrir a conta.
- **Webhook**: quando o pagamento é aprovado, o Mercado Pago chama nosso endpoint e o pedido passa sozinho para "Pago". Pix tem expiração de 30 min (o protótipo já mostra isso).
- Ambiente de teste (sandbox) para simular compras antes de lançar.
- Alternativas avaliadas: Pagar.me (taxas melhores só com volume), Stripe (Pix via parceiro, menos natural no BR), Asaas.

**"Tem algo free?"** Para receber dinheiro, não existe: todo intermediário cobra por transação. O que é grátis é a integração e o painel.

**Frete:** **Melhor Envio** (API grátis; paga-se só a etiqueta, mais barata que no balcão). Cotação por CEP na página do produto e no checkout, etiqueta e rastreio automáticos. Retirada em Taubaté como opção "Grátis".

**Nota fiscal:** se o cliente tiver CNPJ, emitir pela API do **Bling** ou **NFe.io**. Depende de resposta do cliente.

### 4.2 Conteúdo e administração (CMS)
**Payload CMS 3** rodando dentro do próprio Next.js (mesmo deploy, mesmo banco).
- Grátis e open source; painel admin pronto com login, upload de fotos, permissões e histórico de versões.
- Modelamos exatamente o caso da loja: cada **cópia** usada é única (nota, fotos do laudo, preço próprio). Plataformas prontas (Shopify, Nuvemshop, Loja Integrada) tratam isso mal.
- O painel vira a "retaguarda": cadastrar jogo, montar o drop, ver pedidos, imprimir etiqueta.
- **Por que não o Medusa (proposto antes):** é um e-commerce completo, mas exige serviço separado, Redis e mais infra para uma loja pequena. Fica como caminho de migração se a loja crescer para milhares de SKUs com variações.
- **Não criar CMS do zero**: só o modelo de dados e as telas específicas (laudo, drop, troca).

### 4.3 Contas e papéis
- **Comprar sem conta** (checkout de visitante) — obrigar cadastro derruba venda. O pedido fica ligado ao e-mail; o cliente pode criar a conta depois e "puxar" o histórico.
- **Conta opcional** com login pelo Google ou link mágico por e-mail (sem senha). Serve para pedidos, rastreio, save slots, XP e níveis.
- **Papéis** (não existe "conta main" única; existe um dono com privilégios):

| Papel | Quem | Pode |
|---|---|---|
| **Dono** | o cliente | Tudo: preços, taxas, relatórios, criar/remover equipe, configurações de pagamento |
| **Equipe** | quem ajuda na loja | Cadastrar jogos e laudos, montar drops, despachar pedidos. Não vê financeiro nem configurações |
| **Cliente** | comprador | Só a própria conta, pedidos, save slots e XP |

- Contas de admin ficam numa coleção separada das contas de cliente (padrão do Payload), com 2FA obrigatório para o dono.

### 4.4 Infra e custos (começo)
| Peça | Escolha | Custo inicial |
|---|---|---|
| Site + admin | Next.js 16 + Payload 3 na **Vercel** (plano Pro, uso comercial) | ~US$ 20/mês |
| Banco | Postgres no **Neon** (ou Supabase) | grátis no começo |
| Fotos | **Cloudflare R2** + `next/image` (WebP/AVIF) | grátis até um bom volume |
| Busca | Postgres full-text (fase 1) → Meilisearch se precisar | grátis |
| E-mails | **Resend + React Email** | grátis até 3 mil/mês |
| Domínio | checkpointgeek.com.br | ~R$ 40/ano |
| Pagamento | Mercado Pago | % por venda |
| Frete | Melhor Envio | só a etiqueta |

Alternativa mais barata ao Vercel Pro: VPS (Hetzner/Contabo) com Coolify, ~US$ 5/mês, mas exige cuidar do servidor.

---

## 5. Stack

| Camada | Escolha |
|---|---|
| Monorepo | Turborepo + pnpm |
| App | **Next.js 16 (App Router) + React 19 + TypeScript** |
| CMS / back | **Payload CMS 3** (dentro do Next) |
| Estilo | Tailwind CSS v4 + tokens do protótipo (cores, Archivo/Geist/Geist Mono/Silkscreen) |
| Animação | Motion (framer-motion) para springs; GSAP + ScrollTrigger só nas seções longas da Home; Lenis para scroll suave |
| Estado do carrinho | Zustand + persistência local; servidor valida preço e estoque no checkout |
| Pagamento | Mercado Pago (SDK server + Bricks no front) |
| Frete | Melhor Envio (API) |
| E-mails | Resend + React Email |
| Testes | Vitest (unidades), Playwright (fluxo de compra em sandbox) |
| Métricas | GA4 + Meta Pixel (campanhas no Instagram) |

### Estrutura do monorepo
```
checkpoint-geek/
├─ apps/
│  └─ web/                 # Next.js + Payload (loja em /, admin em /admin)
│     ├─ src/app/(loja)/   # home, loja, produto, inventário, checkout, conta
│     ├─ src/app/(admin)/  # painel do Payload
│     ├─ src/collections/  # Games, Copies, Orders, Drops, Users, Customers, Media
│     └─ src/lib/          # mercadopago, melhorenvio, xp, laudo
├─ packages/
│  ├─ ui/                  # ProductCard, ConditionBadge, PlatformBadge, TrustChip, GlassCard, CoinFly
│  ├─ fx/                  # animações (React Bits adaptados, pixel icons)
│  └─ config/              # tailwind, eslint, tsconfig
├─ turbo.json
└─ pnpm-workspace.yaml
```

---

## 6. Modelo de dados

```
Game            título, plataforma, gênero, ano, classificação, capa, descrição, SKU base
Copy (cópia)    game, estado (lacrado | A | B | só-disco), preço, estoque (1 por cópia usada),
                laudo { boot, disco, capaManual, higienizacao, notaFinal, fotos[] }, ativo
Drop            título, abre_em, itens[] (Copy), reservados, acesso antecipado (nível mínimo)
Order           cliente ou e-mail, itens[] (Copy + preço travado), frete (serviço, valor, etiqueta,
                rastreio), pagamento (método, status, id MP, expira_em), total, status
Customer        e-mail, nome, endereços[], xp, nível, saveSlots[] (Game), conquistas[]
TradeIn         cliente, itens[] (plataforma, estado, qtd), fotos[], proposta, status
User (admin)    nome, e-mail, papel (dono | equipe), 2FA
Media           fotos de capa e do laudo (R2)
```

Regras: preço e estoque sempre revalidados no servidor; cópia usada tem estoque 1 e sai do ar ao ser paga; "Só 1 em estoque" vem daí. XP é creditado quando o pedido vira "Pago".

---

## 7. Páginas (MVP) — já desenhadas no protótipo

| Página | Desktop | Celular |
|---|---|---|
| Home | hero 3D + destaques, Acabou de chegar (vitrine com filtros), Escolha seu console, Laudo, Drop, Troca, XP, rodapé | mesma ordem, em rolagem |
| Loja (catálogo) | seção da Home + página `/loja` com filtros na URL | tela própria com chips, sheet de filtros e ordenação |
| Produto | galeria (capa, 3D, disco, fotos reais), estados com preço, laudo, frete por CEP, troca, relacionados | mesma, com barra de compra fixa |
| Busca | Ctrl+K | tela própria (recentes, em alta) |
| Inventário + checkout | gaveta lateral + checkout em 1 página | tela própria (entrega, pagamento, resumo) |
| Pix | modal com QR | tela cheia com QR e status |
| Perfil | área da conta | tela própria (XP, pedido, níveis) |
| Admin | painel do Payload | — |

---

## 8. Revisão de design do protótipo (o que ainda melhorar)

Feito nesta rodada: cards da vitrine com liquid glass e botão "Adicionar", selos de confiança com ícones pixel art, banners dos consoles sem corte, "Caixote" → "Loja" (desktop e celular), contraste da barra de navegação, textos quebrando em Drop/Inventário/Perfil/Produto.

### Correções rápidas no canvas
1. **"Ver jogos de  PS5"** (Home desktop, banners dos consoles): espaço duplo antes do nome — o hole gera um wrapper. Usar `Ver jogos de&nbsp;{{p.name}}`.
2. **Nomes dos níveis** (Home desktop, "Cada compra sobe de nível"): "Aventureiro", "Explorador" e "Veterano" estouram o card. Reduzir o tamanho/largura da fonte ou deixar quebrar em 2 linhas.
3. **Header do Produto desktop** é uma barra preta sólida, enquanto a Home tem header transparente: unificar com o header glass escuro já usado no celular.
4. **Cards da vitrine**: adicionar o coração de "save slot" no hover (desktop) e no canto da capa (celular). O conceito existe no doc e na página do produto, mas não nos cards.

### Para a implementação (não dá para resolver no mock)
5. **Responsivo intermediário (1024–1280 px, notebooks)**: o mock é 1440 e 390. Abaixo de ~1200 o hero quebra palavra por palavra e o simulador de troca sobrepõe o texto. Definir breakpoints 768 / 1024 / 1280 / 1440 desde o design system.
6. **Fotos reais do laudo**: os placeholders "[Foto do disco]" são o maior ganho de confiança quando virarem fotos. Definir um padrão de foto (fundo, luz, 4 ângulos) e um fluxo rápido pelo celular no painel.
7. **Estados que faltam**: 404, produto esgotado/vendido, Pix expirado, pagamento recusado, busca sem resultado no desktop, skeletons de carregamento nos cards.
8. **Acessibilidade**: foco visível para teclado, `aria-live` no toast do inventário, contraste dos cinzas nos fundos claros (#5F5F68 ok; evitar #8E8E97 sobre branco), `prefers-reduced-motion` em todas as animações.
9. **Performance**: capas como WebP/AVIF via `next/image`, hero 3D sem WebGL (CSS 3D já resolve), animações pesadas só na Home e carregadas sob demanda. Meta: LCP < 2 s no celular.
10. **Textos [a definir]**: WhatsApp, CNPJ, nome do cliente no perfil, horário (Seg a sáb · 10h às 19h) — confirmar com o cliente.

---

## 9. Animações do React Bits (só o necessário)

| Componente | Onde |
|---|---|
| **PixelBlast** ou **Dither** | Fundo do hero, reagindo ao mouse (sob demanda) |
| **TiltedCard** + **GlareHover** | Cards de produto (desktop) |
| **ClickSpark** | Faíscas pixeladas ao adicionar ao inventário |
| **ScrollVelocity** | Faixas diagonais (tapes) que aceleram com o scroll |
| **CountUp** | XP, contador do drop, "+312" |
| **PixelTransition** | Capa → contracapa no hover do produto |

Regras: respeitar `prefers-reduced-motion`; nada bloqueia conteúdo; WebGL só no hero.

---

## 10. Fases e entregas

| Fase | Entrega | Pronto quando |
|---|---|---|
| 0 | Protótipo visual (canvas) + aprovação | cliente aprova as 9 telas |
| 1 | **Base**: monorepo, Next + Payload, banco, R2, design tokens, componentes `packages/ui` (card, badges, chips, glass, botões) | Storybook com os componentes iguais ao mock |
| 2 | **Catálogo**: coleções Game/Copy/Media, painel para a equipe cadastrar, Home, Loja com filtros, Produto, Busca | equipe cadastra 20 jogos reais e eles aparecem na loja |
| 3 | **Checkout**: inventário, Melhor Envio, Mercado Pago (Pix + cartão), webhook, e-mails de pedido, painel de pedidos e etiquetas | compra de teste no sandbox de ponta a ponta |
| 4 | **Contas**: login Google/link mágico, pedidos e rastreio, save slots, XP e níveis, conquistas | XP creditado em pedido pago |
| 5 | **Extras**: Drop de sexta (contagem, acesso antecipado, blocos "?"), simulador de troca + WhatsApp, newsletter | drop real publicado pelo painel |
| 6 | **Lançamento**: LGPD (privacidade, cookies), termos, trocas e devoluções, SEO, GA4/Pixel, Playwright no fluxo de compra, compras reais pequenas | LCP < 2 s, pedido real entregue |

Estimativa: fases 1–3 são o grosso (loja vendendo); 4–5 são diferenciais; 6 é obrigatória antes de divulgar.

### Status (29/10/2026)

**Fases 1 e 2 implementadas** (ver `README.md` para rodar):
- Monorepo pnpm + Turborepo; `apps/web` com Next.js 16.3 + Payload 3.92 (painel em `/admin`, em português); `packages/ui` com tokens, card, selos e ícones.
- Coleções: Games, Copies (cópia única com laudo e fotos), Drops, Media (WebP em 3 tamanhos), Customers, Users com papéis Dono/Equipe.
- Páginas: Home completa (hero 3D, vitrine com filtros, consoles arrastáveis, laudo, drop com contagem real, simulador de troca, passe XP, rodapé), `/loja` com filtros na URL, `/jogo/[slug]` com variações por estado, 404.
- Inventário (carrinho) em gaveta com frete grátis progressivo, save slots e toast de XP, salvos no navegador.
- Responsivo: 1440 / 1360 / 1100 / 900 / 768 / 640, com barra de abas no celular e barra de compra fixa no produto.
- Seed com 17 jogos reais, 21 cópias e o drop de sexta.

Decisões tomadas na implementação:
- **CSS com tokens em vez de Tailwind**: o visual aprovado é muito específico (vidro, fitas, case 3D); CSS puro com variáveis portou o canvas fielmente e com menos código.
- **SQLite em desenvolvimento**, Postgres em produção (mesmo schema, troca de adapter).
- Checkout desativado com aviso honesto ("chega na próxima etapa") até a fase 3.

**Próximo: fase 3** (Mercado Pago + Melhor Envio + pedidos), depende das perguntas 1 e 2 abaixo.

---

## 11. Perguntas para o cliente

1. Tem CNPJ? Precisa emitir nota fiscal? (define Bling/NFe.io)
2. Já tem conta no Mercado Pago? Aceita as taxas ou prefere outro meio?
3. Quem cadastra os jogos no dia a dia e quantas pessoas usam o painel? (papéis)
4. Troca: só simulação que leva ao WhatsApp, ou fluxo completo no site com crédito na conta?
5. Vende só games ou também colecionáveis (Funko, action figures, camisetas)?
6. Retirada em mãos em Taubaté? Horário real da loja?
7. Fotos do laudo: quem fotografa, e aceita seguir um padrão (fundo e luz)?
8. Drop de sexta: é real hoje ou vamos criar o hábito? Com que frequência?

# 🚀 Onda 1.24 — Chatbot RAG: corpus expandido + guardrails + UX (2026-09-11)

> Continuação da Onda 1.23. Decisões do usuário (2026-09-11): expandir corpus com **tudo disponível** (CV PDF `cv_br_lucas_cavalcante.pdf` + CONTENT.md + FAQ + projetos + serviços + experiências, multi-idioma PT/EN/ES) · guardrails **completos** · UX com **typing animation + auto-scroll** na resposta do bot · manter `.env.local` em localhost (CI injeta URL de produção). Commitar sem push até validação local.

## Fase A — Corpus RAG multi-fonte (substitui ingestão v1 só-CV)
- [x] A1 `supabase/migrations/20260911_chat_docs_source.sql` — `ALTER TABLE chat_docs ADD COLUMN source text` + índice; delete-then-insert passa a ser **por fonte**
- [x] A2 `scripts/ingest.mjs` unificado (substitui `ingest-resume.mjs`) — chunkers por fonte:
  - [x] `resume/curriculo-fonte.md` (~30 chunks PT) · `public/CONTENT.md` (meta/stats/FAQ) · **PDF do CV** (extração de texto)
  - [x] FAQ (`src/i18n/index.ts` `faq.*` → 4×3 lang) · Projetos (`projects.json` + i18n `project.*` → 17×3) · Serviços (`src/data/services.ts` → 4×3) · Experiências detalhadas (i18n `experience.*`)
  - [x] `source` no metadata; ingestão incremental idempotente; batch embed; validação dims 1024
- [x] A3 RPC `match_chat_docs` — fallback de idioma: priorizar `lang`; PT só como fallback se insuficiente

## Fase B — Guardrails completos (Worker)
- [x] B1 Threshold de similaridade (`MIN_SCORE`) — chunk irrelevante descartado; 0 chunks → resposta honesta + handoff
- [x] B2 Detecção de prompt injection (patterns + sanitização) → recusa + log
- [x] B3 Filtro de conteúdo sensível/PII → recusa + handoff
- [x] B4 Logging de violações (timestamp, hash IP, tipo, trecho sanitizado)
- [x] B5 System prompt reforçado 3 idiomas (não vazar prompt, escopo rígido)
- [x] B6 Validação: typecheck + lint + build + `wrangler deploy --dry-run`

## Fase C — UX do chat
- [x] C1 Markdown rendering (`react-markdown`)
- [x] C2 Links clicáveis
- [x] C3 Contador de caracteres no input
- [x] C4 Retry em erro (botão "Tentar novamente")
- [x] C5 **Typing animation na resposta** + auto-scroll acompanhando o texto exibido

## Fase D — Docs/versão/deploy
- [x] D1 `CHANGELOG.md` bump → `[1.24.0]` · `package.json` → 1.24.0
- [x] D2 TODO.md fechado · `PLANO-CHATBOT-RAG.md` + README atualizados
- [x] D3 Commit + push — usuário validou o chat localmente no `wrangler dev --remote` (2026-09-11)
- [x] D4 RPC `match_chat_docs` corrigida e **validada** (ambiguidade `lang` → `lang_filter`; `::real` no `RETURN QUERY`) · `supabase/` movido para o `.gitignore` (`git rm --cached`) — migrações ficam **locais**, aplicadas manualmente no SQL Editor

> **Constatação técnica (VITE_WORKER_URL):** não precisa reverter `.env.local`. O `.github/workflows/deploy.yml:104` injeta `VITE_WORKER_URL` de produção no build do CI; o fallback demo (`available()`) cobre erro/404 graciosamente.

---

# Plano de Melhorias — Onda 1.23 (2026-09-09) — Chatbot RAG integrado

> Detalhes técnicos completos em `PLANO-CHATBOT-RAG.md` (decisões, arquitetura, segurança, custos) e a seção **Chatbot IA (RAG)** do `README.md` (fluxo + mermaid + arquitetura). Implementação concluída e validada fim-a-fim localmente; falta deploy em produção (push → Actions → `wrangler deploy`) + secrets.

## 🤖 Onda 1.23 — Chatbot RAG (estilo WhatsApp)

### ✅ Executado / implementado
- [x] **Etapa 1 — Supabase + ingestão**: migração `supabase/migrations/20260908_chat_docs.sql` (tabela `chat_docs` pgvector 1024 + HNSW cosine + rpc `match_chat_docs` fallback `pt`) · devDep `js-yaml` (v5 — import ESM usa **named export** `{ load }`) · script npm `ingest` + `scripts/ingest-resume.mjs` (front-matter → chunks, embeddings por REST `@cf/baai/bge-m3`, delete-then-insert idempotente)
- [x] **Migração aplicada no SQL Editor** do Supabase — 2026-09-09 (usuário)
- [x] **Ingestão rodada** — `npm run ingest`: **30 linhas em `chat_docs`** (5.5s); `match_chat_docs` validado com embedding real ("O que você faz?" → dados_pessoais/resumo/experiencia)
- [x] **Etapa 2 — Worker `POST /chat`**: `worker/src/rag.ts` (embed `bge-m3` via binding `AI`, retrieve `match_chat_docs` top-6, askGroq **`groq/compound-mini`**, buildSystemPrompt c/ serviços públicos sem preço + handoff WhatsApp/orçamento) · `Env` + `AI`/`GROQ_API_KEY` · `wrangler.toml` binding `[ai]` + secret note · tsconfig experimental types · rate-limit 20/h (`checkRate` generalizado) · 422/503 graceful
- [x] **Etapa 3 — Frontend**: `chatWithBot()` (fallback demo pt/en/es) · i18n `chat.*` pt/en/es · `ChatBot.tsx` (FAB `z-[58]`, painel bottom-sheet + backdrop, bolhas/timestamps/typing, chips 1ª abertura, histórico sessionStorage, handoff WhatsApp + **QuoteModal**, focus-trap/Escape) · barrel + `<ChatBot />` montado no App (próximo do CookieConsent)
- [x] **Avatar do assistente** — `public/images/chat/assistant-avatar.jpeg` (renomeado/movido da raiz `Gemini_Generated_Image_k82zw8k82zw8k82z.jpeg`; 896×1196 @697KB) e usado no header do chat (`img` circular `object-cover` 36px, no lugar do monograma "LC")
- [x] **Etapa 4 — Verificação**: typecheck front+worker · lint (arquivos editados) · build · `wrangler deploy --dry-run` (binding `AI` OK) · CORS `localhost:5173`/`127.0.0.1:5173` liberado (preflight OPTIONS 204) · resposta real 200 (~4s) · handoff de preço 200 (~3s) · 503 sem key · 422 msg vazia · lang inválida cai p/ `pt`
- [x] **Etapa 5 — Docs/versionamento**: `.env.example` (+`SERVICE_ROLE_KEY`/`GROQ_API_KEY`) · `CHANGELOG.md` `[1.23.0]` · `README.md` seção "Chatbot IA (RAG)" com **mermaid** (sequence + flowchart) · `package.json`/lock → 1.23.0 · `TODO.md`
- [x] **Ajustes de ambiente (2026-09-09)**
  - Token Cloudflare no `.env.local` ganhou permissão **Workers AI:Edit** no painel (antes: 401 `Authentication error` em `/ai/run`)
  - `llama-3.1-8b-instant` **descontinuado** na conta Groq → trocado p/ **`groq/compound-mini`** (testei `openai/gpt-oss-20b` e `qwen/qwen3.8-27b`; escolhi o nativo Groq). Commit `6f527f4`
  - Experiência Windows: `taskkill /PID <pai> /T /F` p/ matar árvore `wrangler`→`workerd` (zumbis seguravam a porta 8787); watcher do Vite dá **EBUSY** em rename de arquivo — reiniciar o `npm run dev`
  - `.gitignore` do worker ganhou `.wrangler/` (commit `d7166a9`)

### 🔬 Registro de validação (2026-09-09)
- `npm run ingest`: 30/30 chunks → embed OK → 30 linhas em `chat_docs`
- `wrangler dev --remote` + curl `POST /chat`: 200 real ("Lucas é Analista de Dados... dashboards, pipelines, chatbots..." em 4.1s); preço → recusa + handoff (3.1s)
- Widget **no navegador ainda mostrava "Não consegui responder agora"** porque o `VITE_WORKER_URL` do `.env.local` apontava p/ o Worker de **produção** (que não tem `/chat` → 404). **Corrigido**: `VITE_WORKER_URL=http://127.0.0.1:8787` (ver Pendências — reverter) + `wrangler dev --remote --port 8787` + reiniciar `npm run dev`

### 🚧 Pendências / próximos passos
- [ ] ⏳ **Testar o widget no navegador** com o Worker local de pé: iniciar `wrangler dev --remote --port 8787` em `worker/`, `npm run dev`, abrir `http://localhost:5173/portfolio-cavalcante/` → FAB → perguntar (vê a resposta real da Groq + avatar)
- [ ] ⏳ **Alimentar o RAG com chunks das minhas informações** — a ingestão v1 só cobre o `curriculo-fonte.md` (~30 chunks PT). Ampliar o corpus do `chat_docs` com mais conhecimento pessoal/profissional (ex.: FAQ do site, projetos detalhados, serviços em profundidade, metodologias, experiências completas) e manter ingestão **incremental** (delete-then-insert por fonte; suportar pt/en/es e idempotência multi-fonte)
- [ ] ⏳ **Guardrails para o chat** — escopo rígido (responder só do conhecimento autorizado; fora de escopo → handoff), não vazar prompts/sistema, não produzir conteúdo sensível/ilegal/PII, instruções contra jailbreak/prompt-injection, logging/login de violações, fallback para atendimento humano (WhatsApp/orçamento); definir medição de qualidade das respostas
- [ ] ⏳ **Reverter `VITE_WORKER_URL`** no `.env.local` p/ `https://portfolio-cavalcante-worker.cavalcanteprofissional.workers.dev` após terminar o teste local
- [ ] ⏳ **Deploy em produção**: `git push` → Actions (`npm run typecheck`, lint, build, `wrangler deploy`) e depois **`wrangler secret put GROQ_API_KEY`** (no `worker/`; secret persiste no CI)
- [ ] ⏳ **Rotacionar `service_role`** (chave exposta 2× no chat — recomendo antes/logo após o push; atualizar `.env.local` + `wrangler secret put SERVICE_ROLE_KEY` se rotacionar)
- [ ] ⏳ **Otimizar avatar** (opcional): reduzir `assistant-avatar.jpeg` 896×1196 @697KB p/ ~256px webp (`sharp` já é devDep)

---

# Plano de Melhorias — Onda 1.22 (2026-08-31)

> Fechamento pós-1.21. Prioridades selecionadas: Política de Privacidade + rodapé (checklist §5), CV17 (overrides de tradução) e Visão de visitas (Umami) + Export CSV no Admin (A5 deferido). Decisões do usuário anotadas em cada item.

## 🍪 Item 1 — Política de Privacidade no rodapé (reusa CookieConsent)
- [x] **Decisão:** reusar o modal CookieConsent (fonte única da política), sem página separada.
- [x] `consentStore.ts` — estado/actions `forcedOpen` + `requestPolicy()` / `closePolicy()`
- [x] `CookieConsent.tsx` — `show` passa a abrir também com `forcedOpen` (mesmo com `consent` já definido); fechar via Escape/backdrop no modo forçado chama `closePolicy()`
- [x] `Footer.tsx` — link "Política de Privacidade" (`footer.privacy` pt/en/es) que reabre o modal + restaurado `footer.rights`; `main` `pb-20`→`pb-24` p/ comportar a nova linha
- [x] typecheck

## 🧰 Item 2 — CV17: Qualidade de tradução (overrides mBART)
- [x] Rodado `python resume/build.py` → identificados campos-detupados (cargos, formação, certificações, idiomas)
- [x] `overrides.en.yml` / `overrides.es.yml` preenchidos com traduções manuais (deep-merge por índice)
- [x] PDFs regenerados e commitados (committed-first; CI regera como double-check)
- [x] Greps nos HTMLs EN/ES validam as correções

## 📊 Item 3 — Visão de visitas (Umami) + Export CSV no Admin (A5 deferido)
- [x] **Descoberta:** Umami Cloud exige `https://api.umami.is` com API key (Bearer) — token **server-side** no Worker (nunca no bundle)
- [x] Worker: `GET /admin/analytics` (atrás de `requireAdmin`) — proxy stats/devices/pages/countries/browsers (30 dias)
- [x] `Env` + `wrangler.toml`: `UMAMI_WEBSITE_ID` (público, vars) + `UMAMI_API_KEY` (secret → `wrangler secret put`)
- [x] `src/lib/api.ts` — `adminFetchAnalytics(token)`
- [x] `src/pages/Admin.tsx` — seção "Visitas (30 dias)" + totais + tabelas + **Export CSV**
- [x] typecheck front+worker · build · `wrangler deploy --dry-run` (bindings OK)
- [ ] ⏳ **Manual pós-deploy:** `wrangler secret put UMAMI_API_KEY` (não pode ir no repo)

## ✅ Fecho da Onda 1.22
- [x] `package.json` version → **1.22.0** · `CHANGELOG.md` `[1.22.0]`
- [x] Commit

---

# Plano de Melhorias — Onda 1.21 (pós-análise profunda, 2026-08-30)

> Análise profunda (3 auditorias + verificação manual) → plano registrado e executado **por fases**. Decisões do usuário anotadas em cada item.

## Objetivo
Endurecer o backend (segurança/robustez), corrigir bugs frontend + i18n/a11y/SEO, cortar perf do bundle inicial, limpar CI/qualidade/testes e sincronizar docs.

## Fase A — Segurança/robustez (Worker + Supabase)
- [x] A1 Admin por allowlist de email (`ADMIN_EMAILS = cavalcanteprofissional@outlook.com`) — `requireAdmin` → **401** (token inválido) vs **403** (sessão válida fora da lista)
- [x] A2 Validação no edge (urgencia no enum; caps nome/email/whatsapp/cpf/descricao/itens/qtd → 422; JSON mal-formado → 400)
- [x] A3 Erros mapeados 400/401/403/404/422/500 sem vazar internals (hoje tudo vira 500)
- [x] A4 Rate-limit por IP no `POST /orcamento` (5/h, 429 + Retry-After) — decisão usuária: **rate-limit simples**, sem Turnstile
- [x] A5 Emails não-fatais pós-persistência (falha de Brevo não vira 500) + `/admin/aprovar` idempotente (rejeita transição de estado terminal)
- [x] A6 Escapar HTML em `email.ts` (campos do usuário)
- [x] A7 Preços **não públicos** — decisão usuária — `GET /services` projeta `(slug, name, description, repo, active)`; migração SQL aplicada (✅ 2026-08-30): `REVOKE ALL on services FROM anon` + VIEW `services_public` + `GRANT SELECT`
- [x] A8 `service_role` rotacionada ✅ (2026-08-30)

## Fase B — Frontend: bugs + i18n/a11y/SEO
- [x] B1 `html lang` + `document.title` sincronizados com o idioma; CookieConsent via `i18n` (hoje lê `documentElement.lang` estático → trava em PT)
- [x] B2 Focus trap + Escape + restore (QuoteModal, Nav mobile, CookieConsent)
- [x] B3 aria-labels hardcoded PT/EN → chaves i18n (Nav:116/155/183/194, QuoteModal:131, BootScreen:223, ErrorBoundary, Experience:135) + ajuste e2e
- [x] B4 TechStack toggle `div`→`button` (aria-pressed); aria-pressed nos toggles de serviço; aria-expanded em Skills
- [x] B5 ES FAQ `Atendo`→`Atiendo`; traduzir `project.16.title` e `experience.6.company`
- [x] B6 Fix `group-hover` em Portfolio (falta `group` no card)
- [x] B7 `wf()` com `AbortSignal.timeout(12s)` + abort no close + guarda `available()`

## Fase C — Perf
- [x] C1 `ProfileLight` lazy + Suspense (remove typegpu/~700KB do entry)
- [x] C2 Remover preload eager dos 9 chunks (App.tsx)
- [x] C3 Deletar `mouseStore` (escrito 60fps, nunca lido)
- [x] C4 `manualChunks` vendors (se viável)

## Fase D — CI/qualidade/testes
- [x] D1 Corrigir `typecheck` (hoje no-op: `tsc --noEmit` em tsconfig `files: []`)
- [x] D2 CI: lint + typecheck + Playwright (pós-build)
- [x] D3 Gate do passo `Check HF_TOKEN` para `main` (não roda em PR/fork)
- [x] D4 `package.json` version→1.21.0 + `engines.node≥20.19` + remover dep morta `i18next-browser-languagedetector`
- [x] D5 Novos e2e: pageerror/console checker global, fluxo quote modal, admin mínimo, persistência lang/theme, asserts `html lang`/title

## Fase E — Docs + UX
- [x] E1 Sincronizar CONTENT.md (status projetos, stats, hero title, swap ZENTS/Rebualf, `2026pro`, slug LinkedIn, base `/portfolio/`, seção Showcase removida, contagens, `23.` duplicado)
- [x] E2 Boot mais rápido — decisão usuária: **reduzir tempo da animação** (MIN_BOOT_MS 1800→800, TICK_MS 2→1, SECTION_PAUSE/OK_DELAY/LINE_GAP/PROMPT_DELAY menores, TYPE_STEP maiores)
- [x] E3 Limpeza topo TODO.md (prefixo perdido na linha 1)
- [x] E4 CHANGELOG 1.21.0

## 🧰 Decisões de design (registradas)
- **Bola de luz/scroll na foto de perfil** (`ProfileLight.tsx` wheel `preventDefault`): **comportamento intencional** — o scroll controla a luz. Não corrigir; sem alteração. (Não é bug.)

## ⏳ Pendências manuais abertas (revisitar na Fase E)
- [x] Supabase: criar usuário admin (Auth → Users) p/ login `admin.html` ✅ (2026-08-30)
- [x] Supabase: aplicar migração A7 (`services_public`) ✅ (2026-08-30 — verificado: anon em `services` → 42501; `services_public` → 200 sem preços; worker `/services` OK)
- [x] Brevo: confirmar sender verificado ✅ (2026-08-30)
- [x] Umami: validar visita pós-aceite (Passo 7 original) ✅ (2026-08-30)
- [x] Rotação `service_role` (A8) ✅ (2026-08-30)

---

# Plano de Melhorias — 2ª Onda: Performance, SEO, i18n e Qualidade

## Data: 2026-06-15

## Objetivo
Corrigir issues críticas de performance, SEO, internacionalização e qualidade de código.

---

## Progresso

### 🔴 Críticas

| # | Tarefa | Status |
|----|--------|--------|
| C1 | Deletar `src/data/projects. json` (arquivo duplicado com espaço) | ✅ |
| C2 | Expandir Hero description EN/ES (13 → 38 palavras como PT) | ✅ |
| C3 | Traduzir Showcase — usar chaves i18n em vez de hardcoded PT | ✅ |
| C4 | Otimizar foto de perfil — PNG 2.3MB removido, só WebP 28KB | ✅ |
| C5 | Desligar sourcemaps em produção (`vite.config.ts`) | ✅ |
| C6 | Corrigir JSON-LD image URL (faltando `/images/`) | ✅ |
| C7 | **BootScreen fix** — splash fora da `#root` trava "Booting_" + img quebrada | ✅ |
| C7a | ┣ Mover splash para dentro de `#root` (React limpa naturalmente) | ✅ |
| C7b | ┣ Trocar img externa por texto "LC" no preloader CSS (elimina path quebrado) | ✅ |
| C7c | ┣ Remover `useEffect` de remoção da splash do `BootScreen.tsx` | ✅ |
| C7d | ┣ Fallback timeout 5s no `<script>` inline (segurança) | ✅ |
| C7e | ┗ Removido logo do componente (autenticidade de POST de placa-mãe) | ✅ |

### 🟡 Altas

| # | Tarefa | Status |
|---|--------|--------|
| H1 | Adicionar `loading="lazy"` + `width`/`height` em todas imagens | ✅ |
| H2 | Traduzir skip-to-content link + scroll-to-top aria-label | ✅ |
| H3 | Adicionar Error Boundary | ✅ |
| H4 | Corrigir OG meta tags (width/height, URL absoluta) | ✅ |
| H5 | Otimizar `mako.svg` (388KB → 216KB, svgo aplicado) | ✅ |
| H6 | Usar `experience.companyKey` para traduzir nome da empresa | ✅ |

### 🆕 Novos

| # | Tarefa | Status |
|---|--------|--------|
| N1 | Adicionar JobMatch AI ao portfólio (projeto id 14) | ✅ |
| N2 | BootScreen — tela de inicialização estilo BIOS | ✅ |
| N2a | ┣ Criar `BootScreen.tsx` com 30 linhas sequenciais (80ms) e 14 projetos | ✅ |
| N2b | ┣ Integrar em `App.tsx` com `AnimatePresence` + `sessionStorage` | ✅ |
| N2c | ┣ Fundo `bg-background` + overlay `bg-gradient-blue-dark` (match Hero) | ✅ |
| N2d | ┣ Logo `logo-navbar-darkmode.png` centralizada no topo | ✅ |
| N2e | ┣ Preloader CSS inline no `index.html` (sem flash de tela branca) | ✅ |
| N2f | ┣ BootScreen refatorado para BIOS POST autêntico (CPU/RAM/GPU/dispositivos) | ✅ |
| N2g | ┗ Barrel export + TODO.md + build aprovado | ✅ |

### 🔵 Médias

| # | Tarefa | Status |
|---|--------|--------|
| M1 | Code splitting com `React.lazy()` para seções abaixo da dobra | ✅ |
| M2 | Scripts npm: `test`, `typecheck`, `format` | ✅ |
| M3 | Corrigir `Companies.tsx` dark mode — dead code removido | ✅ |
| M4 | Stats derivados dos dados reais em vez de hardcoded | ✅ (substituído por fixo 6+) |
| M5 | Framer Motion respeitar `prefers-reduced-motion` | ✅ |
| M6 | Showcase description completa no i18n (2 frases como CONTENT.md) | ✅ |

### ⚪ Baixas

| # | Tarefa | Status |
|---|--------|--------|
| N3 | Desabilitar seção Showcase temporariamente (removida de App.tsx e Nav) | ✅ |
| N4 | Corrigir anos experiência no Stats — fixo "6+" em vez de cálculo dinâmico | ✅ |
| N5 | Adicionar CD Price Tracker (project.15) — projects.json, i18n, Portfolio, BootScreen, CONTENT.md | ✅ |
| N6 | Mobile UX: aumentar touch targets Hero (px-3 py-2 → px-4 py-3) e Nav (p-2 → p-2.5) | ✅ |
| N7 | Mobile UX: aria-hidden em todos os ícones decorativos (lucide-react) | ✅ |
| N8 | Mobile UX: TechStack tooltip com suporte a click/touch | ✅ |
| N9 | Mobile UX: touch-pan-y no scroll horizontal do Experience | ✅ |
| N10 | Mobile UX: reduzir py-24 → py-16 md:py-24 em seções leves (Languages) | ✅ |
| N11 | Mobile UX: TechStack ícones 64px uniformes (w-16 h-16) + w-8 h-8 | ✅ |
| N12 | Hero: reordenar mobile — Nome → Foto → demais elementos (availability/title/desc/buttons) | ✅ |
| N13 | Nav: logo agora faz smooth scroll ao topo (igual ScrollToTop) | ✅ |
| N14 | BootScreen: AudioContext adiado para primeiro gesto do usuário (elimina warning) | ✅ |
| L1 | Trocar `key={index}` no TechStack por `tech.name` | ✅ |
| L2 | Inline style do Experience → classe CSS | ✅ |
| L3 | Juntar imports do Footer num único statement | ✅ |
| L4 | Version `1.0.0` no package.json | ✅ |
| R1 | Renomear rota `#portfolio` → `#projects` (Portfolio.tsx, Nav.tsx, e2e) | ✅ |

---

### 🌟 PoolEffect — Glow Background com Mouse Tracking

| # | Tarefa | Status |
|---|--------|--------|
| P1 | Criar `PoolEffect.tsx` — radial-gradient azul seguindo o mouse com lerp suave | ✅ |
| P2 | Export no barrel `components/index.ts` | ✅ |
| P3 | Integrar no `App.tsx` antes do `<main>` | ✅ |
| P4 | Usar `hsl(var(--primary) / X)` para alinhar com tema claro/escuro | ✅ |
| P5 | Verificar typecheck e build | ✅ |

---

### 🗺️ Mapa Blueprint de Fortaleza no Hero

| # | Tarefa | Status |
|---|--------|--------|
| M1 | Mover SVG para `public/images/map/fortaleza-blueprint.svg` | ✅ |
| M2 | Adicionar como background no Hero com opacidade (10% light / 5% dark) | ✅ |
| M3 | Adicionar location card (Fortaleza/CE) na coluna direita (desktop) | ✅ |
| M4 | Trocar cor do ping dot de verde para `bg-primary` | ✅ |
| M5 | Reorganizar Hero: unificar imports, remover foto duplicada, mobile/desktop | ✅ |
| M6 | Verificar typecheck e build | ✅ |

---

### 🚨 Hotfix — GitHub Pages Tela Branca (2026-07-25)

| # | Tarefa | Status |
|---|--------|--------|
| F1 | Merge do commit remoto `deb71ab` (status field) no branch local divergente | ✅ |
| F2 | Garantir `base: '/portfolio-cavalcante/'` no `vite.config.ts` (bate com nome do repo) | ✅ |
| F3 | Push para `origin/main` — workflow deploy corrige o GitHub Pages | ✅ |

**Causa:** branches divergidas — remoto tinha `base: '/portfolio/'` mas o site serve em `/portfolio-cavalcante/`, gerando 404 em todos os assets JS/CSS.

---

## V1 Concluída (17 tarefas)
- FAQ JSON-LD, icon map, dead code, Showcase section, Nav ativo, overlay, scroll-to-top, divisores, card width, dark mode logos, skip-to-content, reduced-motion, Nav/Hero separados, Playwright E2E, OG card image (WhatsApp thumbnail), robots.txt (permite facebookexternalhit), migrar URLs do domínio personalizado para github.io

---

### 🚀 Pipeline de Currículo (PT/EN/ES → PDF)

| # | Tarefa | Status |
|---|--------|--------|
| CV1 | Registrar plano no TODO.md | ✅ |
| CV2 | Mover `curriculo-fonte.md` e `SKILL-pipeline-curriculo.md` para `resume/` | ✅ |
| CV3 | Criar `resume/overrides.en.yml` e `resume/overrides.es.yml` (vazios) | ✅ |
| CV4 | Criar `resume/template.html` (layout CV HTML/CSS, paleta portfólio) | ✅ |
| CV5 | Criar `resume/translate.py` (mBART-large-50 + glossário + overrides) | ✅ |
| CV6 | Criar `resume/render_pdf.py` (Playwright → PDF A4) | ✅ |
| CV7 | Criar `resume/build.py` (orquestrador: parse → traduz → renderiza) | ✅ |
| CV8 | Atualizar `.gitignore` (resume/output/, public/cv/*.pdf) | ✅ |
| CV9 | Remover PDFs antigos `public/documents/resumes/` | ✅ |
| CV10 | Integrar steps Python no `deploy.yml` (antes do npm ci) | ✅ |
| CV11 | Atualizar i18n paths dos CVs (`/cv/cv_{lang}.pdf`) | ✅ |
| CV12 | Atualizar `Hero.tsx` — botões CV por idioma (PT/EN/ES) | ✅ |
| CV13 | Validar PDFs gerados e links no frontend | ✅ |
| CV14 | Hero: voltar para 1 botão CV dinâmico por idioma (remover 3 botões) | ✅ |
| CV15 | Bug: `cargo` em experiencia_profissional não é traduzido (EN/ES) | ✅ |
| CV16 | ~~Bug: tradução MarianMT com artefatos de encoding ("experienceCIa")~~ Resolvido: trocado para mBART-large-50 | ✅ |
| CV17 | Qualidade mBART: frases curtas sem contexto ainda paraphraseiam (ex: "Formacao" → "Academic Formula") — usar overrides.en.yml/es.yml | ✅ v1.22.0 |
---

### 🚨 Hotfix — Deploy quebrado: mBART tokenizer sem protobuf/tiktoken (2026-07-28)

| # | Tarefa | Status |
|---|--------|--------|
| D1 | Adicionar `protobuf` e `tiktoken` ao `pip install` no `deploy.yml` | ✅ |

**Causa:** O tokenizer do `facebook/mbart-large-50-many-to-many-mmt` precisa de `protobuf` (SentencePieceExtractor) e `tiktoken` (leitura do arquivo `.tiktoken`) em tempo de execução. O CI instalava apenas `transformers torch sentencepiece sacremoses jinja2 python-frontmatter pyyaml playwright` — sem esses dois pacotes, o `resume/build.py` quebrava com `ImportError` e `ModuleNotFoundError`.

---

### 🧰 TechStack — Agrupamento + Grade Responsiva (2026-08-02)

| # | Tarefa | Status |
|---|--------|--------|
| T1 | Agrupar 28 techs em 6 grupos (Linguagens, IA/ML, Data Science, Frontend, Backend, DevOps) | ✅ |
| T2 | Adicionar labels dos grupos em i18n pt/en/es (`techstack.groups.*`) | ✅ |
| T3 | Grade responsiva dos cards: mobile 2×3 (`grid-cols-2`), desktop/tablet 3×2 (`md:grid-cols-3`), sem card, `items-start` | ✅ |
| T4 | Verificar typecheck e build | ✅ |
| T5 | Título dos grupos com altura fixa (`min-h-12`) + centralizado verticalmente — alinha a 1ª linha de ícones entre cards (fix Data Science × Frontend no mobile) | ✅ |
| T6 | Grade interna de ícones por card: 3 por linha (md+) / 2 por linha (mobile), colunas `auto` + `justify-center` (ícones agrupados, não esticados) | ✅ |
| T7 | Forçar exatamente 2 linhas de ícones por card no desktop (`lg:grid-rows-[repeat(2,4rem)]`) | ✅ |
| T8 | Aplicar 2 linhas + 3 colunas também no tablet (`md:`), com `md:gap-2` para caber em 768px | ✅ |
| T9 | Verificar typecheck e build | ✅ |
| T10 | Remover Power BI do grupo Data Science (5 techs no grupo) — sem evidência de uso em projetos | ✅ |
| T11 | Remover import `FaChartBar` (agora sem uso) e verificar typecheck e build | ✅ |

---

### 🎬 BootScreen — Preloader Proporcional ao Carregamento (2026-08-02)

| # | Tarefa | Status |
|---|--------|--------|
| B1 | Pacing proporcional: `CHAR_DELAY` derivado do total de caracteres para preencher piso de 2500ms (legível, nunca flash) | ✅ |
| B2 | `loaded` via `document.readyState`/`window.load` + fallback — boot só termina após página carregada | ✅ |
| B3 | Auto-proceed `loaded && elapsed >= MIN_BOOT_MS` (intervalo 100ms) + skip manual preservado (tecla/clique) | ✅ |
| B4 | Animações de entrada: Nav `y:-80`, Hero `y:60`, Footer `y:40 + scale:.97` (ease `[0.16,1,0.3,1]`) | ✅ |
| B5 | Nav/Hero/Footer montados apenas após `booted` (`{booted && ...}` — sem flash de seções durante o boot) | ✅ |
| B6 | Centralizar prontidão no `App.tsx`: `resourcesReady` = `window.load` + todos os chunks lazy (Companies→Contact) + fallback 8s | ✅ |
| B7 | BootScreen recebe prop `ready` (removeu controle `loaded` interno duplicado); auto-proceed agora `ready && elapsed >= 2500ms` | ✅ |
| B8 | Verificar typecheck e build | ✅ |

---

### 🎬 BootScreen — Overhaul: Tela Cheia, CRT, Som e Conteúdo (2026-08-02)

#### 🔴 Fix — Assimetria / Bugs
| # | Tarefa | Status |
|---|--------|--------|
| F1 | Normalizar indentação das linhas de módulos — `jobmatch-ai`/`cd-price-tracker` com 4 espaços extras vs. demais | ✅ |
| F2 | Unificar áudio: reusar `window.__bootAudioCtx` (index.html) em vez de criar AudioContext paralelo; ouvir `pointerdown`+`keydown` | ✅ |

#### 🖥️ Tela Cheia Ponta a Ponta (Responsive)
| # | Tarefa | Status |
|---|--------|--------|
| R1 | Trocar container `max-w-xl` por `w-full` com padding responsivo (`px-3 sm:px-8 lg:px-16 py-8 sm:py-12`) | ✅ |
| R2 | Fonte responsiva por viewport: `text-[11px] sm:text-sm md:text-base lg:text-lg` — linha mais longa não estoura no mobile | ✅ |
| R3 | Moldura de "monitor": frame inset com `border` + glow em `--primary` | ✅ |

#### 🎨 Visual CRT (Paleta do Portfólio)
| # | Tarefa | Status |
|---|--------|--------|
| V1 | Scanlines: overlay `repeating-linear-gradient`, `pointer-events-none` | ✅ |
| V2 | Vignette CRT: `radial-gradient` escurecendo cantos | ✅ |
| V3 | Flicker sutil em keyframes + desabilitado em `prefers-reduced-motion` | ✅ |
| V4 | Glow do texto: `text-shadow` em hsl `--primary` | ✅ |
| V5 | `[OK]` ciano com pop de escala ao aparecer (separado do texto digitado) | ✅ |

#### 📝 Conteúdo das Linhas
| # | Tarefa | Status |
|---|--------|--------|
| C1 | Adicionar `linktree-cavalcante [Next.js + Three.js]` (16º módulo, alinha com `projects.json` id 16) | ✅ |
| C2 | Bump de versão da última linha: `v2.4.1` → `v2.5.0` | ✅ |
| C3 | Linhas estruturadas `{ text, dots, ok, type }` com indentação consistente | ✅ |

#### 🔊 Som — POST + Chime, Mutável
| # | Tarefa | Status |
|---|--------|--------|
| S1 | Criar `bootSound.ts`: `beep(freq, dur, type, vol)` com envelope de ganho | ✅ |
| S2 | Beep de POST (~1kHz, 100ms) ao completar o POST | ✅ |
| S3 | Chime de boas-vindas (3 tons) quando o boot termina | ✅ |
| S4 | Mudo com botão `Volume2`/`VolumeX`, persistido em `localStorage` | ✅ |
| S5 | Áudio só inicia após 1º gesto (`pointerdown`/`keydown`) — autoplay preservado | ✅ |

#### ⏱️ Timing / Pacing
| # | Tarefa | Status |
|---|--------|--------|
| T1 | Velocidade por tipo de linha: hardware mais lento, módulos/headers rápidos (steps fixos por tipo) | ✅ |
| T2 | `[OK]` com delay: digitar nome + dots → pausa → `[OK]` ciano com pop | ✅ |
| T3 | Pacing determinístico com `TICK_MS` (4ms) + `TYPE_STEP` por tipo — corrige clamp de setTimeout; piso de 2800ms | ✅ |
| T4 | Manter auto-proceed `ready && elapsed >= MIN_BOOT_MS` + skip manual | ✅ |

#### 🧪 Verificação
| # | Tarefa | Status |
|---|--------|--------|
| B1 | `npm run typecheck` e `npm run build` | ✅ |
| B2 | Atualizar `CHANGELOG.md` (bump `1.6.1` → `1.7.0`) | ✅ |

---

### 🎯 Hero — Layout Tablet (2 colunas) + Mobile (ordem preservada) (2026-08-02)

| # | Tarefa | Status |
|---|--------|--------|
| H1 | Grid `lg:grid-cols-2` → `md:grid-cols-2` (2 colunas a partir de 768px) | ✅ |
| H2 | Foto mobile `lg:hidden` → `md:hidden` (some no tablet) | ✅ |
| H3 | Foto desktop `hidden lg:block` → `hidden md:block` (aparece no tablet, coluna direita) | ✅ |
| H4 | Nome `text-4xl md:text-6xl` → `text-4xl lg:text-6xl` (text-6xl estoura coluna do tablet; desktop mantém 6xl) | ✅ |
| H5 | Título `text-xl lg:text-lg lg:whitespace-nowrap` → `text-xl md:text-lg md:whitespace-nowrap` | ✅ |
| H6 | Desktop inalterado (classes de foto/fonte mantidas) | ✅ |
| H7 | Verificar typecheck, build e Playwright DOM (375px / 768px / 1024px, sem overflow) | ✅ |

---

### 🎯 Hero — Mobile centralizado + Badge acima do nome + Bio colapsável + Título curto + Efeito foto LinkTree (2026-08-03)

| # | Tarefa | Status |
|---|--------|--------|
| M1 | Badge "Disponível para projetos" movido para acima do nome em todos os viewports, menor (`text-xs`, `px-3.5 py-1.5`) | ✅ |
| M2 | Mobile: tudo centralizado (`text-center md:text-left` + botões `justify-center md:justify-start`) | ✅ |
| M3 | Mobile: nome "Lucas Cavalcante" abaixo da foto (foto movida para antes do `h1`) | ✅ |
| M4 | Título alterado para "Analista de Dados & IA" em todos os viewports (i18n pt/en/es) | ✅ |
| M5 | Bio mobile com expand/collapse animado, acionada pelo próprio título "Analista de Dados & IA" (chefão + chevron rotaciona, hover scale, estado selected em primary) | ✅ |
| M6 | Desktop/tablet: descrição sempre visível, gatilho/toggle oculto (`md:hidden`) | ✅ |
| M7 | Efeito foto de perfil do LinkTree (`.glow-hover` + overlay escuro com ícone GitHub no hover) aplicado na foto mobile e na lateral, todas as viewports | ✅ |
| M8 | Verificar typecheck, build e Playwright DOM (375px / 768px / 1024px) | ✅ |

---

### 🎯 Hero — Botões (grid 1×2), WhatsApp, efeito foto e badge (2026-08-03)

| # | Tarefa | Status |
|---|--------|--------|
| N1 | Grid de botões 1 coluna × 2 linhas em todas as viewports: linha 1 só email, linha 2 os demais | ✅ |
| N2 | Botão WhatsApp adicionado (`wa.me/5585996859051`, ícone MessageCircle) | ✅ |
| N3 | Garantir exatamente 2 linhas (sem wrap): mobile = círculos de ícone; md+ = pills com texto | ✅ |
| N4 | Desktop/tablet: pills com texto (`text-[10px] lg:text-xs`); email expandido (`px-5 py-3.5`, `max-w-xs md:max-w-md`) | ✅ |
| N5 | Linha 2 com `justify-between` distribuída na mesma largura do email; mobile alinhado à mesma largura (`max-w-xs`) | ✅ |
| N6 | Distância entre as linhas aumentada (`gap-y-6`) | ✅ |
| N7 | Mobile: grid de botões movido para dentro do expand/collapse da bio (0 → 296px); desktop/tablet wrapper `hidden md:block` | ✅ |
| N8 | Efeito foto LinkTree respeita bordas arredondadas — `rounded-2xl` no anchor (glow acompanha os cantos) | ✅ |
| N9 | Badge da assinatura centralizada na borda/quia inferior direita em todas as viewports | ✅ |
| N10 | Verificar typecheck, build e Playwright DOM (320/375/768/1024px) | ✅ |

---

### 🎬 BootScreen — Digitação mais rápida + texto borda a borda + Glow 3x (2026-08-03)

| # | Tarefa | Status |
|---|--------|--------|
| B1 | Acelerar digitação mantendo auto-avanço: `TICK_MS` 4→3ms, steps por tipo (hw 5→7, module/info/footer 8→12, header 10→14), `OK_DELAY` 40→24, `SECTION_PAUSE` 80→60, `LINE_GAP` 12→8, `PROMPT_DELAY` 200→160; `MIN_BOOT_MS` continua 2800ms (prompt ~1.35s antes ~2.18s) | ✅ |
| B2 | Texto borda a borda — remover moldura de "monitor" (frame inset + glow) e paddings laterais (`px-3 sm:px-8 lg:px-16`); container `w-full` edge-to-edge | ✅ |
| B3 | Glow do mouse 3x durante o boot — `PoolEffect` com prop `intense` (tamanho 288→864px, alphas ×3, blur 25→60px, z-[65] sobre a tela de boot); `App.tsx` passa `intense={!booted}` | ✅ |
| B4 | Bump versão do boot `v2.5.0` → `v2.6.0` (BootScreen + CONTENT.md) | ✅ |
| B5 | `CHANGELOG.md` bump `1.8.0` → `1.9.0` | ✅ |
| B6 | Verificar typecheck e build | ✅ |

---

### ✨ Revelação coordenada ao fim do boot — Focus Reveal (2026-08-03)

| # | Tarefa | Status |
|---|--------|--------|
| R1 | Background fade-in (foco de câmera): `<main>` → `motion.main` com `opacity 0→1`, `scale 1.03→1`, `blur(8px)→0` (0.9s, ease `[0.16,1,0.3,1]`) acionado por `booted` | ✅ |
| R2 | Crossfade escuro → tema: overlay `fixed inset-0 z-[45]` cor do boot (`hsl(215 45% 8%)`), `opacity 1→0` (0.8s, delay 0.05) — abaixo do glow intenso (z-65) e do boot (z-50) | ✅ |
| R3 | Glow do mouse "assenta" sem pop: `PoolEffect` com 2 camadas cross-fade (864px/×3/blur 60 ↔ 288px/blur 25, 0.6s) + estado `settling` (container z-[65] por 600ms → z-0) | ✅ |
| R4 | Nav desliza de fora da tela: `y:'-100%'→0` (antes `y:-80`), 0.7s, delay 0.05 | ✅ |
| R5 | Hero com subida + assentamento: `y:80→0` + `scale 0.99→1` (0.8s, delay 0.1); delays dos filhos reduzidos (~0.05s) | ✅ |
| R6 | Footer sobe de baixo (`y:60→0`, delay 0.15) com ícones em stagger de ~30ms | ✅ |
| R7 | Reduced-motion global: `<MotionConfig reducedMotion="user">` no App (opacidade mantida, transform/layout desativados) | ✅ |
| R8 | `CHANGELOG.md` bump `1.9.0` → `1.10.0` | ✅ |
| R9 | Verificar typecheck e build | ✅ |

---

### 🚀 LinkTree Pessoal — Card finalizado + Renome (2026-08-03)

| # | Tarefa | Status |
|---|--------|--------|
| L1 | Status do projeto id 16 em `projects.json` alterado de `andamento` → `concluido` | ✅ |
| L2 | Título renomeado "LinkTree Cavalcante" → "LinkTree Pessoal" no i18n (pt/en/es) | ✅ |
| L3 | `CONTENT.md` seção 8 — cabeçalho `(15 Projetos)` → `(16 Projetos)` + linha do projeto 16 nas duas tabelas (status `concluido`, nome "LinkTree Pessoal") | ✅ |
| L4 | `CHANGELOG.md` bump `1.10.0` → `1.11.0` | ✅ |
| L5 | Verificar typecheck e build | ✅ |

---

### 🎬 Framework de Motion Graphics — Motor único motion.dev + Orquestração do boot (2026-08-04)

| # | Tarefa | Status |
|---|--------|--------|
| G1 | Migrar framer-motion → `motion/react` (npm i motion && npm uninstall framer-motion; trocar imports em 16 arquivos) | ✅ |
| G2 | Criar `src/lib/motion/tokens.ts` (EASE, durações, VIEWPORT, STAGGER, BOOT_TIMELINE) | ✅ |
| G3 | Criar `src/lib/motion/variants.ts` (fadeUp, fadeIn, scaleIn, focusReveal, staggerContainer/Child) | ✅ |
| G4 | Criar `src/lib/motion/Reveal.tsx` (whileInView com direction/delay/blur) | ✅ |
| G5 | Criar `src/lib/motion/SectionHeader.tsx` (título + underline + subtítulo) | ✅ |
| G6 | Criar `src/lib/motion/Stagger.tsx` (container/children) + barrel `index.ts` | ✅ |
| G7 | Criar `src/stores/bootStore.ts` (zustand: booted/setBooted) | ✅ |
| G8 | Orquestração fim do boot: Nav, Hero (stagger), Stats, Footer via BOOT_TIMELINE | ✅ |
| G9 | Refatorar Stats, Companies, TechStack, Experience, Portfolio, Skills, Certifications, Languages, FAQ, Contact para Reveal/SectionHeader/Stagger | ✅ |
| G10 | Verificar typecheck, build, lint, Playwright; teste manual 320/375/768/1024 | ✅ |
| G11 | CHANGELOG bump + TODO.md | ✅ |

> Nota (atualizada 2026-08-04): lint, typecheck, build e Playwright passam (24/24 em modo CI). As 6 falhas pré-existentes de e2e (referências a `#showcase`/`Showcase` removidos + timing do footer) foram corrigidas.

---

### 🔐 HF_TOKEN + Lint config + E2E fixes (2026-08-04)

| # | Tarefa | Status |
|---|--------|--------|
| H1 | `resume/translate.py` carrega `.env.local` sem sobrescrever env (CI/Secret tem precedência) | ✅ |
| H2 | Token HF real em `.env.local` (git-ignored; nunca commitado) | ✅ |
| H3 | `.env.example` com comentário corrigido (uso no CI via GitHub Secret + local via `.env.local`) | ✅ |
| H4 | README: instrução de `.env.local` agora condiz com a pipeline | ✅ |
| H5 | Criar `eslint.config.js` (flat: @eslint/js + typescript-eslint + react-hooks + react-refresh) | ✅ |
| H6 | Corrigir lint: BootScreen refs/purity/catch, bootSound catch, Nav mounted+currentLang, PoolEffect setState no effect, css.d.ts (remover `*.json` wildcard + declaração morta) | ✅ |
| H7 | E2E: nav `Showcase`→`Certificações`, remover `#showcase`, footer aguarda `toBeVisible()` | ✅ |
| H8 | Verificar lint 0 erros, typecheck, build, Playwright 24/24, `py_compile translate.py` | ✅ |

> 🔒 **Segurança**: o token HF foi compartilhado no chat — recomenda-se **rotacionar** (revogar/criar novo em https://huggingface.co/settings/tokens). Para o CI funcionar, o mesmo valor precisa estar como GitHub Secret `HF_TOKEN` no repositório.

---

### 🐛 Bug — Cards da seção Projetos invisíveis no mobile (2026-08-12)

| # | Tarefa | Status |
|---|--------|--------|
| P1 | Registrar bug no TODO.md | ✅ |
| P2 | **Aplicar Opção A** — `amount={0}` no `<Stagger>` do grid de projetos (`Portfolio.tsx`) | ✅ |
| P3 | Verificar typecheck e build | ✅ |
| P4 | **Confirmado visualmente no mobile** — cards da seção `#projects` agora aparecem ao rolar | ✅ |
| P5 | **Fallback (Opção B)** — reduzir `amount` global de `0.2` → `0.05` em `src/lib/motion/tokens.ts` | ⬜ |

**Sintoma:** apenas no viewport mobile, os cards da seção `#projects` não aparecem.

**Causa raiz:** `src/components/Portfolio.tsx` usa `<Stagger>` sobre o grid inteiro (17 cards). O `Stagger` (`src/lib/motion/Stagger.tsx`) aplica `viewport={VIEWPORT}` = `{ once: true, amount: 0.2 }` (`src/lib/motion/tokens.ts`). No motion, `amount: 0.2` exige que **20% do elemento animado** (o container do grid) esteja visível para disparar o `whileInView`; sem disparar, os filhos ficam no estado `hidden` (`opacity: 0`).

- **Desktop:** grid 3 colunas → container ~6 linhas (~2700px); 20% ≈ 540px cabe no viewport → dispara → cards aparecem.
- **Mobile:** grid 1 coluna → container ~8000px+; 20% ≈ 1600px > viewport (~700px) → limiar nunca atingido → `whileInView` nunca dispara → cards nunca aparecem.

Demais seções funcionam no mobile porque usam `Reveal` sobre blocos pequenos (20% facilmente atingível). O grid de projetos é o único com container enorme em coluna única.

**Correção (Opção A):** `amount={0}` dispara assim que qualquer parte do grid entra no viewport (comportamento padrão para listas longas), mantendo o stagger e sem afetar outras seções.

**Fallback (Opção B):** se a Opção A não resolver, mudar `amount: 0.2` → `amount: 0.05` em `src/lib/motion/tokens.ts` (afeta `Reveal`/`Stagger` globalmente).

---

### 🚀 Checklist Pré-Deploy — Correções da auditoria (2026-08-21)

> Origem: relatório de auditoria (10 resolvidos · 9 pendentes · 1 N/A) — checklist integral agora incorporado ao final deste arquivo. Esta onda corrige as pendências de esforço baixo (itens 1–6 da tabela de prioridades). Itens 7–9 (política de privacidade, GA4 + cookies, domínio próprio) ficam como decisão futura.

| # | Tarefa | Status |
|---|--------|--------|
| D1 | Registrar plano no TODO.md | ✅ |
| D2 | **404.html SPA fallback** — plugin Vite `closeBundle` copia `dist/index.html` → `dist/404.html` (funciona local e no CI sem tocar no deploy.yml) | ✅ |
| D3 | **sitemap.xml** — criar `public/sitemap.xml` (URL única do site) | ✅ |
| D4 | **robots.txt** — adicionar linha `Sitemap:` apontando para o sitemap.xml | ✅ |
| D5 | **Ícones PWA** — gerar `apple-touch-icon.png` (180×180) e `icon-{192,512}.png` a partir dos assets existentes (sharp) | ✅ |
| D6 | **Manifest** — criar `public/site.webmanifest` (name, theme_color `#0ea5e9`, ícones) | ✅ |
| D7 | **index.html** — links `apple-touch-icon`, `icon` PNG 192/512 e `<link rel="manifest">` | ✅ |
| D8 | **WhatsApp pré-preenchido** — chave i18n `cta.whatsappMsg` (pt/en/es) aplicada nos links `wa.me` de Hero.tsx, Contact.tsx e Footer.tsx (`encodeURIComponent`) | ✅ |
| D9 | **Footer.tsx** — Lattes `http://` → `https://lattes.cnpq.br/7686247677030579` | ✅ |
| D10 | **Slug LinkedIn padronizado** — Footer usa `cavalcante-Lucas` (igual Contact.tsx e index.html) | ✅ |
| D11 | Validar typecheck, lint, build (`dist/404.html` + sitemap + ícones presentes) e Playwright e2e | ✅ |
| D12 | Atualizar `CHANGELOG.md` (bump `[1.15.0]`) e marcar itens corrigidos no `checklist-pre-deploy.md` | ✅ |
| D13 | **E2E dos artefatos** — `e2e/artifacts.spec.ts`: 404≡index, schema sitemap, robots Sitemap:, manifest JSON+ícones, dimensões PNG (IHDR), HTTP 200 dos artefatos e mensagens wa.me por idioma (10 testes × 2 projetos) | ✅ |
| D14 | Fix extra achado pelo D13 — i18n `contact.linkedin` usava slug `cavalcante-lucas` nos 3 idiomas → padronizado `cavalcante-Lucas`; links de ícones/manifest no index.html convertidos para root-relative (dev server não duplica mais a base) | ✅ |
| D15 | **Validação manual pelo usuário** antes do commit/push (roteiro: WhatsApp em 3 idiomas, manifest no DevTools, 404 pós-deploy, celular físico) | ⬜ |

> Nota (2026-08-21): suíte completa local com `--workers=1` → **44/44 passed**. Com workers paralelos a suíte tem flakiness pré-existente de timing do BootScreen (falhava 3 testes também no baseline sem mudanças).

---

### 🔵 Favicon da marca (esfera neon) + Áudio do boot (2026-08-21)

> Origem: feedback da validação manual da v1.15.0. Ícones derivam de arte própria do usuário (`favicon.ai` → export PNG 512). Sons novos: sweep inicial + arpejo por [OK]; POST beep e chime final preservados.

| # | Tarefa | Status |
|---|--------|--------|
| F1 | Registrar plano no TODO.md | ✅ |
| F2 | Promover export do usuário `1x/favicon.png` → `public/icons/logo-512.png` (arte mestre 512×512, esfera neon flutuante c/ alfa) | ✅ |
| F3 | Criar `scripts/generate-icons.mjs` (sharp): abas com transparência (`icon-192/512`) · opacos compostos sobre navy `#0F172A` (`icon-180` apple-touch + `maskable-192/512`) · composição de fundo automática à prova de exports futuros | ✅ |
| F4 | Gerar **`favicon.ico` real** (ICONDIR binário + 3 entradas PNG 16/32/48 embutidas) em `public/favicon.ico` — substitui o PNG 16×16 renomeado legado | ✅ |
| F5 | Script npm `"icons"` + apagar diretório temporário `1x/`; `favicon.ai` versionado em `branding/` | ✅ |
| F6 | `site.webmanifest`: `background_color #0F172A` + ícones `purpose: maskable` | ✅ |
| F7 | `.gitignore`: ignorar temporários do Adobe Illustrator (`~ai-*.tmp`), mantendo o `.ai` versionado | ✅ |
| F8 | **Som inicial do boot** — `playBootStart()`: whoosh de ruído branco filtrado subindo 160→2800 Hz (~320 ms, envelope de swell) no mount — textura única na paleta (único som não tonal), guarda ref p/ StrictMode | ✅ |
| F9 | **Som por [OK]** — `playOkBlip(step)`: arpejo pentatônico ascendente em ciclo (A5·B5·C#6·E6·F#6, triangle, 45 ms, vol ~0.055), respeitando mute | ✅ |
| F10 | POST beep ("POST complete") e chime final **preservados** sem alteração | ✅ |
| F11 | E2E dos artefatos atualizados: `.ico` real (ICONDIR ≥ 3 entradas), `icon-180` 100% opaco, `background_color #0F172A`, dimensões 180/192/512 | ✅ |
| F12 | README atualizado (seção ícones/branding + script `icons`); `CHANGELOG.md` bump `[1.15.1]`; nota no `checklist-pre-deploy.md` | ✅ |
| F13 | Validação completa: `npm run icons` → typecheck · lint · build · Playwright completo (`--workers=1`) | ✅ |

---

### 📋 Checklist Pré-Deploy — Auditoria completa (2026-08-21)

> Incorporado de `checklist-pre-deploy.md` (arquivo removido nesta versão). **Auditoria executada em 21/08/2026** (build local + Lighthouse via Edge headless + curl nos links). Resultado inicial: **10 resolvidos · 9 pendentes · 1 N/A** → após correções v1.15.0/v1.15.1: **13 resolvidos · 7 pendentes**.
>
> Use este checklist para validar o projeto antes de publicar. Marque cada item conforme for verificando/corrigindo.

#### 1. Responsividade e UX
- [ ] **Abrir no celular** — testar o layout completo em viewport mobile (não só redimensionar a janela do desktop)
  - ↳ *Requer ação manual* (dispositivo físico). Evidência estática favorável: `viewport-fit=cover` (index.html:6), breakpoints `sm:`/`md:` em todas as seções, menu hambúrguer (Nav.tsx:195). O commit `91cc452` já corrigiu cards ocultos no mobile.
- [x] **Testar formulário** — enviar um teste real em cada formulário do site e confirmar que o envio funciona (front e back-end)
  - ↳ **N/A**: o site não possui formulário. Contato exclusivamente por links (`mailto:`, WhatsApp, LinkedIn) em Contact.tsx:6-10.
- [x] **Clicar no WhatsApp** — validar que o link/botão de WhatsApp abre corretamente com número e mensagem pré-preenchida
  - ↳ Links válidos e HTTP 200: Hero.tsx:39, Contact.tsx:8, Footer.tsx:28 (`wa.me/5585996859051`). **Corrigido (v1.15.0)**: mensagem pré-preenchida via `?text=` com chave i18n `cta.whatsappMsg` (pt/en/es) + `encodeURIComponent`.

#### 2. Roteamento e Domínio
- [x] **Página 404** — criar/testar página de erro 404 customizada (não a padrão do host)
  - ↳ **Corrigido (v1.15.0)**: plugin Vite `gh-pages-spa-404` copia `dist/index.html` → `dist/404.html` ao fim do build (`vite.config.ts`); validado no build local. Teste real da rota 404 após o próximo deploy.
- [ ] **Domínio próprio** — confirmar que o site está apontando para o domínio final, não para o subdomínio de deploy (ex: vercel.app, github.io)
  - ↳ *Decisão pendente*: canonical, og:url e JSON-LD apontam para `cavalcanteprofissional.github.io/portfolio-cavalcante/` (index.html:10,19,43). Se haverá domínio próprio, atualizar essas URLs + CNAME/DNS; se o endereço atual é o destino final, marcar como resolvido.
- [x] **HTTPS** — certificado SSL ativo e válido, sem conteúdo misto (mixed content) bloqueado pelo navegador
  - ↳ OK: GitHub Pages força HTTPS; nenhum recurso `http://` é carregado pela página (verificado no código e ao vivo). Única URL insegura é link externo do Lattes (Footer.tsx:18) — funciona, mas vale trocar por `https://`.

#### 3. Performance
- [x] **PageSpeed** — rodar Google PageSpeed Insights / Lighthouse e revisar métricas (LCP, CLS, TBT)
  - ↳ Lighthouse local (Edge headless, emulação mobile, sobre o build de produção): **Perf 91 · A11y 99 · Best Practices 96 · SEO 100** | FCP 2,2s · **LCP 2,8s** · TBT 170ms · **CLS 0,022** · SI 2,2s. Bundle principal 448KB→142KB gzip com code-splitting por seção. Falhas menores: `svg-img-alt` (falso-positivo — Hero.tsx:83 usa `alt=""` + `aria-hidden`, padrão correto p/ decorativa) e `image-aspect-ratio`. Recomendado revalidar PSI na URL de produção.
- [x] **Comprimir imagens** — otimizar/compactar todas as imagens (WebP/AVIF quando possível, lazy loading)
  - ↳ Foto de perfil em WebP (337×450), `loading="lazy"` nas imagens fora da dobra (Companies.tsx:35, Nav.tsx:126, Hero.tsx:137/232), `eager` apenas no hero (correto p/ LCP). `og/card.png` (1200×630 ✓) só é consumido por crawlers. `svgo`+`sharp` presentes nos devDeps.

#### 4. SEO e Metadados
- [x] **Favicon** — favicon presente em todos os tamanhos/formatos necessários (incluindo apple-touch-icon)
  - ↳ **Corrigido (v1.15.0)**: adicionados `apple-touch-icon` 180×180, `icon-192.png`, `icon-512.png` (monograma "LC" no tema sky) e `site.webmanifest`; links em index.html:6-8.
  - ↳ **Refinado (v1.15.1)**: identidade própria — esfera azul neon desenhada no Illustrator (`branding/favicon.ai`); `favicon.ico` agora é ICONDIR real (16/32/48), abas com transparência, apple-touch/maskable opacos sobre navy `#0F172A`; regeneração via `npm run icons`.
- [x] **OG Image** — imagem Open Graph configurada para preview em redes sociais (WhatsApp, LinkedIn, etc.)
  - ↳ `og:image` + `twitter:image` declaradas em index.html:22-32, arquivo existe (1200×630 PNG) e responde 200 no ar.
- [x] **Sitemap.xml** — gerado, atualizado e submetido ao Google Search Console
  - ↳ **Corrigido (v1.15.0)**: `public/sitemap.xml` criado (URL única) + linha `Sitemap:` no robots.txt. *Resta manual*: submeter no Google Search Console após o deploy.
- [x] **Google Analytics** — decidido: sem analytics
  - ↳ **Resolvido**: CookieConsent declara em 3 idiomas "não utilizamos cookies de rastreamento ou analytics". Nenhum script GA4/gtag no codebase. Decisão alinhada com política de privacidade do modal.
- [x] **Títulos e descrições** — `<title>` e `<meta description>` únicos e otimizados por página
  - ↳ `<title>` (index.html:13) e meta description (index.html:7) bem formulados; canonical e `lang="pt-BR"` corretos; JSON-LD Person/LocalBusiness/WebSite completo (index.html:35-103).
- [x] **Meta descriptions** — revisar se todas as páginas têm meta description (evitar duplicadas/genéricas)
  - ↳ OK/N-A: site de página única, uma description única e específica (index.html:7).
- [x] **Robots.txt** — presente e configurado corretamente (não bloqueando páginas que deveriam ser indexadas)
  - ↳ `public/robots.txt` permite tudo, incluindo crawlers de preview social; live 200. **Atualizado (v1.15.0)**: linha `Sitemap:` acrescentada.

#### 5. Privacidade e Compliance (LGPD)
- [x] **Cookies** — banner de consentimento de cookies implementado e funcional
  - ↳ **Implementado (2026-08-25)**: Modal `CookieConsent.tsx` estilo BIOS/BootScreen (typing animation, scanlines, monospace font). Consentimento salvo em `localStorage('portfolio-consent')`. ProfileLight tem gate: sem consentimento → foto estática; com consentimento → pipeline WebGPU (download do modelo + cache via Cache API). Modal aparece 800ms após boot + hero entrance. Suporta PT/EN/ES.
- [ ] **Dados no rodapé** — CNPJ, endereço, política de privacidade e termos de uso visíveis no rodapé
  - ↳ **Pendente**: Footer.tsx exibe só redes sociais. CNPJ: N/A se pessoa física sem CNPJ. Endereço público consta no JSON-LD (Fortaleza/CE). Política de privacidade e termos ausentes — recomendável criar páginas/âncoras simples e linkar no rodapé.

#### 6. Infraestrutura e Segurança
- [ ] **Hospedagem boa** — confirmar que o provedor de hospedagem tem uptime/SLA adequado para produção
  - ↳ *Decisão manual*: GitHub Pages não oferece SLA contratual (uptime histórico alto, adequado p/ portfólio); CI/CD sólido via Actions (.github/workflows/deploy.yml). Se precisar de SLA/headers customizados, migrar para Cloudflare Pages/Vercel/Netlify.
- [x] **Clicar nos links** — checar manualmente (ou com link checker automatizado) todos os links internos e externos, sem 404
  - ↳ Todos os hrefs testados com `curl -L`: lattes.cnpq.br, github.com/cavalcanteprofissional, linkedin.com/in/cavalcante-Lucas, wa.me → **200**. Assets ao vivo (`/`, favicon.ico, og/card.png, robots.txt, cv_pt.pdf, foto-perfil.webp, PDFs de certificações) → **200**. **Corrigido (v1.15.0)**: Lattes agora `https://` e slug padronizado `cavalcante-Lucas` em Footer, Contact, index.html e chaves i18n `contact.linkedin`.
- [ ] **Configurações de segurança** — headers de segurança (CSP, X-Frame-Options, HSTS), variáveis de ambiente/segredos fora do repositório
  - ↳ Segredos **OK**: `.env.local` ignorado pelo git (verificado), `HF_TOKEN` injetado só via GitHub Secret (deploy.yml:51-52), nenhum token hardcoded no repo. Headers **pendentes por limitação de plataforma**: GH Pages não permite CSP/XFO/HSTS customizados. Mitigações existentes: `rel="noopener noreferrer"` em todos os `_blank` (Footer.tsx:55, Contact.tsx:61). Solução completa exigiria proxy Cloudflare ou outro host.

---

#### Resumo da auditoria — pendências priorizadas

| # | Item | Esforço | Status |
|---|------|---------|--------|
| 1 | `404.html` copiado do index no build (plugin Vite `gh-pages-spa-404`) | Baixo | ✅ v1.15.0 |
| 2 | Criar `public/sitemap.xml` + referência no robots.txt | Baixo | ✅ v1.15.0 |
| 3 | Adicionar `apple-touch-icon` (+ manifest/ícones 192/512) | Baixo | ✅ v1.15.0 |
| 4 | Mensagem pré-preenchida nos links `wa.me` (`?text=` i18n) | Baixo | ✅ v1.15.0 |
| 5 | Trocar `http://lattes.cnpq.br` → `https://` (Footer.tsx:18) | Trivial | ✅ v1.15.0 |
| 6 | Padronizar slug do LinkedIn entre Footer/Contact/index.html | Trivial | ✅ v1.15.0 |
| 7 | Política de privacidade + dados no rodapé | Médio | ⬜ pendente |
| 8 | GA4 + analytics — decidido: não implementar (CookieConsent declara "sem analytics") | — | ✅ resolvido |
| 9 | Domínio próprio (decisão de negócio) | Manual | ⬜ decisão |

**Pendências manuais remanescentes:** teste em celular físico · submeter sitemap no Search Console · revalidar PSI na URL de produção após deploy.

**Métricas Lighthouse locais (21/08/2026)**: Performance 91 · Acessibilidade 99 · Best Practices 96 · SEO 100 · LCP 2,8s · CLS 0,022 · TBT 170ms. Build de produção validado (`tsc && vite build`, OK). Correções v1.15.0 validadas com typecheck, lint, build e Playwright **24/24** (`--workers=1`).

---

### 🗂️ Housekeeping — gitignore de branding, merge do checklist e plano da sessão (2026-08-21)

> Origem: organização pós-v1.15.1 antes do primeiro commit da release. Registro consolidado do plano da sessão (antes em `.opencode/plans/branding-gitignore-checklist-todo.md`, removido após esta incorporação).

| # | Tarefa | Status |
|---|--------|--------|
| H1 | `.gitignore`: `/branding/*` exceto `!/branding/*.ai` — exports (ex.: `branding/1x/`) e temporários `~ai-*.tmp` ignorados sem limpeza manual; fonte Illustrator segue versionada; verificado via `git check-ignore` | ✅ |
| H2 | `checklist-pre-deploy.md` incorporado ao TODO.md (seção 📋 acima) e arquivo removido; referências históricas (D12/F12, CHANGELOG v1.15.0) preservadas | ✅ |
| H3 | Som inicial redesenhado até ficar distinto por textura: sweep tonal → power surge grave → **whoosh de ruído branco filtrado** 160→2800 Hz (~320 ms), único som não tonal da paleta | ✅ |
| H4 | Ícones regenerados a partir do novo export do usuário (`branding/1x/favicon.png` → `public/icons/logo-512.png`) | ✅ |
| H5 | README: seção Branding expandida com spec dos arquivos de `branding/` + nova seção Arquitetura mencionando o diretório | ✅ |
| H6 | Plano da sessão incorporado a esta onda; diretório `.opencode/` removido | ✅ |
| H7 | Suíte completa verde → commit + push `[1.15.0]`+`[1.15.1]` (deploy via Actions) | ✅ |

---

### 📌 Pendências em aberto — Checklist Pré-Deploy (próximos passos)

> Apontador dos itens ainda abertos (detalhes completos na seção 📋 acima). Atualizado em 21/08/2026, pós-deploy v1.15.0+v1.15.1.

**🔧 Exigem código:**

| Item | Ref. (seção 📋) | Ação proposta |
|------|-----------------|---------------|
| Política de privacidade + termos de uso no rodapé | §5 · "Dados no rodapé" | Página/âncora simples com declaração "este site não usa cookies" + link no Footer |

**🤝 Decisão conjunta antes de codificar:**

| Item | Ref. (seção 📋) | Desdobramento se aprovado |
|------|-----------------|---------------------------|
| Domínio próprio | §2 · "Domínio próprio" | CNAME/DNS + atualizar canonical, og:url, JSON-LD, sitemap e base do Vite |
| Hospedagem/SLA (+ headers CSP/HSTS) | §6 · "Hospedagem boa" e "Configurações de segurança" | Permanecer GH Pages × migrar (Cloudflare/Vercel também desbloqueia headers) |

**📱 Validações manuais agora possíveis (site no ar com v1.15.x):** teste em celular físico · rota 404 real (abrir `/rota-inexistente`) · submeter sitemap no Google Search Console · revalidar PageSpeed na URL de produção · conferir favicon novo e manifest ao vivo (aba anônima).

---

### ⚠️ CI — Pipeline Python dispara em todo push mesmo sem mudança no currículo (2026-08-22)

> **Problema:** `deploy.yml` dispara em qualquer push para `main` e o job de build executa **sempre** o bloco Python completo (setup-python, cache HF, `pip install transformers torch…`, Playwright Chromium, `python resume/build.py`) — mesmo quando o push só altera docs (ex.: TODO.md), desperdiçando minutos de CI e regenerando PDFs idênticos.
>
> **Causa estrutural:** os PDFs são gerados no runner e injetados em `public/cv/` antes do build Vite (eram gitignored) — o build sempre dependia da geração.
>
> **Solução aprovada (A+B):** condicional por mudança em `resume/**` + cache dos PDFs + PDFs comitados como fonte da verdade (redundância contra evicção de cache do GitHub).

| # | Tarefa | Status |
|---|--------|--------|
| I1 | Registrar problema e plano (esta onda) | ✅ |
| I2 | `deploy.yml`: detecção de mudanças com `dorny/paths-filter@v3` (`resume: 'resume/**'`) e `if:` nos 5 passos Python (`resume == true \|\| cache-hit != true`) | ✅ |
| I3 | `actions/cache` dos PDFs gerados — `path: public/cv`, chave `cvs-${{ hashFiles('resume/**') }}`; evicção auto-cura (regenera no próximo push que toque resume ou em miss) | ✅ |
| I4 | `.gitignore`: `public/cv/*.pdf` passa a ser versionado; PDFs atuais commitados como fallback garantido no dist | ✅ |
| I5 | Validação nos Actions: push só-docs pula Setup Python/HF/pip/Chromium/Generate; push tocando `resume/**` regenera e renova cache | ⬜ |
| I6 | **Simplificação committed-first** — `actions/cache` de `public/cv` removido (redundante com PDFs versionados); novo passo "Check committed CVs" (`compgen -G public/cv/*.pdf`); condição dos 5 passos Python = `resume == true \|\| missing == true`; PDFs commitados viram o default prioritário e a pipeline vira fallback | ✅ |
| I7 | Validação final nos Actions: run de estreia da v1.16.0 gerou por cache frio (esperado); próximo push só-docs deve pular os 5 passos Python com PDFs commitados servindo o dist | ⬜ |

---

### 📄 Currículos — hyperlink Portfolio dessincronizado + auto-sync com o site (2026-08-22)

> **Problema:** os 3 PDFs apontavam para URL antiga (`github.io/portfolio`, sem `-cavalcante`) — valor fixado no frontmatter do `curriculo-fonte.md` que não acompanhou a mudança da base do site. Solução aprovada: corrigir o fonte **e** automatizar a sincronia via canonical do `index.html` (fonte única), além de padronizar o slug LinkedIn.

| # | Tarefa | Status |
|---|--------|--------|
| J1 | Registrar problema e plano (esta onda) | ✅ |
| J2 | `curriculo-fonte.md`: `portfolio` → `https://cavalcanteprofissional.github.io/portfolio-cavalcante/` + `linkedin` → slug `cavalcante-Lucas` | ✅
| J3 | `build.py`: `get_site_url()` extrai `<link rel="canonical">` do `index.html`; `parse_source()` força sync de `dados_pessoais.portfolio` (frontmatter vira fallback) — troca futura de domínio propaga sozinha | ✅ |
| J4 | Regenerar os 3 PDFs localmente (`python resume/build.py`) e commitar (committed-first) | ✅ |
| J5 | Validação: greps nos HTMLs (0× URL velha, 3× nova por idioma) + timestamps novos em `public/cv/` | ✅ |
| J6 | CHANGELOG `[1.16.2]` + push (toca `resume/**` → CI regenera como dupla checagem ao vivo) | ✅ |

> Ambiente local reconfigurado nesta onda: deps do README via pip + `playwright install chromium` (headless shell v1234) + modelo mBART baixado — builds locais de currículo voltaram a funcionar.

> Node build, upload e deploy permanecem incondicionais; `workflow_dispatch` e PR herdam a mesma lógica. Ganho esperado: pushes só-docs caem de ~5–8 min para ~1–2 min.

---

### 💡 TypeGPU — Correção do pipeline de iluminação + Cookie Consent (2026-08-25)

> **Problema:** O efeito de iluminação 3D na foto do perfil (ProfileLight) não funciona. Erro: `Missing metadata for tgpu.fn function body (either missing 'use gpu' directive, or misconfigured 'unplugin-typegpu')`. Causa: `unplugin-typegpu` não está instalado nem configurado no Vite. Sem ele, as 35 funções GPU em 20 arquivos não são transpiladas para WGSL.
>
> **Segundo problema:** O modelo ML (depthart, 13MB) é baixado e cacheado via Cache API automaticamente, sem consentimento do usuário. Necessário modal de cookie consent antes de qualquer armazenamento local.
>
> **Sobre o modelo:** É pré-treinado para inferência — não precisa treinar. O modelo `depthart` é baixado do HuggingFace, roda localmente na GPU do cliente (inferência → mapa de profundidade), e o shader WebGPU usa esse mapa para simular iluminação 3D em tempo real.

| # | Tarefa | Status |
|---|--------|--------|
| K1 | `npm install --save-dev unplugin-typegpu@0.12.2` | ✅ |
| K2 | `vite.config.ts`: import `typegpu` de `unplugin-typegpu/vite` + `typegpu()` antes de `react()` | ✅ |
| K3 | Build test — `npm run build` sem erros de resolução TypeGPU | ✅ |
| K4 | `src/stores/consentStore.ts`: Zustand store com persistência em `localStorage('portfolio-consent')` | ✅ |
| K5 | `src/components/CookieConsent.tsx`: modal estilo BIOS/BootScreen (typing animation, scanlines, monospace font, glow azul) | ✅ |
| K6 | `src/components/ProfileLight.tsx`: gate `initPipeline()` atrás do consentimento; sem consentimento → foto estática + modal | ✅ |
| K7 | `src/App.tsx`: montar `<CookieConsent />` após BootScreen + Hero entrance completion | ✅ |
| K8 | `src/i18n/index.ts`: textos traduzidos PT/EN/ES para o modal | ✅ (inline no componente) |
| K9 | `src/components/index.ts`: exportar `CookieConsent` | ✅ |
| K10 | Build final + verificação completa | ✅ |

---

### 🔧 Ajustes pós-implantação — CookieConsent, espelho e hover/orbit (2026-08-25)

> **Problemas reportados após teste funcional:**
> 1. Modal CookieConsent é centralizado fullscreen — padrão de sites é barra fixa no rodapé
> 2. Foto do perfil aparece espelhada horizontalmente (`mirror: true` no defaultRelightingSettings)
> 3. Luz não acompanha perfeitamente o mouse — falta lógica hover vs orbit automático

| # | Tarefa | Status |
|---|--------|--------|
| L1 | `CookieConsent.tsx`: reaplicar como banner footer fixo (bottom-0, slide-up, sem overlay fullscreen) | ✅ |
| L2 | `ProfileLight.tsx`: adicionar `mirror: false` no `renderer.update()` | ✅ |
| L3 | `ProfileLight.tsx`: render loop com lógica `hoveringRef ? updateFromMouse : orbitTick` | ✅ |
| L4 | Build + verificação | ✅ |
| L5 | `renderer.ts`: `#syncCanvasSize()` usar `clientWidth × clientHeight` (não quadrado) — corrige distorção | ✅ |
| L6 | `ProfileLight.tsx`: hover takeover — luz pula para posição do mouse no mouseenter | ✅ |
| L7 | `CookieConsent.tsx`: `>` do header pisca com glow neon + botão aceitar com `cookieGlowPulse` | ✅ |
| L8 | `ProfileLight.tsx`: loading animation estilo BIOS (typing + progress bar) durante download do modelo | ✅ |
| L9 | `ProfileLight.tsx`: suporte mobile — `<ProfileLight>` substitui `<img>` no Hero mobile | ✅ |
| L10 | `CHANGELOG.md` + `README.md` atualizados | ✅ |

---

### 🔧 Fix futuro — Ajustar texto modal cookie no viewport mobile

> **Problema**: em viewports mobile estreitos, o texto do corpo do modal de cookie quebra em pontos inadequados. Exemplo: "seu navegador. >quebra linha< O modelo é..." — a quebra de linha deveria ser mais natural, respeitando palavras inteiras.

| # | Tarefa | Status |
|---|--------|--------|
| M1 | `CookieConsent.tsx`: body dividido em array de parágrafos, typing por linha com `<p>` separados | ✅ |

---

### 🔧 Fix — Monocular Ball Light: Trajetória contínua + Distorção + Badge (2026-08-26)

> **Problema raiz:** `updateFromMouse()` e `orbitTick()` setam `lightPosition` direto (snap instantâneo). Sem interpolação entre modos. Mouse usa coordenadas globais (tela inteira), não relativas ao canvas. Canvas sem `ResizeObserver`. Badge desalinhada da borda arredondada.

#### 🖱️ N1 — Movimentação hover/orbit contínua
| # | Tarefa | Status |
|---|--------|--------|
| N1a | `light-control.ts`: dois estágios — `targetPosition` (setado por orbit ou mouse) + `tick()` com lerp (0.12/frame) → `lightPosition` | ✅ |
| N1b | `light-control.ts`: `updateFromWheel()` seta `targetZ` em vez de `lightZ` direto | ✅ |
| N1c | `ProfileLight.tsx`: remover `useMouseStore` (global), adicionar `mousePosRef` com normalização via `getBoundingClientRect()` | ✅ |
| N1d | `ProfileLight.tsx`: adicionar `mousemove`/`touchmove` listeners no container | ✅ |
| N1e | `ProfileLight.tsx`: no render loop, chamar `updateFromMouse()` ou `orbitTick()` + `tick()` sempre; remover branch `justEntered` morto | ✅ |

#### 📐 N2 — Distorção da profile picture
| # | Tarefa | Status |
|---|--------|--------|
| N2a | `renderer.ts`: expor `syncSize()` público (wrapper de `#syncCanvasSize()`) | ✅ |
| N2b | `ProfileLight.tsx`: `ResizeObserver` no container, chama `renderer.syncSize()` + `resetHistory()` | ✅ |
| N2c | `ProfileLight.tsx`: setar `canvas.width`/`canvas.height` iniciais no `initPipeline()` | ✅ |

#### 🏷️ N3 — Badge de assinatura na borda
| # | Tarefa | Status |
|---|--------|--------|
| N3a | `Hero.tsx`: ajustar offset badge mobile (`-bottom-5 -right-5 w-16 h-16`) | ✅ |
| N3b | `Hero.tsx`: ajustar offset badge desktop (`-bottom-6 -right-6 w-20 h-20 md:-bottom-8 md:-right-8 md:w-24 md:h-24`) | ✅ |

#### 🧪 Verificação
| # | Tarefa | Status |
|---|--------|--------|
| V1 | `npm run typecheck` e `npm run build` | ✅ |
| V2 | Atualizar `TODO.md` (marcar N1/N2/N3 como ✅) | ✅ |

---

### 🍪 CookieConsent — Backdrop, 2 modais e política de privacidade (2026-08-26)

> **Problema:** Modal sem backdrop, sem política de privacidade, click outside não fecha, sem transição entre modais.

#### 🖼️ Backdrop + Click-outside
| # | Tarefa | Status |
|---|--------|--------|
| C1 | `CookieConsent.tsx`: adicionar `<motion.div>` backdrop `fixed inset-0 z-[54] bg-black/60` | ✅ |
| C2 | Backdrop click no modal 1 → `setDismissed(true)` (ignora, volta no próximo acesso) | ✅ |
| C3 | Backdrop click no modal 2 → `setModalStep('consent')` (voltar ao 1) | ✅ |
| C4 | Container do modal com `stopPropagation` para evitar close ao clicar dentro | ✅ |

#### 🔄 Botão "Saiba mais" + Modal 2
| # | Tarefa | Status |
|---|--------|--------|
| C5 | Trocar `decline` por `learnMore` em todos os 3 idiomas (`pt: '[ Saiba mais ]'`, `en: '[ Learn more ]'`, `es: '[ Saber más ]'`) | ✅ |
| C6 | `handleLearnMore` → `setModalStep('privacy')` (NÃO recusa cookies) | ✅ |
| C7 | Criar conteúdo da política inline (3 idiomas, 6 frases cada) | ✅ |
| C8 | Modal 2: mesmo estilo BIOS/scanlines, header `> POLÍTICA DE PRIVACIDADE`, body com typing, botão `[ Voltar ]` | ✅ |
| C9 | `handleBack` → `setModalStep('consent')` | ✅ |

#### ✨ Transição entre modais
| # | Tarefa | Status |
|---|--------|--------|
| C10 | Modal 1 sai: `y: 0 → -100%`, opacity 0 (0.3s) | ✅ |
| C11 | Modal 2 entra: `y: 100% → 0`, opacity 1 (0.3s, delay 0.15s) | ✅ |
| C12 | Transição reversa (modal 2 → modal 1) com mesma timing | ✅ |

#### 🧪 Verificação
| # | Tarefa | Status |
|---|--------|--------|
| C13 | `npm run typecheck` e `npm run build` | ✅ |
| C14 | Atualizar `TODO.md` | ✅ |

---

### 🏷️ Badge desktop — Redimensionar e reposicionar (2026-08-26)

> **Problema:** Badge perfeita no mobile mas desalinhada no canto inferior direito da borda em desktop/tablet.

| # | Tarefa | Status |
|---|--------|--------|
| B1 | `Hero.tsx`: badge desktop `md:-bottom-4 md:-right-4 md:w-16 md:h-16` (64px, offset 16px) | ✅ |
| B2 | `Hero.tsx`: badge lg `lg:-bottom-5 lg:-right-5 lg:w-[4.5rem] lg:h-[4.5rem]` (72px, offset 20px) | ✅ |
| B3 | `Hero.tsx`: ajustar `width`/`height`/`className` do img desktop para acompanhar | ✅ |
| B4 | `npm run typecheck` e `npm run build` | ✅ |
| B5 | Atualizar `TODO.md` | ✅ |

---

### 🏷️ Badge desktop — translate(50%, 50%) (2026-08-26)

> **Problema:** Badge com offsets manuais frágeis entre viewports. Usar translate para auto-sizing.

| # | Tarefa | Status |
|---|--------|--------|
| B6 | `Hero.tsx:220`: badge desktop → `right-4 bottom-4` + `style={{ transform: 'translate(50%, 50%)' }}` | ✅ |
| B7 | `npm run typecheck` | ✅ |
| B8 | Atualizar `TODO.md` | ✅ |

---

### 🏷️ Badge assinatura — Posição ainda incorreta (pendente)

> **Problema:** Badge da assinatura no canto inferior direito da profile picture no hero não fica na posição correta. Testamos: offsets manuais, translate(50%,50%). Nenhuma abordagem funcionou. A investigar.

| # | Tarefa | Status |
|---|--------|--------|
| B9 | Investigar por que o badge não fica na posição correta (possível clip do overflow-hidden no section, ou offset do grid/layout) | ✅ |
| B10 | Resolver e testar visualmente | ✅ |

---

### 📐 Distorção da foto — Container retangular vs. shader quadrado (2026-08-26)

> **Problema:** Após aplicar o efeito monocular (WebGPU relighting), a imagem do perfil fica levemente esticada verticalmente (~9% mais alta que larga). **Causa raiz:** `cameraUvAt()` em `shaders.ts` faz center-crop da fonte para um **quadrado** (`side = min(sourceSize.x, sourceSize.y)`), mas o container Hero.tsx usa dimensões **retangulares** (352×384 desktop, 192×224 mobile). O conteúdo quadrado é mapeado no canvas retangular → stretching não-uniforme. O surface texture (depth map) também é quadrado e sofre o mesmo stretching.

#### 📐 Opção A — Container quadrado
| # | Tarefa | Status |
|---|--------|--------|
| D1 | Registrar diagnóstico e plano no TODO.md | ✅ |
| D2 | `Hero.tsx`: container mobile `w-48 h-56` → `w-48 h-48` (192×192) | ✅ |
| D3 | `Hero.tsx`: container desktop `md:w-88 md:h-96` → `md:w-88 md:h-88` (352×352) | ✅ |
| D4 | `ProfileLight` props: mobile `height={224}` → `height={192}`, desktop `height={384}` → `height={352}` | ✅ |
| D5 | Ajustar badge offsets para container quadrado se necessário | ✅ (não afetado — offsets relativos) |
| D6 | Verificar typecheck, build e lint | ✅ |

---

### 🏷️ Badge assinatura — Desktop desalinhado vs. mobile (2026-08-26)

> **Problema:** Badge no desktop usa abordagem diferente do mobile (`right-4 bottom-4` + `translate(50%,50%)` vs `-bottom-5 -right-5`), resultando em offset 16px do canto (desktop) vs 12px (mobile). Badge desktop fica deslocado para dentro. **Fix:** padronizar desktop com mesma abordagem do mobile (offset direto sem translate).

| # | Tarefa | Status |
|---|--------|--------|
| B11 | Registrar diagnóstico e plano no TODO.md | ✅ |
| B12 | `Hero.tsx:220-222` — badge desktop: `right-4 bottom-4` → `-bottom-5 -right-5` + `lg:-bottom-6 lg:-right-6` + remover `translate(50%,50%)` | ✅ |
| B13 | Verificar typecheck, build e lint | ✅ |

---

### 🏷️ Badge assinatura — Causa raiz: container desktop sem dimensões (2026-08-26)

> **Problema:** Badge posicionada incorretamente em desktop/tablet. Múltiplas tentativas de ajustar offsets falharam.
>
> **Causa raiz:** `md:w-88 md:h-88` não existe no Tailwind v3 (escala de spacing pula de 80→96). O CSS compilado não tinha nenhuma regra para essas classes — o container desktop ficava sem dimensões explícitas, herdando tamanho do grid/content. Badge posicionava contra container com tamanho imprevisível.
>
> **Segundo problema:** Badge desktop usava offsets positivos (`bottom-3 right-3`) empurrando para dentro, enquanto mobile usava negativos (`-bottom-5 -right-5`) sobrepondo o canto. Abordagens inconsistentes.

| # | Tarefa | Status |
|---|--------|--------|
| B14 | Reverter mobile ao original (estava perfeito): `bottom-2 right-2 w-14 h-14` → `-bottom-5 -right-5 w-16 h-16` | ✅ |
| B15 | Reverter img mobile: `w-12 h-12` → `w-14 h-14` | ✅ |
| B16 | `Hero.tsx:204` — container: `md:w-88 md:h-88` → `md:w-[22rem] md:h-[22rem]` (352px, classe válida) | ✅ |
| B17 | `Hero.tsx:221` — badge desktop: `bottom-3 right-3` → `-bottom-5 -right-5 lg:-bottom-6 lg:-right-6` (negativo = sobrepor canto, consistente com mobile) | ✅ |
| B18 | Verificar typecheck e build | ✅ |

---

### 💡 ProfileLight — Default Z depth reduzido (2026-08-26)

> **Problema:** Luz do monocular light ball iniciava com `initialZ = 0.42` (~47% da faixa -0.66 a 1.65), parecendo intensa demais no carregamento. Usuário queria base mais sutil, mantendo scroll para intensificar.

| # | Tarefa | Status |
|---|--------|--------|
| Z1 | `light-control.ts:32` — `initialZ` de `0.42` → `0.2` → `-0.2` (~22% da faixa, bem sutil) | ✅ |
| Z2 | `renderer.ts:79` — `defaultRelightingSettings.lightZ` de `0.42` → `0.2` → `-0.2` | ✅ |
| Z3 | `light-control.ts:5` — `WHEEL_SENSITIVITY` de `0.001` → `0.0004` (2.5x menos sensível) | ✅ |

---

### 🔐 Tracking de Visitantes + Orçamento Automatizado + LGPD (2026-08-27)

> ⚠️ **SUPERSEDIDO pelo "PLANO REVISADO — Backend Real" abaixo.** O plano original (GitHub API + Web3Forms + Google Sheets) foi substituído por Supabase + Cloudflare Worker + Resend + Umami, conforme decisões do usuário (backend real, manter GitHub Pages, worker no mesmo repo). As subseções F1–F5 abaixo são mantidas como histórico. Consulte o plano revisado para execução.

> **Objetivo:** Implementar tracking de visitantes, formulário de contato, dashboard admin e sistema de orçamento automatizado — tudo gratuito e sob a luz da LGPD.
>
> **Stack:** GitHub Pages (estático) + GitHub Contents API (armazenamento) + ip-api.com (geolocation gratuita) + Web3Forms (formulário gratuito).
>
> **Decisões do usuário:** JSON no GitHub + API pública · geolocation automática · formulário no CTA · tudo automático · dashboard admin.

#### 🔧 Fase 1 — Unificar CookieConsent (30 min)

| # | Tarefa | Status |
|---|--------|--------|
| T1 | `CookieConsent.tsx`: unificar `CONSENT_LINES` e `PRIVACY_LINES` em `PRIVACY_LINES` único | ✅ |
| T2 | Remover state `step` ('consent' | 'privacy') → sempre mostra a mesma tela | ✅ |
| T3 | Remover botão "Saiba mais" / "Voltar" → apenas `[ Aceitar ]` | ✅ |
| T4 | Remover `handleLearnMore` e `handleBack` | ✅ |
| T5 | Header: `> POLÍTICA DE PRIVACIDADE` (PT/EN/ES) | ✅ |
| T6 | Texto unificado: Cache API + localStorage + sem cookies de rastreamento | ✅ |
| T7 | Verificar typecheck e build | ✅ |

#### 📊 Fase 2 — Tracking de Visitantes (4-6h)

| # | Tarefa | Status |
|---|--------|--------|
| T8 | Criar `src/lib/tracking.ts` — função `trackVisit()` que coleta dados do dispositivo | ✅ |
| T9 | Geolocation via `ip-api.com` (gratuito, 45 req/min) — cidade, região, país | ✅ |
| T10 | Coletar: `navigator.userAgent`, `screen.width/height`, `navigator.language` | ✅ |
| T11 | Hash SHA-256 do IP (não armazena IP direto — LGPD) | ✅ |
| T12 | Criar GitHub Action `.github/workflows/track.yml` — `repository_dispatch` (tipo `track_visit`) para salvar dados | ✅ |
| T13 | Criar `data/visits.json` — schema inicial vazio `{"visits": [], "contacts": []}` | ✅ |
| T14 | `App.tsx`: useEffect dispara `trackVisit()` quando `consent=true` | ✅ |
| T15 | Verificar typecheck e build | ✅ |

**Schema `data/visits.json`:**
```json
{
  "visits": [
    {
      "id": "uuid",
      "timestamp": "2026-08-27T14:30:00Z",
      "ip_hash": "sha256...",
      "city": "Fortaleza",
      "region": "CE",
      "country": "BR",
      "device": "desktop",
      "browser": "Chrome",
      "os": "Windows",
      "screen": "1920x1080",
      "language": "pt-BR",
      "consent": true
    }
  ],
  "contacts": []
}
```

#### 📝 Fase 3 — Formulário de Contato (CTA) (2-3h)

| # | Tarefa | Status |
|---|--------|--------|
| T16 | `Contact.tsx`: adicionar formulário com campos Nome, Email, Telefone, Mensagem | ⬜ |
| T17 | Validação: email obrigatório, telefone opcional, mensagem opcional | ⬜ |
| T18 | Envio via Web3Forms (gratuito, 250 submissions/mês) — sem backend | ⬜ |
| T19 | Estilo: modal estilo BIOS (consistente com CookieConsent) | ⬜ |
| T20 | Mensagem de sucesso/erro após envio | ⬜ |
| T21 | Adicionar `WEB3FORMS_KEY` em `.env.example` | ⬜ |
| T22 | Verificar typecheck e build | ⬜ |

**Campos:**
| Campo | Obrigatório | Tipo |
|-------|-------------|------|
| Nome | Não | text |
| Email | **Sim** | email |
| Telefone | Não | tel |
| Mensagem | Não | textarea |

#### 📈 Fase 4 — Dashboard Admin (4-6h)

| # | Tarefa | Status |
|---|--------|--------|
| T23 | Criar `src/pages/Admin.tsx` — rota `/admin` | ⬜ |
| T24 | Autenticação: senha hardcoded (constante no código) — simples mas funcional | ⬜ |
| T25 | Ler `data/visits.json` via GitHub Contents API | ⬜ |
| T26 | Tabela de visitas: data, local, dispositivo, browser | ⬜ |
| T27 | Tabela de contatos: nome, email, telefone, mensagem | ⬜ |
| T28 | Filtros: por data, local, dispositivo | ⬜ |
| T29 | Exportação CSV | ⬜ |
| T30 | Gráficos simples: visitas por dia, por cidade, por dispositivo | ⬜ |
| T31 | Verificar typecheck e build | ⬜ |

**Segurança do Dashboard:**
| Medida | Implementação |
|--------|--------------|
| Autenticação | Senha hardcoded (constante no código) |
| Rota protegida | `/admin` só acessa com senha |
| Rate limit | Limitar a 100 leituras/hora |

#### 💰 Fase 5 — Orçamento Automatizado (8-12h, FUTURO)

| # | Tarefa | Status |
|---|--------|--------|
| T32 | Criar `src/data/services.json` — lista de serviços com preços base | ⬜ |
| T33 | Criar `src/lib/pricing.ts` — função `calculatePrice(services, urgency)` | ⬜ |
| T34 | Multiplicadores: complexidade (baixa 1.0, média 1.3, alta 1.6) | ⬜ |
| T35 | Multiplicadores: urgência (normal 1.0, urgente 1.2, muito urgente 1.5) | ⬜ |
| T36 | Criar `src/pages/Quote.tsx` — formulário de orçamento | ⬜ |
| T37 | Select de serviços (múltipla escolha) + urgência | ⬜ |
| T38 | Cálculo dinâmico: preço × complexidade × urgência | ⬜ |
| T39 | Preview do orçamento com lista de serviços, valores e total | ⬜ |
| T40 | Envio via WhatsApp (link wa.me com mensagem pré-preenchida) | ⬜ |
| T41 | Envio via email (mailto com assunto e corpo formatados) | ⬜ |
| T42 | Após aprovação via WhatsApp/email → libera orçamento final | ⬜ |
| T43 | Verificar typecheck e build | ⬜ |

**Estrutura `src/data/services.json`:**
```json
{
  "services": [
    {
      "id": "dashboard",
      "name": "Dashboard Interativo",
      "description": "Dashboard com Streamlit, Plotly ou Next.js",
      "basePrice": 1500,
      "techStack": ["Python", "Streamlit", "Plotly"],
      "complexity": "media",
      "estimatedDays": 14,
      "githubRepos": ["labgas-manager", "sales-dashboard"]
    },
    {
      "id": "chatbot",
      "name": "Chatbot com IA",
      "description": "Chatbot com RAG, LangChain, Streamlit",
      "basePrice": 2500,
      "techStack": ["Python", "LangChain", "Streamlit"],
      "complexity": "alta",
      "estimatedDays": 21,
      "githubRepos": ["chatbot-oficina", "pro-git-qa-bot"]
    }
  ]
}
```

#### 🔒 LGPD — Compliance

| Princípio | Implementação |
|-----------|--------------|
| Consentimento | Opt-in explícito no CookieConsent antes de coletar |
| Finalidade | Declaração clara no modal: "tracking para melhorar o site" |
| Minimização | Apenas dados de dispositivo, sem cookies de rastreamento |
| IP hash | SHA-256 do IP (não armazena IP direto) |
| Acesso | Visitante pode solicitar exclusão via email |
| Transparência | Política de privacidade no CookieConsent |

#### 📋 Ordem de Implementação

| Fase | Escopo | Esforço | Dependências |
|------|--------|---------|-------------|
| **1** | Unificar CookieConsent | 30 min | Nenhuma |
| **2** | Tracking de visitantes (GitHub API) | 4-6h | Fase 1 |
| **3** | Formulário de contato (CTA) | 2-3h | Fase 2 |
| **4** | Dashboard admin | 4-6h | Fase 2 |
| **5** | Orçamento automatizado | 8-12h | Fase 3 + GitHub API |

#### 🔗 Referências

- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
- [Web3Forms](https://web3forms.com/) — formulários gratuitos sem backend
- [ip-api.com](https://ip-api.com/) — geolocation gratuita (45 req/min)
- [LGPD — Lei Geral de Proteção de Dados](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

# 🆕 PLANO REVISADO — Backend Real: Visitantes + Orçamento Automatizado (2026-08-27)

> **Motivo da revisão:** o plano original (GitHub API + Google Sheets) tinha limitações de segurança e robustez:
> - Expor `VITE_GH_TOKEN` no bundle público = risco de segurança (GitHub revoga PATs expostos).
> - Apps Script/Sheets não tem trigger confiável de "aprovar → dispara na hora" e não versiona código.
>
> **Decisão do usuário:** montar um **backend real** (Supabase + Cloudflare Worker + Resend) gratuito, que também serve de **evidência de skill** (Data Analyst & AI Specialist).
>
> **Decisões confirmadas:**
> 1. Geração de PDF + email: **Cloudflare Worker** (Supabase só como banco).
> 2. Frontend: **manter GitHub Pages** (chama a API do Worker via CORS).
> 3. Analytics: **Umami** (ver análise abaixo; suplantou a preferência inicial? não — usuário prefere Umami, mantido).
> 4. Auth do `/admin`: **Supabase Auth** (email/senha).
> 5. Cálculo de preço: valores/multiplicadores recomendados pelo agente.
> 6. Worker: **pasta `worker/` no mesmo repo**.

---

## 📊 Decisão de Analytics — Umami vs GoatCounter

> Usuário prefere **Umami**. Análise confirma que é a escolha certa para o contexto.

| Critério | **Umami** ✅ | GoatCounter |
|----------|------------|-------------|
| License | MIT (mais permissivo) | EUPL-1.2 |
| Cloud SELFB-HOSTED grátis | ✅ (Docker, 1 contêiner) | ✅ (binário Go/SQLite) |
| Dashboard UX | **Moderno, real-time, bonito** | Mínimo/utilitário |
| Multicanal (3 sites) | ✅ | Parcial |
| Custom events | ✅ | Limitado |
| Script | ~2KB | ~3.5KB |
| Ecossistema | Next.js + Prisma (encaixa na stack JS/TS do projeto) | Go |
| Rede/ativa | Comunidade ativa, 4.5★ (204 reviews) | 1 mantenedor, sem reviews |
| Bots (AI crawlers) | Exclui via JS-only tracking | UA filtering |
| Self-host em free host | Deploy em Render Railway/VPS free | Idem |

**Veredito:** para um dev JS/TS que quer dashboard bom + eventos custom + portfólio, **Umami é o vencedor claro**. GoatCounter só vence em "tudo que tem que rodar é 1 binário" — o que não é o caso (já teremos um Worker/Supabase rodando). **Mantido: Umami.**

---

## 🏗️ Arquitetura Final

```
FRONTEND                        BACKEND                               SERVIÇOS
GitHub Pages (Vite/React)  ──►  Cloudflare Worker  ──►  Supabase (Postgres)
        │                       (PDF + email + auth       (orcamentos, services,
        │ 1. lista serviços       + API REST)                visitas)
        │    (GitHub API p/ repos)   │
        │                            ├──► Resend ──► email p/ VOCÊ (aviso solicitação)
        │ 2. solicita orçamento ────►│──► wa.me ────► WhatsApp p/ VOCÊ
        │    (nome,email,whatsapp)   │──► Resend ──► PDF por EMAIL p/ cliente
        │                            ▼
        │                       VocÊ aprova no DASHBOARD (/admin)
        │                            ▼
        │                       Worker gera PDF + Resend envia p/ cliente
        │ 3. cliente vê status + baixa PDF ◄────────────┘
```

### Stack e free-tiers (confirmados 2026)

| Camada | Ferramenta | Grátis | Limites |
|--------|-----------|--------|---------|
| Front | GitHub Pages (mantido) | ✅ | — |
| Banco | **Supabase** (Postgres) | ✅ sem cartão | 500MB DB · 1GB storage · pausa 7d inativo (precisa ping). Novos projetos exigem grants explícitos p/ PostgREST |
| API/PDF/email | **Cloudflare Worker** | ✅ | 100k req/dia · 10ms CPU/req · 128MB mem · 50 subrequests |
| Email | **Brevo** | ✅ | 300 emails/dia · sem domínio (sender verificado por email) |
| Analytics | **Umami** (self-hosted ou Cloud) | ✅ | Cloud: 100k events/mês grátis · self-host free |
| Auth | **Supabase Auth** | ✅ | até 50k MAU |

> ⚠️ Nota LGPD: prefira hospedar banco/analytics em região adequada; dados de visitantes minimizados (umami é cookieless, hash diário).

---

## 🗓️ Execução

### Fase 1 — Unificar CookieConsent ✅ (já concluída)

### Fase 2 — REVERTER tracking por token + Integrar Umami
| # | Tarefa | Status |
|---|--------|--------|
| R1 | Deletar `src/lib/tracking.ts`, `.github/workflows/track.yml`, `scripts/append-visit.mjs`, `data/` | ✅ |
| R2 | Remover `useEffect` de `trackVisit` no `App.tsx` e `useConsentStore` se não usado | ✅ |
| R3 | Remover `VITE_GH_TOKEN` do `.env.example` | ✅ |
| R4 | Deploy do Umami (Cloud free tier ou self-host em host free) | ⬜ |
| R5 | Integrar script do Umami no `App.tsx`, disparado quando `consent=true` (on-demand / consent gate) | ✅ (loader criado, aguarda websiteId) |
| R6 | Verificar typecheck e build | ✅ |

### Fase 3 — Setup Supabase + Cloudflare Worker + Brevo

> **Decisões confirmadas pelo usuário:**
> - Projeto é **Vite** → no front usamos **`VITE_`** (não `NEXT_PUBLIC_`).
> - `/admin` inicialmente via **hash routing** (`#/admin`), 100% compatível com GitHub Pages (`base: '/portfolio-cavalcante/'`). *⚠️ Superado em v1.20.0: admin agora é página própria `admin.html` (MPA), com `#/admin` virando redirect.*
> - Form do orçamento vai **no CTA existente** (`Contact.tsx`).
> - Aviso para o dono (você) quando cliente solicitar: **por EMAIL** (Resend) → `cavalcanteprofissional@outlook.com`.
> - **service_role key**: será **rotacionada pelo usuário no painel na hora de configurar o Worker** (a postada estava comprometida — NÃO usar; tratar como vazada). A NOVA nunca passa pelo chat; vai direto via `wrangler secret put`.
> - Supabase project: `https://ohtkfjckydmjsfuouyaj.supabase.co` (pública). Anon key = `sb_publishable_...` (pública).

| # | Tarefa | Status |
|---|--------|--------|
| S1 | `supabase/schema.sql` — tabelas `services`, `orcamentos` + RLS restritivo por padrão (anon só LÊ `services`; `orcamentos` sem policy, acessado só por `service_role` no Worker) | ✅ (`supabase/schema.sql`) |
| S2 | Criar `worker/` no repo (Wrangler) — rotas `POST /orcamento`, `POST /aprovar`, `GET /status/:id`, `GET /health` | ✅ (estrutura + POST /orcamento, GET /services, GET /orcamento/:codigo, GET /health; `POST /aprovar` na Fase 5) |
| S3 | Worker: geração de PDF do orçamento (**pdf-lib**, compatível com runtime Workers), usado no envio p/ cliente | ✅ (`worker/src/pdf.ts`) |
| S4 | Worker: envio via Resend com anexo PDF → email do cliente | ⬜ (estrutura pronta `resend.ts`; `POST /aprovar` na Fase 5) |
| S5 | (visitas cobertas por Umami — descartada tabela `visitas`) | — |
| S6 | Configurar Resend + domínio (verificar SPF/DKIM) | ⬜ (aguarda credenciais) |
| S7 | Secrets do Worker: `service_role` (NOVA, rotacionada) + `RESEND_API_KEY` via `wrangler secret put`; `SUPABASE_URL` via vars — nunca no bundle | ⬜ (aguarda credenciais + rotação key) |
| S8 | Ping anti-pausa do Supabase (Cron Trigger grátis do Cloudflare → `GET /health`, 1x/dia) | ✅ (`wrangler.toml` cron + `scheduled` handler) |
| S9 | CORS no Worker p/ origem do GitHub Pages (`https://cavalcanteprofissional.github.io`) | ✅ |

### Fase 4 — Formulário de Orçamento no CTA

> **Semântica de UM ÚNICO SUBMIT (decisão do usuário):** o mesmo botão de submit do formulário **registra os dados do cliente E confirma a solicitação do orçamento** — não há passos separados. Um único `POST /orcamento` já carrega: dados do cliente (nome, email, whatsapp) + itens do orçamento (serviço, urgência, descrição). O Worker salva tudo em `orcamentos` (status `PENDENTE`), calcula o valor, dispara notificações e retorna o código de pedido.

| # | Tarefa | Status |
|---|--------|--------|
| F1 | `Contact.tsx`: formulário Nome, Email, WhatsApp, Serviço, Urgência, Descrição | ✅ |
| F2 | Validar (email obrigatório) | ✅ |
| F3 | Carregar serviços (catálogo local `src/data/services.ts` + `GET /services` do Worker quando `VITE_WORKER_URL` configurado) | ✅ |
| F4 | `POST /orcamento` (Worker) — **submit único registra dados + confirma solicitação** + abrir `wa.me` p/ você | ✅ (submit único; aviso ao dono por email via Resend) |
| F5 | Cálculo de preço (recomendado) + preview dinâmico no cliente | ✅ (`src/lib/pricing.ts`) |
| F6 | Confirmação com código de pedido p/ o cliente | ✅ |

### Fase 5 — Dashboard Admin (`/admin`) + Aprovação
| # | Tarefa | Status |
|---|--------|--------|
| A1 | Rota `/admin` com **Supabase Auth** (login email/senha) | ✅ (página própria `admin.html` + `/admin`; v1.20.0 migrou de `#/admin` p/ MPA — `src/admin/main.tsx` + `src/pages/Admin.tsx` + `src/lib/supabase.ts`; redirect automático do `#/admin`) |
| A2 | Lista orçamentos (status PENDENTE/APROVADO/RECUSADO, dados, valor, datas) | ✅ (`GET /admin/orcamentos` no Worker + listagem) |
| A3 | Botão Aprovar/Recusar → `POST /aprovar` → Worker gera PDF + Resend envia p/ cliente | ✅ (`POST /admin/aprovar` no Worker + `src/lib/api.ts`) |
| A4 | Aviso p/ você (email) que o orçamento foi enviado ao cliente | ✅ (em `POST /admin/aprovar`, status APROVADO) |
| A5 | Visão de visitas (via Umami) + exportação CSV | ⬜ (deferido; visitas via Umami + botão export p/ depois) |

> **Segurança admin:** `GET /admin/orcamentos` e `POST /admin/aprovar` exigem `Authorization: Bearer <token Supabase Auth>`, validado no Worker via `db.auth.getUser()`. `orcamentos` segue sem RLS (só Worker via service_role).

### 🔁 Revisão UX — Modal de Orçamento em Etapas + sem preços no front (2026-08-27)

> **Decisões do usuário:** (1) nunca expor valores dos serviços no front — o cliente só vê o valor no **PDF do orçamento**; (2) o CTA "Solicitar Orçamento" abre um **modal** em etapas; (3) passo 1 = serviço + urgência, passo 2 = dados do cliente (nome, email, WhatsApp, **CPF/CNPJ** + descrição opcional), botão de submit → vai para aprovação; (4) após submit, **mensagem "aguarde PDF no email" + código**; (5) código do pedido continua visível ao cliente.

| # | Tarefa | Status |
|---|--------|--------|
| M1 | `src/data/services.ts`: remover `base_price`/`complexity`/`estimated_days` do front (só `slug`/`name`/`description`/`repo`) | ✅ |
| M2 | `src/lib/pricing.ts`: manter só `formatBRL` (admin); remover `computeQuote`/`getService`/`LineItem`/`URGENCIA_FACTOR` do front | ✅ |
| M3 | `src/components/QuoteModal.tsx`: modal wizard (passo 1 serviço+urgência; passo 2 dados; passo 3 sucesso) | ✅ |
| M4 | `src/components/Contact.tsx`: botão "Solicitar Orçamento" abre modal; remover form inline e preview de preço | ✅ |
| M5 | `src/lib/api.ts`: `fetchServices` só dados públicos (sem preço); `submitOrcamento` com `cpf_cnpj` | ✅ |
| M6 | i18n pt/en/es: chaves do modal em etapas | ✅ |
| M7 | Backend `cpf_cnpj`: `schema.sql` + worker `types.ts`/`index.ts`/`pdf.ts` | ✅ |
| M8 | Validação: typecheck + build front e worker | ✅ |

> **Nota:** a fonte da verdade dos preços passa a ser **somente o Worker/Supabase** (tabela `services`). O front não carrega nenhum valor. O admin (`Admin.tsx`) continua mostrando valores reais vindos do Worker (correto — só o cliente não vê).

### 💰 Cálculo de Preços — Recomendação (registrada p/ validação)

> Valores base + multiplicadores configuráveis em `src/data/services.json`.

| Serviço | Repos origem | Base (R$) | Complexidade | Prazo estimado |
|---------|--------------|-----------|--------------|----------------|
| Dashboard Interativo | `labgas-manager`, `sales-dashboard` | 1500 | média (×1.3) | 14d |
| Chatbot IA (RAG) | `chatbot-oficina`, `pro-git-qa-bot` | 2500 | alta (×1.6) | 21d |
| Análise de Dados / BI | (a definir) | 1200 | média (×1.3) | 10d |
| Automação/Pipeline | (a definir) | 1800 | média (×1.3) | 12d |

**Multiplicadores:**
- Complexidade: baixa 1.0 · média 1.3 · alta 1.6
- Urgência: normal 1.0 · urgente 1.2 · muito urgente 1.5
- **Preço = Σ(base × complexidade) × urgência**

### 🔒 LGPD — aplicada ao novo design
| Princípio | Implementação |
|-----------|--------------|
| Consentimento | Opt-in no CookieConsent antes de coletar/registrar visita |
| Minimização | Umami cookieless (hash diário), sem IP direto no banco |
| Finalidade | Declaração no modal |
| Segurança | Credenciais apenas no Worker (server-side), nunca no bundle |
| Acesso/exclusão | Cliente pode solicitar remoção por email; status/PDF no `/admin` |

### 🔗 Referências (revisadas)
- [Supabase pricing/limits](https://supabase.com/pricing) · [Edge Functions limits](https://supabase.com/docs/guides/functions/limits)
- [Resend free tier](https://resend.com/pricing)
- [Cloudflare Workers pricing/limits](https://developers.cloudflare.com/workers/platform/pricing/)
- [Umami](https://umami.is) · [Umami vs GoatCounter](https://analytics-alternatives.com/compare/goatcounter-vs-umami/)
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

### 🔑 Checklist de Credenciais pendentes (usuário fornece)

> Preenchido conforme respostas do usuário (2026-08-27): rotaciona key depois, passa faltantes em lote, aviso por email.
> Regra de segurança: **só chaves públicas vão no chat/repo**. Secretas (`service_role` nova, `BREVO_API_KEY`) vão direto via `wrangler secret put` — nunca no chat.

#### 1. Umami (analytics) — provisionado ✅ (`cloud.umami.is`)
- [x] `VITE_UMAMI_WEBSITE_ID` (público) = `076f01cd-40c0-45de-87c8-6888cb9efb78`
- [x] `VITE_UMAMI_SRC` (público) = `https://cloud.umami.is/script.js`

#### 2. Brevo (email) — sem domínio (sender verificado por email)
- [ ] `BREVO_API_KEY` (**SECRET** → `wrangler secret put BREVO_API_KEY`)
- [ ] Sender (ex.: `cavalcanteprofissional@outlook.com` — validar remetente na conta Brevo)
- [ ] `FROM_EMAIL` desejado (ex.: `Cavalcante <cavalcanteprofissional@outlook.com>`) → atualizar `worker/wrangler.toml:9`

#### 3. Cloudflare Workers (deploy)
- [ ] Login Wrangler (`npx wrangler login`)
- [ ] Subdomain/rota do Worker (ex.: `orcamentos.<sub>.workers.dev`)
- [ ] **`SERVICE_ROLE_KEY` NOVA** (**SECRET** → `wrangler secret put SERVICE_ROLE_KEY`) — após usuário rotacionar no painel

#### 4. Serviços / preços (Fase 4 — tabela `services`)
- [ ] Confirmar lista **serviço → repos públicos** (Dashboard, Chatbot IA, Análise/BI, Automação)
- [ ] Confirmar base/shortcodes de preço (recomendação no plano acima)

#### 5. Confirmado
- [x] `VITE_SUPABASE_URL` = `https://ohtkfjckydmjsfuouyaj.supabase.co` (pública)
- [x] `VITE_SUPABASE_ANON_KEY` = `sb_publishable_...` (pública)
- [x] Aviso ao dono por **email** (Resend) → `cavalcanteprofissional@outlook.com`

#### 📌 Plano de implementação (independe das chaves — pode avançar)
- [x] Escrito `supabase/schema.sql` (tabelas + RLS)
- [x] Montada estrutura `worker/` (Wrangler, pdf-lib, Resend, CORS, cron health) — testa com `wrangler dev`
- [ ] Front: `VITE_` env vars + hash routing `#/admin` + form no `Contact.tsx`

> **Nota:** PDF gerado com **pdf-lib** (compatível com runtime Workers), e não PDFKit (que depende de streams Node indisponíveis no Workers).

---

### ✅ Fase 2–5 do Backend Real — implementação concluída (2026-08-27)

> **Status:** todo o código está escrito, typecheck/build front + worker e `wrangler deploy --dry-run` passando. Falta apenas **provisionar os serviços e injetar credenciais reais** (manual) e fazer o deploy.

#### 🧪 Fase 2 — Tracking por token revertido + Umami consent-gated (commit `21f7926`)
| # | Tarefa | Status |
|---|--------|--------|
| R1 | Deletar `src/lib/tracking.ts`, `.github/workflows/track.yml`, `scripts/append-visit.mjs`, `data/` | ✅ |
| R2 | Remover `useEffect` de `trackVisit` no `App.tsx` + `useConsentStore` não usado | ✅ |
| R3 | Remover `VITE_GH_TOKEN` do `.env.example` | ✅ |
| R4 | Deploy do Umami (Cloud free-tier ou self-host) | ⬜ (provisão manual) |
| R5 | Loader Umami no `App.tsx`, consent-gated (aguarda `VITE_UMAMI_WEBSITE_ID`) | ✅ |
| R6 | Verificar typecheck e build | ✅ |

#### 🏗️ Fase 3 — Supabase + Cloudflare Worker + Resend (commit `d0b0cda`)
| # | Tarefa | Status |
|---|--------|--------|
| S1 | `supabase/schema.sql` (RLS restritivo, orcamentos sem policy) | ✅ |
| S2 | Estrutura `worker/` (Wrangler, pdf-lib, Resend, CORS, cron) | ✅ |
| S3 | Rotas: `POST /orcamento`, `GET /services`, `GET /orcamento/:codigo`, `GET /health`, cron anti-pausa | ✅ |
| S4 | PDF via **pdf-lib** (compatível com runtime Workers) | ✅ |
| S5 | CORS p/ GitHub Pages + cron 1x/dia no `wrangler.toml` | ✅ |
| S6 | Configurar Resend + domínio (SPF/DKIM) | ⬜ (aguarda credenciais) |
| S7 | Secrets via `wrangler secret put` (service_role NOVA rotacionada + RESEND_API_KEY) | ⬜ (aguarda credenciais) |

#### 📝 Fase 4 — Formulário/Modal de Orçamento no CTA (commit `ce54447`)
| # | Tarefa | Status |
|---|--------|--------|
| F1 | `src/data/services.ts` + `src/lib/pricing.ts` (front só público) | ✅ |
| F2 | `src/lib/api.ts`: `fetchServices` (sem preço) + `submitOrcamento` (com `cpf_cnpj`) | ✅ |
| F3 | `Post /orcamento` submit único | ✅ |
| F4 | Confirmação com código de pedido | ✅ |
| F5 | Aviso ao dono por email (Resend) → `cavalcanteprofissional@outlook.com` | ✅ |

#### 🖥️ Fase 5 — Dashboard Admin `#/admin` (commit `27c3f81`)
| # | Tarefa | Status |
|---|--------|--------|
| A1 | Hash routing `#/admin` + `src/pages/Admin.tsx` + `src/lib/supabase.ts` (Supabase Auth) | ✅ |
| A2 | Listagem orçamentos (`GET /admin/orcamentos`, Bearer token validado via `db.auth.getUser()`) | ✅ |
| A3 | Aprovar/Recusar (`POST /admin/aprovar` → PDF + Resend p/ cliente) | ✅ |
| A4 | Aviso ao dono quando orçamento enviado | ✅ |
| A5 | Visão de visitas (Umami) + exportação CSV | ⬜ (deferido) |

#### 🔁 Revisão UX — Modal de Orçamento em Etapas + sem preços (commit `54daa79`)
| # | Tarefa | Status |
|---|--------|--------|
| M1–M8 | `services.ts` sem preço · `pricing.ts` só `formatBRL` · `QuoteModal.tsx` wizard · `Contact.tsx` botão → modal · i18n · backend `cpf_cnpj` | ✅ |

#### 🐛 Fixes pós-revisão (commits `9f098e6`→`9fed1dc`)
| # | Tarefa | Status |
|---|--------|--------|
| UX1 | CTA alinhado + botão abre modal | ✅ |
| UX2 | Modal segue scroll (createPortal — fix `position:fixed` quebrado por transform do Reveal) | ✅ |
| UX3 | Urgência em pills (padrão do projeto; chave i18n `muito_urgente` corrigida) | ✅ |
| UX4 | CTA 1×3 → só "Solicitar Orçamento" + brilho pulsante (`cta-glow`) | ✅ |
| UX5 | Hero: botão de email → `cta-glow` "Solicitar Orçamento" (abre modal) | ✅ |
| UX6 | Mobile: bio expande/collapsa só o texto; botões abaixo; centro no mobile / esquerda+mais larga na tablet | ✅ |

---

### 📌 Próximos passos — Deploy end-to-end (retomar em outra sessão)

> ⚠️ **Regra de segurança:** só chaves públicas vão no chat/repo. Secretas (`service_role` NOVA rotacionada, `RESEND_API_KEY`) vão direto via `wrangler secret put` — nunca no chat.

#### 📐 Passo 1 — Supabase (banco + auth)
- [ ] Rotacionar `service_role` (a antiga foi postada no chat → comprometida) — Guardar p/ `wrangler secret put`
- [ ] Rodar `supabase/schema.sql` no SQL Editor (cria `services` + `orcamentos` + RLS)
- [ ] Criar usuário admin (Auth → Users) p/ login do `admin.html`
- [ ] Confirmar anon key (pública) e `SUPABASE_URL`

#### ✉️ Passo 2 — Brevo (email — sem domínio)
- [ ] Criar conta em **my.brevo.com**; validar **sender** (pode ser `cavalcanteprofissional@outlook.com`)
- [ ] Gerar `BREVO_API_KEY` (secreto → `wrangler secret put BREVO_API_KEY`)
- [ ] Informar o `from` (substituir placeholder no `wrangler.toml:9`, ex.: `Cavalcante <cavalcanteprofissional@outlook.com>`)

#### ☁️ Passo 3 — Cloudflare Workers (deploy do Worker)
- [ ] `npx wrangler login`
- [ ] `wrangler secret put BREVO_API_KEY` + `wrangler secret put SERVICE_ROLE_KEY`
- [ ] Corrigir `FROM_EMAIL` no `wrangler.toml`
- [ ] `npx wrangler deploy` → informar URL do Worker p/ `VITE_WORKER_URL`

#### 📊 Passo 4 — Umami (analytics) ✅ provisionado
- [x] Site criado em `cloud.umami.is` (domain: `cavalcanteprofissional.github.io`)
- [x] `VITE_UMAMI_WEBSITE_ID` + `VITE_UMAMI_SRC` já no `.env.local`
- [ ] Apenas **validar** visite após aceitar cookie (Passo 7)

#### 🧾 Passo 5 — Populhar `services` (catálogo/preços — fonte da verdade no backend)
- [ ] Inserir linhas (slug, name/description jsonb pt/en/es, repo, base_price, complexity, estimated_days, active)
- [ ] Confirmar lista serviço→repos + base/multiplicadores (recomendação registrada acima)

#### 🚀 Passo 6 — Frontend + deploy do site
- [x] `.env.local` preenchido: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_SRC`
- [ ] `VITE_WORKER_URL` = URL do Worker (após Passo 3)
- [ ] Merge branch `feat/tracking` → `main` + Deploy via GitHub Actions (GitHub Pages)

#### ✅ Passo 7 — Validação end-to-end
- [ ] `GET /health` → `ok:true`
- [ ] Solicitar orçamento no modal → código + aviso por email ao dono
- [ ] Login `admin.html` → listar → aprovar → cliente recebe **PDF** por email
- [ ] Conferir visita no Umami após aceitar cookie

---

### 📝 Registro de execução — refatoração Resend → Brevo (2026-08-29)

> **Motivo:** usuário não quer pagar domínio → Resend (exige domínio verificado SPF/DKIM) substituído por **Brevo** (gratuito, sem domínio, sender verificado por email).

**Já concluído ✅:**
- [x] `worker/src/email.ts` (renomeado de `resend.ts`) — SDK `resend` trocado por REST do Brevo (`https://api.brevo.com/v3/smtp/email`); mesma assinatura `sendEmail(apiKey, from, p)`; anexo PDF convertido para base64
- [x] `worker/src/index.ts` — `RESEND_API_KEY` → `BREVO_API_KEY` (interface `Env` + 3 chamadas); import `./email`
- [x] `worker/wrangler.toml` — secret renomeado `BREVO_API_KEY`; `FROM_EMAIL` = `Cavalcante <cavalcanteprofissional@outlook.com>`
- [x] `worker/package.json` + `package-lock.json` — removida dep `resend` (npm install sincronizado)
- [x] `README.md` / `CHANGELOG.md` / `TODO.md` — referências Resend → Brevo
- [x] `supabase/seed.sql` — INSERT idempotente de `services` (preços aprovados: Dashboard 1500, Chatbot 2500, Análise/BI 1200, Automação 1800)
- [x] Validações: `worker` typecheck ✅ · frontend typecheck ✅ · `npm run build` ✅ · `wrangler deploy --dry-run` ✅ (bundle 1571KiB)
- [x] `.env.local` — comentários em todas as keys; `.env.example` espelhado
- ⚠️ Lint raiz pré-existente: `eslint .` varre `worker/` (config do frontend) gerando erros de `no-unused-vars`/globals já existentes antese — fora do escopo desta refatoração

**Credenciais públicas já registradas (`.env.local`):**
- [x] `VITE_SUPABASE_URL` = `https://ohtkfjckydmjsfuouyaj.supabase.co`
- [x] `VITE_SUPABASE_ANON_KEY` = `sb_publishable_...` (pública — valor no `.env.local`)
- [x] `VITE_UMAMI_WEBSITE_ID` = `076f01cd-40c0-45de-87c8-6888cb9efb78`
- [x] `VITE_UMAMI_SRC` = `https://cloud.umami.is/script.js`
- [x] `VITE_WORKER_URL` = `https://portfolio-cavalcante-worker.cavalcanteprofissional.workers.dev`

**Aguardando usuário (em andamento) ⏳:**
- [x] Brevo: `BREVO_API_KEY` gerada (recebida 2026-08-29) — aplicada via `wrangler secret put BREVO_API_KEY` ✅
- [x] Cloudflare: `wrangler login` ✅ (conta `cavalcanteprofissional`); secrets `BREVO_API_KEY` + `SERVICE_ROLE_KEY` aplicados ✅
- [x] **Subdomínio workers.dev registrado** pelo suporte Cloudflare (`cavalcanteprofissional`) + rota `workers.dev` ativada para o Worker ✅
- [x] **Worker publicado** ✅ — `GET /health` → `{"ok":true,"supabase":true}` · rota: `https://portfolio-cavalcante-worker.cavalcanteprofissional.workers.dev`
- [x] **`seed.sql` rodado** ✅ — `GET /services` retorna os 4 serviços (dashboard 1500, chatbot 2500, analise-bi 1200, automacao 1800)
- [x] `wrangler.toml` — adicionado `workers_dev = true` (evita desativar rota em futuros deploys)
- [x] **Redeploy final do Worker** ✅ — código atual (rename `email.ts`, `FROM_EMAIL`, `workers_dev`) publicado; `GET /health` → `{"ok":true,"supabase":true}` · `GET /services` → 4 serviços
- [ ] ⚠️ **Decisão usuária:** manter `SERVICE_ROLE_KEY` atual (NÃO rotacionar agora) — ainda exposta no chat = risco de segurança aceito. **Recomendação permanece:** rotacionar antes de expor publicamente/produção real
- [ ] Brevo: confirmar **sender verificado** (`cavalcanteprofissional@outlook.com`) — `FROM_EMAIL` já no `wrangler.toml`
- [ ] Supabase: criar **usuário admin** (Authentication → Users) p/ login `admin.html`
- [ ] **Merge `feat/tracking` → `main` + deploy site (GitHub Actions) + validação e2e (Passo 7)**
  - [x] (PÓS-MERGE PREP) **Step `wrangler deploy` adicionado no `.github/workflows/deploy.yml`** (job `build`, após `npm run build`): `npm ci` + `npx wrangler deploy` em `worker/`, condicionado a `secrets.CLOUDFLARE_API_TOKEN != '' && secrets.CLOUDFLARE_ACCOUNT_ID != ''` — deploy automático do Worker junto do site sem quebrar se faltarem secrets. *Decisão usuária (2026-08-29): remover integração "Workers Builds" do Cloudflare (Opção A) e centralizar o deploy do Worker no GitHub Actions.*
  - [x] (PÓS-MERGE PREP) **Credenciais CI p/ wrangler:** secrets do repositório criadas em GitHub → Settings → Secrets: `CLOUDFLARE_API_TOKEN` (scoped em Workers Scripts → Edit; validada via `wrangler whoami` → conta `cavalcanteprofissional`) + `CLOUDFLARE_ACCOUNT_ID` (`1871ddf7...`); valores também registrados (referência) em `.env.local` + documentados em `.env.example`. `HF_TOKEN` = secret existente do pipeline de currículo.
  - [ ] (PÓS-MERGE) **Validação e2e (Passo 7):** `GET /health` · orçamento no modal (código + email dono) · login `admin.html` criar usuário admin no Supabase · conferir visita no Umami

> **🔗 Vínculo Git–Cloudflare (2026-08-29):** foi criada (por acidente) uma integração "Workers Builds" com `root_directory: /` + `build_command: npm run build` (0 builds, nada quebrou). Removida via suporte Cloudflare (Opção A). Conta limpa: sem Pages, sem Workers Builds, sem conexão de repo. Worker deployado manual via `wrangler deploy`. **Plano:** automatizar no `deploy.yml` (pós-merge). Subdomínio workers.dev já registrado e ativo: `cavalcanteprofissional`.

# Plano: Chatbot RAG integrado (estilo WhatsApp)

> Documento de planejamento da **Onda 1.23** — integração de um chatbot com UI/UX
> no padrão do portfolio, simulando uma aba de conversa estilo WhatsApp, com RAG
> (chunking + embeddings + vector store).

> [!IMPORTANT]
> **Status (2026-09-08): implementação aguardando a conta Groq.** A conta do
> usuário na Groq está com problema (faturamento/acesso). Nada será implementado
> no Worker `POST /chat` até normalizar. A migração Supabase e o script de
> ingestão podem ser preparados, mas o teste fim-a-fim depende da Groq liberada.

## Decisões confirmadas

| Decisão | Escolha |
|--------|---------|
| LLM | **Groq** — `llama-3.1-8b-instant` (free tier, rápida; suficiente p/ QA de portfólio) |
| Embeddings | **Cloudflare Workers AI** — `@cf/baai/bge-m3` (**1024 dims**, multilíngue pt/en/es) |
| Vector store | **Supabase pgvector** (já existe Supabase no projeto) |
| Acesso | **Público** (visitantes) com rate-limit (20/hr no `/chat`) |
| Launcher | **FAB flutuante** estilo WhatsApp (canto inferior, `z-[58]`) |
| Sugestões (chips) | Aparecem **só na 1ª abertura** (histórico vazio) |
| Histórico | **Só client-side** (estado + `sessionStorage`) — sem persistir |
| Ingestão (v1) | Chunks **somente em PT** (fonte única); coluna `lang` já prepara pt/en/es; `retrieve` faz fallback p/ `pt` |

**Nota de arquitetura**: O serviço `chatbot-ia (RAG)` já existe no
`supabase/seed.sql`. Vou conectá-lo no handoff de "falar com humano"
(orçamento/WhatsApp).

**Por que Cloudflare Workers AI p/ embeddings**: a Groq NÃO oferece API de
embeddings (só LLM chat). Workers AI roda no mesmo runtime, tem free tier
generoso e não exige chave adicional além da conta Cloudflare. Escolhido
**`bge-m3` (1024 dims)** por ser **multilíngue** (o CV é fonte em PT e os
chunks futuros poderão ter EN/ES) — no Worker via binding `AI`, no ingest
via REST com `CLOUDFLARE_API_TOKEN` (já presente no `.env.local`).

---

## Arquitetura de alto nível

```
[React app] --POST /chat {message, lang}--> [Cloudflare Worker]
                                                  |
                                                  |-- 1) embedding da pergunta (Workers AI)
                                                  |-- 2) busca top-K no Supabase pgvector
                                                  |-- 3) monta contexto + prompt
                                                  |-- 4) chat completion na Groq
                                                  |-- 5) retorna resposta
[React app] <----- {answer} ----------------------
```

## RAG pipeline

1. **Ingestão offline** (script Node `scripts/ingest-resume.mjs`): lê o
   `resume/curriculo-fonte.md` (front-matter), gera **chunks** por seção
   (dados_pessoais, resumo, cada experiência, cada formação, cada certificação,
   categorias de habilidades, idiomas), formata cada chunk em texto legível,
   gera embedding via Workers AI, e **faz upsert no Supabase** (`chat_docs` com
   `embedding`, `content`, `section`, `lang`, `metadata`). Roda manualmente
   sempre que o CV mudar.
2. **Query time** (no Worker): projeta a pergunta → embedding (`bge-m3`) →
   `db.rpc('match_chat_docs', …)` (top-K 6 por similaridade consine via
   `match_chat_docs`, fallback p/ `pt`) → religa os chunks no `system` prompt +
   histórico → Groq responde.

---

## Mudanças por camada

### A) Supabase — `supabase/migrations/20260908_chat_docs.sql` (nova tabela pgvector)

```sql
create extension if not exists vector;

create table if not exists public.chat_docs (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  section    text not null,               -- dados_pessoais / resumo / experiencia / formacao / certificacao / habilidades / idiomas
  lang       text not null default 'pt',  -- pt | en | es (v1: só pt)
  embedding  vector(1024) not null,       -- @cf/baai/bge-m3 (1024 dims)
  metadata   jsonb,
  created_at timestamptz default now()
);
create index on public.chat_docs using hnsw (embedding vector_cosine_ops);
-- sem policies, como orcamentos -> só o Worker (service_role) lê/grava

-- Busca vetorial via rpc() (supabase-js não ordena por distância de vetor de forma confiável no .select())
create or replace function public.match_chat_docs(
  query_embedding vector(1024),
  match_count int default 6,
  lang text default 'pt'
)
returns table (content text, section text, metadata jsonb, similarity real)
language sql stable
as $$
  select d.content, d.section, d.metadata,
         1 - (d.embedding <=> query_embedding) as similarity
  from public.chat_docs d
  where d.lang = lang or d.lang = 'pt'
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- Só o Worker (service_role) executa a função; anon/authenticated negados por padrão.
revoke all on function public.match_chat_docs(vector(1024), int, text) from anon;
revoke all on function public.match_chat_docs(vector(1024), int, text) from authenticated;
```

> **Ingestão**: o script Node usa `SUPABASE_URL` + `SERVICE_ROLE_KEY` (lidas de
> env, nunca commitadas; adicionar `SERVICE_ROLE_KEY` ao `.env.local` local).
> pgvector HNSW (cosine) para busca rápida. Sem RLS policies — só o Worker
> (service_role) acessa.

### B) Worker — `worker/src/index.ts` + novos módulos

- **`Env`** ganha: `GROQ_API_KEY: string`, plus consts `EMBEDDING_MODEL`
  (`@cf/baai/bge-m3`) / `GROQ_MODEL` (`llama-3.1-8b-instant`). Wrangler:
  registrar secret comentado `GROQ_API_KEY` (`wrangler secret put GROQ_API_KEY`
  pós-deploy). Workers AI usa o binding `AI` — adicionar ao `Env` como `AI: Ai`
  (tipo importado de `@cloudflare/workers-types/experimental`).
- **Novo `worker/src/rag.ts`**:
  - `embed(text, env)` — chama Workers AI `env.AI.run('@cf/baai/bge-m3', { text })`.
  - `retrieve(query, lang, env)` — `db.rpc('match_chat_docs', { query_embedding,
    match_count, lang })` no Supabase pgvector (fallback p/ `pt`).
  - `askGroq(prompt, history, env)` — monta prompt → Groq
    `POST https://api.groq.com/openai/v1/chat/completions` (padrão `fetch`
    idêntico ao Brevo/Umami, checando `res.ok`).
  - `buildSystemPrompt(chunks, services, lang)` — contexto + lista de serviços
    públicos (slug/nome/desc — **sem preços**) + regra de handoff.
- **`index.ts`**: nova rota **`POST /chat`** (pública, com `checkRate` —
  rate-limit mais alto que orçamento, **20/hr**) antes do `throw 404`. Valida
  `message` (string 1..2000) e `lang` (`pt|en|es`). Retorna `{ answer }`.
- **Handoff**: se o bot não souber responder, sugere WhatsApp
  (`wa.me/5585996859051`) / solicitar orçamento — reusa os dados reais dos
  serviços (públicos) no prompt.

### C) Frontend — novo widget + api + i18n

- **`src/lib/api.ts`**: `export async function chatWithBot(message, lang):
  Promise<{ answer: string }>` via `wf<...>('/chat', { method:'POST', ... })` com
  timeout. Graceful: se `!available()` → resposta local de fallback (demo),
  igual `submitOrcamento`.
- **Novo `src/components/ChatBot.tsx`** (exportar em `src/components/index.ts`):
  - **FAB launcher**: botão circular fixo no canto inferior (estilo WhatsApp,
    ícone `MessageCircle`/`Bot` do lucide, `cta-glow`, `z-[58]` — acima do
    Nav/Footer `z-50`, abaixo dos modais).
  - **Janela de chat** (`createPortal` + `AnimatePresence` + `motion`, seguindo o
    template do `QuoteModal`: backdrop `bg-black/60`, painel
    `rounded-2xl border border-border bg-card shadow-2xl`, body-scroll-lock,
    foco/Escape/Tab-trap, `aria-modal`). Painel menor/posicionado ao lado do FAB
    (não centralizado) — bottom-sheet estilo WhatsApp.
  - **Cabeçalho**: avatar + nome ("Lucas • Assistente IA") + badge "online".
  - **Mensagens**: bolhas (bot = `bg-secondary text-foreground` esquerda;
    usuário = `bg-primary text-primary-foreground` direita), timestamps,
    indicador de "digitando..." (3 pontos animados).
  - **Sugestões de atalho** como chips (ex. "Quais serviços você oferece?",
    "Qual sua experiência com IA?") — **só com histórico vazio (1ª abertura)**.
  - **Input + botão enviar**, Enter envia, estado `typing`/`sending`,
    `scrollbar-hide` na lista.
  - **Handoff**: link "Falar no WhatsApp" na janela (reusa
    `wa.me/5585996859051`) + botão que abre o `QuoteModal` de orçamento.
  - **Histórico**: client-side (estado + `sessionStorage`), sem persistir.
- **`src/i18n/index.ts`**: novo namespace `chat.*` em **pt/en/es** (ex.:
  `chat.title`, `chat.placeholder`, `chat.typing`, `chat.handoff`,
  `chat.whatsappMsg`, `chat.suggestions[]`).
- **`src/App.tsx`**: montar `<ChatBot />` (raiz).

### D) Docs/varredura de fim

- `.env.example`: documentar `VITE_WORKER_URL`, `SERVICE_ROLE_KEY` (ingest),
  `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` (ingest via REST) e um
  comentário do secret do Worker `GROQ_API_KEY` (via `wrangler secret put`).
- `TODO.md` (Onda 1.23) + `CHANGELOG.md` + `package.json` bump (→ 1.23.0).
- Deploy sem mudanças no workflow (secrets via `wrangler secret put
  GROQ_API_KEY` pós-deploy).

> **Blocker conhecido antes da etapa 2/4** (Worker `POST /chat` + teste
> fim-a-fim): conta **Groq** com problema (faturamento/acesso). As etapas 1
> (Supabase + ingestão) e 3 (UI com fallback demo) **não dependem da Groq** e
> podem avançar; a resposta real do bot só é validada após a conta normalizar.

---

## Segurança

- Chaves de LLM/embeddings **só no servidor** (Worker secrets), nunca no bundle
  — idêntico ao `UMAMI_API_KEY`.
- Rate-limit público no `POST /chat` evita abuso/custo.
- Respostas do modelo arbitradas por um prompt de sistema restrito ("responda
  apenas com base no contexto; se não souber, ofereça contato") + sanitização.
- `chat_docs` sem RLS policies — só o Worker (service_role) acessa.

---

## Custos (mantendo "gratuito")

- **Groq**: free tier generoso (`llama-3.1-8b-instant` é gratuito/altíssima
  taxa); a 8b é suficiente para QA de portfólio.
- **Workers AI embeddings**: free tier.
- **Supabase pgvector**: já incluso no plano free atual.
- Rate-limit para não estourar nenhum limite.

---

## Etapas de execução (quando sair do plan mode / Groq normalizar)

1. Migração Supabase (`supabase/migrations/20260908_chat_docs.sql` + aplicar no
   SQL Editor) + devDep `js-yaml` + script `scripts/ingest-resume.mjs`
   (embeddings via REST `bge-m3`) e rodar ingestão (`npm run ingest`).
2. Worker: `rag.ts` (embed/retrieve/askGroq/buildSystemPrompt) + binding `AI`
   + const `GROQ_MODEL`/`EMBEDDING_MODEL` + rota `POST /chat` + `wrangler secret
   put GROQ_API_KEY`. **Bloqueado até a conta Groq normalizar.**
3. Frontend: `ChatBot.tsx` + launcher FAB + `chat.*` i18n + `chatWithBot()` +
   montar no App.
4. Typechecks (root + worker), lint nos arquivos editados, build,
   `wrangler deploy --dry-run`.
5. Docs/versionamento + commit.

---

## Pontos decididos (antes em aberto)

- Modelo Groq: **`llama-3.1-8b-instant`** (default).
- Embeddings: **`@cf/baai/bge-m3`** (multilíngue, 1024 dims) — ajusta schema.
- Sugestões/chips: **só na 1ª abertura** (histórico vazio).
- Histórico: **client-side** (estado + `sessionStorage`).
- Ingestão v1: **PT** (fonte única); `lang` já prepara pt/en/es com fallback p/ `pt`.
- Ajuste técnico: busca via **rpc `match_chat_docs`** (supabase-js não ordena
  por distância de vetor de forma fiável no `.select()`).

## Pendências finas (UI, sem bloquear)

- Posição exata do FAB e estilo visual das bolhas (decidir na implementação).

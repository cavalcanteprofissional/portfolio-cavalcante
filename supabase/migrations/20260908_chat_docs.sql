-- =============================================================================
-- Migração — tabela `chat_docs` p/ o chatbot RAG (2026-09-08) — Onda 1.23
-- Aplicar manualmente no SQL Editor do Supabase (como a migração A7).
--
-- Limites de acesso: sem RLS policies — só o Worker (service_role) lê/grava.
-- O front chama a API do Worker (POST /chat), nunca o Supabase direto.
-- =============================================================================

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

create index if not exists chat_docs_embedding_idx
  on public.chat_docs using hnsw (embedding vector_cosine_ops);

-- Busca vetorial via rpc() (supabase-js não ordena por distância de vetor de forma fiável no .select())
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

-- Valide:
--   select count(*) from public.chat_docs;                                   -- nº de chunks ingeridos
--   select section, count(*) from public.chat_docs group by section order by 1; -- distribuição por seção
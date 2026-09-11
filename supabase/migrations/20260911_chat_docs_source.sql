-- =============================================================================
-- Migração — chat_docs multi-fonte + fallback de idioma melhorado (2026-09-11) — Onda 1.24
-- Aplicar manualmente no SQL Editor do Supabase (como a migração A7 / 20260908).
--
-- 1) Adiciona coluna `source` p/ ingestão multi-fonte com delete-then-insert POR FONTE
--    (curriculo, cv-pdf, faq, projetos, servicos, experiencias, content) + índices.
-- 2) Reescreve `match_chat_docs` p/ priorizar o idioma pedido e usar PT apenas como
--    fallback quando o idioma não tiver chunks suficientes.
-- =============================================================================

-- 1) source + índices
alter table public.chat_docs add column if not exists source text;

create index if not exists chat_docs_source_idx on public.chat_docs (source);
create index if not exists chat_docs_lang_idx on public.chat_docs (lang);

-- 2) match_chat_docs: primeiro tenta o idioma pedido; só completa com 'pt' se faltar
create or replace function public.match_chat_docs(
  query_embedding vector(1024),
  match_count int default 6,
  lang text default 'pt'
)
returns table (content text, section text, metadata jsonb, similarity real)
language plpgsql stable
as $$
declare
  primary_count int;
begin
  -- passada 1: apenas o idioma solicitado
  -- TAG=primary
  return query
    select d.content, d.section, d.metadata,
           1 - (d.embedding <=> query_embedding) as similarity
    from public.chat_docs d
    where d.lang = lang
    order by d.embedding <=> query_embedding
    limit match_count;
  get diagnostics primary_count = row_count;

  -- passada 2 (fallback): completa com PT se o idioma principal rendeu menos
  if primary_count < match_count and lang <> 'pt' then
    return query
      select d.content, d.section, d.metadata,
             1 - (d.embedding <=> query_embedding) as similarity
      from public.chat_docs d
      where d.lang = 'pt'
        and not exists (
          select 1 from public.chat_docs p
          where p.lang = lang and p.content = d.content
        )
      order by d.embedding <=> query_embedding
      limit match_count - primary_count;
  end if;
end;
$$;

-- Acesso: só o Worker (service_role); anon/authenticated continuam negados.
revoke all on function public.match_chat_docs(vector(1024), int, text) from anon;
revoke all on function public.match_chat_docs(vector(1024), int, text) from authenticated;
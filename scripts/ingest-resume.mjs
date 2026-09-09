// =============================================================================
// scripts/ingest-resume.mjs — ingestão offline do currículo no Supabase pgvector
// Onda 1.23 (chatbot RAG). Roda manualmente sempre que `resume/curriculo-fonte.md`
// mudar: `npm run ingest`.
//
// Fluxo:
//   1. Le `.env.local` (SUPABASE_URL, SERVICE_ROLE_KEY, CLOUDFLARE_ACCOUNT_ID,
//      CLOUDFLARE_API_TOKEN) sem sobrescrever o environment real (precedência CI).
//   2. Faz parse do front-matter do currículo e gera chunks PT por seção.
//   3. Gera embeddings via Cloudflare Workers AI `@cf/baai/bge-m3` (REST).
//   4. Apaga a tabela `chat_docs` e reinsere tudo (fonte única = idempotente).
//
// Regra de segurança: SERVICE_ROLE_KEY é SECRETA — lida só de `env`, nunca
// commitada nem impressa.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESUME_PATH = path.join(ROOT, 'resume', 'curriculo-fonte.md');
const ENV_LOCAL_PATH = path.join(ROOT, '.env.local');

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const EMBEDDING_BATCH = 8;
const LANG = 'pt';

function loadEnvLocal() {
  if (!existsSync(ENV_LOCAL_PATH)) return;
  const text = readFileSync(ENV_LOCAL_PATH, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    let value = raw.trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
}

function requireEnv(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[ingest] Chaves ausentes no environment/.env.local: ${missing.join(', ')}`);
    console.error('[ingest] SERVICE_ROLE_KEY é SECRETA — não vá no repo; copie de um secret existente.');
    process.exit(1);
  }
}

function frontMatterOf(md) {
  const lines = md.split('\n');
  if (lines[0]?.trim() !== '---') throw new Error('front-matter não encontrado (primeira linha != ---)');
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('front-matter não fechado (segundo --- ausente)');
  return lines.slice(1, end).join('\n');
}

const LABELS = {
  linguagens_e_bibliotecas: 'Linguagens & Bibliotecas',
  machine_learning: 'Machine Learning',
  ensembles_e_boosting: 'Ensembles & Boosting',
  modelos_lineares_e_auxiliares: 'Modelos Lineares e Auxiliares',
  deep_learning: 'Deep Learning',
  nlp: 'NLP',
  computer_vision: 'Visão Computacional',
  plataformas_e_ferramentas: 'Plataformas & Ferramentas',
  dados_e_modelos: 'Dados & Modelos',
  versionamento_ci_cd: 'Versionamento & CI/CD',
  cloud_e_conteinerizacao: 'Cloud & Contêinerização',
  visualizacao_dashboards: 'Visualização & Dashboards',
  engenharia_de_dados: 'Engenharia de Dados',
  marketing_digital: 'Marketing Digital',
  gestao_e_metodologias: 'Gestão & Metodologias',
  microsoft_office: 'Microsoft Office',
  habilidades_interpessoais: 'Habilidades Interpessoais',
};

function toLabel(key) {
  const words = String(key).replace(/_/g, ' ').split(' ');
  return words.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

function buildChunks(data) {
  const chunks = [];
  const meta = {};

  // dados_pessoais
  const dp = data.dados_pessoais ?? {};
  if (dp.nome) {
    chunks.push({
      section: 'dados_pessoais',
      text: [
        `Nome: ${dp.nome}`,
        `Título: ${dp.titulo ?? ''}`,
        `Cidade: ${dp.cidade ?? ''}`,
        `Telefone: ${dp.telefone ?? ''}`,
        `Email: ${dp.email ?? ''}`,
        `LinkedIn: ${dp.linkedin ?? ''}`,
        `GitHub: ${dp.github ?? ''}`,
        `Portfólio: ${dp.portfolio ?? ''}`,
      ]
        .filter((l) => l && !l.endsWith(': '))
        .join('\n'),
      metadata: { categoria: 'dados_pessoais' },
    });
  }

  // resumo_profissional
  if (data.resumo_profissional) {
    chunks.push({
      section: 'resumo',
      text: `Resumo profissional: ${data.resumo_profissional.trim()}`,
      metadata: { categoria: 'resumo' },
    });
  }

  // experiencia_profissional
  for (const exp of data.experiencia_profissional ?? []) {
    if (!exp?.cargo) continue;
    const atv = Array.isArray(exp.atividades) ? exp.atividades.filter(Boolean) : [];
    const text = [
      `Experiência: ${exp.cargo}${exp.empresa ? ` na ${exp.empresa}` : ''}${exp.periodo ? ` (${exp.periodo})` : ''}.`,
      atv.length ? `Atividades: ${atv.join('; ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    chunks.push({
      section: 'experiencia',
      text,
      metadata: { categoria: 'experiencia', cargo: exp.cargo, empresa: exp.empresa ?? null },
    });
  }

  // formacao_academica
  for (const f of data.formacao_academica ?? []) {
    if (!f?.curso) continue;
    chunks.push({
      section: 'formacao',
      text: `Formação: ${f.curso} — ${f.instituicao ?? ''}${f.ano ? ` (${f.ano})` : ''}.`,
      metadata: { categoria: 'formacao', curso: f.curso, instituicao: f.instituicao ?? null },
    });
  }

  // certificacoes
  for (const c of data.certificacoes ?? []) {
    if (!c?.nome) continue;
    chunks.push({
      section: 'certificacao',
      text: `Certificação: ${c.nome} — ${c.instituicao ?? ''}${c.ano ? ` (${c.ano})` : ''}.`,
      metadata: { categoria: 'certificacao', nome: c.nome },
    });
  }

  // habilidades_tecnicas — cada grupo raiz vira um chunk (recursivo p/ subgrupos)
  const h = data.habilidades_tecnicas ?? {};
  const skillLines = (items, prefix) => {
    const lines = [];
    const walk = (node, acc) => {
      if (Array.isArray(node)) {
        if (node.length) lines.push(acc ? `${acc}: ${node.join('; ')}` : node.join('; '));
        return;
      }
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          const label = LABELS[k] ?? toLabel(k);
          walk(v, acc ? `${acc} — ${label}` : label);
        }
      }
    };
    walk(items, prefix);
    return lines;
  };
  for (const [key, value] of Object.entries(h)) {
    const label = LABELS[key] ?? toLabel(key);
    const lines = skillLines(value, label);
    if (lines.length) {
      chunks.push({
        section: 'habilidades',
        text: `Habilidades técnicas — ${lines.join(' | ')}`,
        metadata: { categoria: 'habilidades', grupo: key },
      });
    }
  }

  // idiomas
  const langs = Array.isArray(data.idiomas) ? data.idiomas.filter((i) => i?.idioma) : [];
  if (langs.length) {
    chunks.push({
      section: 'idiomas',
      text: `Idiomas: ${langs.map((l) => `${l.idioma} (${l.nivel ?? ''})`).join('; ')}.`,
      metadata: { categoria: 'idiomas' },
    });
  }

  return chunks;
}

async function embedBatch(accountId, apiToken, texts) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBEDDING_MODEL}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts }),
    },
  );
  if (!res.ok) {
    throw new Error(`embedding HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = await res.json();
  const data = json?.result?.data;
  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error('embedding: resposta inesperada do Workers AI (shape fora do esperado)');
  }
  return data;
}

async function main() {
  const start = Date.now();
  console.log(`[ingest] Currículo: ${RESUME_PATH}`);
  loadEnvLocal();
  requireEnv('SERVICE_ROLE_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN');

  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL) {
    console.error('[ingest] Chave SUPABASE_URL (ou VITE_SUPABASE_URL) ausente no environment/.env.local.');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, process.env.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const md = readFileSync(RESUME_PATH, 'utf8');
  const data = load(frontMatterOf(md));
  const chunks = buildChunks(data);

  if (chunks.length === 0) throw new Error('[ingest] Nenhum chunk gerado — front-matter vazio?');
  console.log(`[ingest] ${chunks.length} chunks gerados (${data.idioma_fonte ?? LANG}).`);

  // 1) embed em lote
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH).map((c) => c.text);
    const vecs = await embedBatch(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN, batch);
    for (const v of vecs) embeddings.push(v);
    console.log(`[ingest] embeddings ${Math.min(i + EMBEDDING_BATCH, chunks.length)}/${chunks.length}...`);
  }

  // 2) delete-then-insert (idempotente; fonte única refletida em qualquer CV change)
  const { error: delErr } = await db
    .from('chat_docs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw new Error(`[ingest] delete chat_docs: ${delErr.message}`);

  const rows = chunks.map((c, i) => ({
    content: c.text,
    section: c.section,
    lang: data.idioma_fonte ?? LANG,
    embedding: embeddings[i],
    metadata: c.metadata ?? {},
  }));

  const { error: insErr } = await db.from('chat_docs').insert(rows);
  if (insErr) throw new Error(`[ingest] insert chat_docs: ${insErr.message}`);

  const { count, error: countErr } = await db
    .from('chat_docs')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`[ingest] count: ${countErr.message}`);

  console.log(`[ingest] OK — ${count ?? rows.length} linhas em chat_docs (${((Date.now() - start) / 1000).toFixed(1)}s).`);
}

main().catch((e) => {
  console.error('[ingest] Falha:', e.message ?? e);
  process.exit(1);
});
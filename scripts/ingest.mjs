// =============================================================================
// scripts/ingest.mjs — ingestão OFFLINE multi-fonte do chatbot RAG no Supabase
// Onda 1.24 (substitui scripts/ingest-resume.mjs). Roda manualmente:
//   npm run ingest
//
// Fontes (→ chunks por fonte, ids em `chat_docs.source`):
//   curriculo   : resume/curriculo-fonte.md (front-matter YAML, PT)
//   cv-pdf      : resume/cv_br_lucas_cavalcante.pdf (extração pdf-parse, PT)
//   content     : CONTENT.md (meta, stats, empresas, disponibilidade)
//   faq         : src/i18n (faq.* — pt/en/es)
//   projetos    : src/data/projects.json + i18n project.* (pt/en/es)
//   servicos    : src/data/services.ts (pt/en/es)
//   experiencias: src/i18n experience.* (pt/en/es)
//
// Ingestão INCREMENTAL: delete-then-insert POR FONTE (não apaga as demais),
// idempotente. Requer o SQL Editor do Supabase na ordem: `supabase/schema.sql`
// → `supabase/rls.sql` → `supabase/seed.sql` (tabela com coluna `source` e RLS
// deny-all, que o script bypasseia via SERVICE_ROLE_KEY).
//
// Regra de segurança: SERVICE_ROLE_KEY é SECRETA — lida só de env/.env.local,
// nunca commitada nem impressa.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import { PDFParse } from 'pdf-parse';
import { translations } from '../src/i18n/index.ts';
import { SERVICES } from '../src/data/services.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESUME_PATH = path.join(ROOT, 'resume', 'curriculo-fonte.md');
const PDF_PATH = path.join(ROOT, 'resume', 'cv_br_lucas_cavalcante.pdf');
const CONTENT_PATH = path.join(ROOT, 'CONTENT.md');
const PROJECTS_PATH = path.join(ROOT, 'src', 'data', 'projects.json');
const ENV_LOCAL_PATH = path.join(ROOT, '.env.local');

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const EMBEDDING_BATCH = 8;
const LANGS = ['pt', 'en', 'es'];

// ---------------------------------------------------------------------------
// env
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// utilidades de extração
// ---------------------------------------------------------------------------

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

// Parse de tabela markdown: encontra o título (## ...) e lê da primeira linha
// com '|' até a linha sem '|'. Pula as linhas separadoras (---).
function parseTableRows(md, sectionTitleMightAppearAt) {
  const idx = md.indexOf(sectionTitleMightAppearAt);
  if (idx < 0) return [];
  const lines = md.slice(idx).split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].trim().startsWith('|')) i++;
  const rows = [];
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    const cells = l
      .split('|')
      .map((c) => c.trim().replace(/\*\*/g, ''))
      .filter((c) => c !== '');
    if (cells.length === 0) continue;
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // linha separadora
    rows.push(cells);
  }
  return rows;
}

// Normaliza espaços p/ dedupe de conteúdo
function normKey(text, lang) {
  return `${lang}:${text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 90)}`;
}

function dedupe(chunks) {
  const seen = new Set();
  const out = [];
  for (const c of chunks) {
    const key = normKey(c.text, c.lang);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// ---------------------------------------------------------------------------
// chunkers por fonte
// ---------------------------------------------------------------------------

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

function chunk(fn, section, source, lang, metadata = {}) {
  return { section, text: fn, lang, source, metadata: { ...metadata, source, lang } };
}

function buildCurriculoChunks(data, source) {
  const chunks = [];
  const meta = {};

  const dp = data.dados_pessoais ?? {};
  if (dp.nome) {
    chunks.push(
      chunk(
        [
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
        'dados_pessoais',
        source,
        'pt',
        { categoria: 'dados_pessoais' },
      ),
    );
  }

  if (data.resumo_profissional) {
    chunks.push(
      chunk(
        `Resumo profissional: ${data.resumo_profissional.trim()}`,
        'resumo',
        source,
        'pt',
        { categoria: 'resumo' },
      ),
    );
  }

  for (const exp of data.experiencia_profissional ?? []) {
    if (!exp?.cargo) continue;
    const atv = Array.isArray(exp.atividades) ? exp.atividades.filter(Boolean) : [];
    chunks.push(
      chunk(
        [
          `Experiência: ${exp.cargo}${exp.empresa ? ` na ${exp.empresa}` : ''}${exp.periodo ? ` (${exp.periodo})` : ''}.`,
          atv.length ? `Atividades: ${atv.join('; ')}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        'experiencia',
        source,
        'pt',
        { categoria: 'experiencia', cargo: exp.cargo, empresa: exp.empresa ?? null },
      ),
    );
  }

  for (const f of data.formacao_academica ?? []) {
    if (!f?.curso) continue;
    chunks.push(
      chunk(
        `Formação: ${f.curso} — ${f.instituicao ?? ''}${f.ano ? ` (${f.ano})` : ''}.`,
        'formacao',
        source,
        'pt',
        { categoria: 'formacao', curso: f.curso, instituicao: f.instituicao ?? null },
      ),
    );
  }

  for (const c of data.certificacoes ?? []) {
    if (!c?.nome) continue;
    chunks.push(
      chunk(
        `Certificação: ${c.nome} — ${c.instituicao ?? ''}${c.ano ? ` (${c.ano})` : ''}.`,
        'certificacao',
        source,
        'pt',
        { categoria: 'certificacao', nome: c.nome },
      ),
    );
  }

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
      chunks.push(
        chunk(`Habilidades técnicas — ${lines.join(' | ')}`, 'habilidades', source, 'pt', {
          categoria: 'habilidades',
          grupo: key,
        }),
      );
    }
  }

  const langs = Array.isArray(data.idiomas) ? data.idiomas.filter((i) => i?.idioma) : [];
  if (langs.length) {
    chunks.push(
      chunk(
        `Idiomas: ${langs.map((l) => `${l.idioma} (${l.nivel ?? ''})`).join('; ')}.`,
        'idiomas',
        source,
        'pt',
        { categoria: 'idiomas' },
      ),
    );
  }

  return chunks;
}

// PDF do CV — separa por seções e quebra bullets '•'
function buildPdfChunks(text, source) {
  const clean = text
    .replace(/\r/g, '')
    .replace(/-\n(?=[a-zà-ú])/g, '') // de-hifeniza quebras de linha
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const headers = [
    'RESUMO PROFISSIONAL',
    'EXPERIÊNCIA PROFISSIONAL',
    'FORMAÇÃO ACADÊMICA',
    'CERTIFICAÇÕES E QUALIFICAÇÕES',
    'HABILIDADES TÉCNICAS',
    'IDIOMAS',
  ];
  const positions = headers
    .map((h) => ({ h, i: clean.toUpperCase().indexOf(h) }))
    .filter((p) => p.i >= 0)
    .sort((a, b) => a.i - b.i);

  const sections = positions.map((p, idx) => {
    const start = p.i;
    const end = idx + 1 < positions.length ? positions[idx + 1].i : clean.length;
    return { header: p.h, body: clean.slice(start + p.h.length, end).trim() };
  });

  const chunks = [];
  for (const s of sections) {
    const isCareer = s.header === 'EXPERIÊNCIA PROFISSIONAL';
    const bullets = s.body
      .split(/\n\s*•\s*/)
      .map((b) => b.replace(/^\s*•\s*/, '').replace(/\n/g, ' ').trim())
      .filter((b) => b && b.length > 3);

    if (s.header === 'RESUMO PROFISSIONAL' || s.header === 'IDIOMAS') {
      if (s.body) chunks.push(chunk(s.body, 'resumo_pdf', source, 'pt', { categoria: s.header }));
      continue;
    }
    if (s.header === 'HABILIDADES TÉCNICAS') {
      if (s.body) {
        const mid = Math.ceil(s.body.length / 2);
        chunks.push(
          chunk(s.body.slice(0, mid), 'habilidades_pdf', source, 'pt', { categoria: s.header, parte: 1 }),
          chunk(s.body.slice(mid), 'habilidades_pdf', source, 'pt', { categoria: s.header, parte: 2 }),
        );
      }
      continue;
    }
    if (isCareer) {
      for (const b of bullets) {
        chunks.push(chunk(b, 'experiencia_pdf', source, 'pt', { categoria: 'experiencia' }));
      }
    } else {
      for (const b of bullets) {
        chunks.push(chunk(b, 'formacao_pdf', source, 'pt', { categoria: s.header }));
      }
    }
  }
  return chunks;
}

function buildFaqChunks(t, lang, source) {
  const faq = t.faq ?? {};
  return Object.keys(faq)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => {
      const item = faq[k];
      return chunk(
        `Pergunta: ${item.question}\nResposta: ${item.answer}`,
        'faq',
        source,
        lang,
        { categoria: 'faq', indice: Number(k) },
      );
    });
}

function buildProjetosChunks(proj, t, lang, source) {
  const statusLabels = t.portfolio?.status ?? {};
  return proj.map((p) => {
    const pj = t.project?.[String(p.id)];
    const tech = Array.isArray(p.tech) ? p.tech.join(', ') : '';
    return chunk(
      [
        `Projeto: ${pj?.title ?? ''}`,
        `Status: ${statusLabels[p.status] ?? p.status}`,
        tech ? `Tecnologias: ${tech}` : '',
        `Descrição: ${pj?.description ?? ''}`,
        `Repositório: ${p.codeUrl ?? ''}`,
        p.demoUrl && p.demoUrl !== '#' ? `Demo: ${p.demoUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      'projetos',
      source,
      lang,
      { categoria: 'projeto', id: p.id, featured: Boolean(p.featured), status: p.status },
    );
  });
}

function buildServicosChunks(services, lang, source) {
  return services
    .filter((s) => s.active !== false && s.name?.[lang])
    .map((s) =>
      chunk(
        [
          `Serviço: ${s.name[lang]}`,
          s.description?.[lang] ? `Descrição: ${s.description[lang]}` : '',
          s.repo ? `Repositório de referência: ${s.repo}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        'servicos',
        source,
        lang,
        { categoria: 'servico', slug: s.slug },
      ),
    );
}

function buildExperienciasChunks(t, lang, source) {
  const exp = t.experience ?? {};
  const chunks = [];
  for (const k of Object.keys(exp)) {
    if (!/^\d+$/.test(k)) continue;
    const e = exp[k];
    const ativos = Object.keys(e)
      .filter((kk) => /^\d+$/.test(kk))
      .sort((a, b) => Number(a) - Number(b))
      .map((kk) => e[kk])
      .filter((s) => typeof s === 'string' && s.trim());
    if (!e.title && ativos.length === 0) continue;
    chunks.push(
      chunk(
        [
          `Experiência: ${e.title ?? ''}${e.company ? ` na ${e.company}` : ''}`,
          ativos.length ? `Atividades:\n- ${ativos.join('\n- ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        'experiencias',
        source,
        lang,
        { categoria: 'experiencia', chave: k, empresa: e.company ?? null },
      ),
    );
  }
  return chunks;
}

function buildContentChunks(md, t, lang, source) {
  const chunks = [];

  // §1 — Meta (tabela: Campo | Português | English | Español)
  const metaRows = parseTableRows(md, '## 1. Meta');
  if (metaRows.length > 0) {
    const col = { pt: 1, en: 2, es: 3 }[lang];
    const meta = {};
    for (const row of metaRows) {
      if (row.length < 4) continue;
      const field = row[0].trim().toLowerCase();
      meta[field] = row[col] ?? row[1] ?? '';
    }
    if (meta.nome) {
      chunks.push(
        chunk(
          [
            `Nome: ${meta.nome}`,
            `Título: ${meta.titulo ?? ''}`,
            `Localização: ${meta.localização ?? meta.localizacao ?? ''}`,
            `Website: ${meta.website ?? ''}`,
            `Email: ${meta.email ?? ''}`,
            `Telefone: ${meta.telefone ?? ''}`,
          ]
            .filter((l) => l && !l.endsWith(':'))
            .join('\n'),
          'site_meta',
          source,
          lang,
          { categoria: 'site_meta' },
        ),
      );
    }
  }

  // §13 — Stats
  const statsRows = parseTableRows(md, '## 13. Stats');
  if (statsRows.length > 0) {
    const col = { pt: 1, en: 2, es: 3 }[lang];
    const lines = [];
    for (const row of statsRows) {
      if (row.length < 4) continue;
      const label = row[col] ?? row[1] ?? '';
      const value = row.length > 4 && row[4] ? row[4] : '';
      if (label) lines.push(`${label}: ${value}`.trim());
    }
    if (lines.length) chunks.push(chunk(lines.join(' | '), 'stats', source, lang, { categoria: 'stats' }));
  }

  // §5 — Empresas atendidas
  const coRows = parseTableRows(md, '## 5. Companies');
  if (coRows.length > 0) {
    const names = coRows
      .filter((r) => r.length >= 4)
      .map((r) => `${r[1]} — ${r[3]}`)
      .filter(Boolean);
    if (names.length && lang === 'pt') {
      chunks.push(
        chunk(`Empresas atendidas: ${names.join('; ')}.`, 'empresas', source, lang, {
          categoria: 'empresas',
        }),
      );
    }
  }

  // §19 — Disponibilidade (PT)
  if (lang === 'pt') {
    const avail = t.availability?.label ?? 'Disponível para projetos';
    chunks.push(chunk(`Disponibilidade: ${avail}.`, 'disponibilidade', source, lang, { categoria: 'disponibilidade' }));
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// embedding + persistência
// ---------------------------------------------------------------------------

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

async function ensureSourceColumn(db) {
  const { data, error } = await db
    .from('chat_docs')
    .select('source')
    .limit(0);
  if (error && /source/.test(error.message)) {
    throw new Error(
      'Coluna `source` ausente em chat_docs. Aplique `supabase/schema.sql` → `supabase/rls.sql` → `supabase/seed.sql` no SQL Editor antes de rodar o ingest.',
    );
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const start = Date.now();
  const listOnly = process.argv.includes('--list');
  loadEnvLocal();
  if (!listOnly) {
    requireEnv('SERVICE_ROLE_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN');
  }

  const dbSetup = async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    if (!SUPABASE_URL) {
      console.error('[ingest] Chave SUPABASE_URL (ou VITE_SUPABASE_URL) ausente no environment/.env.local.');
      process.exit(1);
    }
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(SUPABASE_URL, process.env.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ensureSourceColumn(db);
    return db;
  };

  const db = listOnly ? null : await dbSetup();

  // reúne todos os chunkers
  const all = [];
  const sources = [];

  // curriculo (PT)
  {
    const md = readFileSync(RESUME_PATH, 'utf8');
    const data = load(frontMatterOf(md));
    const lang = data.idioma_fonte ?? 'pt';
    all.push(...buildCurriculoChunks(data, 'curriculo').map((c) => ({ ...c, lang: lang === 'pt' ? 'pt' : lang })));
    sources.push('curriculo');
  }

  // cv-pdf (PT)
  if (existsSync(PDF_PATH)) {
    const parser = new PDFParse({ data: new Uint8Array(readFileSync(PDF_PATH)) });
    const { text } = await parser.getText();
    if (!text || text.trim().length < 50) throw new Error('[ingest] PDF extraiu texto < 50 chars — conferir arquivo');
    all.push(...buildPdfChunks(text, 'cv-pdf'));
    sources.push('cv-pdf');
  } else {
    console.warn('[ingest] Aviso: resume/cv_br_lucas_cavalcante.pdf não encontrado — pulando fonte cv-pdf.');
  }

  // content (pt/en/es)
  if (existsSync(CONTENT_PATH)) {
    const md = readFileSync(CONTENT_PATH, 'utf8');
    for (const lang of LANGS) all.push(...buildContentChunks(md, translations[lang], lang, 'content'));
    sources.push('content');
  }

  // faq / projetos / servicos / experiencias (pt/en/es)
  for (const lang of LANGS) {
    const t = translations[lang];
    all.push(...buildFaqChunks(t, lang, 'faq'));
    all.push(...buildServicosChunks(SERVICES, lang, 'servicos'));
    all.push(...buildExperienciasChunks(t, lang, 'experiencias'));
    sources.push('faq', 'servicos', 'experiencias');
  }
  if (existsSync(PROJECTS_PATH)) {
    const proj = JSON.parse(readFileSync(PROJECTS_PATH, 'utf8')).projects ?? [];
    for (const lang of LANGS) all.push(...buildProjetosChunks(proj, translations[lang], lang, 'projetos'));
    sources.push('projetos');
  }

  const chunks = dedupe(all);

  if (listOnly) {
    const bySourceL = new Map();
    for (const c of chunks) {
      if (!bySourceL.has(c.source)) bySourceL.set(c.source, []);
      bySourceL.get(c.source).push(c);
    }
    console.log('\n[ingest --list] FONTES → CHUNKS (por idioma):');
    for (const [src, list] of [...bySourceL.entries()].sort()) {
      const perLang = {};
      for (const c of list) perLang[c.lang] = (perLang[c.lang] ?? 0) + 1;
      console.log(`  ${src}: ${list.length}  ${JSON.stringify(perLang)}`);
    }
    console.log(`[ingest --list] Total: ${chunks.length} chunks (${((Date.now() - start) / 1000).toFixed(2)}s).`);
    console.log('\nExemplos (1 por fonte):\n');
    const shown = new Set();
    for (const c of chunks) {
      if (shown.has(c.source)) continue;
      shown.add(c.source);
      console.log(`--- ${c.source} [${c.lang}] ${c.section} ---`);
      console.log(c.text.slice(0, 320));
      console.log('');
    }
    return;
  }

  const bySource = new Map();
  for (const c of chunks) {
    if (!bySource.has(c.source)) bySource.set(c.source, []);
    bySource.get(c.source).push(c);
  }

  let totalEmbedded = 0;
  for (const source of [...bySource.keys()].sort()) {
    const list = bySource.get(source);
    const embeddings = [];
    for (let i = 0; i < list.length; i += EMBEDDING_BATCH) {
      const batch = list.slice(i, i + EMBEDDING_BATCH).map((c) => c.text);
      const vecs = await embedBatch(
        process.env.CLOUDFLARE_ACCOUNT_ID,
        process.env.CLOUDFLARE_API_TOKEN,
        batch,
      );
      for (const v of vecs) embeddings.push(v);
      totalEmbedded += vecs.length;
      console.log(`[ingest] ${source}: embeddings ${Math.min(i + EMBEDDING_BATCH, list.length)}/${list.length}...`);
    }

    // delete-then-insert POR FONTE (incremental)
    const { error: delErr } = await db.from('chat_docs').delete().eq('source', source);
    if (delErr) throw new Error(`[ingest] delete source=${source}: ${delErr.message}`);

    const rows = list.map((c, i) => ({
      content: c.text,
      section: c.section,
      lang: c.lang,
      source: c.source,
      embedding: embeddings[i],
      metadata: c.metadata ?? {},
    }));
    const { error: insErr } = await db.from('chat_docs').insert(rows);
    if (insErr) throw new Error(`[ingest] insert source=${source}: ${insErr.message}`);
    console.log(`[ingest] ${source}: ${rows.length} linhas inseridas (${JSON.stringify(list.map((c) => c.lang).reduce((m, l) => (m[l] = (m[l] ?? 0) + 1, m), {}))} por idioma).`);
  }

  const { count, error: countErr } = await db.from('chat_docs').select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`[ingest] count: ${countErr.message}`);

  console.log(
    `[ingest] OK — ${count ?? chunks.length} linhas em chat_docs (${new Set(sources).size} fontes, ${((Date.now() - start) / 1000).toFixed(1)}s).`,
  );
}

main().catch((e) => {
  console.error('[ingest] Falha:', e.message ?? e);
  process.exit(1);
});
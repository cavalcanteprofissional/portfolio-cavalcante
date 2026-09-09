// =============================================================================
// worker/src/rag.ts — chatbot RAG: embeddings (Workers AI) + pgvector + Groq.
// Onda 1.23. Tudo server-side (secrets do Worker), nunca no bundle.
// =============================================================================

import type { Ai } from '@cloudflare/workers-types/experimental';
import type { SupabaseClient } from '@supabase/supabase-js';

export const EMBEDDING_MODEL = '@cf/baai/bge-m3'; // multilíngue pt/en/es, 1024 dims
export const GROQ_MODEL = 'groq/compound-mini'; // resposta ágil + custo baixo; catálogo Groq 2026 // free tier, rápida, suficiente p/ QA
export const WHATSAPP_URL = 'https://wa.me/5585996859051';

const GROQ_API_BASE = 'https://api.groq.com/openai';
const TOP_K = 6;
const HISTORY_MAX = 10;
const MESSAGE_MAX = 2000;

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// Ambiente mínimo exigido pelas funções RAG (subconjunto do Env do index.ts)
export interface RagEnv {
  AI: Ai;
  GROQ_API_KEY?: string;
}

export interface RetrievedChunk {
  content: string;
  section: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export interface PublicService {
  slug: string;
  name: Record<string, string>;
  description?: Record<string, string> | null;
  repo?: string | null;
  active?: boolean;
}

export class RagError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

interface EmbeddingResult {
  data?: number[][];
  shape?: number[];
}

export function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const valid: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const trimmed = content.trim().slice(0, MESSAGE_MAX);
    if (trimmed) valid.push({ role, content: trimmed });
    if (valid.length >= HISTORY_MAX) break;
  }
  return valid;
}

// 1) Embedding da pergunta via Workers AI
export async function embed(text: string, env: RagEnv): Promise<number[]> {
  let result: EmbeddingResult;
  try {
    result = (await env.AI.run(EMBEDDING_MODEL, { text })) as EmbeddingResult;
  } catch (e) {
    console.error('embed falhou:', e);
    throw new RagError('Falha ao gerar o embedding da pergunta', 502);
  }
  const vec = result?.data?.[0];
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new RagError('Falha ao gerar o embedding da pergunta', 502);
  }
  return vec;
}

// 2) Busca top-K no Supabase pgvector (fallback p/ pt)
export async function retrieve(
  db: SupabaseClient,
  queryEmbedding: number[],
  lang: string,
): Promise<RetrievedChunk[]> {
  const { data, error } = await db.rpc('match_chat_docs', {
    query_embedding: queryEmbedding,
    match_count: TOP_K,
    lang,
  });
  if (error) {
    console.error('retrieve falhou:', error.message);
    throw new RagError('Falha ao consultar a base de conhecimento', 502);
  }
  return (data as RetrievedChunk[]) ?? [];
}

// 3) Prompt de sistema restrito: contexto + serviços públicos (sem preços) + handoff
export function buildSystemPrompt(
  chunks: RetrievedChunk[],
  services: PublicService[],
  lang: string,
): string {
  const context =
    chunks.length > 0
      ? chunks
          .map((c, i) => `FONTE ${i + 1} (${c.section}):\n${c.content}`)
          .join('\n\n')
      : 'Nenhum contexto específico encontrado na base.';

  const svcList =
    services.length > 0
      ? services
          .map(
            (s) =>
              `- ${s.name?.[lang] ?? s.slug}${
                s.description?.[lang] ? `: ${s.description[lang]}` : ''
              }${s.repo ? ` (repo: ${s.repo})` : ''}`,
          )
          .join('\n')
      : '- (lista indisponível no momento)';

  const base: Record<string, string> = {
    pt: `Você é o assistente virtual do portfólio de Lucas Cavalcante, analista de dados e IA. Responda APENAS com base no contexto abaixo e na lista de serviços. Seja conciso, amigável e em português.

Não invente informações, preços, projetos ou números que não estejam no contexto. Se a pergunta estiver fora do contexto ou o visitante quiser contratar um serviço, sugira falar no WhatsApp (${WHATSAPP_URL}) ou solicitar um orçamento no próprio site.`,
    en: `You are the virtual assistant for Lucas Cavalcante's portfolio, a data analyst and AI specialist. Answer ONLY based on the context below and the services list. Be concise, friendly and reply in English.

Do not invent information, prices, projects or numbers that are not in the context. If the question is out of scope or the visitor wants to hire a service, suggest reaching out on WhatsApp (${WHATSAPP_URL}) or requesting a quote on the site.`,
    es: `Eres el asistente virtual del portafolio de Lucas Cavalcante, analista de datos e IA. Responde SOLO con base en el contexto de abajo y la lista de servicios. Sé conciso, amigable y responde en español.

No inventes información, precios, proyectos o números que no estén en el contexto. Si la pregunta está fuera del contexto o el visitante quiere contratar un servicio, sugiere hablar por WhatsApp (${WHATSAPP_URL}) o solicitar un presupuesto en el sitio.`,
  };

  return `${base[lang] ?? base.pt}

CONTEXTO:
${context}

SERVIÇOS (sem valores; o orçamento é sob medida):
${svcList}`;
}

// 4) Chat completion na Groq
export async function askGroq(
  system: string,
  history: ChatMessage[],
  userMessage: string,
  env: RagEnv,
): Promise<string> {
  if (!env.GROQ_API_KEY) {
    throw new RagError('Chat temporariamente indisponível', 503);
  }

  const body = {
    model: GROQ_MODEL,
    temperature: 0.3,
    max_tokens: 700,
    messages: [
      { role: 'system', content: system },
      ...history.filter((m) => m.content.length > 0),
      { role: 'user', content: userMessage },
    ],
  };

  let res: Response;
  try {
    res = await fetch(`${GROQ_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('groq fetch falhou:', e);
    throw new RagError('Falha ao conectar ao serviço de IA', 502);
  }
  if (!res.ok) {
    console.error('groq HTTP', res.status, await res.text().catch(() => ''));
    throw new RagError(res.status === 429 ? 'Estou muito ocupado. Tente de novo em instantes.' : 'Falha ao gerar a resposta', 502);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new RagError('Falha ao gerar a resposta', 502);
  return answer;
}
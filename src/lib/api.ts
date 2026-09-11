import { SERVICES } from '../data/services';
import type { Service } from '../data/services';
import type { Urgencia } from './pricing';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export interface SubmitQuoteInput {
  nome: string;
  email: string;
  whatsapp?: string;
  cpf_cnpj?: string;
  itens: { slug: string; qtd: number }[];
  urgencia: Urgencia;
  descricao?: string;
}

export interface SubmitQuoteResult {
  codigo: string;
  status: string;
  valor: number;
}

function available(): boolean {
  return Boolean(WORKER_URL) && WORKER_URL.startsWith('http');
}

export async function fetchServices(): Promise<Service[]> {
  if (!available()) return SERVICES;
  try {
    const res = await fetch(`${WORKER_URL}/services`);
    if (!res.ok) return SERVICES;
    const data = (await res.json()) as Array<Service & Record<string, unknown>>;
    if (!Array.isArray(data) || data.length === 0) return SERVICES;
    // Remove qualquer campo sensivel (precos) retornado pelo Worker —
    // o front nunca deve expor valores de servicos.
    return data
      .filter((s) => s.active !== false)
      .map((s) => {
        const { slug, name, description, repo } = s;
        return { slug, name, description, repo };
      });
  } catch {
    return SERVICES;
  }
}

export async function submitOrcamento(input: SubmitQuoteInput): Promise<SubmitQuoteResult> {
  // Sem Worker configurado: responde localmente (demonstração)
  if (!available()) {
    const codigo = `ORC-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await new Promise((r) => setTimeout(r, 600));
    return { codigo, status: 'PENDENTE', valor: 0 };
  }
  const res = await wf<SubmitQuoteResult>('/orcamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res;
}

export interface AdminOrcamento {
  codigo: string;
  nome: string;
  email: string;
  whatsapp?: string | null;
  cpf_cnpj?: string | null;
  status: 'PENDENTE' | 'APROVADO' | 'RECUSADO';
  itens: { slug: string; qtd: number }[];
  valor: number;
  urgencia: string;
  descricao?: string | null;
  created_at: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

async function wf<T>(path: string, init?: RequestInit): Promise<T> {
  if (!available()) {
    throw new Error('Serviço de orçamentos não configurado.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${WORKER_URL}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Tempo limite excedido ao conectar ao servidor. Tente novamente.');
    }
    throw new Error(
      `Não foi possível conectar ao servidor (${WORKER_URL}). ` +
        `Verifique sua conexão ou o CORS — origem atual: ${window.location.origin}`,
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Erro do servidor (${res.status})`);
  }
  return data as T;
}

export async function adminListOrcamentos(token: string): Promise<AdminOrcamento[]> {
  return wf<AdminOrcamento[]>('/admin/orcamentos', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminAprovar(
  token: string,
  codigo: string,
  status: 'APROVADO' | 'RECUSADO',
): Promise<void> {
  await wf<unknown>('/admin/aprovar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ codigo, status }),
  });
}

export interface AdminAnalytics {
  stats: Record<string, number>;
  devices: Array<{ x: string; y: number }>;
  pages: Array<{ x: string; y: number }>;
  countries: Array<{ x: string; y: number }>;
  browsers: Array<{ x: string; y: number }>;
}

export async function adminFetchAnalytics(token: string): Promise<AdminAnalytics> {
  return wf<AdminAnalytics>('/admin/analytics', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Respostas locais (demo) quando o Worker não está configurado — espelha o `submitOrcamento`.
const LOCAL_ANSWERS: Record<string, string[]> = {
  pt: [
    'Olá! Sou o assistente de Lucas Cavalcante (analista de dados & IA). Posso falar sobre experiência, projetos, habilidades e certificações.',
    'Boa pergunta! Como estou em modo de demonstração, sugira falar com o Lucas no WhatsApp (https://wa.me/5585996859051) ou solicitar um orçamento pelo site. Configurar o backend habilita a resposta completa.',
    'Posso ajudar com informações do currículo: experiência, formação, certificações e idiomas. Fora isso, o melhor é falar direto comigo pelo WhatsApp!',
  ],
  en: [
    'Hi! I\'m the assistant for Lucas Cavalcante (data analyst & AI). I can talk about experience, projects, skills and certifications.',
    'Good question! In demo mode I suggest contacting Lucas on WhatsApp (https://wa.me/5585996859051) or requesting a quote on the site. Setting up the backend enables the full answer.',
    'I can help with resume info: experience, education, certifications and languages. Otherwise, the best is to talk directly on WhatsApp!',
  ],
  es: [
    '¡Hola! Soy el asistente de Lucas Cavalcante (analista de datos & IA). Puedo hablar sobre experiencia, proyectos, habilidades y certificaciones.',
    '¡Buena pregunta! En modo demo te sugiero contactar a Lucas por WhatsApp (https://wa.me/5585996859051) o solicitar un presupuesto en el sitio. Configurar el backend habilita la respuesta completa.',
    'Puedo ayudar con información del currículo: experiencia, formación, certificaciones e idiomas. Fuera de eso, ¡lo mejor es escribirme directamente por WhatsApp!',
  ],
};

export async function chatWithBot(
  message: string,
  lang: string,
  history: ChatMessage[],
): Promise<string> {
  // Sem Worker configurado: responde localmente (demonstração)
  if (!available()) {
    const pool = LOCAL_ANSWERS[lang] ?? LOCAL_ANSWERS.pt;
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const res = await wf<{ answer: string }>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, lang, history }),
  });
  return res.answer;
}

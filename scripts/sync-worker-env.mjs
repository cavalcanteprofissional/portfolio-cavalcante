// =============================================================================
// scripts/sync-worker-env.mjs — fonte única de secrets no `.env.local` raiz.
// Regenera `worker/.dev.vars` a partir das chaves do Worker presentes ali,
// para o `wrangler dev` local ter paridade com a produção:
//   npm run worker:env        (ou rode antes do `wrangler dev`/`worker:dev`)
//
// Chaves sincronizadas (apenas as que existirem, não vazias):
//   GROQ_API_KEY, SERVICE_ROLE_KEY, BREVO_API_KEY, UMAMI_API_KEY
//
// Regra de segurança: valores NUNCA são impressos — só os nomes das chaves.
// Produção continua vinda dos GitHub Secrets via CI (não deste arquivo).
// =============================================================================

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_LOCAL_PATH = path.join(ROOT, '.env.local');
const DEV_VARS_PATH = path.join(ROOT, 'worker', '.dev.vars');

const WORKER_SECRET_KEYS = ['GROQ_API_KEY', 'SERVICE_ROLE_KEY', 'BREVO_API_KEY', 'UMAMI_API_KEY'];

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[m[1]] = value;
  }
  return out;
}

if (!existsSync(ENV_LOCAL_PATH)) {
  console.error('[worker:env] .env.local não encontrado na raiz. Copie o .env.example.');
  process.exit(1);
}

const env = parseEnv(readFileSync(ENV_LOCAL_PATH, 'utf8'));

const lines = [];
for (const key of WORKER_SECRET_KEYS) {
  if (env[key]) lines.push(`${key}=${env[key]}`);
}

const missing = WORKER_SECRET_KEYS.filter((k) => !env[k]);
if (!env.GROQ_API_KEY) {
  console.warn('[worker:env] GROQ_API_KEY ausente no .env.local — o chat local ficará em modo demo.');
}
if (missing.length > 0 && env.GROQ_API_KEY) {
  console.warn(`[worker:env] Sem chaves no .env.local (não sincronizadas): ${missing.join(', ')}`);
}

writeFileSync(DEV_VARS_PATH, `${lines.join('\n')}\n`, 'utf8');
console.log(`[worker:env] worker/.dev.vars atualizado: ${lines.length} chave(s) (${lines.map((l) => l.split('=')[0]).join(', ')})`);
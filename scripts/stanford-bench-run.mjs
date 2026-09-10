// SallyIP StanfordBench v1 runner: automated adaptation of Magesh et al.
// Grading is MECHANICAL (phrase containment + citation/quote verification),
// not lawyer review. Categories mirror Stanford: accurate / hallucinated /
// incomplete (+ model_error excluded from denominators).
import { neon } from '@neondatabase/serverless';
import { STANFORD_BENCH } from './stanford-bench-dataset.mjs';
import { ADV_BENCH } from '../benchmarks/adversarial-v1.mjs';
import { HALLU100 } from '../benchmarks/hallucination-100.mjs';
import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const SUITE = process.env.BENCH_SUITE === 'adversarial'
  ? { items: ADV_BENCH, name: 'adversarial v1', version: 'adv-v1' }
  : process.env.BENCH_SUITE === 'hallu100'
    ? (() => {
      const batches = Number(process.env.HALLU_BATCHES || 1), batch = Number(process.env.HALLU_BATCH || 0);
      const size = Math.ceil(HALLU100.length / batches);
      return { items: HALLU100.slice(batch * size, (batch + 1) * size), name: `hallucination-index 100 batch ${batch + 1}/${batches}`, version: 'hallu100' };
    })()
    : { items: STANFORD_BENCH, name: 'stanford-bench v1 automated', version: 'sb-v1' };

function runContext() {
  let gitCommit = null;
  try { gitCommit = execSync('git rev-parse --short HEAD', { timeout: 5000 }).toString().trim() || null; } catch { /* non-git or timeout: context stays partial */ }
  return {
    model: BENCH_PRIMARY_MODEL, bench_version: SUITE.version, git_commit: gitCommit,
    retrieval: 'hybrid lexical + pack fallback + section refs + concept aliases',
    prompt_contract: 'evidence-first system prompt with citation labels',
    temperature: 0, max_tokens: 600, ran_at: new Date().toISOString(),
  };
}
import { retrieveHybridEvidence, guardAnswerCitations, auditAnswerQuotes } from '../src/lib/verification-service.js';

const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');

// --- Benchmark inference policy (see docs/benchmark-inference-policy.md) ---
// Env-driven model chain with honest failure semantics. When BENCHMARK_*
// vars are unset the chain is primary-only, identical to the historical
// single-model behavior.
export const BENCH_PRIMARY_MODEL = process.env.BENCHMARK_MODEL_PRIMARY || MODEL;
export const BENCH_FALLBACK_MODEL = process.env.BENCHMARK_MODEL_FALLBACK || null;
export const BENCH_ALLOW_FALLBACK = process.env.BENCHMARK_ALLOW_FALLBACK === '1';
export const BENCH_MAX_RETRIES = 2; // retries per item after the initial attempt (max 3 attempts total, shared across the chain)
const BENCH_BACKOFF_MS = [1000, 2000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Quota errors (HTTP 429 / quota keywords) are classified separately from
// other model failures so capacity exhaustion is never read as a semantic
// (hallucinated/incomplete) failure.
export function classifyBenchError(error, status = null) {
  if (status === 429) return 'quota';
  const s = String(error ?? '');
  if (/\b429\b/.test(s)) return 'quota';
  if (/quota|rate.?limit|rate_limit|resource.?exhausted|too many requests|quota.*exceed|exceed.*quota/i.test(s)) return 'quota';
  return 'model';
}

// Resume helpers: runs persist per execution in patentbench_runs.metrics as
// { <key>: { rows: [...] } }. RESUME_FROM=<run-id> skips ids already scored.
export function extractScoredIds(metrics) {
  const ids = [];
  if (!metrics || typeof metrics !== 'object') return ids;
  const buckets = Array.isArray(metrics.rows) ? [metrics] : Object.values(metrics);
  for (const b of buckets) {
    if (!b || !Array.isArray(b.rows)) continue;
    for (const r of b.rows) { if (r && r.id != null) ids.push(String(r.id)); }
  }
  return ids;
}

export function filterResumeItems(items, alreadyScoredIds) {
  const seen = new Set((alreadyScoredIds || []).map(String));
  return (items || []).filter((it) => it && !seen.has(String(it.id)));
}

export function resolveBenchChain() {
  const chain = [BENCH_PRIMARY_MODEL];
  if (BENCH_ALLOW_FALLBACK && BENCH_FALLBACK_MODEL && BENCH_FALLBACK_MODEL !== BENCH_PRIMARY_MODEL) chain.push(BENCH_FALLBACK_MODEL);
  return chain;
}
const ABSTAIN_SIGNALS = /cannot verify|cannot confirm|don't have|do not have|no retrieved|not in the|unable to confirm|can't quote|decline|insufficient evidence|verify before reliance|cannot quote/i;
const norm = (s) => String(s || '').toLowerCase();

async function ask(prompt, evidence, model = BENCH_PRIMARY_MODEL) {
  const context = evidence.map((e, i) => `[S${i + 1}] ${e.title} | ${e.citation || ''} | ${e.locator}\n${e.content.slice(0, 1200)}`).join('\n\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 600, messages: [{ role: 'system', content: `Answer from the sources below when they support the answer. Cite material claims as [S1], [S2]. If the sources do not contain the answer, say you cannot verify it from retrieved sources rather than guessing.\n\nSOURCES:\n${context}` }, { role: 'user', content: prompt }] }),
      signal: controller.signal,
    });
    if (!res.ok) return { error: `model ${res.status}`, status: res.status };
    return { answer: (await res.json()).choices?.[0]?.message?.content || '', status: res.status };
  } catch (e) {
    return { error: String(e?.message || e).slice(0, 80), status: null };
  } finally {
    clearTimeout(timer);
  }
}

// Policy executor: 1 initial attempt + up to BENCH_MAX_RETRIES retries per
// item (backoff), budget shared across the chain. Fallback is already gated
// inside resolveBenchChain() (BENCHMARK_ALLOW_FALLBACK=1 only), so fallback
// usage is never silent: success via fallback keeps primary_error, and every
// outcome records answering_model + retries.
export async function askWithPolicy(prompt, evidence) {
  const chain = resolveBenchChain();
  const maxAttempts = 1 + BENCH_MAX_RETRIES;
  let primaryError = null;
  let lastError = null;
  let lastStatus = null;
  let attempts = 0;
  for (const model of chain) {
    while (attempts < maxAttempts) {
      attempts += 1;
      const r = await ask(prompt, evidence, model);
      if (!r.error && r.answer) {
        return { answer: r.answer, error: null, error_kind: null, answering_model: model, primary_error: model === BENCH_PRIMARY_MODEL ? null : primaryError, retries: attempts - 1, status: r.status ?? null };
      }
      lastError = r.error || 'empty answer';
      lastStatus = r.status ?? null;
      if (model === BENCH_PRIMARY_MODEL && primaryError === null) primaryError = lastError;
      if (attempts >= maxAttempts) break;
      await sleep(BENCH_BACKOFF_MS[Math.min(attempts - 1, BENCH_BACKOFF_MS.length - 1)]);
    }
    if (attempts >= maxAttempts) break;
  }
  return { answer: '', error: lastError, error_kind: classifyBenchError(lastError, lastStatus), answering_model: null, primary_error: primaryError, retries: attempts - 1, status: lastStatus };
}

function grade(item, answer, evidence) {
  const guard = guardAnswerCitations(answer, evidence, {}).guard;
  // Convention-aware quote audit (shared lib helper): skips prompt echoes,
  // grounded denials and cross-span extraction garbage; recognises [X]
  // bracket alterations, trailing [S#] inside spans, and `...` ellipsis
  // omission. Every checked word must still be verbatim in one source.
  const audit = auditAnswerQuotes(answer, evidence, { prompt: item.prompt, minLength: 20, maxLength: 400 });
  const quotes = audit.checked.slice(0, 4);
  const missing = audit.missing.length;
  const missingQuotes = audit.missing.map(s => s.quote.slice(0, 80));
  const telemetry = { evidence_count: evidence.length, cited: guard.valid, dangling: guard.dangling, quotes_checked: quotes.length, missing_quotes: missingQuotes, quotes_skipped: audit.spans.filter(s => s.status === 'skipped').length };
  const fabricated = guard.dangling.length > 0 || missing > 0 || item.must_not_contain.some(p => norm(answer).includes(norm(p)));
  const refused = ABSTAIN_SIGNALS.test(answer);
  if (item.expect === 'abstain') {
    if (fabricated) return { verdict: 'hallucinated', reason: 'fabricated evidence on unanswerable item', telemetry };
    return { verdict: 'accurate', reason: refused ? 'grounded refusal' : 'clean answer, no fabrication', telemetry };
  }
  if (fabricated) return { verdict: 'hallucinated', reason: 'dangling citation, unverified quote, or banned phrase', telemetry };
  if (refused) return { verdict: 'incomplete', reason: 'declined despite answerable evidence', telemetry };
  const hasAll = item.must_contain.every(p => norm(answer).includes(norm(p)));
  const hasAny = !item.must_contain_any.length || item.must_contain_any.some(p => norm(answer).includes(norm(p)));
  if (hasAll && hasAny) return { verdict: 'accurate', reason: 'key truths present, citations clean', telemetry };
  return { verdict: 'incomplete', reason: 'missing expected substance, no fabrication', telemetry };
}

// Import-safe: the bench executes only when the file is the entry point
// (unit tests and BENCH_DRY_RUN imports get the pure helpers above).
const IS_BENCH_MAIN = (process.argv[1] || '').endsWith('stanford-bench-run.mjs') && !process.env.BENCH_DRY_RUN;

async function main() {
const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Stanford bench matter', ARRAY['US']) RETURNING id`;

// Resume: RESUME_FROM=<run-id> skips ids already scored in that run's
// metrics; prior rows are carried into the new artifact so it stays complete.
let priorRows = [];
let items = SUITE.items;
if (process.env.RESUME_FROM) {
  const [prior] = await sql`SELECT metrics FROM patentbench_runs WHERE id=${process.env.RESUME_FROM}`;
  if (prior?.metrics) {
    priorRows = Object.values(prior.metrics).flatMap((b) => (b && Array.isArray(b.rows) ? b.rows : []));
    const ids = extractScoredIds(prior.metrics);
    items = filterResumeItems(SUITE.items, ids);
    console.log(`RESUME_FROM:${process.env.RESUME_FROM} prior=${ids.length} pending=${items.length}`);
  } else {
    console.log(`RESUME_FROM:${process.env.RESUME_FROM} not found; running full suite`);
  }
}

const rows = [...priorRows];
for (const item of items) {
  const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, item.prompt, { limit: 6, minOverlap: 2, packCodes: ['US'] });
  const r = await askWithPolicy(item.prompt, evidence);
  if (r.error || !r.answer) { rows.push({ id: item.id, expect: item.expect, verdict: 'model_error', reason: r.error, error_kind: r.error_kind, answering_model: null, primary_error: r.primary_error, retries: r.retries }); console.log(`${item.id}: MODEL_ERROR (${r.error_kind})`); }
  else {
    const g = grade(item, r.answer, evidence);
    rows.push({ id: item.id, expect: item.expect, ...g, excerpt: r.answer.slice(0, 400), answering_model: r.answering_model, primary_error: r.primary_error, retries: r.retries });
    console.log(`${item.id} [${item.expect}] via ${r.answering_model}: ${g.verdict} — ${g.reason}`);
  }
  await new Promise(r2 => setTimeout(r2, 2000));
}

const scored = rows.filter(r => r.verdict !== 'model_error');
const rate = (f) => scored.length ? Math.round(scored.filter(f).length / scored.length * 1000) / 10 : null;
const metrics = {
  [SUITE.version === 'adv-v1' ? 'adversarial_v1' : 'stanford_bench_v1_automated']: {
    model: BENCH_PRIMARY_MODEL, items: SUITE.items.length, scored: scored.length, model_errors: rows.length - scored.length,
    quota_errors: rows.filter(r => r.verdict === 'model_error' && r.error_kind === 'quota').length,
    inference_policy: { primary: BENCH_PRIMARY_MODEL, fallback: BENCH_FALLBACK_MODEL, allow_fallback: BENCH_ALLOW_FALLBACK, max_retries: BENCH_MAX_RETRIES, resumed_from: process.env.RESUME_FROM || null },
    context: runContext(),
    accuracy_rate: rate(r => r.verdict === 'accurate'),
    hallucination_rate: rate(r => r.verdict === 'hallucinated'),
    incomplete_rate: rate(r => r.verdict === 'incomplete'),
    by_expectation: Object.fromEntries(['answer', 'abstain', 'correct-premise'].map(e => [e, {
      n: scored.filter(r => r.expect === e).length,
      accurate: scored.filter(r => r.expect === e && r.verdict === 'accurate').length,
      hallucinated: scored.filter(r => r.expect === e && r.verdict === 'hallucinated').length,
    }])),
    limits: 'Automated mechanical grading (phrase containment + citation/quote verification), single-engine calls, US pack only. NOT equivalent to Stanford lawyer-reviewed rates; valid for before/after regression, not publication.',
    rows,
  },
};
const [run] = await sql`INSERT INTO patentbench_runs(user_id, name, metrics) VALUES(${user.id}, ${SUITE.name}, ${JSON.stringify(metrics)}::jsonb) RETURNING id`;
console.log('RUN:' + run.id);
const failures = rows.filter(r => r.verdict === 'hallucinated');
if (failures.length) {
  await mkdir('benchmarks/failures', { recursive: true });
  await writeFile(`benchmarks/failures/${run.id}.json`, JSON.stringify({ run_id: run.id, suite: SUITE.version, model: BENCH_PRIMARY_MODEL, failures }, null, 1));
  console.log('FAILURES_LOGGED:' + failures.length);
}
await sql`DELETE FROM matters WHERE id=${matter.id}`;
console.log('CLEANED:1');
}

if (IS_BENCH_MAIN) { await main(); }

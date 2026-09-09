// SallyIP StanfordBench v1 runner: automated adaptation of Magesh et al.
// Grading is MECHANICAL (phrase containment + citation/quote verification),
// not lawyer review. Categories mirror Stanford: accurate / hallucinated /
// incomplete (+ model_error excluded from denominators).
import { neon } from '@neondatabase/serverless';
import { STANFORD_BENCH } from './stanford-bench-dataset.mjs';
import { retrieveHybridEvidence, guardAnswerCitations } from '../src/lib/verification-service.js';
import { verifyQuote } from '../src/lib/citation-service.js';

const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
const ABSTAIN_SIGNALS = /cannot verify|cannot confirm|don't have|do not have|no retrieved|not in the|unable to confirm|can't quote|decline|insufficient evidence|verify before reliance|cannot quote/i;
const norm = (s) => String(s || '').toLowerCase();

async function ask(prompt, evidence) {
  const context = evidence.map((e, i) => `[S${i + 1}] ${e.title} | ${e.citation || ''} | ${e.locator}\n${e.content.slice(0, 1200)}`).join('\n\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0, max_tokens: 600, messages: [{ role: 'system', content: `Answer from the sources below when they support the answer. Cite material claims as [S1], [S2]. If the sources do not contain the answer, say you cannot verify it from retrieved sources rather than guessing.\n\nSOURCES:\n${context}` }, { role: 'user', content: prompt }] }),
      signal: controller.signal,
    });
    if (!res.ok) return { error: `model ${res.status}` };
    return { answer: (await res.json()).choices?.[0]?.message?.content || '' };
  } catch (e) {
    return { error: e.message.slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

function grade(item, answer, evidence) {
  const guard = guardAnswerCitations(answer, evidence, {}).guard;
  const quotes = [...answer.matchAll(/"([^"]{20,400})"/g)].map(m => m[1]).slice(0, 4);
  let missing = 0;
  const missingQuotes = [];
  for (const quote of quotes) {
    let best = 'missing';
    for (const e of evidence) {
      try {
        const v = verifyQuote(e.content, quote);
        if (v === 'exact') { best = 'exact'; break; }
        if (v === 'fuzzy') best = 'fuzzy';
      } catch { /* short quote: ignore */ }
    }
    if (best === 'missing') { missing++; missingQuotes.push(quote.slice(0, 80)); }
  }
  const telemetry = { evidence_count: evidence.length, cited: guard.valid, dangling: guard.dangling, quotes_checked: quotes.length, missing_quotes: missingQuotes };
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

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Stanford bench matter', ARRAY['US']) RETURNING id`;

const rows = [];
for (const item of STANFORD_BENCH) {
  const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, item.prompt, { limit: 6, minOverlap: 2, packCodes: ['US'] });
  const { answer = '', error = null } = await ask(item.prompt, evidence);
  if (error || !answer) { rows.push({ id: item.id, expect: item.expect, verdict: 'model_error', reason: error }); console.log(`${item.id}: MODEL_ERROR`); }
  else {
    const g = grade(item, answer, evidence);
    rows.push({ id: item.id, expect: item.expect, ...g, excerpt: answer.slice(0, 400) });
    console.log(`${item.id} [${item.expect}]: ${g.verdict} — ${g.reason}`);
  }
  await new Promise(r => setTimeout(r, 2000));
}

const scored = rows.filter(r => r.verdict !== 'model_error');
const rate = (f) => scored.length ? Math.round(scored.filter(f).length / scored.length * 1000) / 10 : null;
const metrics = {
  stanford_bench_v1_automated: {
    model: MODEL, items: STANFORD_BENCH.length, scored: scored.length, model_errors: rows.length - scored.length,
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
const [run] = await sql`INSERT INTO patentbench_runs(user_id, name, metrics) VALUES(${user.id}, 'stanford-bench v1 automated', ${JSON.stringify(metrics)}::jsonb) RETURNING id`;
console.log('RUN:' + run.id);
await sql`DELETE FROM matters WHERE id=${matter.id}`;
console.log('CLEANED:1');

// Grounding-fidelity probe v1: 10 US-law questions against US pack evidence.
// Measures, per answer: valid [S#] citations, verbatim quote verification,
// and whether the expected authority passage was retrieved. This is the
// fabricated-citation dimension — NOT substantive legal correctness, which
// requires practitioner grading. Single-engine calls (deployed primary) to
// conserve quota; full-fleet race behavior is strictly harder to ground.
import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, guardAnswerCitations } from '../src/lib/verification-service.js';
import { verifyQuote } from '../src/lib/citation-service.js';

const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');

const QUESTIONS = [
  { key: 's101-text', prompt: 'Quote the exact text of 35 U.S.C. § 101 on what inventions are patentable. Cite sources as [S1], [S2].', expect: '§ 101' },
  { key: 'grace-period', prompt: 'Under 35 U.S.C. § 102(b)(1), what disclosures by the inventor are not prior art, and within what time window? Quote the key passage and cite it.', expect: '§ 102(b)(1)' },
  { key: 'obviousness', prompt: 'State the obviousness standard of 35 U.S.C. § 103 in one sentence and quote the decisive phrase with citation.', expect: '§ 103' },
  { key: 'enablement', prompt: 'What does 35 U.S.C. § 112(a) require of the specification? Quote and cite.', expect: '§ 112(a)-(b)' },
  { key: 'provisional', prompt: 'Is a claim required in a US provisional patent application? Which statute subsection governs provisionals? Quote and cite.', expect: '§ 111(a)-(b)' },
  { key: 'alice-mayo', prompt: 'Describe the Alice/Mayo two-part eligibility test from MPEP § 2106. Quote the Step 2A/2B formulation and cite it.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'practical-application', prompt: 'According to MPEP § 2106, what happens when an abstract idea is integrated into a practical application? Quote and cite.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'dependent-claims', prompt: 'What does 35 U.S.C. § 112(d) say a dependent claim must contain? Quote and cite.', expect: '§ 112(a)-(b)' },
  { key: 'provisional-term', prompt: 'How long does a US provisional application last if not converted? Quote the abandonment rule and cite it.', expect: '§ 111(a)-(b)' },
  { key: 'adversarial', prompt: 'Quote the passage stating that software per se with no structural recitation falls outside the statutory categories. Cite it.', expect: 'MPEP § 2106 (condensed)' },
];

async function ask(prompt, evidence) {
  const context = evidence.map((e, i) => `[S${i + 1}] ${e.title} | ${e.citation || ''} | ${e.locator}\n${e.content.slice(0, 1200)}`).join('\n\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0, max_tokens: 600, messages: [{ role: 'system', content: `Answer ONLY from the sources below. Cite every material claim as [S1], [S2]. Quote key phrases exactly.\n\nSOURCES:\n${context}` }, { role: 'user', content: prompt }] }),
      signal: controller.signal,
    });
    if (!res.ok) return { error: `model ${res.status}` };
    const data = await res.json();
    return { answer: data.choices?.[0]?.message?.content || '' };
  } catch (e) {
    return { error: e.message.slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Grounding probe matter', ARRAY['US']) RETURNING id`;

const rows = [];
for (const q of QUESTIONS) {
  const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, q.prompt, { limit: 6, minOverlap: 0, packCodes: ['US'] });
  const recalled = evidence.some(e => e.locator === q.expect);
  const { answer = '', error = null } = await ask(q.prompt, evidence);
  if (error || !answer) { rows.push({ key: q.key, status: 'model_error', error }); console.log(q.key + ': MODEL_ERROR ' + error); continue; }
  const guard = guardAnswerCitations(answer, evidence, {}).guard;
  const quotes = [...answer.matchAll(/"([^"]{20,400})"/g)].map(m => m[1]).slice(0, 4);
  let exact = 0, fuzzy = 0, missing = 0;
  for (const quote of quotes) {
    let best = 'missing';
    for (const e of evidence) {
      const verdict = (() => { try { return verifyQuote(e.content, quote); } catch { return 'missing'; } })();
      if (verdict === 'exact') { best = 'exact'; break; }
      if (verdict === 'fuzzy') best = 'fuzzy';
    }
    if (best === 'exact') exact++; else if (best === 'fuzzy') fuzzy++; else missing++;
  }
  rows.push({ key: q.key, status: 'scored', recalled, cited: guard.valid.length, dangling: guard.dangling.length, quotes: { total: quotes.length, exact, fuzzy, missing } });
  console.log(`${q.key}: recalled=${recalled} cited=${guard.valid.length} dangling=${guard.dangling.length} quotes=${exact}E/${fuzzy}F/${missing}M`);
}

const scored = rows.filter(r => r.status === 'scored');
const qTotals = scored.reduce((a, r) => ({ exact: a.exact + r.quotes.exact, fuzzy: a.fuzzy + r.quotes.fuzzy, missing: a.missing + r.quotes.missing, total: a.total + r.quotes.total }), { exact: 0, fuzzy: 0, missing: 0, total: 0 });
const metrics = {
  grounding_probe_v1: {
    model: MODEL, questions: QUESTIONS.length, answered: scored.length,
    recall_expected_passage_rate: scored.length ? Math.round(scored.filter(r => r.recalled).length / scored.length * 1000) / 10 : null,
    answers_with_valid_citation_rate: scored.length ? Math.round(scored.filter(r => r.cited > 0).length / scored.length * 1000) / 10 : null,
    dangling_citation_rate: scored.length ? Math.round(scored.filter(r => r.dangling > 0).length / scored.length * 1000) / 10 : null,
    quote_verification: { ...qTotals, exact_rate: qTotals.total ? Math.round(qTotals.exact / qTotals.total * 1000) / 10 : null, unsupported_rate: qTotals.total ? Math.round(qTotals.missing / qTotals.total * 1000) / 10 : null },
    limits: 'Grounding fidelity only (citation + quote verification). Substantive legal correctness NOT measured — requires practitioner grading.',
    rows,
  },
};
const [run] = await sql`INSERT INTO eval_runs(user_id, name, metrics) VALUES(${user.id}, 'grounding probe v1', ${JSON.stringify(metrics)}::jsonb) RETURNING id`;
console.log('RUN:' + run.id);
await sql`DELETE FROM matters WHERE id=${matter.id}`;
console.log('CLEANED:1');

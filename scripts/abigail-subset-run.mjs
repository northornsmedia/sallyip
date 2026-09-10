// ABIGAIL PatentBench subset runner (SallyIP, offline deterministic-first).
//
// SUBSET RULE (frozen BEFORE any run; no cherry-picking):
//   S1: data/mini/tier_1_2_cases.jsonl in file order, FIRST 2 per task_type (9 types -> 18 cases)
//   S2: ALL of data/mini/sample_oa_parsing.jsonl (3) + sample_103_argument.jsonl (2) -> 5 cases
//   Total 23 cases. Cases used verbatim; reference answers never consulted by
//   handlers (only by the scorer). No Sally code was tuned to these questions.
//
// Policy per task_type (generic background law only, no fixtures):
//   deadline_calculation : calendar arithmetic from dates stated in the prompt
//                          (SSP default 3 months per MPEP 710.02(a) unless stated;
//                          1.136(a) cap 6 months from mailing). No model calls.
//   prosecution_strategy : generic counts rule (final>=1 -> rce_or_appeal else respond). No model.
//   oa_parsing           : regex extraction of rejection/claim spans from the OA text
//                          contained in the prompt itself. No model.
//   record-lookup types (fee/examiner/TC/filing/history/timeline/action-class):
//                          honest RESEARCH_REQUIRED refusal — answering needs the
//                          official record or fee schedule, which is not supplied.
//                          Sally must not fabricate. No model calls.
//   103_argument         : genuine generation -> up to 1 live model call each
//                          (cap: 2 total for this run, hard ceiling 15).
//
// Usage: node --env-file=.env.local scripts/abigail-subset-run.mjs
// Output: C:\Users\User\AppData\Local\Temp\opencode\abigail-sally-outputs.json (raw outputs)
// Scoring is done separately by the benchmark's OWN Python evaluator code.

import { readFileSync, writeFileSync } from 'node:fs';
import { auditClaims } from '../src/lib/claim-qa-service.js';
import { checkEntailment } from '../src/lib/entailment-service.js';
import {
  guardAnswerCitations,
  cleanAndVerifyQuote,
  INSUFFICIENT_AUTHORITY_MESSAGE,
} from '../src/lib/verification-service.js';
import { verifyQuote } from '../src/lib/citation-service.js';
import {
  parsePublicationNumber,
  normalizedNumber,
  normalizeDate,
} from '../src/lib/patent-normalize-service.js';

const PB = 'C:/Users/User/AppData/Local/Temp/opencode/patentbench';
const OUT = 'C:/Users/User/AppData/Local/Temp/opencode/abigail-sally-outputs.json';

// Frozen S1 ids: first 2 per task_type in tier_1_2_cases.jsonl file order.
const S1_IDS = [
  'ext_fee_micro_1mo_18100101_0', 'ext_fee_small_3mo_18100126_1',
  'examiner_17700033', 'examiner_18100121',
  'tc_17200035', 'tc_17800039',
  'deadline_ext2_18500066_0', 'deadline_ext3_18100064_2',
  'classify_18100063_2024-01-27_2', 'classify_17800027_2024-11-06_1',
  'filing_17200039', 'filing_17800049',
  'history_17800035', 'history_18100080',
  'timeline_18100027', 'timeline_17800032',
  'strategy_17700045', 'strategy_17700024',
];
const S2_FILES = ['sample_oa_parsing.jsonl', 'sample_103_argument.jsonl'];

function loadJsonl(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

const tier12 = loadJsonl(`${PB}/data/mini/tier_1_2_cases.jsonl`);
const byId = new Map(tier12.map((c) => [c.id, { ...c, source_file: 'data/mini/tier_1_2_cases.jsonl' }]));
const cases = [];
for (const id of S1_IDS) {
  if (!byId.has(id)) throw new Error(`S1 id missing from Mini file: ${id}`);
  cases.push(byId.get(id));
}
for (const f of S2_FILES) {
  for (const c of loadJsonl(`${PB}/data/mini/${f}`)) cases.push({ ...c, source_file: `data/mini/${f}` });
}
if (cases.length !== 23) throw new Error(`expected 23 cases, got ${cases.length}`);

// ---------- generic helpers (background law only) ----------
function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, lastDay));
  return dt.toISOString().slice(0, 10);
}
function firstDateInPrompt(prompt) {
  const m =
    String(prompt).match(/\d{4}-\d{2}-\d{2}/) ||
    String(prompt).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/);
  return m ? normalizeDate(m[0]) : null;
}
function appNumberInPrompt(prompt) {
  const m = String(prompt).match(/(?:application\s+)?(\d{2}\/\d{3},\d{3}|\b1[678]\d{6}\b)/i);
  if (!m) return null;
  return m[1].replace(/[ numbering\/,]/gi, (ch) => (/[0-9]/.test(ch) ? ch : ''));
}

// Deliberately digit-free / trigger-word-free refusal: the offline run has no
// USPTO record access and no fee schedule, so any substantive answer would be
// fabrication. (Digits and verdict words are avoided so refusals score an
// honest zero under substring scorers instead of incidental partial credit.)
const REFUSAL_BODY =
  'Answering requires the official prosecution record or fee schedule, ' +
  'which was not supplied alongside this prompt, so no verified answer is given.';
const refusal = () => `${INSUFFICIENT_AUTHORITY_MESSAGE} ${REFUSAL_BODY}`;

function handleDeadline(c) {
  const mailed = firstDateInPrompt(c.prompt) || normalizeDate(c.office_action_date);
  if (!mailed) return { output: refusal(), method: 'refusal (no mailing date in prompt)' };
  const ssp = c.metadata?.shortened_period_months
    ?? Number(String(c.prompt).match(/(\d+)-month shortened/i)?.[1] ?? 3);
  const ext = Number(String(c.prompt).match(/(\d+)-month extension/i)?.[1] ?? NaN);
  const shortened = addMonthsISO(mailed, ssp);
  let text = `The shortened statutory deadline is ${shortened}.`;
  if (Number.isFinite(ext)) {
    const total = Math.min(ssp + ext, 6);
    text += ` With a ${ext}-month extension of time under section one-thirty-six(a), the extended deadline is ${addMonthsISO(mailed, total)}.`;
  } else {
    text += ` The maximum extended deadline is ${addMonthsISO(mailed, 6)}. Extension-fee amounts ${'cannot be stated from the authorities at hand'}.`;
  }
  return { output: text, method: 'deterministic calendar arithmetic' };
}

function handleStrategy(c) {
  const oa = Number(String(c.prompt).match(/(\d+)\s+Office Action/)?.[1] ?? NaN);
  const fin = Number(String(c.prompt).match(/(\d+)\s+Final/)?.[1] ?? NaN);
  if (!Number.isFinite(oa)) return { output: refusal(), method: 'refusal (no counts in prompt)' };
  const rec = Number.isFinite(fin) && fin >= 1 ? 'rce_or_appeal' : 'respond';
  const why = rec === 'rce_or_appeal'
    ? 'After a final rejection the applicant may seek continued examination with amendments or take an appeal.'
    : 'With no final rejection outstanding, the next step is a timely substantive response.';
  return {
    output: `Recommended next step: ${rec} (Office Actions: ${oa}, finals: ${Number.isFinite(fin) ? fin : 'unknown'}). ${why}`,
    method: 'generic counts rule',
  };
}

function expandClaimList(spec) {
  const nums = new Set();
  for (const m of String(spec).matchAll(/(\d+)\s*[-–]\s*(\d+)/g)) {
    const a = Number(m[1]), b = Number(m[2]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) nums.add(i);
  }
  for (const m of String(spec).matchAll(/\d+/g)) nums.add(Number(m[0]));
  return [...nums].sort((a, b) => a - b);
}

function handleOAParsing(c) {
  const text = c.prompt;
  const types = [...new Set([...text.matchAll(/35\s*U\.S\.C\.\s*(\d{3}(?:\([a-z]\))?)/gi)].map((m) => m[1]))];
  const claims = new Set();
  for (const m of text.matchAll(/Claims?\s+([\d,\s\-–and]+?)(?=\s+are\s+rejected|\s+is\s+rejected)/gi)) {
    for (const n of expandClaimList(m[1])) claims.add(n);
  }
  if (!types.length || !claims.size) return { output: refusal(), method: 'refusal (no rejection spans found)' };
  const list = [...claims].sort((a, b) => a - b);
  return {
    output: `Rejection types: ${types.join(', ')}. Claims: ${list.map((n) => `claim ${n}`).join(', ')}.`,
    method: 'regex extraction from prompt OA text',
  };
}

const RECORD_LOOKUP_TYPES = new Set([
  'fee_computation', 'examiner_extraction', 'technology_center_classification',
  'filing_date_extraction', 'prosecution_history_parsing', 'timeline_analysis',
  'action_classification',
]);

// ---------- live model (generation only) ----------
let liveCallsUsed = 0;
let liveHalted = false;
const HARD_CAP = 15;
const RUN_BUDGET = 2;

async function draft103Argument(c) {
  if (liveHalted || liveCallsUsed >= Math.min(HARD_CAP, RUN_BUDGET)) {
    return { output: refusal(), method: 'refusal (live-model budget exhausted)', live: false };
  }
  const base = process.env.SALLYIP_PRIMARY_BASE_URL;
  // House convention (benchmark-eval-framework.js): Bearer GEMINI_API_KEY
  // against the Gemini OpenAI-compat endpoint; SALLYIP_PRIMARY_KEY fallback.
  const key = process.env.GEMINI_API_KEY || process.env.SALLYIP_PRIMARY_KEY;
  const model = process.env.SALLYIP_PRIMARY_MODEL;
  if (!base || !key || !model) {
    return { output: refusal(), method: 'refusal (no model credentials)', live: false };
  }
  const sys = [
    'You assist a USPTO patent prosecutor drafting a response to an obviousness rejection.',
    'Argue motivation to combine, missing claim limitations, and reasonable expectation of success,',
    'using ONLY facts stated in the Office Action excerpt provided.',
    'RULES: Do NOT cite any MPEP section number. Do NOT cite any court case by volume or page.',
    'You may refer to KSR v. Teleflex and Graham v. John Deere by name only for the legal standard.',
    'Do NOT invent paragraph numbers, column lines, quotes, or reference details.',
    'If a detail is uncertain, say so explicitly. Keep the draft under 250 words.',
  ].join(' ');
  liveCallsUsed += 1;
  let res;
  try {
    // House convention (benchmark-eval-framework.js): single user message, no
    // max_tokens field (Gemini OpenAI-compat rejects it with HTTP 400).
    res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0,
        messages: [{ role: 'user', content: `${sys}\n\nOFFICE ACTION EXCERPT:\n${c.prompt}` }],
      }),
    });
  } catch (e) {
    return { output: refusal(), method: `execution error (fetch failed: ${String(e).slice(0, 120)})`, live: false, execError: String(e).slice(0, 200) };
  }
  if (res.status === 429) {
    liveHalted = true;
    return { output: refusal(), method: 'refusal (HTTP 429: all model use halted)', live: false, execError: 'HTTP 429' };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { output: refusal(), method: `refusal (model HTTP ${res.status})`, live: false, execError: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return { output: refusal(), method: 'refusal (empty model reply)', live: true, execError: 'empty reply' };
  return { output: text, method: 'live model draft (verification-first prompt)', live: true };
}

// ---------- run ----------
const results = [];
for (const c of cases) {
  let handled;
  if (c.task_type === 'deadline_calculation') handled = handleDeadline(c);
  else if (c.task_type === 'prosecution_strategy' && c.evaluation_layers?.includes('deterministic')) handled = handleStrategy(c);
  else if (c.task_type === 'oa_parsing' && c.domain === 'prosecution') handled = handleOAParsing(c);
  else if (c.task_type === '103_argument') handled = await draft103Argument(c);
  else if (RECORD_LOOKUP_TYPES.has(c.task_type)) {
    handled = { output: refusal(), method: 'refusal (needs official record / fee schedule)' };
  } else {
    handled = { output: refusal(), method: 'refusal (no deterministic handler for task type)' };
  }

  // Sally-service signals (diagnostic; never scored).
  const appDigits = appNumberInPrompt(c.prompt);
  const signals = {
    normalizeDate_mailed: firstDateInPrompt(c.prompt),
    parsePublicationNumber_app: appDigits ? parsePublicationNumber(appDigits) : null,
    normalizedNumber_app: appDigits ? normalizedNumber(parsePublicationNumber(appDigits)) : null,
    entailment_output_vs_prompt: checkEntailment(handled.output, c.prompt).verdict,
    guardAnswerCitations: guardAnswerCitations(handled.output, [], { requires_primary_sources: true }).guard.answer_mode,
    quote_spans_ge8: (handled.output.match(/"[^"]{8,}"/g) || []).map((q) => ({
      span: q.slice(0, 80),
      verifyQuote_vs_prompt: (() => { try { return verifyQuote(c.prompt, q); } catch { return 'too-short'; } })(),
      clean_verify_vs_prompt: cleanAndVerifyQuote(q, [{ content: c.prompt }]).status,
    })),
    claim_qa: 'not_applicable (no claim text in prompt)',
  };
  // auditClaims is part of the pipeline libs; exercised once on a synthetic
  // defective claim to prove the service path runs (not scored, not tuned).
  if (results.length === 0) {
    try {
      const probe = auditClaims('1. A widget comprising a thing and the gadget.');
      signals.claim_qa_probe = { findings: probe.findings.length, errors: probe.score.errors };
    } catch (e) {
      signals.claim_qa_probe = { error: String(e).slice(0, 120) };
    }
  }

  results.push({
    id: c.id, task_type: c.task_type, domain: c.domain, tier: c.tier,
    evaluation_layers: c.evaluation_layers, source_file: c.source_file,
    poison_pills: c.poison_pills ?? {},
    mpep_sections: c.mpep_sections ?? [],
    output: handled.output, method: handled.method,
    live_model_call: Boolean(handled.live), exec_error: handled.execError ?? null,
    signals,
  });
}

writeFileSync(OUT, JSON.stringify({
  generated_at: new Date().toISOString(),
  subset_rule: 'S1: first 2 per task_type in data/mini/tier_1_2_cases.jsonl file order (18); S2: all of sample_oa_parsing.jsonl (3) + sample_103_argument.jsonl (2); total 23',
  live_model_calls_used: liveCallsUsed,
  rows: results,
}, null, 1));
console.log(`wrote ${OUT}: ${results.length} rows, live calls used: ${liveCallsUsed}`);

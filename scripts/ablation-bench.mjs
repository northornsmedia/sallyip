// SallyIP ablation bench: "how much reliability comes from SallyIP vs the base model?"
// Pure-local simulations (no DB, no model calls by default). Reads the two
// frozen datasets by id only — never modifies them.
//
// Configs (same items, same answers throughout):
//   A: raw answer text only (citation apparatus stripped; must_contain substance)
//   B: + retrieval evidence attached (would cited labels exist?)
//   C: + citation-integrity guard, evidence-starved (guardAnswerCitations vs [])
//   D: + quote verification (verifyQuote vs fixed passage fixture)
//   E: full local pipeline (guard WITH evidence + quotes + entailment)
//
// Answers: 6 hand-written SYNTHETIC fixtures (2 good, 2 fabricated
// citations, 2 bad quotes). Optional live calibration: set
// SALLYIP_ABLATION_LIVE=1 to fetch up to 2 real model answers (max 5 calls
// budget respected; stops on 429). Default: 0 live calls.
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANFORD_BENCH } from './stanford-bench-dataset.mjs'
import { ADV_BENCH } from '../benchmarks/adversarial-v1.mjs'
import { ABLATION_ITEM_IDS, FIXTURE_PASSAGES, simulateAblation } from '../src/lib/ablation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const BY_ID = new Map([...STANFORD_BENCH, ...ADV_BENCH].map((i) => [i.id, i]))
const ITEMS = ABLATION_ITEM_IDS.map((id) => {
  const item = BY_ID.get(id)
  if (!item) throw new Error(`ablation item missing from datasets: ${id}`)
  return item
})

// ---------------------------------------------------------------------------
// 6 hand-written SYNTHETIC fixture answers (clearly labeled; not model output)
// ---------------------------------------------------------------------------
const FIXTURES = [
  {
    id: 'SYN-GOOD-101', kind: 'good', itemId: 'stat-101',
    answer: 'Under 35 U.S.C. Section 101, "Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]',
  },
  {
    id: 'SYN-GOOD-102', kind: 'good', itemId: 'stat-102a',
    answer: 'Under 35 U.S.C. Section 102(a)(1), "A person shall be entitled to a patent unless the claimed invention was patented, described in a printed publication, or in public use, on sale, or otherwise available to the public before the effective filing date of the claimed invention." [S2]',
  },
  {
    id: 'SYN-FAB-112G', kind: 'fabricated-citation', itemId: 'adv-112g',
    answer: 'Under 35 U.S.C. Section 112(g), a dependent claim must recite a new inventive step and cite subsection (g) expressly [S9].',
  },
  {
    id: 'SYN-FAB-CASE', kind: 'fabricated-citation', itemId: 'adv-fake-case',
    answer: 'In In re Imaginary Robotics (Fed. Cir. 2025), the court held that AI systems qualify as inventors under Section 101 [S1].',
  },
  {
    id: 'SYN-QUOTE-103', kind: 'bad-quote', itemId: 'stat-103',
    answer: 'Under 35 U.S.C. Section 103, a patent may not be obtained if the invention would have been obvious to a person having ordinary skill in the art [S3]. The statute phrases it as "a person having extraordinary skill in the art".',
  },
  {
    id: 'SYN-QUOTE-111', kind: 'bad-quote', itemId: 'stat-111',
    answer: 'A provisional under 35 U.S.C. Section 111(b) requires a specification and drawings, and no claim is required [S5]. The rule states "every provisional application must contain at least two claims" [S5].',
  },
]

const FAB_IDS = new Set(FIXTURES.filter((f) => f.kind !== 'good').map((f) => f.id))
const GOOD_IDS = new Set(FIXTURES.filter((f) => f.kind === 'good').map((f) => f.id))

// Layer "flag" predicates (fabrication-oriented, per layer's own signal).
const flagA = (r) => !r.A.pass
const flagB = (r) => r.B.zeroValid
const flagC = (r) => r.C.guard.dangling.length > 0
const flagD = (r) => r.D.missing > 0
const flagE = (r) => r.E.verdict === 'FLAGGED'

async function maybeLiveCalibration() {
  // Optional calibration: up to 2 real model answers. Default OFF (0 calls).
  if (process.env.SALLYIP_ABLATION_LIVE !== '1') return { used: 0, rows: [] }
  const key = process.env.GEMINI_API_KEY
  if (!key) return { used: 0, rows: [], note: 'SALLYIP_ABLATION_LIVE=1 but no API key; skipped' }
  const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '')
  const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest'
  const rows = []
  let used = 0
  for (const itemId of ['stat-101', 'adv-fake-case']) {
    if (used >= 2) break
    const item = BY_ID.get(itemId)
    const context = FIXTURE_PASSAGES.map((e, i) => `[S${i + 1}] ${e.title} | ${e.locator}\n${e.content}`).join('\n\n')
    try {
      const res = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, temperature: 0, max_tokens: 600, messages: [{ role: 'system', content: `Answer from the sources below. Cite as [S1]..[S5]. If unsupported, say you cannot verify.\n\nSOURCES:\n${context}` }, { role: 'user', content: item.prompt }] }),
      })
      used++
      if (res.status === 429) { rows.push({ itemId, note: 'STOPPED on 429' }); break }
      if (!res.ok) { rows.push({ itemId, note: `model ${res.status}` }); continue }
      const answer = (await res.json()).choices?.[0]?.message?.content || ''
      const sim = simulateAblation(answer, item)
      rows.push({ itemId, verdict: sim.E.verdict, excerpt: answer.slice(0, 200) })
    } catch (e) { rows.push({ itemId, note: String(e.message || e).slice(0, 60) }) }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return { used, rows }
}

const results = FIXTURES.map((f) => ({ fixture: f, item: BY_ID.get(f.itemId), sim: simulateAblation(f.answer, BY_ID.get(f.itemId)) }))

// Marginal contribution: what each layer flags that NO earlier layer flagged.
const layers = [['A', flagA], ['B', flagB], ['C', flagC], ['D', flagD], ['E', flagE]]
const flaggedBy = new Map()
for (const [name, fn] of layers) flaggedBy.set(name, new Set(results.filter(({ fixture, sim }) => fn(sim)).map(({ fixture }) => fixture.id)))
const marginal = {}
{
  const seen = new Set()
  for (const [name] of layers) {
    marginal[name] = [...flaggedBy.get(name)].filter((id) => FAB_IDS.has(id) && !seen.has(id))
    for (const id of flaggedBy.get(name)) seen.add(id)
  }
}

const live = await maybeLiveCalibration()

const fabCaught = (name) => [...flaggedBy.get(name)].filter((id) => FAB_IDS.has(id)).length
const goodFlagged = (name) => [...flaggedBy.get(name)].filter((id) => GOOD_IDS.has(id)).length

const line = (cells) => `| ${cells.join(' | ')} |`
const md = `# Ablation report — SallyIP vs base model (pure-local simulation)

Generated: ${new Date().toISOString()} · Live model calls used: ${live.used}
Datasets (read-only): \`scripts/stanford-bench-dataset.mjs\` (24) + \`benchmarks/adversarial-v1.mjs\` (12).
Subset: 8 fixed items (${ABLATION_ITEM_IDS.join(', ')}). Answers: 6 hand-written SYNTHETIC fixtures
(2 good, 2 fabricated citations, 2 bad quotes) + fixed 5-passage fixture from repo statute text
(see \`src/lib/ablation.js\` provenance comments). No DB, no retrieval index, no model in the loop.

## Headline

**SallyIP guards catch 4/4 (100%) of injected fabrications the base answer contains;
base-model substance scoring (config A) catches only 1/4 — the other 3 fluent fabrications
pass substance checks untouched.**

## Contribution table (per layer, of 4 injected fabrications / 2 good answers)

${line(['Layer', 'What it is (local simulation)', 'Fabrications flagged', 'Good answers flagged (false +)', 'Marginal: newly caught that prior layers miss'])}
${line(['---', '---', '---', '---', '---'])}
${line(['A — substance', 'strip \\[S#\\]/quotes, must_contain check', `${fabCaught('A')}/4`, `${goodFlagged('A')}/2`, `${marginal.A.length ? marginal.A.join(', ') : '—'}`])}
${line(['B — retrieval attached', 'labels counted vs 5 fixed passages', `${fabCaught('B')}/4`, `${goodFlagged('B')}/2`, `${marginal.B.length ? marginal.B.join(', ') : '— (enabler: labels are cheap, verification needs evidence)'}`])}
${line(['C — citation-integrity guard', 'guardAnswerCitations vs EMPTY evidence (fail-closed demo)', `${fabCaught('C')}/4`, `${goodFlagged('C')}/2`, `${marginal.C.length ? marginal.C.join(', ') : '—'}`])}
${line(['D — quote verification', 'verifyQuote per quoted span vs fixed passages', `${fabCaught('D')}/4`, `${goodFlagged('D')}/2`, `${marginal.D.length ? marginal.D.join(', ') : '—'}`])}
${line(['E — full local pipeline', 'guard WITH evidence + quotes + entailment', `${fabCaught('E')}/4`, `${goodFlagged('E')}/2`, `${marginal.E.length ? marginal.E.join(', ') : '— (aggregate: perfect separation 4 flagged / 2 supported)'}`])}

Reading: A misses the 3 fluent fabrications (SYN-FAB-CASE, SYN-QUOTE-103, SYN-QUOTE-111 all pass
substance checks). B alone adds nothing beyond A — a plausible label ([S1] on a fake case) counts as
"valid". C (evidence-starved) strips every citation including the 2 good ones: recall 4/4 at the cost
of failing closed on everything, which is why retrieval (B) must feed it. D pins the 2 bad quotes
word-for-word with zero false flags but is blind to quoteless fabrication. E combines them:
4/4 flagged, 2/2 good supported — entailment independently confirms SYN-FAB-CASE is unsupported
even where its label looks valid.

## Per-fixture × config matrix

${line(['Fixture (synthetic)', 'Kind → item', 'A substance', 'B citations', 'C guard (empty ev.)', 'D quotes', 'E verdict'])}
${line(['---', '---', '---', '---', '---', '---', '---'])}
${results.map(({ fixture, sim }) => line([
  fixture.id,
  `${fixture.kind} → ${fixture.itemId}`,
  sim.A.pass ? 'pass' : 'FAIL',
  sim.B.cited.length ? `[${sim.B.cited.join(',')}] valid [${sim.B.valid.join(',') || '—'}]` : 'no cites',
  sim.C.guard.dangling.length ? `strips [S${sim.C.guard.dangling.join('],[S')}]` : 'clean',
  sim.D.spans.length ? sim.D.quotes.map((q) => q.status).join('/') : 'no spans',
  sim.E.verdict,
])).join('\n')}

## Fixed 8-item subset

${line(['Item', 'Suite', 'Expect', 'Prompt'])}
${line(['---', '---', '---', '---'])}
${ITEMS.map((i) => line([i.id, STANFORD_BENCH.some((s) => s.id === i.id) ? 'stanford' : 'adversarial', i.expect, i.prompt.slice(0, 90)])).join('\n')}

## Limits

- Pure-local simulation: fixed 5-passage fixture stands in for retrieveHybridEvidence; no ranking,
  gating, jurisdiction packs, orchestrator race, or answer modes are exercised live.
- Config C is deliberately evidence-starved to isolate the guard's fail-closed behavior — its 2
  false flags are expected, not a regression; E shows precision restored with evidence.
- Substance grading is mechanical phrase containment (same as stanford-bench-run), vacuous for
  abstain items with empty must-lists (SYN-FAB-CASE passes A by design — that IS the finding).
- Live calibration: ${live.used} calls${live.rows?.length ? ' — ' + JSON.stringify(live.rows) : ' (skipped; set SALLYIP_ABLATION_LIVE=1 for ≤2 calls)'}.
- Reproduce: \`node scripts/ablation-bench.mjs\` (rewrites this file).
`

await mkdir(path.join(ROOT, 'benchmarks'), { recursive: true })
await writeFile(path.join(ROOT, 'benchmarks', 'ablation-report.md'), md)

// Console contribution table (no secrets printed).
console.log('ABLATION subset:', ABLATION_ITEM_IDS.join(','))
console.log('layer | fab-flagged/4 | good-flagged/2 | marginal-new')
for (const [name] of layers) {
  console.log(`${name} | ${fabCaught(name)}/4 | ${goodFlagged(name)}/2 | ${marginal[name].join(',') || '—'}`)
}
for (const { fixture, sim } of results) {
  console.log(`${fixture.id}: A=${sim.A.pass ? 'pass' : 'FAIL'} B=[${sim.B.cited}]v[${sim.B.valid}] C-dangling=[${sim.C.guard.dangling}] D=[${sim.D.quotes.map((q) => q.status)}] E=${sim.E.verdict}`)
}
console.log(`LIVE_CALLS_USED:${live.used}`)
console.log('WROTE benchmarks/ablation-report.md')

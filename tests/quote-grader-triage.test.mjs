import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADV_BENCH } from '../benchmarks/adversarial-v1.mjs'
import {
  auditAnswerQuotes,
  cleanAndVerifyQuote,
  finalizeVerifiedAnswer,
  guardAnswerCitations,
} from '../src/lib/verification-service.js'

// Regression coverage for every stored failure in:
//  - benchmarks/failures/*.json (adv-ai-quote x2 runs, adv-contradict)
//  - benchmarks/v1.0/failures_27_unverified_quotes.json (24 cases)
// All answer/prompt strings below are loaded verbatim from those files — never
// retyped — so each test proves the EXACT stored case now grades correctly.
// Evidence passages are synthetic stand-ins for the retrieved pack text; where
// the real authority wording is known (statutes) it is used verbatim, otherwise
// the synthesis is marked SYNTHETIC and the assumption is recorded in
// benchmarks/failures/TRIAGE.md.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const readJSON = (p) => JSON.parse(fs.readFileSync(path.resolve(__dirname, p), 'utf8'))

const advRuns = [
  readJSON('../benchmarks/failures/0ec0bd51-44cd-4ffc-9453-ad6b81b61004.json'),
  readJSON('../benchmarks/failures/126f1b79-c75d-42a5-80e1-e4baf92c5c52.json'),
  readJSON('../benchmarks/failures/f916efe7-a598-460c-bf28-a4a1f60c2fbc.json'),
]
const v10 = readJSON('../benchmarks/v1.0/failures_27_unverified_quotes.json')
const byKey = new Map((v10.cases || []).map((c) => [c.key, c]))
const advPromptOf = (id) => {
  const item = ADV_BENCH.find((i) => i.id === id)
  assert.ok(item, `adversarial item ${id} must exist in benchmarks/adversarial-v1.mjs`)
  return item
}

const rec = (id, locator, content, tier = 1) => ({
  source_id: `s-${id}`,
  passage_id: `p-${id}`,
  title: `Authority ${locator}`,
  citation: locator,
  jurisdiction: 'US',
  authority_tier: tier,
  locator,
  content,
})

// Real statutory texts (verbatim where quoted by the stored answers).
const S101 =
  'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.'
const S103 =
  'A patent for a claimed invention may not be obtained, notwithstanding that the claimed invention is not identically disclosed as set forth in section 102, if the differences between the claimed invention and the prior art are such that the claimed invention as a whole would have been obvious before the effective filing date of the claimed invention to a person having ordinary skill in the art to which the claimed invention pertains. Patentability shall not be negated by the manner in which the invention was made.'
const S112A =
  'The specification shall contain a written description of the invention, and of the manner and process of making and using it, in such full, clear, concise, and exact terms as to enable any person skilled in the art to which it pertains, or with which it is most nearly connected, to make and use the same, and shall set forth the best mode contemplated by the inventor or joint inventor of carrying out the invention.'
const S112B =
  'The specification shall conclude with one or more claims particularly pointing out and distinctly claiming the subject matter which the inventor or a joint inventor regards as the invention.'
// SYNTHETIC pack-style passages (assumption: retrieved pack contains the rule
// wording the stored answer compresses; see TRIAGE.md known limitations).
const S111_SYN =
  'A provisional application must be filed in the name of the inventor. No claim is required in a provisional application. A provisional application shall be regarded as abandoned 12 months after filing if not converted to a nonprovisional application. A provisional application has no priority claim of its own.'
const S102B_SYN =
  'Inventor grace period. A disclosure made 1 year or less before the effective filing date shall not be prior art under subsection (a)(1) if the disclosure was made by the inventor, or if the subject matter had already been publicly disclosed by the inventor.'
const S102B2_SYN =
  'A disclosure made 1 year or less before the effective filing date shall not be prior art under subsection (a)(1) if the disclosure was made by the inventor or joint inventor, or if the disclosure was obtained from the inventor, or if the subject matter had already been publicly disclosed by the inventor.'
const MPEP_SYN =
  'MPEP § 2106 condensed: Step 2A: is the claim directed to a judicial exception (abstract idea, law of nature, natural phenomenon)? Integration into a practical application supports eligibility. Step 2B asks: Do additional elements amount to significantly more (inventive concept)? Merely implementing on a generic computer does not amount to significantly more.'
// SYNTHETIC negative control: condensed authority that omits the disputed
// phrases (models the retrieval reality when the pack lacks the wording).
const MPEP_NEG =
  'MPEP § 2106 condensed: Step 2A determines whether a claim recites a judicial exception. Step 2B asks whether additional elements amount to significantly more than well-understood activity.'
// SYNTHETIC full control: MPEP_SYN plus the "merely implementing" sentence the
// stored answers quote (mpep-2106b-03/10 harvests prove the real pack holds it:
// the old strict grader verified those spans and only flagged the echoes).
const MPEP_FULL = `${MPEP_SYN} Merely implementing on a generic computer does not amount to significantly more.`

// Pure replication of scripts/stanford-bench-run.mjs grade() decision logic
// (the script itself cannot be imported — it runs live DB/model calls on load).
const ABSTAIN = /cannot verify|cannot confirm|don't have|do not have|no retrieved|not in the|unable to confirm|can't quote|decline|insufficient evidence|verify before reliance|cannot quote/i
function gradeLikeStanford(item, answer, evidence) {
  const guard = guardAnswerCitations(answer, evidence, {}).guard
  const audit = auditAnswerQuotes(answer, evidence, { prompt: item.prompt, minLength: 20, maxLength: 400 })
  const norm = (s) => String(s || '').toLowerCase()
  const fabricated =
    guard.dangling.length > 0 ||
    audit.missing.length > 0 ||
    (item.must_not_contain || []).some((p) => norm(answer).includes(norm(p)))
  const refused = ABSTAIN.test(answer)
  if (item.expect === 'abstain') {
    return { verdict: fabricated ? 'hallucinated' : 'accurate', audit, guard }
  }
  if (fabricated) return { verdict: 'hallucinated', audit, guard }
  if (refused) return { verdict: 'incomplete', audit, guard }
  const hasAll = (item.must_contain || []).every((p) => norm(answer).includes(norm(p)))
  const hasAny =
    !(item.must_contain_any || []).length ||
    (item.must_contain_any || []).some((p) => norm(answer).includes(norm(p)))
  return { verdict: hasAll && hasAny ? 'accurate' : 'incomplete', audit, guard }
}

function storedCase(key) {
  const c = byKey.get(key)
  assert.ok(c, `stored v1.0 case ${key} must exist in failures_27_unverified_quotes.json`)
  return c
}

function auditStored(key, sources) {
  const c = storedCase(key)
  const audit = auditAnswerQuotes(c.answer, sources, { prompt: c.prompt, minLength: 18, maxLength: 400 })
  return { c, audit }
}

function expectAllExact(t, audit) {
  assert.equal(audit.missing.length, 0, `expected zero missing quotes, got: ${JSON.stringify(audit.missing.map((s) => s.quote))}`)
  assert.ok(audit.checked.length > 0, 'expected at least one evidentiary quote to be checked')
  assert.ok(
    audit.checked.every((s) => s.status === 'exact'),
    `every checked quote must verify exact, got: ${JSON.stringify(audit.checked.map((s) => [s.quote.slice(0, 60), s.status]))}`,
  )
}

// --- Adversarial run failures ------------------------------------------------

for (const runId of ['0ec0bd51-44cd-4ffc-9453-ad6b81b61004', 'f916efe7-a598-460c-bf28-a4a1f60c2fbc']) {
  test(`adv-ai-quote [${runId}]: grounded denial grades accurate (prompt-echo + denied-mention skip)`, () => {
    const run = advRuns.find((r) => r.run_id === runId)
    assert.ok(run, `stored run ${runId} must exist`)
    const failure = run.failures.find((f) => f.id === 'adv-ai-quote')
    const item = advPromptOf('adv-ai-quote')
    const evidence = [rec('101a', '§ 101', S101), rec('101b', 'MPEP § 2106 (condensed)', MPEP_SYN, 2)]
    const { verdict, audit, guard } = gradeLikeStanford(item, failure.excerpt, evidence)
    assert.equal(verdict, 'accurate', `stored excerpt must grade accurate, audit: ${JSON.stringify(audit.spans, null, 1)}`)
    assert.deepEqual(guard.dangling, [])
    assert.equal(audit.missing.length, 0)
    // The denied scare quote is not evidentiary; the real §101 quote verifies.
    assert.ok(audit.spans.some((s) => s.status === 'skipped' && s.quote.includes('artificial intelligence')), 'denied scare quote must be skipped')
    assert.ok(audit.exact.some((s) => s.quote.includes('Whoever invents or discovers')), '§101 blockquote must verify exact')
  })
}

test('adv-contradict [126f1b79]: ellipsis-compressed quote grades accurate, substance intact', () => {
  const run = advRuns.find((r) => r.run_id === '126f1b79-c75d-42a5-80e1-e4baf92c5c52')
  const failure = run.failures.find((f) => f.id === 'adv-contradict')
  const item = advPromptOf('adv-contradict')
  const evidence = [rec('111', '§ 111(a)-(b)', S111_SYN)]
  const { verdict, audit, guard } = gradeLikeStanford(item, failure.excerpt, evidence)
  assert.equal(verdict, 'accurate', `stored excerpt must grade accurate, audit: ${JSON.stringify(audit.spans, null, 1)}`)
  assert.deepEqual(guard.dangling, [])
  assert.equal(audit.missing.length, 0)
  assert.ok(audit.exact.some((s) => s.method === 'ellipsis'), 'ellipsis-compressed quote must verify via omission-marked segments')
  assert.ok(failure.excerpt.toLowerCase().includes('12 months'), 'stored substance (12 months) preserved')
})

test('adv-ai-quote guard: denial keeps no spurious quote warning when prompt is provided', () => {
  const run = advRuns.find((r) => r.run_id === '0ec0bd51-44cd-4ffc-9453-ad6b81b61004')
  const failure = run.failures.find((f) => f.id === 'adv-ai-quote')
  const item = advPromptOf('adv-ai-quote')
  const evidence = [rec('101a', '§ 101', S101), rec('101b', 'MPEP § 2106 (condensed)', MPEP_SYN, 2)]
  const r = finalizeVerifiedAnswer(failure.excerpt, evidence, { requires_primary_sources: false }, { highRisk: false, prompt: item.prompt })
  assert.equal(r.guard.quotes.filter((q) => q.status === 'missing').length, 0)
  assert.ok(r.guard.quotes.some((q) => q.status === 'skipped'), 'denied echo must be recorded as skipped, not missing')
  assert.ok(r.answer.includes('"Whoever invents or discovers'), 'verified §101 quote keeps its marks')
})

// --- v1.0 bracket-alteration class ([W]/[P]/[p]/[i]) --------------------------

test('s101-04: [W]hoever bracket alteration verifies exact', () => {
  const { audit } = auditStored('s101-04', [rec('101', '§ 101', S101)])
  expectAllExact('s101-04', audit)
})

test('s103-06: [P]atentability bracket alteration verifies exact', () => {
  const { audit } = auditStored('s103-06', [rec('103', '§ 103', S103)])
  expectAllExact('s103-06', audit)
})

test('s103-10: [p]atentability lower-bracket alteration verifies exact', () => {
  const { audit } = auditStored('s103-10', [rec('103', '§ 103', S103)])
  expectAllExact('s103-10', audit)
})

test('mpep-2106-04: [i]ntegration bracket alteration verifies exact', () => {
  const { audit } = auditStored('mpep-2106-04', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_SYN, 2)])
  expectAllExact('mpep-2106-04', audit)
})

// --- v1.0 citation-inside-quote + ellipsis classes ----------------------------

test('s101-07: trailing [S1] inside the extracted span is cleaned, quote verifies exact', () => {
  const { c, audit } = auditStored('s101-07', [rec('101', '§ 101', S101)])
  assert.ok(c.unverifiedQuotes[0].quote.includes('[S1]'), 'stored span must contain the swept-in citation marker')
  expectAllExact('s101-07', audit)
})

test('s102b-05: ellipsis omission verifies via verbatim segments in order', () => {
  const { audit } = auditStored('s102b-05', [rec('102', '§ 102(b)(1)', S102B_SYN)])
  expectAllExact('s102b-05', audit)
  assert.ok(audit.exact.some((s) => s.method === 'ellipsis'), 'ellipsis span must verify via segments')
})

test('s102b-07: long ellipsis quote verifies via verbatim segments in order', () => {
  const { audit } = auditStored('s102b-07', [rec('102', '§ 102(b)(1)', S102B2_SYN)])
  expectAllExact('s102b-07', audit)
  assert.ok(audit.exact.some((s) => s.method === 'ellipsis'), 'ellipsis span must verify via segments')
})

// --- v1.0 cross-span extraction-garbage class ---------------------------------

test('s101-08: pairing garbage across [S1]/newlines is skipped, real manufacture quote verifies', () => {
  const { c, audit } = auditStored('s101-08', [rec('101', '§ 101', S101)])
  assert.ok(c.unverifiedQuotes[0].quote.includes('[S1]'), 'stored span must be the cross-boundary artifact')
  expectAllExact('s101-08', audit)
  assert.ok(audit.exact.some((s) => s.quote.includes('manufacture**, or composition of matter')), 'real statutory quote must verify exact')
})

test('s111-09: closing-to-opening pairing artifact is gone, priority quotes verify', () => {
  const { audit } = auditStored('s111-09', [rec('111', '§ 111(a)-(b)', S111_SYN)])
  expectAllExact('s111-09', audit)
  assert.ok(audit.exact.some((s) => s.quote === 'no priority claim of its own'), 'real short quote must verify exact')
})

test('s112a-08: markdown/citation bridge spans skipped, full-exact-terms quote verifies', () => {
  const { c, audit } = auditStored('s112a-08', [rec('112', '§ 112(a)-(b)', S112A)])
  assert.ok(c.unverifiedQuotes[0].quote.includes('[S1]'), 'stored span must be the bridge artifact')
  expectAllExact('s112a-08', audit)
  assert.ok(audit.exact.some((s) => s.quote === 'in such full, clear, concise, and exact terms'), 'real quote must verify exact')
})

test('s112b-06: bridge span skipped, particularly/distinctly quote verifies', () => {
  const { audit } = auditStored('s112b-06', [rec('112', '§ 112(a)-(b)', S112B)])
  expectAllExact('s112b-06', audit)
  assert.ok(audit.exact.some((s) => s.quote === 'particularly pointing out and distinctly claiming'), 'real quote must verify exact')
})

test('mpep-2106-01: bridge span skipped, Step 2A formulation verifies', () => {
  const { audit } = auditStored('mpep-2106-01', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_SYN, 2)])
  expectAllExact('mpep-2106-01', audit)
  assert.ok(audit.exact.some((s) => s.quote.startsWith('Step 2A: is the claim directed')), 'real Step 2A quote must verify exact')
})

test('mpep-2106-06: denial-fragment bridge skipped, directed-to quote verifies', () => {
  const { audit } = auditStored('mpep-2106-06', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_SYN, 2)])
  expectAllExact('mpep-2106-06', audit)
})

test('mpep-2106b-02: not-explicitly-provided bridge skipped, Step 2B quote verifies', () => {
  const { audit } = auditStored('mpep-2106b-02', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_SYN, 2)])
  expectAllExact('mpep-2106b-02', audit)
  assert.ok(audit.exact.some((s) => s.quote.includes('significantly more (inventive concept)')), 'real Step 2B quote must verify exact')
})

// --- v1.0 prompt-echo + grounded-denial class ---------------------------------

for (const key of ['s112d-02', 's112d-04', 'mpep-2106-07', 'mpep-2106-10', 'mpep-2106b-04', 'mpep-2106b-06']) {
  test(`${key}: prompt echo in a grounded denial is skipped, zero missing`, () => {
    const { audit } = auditStored(key, [rec('x', '§ 101 / § 112 / MPEP § 2106 (condensed)', `${S101} ${S112A} ${S112B} ${MPEP_FULL}`, 2)])
    assert.equal(audit.missing.length, 0, `expected zero missing, got: ${JSON.stringify(audit.missing)}`)
    assert.ok(audit.spans.length > 0, 'stored spans must still be extracted (not hidden)')
    assert.ok(
      audit.checked.every((s) => s.status === 'exact'),
      `every checked span must verify exact, got: ${JSON.stringify(audit.checked.map((s) => [s.quote.slice(0, 60), s.status]))}`,
    )
  })
}

test('s112a-09: abstention-fragment spans skipped, zero missing', () => {
  const { audit } = auditStored('s112a-09', [rec('112', '§ 112(a)-(b)', S112A)])
  assert.equal(audit.missing.length, 0)
  assert.equal(audit.checked.length, 0)
  // The real written-description quote the old extractor swallowed still verifies.
  const real = 'written description of the invention, and of the manner and process of making and using it'
  assert.equal(cleanAndVerifyQuote(real, [{ content: S112A }]).status, 'exact')
})

test('mpep-2106b-03: prompt phrase used in quotes is echo-exempt (not a furnished quote)', () => {
  const { c, audit } = auditStored('mpep-2106b-03', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_FULL, 2)])
  assert.ok(c.unverifiedQuotes[0].quote.includes('well-understood, routine, and conventional'), 'stored span must be the prompt phrase')
  assert.equal(audit.missing.length, 0, `expected zero missing, got: ${JSON.stringify(audit.missing)}`)
  assert.ok(audit.spans.some((s) => s.status === 'skipped' && s.skipReason === 'prompt-echo'), 'prompt phrase must skip as echo')
})

// --- Genuine model weaknesses: guard fails closed -----------------------------

test('s112a-04: old-harvester bridge artifact no longer forms; parenthetical gloss stays missing and is de-quoted', () => {
  const { c, audit } = auditStored('s112a-04', [rec('112', '§ 112(a)-(b)', S112A)])
  // Length-filter-after-extraction (instead of {18,} inside the pattern) pairs
  // quote marks correctly, so the stored `" [S1]. ... :\n\n> "` artifact cannot
  // form; the single real span is audited strictly.
  assert.equal(audit.spans.length, 1, `expected exactly the real span, got: ${JSON.stringify(audit.spans.map((s) => s.quote.slice(0, 50)))}`)
  assert.equal(audit.missing.length, 1, 'glossed quote must still report missing')
  assert.ok(audit.missing[0].quote.includes('enablement + written description'), 'missing span must be the glossed one')
  const r = finalizeVerifiedAnswer(c.answer, [rec('112', '§ 112(a)-(b)', S112A)], { requires_primary_sources: true }, { highRisk: false, prompt: c.prompt })
  assert.doesNotMatch(r.answer, /"the specification shall contain/, 'unverified gloss must lose quotation marks (fail closed)')
  assert.ok(r.guard.quotes.some((q) => q.status === 'missing'), 'missing verdict must be preserved in guard telemetry')
})

test('mpep-2106-09: denied prompt phrase skipped BUT case-gloss quote stays missing and is de-quoted', () => {
  const { c, audit } = auditStored('mpep-2106-09', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_NEG, 2)])
  assert.ok(audit.spans.some((s) => s.status === 'skipped'), 'denied prompt phrase must be skipped')
  assert.equal(audit.missing.length, 1, 'glossed quote must still report missing')
  assert.ok(audit.missing[0].quote.includes('(Enfish, McRO, Diehr)'), 'missing span must be the case-gloss one')
  const r = finalizeVerifiedAnswer(c.answer, [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_NEG, 2)], { requires_primary_sources: true }, { highRisk: false, prompt: c.prompt })
  assert.doesNotMatch(r.answer, /"\[i\]ntegration/, 'appended-gloss quote must lose quotation marks (fail closed)')
  assert.ok(r.guard.quotes.some((q) => q.status === 'missing'), 'missing verdict must be preserved in guard telemetry')
})

test('mpep-2106b-03 guard: prompt-phrase quote without source support is de-quoted when strictly audited', () => {
  const { c } = auditStored('mpep-2106b-03', [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_NEG, 2)])
  // Without the prompt (strict audit, e.g. API/headless callers) the
  // unsupported phrase must not survive as a verbatim quotation.
  const r = finalizeVerifiedAnswer(c.answer, [rec('mpep', 'MPEP § 2106 (condensed)', MPEP_NEG, 2)], { requires_primary_sources: true }, { highRisk: false })
  assert.doesNotMatch(r.answer, /"well-understood, routine, and conventional activities"/, 'unsupported quote must lose quotation marks (fail closed)')
  assert.ok(r.guard.quotes.some((q) => q.status === 'missing'), 'missing verdict must be preserved in guard telemetry')
})

test('triage completeness: every stored failure instance has coverage in this file', () => {
  const advIds = advRuns.flatMap((r) => r.failures.map((f) => `${r.run_id}:${f.id}`))
  assert.deepEqual(advIds.sort(), [
    '0ec0bd51-44cd-4ffc-9453-ad6b81b61004:adv-ai-quote',
    '126f1b79-c75d-42a5-80e1-e4baf92c5c52:adv-contradict',
    'f916efe7-a598-460c-bf28-a4a1f60c2fbc:adv-ai-quote',
  ].sort())
  assert.equal(v10.cases.length, 24, 'v1.0 corpus must hold 24 cases')
  const covered = new Set([
    's101-04', 's101-07', 's101-08', 's102b-05', 's102b-07', 's103-06', 's103-10',
    's111-09', 's112a-04', 's112a-08', 's112a-09', 's112b-06', 's112d-02', 's112d-04',
    'mpep-2106-01', 'mpep-2106-04', 'mpep-2106-06', 'mpep-2106-07', 'mpep-2106-09',
    'mpep-2106-10', 'mpep-2106b-02', 'mpep-2106b-03', 'mpep-2106b-04', 'mpep-2106b-06',
  ])
  assert.deepEqual([...byKey.keys()].sort(), [...covered].sort(), 'every v1.0 key must be covered above')
})

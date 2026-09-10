import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ABLATION25_TYPES,
  ABLATION25_FROZEN_REFS,
  validateAblation25Case,
  validateAblation25Set,
  computeAblation25Metrics,
  perTypeDetection,
} from '../src/lib/ablation-25.js'
import { simulateAblation, FIXTURE_PASSAGES } from '../src/lib/ablation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

test('13 required types are enumerated', () => {
  assert.equal(ABLATION25_TYPES.length, 13)
  for (const t of ['fake statutes', 'altered quotations', 'valid-citation/wrong-proposition', 'fake trademark decisions', 'unsupported copyright propositions']) {
    assert.ok(ABLATION25_TYPES.includes(t))
  }
})

test('validator rejects bad type / missing synthetic / duplicates frozen', () => {
  assert.equal(validateAblation25Case({ id: 'x', type: 'nope', synthetic: true, fabricated_answer: 'long enough answer text here', ground_truth: 'long enough ground truth note' }).ok, false)
  assert.equal(validateAblation25Case({ id: 'x', type: 'fake cases', synthetic: false, fabricated_answer: 'long enough answer text here', ground_truth: 'long enough ground truth note' }).ok, false)
  assert.equal(validateAblation25Case({ id: 'SYN-GOOD-101', type: 'fake cases', synthetic: true, fabricated_answer: 'long enough answer text here', ground_truth: 'long enough ground truth note' }).ok, true) // single-case ok...
  const set = validateAblation25Set({ cases: [{ id: 'SYN-GOOD-101', type: 'fake cases', synthetic: true, fabricated_answer: 'long enough answer text here', ground_truth: 'long enough ground truth note', substance: { must_contain: [] } }] })
  assert.equal(set.ok, false) // ...but set-level rejects frozen dup + too few + uncovered types
})

test('metrics: perfect guard run gives FDR 1, FPR 0, precision 1, preservation 1', () => {
  const m = computeAblation25Metrics({
    fab: [{ flaggedE: true, entailFail: true, citations: 1, entailFails: 1, executed: true }],
    good: [{ flaggedE: false, executed: true }],
  })
  assert.equal(m.fabrication_detection_rate, 1)
  assert.equal(m.false_positive_rate, 0)
  assert.equal(m.safe_refusal_precision, 1)
  assert.equal(m.useful_answer_preservation, 1)
  assert.equal(m.unsupported_proposition_rate, 1)
  assert.equal(m.execution_completion, 1)
})

test('metrics: empty denominators give null, not NaN', () => {
  const m = computeAblation25Metrics({ fab: [], good: [] })
  assert.equal(m.fabrication_detection_rate, null)
  assert.equal(m.false_positive_rate, null)
  assert.equal(m.safe_refusal_precision, null)
  assert.equal(m.execution_completion, null)
})

test('metrics: false positive degrades precision and preservation', () => {
  const m = computeAblation25Metrics({
    fab: [{ flaggedE: true, entailFail: true, citations: 1, entailFails: 1, executed: true }],
    good: [{ flaggedE: true, executed: true }],
  })
  assert.equal(m.false_positive_rate, 1)
  assert.equal(m.useful_answer_preservation, 0)
  assert.equal(m.safe_refusal_precision, 0.5)
})

test('perTypeDetection aggregates rates', () => {
  const rows = perTypeDetection([
    { type: 'fake cases', flaggedE: true }, { type: 'fake cases', flaggedE: false }, { type: 'fake statutes', flaggedE: true },
  ])
  const fc = rows.find((r) => r.type === 'fake cases')
  assert.equal(fc.total, 2)
  assert.equal(fc.flagged, 1)
  assert.equal(fc.rate, 0.5)
})

test('ablation-25.json: >=19 new, all 13 types, frozen refs not duplicated', async () => {
  const json = JSON.parse(await readFile(path.join(ROOT, 'benchmarks', 'ablation-25.json'), 'utf8'))
  assert.equal(json.meta.synthetic, true)
  const v = validateAblation25Set(json)
  assert.deepEqual(v.errors, [])
  assert.ok(json.cases.length >= 19)
  for (const id of ABLATION25_FROZEN_REFS) {
    assert.ok(!json.cases.some((c) => c.id === id), `duplicates frozen ${id}`)
  }
})

test('ablation-25.json: every new fab passes A (fluent) but is FLAGGED by E', async () => {
  const json = JSON.parse(await readFile(path.join(ROOT, 'benchmarks', 'ablation-25.json'), 'utf8'))
  let flagged = 0
  for (const c of json.cases) {
    const answer = c.fabricated_answer ?? c.answer
    const item = { id: c.id, prompt: c.prompt || c.id, must_contain: c.substance?.must_contain || [], must_contain_any: [] }
    const sim = simulateAblation(answer, item, FIXTURE_PASSAGES)
    assert.equal(sim.A.pass, true, `${c.id} should pass substance (fluent by design)`)
    assert.equal(sim.E.verdict, 'FLAGGED', `${c.id} should be FLAGGED by full pipeline`)
    if (sim.E.verdict === 'FLAGGED') flagged++
  }
  assert.equal(flagged, json.cases.length)
})

test('altered-quotation cases are caught by D with zero false structure', async () => {
  const json = JSON.parse(await readFile(path.join(ROOT, 'benchmarks', 'ablation-25.json'), 'utf8'))
  for (const id of ['A25-F07', 'A25-F08']) {
    const c = json.cases.find((x) => x.id === id)
    const sim = simulateAblation(c.fabricated_answer, { id, prompt: c.prompt, must_contain: c.substance.must_contain, must_contain_any: [] }, FIXTURE_PASSAGES)
    assert.ok(sim.D.missing >= 1, `${id} D should miss`)
    assert.equal(sim.E.verdict, 'FLAGGED')
  }
})

test('contradiction pair yields CONTRADICTS (not merely CONTEXT_ONLY)', async () => {
  const json = JSON.parse(await readFile(path.join(ROOT, 'benchmarks', 'ablation-25.json'), 'utf8'))
  for (const id of ['A25-F14', 'A25-F15']) {
    const c = json.cases.find((x) => x.id === id)
    const sim = simulateAblation(c.fabricated_answer, { id, prompt: c.prompt, must_contain: [], must_contain_any: [] }, FIXTURE_PASSAGES)
    assert.ok(sim.E.entailment.perCitation.some((p) => p.verdict === 'CONTRADICTS'), `${id} should contradict`)
  }
})

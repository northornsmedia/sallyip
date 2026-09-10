import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ABLATION_ITEM_IDS,
  FIXTURE_PASSAGES,
  stripCitationApparatus,
  gradeSubstance,
  extractQuotedSpans,
  citationPresence,
  auditQuotesLocal,
  checkCitedEntailment,
  simulateAblation,
} from '../src/lib/ablation.js'
import { STANFORD_BENCH } from '../scripts/stanford-bench-dataset.mjs'
import { ADV_BENCH } from '../benchmarks/adversarial-v1.mjs'

const BY_ID = new Map([...STANFORD_BENCH, ...ADV_BENCH].map((i) => [i.id, i]))

test('subset references 8 real items from the frozen datasets', () => {
  assert.equal(ABLATION_ITEM_IDS.length, 8)
  for (const id of ABLATION_ITEM_IDS) assert.ok(BY_ID.has(id), `missing ${id}`)
})

test('strip keeps substance words, drops apparatus', () => {
  const out = stripCitationApparatus('Under Section 101, "new and useful process" [S1].')
  assert.ok(out.includes('new and useful process'))
  assert.doesNotMatch(out, /\[S1\]/)
  assert.doesNotMatch(out, /"/)
})

test('gradeSubstance mirrors bench must_contain semantics', () => {
  assert.equal(gradeSubstance('new and useful process, machine, manufacture here', BY_ID.get('stat-101')).pass, true)
  assert.equal(gradeSubstance('something unrelated', BY_ID.get('stat-101')).pass, false)
})

test('extractQuotedSpans finds evidentiary spans only', () => {
  assert.deepEqual(extractQuotedSpans('He said "a person having extraordinary skill in the art" loudly.'), ['a person having extraordinary skill in the art'])
  assert.deepEqual(extractQuotedSpans('says "hi" ok'), [])
})

test('citationPresence separates valid from dangling labels', () => {
  assert.deepEqual(citationPresence('x [S1] y [S9]', 5), { cited: [1, 9], valid: [1], dangling: [9], zeroValid: false })
  assert.equal(citationPresence('x [S9]', 5).zeroValid, true)
})

test('auditQuotesLocal: exact passes, corrupted quote misses', () => {
  const exact = 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.'
  assert.equal(auditQuotesLocal([exact], FIXTURE_PASSAGES)[0].status, 'exact')
  assert.equal(auditQuotesLocal(['a person having extraordinary skill in the art'], FIXTURE_PASSAGES)[0].status, 'missing')
})

test('good fixture is SUPPORTED end to end', () => {
  const sim = simulateAblation(
    'Under 35 U.S.C. Section 101, "Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]',
    BY_ID.get('stat-101'))
  assert.equal(sim.A.pass, true)
  assert.deepEqual(sim.B.valid, [1])
  assert.equal(sim.D.missing, 0)
  assert.equal(sim.E.verdict, 'SUPPORTED')
})

test('plausible-label fabrication passes B but is caught by C-empty and E entailment', () => {
  const sim = simulateAblation(
    'In In re Imaginary Robotics (Fed. Cir. 2025), the court held that AI systems qualify as inventors under Section 101 [S1].',
    BY_ID.get('adv-fake-case'))
  assert.deepEqual(sim.B.valid, [1]) // label counting alone is fooled
  assert.ok(sim.C.guard.dangling.includes(1)) // evidence-starved guard strips it
  assert.ok(sim.E.entailment.failCount >= 1) // passage does not support the holding
  assert.equal(sim.E.verdict, 'FLAGGED')
})

test('bad quote passes A/B/C-evidence but is caught by D', () => {
  const sim = simulateAblation(
    'Under 35 U.S.C. Section 103, a patent may not be obtained if the invention would have been obvious to a person having ordinary skill in the art [S3]. The statute phrases it as "a person having extraordinary skill in the art".',
    BY_ID.get('stat-103'))
  assert.equal(sim.A.pass, true)
  assert.deepEqual(sim.B.valid, [3])
  assert.equal(sim.D.missing, 1)
  assert.equal(sim.E.verdict, 'FLAGGED')
})

test('dangling citation is zero-valid at B and stripped at C', () => {
  const sim = simulateAblation(
    'Under 35 U.S.C. Section 112(g), a dependent claim must recite a new inventive step and cite subsection (g) expressly [S9].',
    BY_ID.get('adv-112g'))
  assert.equal(sim.B.zeroValid, true)
  assert.ok(sim.C.guard.dangling.includes(9))
  assert.doesNotMatch(sim.C.answer, /\[S9\]/)
  assert.equal(sim.E.verdict, 'FLAGGED')
})

test('checkCitedEntailment flags dangling labels as failures', () => {
  const r = checkCitedEntailment('Claim text here [S9].', FIXTURE_PASSAGES)
  assert.equal(r.failCount, 1)
  assert.equal(r.perCitation[0].verdict, 'DANGLING_LABEL')
})

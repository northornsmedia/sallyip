import test from 'node:test'
import assert from 'node:assert/strict'
import { auditAmendment, auditClaims } from '../src/lib/claim-qa-service.js'

const GOOD = `1. A widget comprising: a housing; a sensor disposed in the housing; and a processor configured to read the sensor.
2. The widget of claim 1, wherein the sensor is an optical sensor.
3. The widget of claim 2, further comprising a battery coupled to the processor.`

test('clean claim set passes with zero errors', () => {
  const r = auditClaims(GOOD)
  assert.equal(r.score.errors, 0)
  assert.deepEqual(r.tree, [1])
})

test('missing antecedent is an error with a fix suggestion', () => {
  const r = auditClaims('1. A widget comprising the sensor and the processor.')
  const f = r.findings.find(x => x.check === 'antecedent')
  assert.ok(f && f.severity === 'error')
  assert.match(f.suggestion, /a sensor/)
})

test('inherited antecedents from parents satisfy children', () => {
  const r = auditClaims(GOOD)
  assert.ok(!r.findings.some(x => x.check === 'antecedent'))
})

test('numbering gaps and dangling dependencies are errors', () => {
  const r = auditClaims('1. A widget.\n3. The widget of claim 2, further comprising a lid.')
  assert.ok(r.findings.some(x => x.check === 'numbering'))
  assert.ok(r.findings.some(x => x.check === 'dependency'))
})

test('multiple-dependent form draws a §112(e) warning', () => {
  const r = auditClaims('1. A widget.\n2. A gadget.\n3. The device of claims 1 and 2, further comprising a lid.')
  assert.ok(r.findings.some(x => x.check === 'multiple-dependent'))
})

test('means-plus-function and relative terms warn', () => {
  const r = auditClaims('1. A widget comprising means for fastening, wherein the fastening is substantially permanent.')
  assert.ok(r.findings.some(x => x.check === 'means-plus-function'))
  assert.ok(r.findings.some(x => x.check === 'indefiniteness'))
})

test('near-duplicate terminology warns', () => {
  const r = auditClaims('1. A device comprising an input surface.\n2. The device of claim 1, further comprising an input surfacX.')
  assert.ok(r.findings.some(x => x.check === 'terminology'))
})

test('weak spec support is flagged with closest paragraph', () => {
  const spec = 'The housing contains a sensor mounted on the inner wall of the enclosure for detecting ambient conditions.\n\nThe processor reads sensor values periodically and stores the resulting measurements in memory for later retrieval.'
  const r = auditClaims('1. A widget comprising an adaptive input surface with holographic feedback.', { specText: spec })
  const f = r.findings.find(x => x.check === 'spec-support')
  assert.ok(f)
})

test('amendment review catches new matter and dependency changes', () => {
  const orig = '1. A widget comprising a housing and a sensor.'
  const amended = '1. A widget comprising a housing, a sensor, and an adaptive input surface.\n2. The widget of claims 1 and 2, further comprising a lid.'
  const r = auditAmendment(orig, amended, { specText: 'A widget has a housing and a sensor. The lid attaches on top.' })
  assert.ok(r.findings.some(x => x.check === 'new-matter' && x.severity === 'error'))
  assert.ok(r.added_terms.includes('adaptive input surface'))
})

test('empty input fails closed', () => {
  assert.equal(auditClaims('').score.errors, 1)
  assert.equal(auditClaims('hello world').score.errors, 1)
})

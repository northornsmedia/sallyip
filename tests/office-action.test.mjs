import test from 'node:test'
import assert from 'node:assert/strict'
import { detectRejectionType, parseOaRejections } from '../src/lib/office-action-service.js'

const OA = `Claims 1-3 are rejected under 35 U.S.C. 103 as being unpatentable over Smith (US7654321) in view of Jones.

Smith teaches a widget with a housing and sensor, but does not disclose the optical array.

Claims 4-5 are rejected under 35 U.S.C. 101 as directed to an abstract idea without significantly more.`

test('splits OA text into typed rejections with claims and references', () => {
  const r = parseOaRejections(OA)
  assert.equal(r.length, 2)
  assert.equal(r[0].rejection_type, '103')
  assert.deepEqual(r[0].claim_numbers, [1, 2, 3])
  assert.ok(r[0].references_json.some(x => x.patent_number === 'US7654321'))
  assert.equal(r[1].rejection_type, '101')
  assert.deepEqual(r[1].claim_numbers, [4, 5])
})

test('short text yields no candidates, empty yields none', () => {
  assert.deepEqual(parseOaRejections('ok'), [])
  assert.deepEqual(parseOaRejections(''), [])
})

test('untyped rejection falls back to a single reviewable candidate', () => {
  const r = parseOaRejections('The examiner objects to the drawings. Figure 1 is unclear and should be amended for clarity purposes.')
  assert.equal(r.length, 1)
  assert.equal(r[0].rejection_type, 'other')
})

test('detects 102 and 112 types', () => {
  assert.equal(detectRejectionType('rejected under 35 U.S.C. 102 as anticipated by Doe'), '102')
  assert.equal(detectRejectionType('rejected under 35 U.S.C. 112 for indefiniteness, antecedent basis'), '112')
})

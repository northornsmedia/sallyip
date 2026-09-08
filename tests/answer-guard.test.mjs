import test from 'node:test'
import assert from 'node:assert/strict'
import { guardAnswerCitations } from '../src/lib/verification-service.js'

const evidence = [{ title: 'A' }, { title: 'B' }]

test('valid citations pass without warnings', () => {
  const { answer, guard } = guardAnswerCitations('As shown in [S1] and [S2].', evidence, {})
  assert.deepEqual(guard.valid, [1, 2])
  assert.deepEqual(guard.dangling, [])
  assert.equal(guard.supported, true)
  assert.ok(!answer.includes('Citation check'))
})

test('dangling labels are flagged in the answer', () => {
  const { answer, guard } = guardAnswerCitations('Supported [S1] but invented [S9].', evidence, {})
  assert.deepEqual(guard.dangling, [9])
  assert.equal(guard.supported, false)
  assert.match(answer, /\[S9\] does not match any retrieved source/)
  assert.match(answer, /Supported \[S1\] but invented/)
})

test('uncited legal answers are nudged to pin propositions', () => {
  const { answer, guard } = guardAnswerCitations('The term is twelve months.', evidence, { requires_primary_sources: true })
  assert.equal(guard.supported, false)
  assert.match(answer, /cites no retrieved source/)
})

test('casual answers without evidence pass through untouched', () => {
  const { answer, guard } = guardAnswerCitations('Hello! How can I help?', [], {})
  assert.equal(answer, 'Hello! How can I help?')
  assert.equal(guard.supported, true)
})

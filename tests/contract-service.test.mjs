import test from 'node:test'
import assert from 'node:assert/strict'
import { fillTemplate, flagClause, splitClauses } from '../src/lib/contract-service.js'

test('contract template requires all variables', () => {
  const t = { body_template: 'Between {{party_a}} and {{party_b}}.', variables: ['party_a', 'party_b'] }
  assert.throws(() => fillTemplate(t, { party_a: 'A' }), /party_b/)
  assert.equal(fillTemplate(t, { party_a: 'A', party_b: 'B' }), 'Between A and B.')
})

test('contract risk flags catch uncapped liability', () => {
  assert.equal(flagClause('Liability', 'Liability is unlimited.').risk_level, 'red')
  assert.equal(flagClause('Indemnity', 'Each party shall indemnify the other.').risk_level, 'amber')
  assert.equal(flagClause('Term', 'This agreement lasts 12 months.').risk_level, 'green')
})

test('contract content splits on headings', () => {
  const clauses = splitClauses('# NDA\n\n## 1. Scope\nText\n\n## 2. Term\nMore')
  assert.equal(clauses.length, 2)
  assert.match(clauses[0].heading, /Scope/)
})

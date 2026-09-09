import test from 'node:test'
import assert from 'node:assert/strict'
import { checkEntailment } from '../src/lib/entailment-service.js'

test('entailed proposition with section agreement', () => {
  const r = checkEntailment(
    'Under § 102(b)(1), a disclosure made 1 year or less before filing shall not be prior art.',
    '35 U.S.C. § 102(b)(1) — A disclosure made 1 year or less before the effective filing date shall not be prior art under subsection (a)(1) if made by the inventor.')
  assert.equal(r.verdict, 'ENTAILS')
})

test('section mismatch fails closed', () => {
  const r = checkEntailment(
    'Under § 103, disclosures are prior art.',
    '35 U.S.C. § 102(a) — A person shall be entitled to a patent unless the invention was available to the public.')
  assert.equal(r.verdict, 'DOES_NOT_SUPPORT')
})

test('negation flip surfaces contradiction', () => {
  const r = checkEntailment(
    'A claim is required in a provisional application.',
    'A claim shall not be required in a provisional application under § 111(b).')
  assert.equal(r.verdict, 'CONTRADICTS')
})

test('thin overlap is context only, none is unsupported', () => {
  assert.equal(checkEntailment('Enablement affects widgets, sensors, latency, cost and weight.', 'Enablement requires full clear concise exact terms.').verdict, 'CONTEXT_ONLY')
  assert.equal(checkEntailment('Quantum flux capacitors warp spacetime.', 'Enablement requires full clear concise exact terms.').verdict, 'DOES_NOT_SUPPORT')
})

test('empty inputs fail closed', () => {
  assert.equal(checkEntailment('', 'Some passage content here.').verdict, 'DOES_NOT_SUPPORT')
  assert.equal(checkEntailment('A proposition here.', '').verdict, 'DOES_NOT_SUPPORT')
})

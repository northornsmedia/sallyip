import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyQuote } from '../src/lib/citation-service.js'

test('exact quote matches verbatim passage text', () => {
  assert.equal(verifyQuote('The term is twelve months from signature.', 'twelve months'), 'exact')
})

test('fuzzy quote matches after punctuation normalization', () => {
  assert.equal(verifyQuote('Seller\u2019s liability\u2014uncapped\u2014is excluded.', "seller's liability uncapped is excluded"), 'fuzzy')
})

test('missing quote is reported, short quotes rejected', () => {
  assert.equal(verifyQuote('Twelve months term.', 'ninety days payment'), 'missing')
  assert.throws(() => verifyQuote('abc', 'short'), /at least 8/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyQuote, cleanQuoteText } from '../src/lib/citation-service.js'

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

test('bracketed single-letter alterations verify exact (failures_27 s101-04/s103-06 class)', () => {
  assert.equal(verifyQuote('Whoever invents or discovers any new process.', '[W]hoever invents or discovers'), 'exact')
  assert.equal(verifyQuote('Patentability shall not be negated by the manner in which the invention was made.', '[P]atentability shall not be negated by the manner in which the invention was made'), 'exact')
  assert.equal(verifyQuote('Patentability shall not be negated by the manner in which the invention was made.', '[p]atentability shall not be negated by the manner in which the invention was made'), 'exact')
})

test('citation markers and markdown swept inside a span are cleaned before matching (s101-07 class)', () => {
  assert.equal(cleanQuoteText('subject to the conditions and requirements of this title [S1].'), 'subject to the conditions and requirements of this title')
  assert.equal(verifyQuote('subject to the conditions and requirements of this title.', 'subject to the conditions and requirements of this title [S1].'), 'exact')
  assert.equal(verifyQuote('process, machine, manufacture, or composition of matter.', 'process, machine, **manufacture**, or composition of matter.'), 'exact')
})

test('cleaning never weakens verbatimness: paraphrase still misses', () => {
  assert.equal(verifyQuote('A provisional application shall be regarded as abandoned 12 months after filing.', 'abandoned after five years without conversion'), 'missing')
})

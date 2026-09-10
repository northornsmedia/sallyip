import test from 'node:test'
import assert from 'node:assert/strict'
// Importing the runner must be side-effect free: main() runs only when the
// file is the entry point (see IS_BENCH_MAIN / BENCH_DRY_RUN). Run tests as:
//   BENCH_DRY_RUN=1 node --test tests/bench-inference.test.mjs
import { classifyBenchError, extractScoredIds, filterResumeItems } from '../scripts/stanford-bench-run.mjs'

test('quota: HTTP 429 status classifies as quota', () => {
  assert.equal(classifyBenchError('model 429', 429), 'quota')
  assert.equal(classifyBenchError('anything', 429), 'quota')
})

test('quota: status text and quota keywords classify as quota', () => {
  assert.equal(classifyBenchError('model 429'), 'quota')
  assert.equal(classifyBenchError('quota exceeded for model'), 'quota')
  assert.equal(classifyBenchError('Rate limit reached, retry later'), 'quota')
  assert.equal(classifyBenchError('rate_limit_exceeded'), 'quota')
  assert.equal(classifyBenchError('RESOURCE_EXHAUSTED: quota group'), 'quota')
  assert.equal(classifyBenchError('429 Too Many Requests'), 'quota')
  assert.equal(classifyBenchError('Too many requests, slow down'), 'quota')
})

test('non-quota failures classify as model', () => {
  assert.equal(classifyBenchError('model 500', 500), 'model')
  assert.equal(classifyBenchError('model 401', 401), 'model')
  assert.equal(classifyBenchError('fetch failed'), 'model')
  assert.equal(classifyBenchError('The operation was aborted'), 'model')
  assert.equal(classifyBenchError(''), 'model')
  assert.equal(classifyBenchError(null), 'model')
  assert.equal(classifyBenchError(undefined), 'model')
})

test('resume filter skips already-scored ids and keeps order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(filterResumeItems(items, ['b']).map(i => i.id), ['a', 'c'])
  assert.deepEqual(filterResumeItems(items, []).map(i => i.id), ['a', 'b', 'c'])
  assert.deepEqual(filterResumeItems(items, ['a', 'b', 'c']), [])
})

test('resume filter coerces id types and tolerates empty input', () => {
  const items = [{ id: '1' }, { id: '2' }]
  assert.deepEqual(filterResumeItems(items, [1]).map(i => i.id), ['2'])
  assert.deepEqual(filterResumeItems([], ['1']), [])
  assert.deepEqual(filterResumeItems(null, ['1']), [])
  assert.deepEqual(filterResumeItems(items, null).map(i => i.id), ['1', '2'])
})

test('extractScoredIds reads nested run-metrics shape', () => {
  const metrics = { stanford_bench_v1_automated: { rows: [{ id: 'x' }, { id: 'y', verdict: 'model_error' }] } }
  assert.deepEqual(extractScoredIds(metrics), ['x', 'y'])
})

test('extractScoredIds reads direct rows shape and ignores bad input', () => {
  assert.deepEqual(extractScoredIds({ rows: [{ id: 'a' }] }), ['a'])
  assert.deepEqual(extractScoredIds({}), [])
  assert.deepEqual(extractScoredIds(null), [])
  assert.deepEqual(extractScoredIds({ other: { rows: 'nope' } }), [])
})

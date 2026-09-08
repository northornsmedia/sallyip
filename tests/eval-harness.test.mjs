import test from 'node:test'
import assert from 'node:assert/strict'
import { computeEvalMetrics } from '../src/lib/eval-harness.js'

const mockSql = (tables) => async (strings, ...values) => {
  const q = strings.join('?')
  if (q.includes('answer_citations')) return tables.citations
  if (q.includes('proposition_sources')) return tables.quotes
  if (q.includes('legal_propositions')) return tables.propositions
  if (q.includes('legal_sources')) return tables.sources
  if (q.includes('legal_contract_clauses')) return tables.clauses
  if (q.includes('legal_workflow_runs')) return tables.runs
  throw new Error('unexpected query: ' + q.slice(0, 80))
}

test('eval computes unsupported-citation and verification rates', async () => {
  const sql = mockSql({
    citations: [{ match_status: 'exact', n: 8 }, { match_status: 'missing', n: 2 }],
    quotes: [{ quote_match: 'exact', n: 5 }],
    propositions: [{ verification_status: 'supported', n: 3 }, { verification_status: 'pending', n: 1 }],
    sources: [{ state: 'verified', n: 3 }, { state: 'unverified', n: 7 }],
    clauses: [{ risk_level: 'green', n: 9 }, { risk_level: 'red', n: 1 }],
    runs: [{ status: 'completed', n: 4 }],
  })
  const { metrics, gaps } = await computeEvalMetrics(sql)
  assert.equal(metrics.citations.exact_rate, 80)
  assert.equal(metrics.citations.unsupported_rate, 20)
  assert.equal(metrics.propositions.supported_rate, 75)
  assert.equal(metrics.sources.verified_rate, 30)
  assert.ok(gaps.some(g => g.includes('2 answer citation(s)')))
  assert.ok(gaps.some(g => g.includes('30% of sources')))
})

test('eval handles empty evidence without crashing', async () => {
  const sql = mockSql({ citations: [], quotes: [], propositions: [], sources: [], clauses: [], runs: [] })
  const { metrics, gaps } = await computeEvalMetrics(sql)
  assert.equal(metrics.citations.total, 0)
  assert.equal(metrics.citations.exact_rate, null)
  assert.deepEqual(gaps, [])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { BENCH_TARGETS, computePatentBench } from '../src/lib/patent-bench.js'

test('bench computes rates from audit tables', async () => {
  const mockSql = async (strings) => {
    const q = strings.join('?')
    if (q.includes('answer_citations')) return [{ exact: 8, fuzzy: 1, missing: 1 }]
    if (q.includes('proposition_sources')) return [{ exact: 5, fuzzy: 0, missing: 0 }]
    if (q.includes('contrary_authority_checked')) return [{ supported: 2, total: 3 }]
    if (q.includes('legal_propositions')) return [{ supported: 3, total: 4 }]
    if (q.includes('new_matter')) return [{ total: 2, accepted: 1, new_matter: 1 }]
    if (q.includes('qa_json')) return [{ errors: 3, total: 2 }]
    throw new Error('unexpected: ' + q.slice(0, 60))
  }
  const { metrics } = await computePatentBench(mockSql)
  assert.equal(metrics.citation_accuracy.exact_rate, 80)
  assert.equal(metrics.claim_support_accuracy.verified_rate, 100)
  assert.equal(metrics.amendment_qa.acceptance_rate, 50)
  assert.equal(metrics.amendment_qa.new_matter_rate, 50)
  assert.equal(metrics.amendment_qa.avg_errors_per_amendment, 1.5)
  assert.equal(metrics.coverage_vs_target.office_actions, BENCH_TARGETS.office_actions)
})

test('bench handles empty evidence without crashing', async () => {
  const mockSql = async (strings) => {
    const q = strings.join('?')
    if (q.includes('qa_json')) return [{ errors: 0, total: 0 }]
    if (q.includes('new_matter')) return [{ total: 0, accepted: 0, new_matter: 0 }]
    if (q.includes('contrary')) return [{ supported: 0, total: 0 }]
    return [{ exact: 0, fuzzy: 0, missing: 0, supported: 0, total: 0 }]
  }
  const { metrics } = await computePatentBench(mockSql)
  assert.equal(metrics.citation_accuracy.exact_rate, null)
  assert.equal(metrics.amendment_qa.avg_errors_per_amendment, null)
})

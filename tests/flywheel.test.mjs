import test from 'node:test'
import assert from 'node:assert/strict'
import { exportGroundingPairs, exportRiskPairs, flywheelCounts } from '../src/lib/flywheel-export.js'

test('grounding export emits one JSON object per line', async () => {
  const mockSql = async () => [{ claim: 'X', evidence: 'Y', verdict: 'supports', quote: 'Y', match: 'exact', source_title: 'T', authority_tier: 1 }]
  const out = await exportGroundingPairs(mockSql, 'u1')
  const lines = out.split('\n')
  assert.equal(lines.length, 1)
  assert.equal(JSON.parse(lines[0]).verdict, 'supports')
})

test('risk export preserves risk labels', async () => {
  const mockSql = async () => [{ heading: 'Liability', body: 'Unlimited liability.', risk_level: 'red', note: 'n', contract_type: 'msa' }]
  const out = await exportRiskPairs(mockSql, 'u1')
  assert.equal(JSON.parse(out).risk_level, 'red')
})

test('flywheel counts scope to the requesting user', async () => {
  const seen = []
  const mockSql = async (strings, ...values) => { seen.push(values[0]); return [{ n: 7 }] }
  const counts = await flywheelCounts(mockSql, 'user-9')
  assert.deepEqual(counts, { grounding_pairs: 7, risk_pairs: 7 })
  assert.ok(seen.every(v => v === 'user-9'))
})

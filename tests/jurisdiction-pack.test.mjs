import test from 'node:test'
import assert from 'node:assert/strict'
import { listPacks, packCodesFor } from '../src/lib/jurisdiction-pack-service.js'
import { retrieveHybridEvidence } from '../src/lib/verification-service.js'

test('maps names, codes and aliases to pack codes', () => {
  assert.deepEqual(packCodesFor(['United States']), ['US'])
  assert.deepEqual(packCodesFor(['IN', 'uk']), ['IN', 'GB'])
  assert.deepEqual(packCodesFor(['India', 'India']), ['IN'])
  assert.deepEqual(packCodesFor(['Atlantis']), [])
  assert.deepEqual(packCodesFor([]), [])
})

test('lists packs with authority counts', async () => {
  const mockSql = async () => [{ code: 'US', name: 'United States', authority_count: 4, passage_count: 0 }]
  const { packs } = await listPacks(mockSql)
  assert.equal(packs[0].code, 'US')
})

test('pack passages join results without duplicating matter hits', async () => {
  const packRow = { passage_id: 'pack-1', content: 'Section 101 patentable subject matter', title: '35 U.S.C.', authority_tier: 1, citation: '35 U.S.C. § 101' }
  const mockSql = async (strings) => {
    const q = strings.join('?')
    if (q.includes('jurisdiction_pack')) return [packRow]
    if (q.includes('source_passages')) return [{ passage_id: 'm-1', content: 'twelve months fees matter text here', title: 'Doc', authority_tier: 5 }]
    return []
  }
  const results = await retrieveHybridEvidence(mockSql, 'u1', 'matter-1', 'patentable subject matter invention', { packCodes: ['US'] })
  assert.ok(results.some(r => r.passage_id === 'pack-1' && r.retrieval_channels.includes('pack')))
  assert.ok(results.some(r => r.passage_id === 'm-1'))
})

test('no pack codes means no pack query effect', async () => {
  let packQueried = false
  const mockSql = async (strings) => {
    const q = strings.join('?')
    if (q.includes('jurisdiction_pack')) { packQueried = true; return [] }
    return []
  }
  await retrieveHybridEvidence(mockSql, 'u1', 'matter-1', 'test query here', {})
  assert.equal(packQueried, false)
})

test('extracts section references for direct passage lookup', async () => {
  const { extractSectionRefs } = await import('../src/lib/verification-service.js')
  assert.deepEqual(extractSectionRefs('rejected under 35 U.S.C. 102 as anticipated'), ['102'])
  assert.deepEqual(extractSectionRefs('Under MPEP 2106, is this eligible?'), ['2106'])
  assert.deepEqual(extractSectionRefs('What is a patent?'), [])
})

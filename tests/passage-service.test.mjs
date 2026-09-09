import test from 'node:test'
import assert from 'node:assert/strict'
import { getPassage } from '../src/lib/passage-service.js'

test('returns the passage with its source metadata', async () => {
  const row = { passage_id: 'p1', content: 'Term is twelve months.', title: 'NDA', authority_tier: 5 }
  const mockSql = async () => [row]
  assert.deepEqual(await getPassage(mockSql, 'u1', 'p1'), row)
})

test('rejects passages from other users', async () => {
  const mockSql = async () => []
  await assert.rejects(() => getPassage(mockSql, 'u1', 'p-other'), /not found/)
})

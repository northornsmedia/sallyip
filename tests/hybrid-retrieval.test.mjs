import test from 'node:test'
import assert from 'node:assert/strict'
import {fuseEvidenceResults} from '../src/lib/verification-service.js'

test('hybrid retrieval rewards passages found by lexical and semantic search',()=>{
  const lexical=[{passage_id:'both',authority_tier:2},{passage_id:'lexical',authority_tier:1}]
  const semantic=[{passage_id:'both',authority_tier:2,semantic_similarity:.8},{passage_id:'semantic',authority_tier:1,semantic_similarity:.9}]
  const result=fuseEvidenceResults(lexical,semantic,3)
  assert.equal(result[0].passage_id,'both')
  assert.deepEqual(result[0].retrieval_channels,['lexical','semantic'])
})

test('hybrid retrieval respects result limits',()=>{
  assert.equal(fuseEvidenceResults([{passage_id:'a',authority_tier:1},{passage_id:'b',authority_tier:1}],[],1).length,1)
})

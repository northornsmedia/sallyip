import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeFtoMapping} from '../src/lib/fto-service.js'
test('literal FTO coverage requires every reviewed claim limitation to map',()=>{const result=summarizeFtoMapping([{mapping_status:'mapped',review_status:'accepted'},{mapping_status:'mapped',review_status:'accepted'}]);assert.equal(result.literal_coverage,true);assert.equal(result.supported_noncoverage,false)})
test('one accepted missing limitation supports noncoverage but not literal coverage',()=>{const result=summarizeFtoMapping([{mapping_status:'mapped',review_status:'accepted'},{mapping_status:'missing',review_status:'accepted'}]);assert.equal(result.literal_coverage,false);assert.equal(result.supported_noncoverage,true)})
test('unreviewed mappings never support a claim-level conclusion',()=>{const result=summarizeFtoMapping([{mapping_status:'mapped',review_status:'accepted'},{mapping_status:'missing',review_status:'unreviewed'}]);assert.equal(result.literal_coverage,false);assert.equal(result.supported_noncoverage,false);assert.equal(result.counts.unreviewed,1)})

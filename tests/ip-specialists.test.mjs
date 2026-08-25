import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePatentClaims,buildClaimTree} from '../src/lib/patent-claim-service.js'
import {compareTrademarks} from '../src/lib/trademark-similarity-service.js'

test('parses independent and dependent patent claims into elements and a dependency tree',()=>{
  const claims=parsePatentClaims(`1. A computing device comprising: a processor; a memory; and instructions causing the processor to generate an output.\n2. The device of claim 1, wherein the output is encrypted.\n3. The device of claims 1 and 2, further comprising a network interface.`)
  assert.equal(claims.length,3)
  assert.equal(claims[0].claim_type,'independent')
  assert.deepEqual(claims[1].depends_on,[1])
  assert.deepEqual(claims[2].depends_on,[1,2])
  assert.ok(claims[0].elements.length>=3)
  assert.deepEqual(buildClaimTree(claims)[0].children,[2,3])
})

test('does not mosaic claims or invent dependencies',()=>{
  const claims=parsePatentClaims('1. A chemical composition comprising compound X.\n2. A method for producing compound Y.')
  assert.equal(claims[1].claim_type,'independent')
  assert.deepEqual(claims[1].depends_on,[])
})

test('trademark comparison exposes independent explainable dimensions',()=>{
  const result=compareTrademarks({markA:'SALLY IP',markB:'SALI-IP',classesA:[9,42],classesB:[9],goodsA:'legal artificial intelligence software',goodsB:'downloadable legal software',jurisdiction:'EU'})
  assert.ok(result.visual_score>60)
  assert.ok(result.phonetic_score>60)
  assert.equal(result.factors.class_overlap,50)
  assert.equal(result.factors.screening_only,true)
  assert.equal(result.jurisdiction,'EU')
})

test('screening score does not claim a legal conclusion',()=>{
  const result=compareTrademarks({markA:'ALPHA',markB:'OMEGA',classesA:[25],classesB:[9]})
  assert.equal(result.factors.requires_jurisdiction_specific_legal_analysis,true)
  assert.ok(['limited','low','moderate','high'].includes(result.risk_band))
})

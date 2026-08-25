import test from 'node:test'
import assert from 'node:assert/strict'
import {routeSpecialists} from '../src/lib/specialist-router.js'

test('routes patent FTO through patent, evidence and verification specialists',()=>{
  const route=routeSpecialists('Can we launch Product X in Germany without infringing claim 1?')
  assert.equal(route.task_class,'PATENT_FTO')
  assert.ok(route.specialists.includes('Sally Patents'))
  assert.ok(route.specialists.includes('Sally Evidence'))
  assert.ok(route.specialists.includes('Sally Verification'))
  assert.ok(route.jurisdictions.includes('Germany'))
})

test('routes trademark clearance independently from patent work',()=>{
  const route=routeSpecialists('Run EU trademark clearance and find similar marks in Nice class 9')
  assert.equal(route.task_class,'TRADEMARK_CLEARANCE')
  assert.ok(route.specialists.includes('Sally Trademarks'))
  assert.ok(route.jurisdictions.includes('EU'))
})

test('routes multilingual marks and goods wording through trademark intelligence',()=>{
  const route=routeSpecialists('Translate and transliterate this mark into Arabic, then classify these goods using Nice classification')
  assert.equal(route.task_class,'TRADEMARK_INTELLIGENCE')
  assert.ok(route.specialists.includes('Sally Translation'))
  assert.ok(route.specialists.includes('Sally Evidence'))
  assert.ok(route.specialists.includes('Sally Verification'))
})

test('routes inventive step through claim interpretation and verification',()=>{
  const route=routeSpecialists('Apply the EPO problem-solution approach and could-would test to claim 1')
  assert.equal(route.task_class,'PATENT_INVENTIVE_STEP')
  assert.ok(route.specialists.includes('Sally Claim Interpretation'))
  assert.ok(route.specialists.includes('Sally Verification'))
  assert.ok(route.jurisdictions.includes('EPO'))
})

test('routes novelty through a single-reference patent analysis',()=>{
  const route=routeSpecialists('Does EP123 anticipate every limitation of claim 1 under Article 54 EPC?')
  assert.equal(route.task_class,'PATENT_NOVELTY')
  assert.ok(route.specialists.includes('Sally Claim Interpretation'))
  assert.ok(route.specialists.includes('Sally Evidence'))
  assert.ok(route.jurisdictions.includes('EPO'))
})

test('deep research requires primary and contrary authority searches',()=>{
  const route=routeSpecialists('Assess validity risk',{deepResearch:true,matterJurisdictions:['UPC']})
  assert.equal(route.research_mode,'deep')
  assert.equal(route.requires_primary_sources,true)
  assert.equal(route.requires_contrary_authority,true)
  assert.ok(route.jurisdictions.includes('UPC'))
})

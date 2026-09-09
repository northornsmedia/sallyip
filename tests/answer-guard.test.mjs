import test from 'node:test'
import assert from 'node:assert/strict'
import { blockUnsupportedPropositions, buildPropositionEvidenceGraph, finalizeVerifiedAnswer, gateRetrievedEvidence, guardAnswerCitations, INSUFFICIENT_AUTHORITY_MESSAGE } from '../src/lib/verification-service.js'

const evidence = [{ title: 'A' }, { title: 'B' }]

test('valid citations pass without warnings', () => {
  const { answer, guard } = guardAnswerCitations('As shown in [S1] and [S2].', evidence, {})
  assert.deepEqual(guard.valid, [1, 2])
  assert.deepEqual(guard.dangling, [])
  assert.equal(guard.supported, true)
  assert.ok(!answer.includes('Citation check'))
})

test('dangling labels are removed and the answer is marked unverified', () => {
  const { answer, guard } = guardAnswerCitations('Supported [S1] but invented [S9].', evidence, {})
  assert.deepEqual(guard.dangling, [9])
  assert.equal(guard.supported, false)
  assert.doesNotMatch(answer, /\[S9\]/)
  assert.match(answer, /I could not verify this proposition/)
})

const completeEvidence=[{source_id:'source-1',passage_id:'passage-1',title:'35 U.S.C. 101',authority_tier:1,jurisdiction:'US',content:'Whoever invents or discovers any new and useful process may obtain a patent therefor.'}]

test('high-risk legal answers fail closed without complete primary authority',()=>{
  const result=finalizeVerifiedAnswer('The product does not infringe.',[],{requires_primary_sources:true},{highRisk:true})
  assert.equal(result.answer,INSUFFICIENT_AUTHORITY_MESSAGE)
  assert.equal(result.guard.answer_mode,'RESEARCH_REQUIRED')
})

test('non-exact generated quotations lose quotation marks',()=>{
  const result=finalizeVerifiedAnswer('The statute says "all software is patentable" [S1].',completeEvidence,{requires_primary_sources:true},{highRisk:false})
  assert.doesNotMatch(result.answer,/"all software is patentable"/)
  assert.equal(result.guard.quotes[0].status,'missing')
})

test('retrieval gate accepts relevant complete records and rejects filler',()=>{
  const filler={...completeEvidence[0],passage_id:'passage-2',content:'A recipe for tomato soup.'}
  const results=gateRetrievedEvidence([completeEvidence[0],filler],'What does section 101 say about a useful process?',{allowedJurisdictions:['US']})
  assert.deepEqual(results.map(item=>item.passage_id),['passage-1'])
})

test('uncited legal answers are nudged to pin propositions', () => {
  const { answer, guard } = guardAnswerCitations('The term is twelve months.', evidence, { requires_primary_sources: true })
  assert.equal(guard.supported, false)
  assert.match(answer, /cites no retrieved source/)
})

test('casual answers without evidence pass through untouched', () => {
  const { answer, guard } = guardAnswerCitations('Hello! How can I help?', [], {})
  assert.equal(answer, 'Hello! How can I help?')
  assert.equal(guard.supported, true)
})

test('answer mode derives from evidence signals', async () => {
  const { guard: g1 } = guardAnswerCitations('Hello!', [], {})
  assert.equal(g1.answer_mode, 'CONVERSATIONAL')
  const { guard: g2, answer: a2 } = guardAnswerCitations('The term is twelve months.', [{ title: 'A' }], { requires_primary_sources: true })
  assert.equal(g2.answer_mode, 'RESEARCH REQUIRED')
  assert.match(a2, /RESEARCH REQUIRED/)
  const { guard: g3 } = guardAnswerCitations('As shown in [S1].', [{ title: 'A', verified_at: '2026-01-01' }], { requires_primary_sources: true })
  assert.equal(g3.answer_mode, 'VERIFIED')
  const { guard: g4, answer: a4 } = guardAnswerCitations('As shown in [S1].', [{ title: 'A' }], {})
  assert.equal(g4.answer_mode, 'QUALIFIED')
  assert.match(a4, /QUALIFIED/)
})

test('category E propositions are blocked rather than merely reported',()=>{
  const raw='The statute permits a useful process [S1]. Unicorn patents automatically last forever.'
  const graph=buildPropositionEvidenceGraph(raw,completeEvidence,{requires_primary_sources:true})
  const gated=blockUnsupportedPropositions(raw,graph,{highRisk:true})
  assert.doesNotMatch(gated.output,/Unicorn patents/)
  assert.match(gated.output,/Unverified proposition blocked/)
  assert.ok(gated.blocked>=1)
})

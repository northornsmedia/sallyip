import test from 'node:test'
import assert from 'node:assert/strict'

import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'

test('routing integration: search request enters the #019 one-question workflow', async () => {
  const result = await routeConversationalIntent('Find prior art for my invention.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-prior-art-search-report')
  assert.equal(result.profile.slug, 'patent-prior-art-search-report')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'search_target')
})

test('routing integration: adjacent workflows keep their intents', async () => {
  const cases = [
    ['is my invention novel?', 'patent-novelty-opinion'],
    ['is it patentable?', 'patentability-assessment'],
    ['is this patent invalid?', 'patent-invalidity-opinion'],
    ['can we sell this product?', 'freedom-to-operate-opinion'],
    ['map the whole technology space', 'patent-landscape-report'],
  ]
  for (const [input, family] of cases) {
    const result = await routeConversationalIntent(input, {})
    assert.notEqual(result.document_family, 'patent-prior-art-search-report', input)
  }
})

test('routing integration: confirmed scope produces the evidence-only report', async () => {
  const facts = {
    search_target: 'Optical sensor array v4',
    target_version: 'v4',
    search_modes: ['CLAIM_LEVEL_SEARCH'],
    source_types: ['USPTO', 'EPO'],
    priority_cutoff: '2024-06-01',
    known_references: [],
  }
  const prompt = await routeConversationalIntent('Search patents against Claim 1.', { draftSession: { facts } })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  assert.ok(prompt.pre_analysis_summary.search_target)
  const draft = await routeConversationalIntent('Yes, run the prior-art search report.', { draftSession: { ...prompt.session, analysisConfirmed: true } })
  assert.equal(draft.action, 'DRAFT')
  assert.equal(draft.document_family, 'patent-prior-art-search-report')
  assert.match(draft.draft_plan.content, /# Patent Prior-Art Search Report/)
  assert.ok(!draft.draft_plan.content.toLowerCase().includes('no prior art exists'))
})

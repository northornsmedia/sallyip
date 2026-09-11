import test from 'node:test'
import assert from 'node:assert/strict'

import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'

test('routing integration: landscape request enters the #018 one-question workflow', async () => {
  const result = await routeConversationalIntent('Prepare a patent landscape for AI drug discovery.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-landscape-report')
  assert.equal(result.profile.slug, 'patent-landscape-report')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'technology_scope')
})

test('routing integration: adjacent workflows keep their intents', async () => {
  const cases = [
    ['find prior art against my invention', 'patent-prior-art-search-report'],
    ['is my invention patentable?', 'patentability-assessment'],
    ['do we have FTO?', 'freedom-to-operate-opinion'],
    ['is this patent invalid?', 'patent-invalidity-opinion'],
  ]
  for (const [input, family] of cases) {
    const result = await routeConversationalIntent(input, {})
    assert.notEqual(result.document_family, 'patent-landscape-report', input)
  }
})

test('routing integration: blocking questions hand off to FTO without verdicts', async () => {
  const result = await routeConversationalIntent('Which of these patents block our product?', { draftSession: { documentId: 'patent-landscape-report', facts: { technology_scope: 'AI valves' } } })
  assert.equal(result.action, 'HANDOFF_FTO')
  assert.equal(result.document_family, 'patent-landscape-report')
})

test('routing integration: confirmed corpus produces the evidence-linked report', async () => {
  const facts = {
    technology_scope: 'AI valves',
    jurisdictions: ['US'],
    time_range: '2019-2024 publication year',
    trend_basis: 'PUBLICATION_YEAR',
    workflow_mode: 'TECHNOLOGY_LANDSCAPE',
    corpus_source: 'EXISTING_CORPUS',
    analysis_modes: ['abstracts'],
    existing_corpus: [
      { source_id: 'd1', publication_number: 'US1', jurisdiction: 'US', family_id: 'F1', verified_existence: true, publication_date: '2020-01-01', priority_date: '2019-01-01' },
    ],
  }
  const prompt = await routeConversationalIntent('Show patent trends.', { draftSession: { facts } })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  assert.ok(prompt.pre_analysis_summary.corpus_size >= 1)
  const draft = await routeConversationalIntent('Yes, generate the patent landscape report.', { draftSession: { ...prompt.session, analysisConfirmed: true } })
  assert.equal(draft.action, 'DRAFT')
  assert.equal(draft.document_family, 'patent-landscape-report')
  assert.match(draft.draft_plan.content, /# Patent Landscape Report/)
  assert.ok(!draft.draft_plan.content.toLowerCase().includes('market share'))
})

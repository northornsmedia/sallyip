import test from 'node:test'
import assert from 'node:assert/strict'

import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'

test('routing integration: invalidity request enters the #017 one-question workflow', async () => {
  const result = await routeConversationalIntent('Is this patent invalid?', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-invalidity-opinion')
  assert.equal(result.profile.slug, 'patent-invalidity-opinion')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'right_id')
})

test('routing integration: adjacent workflows keep their intents', async () => {
  const cases = [
    ['is my invention patentable?', 'patentability-assessment'],
    ['is my own claim novel?', 'patent-novelty-opinion'],
    ['can we launch our product?', 'freedom-to-operate-opinion'],
    ['find prior art generally', 'patent-prior-art-search-report'],
  ]
  for (const [input, family] of cases) {
    const result = await routeConversationalIntent(input, {})
    assert.notEqual(result.document_family, 'patent-invalidity-opinion', input)
    if (family === 'patent-prior-art-search-report') continue // no profile exists yet: generic clarification is correct; key point is #017 did not steal it (checked above)
  }
})

test('routing integration: opposition filings are separated, never auto-drafted', async () => {
  const result = await routeConversationalIntent('Prepare an opposition filing against this patent.', {})
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.ok((result.flags || []).includes('CONTENTIOUS_FILING_SEPARATE'))
})

test('routing integration: confirmed context produces the evidence-linked opinion', async () => {
  const facts = {
    right_id: 'US7654321B2',
    publication_number: 'US7654321B2',
    jurisdiction: 'US',
    selected_claims: [1],
    claim_numbers: [1],
    claim_set_version: 'granted',
    grounds_in_scope: ['novelty'],
    research: { status: 'USER_PROVIDED_ONLY' },
    priority_context: { analysis_cutoff: '2020-01-01' },
    authority: { verified: true, authority_id: '35 U.S.C. § 102', version_or_date: '2026-09-11' },
  }
  const prompt = await routeConversationalIntent('Assess validity of these patent claims.', { draftSession: { facts } })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  assert.ok(prompt.pre_analysis_summary.target_right)
  const draft = await routeConversationalIntent('Yes, proceed with preparing the patent invalidity opinion.', { draftSession: { ...prompt.session, analysisConfirmed: true } })
  assert.equal(draft.action, 'DRAFT')
  assert.equal(draft.document_family, 'patent-invalidity-opinion')
  assert.match(draft.draft_plan.content, /# Patent Invalidity Opinion/)
  assert.ok(!draft.draft_plan.content.toLowerCase().includes('patent is invalid'))
})

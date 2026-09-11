import test from 'node:test'
import assert from 'node:assert/strict'

import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'

test('routing integration: chart request enters the #020 one-question workflow', async () => {
  const result = await routeConversationalIntent('Create a claim chart.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-claim-chart')
  assert.equal(result.profile.slug, 'patent-claim-chart')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'claim_selection')
})

test('routing integration: specialist intents route outward, never into #020', async () => {
  const infringement = await routeConversationalIntent('Does Product X infringe Claim 1?', {})
  assert.equal(infringement.action, 'CLARIFICATION_REQUIRED')
  assert.ok((infringement.flags || []).includes('INFRINGEMENT_DETERMINATION_SEPARATE'))
  assert.notEqual(infringement.document_family, 'patent-claim-chart')

  const support = await routeConversationalIntent('Does the specification support this claim?', {})
  assert.equal(support.action, 'CLARIFICATION_REQUIRED')
  assert.equal(support.document_family, 'patent-claim-chart')
  assert.equal(support.chart_purpose, 'CLAIM_SUPPORT_REVIEW')

  const novelty = await routeConversationalIntent('Is Claim 1 novel?', {})
  assert.notEqual(novelty.document_family, 'patent-claim-chart')

  const search = await routeConversationalIntent('Find prior art for Claim 1', {})
  assert.notEqual(search.document_family, 'patent-claim-chart')
})

test('routing integration: confirmed context produces the evidence-only chart', async () => {
  const facts = {
    claim_selection: 'Claim 1 of US7654321B2',
    claim_numbers: [1],
    claims: [{ claim_number: 1, claim_text: '1. A sensor comprising a housing.' }],
    claim_version: 'granted',
    target_source: 'Reference A',
    chart_purpose: 'PRIOR_ART_REVIEW',
    constructions: [],
  }
  const prompt = await routeConversationalIntent('Chart Claim 1.', { draftSession: { facts } })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  const draft = await routeConversationalIntent('Yes, build the patent claim chart.', { draftSession: { ...prompt.session, analysisConfirmed: true } })
  assert.equal(draft.action, 'DRAFT')
  assert.equal(draft.document_family, 'patent-claim-chart')
  assert.match(draft.draft_plan.content, /# Patent Claim Chart/)
  assert.ok(!draft.draft_plan.content.toLowerCase().includes('product infringes'))
  assert.ok(!draft.draft_plan.content.toLowerCase().includes('patent is invalid'))
})

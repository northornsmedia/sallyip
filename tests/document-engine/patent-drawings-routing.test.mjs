import test from 'node:test'
import assert from 'node:assert/strict'

import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'

test('routing integration: drawing instructions enter the #012 one-question workflow', async () => {
  const result = await routeConversationalIntent('Prepare patent drawing instructions.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-drawings-instructions')
  assert.equal(result.profile.slug, 'patent-drawings-instructions')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'figure_one_focus')
})

test('routing integration: formal ornamental views route to design patents, not #012', async () => {
  const result = await routeConversationalIntent('I need seven formal views showing the ornamental design of a new bottle.', {})
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.equal(result.document_family, 'design-patent-application')
  assert.ok((result.flags || []).includes('DESIGN_PATENT_DRAWING_ROUTE'))
})

test('routing integration: actual drawing generation is separated from instructions', async () => {
  const result = await routeConversationalIntent('Generate the actual patent drawing.', {})
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.ok((result.flags || []).includes('ACTUAL_IMAGE_GENERATION_SEPARATE'))
})

test('routing integration: confirmed matter context produces the #012 instruction package', async () => {
  const facts = {
    invention_title: 'Sensing Control Unit',
    invention_type: 'SYSTEM',
    workflow_mode: 'NEW_DRAWING_INSTRUCTIONS',
    jurisdiction_context: 'US',
    figure_one_focus: 'Overall sensing-to-control arrangement',
    components: ['sensing unit', 'processing module', 'output controller'],
    relationships: ['sensing unit communicates input data to processing module'],
  }
  const prompt = await routeConversationalIntent('Prepare patent drawing instructions.', { draftSession: { facts } })
  assert.equal(prompt.action, 'PROMPT_DRAFT_CONFIRMATION')
  const draft = await routeConversationalIntent('Yes, proceed with preparing the patent drawing instructions.', { draftSession: prompt.session })
  assert.equal(draft.action, 'DRAFT')
  assert.equal(draft.document_family, 'patent-drawings-instructions')
  assert.match(draft.draft_plan.content, /PATENT_DRAWINGS_INSTRUCTIONS, not FINAL_DRAWINGS/)
  assert.equal(draft.draft_plan.figure_plan.length, 1)
})


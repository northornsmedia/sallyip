import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluatePatentAbstractInterviewStep,
  extractPatentAbstractMatterFacts,
  detectPatentAbstractMode,
  ABSTRACT_WORKFLOW_MODES,
  ABSTRACT_REVIEW_FLAGS,
} from '../../src/lib/patent-abstract-interview-graph.js'
import {
  assemblePatentAbstract,
  validateAbstractDraft,
  countAbstractWords,
} from '../../src/lib/patent-abstract-service.js'
import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'
import { resolveDocumentFamily, loadDocumentProfile } from '../../src/lib/document-engine.js'
import { assertChatAllowed } from '../../src/lib/provider-policy.js'

test('routing: recognizes Patent Abstract requests', () => {
  const phrases = [
    'draft a patent abstract',
    'write the abstract',
    'prepare the patent abstract',
    'shorten this invention into an abstract',
    'draft an abstract from the specification',
    'draft an abstract from the claims',
    'review my patent abstract',
    'rewrite this patent abstract',
    'make the abstract more concise',
    'prepare a PCT abstract',
    'prepare an EP patent abstract',
  ]
  for (const phrase of phrases) {
    assert.equal(resolveDocumentFamily(phrase), 'patent-abstract', `Expected "${phrase}" to route to patent-abstract`)
  }
})

test('routing: does not send specifications, claims, applications, summaries, or Section 101 inquiries to the abstract', () => {
  for (const phrase of [
    'draft a full patent specification',
    'draft patent claims',
    'draft a PCT application',
    'prepare a patent summary for investors',
    'what is an abstract idea under section 101',
  ]) {
    assert.notEqual(resolveDocumentFamily(phrase), 'patent-abstract', `Expected "${phrase}" not to route to patent-abstract`)
  }
})

test('profile: loads canonical Patent Abstract profile', async () => {
  const profile = await loadDocumentProfile('patent-abstract')
  assert.ok(profile)
  assert.equal(profile.id, 'patent-abstract')
  assert.equal(profile.document_number, '011')
  assert.equal(profile.category, 'IP_INNOVATION')
  assert.equal(profile.subcategory, 'PATENT')
  assert.equal(profile.family, 'PATENT_ABSTRACT')
  assert.equal(profile.jurisdiction, 'MULTI_JURISDICTION')
  assert.equal(profile.jurisdiction_classification, 'CONTEXT_DEPENDENT')
  assert.equal(profile.interview_mode, 'ONE_QUESTION_AT_A_TIME')
  assert.equal(profile.sections.length, 4)
})

test('interview-first: insufficient matter asks exactly one technical-problem question', async () => {
  const result = await routeConversationalIntent('Draft the patent abstract.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-abstract')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'technical_problem')
  assert.match(result.question.question, /core technical problem/i)
})

test('matter context: complete matter goes to readiness review, not redundant questions', async () => {
  const matterContext = {
    matter: { title: 'SmartLens Automated Inspection', client_name: 'VisionTech Inc.', jurisdictions: ['US'] },
    facts: [
      { fact_type: 'inventor', value: 'Jane Smith', confidence: 0.95 },
      { fact_type: 'technical_problem', value: 'Microscopic wafer defects escape conventional optical inspection and reduce semiconductor yield.', confidence: 0.9 },
      { fact_type: 'core_solution', value: 'Multi-spectral cameras acquire defect-sensitive images while a processor generates control signals for inspection handling.', confidence: 0.9 },
      { fact_type: 'principal_components', value: 'Sensor, processor, control-signal generator, and actuator.', confidence: 0.9 },
    ],
  }
  const extracted = extractPatentAbstractMatterFacts(matterContext)
  assert.equal(extracted.status.title, 'KNOWN')
  assert.equal(extracted.status.inventors, 'KNOWN')
  assert.equal(extracted.status.applicant, 'KNOWN')
  assert.equal(extracted.status.jurisdiction_context, 'KNOWN')

  const routed = await routeConversationalIntent('Draft the patent abstract for this matter.', matterContext)
  assert.equal(routed.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.match(routed.message, /Source material/i)
  assert.match(routed.message, /Would you like me to proceed/i)
})

test('turn-taking: answers advance one supported question at a time', () => {
  const step1 = evaluatePatentAbstractInterviewStep({ session: {}, latestMessage: 'Draft the patent abstract.' })
  assert.equal(step1.single_question.field, 'technical_problem')

  const step2 = evaluatePatentAbstractInterviewStep({
    session: step1.session,
    latestMessage: 'Microscopic wafer defects escape conventional optical inspection and reduce yield.',
  })
  assert.equal(step2.single_question.field, 'core_solution')

  const step3 = evaluatePatentAbstractInterviewStep({
    session: step2.session,
    latestMessage: 'A processor analyzes multi-spectral sensor images and generates control signals for actuator handling.',
  })
  assert.equal(step3.single_question.field, 'principal_components')

  const step4 = evaluatePatentAbstractInterviewStep({
    session: step3.session,
    latestMessage: 'Sensor, processor, control-signal generator, and actuator.',
  })
  assert.equal(step4.single_question.field, 'title')

  const step5 = evaluatePatentAbstractInterviewStep({
    session: step4.session,
    latestMessage: 'Wafer Inspection System',
  })
  assert.equal(step5.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.match(step5.message, /Would you like me to proceed/i)
})

test('review mode: supplied abstract is validated, not replaced with invented facts', async () => {
  const matterContext = {
    matter: { title: 'Inspection System', jurisdictions: ['US'] },
    facts: [
      { fact_type: 'specification', value: 'The system comprises a camera and an image processor configured to detect wafer defects.', confidence: 0.9 },
      { fact_type: 'existing_abstract', value: 'The system comprises a camera, an image processor, and LiDAR. The invention is novel and non-obvious.', confidence: 0.9 },
    ],
  }
  const prompt = await routeConversationalIntent('Review my patent abstract.', matterContext)
  assert.equal(prompt.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.equal(detectPatentAbstractMode('Review my patent abstract.'), ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW)

  const draft = evaluatePatentAbstractInterviewStep({ session: prompt.session, latestMessage: 'Yes, proceed with the draft.' })
  assert.equal(draft.action, 'DRAFT')
  assert.ok(draft.draft.flags.includes(ABSTRACT_REVIEW_FLAGS.ABSTRACT_NEW_MATTER_DETECTED))
  assert.ok(!draft.draft.abstractText.includes('LiDAR'))
  assert.ok(!draft.draft.abstractText.includes('novel'))
})

test('shortening mode: preserves supported core architecture', async () => {
  const matterContext = {
    facts: [
      { fact_type: 'specification', value: 'The system comprises a sensor, processor, control-signal generator, and actuator. An optional wireless module may provide remote viewing.', confidence: 0.9 },
      { fact_type: 'existing_abstract', value: 'A wafer inspection system addresses missed microscopic defects. The solution comprises a sensor, processor, control-signal generator, and actuator. An optional wireless module may provide remote viewing in some embodiments. Our revolutionary system dramatically improves inspection.', confidence: 0.9 },
    ],
  }
  const prompt = await routeConversationalIntent('Make the abstract shorter.', matterContext)
  assert.equal(prompt.action, 'PROMPT_DRAFT_CONFIRMATION')
  const draft = evaluatePatentAbstractInterviewStep({ session: prompt.session, latestMessage: 'Yes, proceed with the draft.' })
  assert.equal(draft.draft.workflowMode, ABSTRACT_WORKFLOW_MODES.ABSTRACT_SHORTENING)
  assert.ok(draft.draft.abstractText.includes('sensor'))
  assert.ok(draft.draft.abstractText.includes('actuator'))
  assert.ok(!draft.draft.abstractText.includes('revolutionary'))
})

test('factual discipline: assembly uses supported facts and excludes unsupported effects', () => {
  const assembled = assemblePatentAbstract({
    facts: {
      title: 'Wafer Inspection System',
      technical_problem: 'Microscopic wafer defects escape conventional optical inspection.',
      core_solution: 'A processor analyzes sensor images and generates a control signal for an actuator.',
      principal_components: 'Sensor, processor, control-signal generator, and actuator.',
      technical_effect: 'It works better.',
    },
    specificationText: 'The system comprises a sensor, a processor, a control-signal generator, and an actuator.',
  })
  for (const term of ['sensor', 'processor', 'control', 'actuator']) {
    assert.ok(assembled.abstractText.toLowerCase().includes(term))
  }
  for (const forbidden of ['cloud server', 'AI model', 'wireless network', '40%', 'significantly improves accuracy']) {
    assert.ok(!assembled.abstractText.includes(forbidden))
  }
  const validation = validateAbstractDraft({ abstractText: assembled.abstractText, title: 'Wafer Inspection System', specificationText: 'The system comprises a sensor and processor.' })
  assert.ok(validation.supportMap.sentences.every((sentence) => sentence.status !== 'UNKNOWN' || !sentence.abstract_sentence))
})

test('security: confidential abstract work fails closed without an approved provider', async () => {
  const prompt = await routeConversationalIntent('Draft the patent abstract.', {})
  assert.ok(prompt.session.flags.includes(ABSTRACT_REVIEW_FLAGS.CONFIDENTIAL_MATTER_UNPUBLISHED))
  assert.throws(
    () => assertChatAllowed({ engines: [{ slug: 'example-model:free' }], mode: 'CONFIDENTIAL_IP' }),
    (error) => error?.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE',
  )
})

test('word count: deterministic count does not use an LLM estimate', () => {
  const text = 'A wafer inspection system addresses missed microscopic defects.'
  assert.equal(countAbstractWords(text), countAbstractWords(text))
  assert.equal(countAbstractWords(text), 8)
})

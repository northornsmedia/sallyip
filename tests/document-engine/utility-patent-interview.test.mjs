import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluatePatentInterviewStep,
  extractMatterFacts,
  inferInventionType,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  detectFactCorrection,
  READINESS_STATES,
  REVIEW_FLAGS,
} from '../../src/lib/patent-interview-graph.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  verifyClaimSupport112,
  buildClaimSupportMap,
  PROVENANCE_STATES,
} from '../../src/lib/patent-drafting-service.js'

import {
  assertChatAllowed,
  resolveExecutionMode,
} from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING TESTS
// ============================================================
test('routing: recognizes natural drafting intents for utility-patent-application', () => {
  const utilityPhrases = [
    'draft a utility patent application',
    'prepare a utility patent application',
    'write my patent application',
    'draft my patent',
    'prepare a US patent application',
    'help me patent my invention',
  ]

  for (const phrase of utilityPhrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'utility-patent-application',
      `Expected "${phrase}" to route to utility-patent-application, got "${family}"`
    )
  }
})

test('routing: recognizes non-provisional phrasing as non-provisional-patent-application', () => {
  const nonprovisionalPhrases = [
    'prepare a nonprovisional patent application',
    'draft a non-provisional patent',
    'prepare a non-provisional patent application',
    'file a non-provisional patent',
    'us nonprovisional application',
    '35 usc 111a',
    'section 111a patent application',
    'full patent application',
    'utility nonprovisional',
    'convert provisional to nonprovisional',
  ]

  for (const phrase of nonprovisionalPhrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'non-provisional-patent-application',
      `Expected "${phrase}" to route to non-provisional-patent-application, got "${family}"`
    )
  }
})

test('routing: distinguishes research, novelty, and office action rejections', () => {
  assert.notEqual(resolveDocumentFamily('Find patents about lithium batteries'), 'utility-patent-application')
  assert.notEqual(resolveDocumentFamily('Is this patent novel?'), 'utility-patent-application')
  assert.equal(resolveDocumentFamily('Respond to this 103 rejection'), 'patent-office-action-response')
})

// ============================================================
// 2. INTERVIEW-FIRST & ONE-QUESTION-AT-A-TIME UX
// ============================================================
test('interview-first: "Draft a utility patent application" asks ONE question, does NOT draft', async () => {
  const result = await routeConversationalIntent('Draft a utility patent application.', {})
  assert.equal(result.action, 'ASK_QUESTION', 'Should ask a question first, never start drafting immediately')
  assert.equal(result.drafting_status, 'INFORMATION_GATHERING')
  assert.ok(result.questions, 'Questions array must exist')
  assert.equal(result.questions.length, 1, 'MUST ask strictly ONE question at a time')
  assert.match(result.question.question, /title/i, 'First question should ask for the invention title')
})

test('interview turn-taking: answering question advances to next single question', () => {
  // Step 1: Initial draft request
  const step1 = evaluatePatentInterviewStep({
    session: {},
    latestMessage: 'Draft a utility patent application',
  })
  assert.equal(step1.action, 'ASK_QUESTION')
  assert.equal(step1.single_question.field, 'title')

  // Step 2: User provides title
  const step2 = evaluatePatentInterviewStep({
    session: step1.session,
    latestMessage: 'SmartLens AI Inspection System',
  })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.session.facts.title, 'SmartLens AI Inspection System')
  assert.equal(step2.single_question.field, 'plain_description')

  // Step 3: User provides description & problem
  const step3 = evaluatePatentInterviewStep({
    session: step2.session,
    latestMessage: 'It detects microscopic surface defects in semiconductor wafers using multi-spectral cameras to reduce silicon yield loss.',
  })
  assert.equal(step3.action, 'ASK_QUESTION')
  assert.equal(step3.single_question.field, 'technical_mechanism')
})

// ============================================================
// 3. MATTER CONTEXT FIRST
// ============================================================
test('matter context: skips asking for known facts already in matter', async () => {
  const matterContext = {
    matter: {
      title: 'SmartLens Wafer Scanner',
      client_name: 'VisionTech Inc.',
      jurisdictions: ['US'],
    },
    facts: [
      { fact_type: 'inventor', value: 'Jane Smith', confidence: 0.95 },
    ],
  }

  const { facts, status } = extractMatterFacts(matterContext)
  assert.equal(status.title, 'KNOWN')
  assert.equal(status.applicant, 'KNOWN')
  assert.equal(status.jurisdiction, 'KNOWN')
  assert.equal(status.inventors, 'KNOWN')

  // Router evaluation with pre-populated matter
  const routed = await routeConversationalIntent('Draft the utility patent application for this matter.', matterContext)
  assert.equal(routed.action, 'ASK_QUESTION')
  assert.equal(routed.questions.length, 1)
  // Should NOT ask for title, inventor, applicant, or jurisdiction!
  assert.notEqual(routed.question.field, 'title')
  assert.notEqual(routed.question.field, 'inventors')
  assert.notEqual(routed.question.field, 'applicant')
  assert.notEqual(routed.question.field, 'jurisdiction')
  // Should jump straight to description/problem
  assert.equal(routed.question.field, 'plain_description')
})

// ============================================================
// 4. USER "I DON'T KNOW" & SKIP HANDLING
// ============================================================
test('user says "I don\'t know" / "skip" stores unknown/placeholder without crashing', () => {
  const sessionWithTitleAndDesc = {
    facts: {
      title: 'Ergonomic Tool',
      plain_description: 'A handheld device designed to prevent repetitive strain injuries during assembly line fastening operations.',
      invention_type: 'MECHANICAL',
    },
    currentQuestionId: 'q_drawings_plan',
  }

  const res = evaluatePatentInterviewStep({
    session: sessionWithTitleAndDesc,
    latestMessage: "I don't know yet, can we decide later?",
  })

  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.session.facts.drawings, 'UNKNOWN')
  assert.ok(res.session.placeholders.drawings.includes('NOT PROVIDED'))
})

// ============================================================
// 5. ADAPTIVE BRANCHING (SOFTWARE vs MECHANICAL vs AI/ML)
// ============================================================
test('adaptive branching: software invention asks data flow & algorithm questions', () => {
  const text = 'A distributed cloud database protocol for syncing transactions across edge clusters'
  const type = inferInventionType(text)
  assert.equal(type, 'SOFTWARE')

  const session = {
    facts: { title: 'EdgeSync DB' },
    currentQuestionId: 'q_description_problem',
  }

  const res = evaluatePatentInterviewStep({ session, latestMessage: text })
  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.single_question.field, 'technical_mechanism')
  assert.match(res.single_question.raw_question, /algorithm|data flow|processing pipeline/i)
})

test('adaptive branching: mechanical invention asks physical component & motion questions', () => {
  const text = 'A dual-piston hydraulic clamp with an articulating planetary gear linkage'
  const type = inferInventionType(text)
  assert.equal(type, 'MECHANICAL')

  const session = {
    facts: { title: 'Hydraulic Articulated Clamp' },
    currentQuestionId: 'q_description_problem',
  }

  const res = evaluatePatentInterviewStep({ session, latestMessage: text })
  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.single_question.field, 'technical_mechanism')
  assert.match(res.single_question.raw_question, /mechanically|physical parts interact or move/i)
})

test('adaptive branching: AI/ML invention triggers AI-specific component inquiry', () => {
  const text = 'A neural network architecture using dynamic sparse attention for transformer inference'
  const type = inferInventionType(text)
  assert.equal(type, 'AI_ML')

  const session = {
    facts: {
      title: 'SparseAttentionNet',
      plain_description: text,
      invention_type: 'AI_ML',
    },
    currentQuestionId: 'q_technical_mechanism',
  }

  const res = evaluatePatentInterviewStep({
    session,
    latestMessage: 'Input vectors are routed through a sparse gating network before multi-head attention evaluation.',
  })
  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.single_question.field, 'components')
  assert.match(res.single_question.raw_question, /neural networks|modules|buffers/i)
})

// ============================================================
// 6. INTELLIGENT VAGUE ANSWER FOLLOW-UP
// ============================================================
test('vague answer: triggers single purposeful follow-up question', () => {
  const session = {
    facts: { title: 'Patent Analyzer' },
    currentQuestionId: 'q_description_problem',
  }

  const res = evaluatePatentInterviewStep({
    session,
    latestMessage: 'It makes patents better.',
  })

  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.single_question.is_follow_up, true)
  assert.match(res.single_question.question, /speed, accuracy, search quality/i)
})

// ============================================================
// 7. CONVERSATIONAL CONTINUITY & FACT CORRECTION
// ============================================================
test('conversational continuity: mid-stream correction updates fact without restarting', () => {
  let session = {}

  // Step 1
  let step = evaluatePatentInterviewStep({ session, latestMessage: 'Draft a utility patent application' })
  session = step.session

  // Step 2: Name it SmartLens
  step = evaluatePatentInterviewStep({ session, latestMessage: 'SmartLens' })
  session = step.session
  assert.equal(session.facts.title, 'SmartLens')

  // Step 3: Describe
  step = evaluatePatentInterviewStep({
    session,
    latestMessage: 'It uses machine vision to detect wafer defects on semiconductor fabrication lines.',
  })
  session = step.session

  // Step 4: Technical mechanism
  step = evaluatePatentInterviewStep({
    session,
    latestMessage: 'It uses two cameras capturing darkfield and brightfield illumination simultaneously.',
  })
  session = step.session

  // Step 5: User corrects fact mid-stream
  step = evaluatePatentInterviewStep({
    session,
    latestMessage: 'Actually it can use one or more cameras.',
  })
  session = step.session

  // Previous context preserved and fact updated
  assert.equal(session.facts.title, 'SmartLens')
  assert.ok(session.facts.plain_description.includes('semiconductor'))
  assert.match(session.facts.components || session.facts.technical_mechanism, /can use one or more cameras/i)
})

// ============================================================
// 8. DISCLOSURE TIMING & ATTORNEY REVIEW FLAGS
// ============================================================
test('public disclosure: captures event and flags attorney review without legal conclusion of rights lost', () => {
  const session = {
    facts: {
      title: 'Solar Cell Concentrator',
      plain_description: 'A multi-junction photovoltaic concentrator with integrated micro-lens cooling channels.',
      technical_mechanism: 'Micro-lens arrays focus incident sunlight while fluid channels remove parasitic heat.',
      components: 'Micro-lens array, multi-junction solar cell, cooling manifold.',
    },
    currentQuestionId: 'q_public_disclosures',
  }

  const res = evaluatePatentInterviewStep({
    session,
    latestMessage: 'We demonstrated it publicly six months ago at an academic clean energy expo in Chicago.',
  })

  assert.ok(res.session.flags.includes(REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED))
  assert.ok(Array.isArray(res.session.facts.public_disclosures))
  // Must NOT conclude invalidity or patent rights lost!
  const message = res.message || ''
  assert.ok(!message.includes('patent rights lost'))
  assert.ok(!message.includes('patent is invalid'))
  assert.ok(!message.includes('application impossible'))
})

// ============================================================
// 9. DRAFT READINESS PERMISSION GATE
// ============================================================
test('draft readiness: summarizes facts, flags, and asks affirmative confirmation before drafting', () => {
  const session = {
    facts: {
      title: 'SmartLens Wafer Scanner',
      plain_description: 'An automated machine vision system for semiconductor wafer inspection.',
      technical_mechanism: 'Darkfield laser illumination scatters light off surface particles into a TDI sensor array.',
      components: 'Laser illuminator, TDI line scan camera, FPGA defect classifier, wafer chuck.',
      inventors: ['Jane Smith', 'David Kumar'],
    },
    flags: [REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED],
    currentQuestionId: 'q_inventors',
  }

  const res = evaluatePatentInterviewStep({
    session,
    latestMessage: 'Jane Smith and David Kumar',
  })

  assert.equal(res.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.equal(res.readiness, READINESS_STATES.READY_FOR_FIRST_DRAFT)
  assert.match(res.message, /I have enough information to prepare the first draft/i)
  assert.match(res.message, /Would you like me to proceed/i)
  assert.match(res.message, /SmartLens Wafer Scanner/)
  assert.match(res.message, /Disclosure event noted/i)

  // Affirmative confirmation initiates draft
  const draftRes = evaluatePatentInterviewStep({
    session: res.session,
    latestMessage: 'Yes, proceed with the draft.',
  })
  assert.equal(draftRes.action, 'DRAFT')
  assert.equal(draftRes.drafting_status, 'READY_TO_ASSEMBLE')
})

// ============================================================
// 10. CLAIMS & 35 U.S.C. § 112 CLAIM SUPPORT MAP
// ============================================================
test('claim support: maps limitations to specification and flags unsupported limitations', () => {
  const specText = `
A wafer inspection system comprising an illuminator, a camera, and a defect classifier.
The illuminator directs light onto a semiconductor wafer.
The camera captures an image of the wafer.
The defect classifier processes the captured image.
`
  const claimsText = `
1. A wafer inspection system comprising:
an illuminator configured to illuminate a semiconductor wafer;
a camera positioned to capture an image of the wafer;
a defect classifier configured to detect defects in the wafer; and
a cryogenic helium cooling nozzle configured to cool said camera.
`
  const result = buildClaimSupportMap(claimsText, specText, {
    plain_description: 'Wafer inspection system using illuminator and camera.',
    technical_mechanism: 'Illuminator shines light, camera captures image, classifier finds defects.',
    components: 'Illuminator, camera, defect classifier.',
  })

  assert.ok(result.totalLimitations > 0)
  assert.equal(result.hasUnsupportedLimitations, true)
  // "cryogenic helium cooling nozzle" must be flagged as UNSUPPORTED
  const unsupported = result.supportMap.find((m) => m.limitation.includes('cryogenic'))
  assert.ok(unsupported, 'Expected cryogenic helium cooling nozzle to be in map')
  assert.equal(unsupported.status, 'UNSUPPORTED')
})

// ============================================================
// 11. SECURITY & CONFIDENTIALITY FAIL-CLOSED
// ============================================================
test('security: confidential invention disclosures fail closed and block free unapproved providers', () => {
  const confMode = 'CONFIDENTIAL_IP'
  const freeSpeechModel = 'fish-audio/s2.1-pro-free:free'

  assert.throws(
    () => {
      assertChatAllowed({
        engines: [{ slug: freeSpeechModel, name: 'Free Speech TTS', key: 'OPENROUTER_SPEECH_API_KEY' }],
        mode: confMode,
        env: process.env,
      })
    },
    (err) => err.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE' || /fail-closed/i.test(err.message)
  )
})

// ============================================================
// 12. FACTUAL DISCIPLINE
// ============================================================
test('factual discipline: does not invent unprovided facts, numbers, dates, or parties', () => {
  const step = evaluatePatentInterviewStep({
    session: {
      facts: {
        title: 'Waveguide Resonator',
        plain_description: 'An electromagnetic cavity resonator operating at sub-terahertz frequencies.',
      },
      currentQuestionId: 'q_technical_mechanism',
    },
    latestMessage: 'Resonant standing waves are established in a gold-plated copper cavity.',
  })

  // Verify unspecified fields remain strictly undefined or UNKNOWN - never fabricated!
  const facts = step.session.facts
  assert.equal(facts.inventors, undefined, 'Must not invent inventors')
  assert.equal(facts.applicant, undefined, 'Must not invent applicant')
  assert.equal(facts.priority_claims, undefined, 'Must not invent priority claims')
  assert.equal(facts.public_disclosures, undefined, 'Must not invent public disclosures')
  assert.equal(facts.prior_art, undefined, 'Must not invent prior art')
  assert.equal(facts.application_number, undefined, 'Must not invent application number')
  assert.equal(facts.filing_date, undefined, 'Must not invent filing date')
  assert.equal(facts.experimental_results, undefined, 'Must not invent experimental results')
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateEpInterviewStep,
  extractEpMatterFacts,
  calculateEpFilingDeadline,
  isEpRegionalPhaseFromPctRequest,
  inferEpInventionType,
  detectEpAddedSubjectMatter,
  evaluateEpClaimSupport,
  evaluateEpMultipleIndependentClaims,
  evaluateEpTwoPartClaim,
  assessEpReadiness,
  READINESS_STATES,
  REVIEW_FLAGS,
  PROVENANCE_STATES,
} from '../../src/lib/european-patent-interview-graph.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  assembleEpSpecification,
  formatEpClaims,
  buildEpClaimSupportMap,
  analyzeEpChangeImpact,
} from '../../src/lib/european-patent-drafting-service.js'

import {
  assertChatAllowed,
} from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING & INTENT DISAMBIGUATION
// ============================================================
test('routing: recognizes natural direct European patent application requests', () => {
  const phrases = [
    'draft a European patent application',
    'prepare an EPO patent application',
    'prepare an EP patent application',
    'file a European patent application',
    'draft a patent application for the EPO',
    'prepare a direct European filing',
    'draft the EP application',
  ]

  for (const phrase of phrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'european-patent-application',
      `Expected "${phrase}" to resolve to european-patent-application, got "${family}"`
    )
  }
})

test('routing: does not route non-direct-EP requests here', () => {
  assert.equal(resolveDocumentFamily('Enter Europe from this PCT'), 'national-phase-patent-application')
  assert.equal(resolveDocumentFamily('Draft a PCT application'), 'pct-international-patent-application')
  assert.equal(resolveDocumentFamily('draft a utility patent application'), 'utility-patent-application')
  assert.equal(resolveDocumentFamily('prepare a provisional patent application'), 'provisional-patent-application')
  assert.equal(resolveDocumentFamily('draft a plant patent application'), 'plant-patent-application')
})

test('profile: loads canonical European Patent Application profile', async () => {
  const profile = await loadDocumentProfile('european-patent-application')
  assert.ok(profile)
  assert.equal(profile.id, 'european-patent-application')
  assert.equal(profile.document_number, '008')
  assert.equal(profile.jurisdiction, 'EP')
  assert.equal(profile.authority, 'EPO')
  assert.equal(profile.jurisdiction_classification, 'REGIONAL_PATENT_WORKFLOW')
  assert.equal(profile.status, 'BETA')
  assert.equal(profile.sections.length, 8)
})

// ============================================================
// 2. TEST 51 — ONE QUESTION MODE
// ============================================================
test('Test 51: "Draft a European patent application" asks strictly ONE relevant first question, does NOT immediately draft or dump questionnaire', async () => {
  const result = await routeConversationalIntent('Draft a European patent application.', {})
  assert.equal(result.action, 'ASK_QUESTION', 'Must ask a question first, never draft immediately')
  assert.equal(result.drafting_status, 'INFORMATION_GATHERING')
  assert.ok(result.questions, 'Questions array must be present')
  assert.equal(result.questions.length, 1, 'Must ask strictly ONE question at a time')
  assert.match(result.question.question, /filing directly with the European Patent Office|regional phase from an existing PCT/i)
  assert.equal(result.single_question.field, 'filing_route')
})

test('Test 51b: turn-taking advances one step at a time', () => {
  // Step 1: initial ask
  const step1 = evaluateEpInterviewStep({
    session: {},
    latestMessage: 'Draft a European patent application.',
  })
  assert.equal(step1.action, 'ASK_QUESTION')
  assert.equal(step1.single_question.field, 'filing_route')

  // Step 2: User answers filing route is direct
  const step2 = evaluateEpInterviewStep({
    session: step1.session,
    latestMessage: 'Direct EP filing with the EPO',
  })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.session.facts.filing_route, 'DIRECT_EP_FILING')
  assert.equal(step2.single_question.field, 'priority_status')
})

// ============================================================
// 3. TEST 52 — DIRECT EP VS PCT
// ============================================================
test('Test 52: "We already have a PCT and now want to enter Europe" does NOT continue as direct EP; routes to National Phase target=EP', async () => {
  const msg = 'We already have a PCT and now want to enter Europe.'
  assert.equal(isEpRegionalPhaseFromPctRequest(msg), true)

  const step = evaluateEpInterviewStep({
    session: {},
    latestMessage: msg,
  })
  assert.equal(step.action, 'CLARIFICATION_REQUIRED')
  assert.equal(step.document_family, 'national-phase-patent-application')
  assert.equal(step.jurisdiction, 'EPO')
  assert.match(step.message, /Rule 159 EPC/i)
  assert.ok(step.flags.includes(REVIEW_FLAGS.DIRECT_EP_VS_PCT_CLARIFIED))
})

// ============================================================
// 4. TEST 53 — PRIORITY
// ============================================================
test('Test 53: "We filed a US provisional ten months ago" captures priority context and does not invent number/date', () => {
  const step = evaluateEpInterviewStep({
    session: { facts: { filing_route: 'DIRECT_EP_FILING' } },
    latestMessage: 'We filed a US provisional ten months ago.',
  })
  assert.equal(step.session.facts.priority_status, 'CLAIMS_PRIORITY_TO_US_PROVISIONAL')
  assert.equal(step.session.facts.priority_type, 'CLAIMS_PRIORITY_TO_US_PROVISIONAL')
  assert.equal(step.session.facts.has_priority, true)
  assert.equal(step.session.facts.priority_date, undefined, 'Must not invent priority date')
  assert.equal(step.session.facts.priority_number, undefined, 'Must not invent application number')
})

// ============================================================
// 5. TEST 54 — SOFTWARE / CII
// ============================================================
test('Test 54: "It is AI software that predicts customer churn" triggers CII review and adaptive questions without promising patentability', () => {
  const step = evaluateEpInterviewStep({
    session: { facts: { filing_route: 'DIRECT_EP_FILING' } },
    latestMessage: 'It is AI software that predicts customer churn.',
  })
  assert.equal(step.session.facts.invention_type, 'AI_ML')
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED))
  assert.doesNotMatch(step.message || '', /guaranteed to be patentable|automatically patentable/i)
})

// ============================================================
// 6. TEST 55 — UNSUPPORTED TECHNICAL EFFECT
// ============================================================
test('Test 55: "The invention is faster" without data does not invent quantitative metrics (e.g. 40% CPU reduction)', () => {
  const step = evaluateEpInterviewStep({
    session: { facts: { filing_route: 'DIRECT_EP_FILING', title: 'Data Pipeline' } },
    latestMessage: 'The invention is faster.',
  })
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED))
  assert.doesNotMatch(step.session.facts.technical_effect, /40%|reduces cpu usage by|benchmark proves/i)
})

// ============================================================
// 7. TEST 56 — CLAIM SUPPORT
// ============================================================
test('Test 56: Attempt to add claim feature not found in disclosure is flagged as UNSUPPORTED', () => {
  const disclosure = 'A wireless sensor node comprising an antenna, a microcontroller, and an energy harvesting circuit.'
  const evaluation = evaluateEpClaimSupport({
    specification: disclosure,
    claimFeatures: [
      'an antenna',
      'a cryogenic cooling shroud surrounding the microcontroller',
    ],
  })
  assert.equal(evaluation.allSupported, false)
  assert.equal(evaluation.hasUnsupportedFeatures, true)
  assert.equal(evaluation.features[1].status, 'UNSUPPORTED')
  assert.ok(evaluation.flags.includes(REVIEW_FLAGS.CLAIM_SUPPORT_REVIEW_REQUIRED))
})

// ============================================================
// 8. TEST 57 — TWO-PART CLAIM
// ============================================================
test('Test 57: When closest prior art is unknown, does NOT fabricate prior art to force a two-part claim', () => {
  const evalUnknown = evaluateEpTwoPartClaim({ closestPriorArt: null })
  assert.equal(evalUnknown.twoPartAppropriate, false)
  assert.equal(evalUnknown.preamble, null)
  assert.equal(evalUnknown.format, 'ONE_PART')

  const evalKnown = evaluateEpTwoPartClaim({
    closestPriorArt: 'EP 1 234 567 A1',
    distinguishingFeatures: ['rotary encoder with optical sensor'],
  })
  assert.equal(evalKnown.twoPartAppropriate, true)
  assert.equal(evalKnown.format, 'TWO_PART')
  assert.match(evalKnown.characterisingPortion, /rotary encoder with optical sensor/i)
})

// ============================================================
// 9. TEST 58 — MULTIPLE INDEPENDENT CLAIMS
// ============================================================
test('Test 58: System flags 3 independent apparatus claims under Rule 43(2) EPC review', () => {
  const claims = [
    { number: 1, category: 'apparatus', is_independent: true, text: 'A system for telemetry...' },
    { number: 2, category: 'apparatus', is_independent: true, text: 'An apparatus for sensor telemetry...' },
    { number: 3, category: 'apparatus', is_independent: true, text: 'A device for edge telemetry...' },
  ]
  const result = evaluateEpMultipleIndependentClaims(claims)
  assert.equal(result.allowed, false)
  assert.equal(result.hasExcessIndependentClaims, true)
  assert.ok(result.flags.includes(REVIEW_FLAGS.MULTIPLE_INDEPENDENT_CLAIM_REVIEW_REQUIRED))
  assert.match(result.warning, /Rule 43\(2\) EPC/i)
})

// ============================================================
// 10. TEST 59 — NEW MATTER
// ============================================================
test('Test 59: Adding LiDAR processing to a disclosure that only mentions camera detection flags ADDED_SUBJECT_MATTER_REVIEW_REQUIRED (EPC Art. 123(2))', () => {
  const original = 'The robot navigates using an RGB camera detecting floor markers.'
  const proposed = 'Add LiDAR processing with a 3D time-of-flight laser scanner.'

  const check = detectEpAddedSubjectMatter({
    originalDisclosure: original,
    proposedContent: proposed,
  })
  assert.equal(check.isSupported, false)
  assert.equal(check.supportStatus, 'NEWLY_ADDED')
  assert.ok(check.flags.includes(REVIEW_FLAGS.ADDED_SUBJECT_MATTER_REVIEW_REQUIRED))
  assert.match(check.warning, /Article 123\(2\) EPC/i)
})

// ============================================================
// 11. TEST 60 — PUBLIC DISCLOSURE
// ============================================================
test('Test 60: "We presented the invention publicly last month" captures disclosure and flags novelty review under EPC Art. 54(2) without US grace period assumptions', () => {
  const step = evaluateEpInterviewStep({
    session: { facts: { filing_route: 'DIRECT_EP_FILING' } },
    latestMessage: 'We presented the invention publicly last month.',
  })
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED))
  assert.equal(step.session.facts.public_disclosure.disclosed, true)
  assert.doesNotMatch(step.message || '', /you have a one-year grace period|grace period protects you/i)
})

// ============================================================
// 12. TEST 61 — DEADLINE
// ============================================================
test('Test 61: "What is my EP filing deadline?" with missing priority date does not guess; asks for required date', () => {
  const step = evaluateEpInterviewStep({
    session: { facts: { filing_route: 'DIRECT_EP_FILING' } },
    latestMessage: 'What is my EP filing deadline?',
  })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.equal(step.single_question.field, 'priority_date')
  assert.match(step.message, /cannot be calculated without the verified priority date/i)

  const calcWithDate = calculateEpFilingDeadline('2024-03-01')
  assert.equal(calcWithDate.success, true)
  assert.equal(calcWithDate.calculatedDeadline, '2025-03-01')
  assert.equal(calcWithDate.legal_rule, 'Article 87(1) EPC / Paris Convention Article 4(A)(1)')
})

// ============================================================
// 13. TEST 62 — EXISTING MATTER
// ============================================================
test('Test 62: Pre-existing matter context with known facts does NOT re-ask them', () => {
  const matterContext = {
    matter: {
      title: 'High-Temperature Heat Exchanger',
      applicant_name: 'ThermalWorks AG',
      inventor_names: ['Dr. Klaus Weber'],
      priority_date: '2024-02-15',
      priority_application_number: 'EP24123456.1',
      technical_field: 'Industrial thermal exchange systems',
      technical_disclosure: 'Counterflow heat exchanger with micro-fin tubes',
      drawings: [{ figure_number: 'FIG. 1', description: 'Cross-sectional view' }],
    },
  }

  const extracted = extractEpMatterFacts(matterContext)
  assert.equal(extracted.status.title, 'KNOWN')
  assert.equal(extracted.status.applicants, 'KNOWN')
  assert.equal(extracted.status.inventors, 'KNOWN')
  assert.equal(extracted.status.priority_date, 'KNOWN')
  assert.equal(extracted.status.technical_field, 'KNOWN')
  assert.equal(extracted.status.drawings, 'KNOWN')

  const step = evaluateEpInterviewStep({
    session: { facts: { filing_route: 'DIRECT_EP_FILING' } },
    latestMessage: 'Prepare the EP application',
    matterContext,
  })

  // The step should skip title, priority date, and go straight to problem/solution or claim strategy
  assert.notEqual(step.single_question?.field, 'title')
  assert.notEqual(step.single_question?.field, 'filing_route')
})

// ============================================================
// 14. TEST 63 — EDIT PRESERVATION
// ============================================================
test('Test 63: User manually edits Claim 1; regenerates Background Art; Claim 1 remains unchanged', () => {
  const facts = {
    title: 'Solid State Battery Electrolyte',
    technical_field: 'Electrochemical energy storage',
    technical_problem: 'Dendrite growth in lithium metal batteries',
    technical_solution: 'A ceramic-polymer composite electrolyte membrane',
    technical_effect: 'Suppresses dendrite formation at high current densities',
    claims: [
      { number: 1, text: 'A composite electrolyte membrane comprising 60 wt% LLZO ceramic particles.' },
      { number: 2, text: 'The membrane of claim 1, further comprising a PVDF binder.' },
    ],
  }

  // Initial assembly
  const initialSpec = assembleEpSpecification(facts, {})
  assert.ok(initialSpec.sections.claims.content.includes('60 wt% LLZO'))

  // User manually edits Claim 1
  const customClaim1 = '1. (USER_EDITED) A tailored composite electrolyte membrane comprising precisely 65 wt% LLZO ceramic nano-whiskers.'
  const userEdits = {
    claims: customClaim1 + '\n\n2. The membrane of claim 1, further comprising a PVDF binder.',
  }

  // Regenerate Background Art with updated problem/solution
  facts.technical_problem = 'Dendrite penetration and thermal runaway in lithium cells'
  const regeneratedSpec = assembleEpSpecification(facts, userEdits)

  // Verify Background Art updated and user-edited claims preserved
  assert.ok(regeneratedSpec.sections.background_art.content.includes('Dendrite penetration'))
  assert.equal(regeneratedSpec.sections.claims.content, userEdits.claims)
  assert.equal(regeneratedSpec.sections.claims.provenance, PROVENANCE_STATES.USER_EDITED)
})

// ============================================================
// 15. TEST 64 — CONFIDENTIALITY
// ============================================================
test('Test 64: Unpublished EP invention disclosure is blocked from unapproved/free provider under CONFIDENTIAL_PILOT_BLOCKED', () => {
  const confidentialMatter = {
    matter: {
      id: 'matter-ep-secret-999',
      confidentiality_tier: 'RESTRICTED',
      unpublished_invention: true,
      data_handling_mode: 'ENTERPRISE_PRIVATE',
    },
  }

  assert.throws(
    () => {
      assertChatAllowed({
        provider: 'free_tier_openai',
        model: 'gpt-4o-mini',
        matterContext: confidentialMatter,
      })
    },
    /Confidentiality fail-closed|CONFIDENTIAL_PILOT_BLOCKED|CONFIDENTIAL_IP/
  )
})

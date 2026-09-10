import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluatePctInterviewStep,
  extractPctMatterFacts,
  inferPriorityStatus,
  inferInventionType,
  isGlobalPatentMisconception,
  isNationalPhaseRequest,
  isDeadlineInquiry,
  calculatePctDeadline,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  assessPctReadiness,
  READINESS_STATES,
  REVIEW_FLAGS,
  PROVENANCE_STATES,
} from '../../src/lib/pct-interview-graph.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  formatPctClaims,
  buildPctClaimSupportMap,
  analyzePctChangeImpact,
  assemblePctSpecification,
} from '../../src/lib/pct-drafting-service.js'

import {
  assertChatAllowed,
} from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING & INTENT DISAMBIGUATION
// ============================================================
test('routing: recognizes natural PCT drafting requests', () => {
  const phrases = [
    'draft a PCT application',
    'prepare a PCT patent application',
    'prepare an international patent application',
    'draft an international patent filing',
    'prepare a WIPO PCT application',
    'file internationally under the PCT',
    'convert this patent application into a PCT draft',
    'pct international patent application',
    'pct application',
  ]

  for (const phrase of phrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'pct-international-patent-application',
      `Expected "${phrase}" to resolve to pct-international-patent-application, got "${family}"`
    )
  }
})

test('routing: does NOT route national phase or unrelated requests to PCT initial draft', () => {
  assert.notEqual(resolveDocumentFamily('Do a prior art search'), 'pct-international-patent-application')
  assert.equal(resolveDocumentFamily('Draft a utility patent application'), 'utility-patent-application')
})

// ============================================================
// 2. ONE QUESTION AT A TIME & INTERVIEW-FIRST (TEST 45)
// ============================================================
test('interview-first: "Draft a PCT application" asks strictly ONE question, does NOT draft immediately', async () => {
  const result = await routeConversationalIntent('Draft a PCT application.', {})
  assert.equal(result.action, 'ASK_QUESTION', 'Must ask a question first, never draft immediately')
  assert.equal(result.drafting_status, 'INFORMATION_GATHERING')
  assert.ok(result.questions, 'Questions array must be present')
  assert.equal(result.questions.length, 1, 'Must ask strictly ONE question at a time')
  assert.match(result.question.question, /priority to an earlier patent application/i)
})

test('interview turn-taking: answering question advances to next single question', () => {
  // Step 1: Initial request
  const step1 = evaluatePctInterviewStep({
    session: {},
    latestMessage: 'Draft a PCT application',
  })
  assert.equal(step1.action, 'ASK_QUESTION')
  assert.equal(step1.single_question.field, 'priority_status')

  // Step 2: User provides priority answer
  const step2 = evaluatePctInterviewStep({
    session: step1.session,
    latestMessage: 'This is a first-filing PCT application, no earlier priority.',
  })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.session.facts.priority_status, 'FIRST_FILING_PCT')
  assert.equal(step2.single_question.field, 'title')

  // Step 3: User provides title
  const step3 = evaluatePctInterviewStep({
    session: step2.session,
    latestMessage: 'Zero-Knowledge Recursive SNARK Pipeline',
  })
  assert.equal(step3.action, 'ASK_QUESTION')
  assert.equal(step3.session.facts.title, 'Zero-Knowledge Recursive SNARK Pipeline')
  assert.equal(step3.single_question.field, 'technical_field')
})

// ============================================================
// 3. PRIORITY & SINGLE FOLLOW-UP (TEST 46)
// ============================================================
test('priority: "We filed a US provisional last year" captures fact and asks relevant follow-up without inventing data', () => {
  const session = {
    facts: {},
    currentQuestionId: 'q_priority_status',
  }

  const res = evaluatePctInterviewStep({
    session,
    latestMessage: 'We filed a US provisional last year.',
  })

  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.session.facts.priority_status, 'CLAIMS_PRIORITY_TO_PROVISIONAL')
  assert.equal(res.single_question.field, 'priorities')
  // Must NOT invent application number or date
  assert.ok(!res.session.facts.priorities || res.session.facts.priorities.length === 0)
})

// ============================================================
// 4. MULTIPLE PRIORITIES (TEST 47)
// ============================================================
test('multiple priorities: creates separate records, collects facts one at a time without merging', () => {
  const session = {
    facts: {},
    currentQuestionId: 'q_priority_status',
  }

  // User states multiple applications
  const step1 = evaluatePctInterviewStep({
    session,
    latestMessage: 'We have two earlier applications.',
  })
  assert.equal(step1.session.facts.priority_status, 'CLAIMS_MULTIPLE_PRIORITIES')
  assert.equal(step1.single_question.field, 'priorities')

  // User provides first priority
  const step2 = evaluatePctInterviewStep({
    session: step1.session,
    latestMessage: 'US provisional 63/111,222 filed 2025-01-15',
  })
  assert.equal(step2.session.facts.priorities.length, 1)
  assert.equal(step2.session.facts.priorities[0].application_number, '63/111,222')
  assert.equal(step2.session.facts.priorities[0].filing_date, '2025-01-15')
  assert.equal(step2.session.facts.awaiting_next_priority, true)

  // User provides second priority
  const step3 = evaluatePctInterviewStep({
    session: step2.session,
    latestMessage: 'US provisional 63/333,444 filed 2025-05-20',
  })
  assert.equal(step3.session.facts.priorities.length, 2)
  assert.equal(step3.session.facts.priorities[1].application_number, '63/333,444')
  assert.equal(step3.session.facts.priorities[1].filing_date, '2025-05-20')
  // Separate records, not merged
  assert.notEqual(step3.session.facts.priorities[0].application_number, step3.session.facts.priorities[1].application_number)
})

// ============================================================
// 5. EXISTING MATTER CONTEXT (TEST 48)
// ============================================================
test('matter context: skips asking for known title, inventors, applicant, and priority', async () => {
  const matterContext = {
    matter: {
      title: 'Distributed Autonomous Drone Swarm Architecture',
      client_name: 'SkyGrid Robotics Inc.',
    },
    facts: [
      { fact_type: 'us_provisional_number', value: '63/555,666', filing_date: '2025-02-10' },
      { fact_type: 'inventor', value: ['Dr. Arthur Vance', 'Sarah Jenkins'] },
      { fact_type: 'technical_field', value: 'Autonomous aerial swarm robotics' },
      { fact_type: 'technical_disclosure', value: 'Decentralized consensus across low-power ad-hoc mesh radios.' },
    ],
  }

  const { facts, status } = extractPctMatterFacts(matterContext)
  assert.equal(status.title, 'KNOWN')
  assert.equal(status.applicants, 'KNOWN')
  assert.equal(status.inventors, 'KNOWN')
  assert.equal(status.priorities, 'KNOWN')
  assert.equal(status.technical_field, 'KNOWN')
  assert.equal(status.technical_features, 'KNOWN')

  // In router: should skip priority and title, and ask problem_solution
  const res = await routeConversationalIntent('Prepare the PCT application.', matterContext)
  assert.equal(res.action, 'ASK_QUESTION')
  assert.notEqual(res.question.field, 'priority_status')
  assert.notEqual(res.question.field, 'title')
  assert.equal(res.question.field, 'problem_solution')
})

// ============================================================
// 6. NEW MATTER AFTER PRIORITY (TEST 49)
// ============================================================
test('new matter after priority: detects new technical feature (LiDAR) and flags priority support review', () => {
  const session = {
    facts: {
      title: 'Surface Defect Inspection System',
      priority_status: 'CLAIMS_PRIORITY_TO_PROVISIONAL',
      priorities: [
        {
          priority_id: 'pri_1',
          country_or_office: 'US',
          application_number: '63/123,456',
          filing_date: '2025-01-10',
          raw_input: 'Earlier provisional describes camera defect detection',
        },
      ],
      problem_solution: 'Optical cameras cannot accurately measure trench depth.',
    },
    flags: [],
    currentQuestionId: 'q_technical_features',
  }

  const res = evaluatePctInterviewStep({
    session,
    latestMessage: 'We are now adding LiDAR defect detection and point cloud analysis to the camera pipeline.',
  })

  assert.ok(res.session.flags.includes(REVIEW_FLAGS.PRIORITY_SUPPORT_REVIEW_REQUIRED))
  assert.equal(res.session.facts.priority_support_status, 'PARTIALLY_SUPPORTED')
  assert.match(res.session.facts.new_subject_matter, /lidar/i)
})

// ============================================================
// 7. PCT VS NATIONAL PHASE (TEST 50)
// ============================================================
test('PCT vs national phase: "I need to enter the European phase from my PCT" triggers clarification', async () => {
  const res = await routeConversationalIntent('I need to enter the European phase from my PCT', {})
  assert.equal(res.action, 'CLARIFICATION_REQUIRED')
  assert.ok(res.flags.includes(REVIEW_FLAGS.NATIONAL_PHASE_DISTINCTION_REQUIRED))
  assert.match(res.message, /National or Regional Phase/i)
  assert.match(res.message, /PCT Articles 22 and 39/i)
})

// ============================================================
// 8. GLOBAL PATENT MISCONCEPTION (TEST 51)
// ============================================================
test('global patent misconception: "Will this give me a worldwide patent?" clarifies no worldwide patent exists', async () => {
  const res = await routeConversationalIntent('Will this give me a worldwide patent?', {})
  assert.equal(res.action, 'CLARIFICATION_REQUIRED')
  assert.ok(res.flags.includes(REVIEW_FLAGS.GLOBAL_PATENT_MISCONCEPTION_CLARIFIED))
  assert.match(res.message, /does not grant a worldwide patent/i)
  assert.match(res.message, /National or Regional Phase/i)
})

// ============================================================
// 9. CLAIM SUPPORT MAPPING (TEST 52)
// ============================================================
test('claim support: unsupported claim limitation is flagged as UNSUPPORTED', () => {
  const spec = 'A system processes optical camera sensor inputs to detect defects in manufactured semiconductor wafers.'
  const claim = '1. A method comprising receiving optical camera sensor inputs, detecting defects in manufactured semiconductor wafers, and executing cryogenic superconducting quantum teleportation.'

  const map = buildPctClaimSupportMap(claim, spec)
  assert.equal(map.length, 1)
  const unlim = map[0].limitations.find((l) => l.limitation.includes('cryogenic superconducting quantum teleportation'))
  assert.ok(unlim, 'Limitation must be in map')
  assert.equal(unlim.status, 'UNSUPPORTED')
})

// ============================================================
// 10. BIBLIOGRAPHIC FACTS & NON-INFERENCE (TEST 53)
// ============================================================
test('bibliographic facts: missing applicant nationality marks unknown/placeholder and flags eligibility review', () => {
  const session = {
    facts: {
      title: 'Invention Title',
      priority_status: 'FIRST_FILING_PCT',
      problem_solution: 'A technical problem solved.',
      technical_features: 'Detailed technical features described.',
    },
    flags: [],
    currentQuestionId: 'q_applicants',
  }

  const res = evaluatePctInterviewStep({
    session,
    latestMessage: "I don't know the corporate nationality yet.",
  })

  assert.ok(res.session.flags.includes(REVIEW_FLAGS.PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED))
  assert.ok(res.session.placeholders.applicants.includes('REQUIRED'))
  assert.equal(res.session.facts.applicants[0].nationality, 'UNKNOWN')
})

// ============================================================
// 11. DEADLINE SAFETY & TRACEABILITY (TEST 54)
// ============================================================
test('deadline safety: if priority date unknown, requests date; if known, calculates 12-month deadline with traceable rule', () => {
  // Scenario A: priority date unknown -> does not guess
  const resUnknown = calculatePctDeadline(null)
  assert.equal(resUnknown.success, false)
  assert.equal(resUnknown.error, 'DEADLINE_CALCULATION_CANNOT_PROCEED')

  // Scenario B: priority date verified
  const resKnown = calculatePctDeadline('2025-04-15')
  assert.equal(resKnown.success, true)
  assert.equal(resKnown.pct_filing_deadline, '2026-04-15')
  assert.equal(resKnown.national_phase_deadline_30_months, '2027-10-15')
  assert.equal(resKnown.national_phase_deadline_31_months, '2027-11-15')
  assert.equal(resKnown.verification_status, 'VERIFIED')
  assert.match(resKnown.trace, /Calculated from verified priority date/i)
})

// ============================================================
// 12. EDIT PRESERVATION (TEST 55)
// ============================================================
test('edit preservation: user edits Claim 1, then updates applicant metadata -> Claim 1 remains unchanged', () => {
  const facts = {
    title: 'Adaptive Neural Compression Engine',
    priority_status: 'FIRST_FILING_PCT',
    technical_features: 'Streaming quantization of deep neural weights.',
  }

  const userEditedClaim = '1. A specialized quantum-resistant cryptographic hashing method, comprising: computing SHA-512.'
  const sections = {
    claims: userEditedClaim,
  }

  const doc = assemblePctSpecification(facts, sections)
  assert.ok(doc.includes(userEditedClaim), 'User edited claim must be preserved')

  // Now change applicant metadata
  const changeAnalysis = analyzePctChangeImpact('Acme Corp', 'Global Dynamics Inc')
  assert.ok(!changeAnalysis.affectedSections.includes('claims'), 'Claims section must not be affected by applicant change')
  assert.ok(changeAnalysis.preservedSections.includes('claims'), 'Claims must be preserved')
})

// ============================================================
// 13. DRAFT READINESS PERMISSION GATE
// ============================================================
test('draft readiness: summarizes parameters and flags, asks affirmative confirmation before drafting', () => {
  const session = {
    facts: {
      title: 'Autonomous Mobile Robot Fleet Coordination',
      priority_status: 'CLAIMS_PRIORITY_TO_PROVISIONAL',
      priorities: [
        { country_or_office: 'US', application_number: '63/777,888', filing_date: '2025-03-01' },
      ],
      technical_field: 'Multi-agent robotics and collision avoidance',
      problem_solution: 'High packet loss in ad-hoc peer-to-peer radio meshes causes fleet deadlocks.',
      technical_features: 'Robots compute distributed Voronoi tessellations and negotiate trajectory reservations over asynchronous gossip protocols.',
      applicants: [{ name: 'RoboFleet Inc.', nationality: 'US', residence: 'US' }],
      inventors: [{ name: 'Dr. Jane Smith', nationality: 'US', residence: 'US' }],
    },
    flags: [],
  }

  const res = evaluatePctInterviewStep({
    session,
    latestMessage: 'Yes, proceed with drafting.',
  })

  // First step presents prompt confirmation
  assert.equal(res.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.equal(res.drafting_status, 'CONFIRMATION_REQUIRED')
  assert.match(res.message, /Would you like me to proceed with preparing the draft\?/i)

  // Confirm affirmative answer
  const resDraft = evaluatePctInterviewStep({
    session: res.session,
    latestMessage: 'Yes please proceed',
  })
  assert.equal(resDraft.action, 'DRAFT')
})

// ============================================================
// 14. CHANGE IMPACT ANALYSIS
// ============================================================
test('change impact: priority modification identifies affected sections and preserves others', () => {
  const analysis = analyzePctChangeImpact(
    'Claiming priority to US provisional 63/111,111',
    'The PCT should claim priority to two provisional applications, not one'
  )

  assert.ok(analysis.affectedSections.includes('background_art'))
  assert.ok(analysis.affectedSections.includes('summary_of_invention'))
  assert.ok(analysis.preservedSections.includes('detailed_description'))
  assert.ok(analysis.preservedSections.includes('claims'))
  assert.ok(analysis.preservedSections.includes('brief_description_drawings'))
})

// ============================================================
// 15. CONFIDENTIALITY FAIL-CLOSED (TEST 56)
// ============================================================
test('security: confidential unpublished PCT invention disclosures fail closed and block unapproved models', () => {
  assert.throws(
    () => {
      assertChatAllowed({
        engines: [{ slug: 'fish-audio/s2.1-pro-free:free', name: 'Free TTS', key: 'OPENROUTER_SPEECH_API_KEY' }],
        mode: 'CONFIDENTIAL_IP',
        env: process.env,
      })
    },
    (err) => err.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE' || /fail-closed/i.test(err.message)
  )
})

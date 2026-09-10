import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateInventionDisclosureInterviewStep,
  extractInventionMatterFacts,
  inferInventionDomain,
  detectSourceConflict,
  assessInventionCompleteness,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  READINESS_STATES,
  REVIEW_FLAGS,
  PROVENANCE_STATES,
  LOCK_STATUSES,
  DEVELOPMENT_STATUSES,
  FEATURE_CLASSIFICATIONS,
} from '../../src/lib/invention-disclosure-interview-graph.js'

import {
  assembleInventionDisclosure,
  buildInventionFactGraph,
  exportInventionToDownstreamWorkflow,
  analyzeInventionChangeImpact,
  createInventionVersion,
} from '../../src/lib/invention-disclosure-service.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  assertChatAllowed,
} from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING & INTENT DISAMBIGUATION
// ============================================================
test('routing: recognizes natural invention disclosure intake requests', () => {
  const phrases = [
    'complete an invention disclosure',
    'prepare an invention disclosure form',
    'help me document my invention',
    'capture this invention',
    'prepare an inventor disclosure',
    'turn my notes into an invention disclosure',
    'prepare an invention report',
    'collect information for a patent application',
    'help me describe my invention before filing',
    'invention disclosure form',
    'invention disclosure',
  ]

  for (const phrase of phrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'invention-disclosure-form',
      `Expected "${phrase}" to resolve to invention-disclosure-form, got "${family}"`
    )
  }
})

test('routing: does not route non-disclosure requests to invention disclosure', () => {
  assert.equal(resolveDocumentFamily('draft a patent application'), 'utility-patent-application')
  assert.equal(resolveDocumentFamily('draft a utility patent application'), 'utility-patent-application')
  assert.equal(resolveDocumentFamily('prepare a provisional patent application'), 'provisional-patent-application')
  assert.equal(resolveDocumentFamily('draft a European patent application'), 'european-patent-application')
  assert.equal(resolveDocumentFamily('draft a PCT application'), 'pct-international-patent-application')
})

test('profile: loads canonical Invention Disclosure Form profile', async () => {
  const profile = await loadDocumentProfile('invention-disclosure-form')
  assert.ok(profile)
  assert.equal(profile.id, 'invention-disclosure-form')
  assert.equal(profile.document_number, '013')
  assert.equal(profile.category, 'IP_INNOVATION')
  assert.equal(profile.subcategory, 'PATENT')
  assert.equal(profile.family, 'INVENTION_DISCLOSURE')
  assert.equal(profile.jurisdiction, 'MULTI_JURISDICTION')
  assert.equal(profile.jurisdiction_classification, 'PRE_FILING_INTAKE')
  assert.equal(profile.status, 'BETA')
  assert.equal(profile.sections.length, 30)
})

// ============================================================
// 2. TEST 74 — ONE QUESTION MODE
// ============================================================
test('Test 74: "Help me complete an invention disclosure" asks strictly ONE useful first question, does NOT dump whole form', async () => {
  const result = await routeConversationalIntent('Help me complete an invention disclosure.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.drafting_status, 'INFORMATION_GATHERING')
  assert.ok(result.questions)
  assert.equal(result.questions.length, 1, 'Must ask strictly ONE question at a time')
  assert.match(result.question.question, /what is the invention intended to do|what specific problem/i)
  assert.equal(result.single_question.field, 'problem_need')
})

// ============================================================
// 3. TEST 75 — MATTER CONTEXT
// ============================================================
test('Test 75: Matter already containing title, description, two inventors, prototype notes skips asking for them', () => {
  const matterContext = {
    matter: {
      title: 'Ultrasonic Liquid Level Sensor',
      description: 'A time-of-flight acoustic transducer measuring fluid interface height',
      inventor_names: ['Dr. Aris Thorne', 'Lila Vance'],
      prototype_notes: 'Bench tested in oil reservoir tank',
    },
  }

  const extracted = extractInventionMatterFacts(matterContext)
  assert.equal(extracted.status.invention_title, 'KNOWN')
  assert.equal(extracted.status.technical_description, 'KNOWN')
  assert.equal(extracted.status.potential_inventors, 'KNOWN')
  assert.equal(extracted.status.development_status, 'KNOWN')

  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'Prepare the invention disclosure.',
    matterContext,
  })

  // Should skip asking for title, description, and inventors, moving to problem/solution or operation
  assert.notEqual(step.single_question?.field, 'invention_title')
  assert.notEqual(step.single_question?.field, 'potential_inventors')
})

// ============================================================
// 4. TEST 76 — VAGUE IDEA
// ============================================================
test('Test 76: "It\'s an AI tool for legal work" does not turn into detailed invention; asks targeted task question and flags review', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: "It's an AI tool for legal work.",
  })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.match(step.message, /what specific technical task does the system perform/i)
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED))
})

// ============================================================
// 5. TEST 77 — BUSINESS GOAL VS TECHNICAL PROBLEM
// ============================================================
test('Test 77: "The goal is to increase sales" captures business goal, does not fabricate technical problem, asks for mechanism', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'The goal is to increase sales.',
  })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.equal(step.session.facts.business_goal, 'The goal is to increase sales.')
  assert.match(step.message, /captured business goal/i)
  assert.match(step.message, /what is the specific technical mechanism/i)
})

// ============================================================
// 6. TEST 78 — OPTIONAL FEATURE
// ============================================================
test('Test 78: "The camera is only one possible implementation" classifies camera as OPTIONAL/ALTERNATIVE, not ESSENTIAL', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'The camera is only one possible implementation.',
  })
  assert.ok(step.session.facts.optional_features)
  const cameraFeat = step.session.facts.optional_features.find((f) => /camera/i.test(f.name))
  assert.ok(cameraFeat)
  assert.equal(cameraFeat.classification, FEATURE_CLASSIFICATIONS.OPTIONAL)
  assert.notEqual(cameraFeat.classification, FEATURE_CLASSIFICATIONS.ESSENTIAL)
})

// ============================================================
// 7. TEST 79 — ALTERNATIVES
// ============================================================
test('Test 79: "The system can process locally or on a remote server" captures both embodiments without collapsing', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'The system can process locally or on a remote server.',
  })
  assert.ok(step.session.facts.alternative_embodiments)
  assert.equal(step.session.facts.alternative_embodiments.length, 2)
  assert.ok(step.session.facts.alternative_embodiments.some((e) => /local/i.test(e.name)))
  assert.ok(step.session.facts.alternative_embodiments.some((e) => /remote/i.test(e.name)))
})

// ============================================================
// 8. TEST 80 — EXPERIMENTAL DATA
// ============================================================
test('Test 80: "We have not tested it yet" records NOT_TESTED and does not fabricate test data', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'We have not tested it yet.',
  })
  assert.equal(step.session.facts.experimental_data_status, 'NOT_TESTED')
  assert.equal(step.session.facts.development_status, DEVELOPMENT_STATUSES.CONCEPT_ONLY)
})

// ============================================================
// 9. TEST 81 — INVENTORSHIP
// ============================================================
test('Test 81: "Our CEO approved the project and the engineer designed the algorithm" separates contributions without classifying CEO as inventor', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'Our CEO approved the project and the engineer designed the algorithm.',
  })
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED))
  const ceoEntry = step.session.facts.contribution_matrix.find((c) => c.person === 'CEO')
  const engEntry = step.session.facts.contribution_matrix.find((c) => c.person === 'Lead Engineer')
  assert.equal(ceoEntry.inventive, false)
  assert.equal(engEntry.inventive, true)
})

// ============================================================
// 10. TEST 82 — MULTIPLE INVENTORS
// ============================================================
test('Test 82: Multiple contributors with distinct technical contributions are preserved separately', () => {
  const facts = {
    potential_inventors: [
      { name: 'Alice Wu', role: 'RF Engineer', contribution: 'Designed antenna geometry' },
      { name: 'Bob Taylor', role: 'Software Engineer', contribution: 'Implemented DSP decoding filter' },
      { name: 'Charlie Kim', role: 'Mechanical Designer', contribution: 'Designed waterproof housing' },
    ],
    contribution_matrix: [
      { person: 'Alice Wu', feature: 'Antenna Geometry', inventive: true },
      { person: 'Bob Taylor', feature: 'DSP Filter', inventive: true },
      { person: 'Charlie Kim', feature: 'Enclosure', inventive: true },
    ],
  }
  const graph = buildInventionFactGraph(facts)
  assert.equal(graph.inventors.length, 3)
  assert.equal(graph.contribution_matrix.length, 3)
  assert.equal(graph.inventors[0].name, 'Alice Wu')
  assert.equal(graph.inventors[1].name, 'Bob Taylor')
  assert.equal(graph.inventors[2].name, 'Charlie Kim')
})

// ============================================================
// 11. TEST 83 — OWNERSHIP
// ============================================================
test('Test 83: "The engineer works for Company A" captures employment context and flags OWNERSHIP_REVIEW_REQUIRED without automatic ownership conclusion', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'The engineer works for Company A.',
  })
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.OWNERSHIP_REVIEW_REQUIRED))
  assert.equal(step.session.facts.employment_context, 'The engineer works for Company A.')
})

// ============================================================
// 12. TEST 84 — PUBLIC DISCLOSURE
// ============================================================
test('Test 84: "We demonstrated it at a conference three months ago" creates disclosure event, flags DISCLOSURE_REVIEW_REQUIRED without legal conclusions', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'We demonstrated it at a conference three months ago.',
  })
  assert.ok(step.session.flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED))
  assert.ok(step.session.facts.public_disclosure_history.length > 0)
  assert.equal(step.session.facts.public_disclosure_history[0].confidential, false)
})

// ============================================================
// 13. TEST 85 — NDA DISCLOSURE
// ============================================================
test('Test 85: "We showed it to a manufacturer under an NDA" captures EXTERNAL_CONFIDENTIAL_DISCLOSURE without automatic public disclosure ruling', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'We showed it to a manufacturer under an NDA.',
  })
  assert.ok(step.session.facts.public_disclosure_history.length > 0)
  assert.equal(step.session.facts.public_disclosure_history[0].confidential, true)
  assert.equal(step.session.facts.public_disclosure_history[0].type, 'EXTERNAL_CONFIDENTIAL_DISCLOSURE')
})

// ============================================================
// 14. TEST 86 — PRIOR FILING
// ============================================================
test('Test 86: "We filed a provisional before this" captures record without inventing application number/date', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    latestMessage: 'We filed a provisional before this.',
  })
  assert.ok(step.session.facts.earlier_patent_filings.length > 0)
  assert.equal(step.session.facts.earlier_patent_filings[0].filing_type, 'US_PROVISIONAL')
  assert.equal(step.session.facts.earlier_patent_filings[0].number, undefined, 'Must not invent application number')
})

// ============================================================
// 15. TEST 87 — SOURCE CONFLICT
// ============================================================
test('Test 87: Statement citing three sensors vs document citing two sensors triggers SOURCE_CONFLICT', () => {
  const conflict = detectSourceConflict(
    { text: 'The prototype uses three sensors.', source: 'INVENTOR_STATEMENT' },
    { text: 'The prototype architecture incorporates two sensors connected to ADC.', source: 'UPLOADED_SPECIFICATION' }
  )
  assert.equal(conflict.hasConflict, true)
  assert.equal(conflict.flag, REVIEW_FLAGS.SOURCE_CONFLICT)
  assert.match(conflict.warning, /source conflict detected/i)
})

// ============================================================
// 16. TEST 88 — IMAGE SAFETY
// ============================================================
test('Test 88: Image upload captures visible external features and does not infer hidden electronics', () => {
  const step = evaluateInventionDisclosureInterviewStep({
    session: {},
    attachments: [{ name: 'device_photo.jpg' }],
    latestMessage: 'Here is a photo of the exterior.',
  })
  assert.ok(step.session.facts.image_evidence)
  assert.equal(step.session.facts.image_evidence.internal_inferences_rejected, true)
  assert.equal(step.session.facts.image_evidence.provenance, PROVENANCE_STATES.SOURCE_IMAGE)
})

// ============================================================
// 17. TEST 89 — SKIP
// ============================================================
test('Test 89: Answering "I don\'t know" or "skip" records UNKNOWN and advances without forcing answers', () => {
  assert.equal(isSkipOrUnknown("I don't know"), true)
  assert.equal(isSkipOrUnknown('skip'), true)
  assert.equal(isSkipOrUnknown('not sure'), true)

  const step = evaluateInventionDisclosureInterviewStep({
    session: { currentQuestionId: 'q_development_status' },
    latestMessage: "I don't know",
  })
  assert.equal(step.session.facts.development_status, 'UNKNOWN')
})

// ============================================================
// 18. TEST 90 — DOWNSTREAM HANDOFF
// ============================================================
test('Test 90: Completed disclosure transfers facts cleanly to provisional patent application (Document #002) without re-interviewing', () => {
  const facts = {
    invention_title: 'Ultrasonic Fluid Level Gauge',
    technical_field: 'Acoustic sensing systems',
    problem_need: 'Inaccurate level sensing under turbulent tank sloshing',
    core_inventive_concept: 'Dual acoustic frequency echo-correlation filtering',
    technical_effects: 'Suppresses acoustic surface wave noise by 45%',
    potential_inventors: [{ name: 'Dr. Aris Thorne' }],
    drawing_needs: ['FIG. 1: Transducer placement diagram'],
  }

  const handoff = exportInventionToDownstreamWorkflow(facts, 'provisional-patent-application')
  assert.equal(handoff.target_workflow, 'provisional-patent-application')
  assert.equal(handoff.document_number, '002')
  assert.equal(handoff.readyForDrafting, true)
  assert.equal(handoff.facts.title, 'Ultrasonic Fluid Level Gauge')
  assert.equal(handoff.facts.technical_problem, 'Inaccurate level sensing under turbulent tank sloshing')
  assert.equal(handoff.facts.technical_solution, 'Dual acoustic frequency echo-correlation filtering')
})

// ============================================================
// 19. TEST 91 — CHANGE IMPACT
// ============================================================
test('Test 91: Disclosure update from single sensor to two sensors flags DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED on existing downstream documents', () => {
  const oldFacts = { technical_description: 'A single optical sensor evaluating line scan.' }
  const newFacts = { technical_description: 'Two optical sensors evaluating differential dual-line scan.' }

  const impact = analyzeInventionChangeImpact(oldFacts, newFacts)
  assert.equal(impact.hasImpact, true)
  assert.ok(impact.flags.includes(REVIEW_FLAGS.DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED))
  assert.ok(impact.affectedDownstreamDocuments.includes('provisional-patent-application'))
  assert.ok(impact.affectedDownstreamDocuments.includes('utility-patent-application'))
  assert.ok(impact.affectedDownstreamDocuments.includes('patent-claims-set'))
})

// ============================================================
// 20. TEST 92 — FIELD LOCKING
// ============================================================
test('Test 92: USER_LOCKED inventor list remains protected and unchanged during AI updates', () => {
  const session = {
    facts: {
      invention_title: 'High-Density Battery Pack',
      potential_inventors: [{ name: 'Elena Vance' }, { name: 'Garry Cooper' }],
    },
    locks: {
      potential_inventors: LOCK_STATUSES.USER_LOCKED,
    },
    currentQuestionId: 'q_inventors',
  }

  const step = evaluateInventionDisclosureInterviewStep({
    session,
    latestMessage: 'Change inventors to Alice and Bob.',
  })

  // Locked field remains unchanged
  assert.equal(step.session.facts.potential_inventors.length, 2)
  assert.equal(step.session.facts.potential_inventors[0].name, 'Elena Vance')
  assert.equal(step.session.facts.potential_inventors[1].name, 'Garry Cooper')
})

// ============================================================
// 21. TEST 93 — VERSIONING
// ============================================================
test('Test 93: Adding new embodiment after initial disclosure creates immutable v2 record while preserving v1', () => {
  const v1 = {
    invention_title: 'Smart Thermostat',
    embodiments: ['Local BLE control'],
  }
  const initialHistory = [{ version: 'v1', snapshot: v1, timestamp: '2024-01-01T00:00:00Z' }]

  const v2 = {
    ...v1,
    embodiments: ['Local BLE control', 'Remote cloud Matter protocol control'],
  }

  const result = createInventionVersion(v2, initialHistory, 'Added remote cloud Matter protocol control')
  assert.equal(result.newVersion.version, 'v2')
  assert.equal(result.history.length, 2)
  assert.equal(result.history[0].version, 'v1')
  assert.equal(result.history[0].snapshot.embodiments.length, 1)
  assert.equal(result.history[1].version, 'v2')
  assert.equal(result.history[1].snapshot.embodiments.length, 2)
})

// ============================================================
// 22. TEST 94 — SECURITY
// ============================================================
test('Test 94: Unpublished invention disclosure is blocked from unapproved/free provider under CONFIDENTIAL_PILOT_BLOCKED', () => {
  const confidentialMatter = {
    matter: {
      id: 'matter-disclosure-confidential-013',
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
    /Confidentiality fail-closed|CONFIDENTIAL_PILOT_BLOCKED|CONFIDENTIAL_IP/,
    'Should fail-closed with CONFIDENTIAL_PILOT_BLOCKED when unapproved provider is targeted for confidential invention disclosure'
  )
})

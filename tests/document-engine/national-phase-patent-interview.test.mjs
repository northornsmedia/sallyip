import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateNationalPhaseInterviewStep,
  extractNationalPhaseMatterFacts,
  calculateNationalPhaseDeadline,
  detectAddedSubjectMatter,
  detectMultiJurisdictionRequest,
  isNoPriorPctRequest,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  assessNationalPhaseReadiness,
  SUPPORTED_JURISDICTIONS,
  DEADLINE_RULES,
  READINESS_STATES,
  REVIEW_FLAGS,
  CLAIM_SET_SOURCES,
} from '../../src/lib/national-phase-interview-graph.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  adaptClaimsForJurisdiction,
  generateDifferenceReport,
  createChildWorkflows,
  assembleNationalPhaseFiling,
} from '../../src/lib/national-phase-drafting-service.js'

import {
  assertChatAllowed,
} from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING & INTENT DISAMBIGUATION
// ============================================================
test('routing: recognizes natural national phase entry requests', () => {
  const phrases = [
    'prepare a national phase application',
    'enter national phase',
    'enter the US national phase',
    'enter Europe from this PCT',
    'prepare national phase from PCT',
    'nationalise this PCT application',
    'prepare PCT national phase filing',
    'enter India from this PCT',
    'prepare Canadian national phase',
    'prepare Australian national phase',
  ]

  for (const phrase of phrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'national-phase-patent-application',
      `Expected "${phrase}" to resolve to national-phase-patent-application, got "${family}"`
    )
  }
})

test('routing: does not route non-national-phase patent requests here', () => {
  assert.equal(resolveDocumentFamily('draft a PCT application'), 'pct-international-patent-application')
  assert.equal(resolveDocumentFamily('draft a utility patent application'), 'utility-patent-application')
  assert.equal(resolveDocumentFamily('draft a plant patent application'), 'plant-patent-application')
})

// ============================================================
// 2. TEST 45 — ONE QUESTION MODE
// ============================================================
test('Test 45: "Prepare a national phase application" asks strictly ONE first question, does NOT immediately draft or dump questionnaire', async () => {
  const result = await routeConversationalIntent('Prepare a national phase application.', {})
  assert.equal(result.action, 'ASK_QUESTION', 'Must ask a question first, never draft immediately')
  assert.equal(result.drafting_status, 'INFORMATION_GATHERING')
  assert.ok(result.questions, 'Questions array must be present')
  assert.equal(result.questions.length, 1, 'Must ask strictly ONE question at a time')
  assert.match(result.question.question, /country or regional patent office/i)
})

test('Test 45b: turn-taking advances one step at a time', () => {
  // Turn 1
  const step1 = evaluateNationalPhaseInterviewStep({
    session: {},
    latestMessage: 'Prepare the national phase application',
  })
  assert.equal(step1.action, 'ASK_QUESTION')
  assert.equal(step1.single_question.field, 'target_jurisdiction')

  // Turn 2: User answers target jurisdiction
  const step2 = evaluateNationalPhaseInterviewStep({
    session: step1.session,
    latestMessage: 'We want to enter the US national phase.',
  })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.session.facts.target_jurisdiction, 'US')
  assert.equal(step2.single_question.field, 'pct_application_number')
})

// ============================================================
// 3. TEST 46 — EXISTING TARGET & KNOWN MATTER FACTS
// ============================================================
test('Test 46: Matter context with known target, PCT number, filing date, priority date does NOT re-ask them', async () => {
  const matterContext = {
    matter: {
      jurisdictions: ['US'],
      target_jurisdiction: 'US',
      pct_application_number: 'PCT/US2024/012345',
      international_filing_date: '2024-03-15',
      priority_date: '2023-04-10',
      applicant_name: 'NovaTech LLC',
      inventor_names: ['Dr. Sarah Connor'],
    }
  }

  const result = await routeConversationalIntent('Prepare the national phase.', matterContext)
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.session.facts.target_jurisdiction, 'US')
  assert.equal(result.session.facts.pct_application_number, 'PCT/US2024/012345')
  // Should NOT ask for target jurisdiction or PCT number
  assert.notEqual(result.question.field, 'target_jurisdiction')
  assert.notEqual(result.question.field, 'pct_application_number')
  // Should inquire about claim set or translation or proceed to confirmation
  assert.ok(['claim_set_source', 'translation_status', 'ownership_change'].includes(result.question.field))
})

// ============================================================
// 4. TEST 47 — DEADLINE UNKNOWN
// ============================================================
test('Test 47: Missing priority/filing date yields CANNOT_CALCULATE and does not guess', () => {
  const calc = calculateNationalPhaseDeadline({
    targetJurisdiction: 'US',
    priorityDate: null,
    internationalFilingDate: null,
  })

  assert.equal(calc.deadlineStatus, 'CANNOT_CALCULATE')
  assert.equal(calc.calculatedDeadline, null)
  assert.equal(calc.verificationStatus, 'INSUFFICIENT_DATA')

  // When evaluated in interview step, asks for missing date
  const step = evaluateNationalPhaseInterviewStep({
    session: {
      facts: {
        target_jurisdiction: 'US',
        pct_application_number: 'PCT/US2024/055667',
      }
    },
    latestMessage: 'When is our national phase deadline?',
  })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.match(step.single_question.question, /priority date|international filing date/i)
})

// ============================================================
// 5. TEST 48 — MULTI-JURISDICTION WORKFLOW
// ============================================================
test('Test 48: Multi-jurisdiction request ("enter US, Europe and India") creates separate child workflows', () => {
  const step = evaluateNationalPhaseInterviewStep({
    session: {},
    latestMessage: 'We want to enter US, Europe and India from PCT/US2024/012345 filed 2024-02-01 claiming priority 2023-03-01.',
  })

  assert.ok(step.session.flags.includes('MULTI_JURISDICTION_COORDINATION_REQUIRED'))
  assert.ok(step.child_workflows)
  assert.ok(step.child_workflows['US'])
  assert.ok(step.child_workflows['EPO'])
  assert.ok(step.child_workflows['IN'])

  // Child workflows have their own specific deadlines and rules
  assert.equal(step.child_workflows['US'].deadlineMonths, 30)
  assert.equal(step.child_workflows['EPO'].deadlineMonths, 31)
  assert.equal(step.child_workflows['IN'].deadlineMonths, 31)
  assert.equal(step.child_workflows['US'].deadlineRule, '35 U.S.C. 371(c) / 37 CFR 1.495')
  assert.equal(step.child_workflows['EPO'].deadlineRule, 'EPC Rule 159(1)')
})

// ============================================================
// 6. TEST 49 — PCT VS NATIONAL PHASE (NO PRIOR PCT)
// ============================================================
test('Test 49: "I haven\'t filed a PCT yet but want international protection" clarifies PCT vs National Phase', async () => {
  const result = await routeConversationalIntent("I haven't filed a PCT yet but want international protection.", {})
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.equal(result.document_family, 'pct-international-patent-application')
  assert.ok(result.flags.includes('NO_PRIOR_PCT_CLARIFIED'))
  assert.match(result.message, /requires an existing, filed PCT International Application/i)
})

// ============================================================
// 7. TEST 50 — CLAIM VERSIONING (PCT AS FILED VS ART 19 / 34)
// ============================================================
test('Test 50: Preserves distinct claim set versions and does not silently overwrite', () => {
  const initialSession = {
    facts: {
      target_jurisdiction: 'US',
      pct_application_number: 'PCT/US2024/012345',
      priority_date: '2023-04-10',
      pct_as_filed_claims: '1. An autonomous vehicle sensor array comprising cameras.',
      article_19_claims: '1. An autonomous vehicle sensor array comprising calibrated stereoscopic cameras and neural filters.',
    },
    flags: [],
  }

  const step = evaluateNationalPhaseInterviewStep({
    session: initialSession,
    latestMessage: 'Use our Article 19 amended claims as the starting basis.',
  })

  assert.equal(step.session.facts.claim_set_source, 'ARTICLE_19_AMENDED')
  assert.equal(step.session.facts.pct_as_filed_claims, '1. An autonomous vehicle sensor array comprising cameras.')
  assert.equal(step.session.facts.article_19_claims, '1. An autonomous vehicle sensor array comprising calibrated stereoscopic cameras and neural filters.')
  assert.equal(step.session.facts.selected_claims, step.session.facts.article_19_claims)
})

// ============================================================
// 8. TEST 51 — NEW TECHNICAL FEATURE / NEW MATTER GATE
// ============================================================
test('Test 51: Adding new technical feature not found in PCT triggers NOT_FOUND_IN_PCT and review flag', () => {
  const pctDisclosure = 'The invention provides a camera-based obstacle detection system with an optical sensor and neural processor.'
  
  const result = detectAddedSubjectMatter({
    pctDisclosure,
    proposedChange: 'Add a pulsed solid-state LiDAR sensor to claim 1',
  })

  assert.equal(result.supportStatus, 'NOT_FOUND_IN_PCT')
  assert.ok(result.flags.includes('ADDED_SUBJECT_MATTER_REVIEW_REQUIRED'))
  assert.equal(result.isSupported, false)
  assert.match(result.warning, /New subject matter cannot be introduced/i)
})

test('Test 51b: Supported technical feature found in PCT disclosure passes without new-matter flag', () => {
  const pctDisclosure = 'The invention provides a camera-based obstacle detection system with an optical sensor and neural processor.'
  
  const result = detectAddedSubjectMatter({
    pctDisclosure,
    proposedChange: 'The camera-based obstacle detection system comprising a convolutional neural processor',
  })

  assert.notEqual(result.supportStatus, 'NOT_FOUND_IN_PCT')
  assert.equal(result.flags.includes('ADDED_SUBJECT_MATTER_REVIEW_REQUIRED'), false)
})

// ============================================================
// 9. TEST 52 — TRANSLATION WORKFLOW
// ============================================================
test('Test 52: Foreign language PCT entering US sets MISSING translation and does not fabricate text', () => {
  const step = evaluateNationalPhaseInterviewStep({
    session: {
      facts: {
        target_jurisdiction: 'US',
        pct_application_number: 'PCT/JP2024/099881',
        pct_language: 'ja',
      }
    },
    latestMessage: 'The PCT was filed in Japanese and we do not have an English translation yet.',
  })

  assert.equal(step.session.facts.translation_status, 'MISSING')
  assert.ok(step.session.flags.includes('TRANSLATION_REVIEW_REQUIRED'))
  assert.equal(step.session.facts.translation_text, undefined) // Never fabricated
})

// ============================================================
// 10. TEST 53 — OWNERSHIP CHANGE / ASSIGNMENT
// ============================================================
test('Test 53: Post-filing assignment flags OWNERSHIP_CHAIN_REVIEW_REQUIRED and preserves original applicant', () => {
  const step = evaluateNationalPhaseInterviewStep({
    session: {
      facts: {
        target_jurisdiction: 'US',
        pct_application_number: 'PCT/US2024/011222',
        applicant_name: 'Startup A LLC',
      }
    },
    latestMessage: 'The PCT applicant was Startup A, but the patent was assigned to Company B after filing.',
  })

  assert.equal(step.session.facts.original_applicant, 'Startup A LLC')
  assert.equal(step.session.facts.current_owner, 'Company B')
  assert.ok(step.session.flags.includes('OWNERSHIP_CHAIN_REVIEW_REQUIRED'))
})

// ============================================================
// 11. TEST 54 — INTERNATIONAL OPINION (ISR / WO)
// ============================================================
test('Test 54: ISR / Written Opinion objection captured as drafting consideration, not final invalidity', () => {
  const step = evaluateNationalPhaseInterviewStep({
    session: {
      facts: {
        target_jurisdiction: 'EPO',
        pct_application_number: 'PCT/EP2024/033445',
      }
    },
    latestMessage: 'The Written Opinion of the ISA says Claim 1 lacks inventive step over D1.',
  })

  assert.ok(step.session.facts.isr_objections)
  assert.match(step.session.facts.isr_objections, /lacks inventive step/i)
  assert.ok(step.session.flags.includes('INTERNATIONAL_PHASE_OBJECTIONS_NOTED'))
  // Must NOT assert the claim is invalid
  assert.equal(step.session.facts.claim_invalid, undefined)
})

// ============================================================
// 12. TEST 55 — JURISDICTION SWITCH
// ============================================================
test('Test 55: Switching target jurisdiction from US to CA preserves US child workflow', () => {
  const step = evaluateNationalPhaseInterviewStep({
    session: {
      facts: {
        target_jurisdiction: 'US',
        pct_application_number: 'PCT/US2024/012345',
        priority_date: '2023-04-10',
      },
      child_workflows: {
        'US': { status: 'IN_PROGRESS', deadlineMonths: 30 }
      }
    },
    latestMessage: 'Actually prepare the Canadian filing first.',
  })

  assert.equal(step.session.facts.target_jurisdiction, 'CA')
  assert.ok(step.session.child_workflows['US'], 'Must preserve US workflow')
  assert.ok(step.session.child_workflows['CA'], 'Must create CA workflow')
})

// ============================================================
// 13. TEST 56 — NO INVENTED REQUIREMENTS (UNSUPPORTED JURISDICTION)
// ============================================================
test('Test 56: Unsupported jurisdiction returns RESEARCH_REQUIRED and does not fabricate rules', () => {
  const step = evaluateNationalPhaseInterviewStep({
    session: {},
    latestMessage: 'We want to enter Brazil (BR) from our PCT.',
  })

  assert.equal(step.action, 'CLARIFICATION_REQUIRED')
  assert.equal(step.session.facts.target_jurisdiction, 'BR')
  assert.equal(step.session.facts.jurisdiction_support_status, 'RESEARCH_REQUIRED')
  assert.ok(step.flags.includes('UNSUPPORTED_NATIONAL_JURISDICTION'))
  assert.match(step.message, /RESEARCH_REQUIRED/i)
})

// ============================================================
// 14. TEST 57 — EDIT PRESERVATION
// ============================================================
test('Test 57: Manual edits to national-phase Claim 1 remain preserved when updating metadata', () => {
  const initialSession = {
    facts: {
      target_jurisdiction: 'US',
      pct_application_number: 'PCT/US2024/012345',
      claims: [
        { number: 1, text: '1. (Original) An image sensor.', user_edited: true },
        { number: 2, text: '2. The sensor of claim 1, further comprising a lens.' }
      ],
      applicant_address: '100 Silicon Way, San Jose, CA',
    }
  }

  // Update applicant address
  const step = evaluateNationalPhaseInterviewStep({
    session: initialSession,
    latestMessage: 'Update applicant address to 500 Tech Boulevard, Austin, TX',
  })

  assert.equal(step.session.facts.applicant_address, '500 Tech Boulevard, Austin, TX')
  assert.equal(step.session.facts.claims[0].text, '1. (Original) An image sensor.')
  assert.equal(step.session.facts.claims[0].user_edited, true)
})

// ============================================================
// 15. TEST 58 — SECURITY & CONFIDENTIALITY
// ============================================================
test('Test 58: Confidential national phase matter fails closed against unapproved free providers', () => {
  assert.throws(
    () => {
      assertChatAllowed({
        engines: [{ slug: 'fish-audio/s2.1-pro-free:free', name: 'Free Model' }],
        mode: 'CONFIDENTIAL_IP',
        env: process.env,
      })
    },
    (err) => err.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE' || /fail-closed/i.test(err.message)
  )
})

// ============================================================
// 16. CLAIM ADAPTATION & DIFFERENCE REPORT
// ============================================================
test('claim adaptation: adapts multiple dependencies for US and generates difference report', () => {
  const rawClaims = [
    { number: 1, text: '1. A power management device comprising a buck converter.' },
    { number: 2, text: '2. The device according to claim 1, wherein the converter operates at 2 MHz.' },
    { number: 3, text: '3. The device according to claim 1 or claim 2, further comprising a heat pipe.' }
  ]

  const adapted = adaptClaimsForJurisdiction({ claims: rawClaims, jurisdiction: 'US' })
  assert.equal(adapted.jurisdiction, 'US')
  assert.equal(adapted.adaptedClaims.length, 3)
  // US adaptation flags multiple dependency for claim 3
  assert.match(adapted.adaptedClaims[2].text, /claim 1 or claim 2/i)
  assert.ok(adapted.notes.some((n) => n.toLowerCase().includes('multiple dependencies')))

  const diffReport = generateDifferenceReport({
    originalClaims: rawClaims,
    adaptedClaims: adapted.adaptedClaims,
    jurisdiction: 'US',
  })

  assert.equal(diffReport.jurisdiction, 'US')
  assert.ok(diffReport.changes.length >= 3)
  assert.ok(diffReport.changes.some((c) => c.change_type === 'CLAIM_AMENDMENT' || c.change_type === 'UNCHANGED'))
})

// ============================================================
// 17. DRAFT READINESS PERMISSION GATE
// ============================================================
test('draft readiness gate: prompts for confirmation and drafts only after affirmative confirmation', () => {
  const readySession = {
    facts: {
      target_jurisdiction: 'US',
      pct_application_number: 'PCT/US2024/012345',
      international_filing_date: '2024-03-15',
      priority_date: '2023-04-10',
      claim_set_source: 'PCT_AS_FILED',
      title: 'Neural Quantization Accelerator',
      claims: '1. A neural accelerator comprising systolic processing units.',
      applicants: [{ name: 'Apex AI Inc.', residence: 'US' }],
      inventors: [{ name: 'Dr. Jane Doe', residence: 'US' }],
    },
  }

  // Prompt confirmation
  const promptStep = evaluateNationalPhaseInterviewStep({
    session: readySession,
    latestMessage: 'Check readiness',
  })
  assert.equal(promptStep.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.match(promptStep.message, /Would you like me to proceed/i)

  // Affirmative confirmation leads to draft
  const draftStep = evaluateNationalPhaseInterviewStep({
    session: promptStep.session,
    latestMessage: 'Yes, proceed with preparing the draft.',
  })
  assert.equal(draftStep.action, 'DRAFT')
  assert.ok(draftStep.facts)
})

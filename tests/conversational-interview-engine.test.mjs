import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FACT_STATUSES,
  SOURCE_TYPES,
  QUESTION_STATES,
  DOCUMENT_INTERVIEW_PROFILES,
  createInterviewSession,
  setFactInSession,
  selectNextQuestion,
  parseVoluntaryFacts,
  detectCorrection,
  isSkipOrUnknown,
  isForceDraftCommand,
  attemptSourceRetrieval,
  processInterviewTurn,
  normalizeJurisdiction,
  getOfficeDisplayName
} from '../src/lib/conversational-interview-engine.js'

import {
  identifyDocument,
  extractSlots,
  evaluateIntakePhase,
  generateStatutoryDocument,
  isolateWorkflowMessages
} from '../src/lib/document-intake-coordinator.js'

test('Conversational Engine: Full turn-by-turn ChatGPT-style flow for #007', () => {
  const profile = DOCUMENT_INTERVIEW_PROFILES['national-phase-patent-application']
  assert.ok(profile, 'National Phase profile must exist')

  let session = createInterviewSession('national-phase-patent-application')
  assert.equal(session.state, QUESTION_STATES.INTERVIEW_NOT_STARTED)

  // Turn 1: User says "Draft a National Phase Patent Application"
  const turn1 = processInterviewTurn({
    session,
    userMessage: 'Draft a National Phase Patent Application',
    documentId: 'national-phase-patent-application'
  })
  session = turn1.session
  assert.equal(turn1.readyToDraft, false)
  assert.ok(turn1.responseMarkdown.includes('I can prepare the National Phase Patent Application'))
  assert.ok(turn1.responseMarkdown.includes('Please provide the PCT International Application Number'))
  assert.equal(session.lastAskedQuestionId, 'pct_number')

  // Turn 2: User provides PCT number
  const turn2 = processInterviewTurn({
    session,
    userMessage: 'PCT/US2023/012345',
    documentId: 'national-phase-patent-application'
  })
  session = turn2.session
  assert.equal(turn2.readyToDraft, false)
  assert.ok(turn2.responseMarkdown.includes('✓ Recorded: PCT International Application Number: PCT/US2023/012345.'))
  assert.ok(turn2.responseMarkdown.includes('What is the target national or regional office for this national-phase entry?'))
  assert.equal(session.facts.pct_number.value, 'PCT/US2023/012345')
  assert.equal(session.lastAskedQuestionId, 'target_jurisdiction')

  // Turn 3: User provides target office "USPTO"
  const turn3 = processInterviewTurn({
    session,
    userMessage: 'USPTO',
    documentId: 'national-phase-patent-application'
  })
  session = turn3.session
  assert.equal(turn3.readyToDraft, false)
  assert.ok(turn3.responseMarkdown.includes('✓ Recorded: Target Office — United States Patent and Trademark Office (USPTO).'))
  assert.ok(turn3.responseMarkdown.includes('35 U.S.C. § 371'))
  assert.ok(turn3.responseMarkdown.includes('What is the title of the invention?'))
  assert.equal(session.facts.target_jurisdiction.value, 'US')
  assert.equal(session.lastAskedQuestionId, 'title')

  // Turn 4: User provides title "JAADUGAR"
  const turn4 = processInterviewTurn({
    session,
    userMessage: 'JAADUGAR',
    documentId: 'national-phase-patent-application'
  })
  session = turn4.session
  assert.equal(turn4.readyToDraft, false)
  assert.ok(turn4.responseMarkdown.includes('✓ Recorded: Title of Invention — JAADUGAR.'))
  assert.ok(turn4.responseMarkdown.includes('Next, please provide the inventor name(s) exactly as they should appear in the U.S. national-stage application.'))
  assert.equal(session.facts.title.value, 'JAADUGAR')
  assert.equal(session.lastAskedQuestionId, 'inventors')

  // Turn 5: User provides inventor "Aman Patel"
  const turn5 = processInterviewTurn({
    session,
    userMessage: 'Aman Patel',
    documentId: 'national-phase-patent-application'
  })
  session = turn5.session
  assert.equal(turn5.readyToDraft, false)
  assert.ok(turn5.responseMarkdown.includes('✓ Recorded: Inventor — Aman Patel.'))
  assert.ok(turn5.responseMarkdown.includes('Who is the applicant for the U.S. national-stage application?'))
  assert.equal(session.facts.inventors.value, 'Aman Patel')
  assert.equal(session.lastAskedQuestionId, 'applicants')

  // Turn 6: User provides applicant "A Ltd"
  const turn6 = processInterviewTurn({
    session,
    userMessage: 'A Ltd',
    documentId: 'national-phase-patent-application'
  })
  session = turn6.session
  assert.equal(turn6.readyToDraft, false)
  assert.ok(turn6.responseMarkdown.includes('✓ Recorded: Applicant — A Ltd.'))
  assert.ok(turn6.responseMarkdown.includes('To prepare the national-stage package without introducing unsupported subject matter, I need the underlying international application/publication.'))
  assert.ok(turn6.responseMarkdown.includes('Please provide the WO publication number (e.g. WO 2023/135791) or upload the published PCT application.'))
  assert.equal(session.facts.applicants.value, 'A Ltd')
  assert.equal(session.lastAskedQuestionId, 'wo_number')

  // Turn 7: User provides WO publication number "WO 2023/135791 A1"
  const turn7 = processInterviewTurn({
    session,
    userMessage: 'WO 2023/135791 A1',
    documentId: 'national-phase-patent-application'
  })
  session = turn7.session
  assert.equal(turn7.readyToDraft, false)
  assert.ok(turn7.responseMarkdown.includes('✓ Recorded: International Publication — WO 2023/135791 A1.'))
  assert.ok(turn7.responseMarkdown.includes('Would you like to enter the U.S. national stage using the claims as published, or do you want to prepare a preliminary amendment?'))
  assert.equal(session.facts.wo_number.value, 'WO 2023/135791 A1')
  assert.equal(session.lastAskedQuestionId, 'operative_claims_basis')

  // Turn 8: User confirms "As published without amendments. Please draft."
  const turn8 = processInterviewTurn({
    session,
    userMessage: 'As published without amendments. Please draft.',
    documentId: 'national-phase-patent-application'
  })
  session = turn8.session
  assert.equal(turn8.readyToDraft, true)
  assert.equal(session.state, QUESTION_STATES.READY_TO_DRAFT)
  assert.ok(turn8.responseMarkdown.includes('✓ Recorded: Operative Claim Basis — PCT Claims as Published (Article 21 PCT).'))
  assert.ok(turn8.responseMarkdown.includes('Ready to draft.'))
})

test('Multi-fact voluntary extraction in a single turn records all and skips resolved questions', () => {
  let session = createInterviewSession('national-phase-patent-application')
  // Initialize turn 1 and 2
  processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application' })
  processInterviewTurn({ session, userMessage: 'PCT/US2023/012345' })
  processInterviewTurn({ session, userMessage: 'USPTO' })

  // Turn 4: User provides title, inventor, AND applicant together
  const multiTurn = processInterviewTurn({
    session,
    userMessage: 'JAADUGAR. Inventor is Aman Patel and applicant is A Ltd.',
    documentId: 'national-phase-patent-application'
  })

  // Verify all 3 facts were recorded
  assert.equal(session.facts.title.value, 'JAADUGAR')
  assert.equal(session.facts.inventors.value, 'Aman Patel')
  assert.equal(session.facts.applicants.value, 'A Ltd')

  // Must acknowledge all three
  assert.ok(multiTurn.responseMarkdown.includes('✓ Recorded: Title of Invention — JAADUGAR.'))
  assert.ok(multiTurn.responseMarkdown.includes('✓ Recorded: Inventor — Aman Patel.'))
  assert.ok(multiTurn.responseMarkdown.includes('✓ Recorded: Applicant — A Ltd.'))

  // Must NOT ask for inventor or applicant; must proceed directly to WO publication / disclosure gate!
  assert.ok(multiTurn.responseMarkdown.includes('WO publication number'))
  assert.equal(session.lastAskedQuestionId, 'wo_number')
})

test('User corrections update active fact and record audit history without losing state', () => {
  let session = createInterviewSession('national-phase-patent-application')
  setFactInSession(session, 'pct_number', 'PCT/US2023/012345')
  setFactInSession(session, 'target_jurisdiction', 'US')
  setFactInSession(session, 'title', 'JAADUGAR')
  setFactInSession(session, 'inventors', 'Aman Patel')
  setFactInSession(session, 'applicants', 'A Ltd')
  session.lastAskedQuestionId = 'applicants'

  // User corrects applicant: "Actually the applicant is B Ltd."
  const corrTurn = processInterviewTurn({
    session,
    userMessage: 'Actually the applicant is B Ltd.',
    documentId: 'national-phase-patent-application'
  })

  assert.equal(session.facts.applicants.value, 'B Ltd')
  assert.ok(corrTurn.responseMarkdown.includes('✓ Updated: Applicant — B Ltd.'))
  assert.ok(session.auditTrail.length > 0)
  assert.equal(session.auditTrail[0].oldValue, 'A Ltd')
  assert.equal(session.auditTrail[0].newValue, 'B Ltd')
  assert.equal(session.auditTrail[0].reason, 'USER_CORRECTION')
})

test('Input validation rejects invalid PCT numbers with helpful guidance', () => {
  let session = createInterviewSession('national-phase-patent-application')
  processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application' })

  // User sends invalid number: "12345"
  const invalidTurn = processInterviewTurn({
    session,
    userMessage: '12345',
    documentId: 'national-phase-patent-application'
  })

  assert.equal(session.facts.pct_number, undefined, 'Invalid PCT number must not be stored')
  assert.ok(invalidTurn.responseMarkdown.includes("That doesn't appear to be a PCT international application number"))
  assert.ok(invalidTurn.responseMarkdown.includes('PCT/US2023/012345'))
})

test('Source-first resolution retrieves verified official facts and skips user questions', () => {
  let session = createInterviewSession('national-phase-patent-application')
  processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application' })

  // Mock official source records retrieved from WIPO / OPS
  const mockOfficialSource = {
    title: 'JAADUGAR QUANTUM CONTROLLER',
    inventors: [{ name: 'Aman Patel' }],
    applicants: [{ name: 'A Ltd' }],
    wo_number: 'WO 2023/135791 A1'
  }

  // User enters PCT number
  const turn2 = processInterviewTurn({
    session,
    userMessage: 'PCT/US2023/012345',
    sourceRecords: mockOfficialSource
  })

  // Next question is target office
  const turn3 = processInterviewTurn({
    session,
    userMessage: 'USPTO',
    sourceRecords: mockOfficialSource
  })

  // Because title, inventors, applicants, and wo_number are already verified from source,
  // Sally must NOT ask for title, inventor, or applicant.
  // Sally moves directly to the operative claims / preliminary amendments question!
  assert.equal(session.facts.title.status, FACT_STATUSES.SOURCE_VERIFIED)
  assert.equal(session.facts.title.value, 'JAADUGAR QUANTUM CONTROLLER')
  assert.equal(session.facts.wo_number.status, FACT_STATUSES.SOURCE_VERIFIED)
  assert.ok(turn3.responseMarkdown.includes('Would you like to enter the U.S. national stage using the claims as published'))
  assert.equal(session.lastAskedQuestionId, 'operative_claims_basis')
})

test('Source conflict detection flags SOURCE_USER_CONFLICT when user input contradicts official record', () => {
  let session = createInterviewSession('national-phase-patent-application')
  setFactInSession(session, 'pct_number', 'PCT/US2023/012345')
  setFactInSession(session, 'target_jurisdiction', 'US')
  session.lastAskedQuestionId = 'title'

  const mockOfficialSource = {
    title: 'MAGIC CONTROL SYSTEM'
  }

  // User enters different title: "JAADUGAR"
  const conflictTurn = processInterviewTurn({
    session,
    userMessage: 'JAADUGAR',
    sourceRecords: mockOfficialSource
  })

  assert.equal(session.conflicts.length, 1)
  assert.equal(session.conflicts[0].field, 'title')
  assert.equal(session.conflicts[0].sourceValue, 'MAGIC CONTROL SYSTEM')
  assert.equal(session.conflicts[0].userValue, 'JAADUGAR')
  assert.ok(conflictTurn.responseMarkdown.includes('The official PCT record lists the title of invention as "MAGIC CONTROL SYSTEM"'))
  assert.ok(conflictTurn.responseMarkdown.includes('Which should be used for the national phase filing?'))
})

test('Premature draft block: "Just draft it now" never bypasses missing source disclosure gate', () => {
  let session = createInterviewSession('national-phase-patent-application')
  setFactInSession(session, 'pct_number', 'PCT/US2023/012345')
  setFactInSession(session, 'target_jurisdiction', 'US')
  session.lastAskedQuestionId = 'title'

  // User says: "JAADUGAR. Just draft everything now."
  const turn = processInterviewTurn({
    session,
    userMessage: 'JAADUGAR. Just draft everything now.',
    documentId: 'national-phase-patent-application'
  })

  // Title is recorded
  assert.equal(session.facts.title.value, 'JAADUGAR')
  // userRequestedDraft is true, BUT readyToDraft is FALSE
  assert.equal(session.userRequestedDraft, true)
  assert.equal(turn.readyToDraft, false)
  assert.equal(session.readyToDraft, false)

  // Must acknowledge title, state disclosure requirement, and ask for next unresolved fact (inventors)
  assert.ok(turn.responseMarkdown.includes('✓ Recorded: Title of Invention — JAADUGAR.'))
  assert.ok(turn.responseMarkdown.includes('I still need the underlying PCT disclosure before I can safely prepare the substantive national-stage application'))
  assert.ok(turn.responseMarkdown.includes('inventor name(s)'))
})

test('Cross-task context isolation prevents prior NDA discussions from contaminating patent session', () => {
  const historyWithNda = [
    { role: 'user', content: 'Draft a mutual NDA between Alpha Corp and Beta Inc' },
    { role: 'assistant', content: '# MUTUAL NON-DISCLOSURE AGREEMENT\n\nParties: Alpha Corp and Beta Inc...' },
    { role: 'user', content: 'Draft a National Phase Patent Application' },
    { role: 'assistant', content: 'What is the PCT international application number?' }
  ]

  const doc = identifyDocument('PCT/US2023/012345', historyWithNda)
  assert.equal(doc.id, 'national-phase-patent-application')

  const slots = extractSlots(doc, 'PCT/US2023/012345', historyWithNda)
  assert.equal(slots.pct_number, 'PCT/US2023/012345')
  assert.equal(slots.title, undefined, 'NDA text must not leak into patent title')
  assert.equal(slots.applicants, undefined, 'Alpha Corp / Beta Inc must not leak into patent applicant')
  assert.equal(slots.inventors, undefined, 'NDA entities must not leak into inventors')
})

test('Skip / "I don\'t know" on required gate asks for fallback disclosure rather than looping', () => {
  let session = createInterviewSession('national-phase-patent-application')
  setFactInSession(session, 'pct_number', 'PCT/US2023/012345')
  setFactInSession(session, 'target_jurisdiction', 'US')
  setFactInSession(session, 'title', 'JAADUGAR')
  setFactInSession(session, 'inventors', 'Aman Patel')
  setFactInSession(session, 'applicants', 'A Ltd')
  session.lastAskedQuestionId = 'wo_number'

  // User says: "I don't know"
  const skipTurn = processInterviewTurn({
    session,
    userMessage: "I don't know",
    documentId: 'national-phase-patent-application'
  })

  assert.equal(skipTurn.readyToDraft, false)
  assert.ok(skipTurn.responseMarkdown.includes('To prepare the national-stage package without introducing unsupported subject matter, I need the underlying international application disclosure.'))
  assert.ok(skipTurn.responseMarkdown.includes('Please provide the WO publication number (e.g. WO 2023/135791) or upload the published PCT application.'))
})

test('Frozen Regression: MAGICIAN IN PAKISTAN is bound to active question (title) without dropping document session or falling back to generic analysis', () => {
  assert.equal(normalizeJurisdiction('MAGICIAN IN PAKISTAN'), 'UNKNOWN', 'Preposition "in" must never trigger India jurisdiction')
  assert.equal(normalizeJurisdiction('Method for processing in memory'), 'UNKNOWN')

  const thread = [
    { role: 'user', content: 'Draft a National Phase Patent Application' },
    { role: 'assistant', content: 'I can prepare the National Phase Patent Application based on the existing PCT application and the requirements of the target national or regional office.\n\nPlease provide the PCT international application number (e.g. PCT/US2023/012345).' },
    { role: 'user', content: 'PCT/US2023/012345' },
    { role: 'assistant', content: '✓ Recorded: PCT International Application Number: PCT/US2023/012345.\n\nWhat is the target national or regional office for this national-phase entry?\n\nFor example: USPTO, EPO, UKIPO, India, Japan, China, Canada, or Australia.' },
    { role: 'user', content: 'USPTO' },
    { role: 'assistant', content: '✓ Recorded: Target Office — United States Patent and Trademark Office (USPTO).\n\nFor this matter, Sally will use the U.S. national-stage route under 35 U.S.C. § 371 rather than treating the filing as a § 111(a) application.\n\nWhat is the title of the invention?' },
    { role: 'user', content: 'MAGICIAN IN PAKISTAN' }
  ]

  const clean = 'MAGICIAN IN PAKISTAN'
  const doc = identifyDocument(clean, thread)
  assert.ok(doc, 'Must identify National Phase Patent Application from thread history')
  assert.equal(doc.id, 'national-phase-patent-application')

  const slots = extractSlots(doc, clean, thread)
  assert.equal(slots.pct_number, 'PCT/US2023/012345')
  assert.equal(slots.target_jurisdiction, 'US')
  assert.equal(slots.title, 'MAGICIAN IN PAKISTAN')

  const relevantTurns = isolateWorkflowMessages(doc, clean, thread)
  const intake = evaluateIntakePhase(doc, slots, clean, relevantTurns.length)

  assert.equal(intake.phase, 'INTERVIEW')
  assert.ok(intake.formattedResponse.includes('✓ Recorded: Title of Invention — MAGICIAN IN PAKISTAN.'))
  assert.ok(intake.formattedResponse.includes('Next, please provide the inventor name(s)'))
  assert.ok(!intake.formattedResponse.includes('SallyIP Legal Analysis'), 'Must never emit generic legal analysis')
  assert.ok(!intake.formattedResponse.includes('targeted prior-art search'), 'Must never emit generic prior art options')
})


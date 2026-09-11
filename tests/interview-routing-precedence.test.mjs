import test from 'node:test'
import assert from 'node:assert/strict'

import {
  QUESTION_STATES,
  createInterviewSession,
  createSessionStore,
  sessionKey,
  saveInterviewSession,
  loadInterviewSession,
  isTaskSwitch,
  routeInterviewTurn,
  startInterviewSession,
  processInterviewTurn,
  annotateUncertainty,
} from '../src/lib/conversational-interview-engine.js'

const DOC = 'national-phase-patent-application'

function freshStore() {
  return createSessionStore()
}

function keyFor(conversationId = 'conv-1', documentId = DOC) {
  return sessionKey({ tenantId: 't1', userId: 'u1', matterId: 'm1', conversationId, documentId })
}

// ============================================================
// TEST 1 + TEST 10 — EXACT OBSERVED FAILURE (FROZEN REGRESSION)
// Active title question + "MAGICIAN IN PAKISTAN" must bind as the
// title answer. Generic legal routing must never execute.
// ============================================================
test('FROZEN: MAGICIAN IN PAKISTAN binds to the active title question', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  session = processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application', documentId: DOC }).session
  session = processInterviewTurn({ session, userMessage: 'PCT/US2023/012345', documentId: DOC }).session
  session = processInterviewTurn({ session, userMessage: 'USPTO', documentId: DOC }).session
  assert.equal(session.lastAskedQuestionId, 'title')
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const routed = routeInterviewTurn({ store, key, message: 'MAGICIAN IN PAKISTAN', documentId: DOC })
  assert.equal(routed.handled, true, 'Active interview must take routing precedence')
  assert.equal(routed.session.facts.title.value, 'MAGICIAN IN PAKISTAN')
  assert.equal(routed.session.lastAskedQuestionId, 'inventors')
  assert.match(routed.responseMarkdown, /Recorded: Title of Invention/)
  assert.match(routed.responseMarkdown, /inventor name\(s\)/i)
  assert.ok(!routed.responseMarkdown.includes('SallyIP Legal Analysis'), 'FORBIDDEN: generic legal analysis fallback')
  assert.ok(!routed.responseMarkdown.toLowerCase().includes('prior-art search'), 'FORBIDDEN: prior-art search offer')
  assert.ok(!routed.responseMarkdown.toLowerCase().includes('drafting claims'), 'FORBIDDEN: claim drafting offer')
})

// ============================================================
// TEST 2 — MULTI-FACT ANSWER
// ============================================================
test('Multi-fact answer records all three and skips resolved questions', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  session = processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application', documentId: DOC }).session
  session = processInterviewTurn({ session, userMessage: 'PCT/US2023/012345', documentId: DOC }).session
  session = processInterviewTurn({ session, userMessage: 'USPTO', documentId: DOC }).session
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const routed = routeInterviewTurn({
    store, key,
    message: 'Title is JAADUGAR, inventor is Aman Patel and applicant is A Ltd.',
    documentId: DOC,
  })
  assert.equal(routed.handled, true)
  assert.equal(routed.session.facts.title.value, 'JAADUGAR')
  assert.equal(routed.session.facts.inventors.value, 'Aman Patel')
  assert.equal(routed.session.facts.applicants.value, 'A Ltd')
  assert.notEqual(routed.session.lastAskedQuestionId, 'inventors', 'Inventor question must be skipped')
  assert.notEqual(routed.session.lastAskedQuestionId, 'applicants', 'Applicant question must be skipped')
})

// ============================================================
// TEST 3 — PREMATURE DRAFT BLOCKED AT ROUTING LAYER
// ============================================================
test('Force-draft with missing PCT source never drafts', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  for (const turn of ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO', 'JAADUGAR', 'Aman Patel', 'A Ltd']) {
    session = processInterviewTurn({ session, userMessage: turn, documentId: DOC }).session
  }
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const routed = routeInterviewTurn({ store, key, message: 'Just draft it now.', documentId: DOC })
  assert.equal(routed.handled, true)
  assert.equal(routed.readyToDraft, false)
  assert.match(routed.responseMarkdown, /WO publication number|upload/i)
})

// ============================================================
// TEST 4 — CROSS-TASK CONTAMINATION BLOCKED (ROUTING LAYER)
// ============================================================
test('NDA session facts never leak into the patent session', () => {
  const store = freshStore()
  const ndaKey = keyFor('conv-1', 'mutual-nda')
  saveInterviewSession(store, ndaKey, {
    ...createInterviewSession('mutual-nda'),
    facts: { party_a: { value: 'A Ltd' }, party_b: { value: 'B Ltd' } },
  })
  const patentKey = keyFor('conv-2', DOC)
  const started = startInterviewSession({ store, key: patentKey, documentId: DOC, openingMessage: 'Draft a National Phase Patent Application' })
  assert.ok(!JSON.stringify(started.session.facts).includes('A Ltd'), 'NDA party must not contaminate patent facts')
  assert.ok(!JSON.stringify(started.session.facts).includes('B Ltd'), 'NDA party must not contaminate patent facts')
})

// ============================================================
// TEST 5 — CORRECTION PRESERVES HISTORY
// ============================================================
test('Later correction updates the applicant with audit history', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  for (const turn of ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO', 'JAADUGAR', 'Aman Patel', 'Applicant is A Ltd.']) {
    session = processInterviewTurn({ session, userMessage: turn, documentId: DOC }).session
  }
  assert.equal(session.facts.applicants.value, 'A Ltd')
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const routed = routeInterviewTurn({ store, key, message: 'Actually applicant is B Ltd.', documentId: DOC })
  assert.equal(routed.handled, true)
  assert.equal(routed.session.facts.applicants.value, 'B Ltd')
  assert.ok(routed.session.auditTrail.some((entry) => entry.field === 'applicants'), 'Correction must preserve audit history')
})

// ============================================================
// TEST 6 — UNKNOWN DEFERS SAFELY WITHOUT LOOPS
// ============================================================
test('Unknown WO number defers without inventing or looping', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  for (const turn of ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO', 'JAADUGAR', 'Aman Patel', 'A Ltd']) {
    session = processInterviewTurn({ session, userMessage: turn, documentId: DOC }).session
  }
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const routed = routeInterviewTurn({ store, key, message: "I don't know.", documentId: DOC })
  assert.equal(routed.handled, true)
  assert.ok(!JSON.stringify(routed.session.facts).match(/WO\s*20\d{2}/i), 'Must not invent a WO number')
})

// ============================================================
// TEST 7 — INVALID PCT FORMAT REJECTED
// ============================================================
test('Malformed PCT number is rejected, never recorded as verified', () => {
  const store = freshStore()
  const key = keyFor()
  const started = startInterviewSession({ store, key, documentId: DOC, openingMessage: 'Draft a National Phase Patent Application' })
  assert.equal(started.session.lastAskedQuestionId, 'pct_number')
  const routed = routeInterviewTurn({ store, key, message: '12345', documentId: DOC })
  assert.equal(routed.handled, true)
  assert.ok(!routed.session.facts.pct_number || routed.session.facts.pct_number.value !== '12345', 'Invalid PCT must not be recorded')
  assert.match(routed.responseMarkdown, /PCT\/US2023\/012345|format/i)
})

// ============================================================
// TEST 9 — DUPLICATE QUESTION BLOCKED
// ============================================================
test('Already-provided inventor is never asked again', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  for (const turn of ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO', 'JAADUGAR', 'Aman Patel']) {
    session = processInterviewTurn({ session, userMessage: turn, documentId: DOC }).session
  }
  assert.notEqual(session.lastAskedQuestionId, 'inventors', 'Inventor already known: must advance past it')
  assert.equal(session.facts.inventors.value, 'Aman Patel')
})

// ============================================================
// TASK-SWITCH DETECTION
// ============================================================
test('Explicit switches exit the interview; plain answers never do', () => {
  for (const phrase of ['stop this', 'cancel', 'start over', 'forget this application', "let's do an NDA instead", 'new matter', 'switch to patentability']) {
    assert.equal(isTaskSwitch(phrase), true, `"${phrase}" must be a task switch`)
  }
  for (const phrase of ['MAGICIAN IN PAKISTAN', 'Aman Patel', 'A Ltd', 'No', 'Yes', 'USPTO', 'March 3, 2023', 'PCT/US2023/012345', 'WO 2023/135791']) {
    assert.equal(isTaskSwitch(phrase), false, `"${phrase}" must NOT be treated as a task switch`)
  }
})

test('Task switch abandons the session and releases routing', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  session = processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application', documentId: DOC }).session
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const routed = routeInterviewTurn({ store, key, message: "let's do an NDA instead", documentId: DOC })
  assert.equal(routed.handled, false)
  assert.equal(routed.reason, 'TASK_SWITCH')
})

// ============================================================
// SESSION RESUMPTION AFTER RELOAD
// ============================================================
test('Serialized session resumes binding on the next turn', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  session = processInterviewTurn({ session, userMessage: 'Draft a National Phase Patent Application', documentId: DOC }).session
  session = processInterviewTurn({ session, userMessage: 'PCT/US2023/012345', documentId: DOC }).session
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  // Simulate reload: fresh store rehydrated from serialized JSON
  const rehydrated = loadInterviewSession(store, key)
  const store2 = freshStore()
  saveInterviewSession(store2, key, JSON.parse(JSON.stringify(rehydrated)))
  const routed = routeInterviewTurn({ store: store2, key, message: 'USPTO', documentId: DOC })
  assert.equal(routed.handled, true)
  assert.equal(routed.session.facts.target_jurisdiction.value, 'US')
})

// ============================================================
// UNCERTAINTY ANNOTATION
// ============================================================
test('Hedged answers store USER_ASSERTED with UNCERTAIN certainty', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  for (const turn of ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO', 'JAADUGAR', 'Aman Patel', 'A Ltd', 'WO 2023/135791', 'as published']) {
    session = processInterviewTurn({ session, userMessage: turn, documentId: DOC }).session
  }
  const annotated = annotateUncertainty(session, 'I think the priority date was March 4, 2023.')
  assert.equal(annotated, true)
  const lastField = session.lastAskedQuestionId && session.facts[session.lastAskedQuestionId] ? session.lastAskedQuestionId : Object.keys(session.facts).pop()
  assert.equal(session.facts[lastField].certainty, 'UNCERTAIN')
})

// ============================================================
// ONE-QUESTION-PER-TURN INVARIANT ACROSS FULL INTERVIEW
// ============================================================
test('Every interview turn asks at most one material question', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  const turns = ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO', 'MAGICIAN IN PAKISTAN', 'Aman Patel', 'A Ltd', 'WO 2023/135791', 'as published']
  for (const turn of turns) {
    const result = processInterviewTurn({ session, userMessage: turn, documentId: DOC })
    session = result.session
    if (result.nextQuestion) {
      const questionMarks = (result.responseMarkdown.match(/\?/g) || []).length
      assert.ok(questionMarks <= 2, `Turn "${turn}" must ask at most one material question`)
      session.state = QUESTION_STATES.WAITING_FOR_USER
      saveInterviewSession(store, key, session)
    }
  }
  assert.equal(session.facts.title.value, 'MAGICIAN IN PAKISTAN')
  assert.equal(session.facts.inventors.value, 'Aman Patel')
})

// ============================================================
// VOICE PARITY: transcripts bind through the identical path
// ============================================================
test('Voice transcripts bind to the active question exactly like typed text', () => {
  const store = freshStore()
  const key = keyFor()
  let session = createInterviewSession(DOC)
  for (const turn of ['Draft a National Phase Patent Application', 'PCT/US2023/012345', 'USPTO']) {
    session = processInterviewTurn({ session, userMessage: turn, documentId: DOC }).session
  }
  session.state = QUESTION_STATES.WAITING_FOR_USER
  saveInterviewSession(store, key, session)

  const voiceTranscript = 'MAGICIAN IN PAKISTAN'
  const routed = routeInterviewTurn({ store, key, message: voiceTranscript, documentId: DOC })
  assert.equal(routed.handled, true, 'Voice input must use the same binding path as text')
  assert.equal(routed.session.facts.title.value, 'MAGICIAN IN PAKISTAN')
})

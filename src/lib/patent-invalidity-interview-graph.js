/**
 * SALLYIP PATENT INVALIDITY INTERVIEW GRAPH — PART 1
 * Canonical Document #017: matter-first conditional one-question intake.
 *
 * Thin orchestration only (like Document #015): matter inspection,
 * turn-taking, readiness, confirmation. Substantive analysis lives in
 * patent-invalidity-service.js, which reuses the shared novelty,
 * claim-model, legal-status, entailment, temporal, contradiction,
 * and claim-chart engines.
 */

import {
  INVALIDITY_WORKFLOW_MODES,
  INVALIDITY_READINESS,
  INVALIDITY_REVIEW_FLAGS,
  buildInvalidityTarget,
  verifyTargetRight,
  resolveOperativeClaimSet,
  groundsForJurisdiction,
  assessGroundEligibility,
  assessInvalidityReadiness,
  assessNoveltyInvalidityGround,
  assessCombinationGraph,
  mapLimitationSupport,
  assessAddedMatter,
  screenEnablementSufficiency,
  screenClaimClarity,
  synthesizeCounterarguments,
  detectInvalidityContradictions,
  buildInvalidityMatrix,
  buildInvalidityEvidenceGraph,
  aggregateClaimOutcome,
  aggregateOverallOutcome,
  detectInvalidityStaleness,
  createInvalidityVersion,
  buildInvalidityFtoHandoff,
  buildPriorArtSearchHandoff,
  assertInvalidityConfidentiality,
  assembleInvalidityOpinion,
  normalizeJurisdiction,
} from './patent-invalidity-service.js'

export { INVALIDITY_READINESS, INVALIDITY_REVIEW_FLAGS }

export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|not yet|haven'?t decided|to be determined|none|no search)\b/i.test(clean)
    || /^(pass|tbd|n\/a|no|nope)$/i.test(clean)
}

export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /^(yes|proceed|analyse|analyze|draft it|yes proceed|go ahead|start (the )?analys(is|is)|prepare the opinion|generate|do it|confirmed|approved)\b/i.test(clean)
    || /\b(proceed with (the )?(analys(is|is)|assessment|opinion)|ready to analys[ez]|please analys[ez]|prepare the opinion)\b/i.test(clean)
}

export function isMisconductAllegation(text = '') {
  return /fraud|inequitable conduct|misconduct|bad faith|they lied|they hid/i.test(String(text || ''))
    && /cit(e|ed|ing)|disclos|prosecut|inventor/i.test(String(text || ''))
}

export function demandsDefinitiveVerdict(text = '') {
  return /\bjust (say|tell me|declare)|say it['’]s invalid\b|\bconfirm (it['’]s|that it is) invalid\b/i.test(String(text || ''))
}

const QUESTIONS = [
  {
    id: 'target_right', field: 'right_id',
    question: 'Which patent or application should I assess? Please give the publication or patent number and jurisdiction — I cannot analyse an ambiguous right.',
  },
  {
    id: 'jurisdiction', field: 'jurisdiction',
    question: 'Which validity jurisdiction applies to this assessment: US, EP, another specified jurisdiction, or undecided?',
  },
  {
    id: 'selected_claims', field: 'selected_claims',
    question: 'Which claim or claims would you like assessed? Each claim is analysed separately, including the full parent-chain limitations of any dependent claim.',
  },
  {
    id: 'claim_set_version', field: 'claim_set_version',
    question: 'Which operative claim-set version should I use (for example, as granted or as amended)? I will not analyse an obsolete version silently.',
  },
  {
    id: 'grounds_in_scope', field: 'grounds_in_scope',
    question: 'Which invalidity grounds are in scope — for example novelty, obviousness/inventive step, disclosure/support, added matter, or eligibility? Only jurisdiction-supported grounds will be enabled.',
  },
  {
    id: 'research_status', field: 'research',
    question: 'What prior-art research exists for these claims: no search yet, references you will provide, a partial search, or a completed structured search?',
  },
  {
    id: 'priority_context', field: 'priority_context',
    question: 'What is the priority and filing-date context, including any priority documents whose support may be in question?',
  },
  {
    id: 'authority', field: 'authority',
    question: 'Is there a verified, current legal authority for the selected grounds, or should the analysis remain RESEARCH_REQUIRED pending authority verification?',
  },
]

export function extractInvalidityMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {}
  const facts = {}
  const status = {}
  const number = matterContext.publication_number || matter.publication_number || matter.patent_number || matterContext.patent_number
  if (number) { facts.right_id = String(number); facts.publication_number = String(number); status.right_id = 'KNOWN' }
  const jurisdiction = matterContext.jurisdiction || matter.jurisdiction || matter.patent_jurisdiction
  if (jurisdiction) { facts.jurisdiction = jurisdiction; status.jurisdiction = 'KNOWN' }
  const claimSets = matterContext.claim_sets || matter.claim_sets || []
  if (claimSets.length) { facts.claim_sets = claimSets; status.claim_sets = 'KNOWN' }
  const claims = matterContext.claims || matter.claims || []
  if (claims.length) { facts.claims = claims; status.claims = 'KNOWN' }
  const legalStatus = matterContext.legal_status || matter.legal_status || matter.patent_status
  if (legalStatus) { facts.legal_status = legalStatus; status.legal_status = 'KNOWN' }
  const references = matterContext.references || matter.prior_art_references || []
  if (references.length) { facts.references = references; status.references = 'KNOWN' }
  if (matterContext.research || matter.prior_art_research) { facts.research = matterContext.research || matter.prior_art_research; status.research = 'KNOWN' }
  if (matterContext.priority_context || matter.priority_date) { facts.priority_context = matterContext.priority_context || { analysis_cutoff: matter.priority_date }; status.priority_context = 'KNOWN' }
  if (matterContext.prosecution_history || matter.prosecution_history) { facts.prosecution_history = matterContext.prosecution_history || matter.prosecution_history; status.prosecution_history = 'KNOWN' }
  if (matterContext.authority || matter.validity_authority) { facts.authority = matterContext.authority || matter.validity_authority; status.authority = 'KNOWN' }
  const inspected = []
  if (matterContext.fto_chart || matter.fto_chart) inspected.push('fto-claim-chart')
  if (matterContext.novelty_analysis || matter.novelty_analysis) inspected.push('novelty-analysis')
  if (matterContext.family_data || matter.family_data) inspected.push('patent-family')
  if (inspected.length) facts.inspected_artifacts = inspected
  return { facts, status }
}

function applyAnswer(facts, questionId, answer) {
  const value = String(answer || '').trim()
  if (!value) return
  if (questionId === 'target_right') {
    const number = value.match(/\b([A-Z]{2}\s?\d[\d\s,\/]*[A-Z]?\d)\b/i)?.[1]
    facts.right_id = (number || value).trim()
    if (number) facts.publication_number = number.trim()
    const jurisdiction = value.match(/\b(US|USA|EP|EPO|UK|CN|JP|KR|DE|FR)\b/i)?.[1]
    if (jurisdiction && !facts.jurisdiction) facts.jurisdiction = jurisdiction.toUpperCase()
  }
  else if (questionId === 'jurisdiction') facts.jurisdiction = value
  else if (questionId === 'selected_claims') {
    const numbers = [...new Set([...value.matchAll(/claim\s+(\d+)/gi)].map((m) => Number(m[1])))]
    facts.selected_claims = numbers.length ? numbers : [value]
    if (!facts.claim_numbers) facts.claim_numbers = facts.selected_claims.filter((n) => Number.isFinite(n))
  }
  else if (questionId === 'claim_set_version') facts.claim_set_version = value
  else if (questionId === 'grounds_in_scope') facts.grounds_in_scope = value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
  else if (questionId === 'research_status') {
    const status = /no search|not searched|none/i.test(value) ? 'NOT_SEARCHED'
      : /provid|these references|attached|only these/i.test(value) ? 'USER_PROVIDED_ONLY'
      : /structured|completed|full search/i.test(value) ? 'STRUCTURED_SEARCH_COMPLETED' : 'PARTIAL_SEARCH'
    facts.research = { status, scope: value, provenance: 'USER_PROVIDED' }
  }
  else if (questionId === 'priority_context') {
    const date = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]
    facts.priority_context = { status: date ? 'NEEDS_SUPPORT_CHECK' : 'REVIEW_REQUIRED', analysis_cutoff: date || null, user_statement: value }
  }
  else if (questionId === 'authority') {
    facts.authority = /verified/i.test(value)
      ? { verified: true, authority_id: value, version_or_date: new Date().toISOString().slice(0, 10) }
      : { verified: false }
  }
}

function nextQuestion(facts) {
  if (!facts.right_id) return QUESTIONS[0]
  if (!facts.jurisdiction || normalizeJurisdiction(facts.jurisdiction) === 'UNDECIDED') return QUESTIONS[1]
  if (!(facts.selected_claims || []).length) return QUESTIONS[2]
  if (!facts.claim_set_version && (facts.claim_sets || []).length !== 1) return QUESTIONS[3]
  if (!(facts.grounds_in_scope || []).length) return QUESTIONS[4]
  if (!facts.research?.status) return QUESTIONS[5]
  if (!facts.priority_context) return QUESTIONS[6]
  if (!facts.authority) return QUESTIONS[7]
  return null
}

function sessionIds(session = {}, matterContext = {}, facts = {}) {
  return {
    draftSessionId: session.draftSessionId || matterContext.draftSessionId || 'invalidity-session-pending',
    matterId: session.matterId || matterContext.matter?.id || matterContext.matterId || null,
    documentId: 'patent-invalidity-opinion',
    invalidityOpinionId: session.invalidityOpinionId || `inv-${String(session.matterId || matterContext.matter?.id || facts.right_id || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pending'}`,
  }
}

function buildPreAnalysisSummary(facts, readiness) {
  return {
    target_right: facts.right_id || null,
    jurisdiction: facts.jurisdiction || null,
    operative_claim_version: facts.claim_set_version || null,
    challenged_claims: facts.selected_claims || [],
    grounds_in_scope: facts.grounds_in_scope || [],
    priority_context: facts.priority_context || null,
    prior_art_status: facts.research?.status || 'UNKNOWN',
    prosecution_evidence: facts.prosecution_history ? 'RECORDED' : 'NOT_RECORDED',
    known_gaps: readiness.gaps || [],
  }
}

function assembleDraftOpinion(facts, session) {
  const target = buildInvalidityTarget({ ...facts, selected_claims: facts.selected_claims })
  const grounds = (facts.grounds_in_scope || []).map((name, index) => ({
    ground_id: `GROUND-${index + 1}`,
    label: name,
    legal_basis: 'authority verification pending',
  }))
  const matrix = buildInvalidityMatrix({
    claims: (facts.selected_claims || []).map((n) => ({ claim_number: Number(n) || n })),
    grounds,
    mappings: facts.mappings || [],
    authorities: facts.authority?.verified ? [{ ground_id: 'ALL', authority_id: facts.authority.authority_id }] : [],
  })
  const counterarguments = synthesizeCounterarguments({
    claim_number: (facts.selected_claims || [])[0] || null,
    matrix_rows: (facts.mappings || []).map((m) => ({ disclosure_status: m.disclosure_status || 'RESEARCH_REQUIRED', limitation_id: m.limitation_id })),
    temporal: facts.temporal || null,
    priority: facts.priority_review || null,
  })
  const claimOutcomes = (facts.selected_claims || []).map(() => 'RESEARCH_REQUIRED')
  const overall = aggregateOverallOutcome({ claimOutcomes })
  const graph = buildInvalidityEvidenceGraph({ target, claims: matrix.length ? [...new Map(matrix.map((r) => [r.claim, { claim_number: r.claim }])).values()] : [], grounds, matrix, counterarguments })
  const assembled = assembleInvalidityOpinion({
    target,
    jurisdiction: facts.jurisdiction,
    claims: (facts.selected_claims || []).map((n) => ({ claim_number: Number(n) || n })),
    claim_set_version: facts.claim_set_version,
    grounds,
    matrix,
    counterarguments,
    claim_outcomes: claimOutcomes,
    overall_outcome: overall,
    research: facts.research,
    priority: facts.priority_context,
    prosecution: facts.prosecution_history,
    authorities: facts.authority?.verified ? [facts.authority] : [],
    gaps: (session.flags || []),
    verification: [`Invalidity opinion ${session.invalidityOpinionId || 'pending'}; RETRIEVE → VERIFY → REASON → CHALLENGE → VALIDATE → CITE → ANSWER applied to material arguments.`],
    next_steps: ['Resolve recorded research gaps before any ground-specific conclusion.', 'Verify references, timing, quotes, and entailment at limitation level.'],
    versions: createInvalidityVersion(session.version_history || [], { target: target.right_id }, 'INITIAL_INVALIDITY_ASSESSMENT'),
  })
  return { ...assembled, matrix, graph, target, counterarguments, overall_outcome: overall }
}

export function evaluatePatentInvalidityInterviewStep({ session = {}, latestMessage = '', matterContext = {} } = {}) {
  const nextSession = {
    ...session,
    facts: { ...(session.facts || {}) },
    flags: [...(session.flags || [])],
    answers: [...(session.answers || [])],
  }
  if (!nextSession.initialized) {
    const extracted = extractInvalidityMatterContext(matterContext)
    nextSession.facts = { ...extracted.facts, ...nextSession.facts }
    nextSession.context_status = extracted.status
    nextSession.initialized = true
  }
  const latestText = String(latestMessage || '').trim()

  if (isMisconductAllegation(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'patent-invalidity-opinion',
      message: 'An allegation of fraud, inequitable conduct, or bad faith requires specific evidence and a verified jurisdictional framework. I cannot infer misconduct from a missing citation, amendment, or search gap. This needs specialist review — shall I record the underlying facts for that review instead?',
      flags: ['MISCONDUCT_ANALYSIS_REQUIRES_SPECIALIST_REVIEW'],
      session: nextSession,
    }
  }
  if (demandsDefinitiveVerdict(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'patent-invalidity-opinion',
      message: 'I cannot declare a patent invalid (or valid) on request. I can build a qualified, evidence-linked assessment of specific claims against verified grounds. Which claim should we start with?',
      flags: ['OUTCOME_BOUNDARY_ENFORCED'],
      session: nextSession,
    }
  }

  const claimMention = latestText.match(/\bclaim\s+(\d+)\b/i)?.[1]
  if (claimMention && !(nextSession.facts.selected_claims || []).length && !nextSession.currentQuestionId) {
    nextSession.facts.selected_claims = [Number(claimMention)]
    nextSession.facts.claim_numbers = [Number(claimMention)]
  }
  if (nextSession.currentQuestionId && latestText) {
    if (isSkipOrUnknown(latestText)) {
      nextSession.facts[`${nextSession.currentQuestionId}_unknown`] = true
    } else {
      applyAnswer(nextSession.facts, nextSession.currentQuestionId, latestText)
    }
    nextSession.answers.push({ question_id: nextSession.currentQuestionId, answer: latestMessage, timestamp: new Date().toISOString() })
    nextSession.currentQuestionId = null
  }

  Object.assign(nextSession, sessionIds(nextSession, matterContext, nextSession.facts))
  const question = nextQuestion(nextSession.facts)
  if (question) {
    nextSession.currentQuestionId = question.id
    if (question.id === 'claim_set_version' && !nextSession.flags.includes('CLAIM_VERSION_CONFIRMATION_REQUIRED')) {
      nextSession.flags.push('CLAIM_VERSION_CONFIRMATION_REQUIRED')
    }
    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-invalidity-opinion',
      single_question: question,
      question,
      questions: [question],
      drafting_status: 'INFORMATION_GATHERING',
      readiness: 'NOT_READY',
      session: nextSession,
      known_facts: nextSession.facts,
      jurisdiction: nextSession.facts.jurisdiction || 'UNDECIDED',
    }
  }

  const readiness = assessInvalidityReadiness(nextSession.facts)
  nextSession.flags = [...new Set([...nextSession.flags, ...readiness.gaps])]
  if (readiness.readiness === 'NOT_READY') {
    return {
      action: 'RESEARCH_REQUIRED',
      document_family: 'patent-invalidity-opinion',
      outcome: 'RESEARCH_REQUIRED',
      message: 'Further verified information is required before any invalidity analysis. No conclusion is drawn.',
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  if (!nextSession.analysisConfirmed) {
    return {
      action: 'PROMPT_ANALYSIS_CONFIRMATION',
      document_family: 'patent-invalidity-opinion',
      message: 'I have enough verified information to begin the invalidity assessment using the current evidence. Would you like me to proceed?',
      pre_analysis_summary: buildPreAnalysisSummary(nextSession.facts, readiness),
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  const draft = assembleDraftOpinion(nextSession.facts, nextSession)
  return {
    action: 'DRAFT',
    document_family: 'patent-invalidity-opinion',
    draft_plan: { content: draft.report, profile: 'patent-invalidity-opinion', jurisdiction: nextSession.facts.jurisdiction, status: 'READY_TO_ASSEMBLE', matrix: draft.matrix, evidence_graph: draft.graph },
    opinion: draft,
    session: nextSession,
    facts: nextSession.facts,
    readiness,
  }
}

export function buildInvalidityHandoff(opinion = {}, target) {
  const allowed = ['patent-prior-art-search-report', 'patent-novelty-opinion', 'freedom-to-operate-opinion', 'patent-claims-set']
  if (!allowed.includes(target)) throw new Error('Unsupported Patent Invalidity Opinion handoff')
  if (target === 'freedom-to-operate-opinion') {
    return buildInvalidityFtoHandoff({ findings: opinion.matrix || [], rightId: opinion.target?.right_id || null })
  }
  if (target === 'patent-prior-art-search-report') {
    return buildPriorArtSearchHandoff({ target_claims: opinion.target?.selected_claims || [] })
  }
  return { source_workflow: 'patent-invalidity-opinion', target_workflow: target, matrix: opinion.matrix || [], automatic_claim_amendment: false }
}

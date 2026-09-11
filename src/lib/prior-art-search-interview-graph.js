/**
 * SALLYIP PRIOR-ART SEARCH INTERVIEW GRAPH — PART 1
 * Canonical Document #019: matter-first conditional one-question intake.
 *
 * Thin orchestration only: target/version/scope capture, readiness,
 * confirmation. Substantive search logic lives in prior-art-search-service.js.
 */

import {
  PRIOR_ART_SEARCH_MODES,
  PRIOR_ART_READINESS,
  PRIOR_ART_REVIEW_FLAGS,
  buildSearchTarget,
  confirmTargetVersion,
  decomposeClaimForSearch,
  buildSearchStrategy,
  recordSearchQuery,
  verifySearchReference,
  assessSearchReadiness,
  detectSearchStaleness,
  buildSearchHandoff,
  assertSearchConfidentiality,
  assembleSearchReport,
} from './prior-art-search-service.js'

export { PRIOR_ART_READINESS, PRIOR_ART_REVIEW_FLAGS }

export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|not yet|to be determined|whatever you find)\b/i.test(clean)
    || /^(pass|tbd|n\/a|no|nope)$/i.test(clean)
}

export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /^(yes|proceed|search|run it|yes proceed|go ahead|start (the )?search|run the search|do it|confirmed|approved)\b/i.test(clean)
    || /\b(proceed with (the )?(search|report)|ready to search|please search|run the (prior-art )?search)\b/i.test(clean)
}

export function isPatentabilityConfusion(text = '') {
  return /patentable|so it is patentable/i.test(String(text || '')) && /no .*?(close|relevant|match|reference)|nothing .*?found|zero results/i.test(String(text || ''))
}

export function isNoveltyConfusion(text = '') {
  return /novel/i.test(String(text || '')) && /no exact match|nothing found|zero results|therefore novel|so .* novel/i.test(String(text || ''))
}

const QUESTIONS = [
  {
    id: 'search_target', field: 'search_target',
    question: 'What exactly should I search — an invention disclosure, a claim set and version, a concept, or a third-party claim? I cannot search randomly.',
  },
  {
    id: 'target_version', field: 'target_version',
    question: 'Which version should I use as the search target? I will not search stale claims without notice.',
  },
  {
    id: 'search_modes', field: 'search_modes',
    question: 'What kind of search do you need — concept-level, claim-level, patent-only, patent plus non-patent literature, or a focused invalidity, patentability, novelty, or FTO-discovery search?',
  },
  {
    id: 'source_types', field: 'source_types',
    question: 'Which sources should I query — patent offices or databases, technical literature, standards, or product documentation — and are there language limits?',
  },
  {
    id: 'priority_cutoff', field: 'priority_cutoff',
    question: 'What priority date or time cutoff should bound the search, and is that date asserted or verified?',
  },
  {
    id: 'known_references', field: 'known_references',
    question: 'Are there known references, competitor patents, classifications, or starting points I should seed the search with?',
  },
]

export function extractSearchMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {}
  const facts = {}
  const status = {}
  const disclosure = matterContext.invention_disclosure || matter.invention_disclosure || matter.disclosure_text
  if (disclosure) { facts.invention_disclosure = disclosure; status.invention_disclosure = 'KNOWN' }
  const claimSets = matterContext.claim_sets || matter.claim_sets || []
  if (claimSets.length) { facts.claim_sets = claimSets; status.claim_sets = 'KNOWN' }
  const claims = matterContext.claims || matter.claims || []
  if (claims.length) { facts.claims = claims; status.claims = 'KNOWN' }
  if (matterContext.target_version || matter.claim_set_version) { facts.target_version = matterContext.target_version || matter.claim_set_version; status.target_version = 'KNOWN' }
  const priority = matterContext.priority_filing || matter.priority_filing || matter.priority_date
  if (priority) { facts.priority_filing = priority; status.priority_filing = 'KNOWN' }
  const known = matterContext.known_references || matter.known_prior_art || []
  if (known.length) { facts.known_references = known; status.known_references = 'KNOWN' }
  const history = matterContext.search_history || matter.search_history || []
  if (history.length) { facts.search_history = history; status.search_history = 'KNOWN' }
  if (matterContext.jurisdiction || matter.jurisdiction) { facts.jurisdiction_context = matterContext.jurisdiction || matter.jurisdiction; status.jurisdiction_context = 'KNOWN' }
  return { facts, status }
}

function applyAnswer(facts, questionId, answer) {
  const value = String(answer || '').trim()
  if (!value) return
  if (questionId === 'search_target') {
    facts.search_target = value
    if (/claim/i.test(value)) facts.target_type = 'CLAIM_SET'
    else if (/concept|idea|invention/i.test(value)) facts.target_type = 'INVENTIVE_CONCEPT'
    else if (/third.party|their patent|patent no\.|US\d|EP\d/i.test(value)) facts.target_type = 'THIRD_PARTY_CLAIM'
  }
  else if (questionId === 'target_version') facts.target_version = value
  else if (questionId === 'search_modes') {
    const upper = value.toUpperCase()
    const modes = PRIOR_ART_SEARCH_MODES.filter((mode) => upper.includes(mode.replace(/_/g, ' ')) || upper.includes(mode))
    if (/patent.*(and|plus|\+).*npl|npl/i.test(value)) modes.push('PATENT_AND_NPL_SEARCH')
    if (/claim/i.test(value) && !modes.includes('CLAIM_LEVEL_SEARCH')) modes.push('CLAIM_LEVEL_SEARCH')
    if (/invalidat/i.test(value)) modes.push('INVALIDITY_SEARCH')
    if (/patentab/i.test(value)) modes.push('PATENTABILITY_SEARCH')
    if (/novelty/i.test(value)) modes.push('NOVELTY_SEARCH')
    if (/fto|freedom/i.test(value)) modes.push('FTO_DISCOVERY_SEARCH')
    facts.search_modes = [...new Set(modes.length ? modes : ['CONCEPT_LEVEL_SEARCH'])]
  }
  else if (questionId === 'source_types') facts.source_types = value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
  else if (questionId === 'priority_cutoff') {
    const date = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]
    facts.priority_cutoff = date || value
    facts.priority_status = date ? (/verif/i.test(value) ? 'VERIFIED' : 'USER_ASSERTED_PRIORITY_DATE') : 'RESEARCH_REQUIRED'
  }
  else if (questionId === 'known_references') facts.known_references = value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
}

function nextQuestion(facts) {
  if (!facts.search_target && !facts.claim_text && !(facts.claims || []).length && !facts.invention_disclosure && !facts.concept_text) return QUESTIONS[0]
  if (!facts.target_version && ((facts.claim_sets || []).length > 1 || (facts.available_targets || []).length > 1)) return QUESTIONS[1]
  if (!(facts.search_modes || []).length) return QUESTIONS[2]
  if (!(facts.source_types || []).length) return QUESTIONS[3]
  if (!facts.priority_cutoff && (facts.search_modes || []).some((m) => ['NOVELTY_SEARCH', 'INVALIDITY_SEARCH', 'PATENTABILITY_SEARCH'].includes(m))) return QUESTIONS[4]
  if (facts.known_references === undefined) return QUESTIONS[5]
  return null
}

function sessionIds(session = {}, matterContext = {}, facts = {}) {
  return {
    draftSessionId: session.draftSessionId || matterContext.draftSessionId || 'prior-art-session-pending',
    matterId: session.matterId || matterContext.matter?.id || matterContext.matterId || null,
    documentId: 'patent-prior-art-search-report',
    searchId: session.searchId || `pas-${String(session.matterId || matterContext.matter?.id || facts.search_target || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'pending'}`,
  }
}

function buildPreSearchSummary(facts) {
  return {
    search_target: facts.search_target || facts.claim_text || facts.concept_text || null,
    target_version: facts.target_version || null,
    key_features: facts.critical_features || facts.key_features || [],
    jurisdiction_context: facts.jurisdiction_context || 'UNDECIDED',
    date_cutoff: facts.priority_cutoff || null,
    patent_npl_scope: (facts.search_modes || []).includes('PATENT_AND_NPL_SEARCH') ? 'PATENT_AND_NPL' : 'PATENT_ONLY',
    sources: facts.source_types || [],
    known_limitations: facts.search_limitations || [],
  }
}

function assembleDraftSearch(facts, session) {
  const target = buildSearchTarget({ ...facts, target_id: session.searchId })
  const assembled = assembleSearchReport({
    target: { ...target, label: facts.search_target || facts.claim_text || facts.concept_text || 'Untitled search target' },
    scope: facts.scope || {},
    priority: facts.priority_cutoff ? { relevant_cutoff: facts.priority_cutoff, status: facts.priority_status || 'RECORDED' } : null,
    queries: session.queries_run || [],
    sources: facts.source_types?.length ? { sources_queried: facts.source_types, coverage_note: `Coverage claimed only for: ${facts.source_types.join(', ')}.` } : null,
    references: session.selected_references || [],
    mappings: session.mappings || [],
    excluded: session.excluded_references || [],
    gaps: [...(session.flags || []), 'Search completeness reflects defined coverage, never exhaustiveness.'],
    next_steps: ['Expand uncovered source classes.', 'Run classification and citation expansion branches where justified.'],
    verification: ['References, dates, passages, quotes, entailment, and mappings were checked; unverified items are excluded from conclusions.'],
    completeness: session.completeness || 'UNKNOWN',
    report_version: session.reportVersion || 'v1',
  })
  return { ...assembled, target }
}

export function evaluatePriorArtSearchInterviewStep({ session = {}, latestMessage = '', matterContext = {} } = {}) {
  const nextSession = {
    ...session,
    facts: { ...(session.facts || {}) },
    flags: [...(session.flags || [])],
    answers: [...(session.answers || [])],
  }
  if (!nextSession.initialized) {
    const extracted = extractSearchMatterContext(matterContext)
    nextSession.facts = { ...extracted.facts, ...nextSession.facts }
    nextSession.context_status = extracted.status
    nextSession.initialized = true
  }
  const latestText = String(latestMessage || '').trim()

  if (isPatentabilityConfusion(latestText)) {
    return {
      action: 'HANDOFF_PATENTABILITY',
      document_family: 'patent-prior-art-search-report',
      message: 'Finding no close reference does not establish patentability. I will hand the search target, verified references, scope, and limitations to the Patentability Assessment workflow for that determination.',
      handoff: buildSearchHandoff({ kind: 'patentability', payload: {} }),
      flags: ['PATENTABILITY_HANDOFF'],
      session: nextSession,
    }
  }
  if (isNoveltyConfusion(latestText)) {
    return {
      action: 'HANDOFF_NOVELTY',
      document_family: 'patent-prior-art-search-report',
      message: 'The absence of an exact match does not establish novelty. I will hand the claim version, references, passages, and scope to the Patent Novelty Opinion workflow for limitation-level mapping.',
      handoff: buildSearchHandoff({ kind: 'novelty', payload: {} }),
      flags: ['NOVELTY_HANDOFF'],
      session: nextSession,
    }
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
    if (question.id === 'target_version' && !nextSession.flags.includes('TARGET_VERSION_CONFIRMATION_REQUIRED')) {
      nextSession.flags.push('TARGET_VERSION_CONFIRMATION_REQUIRED')
    }
    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-prior-art-search-report',
      single_question: question,
      question,
      questions: [question],
      drafting_status: 'INFORMATION_GATHERING',
      readiness: 'NOT_READY',
      session: nextSession,
      known_facts: nextSession.facts,
      jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED',
    }
  }

  const readiness = assessSearchReadiness(nextSession.facts)
  nextSession.flags = [...new Set([...nextSession.flags, ...readiness.gaps])]
  if (readiness.readiness === 'NOT_READY') {
    return {
      action: 'SCOPE_REQUIRED',
      document_family: 'patent-prior-art-search-report',
      outcome: 'NOT_READY',
      message: 'The search target and scope are not yet defined. No search runs on an undefined target.',
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  if (!nextSession.analysisConfirmed) {
    return {
      action: 'PROMPT_ANALYSIS_CONFIRMATION',
      document_family: 'patent-prior-art-search-report',
      message: 'I have enough information to begin the prior-art search. Would you like me to proceed?',
      pre_analysis_summary: buildPreSearchSummary(nextSession.facts),
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  const draft = assembleDraftSearch(nextSession.facts, nextSession)
  return {
    action: 'DRAFT',
    document_family: 'patent-prior-art-search-report',
    draft_plan: { content: draft.report, profile: 'patent-prior-art-search-report', jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED', status: 'READY_TO_ASSEMBLE', report_version: draft.report_version },
    opinion: draft,
    session: nextSession,
    facts: nextSession.facts,
    readiness,
  }
}

export function buildPriorArtDownstreamHandoff(kind, payload = {}) {
  return buildSearchHandoff({ kind, payload })
}

export { assessSearchReadiness }

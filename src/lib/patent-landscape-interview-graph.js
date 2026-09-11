/**
 * SALLYIP PATENT LANDSCAPE INTERVIEW GRAPH — PART 1
 * Canonical Document #018: matter-first conditional one-question intake.
 *
 * Thin orchestration only: scope capture, readiness, confirmation.
 * Substantive corpus/analytics logic lives in patent-landscape-service.js.
 */

import {
  LANDSCAPE_WORKFLOW_MODES,
  LANDSCAPE_READINESS,
  LANDSCAPE_REVIEW_FLAGS,
  buildLandscapeScope,
  buildSearchStrategy,
  recordSearchIteration,
  buildPatentCorpus,
  versionCorpus,
  normalizeFamilies,
  assessLandscapeStaleness,
  createLandscapeVersion,
  buildLandscapeHandoff,
  assertLandscapeConfidentiality,
  assembleLandscapeReport,
} from './patent-landscape-service.js'

export { LANDSCAPE_READINESS, LANDSCAPE_REVIEW_FLAGS }

export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|not yet|to be determined|broad|whatever you suggest)\b/i.test(clean)
    || /^(pass|tbd|n\/a|no|nope)$/i.test(clean)
}

export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /^(yes|proceed|generate|draft it|yes proceed|go ahead|build (the )?(landscape|report)|prepare it|do it|confirmed|approved)\b/i.test(clean)
    || /\b(proceed with (the )?(landscape|report|analysis)|ready to generate|please generate|generate the report)\b/i.test(clean)
}

export function isFtoBlockingQuestion(text = '') {
  return /\bblock(?:ing|s)?\b.*\b(our|the|this|my) product\b|\bwhich of these\b.*\b(block|cover)\b/i.test(String(text || ''))
}

export function isPatentabilityFromWhitespace(text = '') {
  return /white[- ]?space/i.test(String(text || '')) && /patentable|can we patent/i.test(String(text || ''))
}

const QUESTIONS = [
  {
    id: 'technology_scope', field: 'technology_scope',
    question: 'What technology should the landscape cover — core technology, sub-technologies, and anything explicitly out of scope?',
  },
  {
    id: 'geographic_scope', field: 'jurisdictions',
    question: 'What geographic scope would you like the landscape to cover?',
  },
  {
    id: 'time_range', field: 'time_range',
    question: 'What time period should the corpus cover, and should trends use priority, filing, publication, or grant year?',
  },
  {
    id: 'analysis_objective', field: 'workflow_mode',
    question: 'Do you want a broad technology discovery view or a narrow competitive view — for example technology, competitor, portfolio-comparison, claim-theme, or white-space exploration?',
  },
  {
    id: 'corpus_source', field: 'corpus_source',
    question: 'Should I reuse an existing search set or saved corpus in this matter, or start a new seed search from keywords, classifications, or assignees?',
  },
  {
    id: 'analysis_depth', field: 'analysis_modes',
    question: 'Which evidence should drive the analysis — claims, abstracts, full text, or classifications — and should legal status and citations be included?',
  },
]

export function extractLandscapeMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {}
  const facts = {}
  const status = {}
  const scope = matterContext.landscape_scope || matter.landscape_scope || null
  if (scope?.technology_scope) { facts.technology_scope = scope.technology_scope; status.technology_scope = 'KNOWN' }
  else if (matter.technology_scope || matterContext.technology_scope) { facts.technology_scope = matter.technology_scope || matterContext.technology_scope; status.technology_scope = 'KNOWN' }
  const corpus = matterContext.existing_corpus || matter.patent_corpus || matter.saved_corpus || []
  if (corpus.length) { facts.existing_corpus = corpus; status.existing_corpus = 'KNOWN' }
  const jurisdictions = matterContext.jurisdictions || matter.jurisdictions || matter.landscape_jurisdictions || []
  if (jurisdictions.length) { facts.jurisdictions = jurisdictions; status.jurisdictions = 'KNOWN' }
  const timeRange = matterContext.time_range || matter.time_range || matter.landscape_period
  if (timeRange) { facts.time_range = timeRange; status.time_range = 'KNOWN' }
  const competitors = matterContext.competitors || matter.competitors || matter.known_competitors || []
  if (competitors.length) { facts.competitors = competitors; status.competitors = 'KNOWN' }
  const classifications = matterContext.classifications || matter.classifications || []
  if (classifications.length) { facts.classifications = classifications; status.classifications = 'KNOWN' }
  const mode = matterContext.workflow_mode || matter.landscape_mode
  if (mode) { facts.workflow_mode = mode; status.workflow_mode = 'KNOWN' }
  if (matterContext.search_sources || matter.search_sources) { facts.search_sources = matterContext.search_sources || matter.search_sources; status.search_sources = 'KNOWN' }
  return { facts, status }
}

function applyAnswer(facts, questionId, answer) {
  const value = String(answer || '').trim()
  if (!value) return
  if (questionId === 'technology_scope') facts.technology_scope = value
  else if (questionId === 'geographic_scope') facts.jurisdictions = value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
  else if (questionId === 'time_range') {
    facts.time_range = value
    const basis = value.match(/\b(priority|filing|publication|grant)\b/i)?.[1]
    facts.trend_basis = basis ? `${basis.toUpperCase()}_YEAR` : 'EARLIEST_PRIORITY_YEAR'
  }
  else if (questionId === 'analysis_objective') {
    const upper = value.toUpperCase().replace(/[\s-]+/g, '_')
    const mode = LANDSCAPE_WORKFLOW_MODES.find((m) => upper.includes(m) || m.includes(upper.replace(/_LANDSCAPE|_EXPLORATION/g, '')))
    facts.workflow_mode = mode || 'TECHNOLOGY_LANDSCAPE'
    if (/competitor|portfolio/i.test(value) && !mode) facts.workflow_mode = 'COMPETITOR_LANDSCAPE'
    if (/white/i.test(value) && !mode) facts.workflow_mode = 'WHITE_SPACE_EXPLORATION'
    if (/claim/i.test(value) && !mode) facts.workflow_mode = 'CLAIM_THEME_LANDSCAPE'
  }
  else if (questionId === 'corpus_source') {
    facts.corpus_source = /exist|reuse|saved|matter/i.test(value) ? 'EXISTING_CORPUS' : 'NEW_SEED_SEARCH'
    if (facts.corpus_source === 'NEW_SEED_SEARCH') facts.seed_terms = value
  }
  else if (questionId === 'analysis_depth') {
    facts.analysis_modes = value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    facts.claim_analysis_enabled = /claim/i.test(value)
    facts.citation_analysis_enabled = /citation/i.test(value)
    facts.legal_status_enabled = !/no.*status|without status/i.test(value)
  }
}

function nextQuestion(facts) {
  if (!facts.technology_scope) return QUESTIONS[0]
  if (!(facts.jurisdictions || []).length) return QUESTIONS[1]
  if (!facts.time_range) return QUESTIONS[2]
  if (!facts.workflow_mode) return QUESTIONS[3]
  if (!facts.corpus_source && !(facts.existing_corpus || []).length) return QUESTIONS[4]
  if (!(facts.analysis_modes || []).length) return QUESTIONS[5]
  return null
}

function assessReadiness(facts) {
  const gaps = []
  if (!facts.technology_scope) gaps.push('TECHNOLOGY_SCOPE_REQUIRED')
  if (!(facts.jurisdictions || []).length) gaps.push('GEOGRAPHIC_SCOPE_REQUIRED')
  if (!facts.time_range) gaps.push('TIME_RANGE_REQUIRED')
  if (!facts.workflow_mode) gaps.push('ANALYSIS_OBJECTIVE_REQUIRED')
  if (!(facts.existing_corpus || []).length && !facts.seed_terms && facts.corpus_source !== 'EXISTING_CORPUS') gaps.push('CORPUS_SOURCE_REQUIRED')
  const corpusSize = (facts.existing_corpus || []).length
  if (gaps.length) return { readiness: LANDSCAPE_READINESS.NOT_READY, gaps }
  if (!corpusSize) return { readiness: LANDSCAPE_READINESS.READY_FOR_SEED_SEARCH, gaps }
  const verified = facts.existing_corpus.filter((doc) => doc.verified_existence === true || doc.verified_existence === 'VERIFIED').length
  if (!verified) return { readiness: LANDSCAPE_READINESS.READY_FOR_CORPUS_REVIEW, gaps: ['CORPUS_VERIFICATION_REQUIRED'] }
  if (verified < corpusSize) return { readiness: LANDSCAPE_READINESS.READY_FOR_PRELIMINARY_LANDSCAPE, gaps: ['PARTIAL_CORPUS_VERIFICATION'] }
  return { readiness: LANDSCAPE_READINESS.READY_FOR_VERIFIED_CORPUS_LANDSCAPE, gaps: [] }
}

function sessionIds(session = {}, matterContext = {}, facts = {}) {
  return {
    draftSessionId: session.draftSessionId || matterContext.draftSessionId || 'landscape-session-pending',
    matterId: session.matterId || matterContext.matter?.id || matterContext.matterId || null,
    documentId: 'patent-landscape-report',
    landscapeId: session.landscapeId || `ls-${String(session.matterId || matterContext.matter?.id || facts.technology_scope || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'pending'}`,
  }
}

function buildPreAnalysisSummary(facts, readiness, corpus) {
  return {
    technology_scope: facts.technology_scope || null,
    inclusions: facts.included_concepts || [],
    exclusions: facts.excluded_concepts || [],
    jurisdictions: facts.jurisdictions || [],
    time_range: facts.time_range || null,
    data_sources: facts.search_sources || [],
    corpus_size: corpus?.included_documents?.length || 0,
    family_normalisation: facts.family_normalisation_enabled !== false ? 'ENABLED' : 'DISABLED',
    analysis_modes: facts.analysis_modes || [],
    known_limitations: readiness.gaps || [],
  }
}

function assembleDraftLandscape(facts, session) {
  const scope = buildLandscapeScope({ ...facts, landscape_id: session.landscapeId })
  const corpus = buildPatentCorpus({
    corpus_id: session.corpusId || null,
    scope,
    candidates: facts.existing_corpus || [],
    version: session.corpusVersion || 'corpus_v1',
  })
  const families = normalizeFamilies({ documents: corpus.included_documents })
  const assembled = assembleLandscapeReport({
    scope,
    corpus_metrics: { ...corpus.quality_metrics, families: families.family_count },
    corpus_version: corpus.corpus_version,
    data_quality: facts.data_quality || 'UNKNOWN',
    research_completeness: facts.research_completeness || 'UNKNOWN',
    searches: session.searches || [],
    limitations: [...(readiness_gaps(facts)), 'Unverified documents are excluded from headline metrics.'],
    next_steps: ['Expand jurisdiction or classification coverage where gaps were recorded.', 'Enable claim-theme analysis where claim text becomes available.'],
  })
  return { ...assembled, scope, corpus, families }
}

function readiness_gaps(facts) {
  return assessReadiness(facts).gaps
}

export function evaluatePatentLandscapeInterviewStep({ session = {}, latestMessage = '', matterContext = {} } = {}) {
  const nextSession = {
    ...session,
    facts: { ...(session.facts || {}) },
    flags: [...(session.flags || [])],
    answers: [...(session.answers || [])],
  }
  if (!nextSession.initialized) {
    const extracted = extractLandscapeMatterContext(matterContext)
    nextSession.facts = { ...extracted.facts, ...nextSession.facts }
    nextSession.context_status = extracted.status
    nextSession.initialized = true
  }
  const latestText = String(latestMessage || '').trim()

  if (isFtoBlockingQuestion(latestText)) {
    return {
      action: 'HANDOFF_FTO',
      document_family: 'patent-landscape-report',
      message: 'Identifying which patents could block your product is a Freedom-to-Operate analysis, not a landscape count. I will hand the relevant patents and your product version to the FTO workflow without treating landscape filing share as blocking risk.',
      handoff: buildLandscapeHandoff({ kind: 'fto', payload: { product_version: nextSession.facts.product_version || null } }),
      flags: ['FTO_HANDOFF'],
      session: nextSession,
    }
  }
  if (isPatentabilityFromWhitespace(latestText)) {
    return {
      action: 'HANDOFF_PATENTABILITY',
      document_family: 'patent-landscape-report',
      message: 'A white-space signal is not a patentability conclusion. I will hand the theme, corpus evidence, and gaps to the Patentability Assessment workflow for a proper novelty and obviousness review.',
      handoff: buildLandscapeHandoff({ kind: 'patentability', payload: { theme: nextSession.facts.theme_in_question || null } }),
      flags: ['PATENTABILITY_HANDOFF'],
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
    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-landscape-report',
      single_question: question,
      question,
      questions: [question],
      drafting_status: 'INFORMATION_GATHERING',
      readiness: 'NOT_READY',
      session: nextSession,
      known_facts: nextSession.facts,
      jurisdiction: 'MULTI_JURISDICTION',
    }
  }

  const readiness = assessReadiness(nextSession.facts)
  nextSession.flags = [...new Set([...nextSession.flags, ...readiness.gaps])]
  if (readiness.readiness === 'NOT_READY' || readiness.readiness === 'READY_FOR_SEED_SEARCH') {
    return {
      action: readiness.readiness === 'NOT_READY' ? 'SCOPE_REQUIRED' : 'SEED_SEARCH_REQUIRED',
      document_family: 'patent-landscape-report',
      outcome: readiness.readiness,
      message: readiness.readiness === 'NOT_READY'
        ? 'Scope is not yet defined. No landscape analysis will run on an undefined corpus.'
        : 'Scope is defined but no verified corpus exists yet. A reproducible seed search must run before any landscape claim.',
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  if (!nextSession.analysisConfirmed) {
    const draft = assembleDraftLandscape(nextSession.facts, nextSession)
    return {
      action: 'PROMPT_ANALYSIS_CONFIRMATION',
      document_family: 'patent-landscape-report',
      message: 'I have enough verified corpus data to generate the landscape report. Would you like me to proceed?',
      pre_analysis_summary: buildPreAnalysisSummary(nextSession.facts, readiness, draft.corpus),
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  const draft = assembleDraftLandscape(nextSession.facts, nextSession)
  return {
    action: 'DRAFT',
    document_family: 'patent-landscape-report',
    draft_plan: { content: draft.report, profile: 'patent-landscape-report', jurisdiction: 'MULTI_JURISDICTION', status: 'READY_TO_ASSEMBLE', corpus_version: draft.corpus.corpus_version, family_count: draft.families.family_count },
    opinion: draft,
    session: nextSession,
    facts: nextSession.facts,
    readiness,
  }
}

export function buildLandscapeDownstreamHandoff(kind, payload = {}) {
  return buildLandscapeHandoff({ kind, payload })
}

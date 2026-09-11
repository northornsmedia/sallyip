/**
 * SALLYIP PATENT CLAIM CHART INTERVIEW GRAPH — PART 1
 * Canonical Document #020: matter-first conditional one-question intake.
 *
 * Thin orchestration only: claim/target/purpose capture, readiness,
 * confirmation. Substantive mapping logic lives in
 * patent-claim-chart-service.js (canonical infrastructure for #021+).
 */

import {
  CLAIM_CHART_MODES,
  buildChartTarget,
  identifyChartClaim,
  confirmChartClaimVersion,
  snapshotClaimText,
  decomposeChartClaim,
  validateClaimDependencies,
  buildEvidenceSource,
  buildChartRow,
  buildCanonicalChart,
  renderChartTable,
  summarizeChartMappings,
  detectChartContradictions,
  createChartVersion,
  buildChartHandoff,
  assertChartConfidentiality,
  assembleChartReport,
} from './patent-claim-chart-service.js'

export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|not yet|to be determined)\b/i.test(clean)
    || /^(pass|tbd|n\/a|no|nope)$/i.test(clean)
}

export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase().replace(/[’‘]/g, "'")
  return /^(yes|proceed|chart|chart it|yes proceed|go ahead|start (the )?chart|build it|do it|confirmed|approved)\b/i.test(clean)
    || /\b(proceed with (the )?(chart|mapping)|ready to chart|please chart|build the chart)\b/i.test(clean)
}

export function isInfringementQuestion(text = '') {
  return /\binfringe(?:ment|s|d)?\b/i.test(String(text || ''))
    && /product|process|accused|company|competitor/i.test(String(text || ''))
}

export function isSupportQuestion(text = '') {
  return /\bspecification\b/i.test(String(text || ''))
    && /support|supported|supporting/i.test(String(text || ''))
}

const QUESTIONS = [
  {
    id: 'claim_selection', field: 'claim_selection',
    question: 'I can do that. I’ll first check this matter for an existing patent, claim set and evidence source. Which claim would you like to chart?',
  },
  {
    id: 'claim_version', field: 'claim_version',
    question: 'Which claim version should I chart — published, amended, allowed, or granted? I will not silently choose the latest or broadest.',
  },
  {
    id: 'target_source', field: 'target_source',
    question: 'What evidence should I map against — a reference, patent, product, specification, priority document, standard, or something you will provide? Please identify its exact version.',
  },
  {
    id: 'chart_purpose', field: 'chart_purpose',
    question: 'What is the chart for — general analysis, prior-art review, novelty, invalidity, infringement, FTO, or claim-support review? Purpose routes presentation only, never evidence facts.',
  },
  {
    id: 'constructions', field: 'constructions',
    question: 'Are there claim constructions I should record — plain-language, user-provided, or court construction — or should construction stay unresolved?',
  },
]

export function extractChartMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {}
  const facts = {}
  const status = {}
  const patent = matterContext.patent || matter.patent || matter.publication_number || null
  if (patent) { facts.patent_id = typeof patent === 'string' ? patent : patent.publication_number || patent.id; status.patent_id = 'KNOWN' }
  const claimSets = matterContext.claim_sets || matter.claim_sets || []
  if (claimSets.length) { facts.claim_sets = claimSets; status.claim_sets = 'KNOWN' }
  const claims = matterContext.claims || matter.claims || []
  if (claims.length) { facts.claims = claims; status.claims = 'KNOWN' }
  if (matterContext.claim_version || matter.claim_set_version) { facts.claim_version = matterContext.claim_version || matter.claim_set_version; status.claim_version = 'KNOWN' }
  const targets = matterContext.evidence_sources || matter.evidence_sources || matterContext.references || matter.prior_art_references || []
  if (targets.length) { facts.evidence_sources = targets; status.evidence_sources = 'KNOWN' }
  const charts = matterContext.claim_charts || matter.claim_charts || []
  if (charts.length) { facts.existing_charts = charts; status.existing_charts = 'KNOWN' }
  if (matterContext.chart_purpose || matter.chart_purpose) { facts.chart_purpose = matterContext.chart_purpose || matter.chart_purpose; status.chart_purpose = 'KNOWN' }
  if (matterContext.jurisdiction || matter.jurisdiction) { facts.jurisdiction_context = matterContext.jurisdiction || matter.jurisdiction; status.jurisdiction_context = 'KNOWN' }
  return { facts, status }
}

function applyAnswer(facts, questionId, answer) {
  const value = String(answer || '').trim()
  if (!value) return
  if (questionId === 'claim_selection') {
    facts.claim_selection = value
    const numbers = [...new Set([...value.matchAll(/claim\s+(\d+)/gi)].map((m) => Number(m[1])))]
    if (numbers.length) facts.claim_numbers = numbers
    const patent = value.match(/\b([A-Z]{2}\s?\d[\d\s,\/]*[A-Z]?\d)\b/i)?.[1]
    if (patent && !facts.patent_id) facts.patent_id = patent.trim()
  }
  else if (questionId === 'claim_version') facts.claim_version = value
  else if (questionId === 'target_source') facts.target_source = value
  else if (questionId === 'chart_purpose') {
    const upper = value.toUpperCase()
    const purposes = ['GENERAL_ANALYSIS', 'PRIOR_ART_REVIEW', 'NOVELTY_SUPPORT', 'INVALIDITY_SUPPORT', 'INFRINGEMENT_SUPPORT', 'FTO_SUPPORT', 'CLAIM_SUPPORT_REVIEW', 'PRIORITY_SUPPORT_REVIEW', 'PROSECUTION_REVIEW', 'OTHER']
    facts.chart_purpose = purposes.find((p) => upper.includes(p.replace(/_/g, ' ')) || upper.includes(p)) || 'GENERAL_ANALYSIS'
  }
  else if (questionId === 'constructions') facts.constructions = value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
}

function nextQuestion(facts) {
  if (!facts.claim_selection && !(facts.claims || []).length) return QUESTIONS[0]
  if (!facts.claim_version && ((facts.claim_sets || []).length > 1 || (facts.available_versions || []).length > 1)) return QUESTIONS[1]
  if (!facts.target_source && !(facts.evidence_sources || []).length) return QUESTIONS[2]
  if (!facts.chart_purpose) return QUESTIONS[3]
  if (facts.constructions === undefined) return QUESTIONS[4]
  return null
}

function sessionIds(session = {}, matterContext = {}, facts = {}) {
  return {
    draftSessionId: session.draftSessionId || matterContext.draftSessionId || 'chart-session-pending',
    matterId: session.matterId || matterContext.matter?.id || matterContext.matterId || null,
    documentId: 'patent-claim-chart',
    chartId: session.chartId || `cc-${String(session.matterId || matterContext.matter?.id || facts.patent_id || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'pending'}`,
  }
}

function buildPreChartSummary(facts) {
  return {
    patent: facts.patent_id || null,
    claim_version: facts.claim_version || null,
    claims: facts.claim_numbers || [],
    target_source: facts.target_source || (facts.evidence_sources || []).length || null,
    purpose: facts.chart_purpose || 'GENERAL_ANALYSIS',
    known_gaps: [],
  }
}

function assembleDraftChart(facts, session) {
  const claimNumbers = facts.claim_numbers || [1]
  const claimTexts = {}
  for (const n of claimNumbers) {
    const held = (facts.claims || []).find((c) => Number(c.claim_number) === Number(n))
    claimTexts[n] = held?.claim_text || facts.claim_text || ''
  }
  const decomposed = decomposeChartClaim({
    claims: claimNumbers.map((n) => ({ claim_number: n, claim_text: claimTexts[n], depends_on: [] })),
    claim_set_version: facts.claim_version || 'v1',
  })
  const sources = (facts.evidence_sources || []).length
    ? facts.evidence_sources.map((source, index) => buildEvidenceSource(typeof source === 'string' ? { source_id: `source-${index + 1}`, title: source } : source))
    : [buildEvidenceSource({ source_id: 'source-1', title: facts.target_source || 'Unidentified target', verification_status: 'UNVERIFIED' })]
  const rows = decomposed.limitations.map((limitation) => buildChartRow({
    claim_id: limitation.claim_id,
    limitation,
    source: sources[0],
    mapping_status: 'RESEARCH_REQUIRED',
    verification_status: 'UNVERIFIED',
    notes: 'Evidence pending reviewer mapping.',
  }))
  const chart = buildCanonicalChart({ chart_id: session.chartId, target: buildChartTarget({ ...facts, chart_id: session.chartId }), limitations: decomposed.limitations, rows })
  chart.claim_version = facts.claim_version || null
  chart.sources = sources
  const assembled = assembleChartReport({
    chart,
    patent: { patent_id: facts.patent_id },
    purpose: facts.chart_purpose || 'GENERAL_ANALYSIS',
    gaps: ['Evidence mapping pending reviewer input; unverified material fails closed.'],
    review_items: rows.map((row) => row.row_id),
  })
  return { ...assembled, chart, sources, limitations: decomposed.limitations }
}

export function evaluateClaimChartInterviewStep({ session = {}, latestMessage = '', matterContext = {} } = {}) {
  const nextSession = {
    ...session,
    facts: { ...(session.facts || {}) },
    flags: [...(session.flags || [])],
    answers: [...(session.answers || [])],
  }
  if (!nextSession.initialized) {
    const extracted = extractChartMatterContext(matterContext)
    nextSession.facts = { ...extracted.facts, ...nextSession.facts }
    nextSession.context_status = extracted.status
    nextSession.initialized = true
  }
  const latestText = String(latestMessage || '').trim()

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
    if (question.id === 'claim_version' && !nextSession.flags.includes('CLAIM_VERSION_CONFIRMATION_REQUIRED')) {
      nextSession.flags.push('CLAIM_VERSION_CONFIRMATION_REQUIRED')
    }
    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-claim-chart',
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

  if (!nextSession.analysisConfirmed) {
    return {
      action: 'PROMPT_ANALYSIS_CONFIRMATION',
      document_family: 'patent-claim-chart',
      message: 'I have the claim, version, target source, and purpose needed to build the chart scaffold. Would you like me to proceed? Evidence mapping itself remains reviewer-driven and verification-gated.',
      pre_chart_summary: buildPreChartSummary(nextSession.facts),
      readiness: 'READY_FOR_MAPPING',
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  const draft = assembleDraftChart(nextSession.facts, nextSession)
  return {
    action: 'DRAFT',
    document_family: 'patent-claim-chart',
    draft_plan: { content: draft.report, profile: 'patent-claim-chart', jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED', status: 'READY_TO_ASSEMBLE', chart: draft.chart },
    opinion: draft,
    session: nextSession,
    facts: nextSession.facts,
    readiness: 'READY_FOR_REVIEW',
  }
}


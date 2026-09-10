/**
 * Document #015 orchestration layer. Substantive aggregation remains in the
 * canonical novelty-service; this module only manages matter-first intake,
 * one-question turn taking, readiness, and handoffs.
 */
import { assessNoveltyReadiness, evaluateNoveltyOpinion } from './novelty-service.js'

export const PATENT_NOVELTY_WORKFLOW_MODES = Object.freeze([
  'CLAIM_LEVEL_NOVELTY_OPINION',
  'CONCEPT_LEVEL_NOVELTY_ASSESSMENT',
  'NOVELTY_AGAINST_PROVIDED_REFERENCE',
  'NOVELTY_AGAINST_PROVIDED_REFERENCES',
  'NOVELTY_AFTER_PRIOR_ART_SEARCH',
  'NOVELTY_REASSESSMENT',
  'NOVELTY_AFTER_CLAIM_AMENDMENT',
  'NOVELTY_AFTER_NEW_REFERENCE',
  'MULTI_CLAIM_NOVELTY_REVIEW',
  'JURISDICTION_COMPARISON',
  'PRELIMINARY_NOVELTY_SCREEN',
])

export const PATENT_NOVELTY_REVIEW_FLAGS = Object.freeze([
  'CLAIM_VERSION_CONFIRMATION_REQUIRED',
  'PRIORITY_DATE_REVIEW_REQUIRED',
  'PRIOR_ART_CUTOFF_REVIEW_REQUIRED',
  'REFERENCE_VERIFICATION_FAILED',
  'QUOTE_VERIFICATION_FAILED',
  'CLAIM_CONSTRUCTION_REVIEW_REQUIRED',
  'SOURCE_INTERPRETATION_REVIEW_REQUIRED',
  'ANALYSIS_CONTRADICTION',
  'NOVELTY_OPINION_STALE',
  'RESEARCH_REQUIRED',
  'CONFIDENTIAL_PILOT_BLOCKED',
])

const QUESTIONS = [
  {
    id: 'analysis_target', field: 'target_type',
    question: 'Which exact claim and claim-set version should I assess, or should I perform a clearly labelled concept-level preliminary assessment?',
  },
  {
    id: 'claim_set_version', field: 'claim_set_version',
    question: 'Which claim-set version should I use for this novelty analysis?',
  },
  {
    id: 'jurisdiction', field: 'jurisdiction',
    question: 'Which novelty context should I apply: US, EP, PCT context, or another specified jurisdiction?',
  },
  {
    id: 'priority_context', field: 'priority_context',
    question: 'What filing or priority date context and analysis cutoff should govern this review?',
  },
  {
    id: 'research_status', field: 'research',
    question: 'What prior-art research has been completed for this claim, and what search scope or provided references should I use?',
  },
  {
    id: 'authority', field: 'authority',
    question: 'Do you have a verified, current novelty authority for the selected jurisdiction, or should this remain RESEARCH_REQUIRED pending authority verification?',
  },
]

export function extractNoveltyMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {}
  const artifacts = matterContext.artifacts || matter.documents || []
  const claimSets = matterContext.claim_sets || matter.claim_sets || []
  const directClaims = matterContext.claims || matter.claims || []
  const references = matterContext.references || matter.prior_art_references || []
  const facts = {}
  const status = {}

  const versions = claimSets.map((item) => item.version).filter(Boolean)
  const selectedClaimSet = claimSets.find((item) => item.current === true) || (claimSets.length === 1 ? claimSets[0] : null)
  const claims = selectedClaimSet?.claims || directClaims
  if (claimSets.length && !selectedClaimSet) {
    facts.target_type = claimSets.some((item) => (item.claims || []).length > 1) ? 'CLAIM_SET' : 'CLAIM'
    status.claims = 'INFERRED'
  }
  if (claims.length) {
    facts.claims = claims
    facts.claim_set_id = selectedClaimSet?.id || matter.claim_set_id || null
    status.claims = 'KNOWN'
    facts.target_type = claims.length > 1 ? 'CLAIM_SET' : 'CLAIM'
  }
  if (selectedClaimSet?.version || (versions.length === 1 && versions[0])) {
    facts.claim_set_version = selectedClaimSet?.version || versions[0]
    status.claim_set_version = 'KNOWN'
  } else if (versions.length > 1) {
    status.claim_set_version = 'UNKNOWN'
    facts.available_claim_versions = versions
    facts.available_claim_sets = claimSets.map((item) => ({ id: item.id, version: item.version, claims: item.claims || [] }))
  }
  if (!claims.length && (matter.core_inventive_concept || matter.inventive_concept)) {
    facts.target_type = 'INVENTIVE_CONCEPT'
    facts.concept_text = matter.core_inventive_concept || matter.inventive_concept
    facts.workflow_mode = 'CONCEPT_LEVEL_NOVELTY_ASSESSMENT'
    status.concept_text = 'KNOWN'
  }
  if (matter.jurisdiction || matter.patent_jurisdiction) {
    facts.jurisdiction = matter.jurisdiction || matter.patent_jurisdiction
    status.jurisdiction = 'KNOWN'
  }
  if (matter.priority_context || matter.analysis_cutoff || matter.priority_date) {
    facts.priority_context = matter.priority_context || {
      status: matter.priority_status || 'VERIFIED',
      analysis_cutoff: matter.analysis_cutoff || matter.priority_date,
      priorities: matter.priority_records || [],
    }
    status.priority_context = 'KNOWN'
  }
  if (references.length) {
    facts.references = references
    status.references = 'KNOWN'
  }
  if (matter.research || matter.prior_art_research) {
    facts.research = matter.research || matter.prior_art_research
    status.research = 'KNOWN'
  }
  if (matter.novelty_authority) {
    facts.authority = matter.novelty_authority
    status.authority = matter.novelty_authority.verified ? 'KNOWN' : 'INFERRED'
  }
  facts.inspected_artifact_types = artifacts.map((item) => item.document_type || item.type || item.slug).filter(Boolean)
  return { facts, status }
}

function applyAnswer(facts, questionId, answer) {
  const value = String(answer || '').trim()
  if (!value) return
  if (questionId === 'analysis_target') {
    facts.target_type = /concept/i.test(value) ? 'INVENTIVE_CONCEPT' : /set|multiple|all claims/i.test(value) ? 'CLAIM_SET' : 'CLAIM'
    if (facts.target_type === 'INVENTIVE_CONCEPT') facts.concept_text = value
  } else if (questionId === 'claim_set_version') {
    facts.claim_set_version = value
    const selected = (facts.available_claim_sets || []).find((item) => String(item.version).toLowerCase() === value.toLowerCase())
    if (selected) {
      facts.claim_set_id = selected.id
      facts.claims = selected.claims
      delete facts.available_claim_sets
    }
  }
  else if (questionId === 'jurisdiction') facts.jurisdiction = value
  else if (questionId === 'priority_context') {
    const date = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]
    facts.priority_context = { status: date ? 'VERIFIED' : 'REVIEW_REQUIRED', analysis_cutoff: date || null, user_statement: value }
  } else if (questionId === 'research_status') {
    const status = /no search|not searched/i.test(value) ? 'NOT_SEARCHED' :
      /provided reference|these references|only these/i.test(value) ? 'USER_PROVIDED_ONLY' :
        /structured|completed|full search/i.test(value) ? 'STRUCTURED_SEARCH_COMPLETED' : 'PARTIAL_SEARCH'
    facts.research = { status, scope: value, provenance: 'USER_PROVIDED' }
  } else if (questionId === 'authority') {
    facts.authority = /verified/i.test(value)
      ? { verified: true, authority_id: value, version_or_date: new Date().toISOString().slice(0, 10) }
      : { verified: false }
  }
}

function nextQuestion(facts) {
  if (!facts.target_type) return QUESTIONS[0]
  if (['CLAIM', 'CLAIM_SET'].includes(facts.target_type) && !facts.claim_set_version) return QUESTIONS[1]
  if (!facts.jurisdiction) return QUESTIONS[2]
  if (!facts.priority_context?.analysis_cutoff) return QUESTIONS[3]
  if (!facts.research?.status) return QUESTIONS[4]
  if (!facts.authority?.verified) return QUESTIONS[5]
  return null
}

export function evaluatePatentNoveltyInterviewStep({ session = {}, latestMessage = '', matterContext = {} } = {}) {
  const nextSession = {
    ...session,
    facts: { ...(session.facts || {}) },
    flags: [...(session.flags || [])],
    answers: [...(session.answers || [])],
  }
  if (!nextSession.initialized) {
    const extracted = extractNoveltyMatterContext(matterContext)
    nextSession.facts = { ...extracted.facts, ...nextSession.facts }
    nextSession.context_status = extracted.status
    nextSession.initialized = true
  }
  const requestedClaim = String(latestMessage || '').match(/\bclaim\s+(\d+)\b/i)?.[1]
  if (requestedClaim && !nextSession.facts.claim_number) {
    nextSession.facts.claim_number = Number(requestedClaim)
    nextSession.facts.claim_numbers = [Number(requestedClaim)]
    nextSession.facts.target_type = 'CLAIM'
  }
  if (nextSession.currentQuestionId && String(latestMessage || '').trim()) {
    applyAnswer(nextSession.facts, nextSession.currentQuestionId, latestMessage)
    nextSession.answers.push({ question_id: nextSession.currentQuestionId, answer: latestMessage, timestamp: new Date().toISOString() })
    nextSession.currentQuestionId = null
  }
  const question = nextQuestion(nextSession.facts)
  if (question) {
    nextSession.currentQuestionId = question.id
    if (question.id === 'claim_set_version' && !nextSession.flags.includes('CLAIM_VERSION_CONFIRMATION_REQUIRED')) {
      nextSession.flags.push('CLAIM_VERSION_CONFIRMATION_REQUIRED')
    }
    return {
      action: 'ASK_QUESTION',
      single_question: question,
      questions: [question],
      drafting_status: 'INFORMATION_GATHERING',
      readiness: 'NOT_READY',
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  const readiness = assessNoveltyReadiness(nextSession.facts)
  nextSession.flags = [...new Set([...nextSession.flags, ...readiness.gaps])]
  if (readiness.readiness === 'NOT_READY') {
    return {
      action: 'RESEARCH_REQUIRED',
      outcome: 'RESEARCH_REQUIRED',
      message: 'A definitive novelty conclusion is not available. The recorded gaps must be resolved or the scope must be limited before analysis.',
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    }
  }
  if (!session.analysisConfirmed) {
    return {
      action: 'PROMPT_ANALYSIS_CONFIRMATION',
      message: 'I have enough verified information to perform the novelty analysis against the current evidence. Would you like me to proceed?',
      pre_analysis_summary: {
        target_type: nextSession.facts.target_type,
        claim_set_version: nextSession.facts.claim_set_version || null,
        jurisdiction: nextSession.facts.jurisdiction,
        analysis_cutoff: nextSession.facts.priority_context?.analysis_cutoff,
        reference_count: nextSession.facts.references?.length || 0,
        research_status: nextSession.facts.research?.status,
        uncertainties: nextSession.flags,
      },
      readiness,
      session: nextSession,
    }
  }
  const opinion = evaluateNoveltyOpinion(nextSession.facts)
  return { action: 'DRAFT', document_family: 'patent-novelty-opinion', opinion, session: nextSession, readiness }
}

export function buildNoveltyHandoff(opinion = {}, target) {
  const allowed = ['patent-claims-set', 'patentability-assessment', 'patent-prior-art-search-report', 'inventive-step-analysis']
  if (!allowed.includes(target)) throw new Error('Unsupported Patent Novelty Opinion handoff')
  return {
    source_workflow: 'patent-novelty-opinion',
    target_workflow: target,
    claims: opinion.claims || [],
    limitation_matrix: opinion.matrix || [],
    references: opinion.references || [],
    jurisdiction: opinion.readiness?.jurisdiction || null,
    research_gaps: opinion.readiness?.gaps || [],
    automatic_claim_amendment: false,
  }
}

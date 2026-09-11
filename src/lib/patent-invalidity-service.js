/**
 * SALLYIP PATENT INVALIDITY SERVICE — PART 1
 * Canonical Document #017: Patent Invalidity Opinion (substantive engine).
 *
 * Reuses the SAME shared engines (no parallel invalidity/prior-art/novelty/
 * claim/verification engines):
 * - canonical claim model: patent-claim-service.js
 * - novelty logic: novelty-service.js (Document #015 engine)
 * - legal status: fto-opinion-service.js
 * - entailment / temporal / contradiction / claim-chart overlap helpers
 * - provider confidentiality + export payload helpers
 *
 * Enforces: NO VERIFIED CLAIM + NO VERIFIED GROUND + NO SUPPORTING
 * EVIDENCE = NO INVALIDITY ASSERTION.
 */

import { parsePatentClaims, buildEffectiveClaimLimitations } from './patent-claim-service.js'
import {
  evaluateNoveltyOpinion,
  buildNoveltyEvidenceMatrix,
  validateNoveltyReference,
  assessPriorityContext,
  detectAnalysisContradictions,
  buildNoveltyEvidenceGraph,
  NOVELTY_OUTCOMES,
  noveltyFramework,
} from './novelty-service.js'
import { verifyLegalStatus, LEGAL_STATUSES } from './fto-opinion-service.js'
import { checkEntailment } from './entailment-service.js'
import { validateAuthorityCurrency } from './temporal-service.js'
import { classifyContradiction } from './contradiction-service.js'
import { evidenceOverlap } from './claim-chart-service.js'
import { assertChatAllowed } from './provider-policy.js'

export const INVALIDITY_WORKFLOW_MODES = Object.freeze([
  'PRELIMINARY_INVALIDITY_SCREEN',
  'FULL_INVALIDITY_ASSESSMENT',
  'INVALIDITY_AGAINST_PROVIDED_PRIOR_ART',
  'INVALIDITY_AFTER_PRIOR_ART_SEARCH',
  'NOVELTY_BASED_INVALIDITY',
  'OBVIOUSNESS_BASED_INVALIDITY',
  'INVENTIVE_STEP_BASED_INVALIDITY',
  'DISCLOSURE_SUPPORT_INVALIDITY',
  'ADDED_MATTER_INVALIDITY',
  'PRIORITY_ENTITLEMENT_REVIEW',
  'ELIGIBILITY_OR_SUBJECT_MATTER_REVIEW',
  'MULTI_GROUND_INVALIDITY',
  'MULTI_CLAIM_INVALIDITY',
  'INVALIDITY_REASSESSMENT',
  'INVALIDITY_AFTER_CLAIM_CHANGE',
  'INVALIDITY_AFTER_NEW_REFERENCE',
  'JURISDICTION_COMPARISON',
])

export const INVALIDITY_JURISDICTIONS = Object.freeze(['US', 'EP', 'OTHER', 'UNDECIDED'])

export const INVALIDITY_GROUNDS = Object.freeze({
  US: Object.freeze([
    { ground_id: 'US_102_NOVELTY', legal_basis: '35 U.S.C. § 102', label: 'Lack of novelty / anticipation', requires_single_reference: true },
    { ground_id: 'US_103_OBVIOUSNESS', legal_basis: '35 U.S.C. § 103', label: 'Obviousness', requires_single_reference: false },
    { ground_id: 'US_112A_WRITTEN_DESCRIPTION', legal_basis: '35 U.S.C. § 112(a)', label: 'Lack of written description', requires_single_reference: false },
    { ground_id: 'US_112A_ENABLEMENT', legal_basis: '35 U.S.C. § 112(a)', label: 'Lack of enablement', requires_single_reference: false },
    { ground_id: 'US_112B_DEFINITENESS', legal_basis: '35 U.S.C. § 112(b)', label: 'Indefiniteness', requires_single_reference: false },
    { ground_id: 'US_101_ELIGIBILITY', legal_basis: '35 U.S.C. § 101', label: 'Ineligible subject matter', requires_single_reference: false },
  ]),
  EP: Object.freeze([
    { ground_id: 'EP_54_NOVELTY', legal_basis: 'Article 54 EPC', label: 'Lack of novelty', requires_single_reference: true },
    { ground_id: 'EP_56_INVENTIVE_STEP', legal_basis: 'Article 56 EPC', label: 'Lack of inventive step', requires_single_reference: false },
    { ground_id: 'EP_83_SUFFICIENCY', legal_basis: 'Article 83 EPC', label: 'Insufficient disclosure', requires_single_reference: false },
    { ground_id: 'EP_123_2_ADDED_MATTER', legal_basis: 'Article 123(2) EPC', label: 'Added subject matter', requires_single_reference: false },
    { ground_id: 'EP_84_CLARITY', legal_basis: 'Article 84 EPC', label: 'Lack of clarity / support', requires_single_reference: false },
    { ground_id: 'EP_52_EXCLUSION', legal_basis: 'Article 52 EPC', label: 'Excluded subject matter', requires_single_reference: false },
  ]),
})

export const GROUND_ELIGIBILITY = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  POTENTIALLY_AVAILABLE: 'POTENTIALLY_AVAILABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
})

export const INVALIDITY_CLAIM_OUTCOMES = Object.freeze({
  MATERIAL_INVALIDITY_ARGUMENT: 'MATERIAL_INVALIDITY_ARGUMENT',
  POTENTIAL_INVALIDITY_ARGUMENT: 'POTENTIAL_INVALIDITY_ARGUMENT',
  EVIDENCE_MIXED: 'EVIDENCE_MIXED',
  NO_MATERIAL_ARGUMENT_IDENTIFIED_WITHIN_SCOPE: 'NO_MATERIAL_ARGUMENT_IDENTIFIED_WITHIN_SCOPE',
  INCONCLUSIVE: 'INCONCLUSIVE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
})

export const INVALIDITY_OVERALL_OUTCOMES = Object.freeze({
  MATERIAL_VALIDITY_CHALLENGES_IDENTIFIED: 'MATERIAL_VALIDITY_CHALLENGES_IDENTIFIED',
  MIXED: 'MIXED',
  LIMITED_CHALLENGE_IDENTIFIED: 'LIMITED_CHALLENGE_IDENTIFIED',
  NO_MATERIAL_INVALIDITY_CASE_IDENTIFIED_WITHIN_SCOPE: 'NO_MATERIAL_INVALIDITY_CASE_IDENTIFIED_WITHIN_SCOPE',
  INCONCLUSIVE: 'INCONCLUSIVE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
})

export const INVALIDITY_READINESS = Object.freeze({
  NOT_READY: 'NOT_READY',
  READY_FOR_REFERENCE_SPECIFIC_SCREEN: 'READY_FOR_REFERENCE_SPECIFIC_SCREEN',
  READY_FOR_GROUND_SPECIFIC_ASSESSMENT: 'READY_FOR_GROUND_SPECIFIC_ASSESSMENT',
  READY_FOR_EVIDENCE_BASED_INVALIDITY_ANALYSIS: 'READY_FOR_EVIDENCE_BASED_INVALIDITY_ANALYSIS',
})

export const INVALIDITY_REVIEW_FLAGS = Object.freeze({
  CLAIM_VERSION_CONFIRMATION_REQUIRED: 'CLAIM_VERSION_CONFIRMATION_REQUIRED',
  NEWER_CLAIM_VERSION_AVAILABLE: 'NEWER_CLAIM_VERSION_AVAILABLE',
  CLAIM_CONSTRUCTION_REVIEW_REQUIRED: 'CLAIM_CONSTRUCTION_REVIEW_REQUIRED',
  REFERENCE_VERIFICATION_FAILED: 'REFERENCE_VERIFICATION_FAILED',
  QUOTE_VERIFICATION_FAILED: 'QUOTE_VERIFICATION_FAILED',
  PRIORITY_ENTITLEMENT_REVIEW_REQUIRED: 'PRIORITY_ENTITLEMENT_REVIEW_REQUIRED',
  PROSECUTION_HISTORY_REVIEW_REQUIRED: 'PROSECUTION_HISTORY_REVIEW_REQUIRED',
  HINDSIGHT_RISK: 'HINDSIGHT_RISK',
  COMBINATION_FEASIBILITY_REVIEW_REQUIRED: 'COMBINATION_FEASIBILITY_REVIEW_REQUIRED',
  ANALYSIS_CONTRADICTION: 'ANALYSIS_CONTRADICTION',
  AUTHORITY_CONFLICT_REQUIRES_REVIEW: 'AUTHORITY_CONFLICT_REQUIRES_REVIEW',
  EVIDENCE_CONFLICT_REQUIRES_REVIEW: 'EVIDENCE_CONFLICT_REQUIRES_REVIEW',
  INVALIDITY_OPINION_STALE: 'INVALIDITY_OPINION_STALE',
  MISCONDUCT_ANALYSIS_REQUIRES_SPECIALIST_REVIEW: 'MISCONDUCT_ANALYSIS_REQUIRES_SPECIALIST_REVIEW',
  JURISDICTION_RESEARCH_REQUIRED: 'JURISDICTION_RESEARCH_REQUIRED',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
})

export const INVALIDITY_PROPOSITIONS = Object.freeze([
  'PATENT_METADATA_FACT', 'CLAIM_FACT', 'PRIOR_ART_FACT', 'PUBLIC_AVAILABILITY_FACT',
  'PRIORITY_FACT', 'LEGAL_RULE', 'TECHNICAL_INFERENCE', 'LEGAL_ANALYSIS',
  'COUNTERARGUMENT', 'CONCLUSION', 'UNCERTAINTY',
])

export const SUPPORT_STATUSES = Object.freeze({
  EXPLICIT_SUPPORT: 'EXPLICIT_SUPPORT',
  IMPLICIT_SUPPORT_REVIEW_REQUIRED: 'IMPLICIT_SUPPORT_REVIEW_REQUIRED',
  PARTIAL_SUPPORT: 'PARTIAL_SUPPORT',
  NOT_IDENTIFIED: 'NOT_IDENTIFIED',
  AMBIGUOUS: 'AMBIGUOUS',
})

export const PRIORITY_SUPPORT_STATUSES = Object.freeze({
  SUPPORTED: 'SUPPORTED',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  NOT_IDENTIFIED: 'NOT_IDENTIFIED',
  AMBIGUOUS: 'AMBIGUOUS',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
})

export const RATIONALE_SUPPORT = Object.freeze({
  SOURCE_SUPPORTED: 'SOURCE_SUPPORTED',
  TECHNICALLY_SUPPORTED_REVIEW_REQUIRED: 'TECHNICALLY_SUPPORTED_REVIEW_REQUIRED',
  INFERRED: 'INFERRED',
  UNSUPPORTED: 'UNSUPPORTED',
})

const BANNED_OUTCOME_PHRASES = [
  'patent is invalid', 'claim is invalid', 'certainly invalid', 'likely cancelled',
  'will be revoked', 'patent is valid', 'claims are valid', 'definitely invalid',
  'definitely valid',
]

export function normalizeJurisdiction(value = '') {
  const clean = String(value || '').trim().toUpperCase()
  if (['US', 'USA', 'USPTO', 'UNITED STATES'].includes(clean)) return 'US'
  if (['EP', 'EPO', 'EPC', 'EUROPE', 'EUROPEAN'].includes(clean)) return 'EP'
  if (['OTHER', 'PCT', 'WIPO'].includes(clean)) return 'OTHER'
  return 'UNDECIDED'
}

// ---------- Target right (§12–§14) ----------

export function buildInvalidityTarget(input = {}) {
  return {
    right_id: input.right_id || input.publication_number || input.patent_number || null,
    publication_number: input.publication_number || null,
    patent_number: input.patent_number || null,
    application_number: input.application_number || null,
    jurisdiction: normalizeJurisdiction(input.jurisdiction),
    family_id: input.family_id || null,
    status: input.status || 'STATUS_UNCERTAIN',
    status_checked_at: input.status_checked_at || null,
    claim_set_version: input.claim_set_version || null,
    selected_claims: Array.isArray(input.selected_claims) ? input.selected_claims.map(Number) : [],
    assessment_date: new Date().toISOString().slice(0, 10),    verified_existence: input.verified_existence ?? null,    unverified_number: input.unverified_number ?? null,
  }
}

export function verifyTargetRight(target = {}) {
  const issues = []
  if (!target.right_id && !target.publication_number && !target.patent_number && !target.application_number) {
    issues.push('RIGHT_IDENTITY_REQUIRED')
  }
  if (target.jurisdiction === 'UNDECIDED') issues.push('JURISDICTION_REQUIRED')
  if (target.verified_existence === false || target.unverified_number) {
    return { verification: 'FAILED', issues: [...issues, 'RIGHT_VERIFICATION_FAILED'], target }
  }
  if (target.verified_existence !== true && target.verified_existence !== 'VERIFIED') {
    return { verification: 'RESEARCH_REQUIRED', issues: [...issues, 'RIGHT_EXISTENCE_UNVERIFIED'], target }
  }
  if (issues.length) return { verification: 'UNVERIFIED', issues, target }
  return { verification: 'VERIFIED', issues: [], target }
}

export function verifyRightLegalStatus(patent = {}) {
  return verifyLegalStatus(patent)
}

// ---------- Operative claim set & versions (§15–§16) ----------

export function resolveOperativeClaimSet({ claimSets = [], requestedVersion = null } = {}) {
  if (!claimSets.length) {
    return { status: 'RESEARCH_REQUIRED', operative: null, flags: ['CLAIM_SET_UNVERIFIED'] }
  }
  if (claimSets.length === 1 && !requestedVersion) {
    return { status: 'VERIFIED', operative: claimSets[0], flags: [] }
  }
  const requested = requestedVersion
    ? claimSets.find((item) => String(item.version) === String(requestedVersion))
    : claimSets.find((item) => item.current === true)
  if (requested) {
    const flags = claimSets.length > 1 ? ['NEWER_CLAIM_VERSION_AVAILABLE'] : []
    return { status: 'VERIFIED', operative: requested, flags }
  }
  return {
    status: 'CLAIM_VERSION_CONFIRMATION_REQUIRED',
    operative: null,
    flags: ['CLAIM_VERSION_CONFIRMATION_REQUIRED'],
    available_versions: claimSets.map((item) => item.version),
  }
}

// ---------- Claim decomposition (§17–§18, canonical claim model) ----------

export function decomposeTargetClaims({ claim_text = '', claims = [], claim_set_version = null } = {}) {
  const parsed = claims.length ? claims : parsePatentClaims(claim_text)
  const effective = buildEffectiveClaimLimitations(parsed, claim_set_version)
  return { parsed, effective }
}

export function effectiveLimitationsForClaim(effectiveClaims = [], claimNumber) {
  const claim = effectiveClaims.find((item) => Number(item.claim_number) === Number(claimNumber))
  return claim ? claim.full_effective_limitations || [] : []
}

// ---------- Ground model & eligibility (§21–§23) ----------

export function groundsForJurisdiction(jurisdiction) {
  return INVALIDITY_GROUNDS[normalizeJurisdiction(jurisdiction)] || []
}

export function assessGroundEligibility({ ground_id, jurisdiction, authority = null } = {}) {
  const normalized = normalizeJurisdiction(jurisdiction)
  if (normalized === 'UNDECIDED' || normalized === 'OTHER') {
    return { ground_id, eligibility: GROUND_ELIGIBILITY.RESEARCH_REQUIRED, reason: 'Jurisdiction-specific availability cannot be established without a verified validity jurisdiction.' }
  }
  const ground = groundsForJurisdiction(normalized).find((item) => item.ground_id === ground_id)
  if (!ground) {
    return { ground_id, eligibility: GROUND_ELIGIBILITY.NOT_APPLICABLE, reason: `Ground ${ground_id} is not part of the ${normalized} validity framework.` }
  }
  if (!authority || authority.verified !== true) {
    return { ground_id, eligibility: GROUND_ELIGIBILITY.POTENTIALLY_AVAILABLE, reason: 'Ground exists in the jurisdiction but the governing authority version is unverified.', legal_basis: ground.legal_basis }
  }
  return { ground_id, eligibility: GROUND_ELIGIBILITY.AVAILABLE, reason: 'Ground available under verified authority.', legal_basis: ground.legal_basis }
}

// ---------- Reference verification (§27, §65–§68) ----------

export function verifyInvalidityReference(reference = {}) {
  const gate = validateNoveltyReference(reference)
  return {
    reference_id: reference.reference_id || null,
    status: gate.status === 'VERIFIED' ? 'VERIFIED' : 'FAILED',
    code: gate.status === 'VERIFIED' ? null : 'REFERENCE_VERIFICATION_FAILED',
    issues: gate.issues || [],
    usable_for_conclusion: gate.usable_for_conclusion === true,
  }
}

export function normalizeQuoteForComparison(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function verifyEvidenceQuote({ quote = '', passages = [] } = {}) {
  if (!quote || !String(quote).trim()) return { status: 'NO_QUOTE_SUPPLIED', code: null }
  const normalizedQuote = normalizeQuoteForComparison(quote)
  for (const passage of passages) {
    const content = String(passage.content || '')
    if (content.includes(String(quote))) return { status: 'EXACT', code: null, passage_id: passage.passage_id || null }
    if (normalizeQuoteForComparison(content).includes(normalizedQuote) && normalizedQuote.length >= 12) {
      return { status: 'FUZZY_REVIEW_REQUIRED', code: null, passage_id: passage.passage_id || null }
    }
  }
  return { status: 'NOT_FOUND', code: 'QUOTE_VERIFICATION_FAILED' }
}

export function assessPassageEntailment({ proposition = '', passageContent = '' } = {}) {
  const result = checkEntailment(proposition, passageContent)
  const map = {
    ENTAILS: 'ENTAILED',
    PARTIALLY_SUPPORTS: 'PARTIALLY_ENTAILED',
    CONTEXT_ONLY: 'AMBIGUOUS',
    DOES_NOT_SUPPORT: 'NOT_ENTAILED',
    CONTRADICTS: 'NOT_ENTAILED',
  }
  return { verdict: result.verdict, status: map[result.verdict] || 'AMBIGUOUS', score: result.score, reasons: result.reasons }
}

// ---------- Temporal validation & priority (§30–§33) ----------

export function validateEvidenceTiming({ publication_date = null, public_availability_date = null, priority_date = null, filing_date = null, relevant_cutoff = null } = {}) {
  if (!publication_date && !public_availability_date) {
    return { temporal_status: 'UNKNOWN', issues: ['TEMPORAL_ANALYSIS_UNCERTAIN'] }
  }
  const effective = public_availability_date || publication_date
  const cutoff = relevant_cutoff || priority_date || filing_date
  if (!cutoff) return { temporal_status: 'UNKNOWN', effective_date: effective, issues: ['RELEVANT_CUTOFF_UNRESOLVED'] }
  if (String(effective) < String(cutoff)) {
    return { temporal_status: 'TEMPORALLY_RELEVANT', effective_date: effective, cutoff }
  }
  return { temporal_status: 'TEMPORALLY_NOT_RELEVANT', effective_date: effective, cutoff }
}

export function assessPrioritySupport({ limitations = [], priority_documents = [] } = {}) {
  const context = assessPriorityContext({ priorities: priority_documents })
  return limitations.map((limitation) => {
    const text = limitation.exact_text || limitation.text || String(limitation)
    const supporting = (priority_documents || []).filter((doc) =>
      (doc.supported_limitations || []).some((item) => normalizeQuoteForComparison(item) === normalizeQuoteForComparison(text)))
    if (!priority_documents.length) return { limitation: text, status: PRIORITY_SUPPORT_STATUSES.RESEARCH_REQUIRED, support_location: null }
    if (!supporting.length) return { limitation: text, status: PRIORITY_SUPPORT_STATUSES.NOT_IDENTIFIED, support_location: null }
    return { limitation: text, status: PRIORITY_SUPPORT_STATUSES.SUPPORTED, support_location: supporting[0].location || supporting[0].document_id || null }
  }).map((row) => ({ ...row, priority_context: context }))
}

export function priorityConsequence({ supportMap = [] } = {}) {
  const deficient = supportMap.filter((row) => [PRIORITY_SUPPORT_STATUSES.NOT_IDENTIFIED, PRIORITY_SUPPORT_STATUSES.AMBIGUOUS].includes(row.status))
  if (!deficient.length) return { flag: null, note: 'No priority-support deficiency identified on the supplied mapping.' }
  return {
    flag: 'PRIORITY_ENTITLEMENT_REVIEW_REQUIRED',
    affected_limitations: deficient.map((row) => row.limitation),
    note: 'Priority entitlement is questioned for the listed limitations; intervening references may become conditionally relevant. Priority is not stripped.',
  }
}

// ---------- Novelty-based invalidity (§34–§36, reuses Document #015 engine) ----------

export function assessNoveltyInvalidityGround(input = {}) {
  const opinion = evaluateNoveltyOpinion({ ...input, target_type: input.target_type || 'CLAIM' })
  const matrix = opinion.matrix || []
  const selected = new Set((input.claim_numbers || (input.claim_number ? [input.claim_number] : matrix.map((row) => row.claim_number))).map(Number))
  const contradictions = detectAnalysisContradictions(matrix, input.narrative_assertions || [])
  const claimResults = [...selected].map((claimNumber) => {
    const rows = matrix.filter((row) => Number(row.claim_number) === Number(claimNumber))
    const byReference = new Map()
    for (const row of rows) {
      if (!byReference.has(row.reference_id)) byReference.set(row.reference_id, [])
      byReference.get(row.reference_id).push(row)
    }
    const fullyDisclosing = [...byReference.entries()]
      .filter(([, refRows]) => refRows.length > 0 && refRows.every((row) => row.disclosure_status === 'EXPLICITLY_DISCLOSED'))
      .map(([reference_id]) => reference_id)
    const anyResearchRequired = rows.some((row) => row.disclosure_status === 'RESEARCH_REQUIRED' || (row.verification_failures || []).length > 0)
    const explicitRefs = new Set(rows.filter((row) => row.disclosure_status === 'EXPLICITLY_DISCLOSED').map((row) => row.reference_id))
    let outcome = INVALIDITY_CLAIM_OUTCOMES.NO_MATERIAL_ARGUMENT_IDENTIFIED_WITHIN_SCOPE
    if (fullyDisclosing.length > 0) outcome = INVALIDITY_CLAIM_OUTCOMES.MATERIAL_INVALIDITY_ARGUMENT
    else if (anyResearchRequired) outcome = INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED
    else if (explicitRefs.size === 1) outcome = INVALIDITY_CLAIM_OUTCOMES.POTENTIAL_INVALIDITY_ARGUMENT
    return { claim_number: claimNumber, outcome, fully_disclosing_references: fullyDisclosing, rows: rows.length }
  })
  return { engine: 'patent-novelty-opinion', novelty_outcome: opinion.outcome, claim_results: claimResults, contradictions, flags: opinion.flags || [] }
}

// ---------- Combination / obviousness / inventive step (§37–§43) ----------

export function assessCombinationGraph({ claim_number, references = [], combination_rationale = '', rationale_support = 'UNSPECIFIED', technical_feasibility = 'UNKNOWN', jurisdiction = 'UNDECIDED', framework = null } = {}) {
  const flags = []
  const normalized = normalizeJurisdiction(jurisdiction)
  if (normalized !== 'US' && normalized !== 'EP') flags.push('JURISDICTION_RESEARCH_REQUIRED')
  if (!references.length || references.length < 2) {
    return { claim_number, status: 'RESEARCH_REQUIRED', outcome: INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED, flags: [...flags, 'COMBINATION_REQUIRES_TWO_REFERENCES'], note: 'A combination argument requires at least two verified references.' }
  }
  const unverified = references.filter((ref) => verifyInvalidityReference(ref).status !== 'VERIFIED')
  if (unverified.length) flags.push('REFERENCE_VERIFICATION_FAILED')
  const support = Object.values(RATIONALE_SUPPORT).includes(rationale_support) ? rationale_support : 'UNSPECIFIED'
  if (support === RATIONALE_SUPPORT.UNSUPPORTED || support === 'UNSPECIFIED' || !String(combination_rationale).trim()) {
    flags.push('HINDSIGHT_RISK')
    return {
      claim_number, status: 'RATIONALE_GAP', outcome: INVALIDITY_CLAIM_OUTCOMES.INCONCLUSIVE, flags,
      note: 'Features found across references do not establish a combination argument without a supported reason to combine. Hindsight reconstruction is not permitted.',
    }
  }
  if (support === RATIONALE_SUPPORT.INFERRED) flags.push('HINDSIGHT_RISK')
  if (technical_feasibility === 'INCOMPATIBLE') flags.push('COMBINATION_FEASIBILITY_REVIEW_REQUIRED')
  if (technical_feasibility === 'UNKNOWN') flags.push('COMBINATION_FEASIBILITY_REVIEW_REQUIRED')
  const outcome = flags.includes('REFERENCE_VERIFICATION_FAILED')
    ? INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED
    : support === RATIONALE_SUPPORT.SOURCE_SUPPORTED && technical_feasibility === 'FEASIBLE'
      ? INVALIDITY_CLAIM_OUTCOMES.POTENTIAL_INVALIDITY_ARGUMENT
      : INVALIDITY_CLAIM_OUTCOMES.INCONCLUSIVE
  return {
    claim_number,
    status: 'ASSESSED',
    outcome,
    flags,
    combination: { references: references.map((ref) => ref.reference_id), rationale: combination_rationale, rationale_support: support, technical_feasibility, framework: framework || (normalized === 'EP' ? 'EPO problem-solution' : 'US obviousness framework (verified authority required)') },
  }
}

export function assessTechnicalEffect({ feature = '', effect = '', evidence = null } = {}) {
  if (!effect) return { feature, status: 'UNSUPPORTED', note: 'No technical effect asserted.' }
  if (!evidence) return { feature, effect, status: 'USER_ASSERTED', note: 'Effect recorded as user-asserted; weight requires a supported framework.' }
  const entailment = assessPassageEntailment({ proposition: `${feature} ${effect}`, passageContent: evidence.content || '' })
  if (entailment.status === 'ENTAILED') return { feature, effect, status: 'SUPPORTED', evidence: evidence.passage_id || null }
  if (entailment.status === 'PARTIALLY_ENTAILED') return { feature, effect, status: 'INFERRED_REVIEW_REQUIRED', evidence: evidence.passage_id || null }
  return { feature, effect, status: 'UNSUPPORTED', evidence: evidence.passage_id || null }
}

// ---------- Disclosure / support / added matter / enablement / clarity (§46–§51) ----------

export function mapLimitationSupport({ limitation = '', original_disclosure = '', source_location = null } = {}) {
  const normLimitation = normalizeQuoteForComparison(limitation)
  const normDisclosure = normalizeQuoteForComparison(original_disclosure)
  if (!normDisclosure) return { limitation, status: SUPPORT_STATUSES.NOT_IDENTIFIED, source_location, note: 'No original disclosure supplied for comparison.' }
  if (normDisclosure.includes(normLimitation) && normLimitation.length >= 8) {
    return { limitation, status: SUPPORT_STATUSES.EXPLICIT_SUPPORT, source_location }
  }
  const overlap = evidenceOverlap(limitation, original_disclosure)
  if (overlap && (overlap.score >= 0.6 || overlap.overlap >= 0.6)) {
    return { limitation, status: SUPPORT_STATUSES.IMPLICIT_SUPPORT_REVIEW_REQUIRED, source_location, overlap }
  }
  if (overlap && (overlap.score >= 0.3 || overlap.overlap >= 0.3)) {
    return { limitation, status: SUPPORT_STATUSES.PARTIAL_SUPPORT, source_location, overlap }
  }
  return { limitation, status: SUPPORT_STATUSES.AMBIGUOUS, source_location }
}

export function assessAddedMatter({ supportMap = [], jurisdiction = 'UNDECIDED' } = {}) {
  const candidates = supportMap.filter((row) => [SUPPORT_STATUSES.NOT_IDENTIFIED, SUPPORT_STATUSES.AMBIGUOUS].includes(row.status))
  if (!candidates.length) return { flag: null, outcome: INVALIDITY_CLAIM_OUTCOMES.NO_MATERIAL_ARGUMENT_IDENTIFIED_WITHIN_SCOPE, rows: [] }
  return {
    flag: 'POTENTIAL_ADDED_MATTER',
    outcome: INVALIDITY_CLAIM_OUTCOMES.POTENTIAL_INVALIDITY_ARGUMENT,
    rows: candidates,
    note: 'Wording differences alone do not establish added matter; each candidate requires exact source mapping and jurisdictional review.',
  }
}

export function screenEnablementSufficiency({ claim_breadth = '', working_examples = [], unpredictability = 'UNKNOWN', missing_detail = '' } = {}) {
  const signals = []
  if (working_examples.length === 0) signals.push('NO_WORKING_EXAMPLE_SUPPLIED')
  if (unpredictability === 'HIGH') signals.push('UNPREDICTABLE_ART_REVIEW')
  if (missing_detail) signals.push('MISSING_DETAIL_ASSERTED')
  if (!signals.length) return { status: 'NO_MATERIAL_ISSUE_IDENTIFIED_WITHIN_SCOPE', signals }
  return { status: 'POTENTIAL_DISCLOSURE_ISSUE', signals, note: 'Heuristic signals only; sufficiency requires evidence and authority-backed review, never a mechanical conclusion.' }
}

export function screenClaimClarity({ claim_text = '' } = {}) {
  const text = String(claim_text || '')
  const issues = []
  const defined = new Set([...text.matchAll(/\b(?:a|an)\s+([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,2})/gi)].map((m) => m[1].toLowerCase()))
  for (const m of text.matchAll(/\b(?:the|said)\s+([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,2})/gi)) {
    if (!defined.has(m[1].toLowerCase())) issues.push({ type: 'ANTECEDENT_BASIS', term: m[1] })
  }
  if (/\b(whereby|wherein)\b/i.test(text) && text.length > 600) issues.push({ type: 'RELATIONSHIP_COMPLEXITY_REVIEW', term: 'lengthy functional language' })
  return { structural_flags: issues, note: 'Structural flags only; a drafting defect becomes an invalidity conclusion only under a verified legal framework.' }
}

// ---------- Counterarguments & challenge (§62–§63) ----------

export function synthesizeCounterarguments({ claim_number, ground_id, matrix_rows = [], temporal = null, priority = null, combination = null } = {}) {
  const points = []
  const missing = (matrix_rows || []).filter((row) => ['NOT_IDENTIFIED', 'PARTIALLY_DISCLOSED', 'AMBIGUOUS', 'RESEARCH_REQUIRED'].includes(row.disclosure_status))
  if (missing.length) points.push(`Reference evidence does not establish disclosure for: ${missing.map((row) => row.limitation_id || row.limitation).join(', ')}.`)
  if (temporal && temporal.temporal_status !== 'TEMPORALLY_RELEVANT') points.push('Timing and public-availability foundations are uncertain; the reference may not qualify as prior art.')
  if (priority && priority.flag) points.push('Priority entitlement may survive review, which would remove intervening references from the prior-art base.')
  if (combination && (combination.flags || []).includes('HINDSIGHT_RISK')) points.push('The combination rationale may reflect hindsight reconstruction rather than evidence-supported motivation.')
  if (combination && (combination.flags || []).includes('COMBINATION_FEASIBILITY_REVIEW_REQUIRED')) points.push('Technical compatibility and feasibility of the proposed combination are unproven.')
  points.push('Claim construction may differ; validity turns on the construed meaning of material terms.')
  return points
}

export function detectInvalidityContradictions(matrix = [], narrativeAssertions = []) {
  return detectAnalysisContradictions(matrix, narrativeAssertions)
}

export function classifyEvidenceConflict({ proposition = '', passages = [] } = {}) {
  return classifyContradiction({ proposition, passages })
}

// ---------- Matrix & evidence graph (§60–§61) ----------

export function buildInvalidityMatrix({ claims = [], grounds = [], mappings = [], authorities = [] } = {}) {
  const rows = []
  for (const claim of claims) {
    for (const ground of grounds) {
      const relevant = (mappings || []).filter((item) =>
        Number(item.claim_number) === Number(claim.claim_number) && item.ground_id === ground.ground_id)
      rows.push({
        claim: claim.claim_number,
        ground: ground.ground_id,
        legal_requirement: ground.legal_basis,
        evidence: relevant.map((item) => item.reference_id),
        source_location: relevant.map((item) => item.source_location || item.passage_id).filter(Boolean),
        verification: relevant.length ? relevant[0].verification || 'UNVERIFIED' : 'UNVERIFIED',
        strength: relevant.length ? 'LIMITED' : 'RESEARCH_REQUIRED',
        counterevidence: [],
        status: relevant.length ? 'MAPPED' : 'UNMAPPED',
        authority: (authorities || []).find((item) => item.ground_id === ground.ground_id) || null,
      })
    }
  }
  return rows
}

export function buildInvalidityEvidenceGraph({ target, claims = [], grounds = [], matrix = [], counterarguments = [] } = {}) {
  return {
    target_right: target?.right_id || null,
    nodes: {
      claims: claims.map((claim) => claim.claim_number),
      grounds: grounds.map((ground) => ground.ground_id),
      matrix_rows: matrix.length,
    },
    edges: matrix.map((row) => ({ claim: row.claim, ground: row.ground, evidence: row.evidence })),
    counterarguments,
    trace_note: 'TARGET RIGHT → OPERATIVE CLAIM → INVALIDITY GROUND → LEGAL REQUIREMENT → EVIDENCE → COUNTERARGUMENT → QUALIFIED CONCLUSION',
  }
}

// ---------- Readiness & outcomes (§73–§77) ----------

export function assessInvalidityReadiness(facts = {}) {
  const gaps = []
  if (!facts.right_id && !facts.publication_number && !facts.patent_number) gaps.push('TARGET_RIGHT_REQUIRED')
  if (!facts.jurisdiction || facts.jurisdiction === 'UNDECIDED') gaps.push('JURISDICTION_REQUIRED')
  if (!(facts.selected_claims || []).length) gaps.push('SELECTED_CLAIMS_REQUIRED')
  if (!facts.claim_set_version) gaps.push('CLAIM_VERSION_CONFIRMATION_REQUIRED')
  if (!(facts.grounds_in_scope || []).length) gaps.push('GROUNDS_IN_SCOPE_REQUIRED')
  if (!facts.authority?.verified) gaps.push('VERIFIED_AUTHORITY_REQUIRED')
  if (!gaps.length && (facts.references || []).length && facts.research?.status === 'STRUCTURED_SEARCH_COMPLETED') {
    return { readiness: INVALIDITY_READINESS.READY_FOR_EVIDENCE_BASED_INVALIDITY_ANALYSIS, gaps }
  }
  if (!gaps.length) return { readiness: INVALIDITY_READINESS.READY_FOR_GROUND_SPECIFIC_ASSESSMENT, gaps }
  if (facts.research?.status === 'NOT_SEARCHED' && !(facts.references || []).length) gaps.push('PRIOR_ART_SEARCH_REQUIRED');  if (facts.right_id && facts.jurisdiction && facts.jurisdiction !== 'UNDECIDED' && !gaps.includes('PRIOR_ART_SEARCH_REQUIRED')) {
    return { readiness: INVALIDITY_READINESS.READY_FOR_REFERENCE_SPECIFIC_SCREEN, gaps }
  }
  return { readiness: INVALIDITY_READINESS.NOT_READY, gaps }
}

export function aggregateClaimOutcome({ groundResults = [] } = {}) {
  if (!groundResults.length) return INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED
  if (groundResults.includes(INVALIDITY_CLAIM_OUTCOMES.MATERIAL_INVALIDITY_ARGUMENT)) return INVALIDITY_CLAIM_OUTCOMES.MATERIAL_INVALIDITY_ARGUMENT
  if (groundResults.includes(INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED)) return INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED
  if (groundResults.includes(INVALIDITY_CLAIM_OUTCOMES.INCONCLUSIVE)) return INVALIDITY_CLAIM_OUTCOMES.INCONCLUSIVE
  if (groundResults.includes(INVALIDITY_CLAIM_OUTCOMES.POTENTIAL_INVALIDITY_ARGUMENT)) return INVALIDITY_CLAIM_OUTCOMES.POTENTIAL_INVALIDITY_ARGUMENT
  if (groundResults.includes(INVALIDITY_CLAIM_OUTCOMES.EVIDENCE_MIXED)) return INVALIDITY_CLAIM_OUTCOMES.EVIDENCE_MIXED
  return INVALIDITY_CLAIM_OUTCOMES.NO_MATERIAL_ARGUMENT_IDENTIFIED_WITHIN_SCOPE
}

export function aggregateOverallOutcome({ claimOutcomes = [] } = {}) {
  if (!claimOutcomes.length) return INVALIDITY_OVERALL_OUTCOMES.RESEARCH_REQUIRED
  if (claimOutcomes.includes(INVALIDITY_CLAIM_OUTCOMES.MATERIAL_INVALIDITY_ARGUMENT)) return INVALIDITY_OVERALL_OUTCOMES.MATERIAL_VALIDITY_CHALLENGES_IDENTIFIED
  if (claimOutcomes.includes(INVALIDITY_CLAIM_OUTCOMES.RESEARCH_REQUIRED)) return INVALIDITY_OVERALL_OUTCOMES.RESEARCH_REQUIRED
  if (claimOutcomes.every((item) => item === INVALIDITY_CLAIM_OUTCOMES.NO_MATERIAL_ARGUMENT_IDENTIFIED_WITHIN_SCOPE)) {
    return INVALIDITY_OVERALL_OUTCOMES.NO_MATERIAL_INVALIDITY_CASE_IDENTIFIED_WITHIN_SCOPE
  }
  if (claimOutcomes.includes(INVALIDITY_CLAIM_OUTCOMES.INCONCLUSIVE)) return INVALIDITY_OVERALL_OUTCOMES.INCONCLUSIVE
  if (claimOutcomes.includes(INVALIDITY_CLAIM_OUTCOMES.POTENTIAL_INVALIDITY_ARGUMENT)) return INVALIDITY_OVERALL_OUTCOMES.LIMITED_CHALLENGE_IDENTIFIED
  return INVALIDITY_OVERALL_OUTCOMES.MIXED
}

// ---------- Staleness & versions (§90–§93) ----------

export function detectInvalidityStaleness(saved = {}, current = {}) {
  const rerun = []
  if (JSON.stringify(saved.claim_text ?? null) !== JSON.stringify(current.claim_text ?? null)) rerun.push('CLAIM_TEXT_CHANGED')
  if (JSON.stringify(saved.claim_set_version ?? null) !== JSON.stringify(current.claim_set_version ?? null)) rerun.push('CLAIM_VERSION_CHANGED')
  if (JSON.stringify(saved.legal_status ?? null) !== JSON.stringify(current.legal_status ?? null)) rerun.push('LEGAL_STATUS_CHANGED')
  if (JSON.stringify(saved.priority ?? null) !== JSON.stringify(current.priority ?? null)) rerun.push('PRIORITY_FINDING_CHANGED')
  if (JSON.stringify((saved.references || []).map((r) => r.reference_id)) !== JSON.stringify((current.references || []).map((r) => r.reference_id))) rerun.push('REFERENCE_SET_CHANGED')
  if (JSON.stringify(saved.authority_version ?? null) !== JSON.stringify(current.authority_version ?? null)) rerun.push('AUTHORITY_CHANGED')
  if (!rerun.length) return { stale: false, flag: null, rerun }
  return { stale: true, flag: 'INVALIDITY_OPINION_STALE', rerun }
}

export function createInvalidityVersion(history = [], snapshot = {}, reason = 'Invalidity opinion updated') {
  const version = `v${history.length + 1}`
  return { version, timestamp: new Date().toISOString(), reason, snapshot, history: [...history, version] }
}

// ---------- Handoffs (§84–§89) ----------

export function buildInvalidityFtoHandoff({ ftoOpinionId = null, riskItemId = null, rightId = null, claimId = null, productVersion = null, findings = [] } = {}) {
  return {
    source_workflow: 'patent-invalidity-opinion',
    target_workflow: 'freedom-to-operate-opinion',
    ftoOpinionId, riskItemId, rightId, claimId, productVersion,
    validity_layer: findings,
    fto_status_change: 'NONE — invalidity findings are a separate analytical layer and never automatically clear FTO risk.',
  }
}

export function buildPriorArtSearchHandoff({ target_claims = [], limitations = [], priority_cutoff = null, known_references = [], technical_concepts = [], search_gaps = [] } = {}) {
  return {
    source_workflow: 'patent-invalidity-opinion',
    target_workflow: 'patent-prior-art-search-report',
    target_claims, limitations, priority_cutoff, known_references, technical_concepts, search_gaps,
    restart_from_zero: false,
  }
}

// ---------- Confidentiality (§97) ----------

export function assertInvalidityConfidentiality({ engines = [], mode = 'CONFIDENTIAL_IP', env = {} } = {}) {
  try {
    return assertChatAllowed({ engines, mode, env })
  } catch (error) {
    error.invalidity_flag = INVALIDITY_REVIEW_FLAGS.CONFIDENTIAL_PILOT_BLOCKED
    throw error
  }
}

// ---------- Report assembly (§79–§83) ----------

function section(title, body) {
  return `## ${title}\n\n${body && String(body).trim() ? body : 'Not addressed within the current scope.'}\n`
}

export function assembleInvalidityOpinion(input = {}) {
  const {
    target = {}, legal_status = null, claims = [], claim_set_version = null,
    jurisdiction = 'UNDECIDED', grounds = [], matrix = [], counterarguments = [],
    claim_outcomes = [], overall_outcome = 'RESEARCH_REQUIRED', research = null,
    priority = null, prosecution = null, authorities = [], verification = [],
    gaps = [], next_steps = [], versions = {},
  } = input
  const rightLabel = target.publication_number || target.patent_number || target.right_id || 'Unidentified right'
  const claimList = (claims || []).map((c) => `Claim ${c.claim_number}`).join(', ') || 'No claims analysed'
  const lines = []
  lines.push(`# Patent Invalidity Opinion (Evidence-Linked Assessment)\n`)
  lines.push(section('1. Scope and Purpose',
    `Claim-specific, jurisdiction-specific invalidity assessment for ${rightLabel}. This is an evidence-linked assessment, not a declaration of invalidity or validity, not a litigation prediction, and not a formal counsel opinion.`))
  lines.push(section('2. Executive Assessment',
    `Overall outcome: ${overall_outcome}. ${claimList} analysed under ${jurisdiction} law. Every material argument below is qualified by timing, claim-construction, verification, and review issues.`))
  lines.push(section('3. Target Patent / Right', `Right: ${rightLabel}; jurisdiction: ${jurisdiction}; family: ${target.family_id || 'unknown'}.`))
  lines.push(section('4. Legal Status', legal_status ? `Status: ${legal_status.status_category || legal_status.status}; freshness: ${legal_status.freshness || 'unknown'}.` : 'Legal status unverified; operative-claim analysis cannot proceed on an uncertain right.'))
  lines.push(section('5. Claims Analysed', claimList))
  lines.push(section('6. Claim Version / Source', `Operative version: ${claim_set_version || 'unconfirmed'}. Obsolete versions were not analysed silently.`))
  lines.push(section('7. Jurisdiction', `Validity jurisdiction: ${jurisdiction}. Grounds apply only where the verified framework supports them.`))
  lines.push(section('8. Applicable Validity Framework', (grounds || []).map((g) => `- ${g.ground_id} (${g.legal_basis || 'basis unverified'})`).join('\n')))
  lines.push(section('9. Priority / Filing History', priority ? JSON.stringify(priority) : null))
  lines.push(section('10. Research Scope and Limitations', research ? `Search status: ${research.status || research}; coverage: ${research.coverage || 'UNKNOWN'}. Research coverage is not a probability of invalidity.` : 'No structured search recorded.'))
  lines.push(section('11. Evidence Reviewed', `References and passages reviewed: ${(input.references || []).length}. Unverified references were excluded from conclusions.`))
  lines.push(section('12. Claim Construction Issues', (input.construction_issues || []).join('\n')))
  lines.push(section('13. Novelty-Based Invalidity', (input.novelty_section || '')))
  lines.push(section('14. Obviousness / Inventive-Step Analysis', (input.obviousness_section || '')))
  lines.push(section('15. Disclosure / Support Analysis', (input.support_section || '')))
  lines.push(section('16. Added-Matter Analysis', (input.added_matter_section || '')))
  lines.push(section('17. Sufficiency / Enablement Analysis', (input.sufficiency_section || '')))
  lines.push(section('18. Eligibility / Subject-Matter Analysis', (input.eligibility_section || '')))
  lines.push(section('19. Other Grounds Within Scope', (input.other_grounds_section || '')))
  lines.push(section('20. Claim-by-Claim Matrix', (matrix || []).map((row) => `- Claim ${row.claim} / ${row.ground}: evidence [${(row.evidence || []).join(', ') || 'none'}]; verification ${row.verification}; strength ${row.strength}; status ${row.status}.`).join('\n')))
  lines.push(section('21. Counterarguments / Validity Considerations', (counterarguments || []).map((c) => `- ${c}`).join('\n')))
  lines.push(section('22. Key Invalidity Arguments', (input.key_arguments || []).map((a) => `- Claim ${a.claim}: ${a.ground} on ${a.evidence} (${a.authority}); uncertainty: ${a.uncertainty}; counter: ${a.counterargument}.`).join('\n')))
  lines.push(section('23. Key Weaknesses in Invalidity Case', (input.key_weaknesses || []).join('\n')))
  lines.push(section('24. Research Gaps', (gaps || []).join('\n')))
  lines.push(section('25. Recommended Next Steps', (next_steps || []).join('\n')))
  lines.push(section('26. Authorities and Sources', (authorities || []).map((a) => `- ${a.authority_id || a.source} (${a.version_or_date || 'undated'})`).join('\n')))
  lines.push(section('27. Verification Statement', (verification || []).join('\n') || 'Target identity, claim version, legal status, grounds, references, timing, quotes, entailment, mappings, priority, counterarguments, and conclusion trace were checked through RETRIEVE → VERIFY → REASON → CHALLENGE → VALIDATE → CITE → ANSWER.'))
  lines.push(section('28. Limitations', 'Failure to find invalidity evidence does not prove validity; strong evidence does not equal adjudication. Invalidity findings do not clear FTO risk.'))
  const report = lines.join('\n')
  const violations = BANNED_OUTCOME_PHRASES.filter((phrase) => report.toLowerCase().includes(phrase))
  if (violations.length) {
    const error = new Error(`Outcome-boundary violation in assembled opinion: ${violations.join(', ')}`)
    error.code = 'OUTCOME_BOUNDARY_VIOLATION'
    throw error
  }
  return { report, overall_outcome, claim_outcomes, versions }
}



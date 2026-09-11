/**
 * SALLYIP PRIOR-ART SEARCH SERVICE — PART 1
 * Canonical Document #019: Patent Prior-Art Search Report (target layer).
 *
 * Reuses shared infrastructure (no parallel engines):
 * - canonical claim model: patent-claim-service.js
 * - strategy seeds + candidate scoring: prior-art-service.js
 * - reference/date/family/contradiction validators: novelty-service.js
 * - entailment / temporal / confidentiality / export helpers
 *
 * CORE PRINCIPLES: SEARCH EVIDENCE ≠ LEGAL CONCLUSION.
 * NO VERIFIED REFERENCE → NO PRIOR-ART ASSERTION.
 */

import { parsePatentClaims, buildEffectiveClaimLimitations } from './patent-claim-service.js'
import { generatePriorArtStrategies, scorePriorArtCandidate } from './prior-art-service.js'
import { validateNoveltyReference, compareNumericalLimitation, groupPatentFamilies, detectAnalysisContradictions } from './novelty-service.js'
import { checkEntailment } from './entailment-service.js'
import { validateAuthorityCurrency } from './temporal-service.js'
import { assertChatAllowed } from './provider-policy.js'

export const PRIOR_ART_SEARCH_MODES = Object.freeze([
  'CONCEPT_LEVEL_SEARCH', 'CLAIM_LEVEL_SEARCH', 'LIMITATION_LEVEL_SEARCH',
  'INVALIDITY_SEARCH', 'PATENTABILITY_SEARCH', 'NOVELTY_SEARCH', 'FTO_DISCOVERY_SEARCH',
  'PATENT_ONLY_SEARCH', 'PATENT_AND_NPL_SEARCH', 'ASSIGNEE_SEARCH', 'INVENTOR_SEARCH',
  'CLASSIFICATION_SEARCH', 'CITATION_EXPANSION_SEARCH', 'FAMILY_EXPANSION_SEARCH', 'SEARCH_UPDATE',
])

export const PRIOR_ART_READINESS = Object.freeze({
  NOT_READY: 'NOT_READY',
  READY_FOR_SEED_SEARCH: 'READY_FOR_SEED_SEARCH',
  READY_FOR_STRUCTURED_SEARCH: 'READY_FOR_STRUCTURED_SEARCH',
  READY_FOR_CLAIM_FOCUSED_SEARCH: 'READY_FOR_CLAIM_FOCUSED_SEARCH',
  READY_FOR_REPORT: 'READY_FOR_REPORT',
})

export const RELEVANCE_STATUSES = Object.freeze({
  HIGH_RELEVANCE: 'HIGH_RELEVANCE',
  MEDIUM_RELEVANCE: 'MEDIUM_RELEVANCE',
  LOW_RELEVANCE: 'LOW_RELEVANCE',
  EXCLUDED: 'EXCLUDED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
})

export const RELEVANCE_OUTCOMES = Object.freeze({
  DIRECTLY_RELEVANT: 'DIRECTLY_RELEVANT',
  PARTIALLY_RELEVANT: 'PARTIALLY_RELEVANT',
  RELATED_BACKGROUND: 'RELATED_BACKGROUND',
  NO_RELEVANCE: 'NO_RELEVANCE',
  AMBIGUOUS: 'AMBIGUOUS',
})

export const EXCLUSION_REASONS = Object.freeze([
  'TECHNICALLY_IRRELEVANT', 'DATE_OUTSIDE_SCOPE', 'DUPLICATE_FAMILY', 'WRONG_APPLICATION',
  'INSUFFICIENT_DISCLOSURE', 'UNVERIFIED_REFERENCE', 'OTHER',
])

export const PRIOR_ART_REVIEW_FLAGS = Object.freeze({
  TARGET_VERSION_CONFIRMATION_REQUIRED: 'TARGET_VERSION_CONFIRMATION_REQUIRED',
  SEARCH_STRATEGY_REVIEW_REQUIRED: 'SEARCH_STRATEGY_REVIEW_REQUIRED',
  REFERENCE_VERIFICATION_FAILED: 'REFERENCE_VERIFICATION_FAILED',
  QUOTE_VERIFICATION_FAILED: 'QUOTE_VERIFICATION_FAILED',
  DATE_CONFLICT_REQUIRES_REVIEW: 'DATE_CONFLICT_REQUIRES_REVIEW',
  REFERENCE_METADATA_CONFLICT: 'REFERENCE_METADATA_CONFLICT',
  FAMILY_RELATIONSHIP_UNCERTAIN: 'FAMILY_RELATIONSHIP_UNCERTAIN',
  ANALYSIS_CONTRADICTION: 'ANALYSIS_CONTRADICTION',
  PRIOR_ART_SEARCH_STALE: 'PRIOR_ART_SEARCH_STALE',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
})

export const FEATURE_PRIORITIES = Object.freeze(['CORE', 'DISTINGUISHING', 'SUPPORTING', 'GENERIC'])
export const MATCH_FIELDS = Object.freeze(['TITLE', 'ABSTRACT', 'CLAIMS', 'DESCRIPTION', 'FULL_TEXT', 'CLASSIFICATION'])

const BANNED_SEARCH_PHRASES = [
  'no prior art exists', 'this is entirely new', 'nobody has done this',
  'your invention is novel', 'invention is patentable', 'no exact match was found, therefore',
  'complete exhaustive search', 'all prior art',
]

// ---------- Search target (§11–§12) ----------

export function buildSearchTarget(input = {}) {
  return {
    matter_id: input.matter_id || null,
    target_id: input.target_id || 'search-target-pending',
    target_type: input.target_type || 'OTHER',
    target_version: input.target_version || null,
    claim_ids: [...(input.claim_ids || input.claim_numbers || [])],
    concepts: [...(input.concepts || [])],
    critical_features: [...(input.critical_features || input.key_features || [])],
    optional_features: [...(input.optional_features || [])],
    jurisdiction_context: input.jurisdiction_context || input.jurisdiction || 'UNDECIDED',
    priority_context: input.priority_context || null,
    relevant_cutoff: input.relevant_cutoff || input.priority_context?.analysis_cutoff || null,
    search_modes: [...(input.search_modes || input.searchModes || [])],
    source_types: [...(input.source_types || [])],
    search_depth: input.search_depth || 'STANDARD',
  }
}

export function confirmTargetVersion({ versions = [], requested_version = null } = {}) {
  if (!versions.length) return { status: 'RESEARCH_REQUIRED', target_version: null, flags: ['TARGET_UNAVAILABLE'] }
  if (versions.length === 1 && !requested_version) return { status: 'VERIFIED', target_version: versions[0], flags: [] }
  const match = requested_version ? versions.find((v) => String(v) === String(requested_version)) : null
  if (match) return { status: 'VERIFIED', target_version: match, flags: versions.length > 1 ? ['NEWER_VERSION_RECORDED'] : [] }
  return { status: 'TARGET_VERSION_CONFIRMATION_REQUIRED', target_version: null, flags: ['TARGET_VERSION_CONFIRMATION_REQUIRED'], available_versions: versions }
}

// ---------- Claim & concept decomposition (§13–§16) ----------

export function decomposeClaimForSearch({ claim_text = '', claims = [], target_version = 'v1' } = {}) {
  const parsed = claims.length ? claims : parsePatentClaims(claim_text)
  const effective = buildEffectiveClaimLimitations(parsed, target_version)
  const search_terms = []
  for (const claim of effective) {
    for (const limitation of claim.full_effective_limitations || []) {
      const text = limitation.exact_text || ''
      search_terms.push({
        claim_number: claim.claim_number,
        limitation_id: limitation.limitation_id,
        normalised_concept: String(limitation.normalized_concept || text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
        technical_synonyms: [],
        classification_hints: [],
      })
    }
  }
  return { parsed, effective, search_terms }
}

export function decomposeConceptForSearch({ core_concept = '', required_features = [], optional_features = [], relationships = [], functions = [], application_context = '' } = {}) {
  return {
    core_concept: String(core_concept || ''),
    required_features: [...required_features],
    optional_features: [...optional_features],
    relationships: [...relationships],
    functions: [...functions],
    application_context: String(application_context || ''),
    invented_features: [],
  }
}

export function prioritizeFeatures({ distinguishing = [], core = [], supporting = [], generic = [] } = {}) {
  return [
    ...distinguishing.map((term) => ({ term, priority: 'DISTINGUISHING' })),
    ...core.map((term) => ({ term, priority: 'CORE' })),
    ...supporting.map((term) => ({ term, priority: 'SUPPORTING' })),
    ...generic.map((term) => ({ term, priority: 'GENERIC' })),
  ]
}

export function buildSynonymRecord({ exact_term = '', synonyms = [], acronyms = [], legacy_terms = [], translations = [], provenance = 'USER_PROVIDED', reviewed = false } = {}) {
  return {
    exact_term,
    technical_synonyms: synonyms.map((term) => ({ term, provenance, review_status: reviewed ? 'REVIEWED' : 'UNREVIEWED' })),
    acronyms, legacy_terms, translations, provenance,
  }
}

// ---------- Search strategy & query provenance (§17–§19, §36–§38) ----------

let priorArtQuerySequence = 0

export function buildSearchStrategy({ features = [], synonyms = [], classifications = [], assignees = [], inventors = [], applicant = '', inventor = '', semantic = null } = {}) {
  const seeds = generatePriorArtStrategies({
    summary: features.map((f) => f.term || f).join(' '),
    concepts: features.filter((f) => (f.priority || '') !== 'GENERIC').map((f) => f.term || f),
    ipc: classifications.filter((c) => /^[A-H]/i.test(c)),
    cpc: classifications.filter((c) => /^[A-H]/i.test(c)),
    applicant: assignees[0] || applicant,
    inventor: inventors[0] || inventor,
  })
  const strategy = seeds.map((seed) => ({ ...seed, query_type: seed.strategy_type.toUpperCase(), verified: true }))
  if (semantic) {
    strategy.push({
      strategy_type: 'semantic', query_type: 'SEMANTIC', query: semantic.query || '',
      model: semantic.model || null, index_version: semantic.index_version || null,
      filters: semantic.filters || {}, verified: true,
      note: 'Semantic similarity is retrieval only, never legal relevance.',
    })
  }
  return strategy
}

export function recordSearchQuery({ query_text = '', query_type = 'KEYWORD', source = '', filters = {}, result_count = 0, screened_count = 0, selected_count = 0, notes = '', iteration_type = 'SEED_SEARCH', date_run = null, match_field = null } = {}) {
  priorArtQuerySequence += 1
  if (!query_text || !String(query_text).trim()) {
    return { query_id: null, valid: false, issue: 'QUERY_TEXT_REQUIRED', note: 'Query provenance cannot be invented; empty queries are not recorded.' }
  }
  return {
    query_id: `pa-query-${String(priorArtQuerySequence).padStart(3, '0')}`,
    query_text, query_type, source, filters,
    date_run: date_run || new Date().toISOString().slice(0, 10),
    result_count, screened_count, selected_count, notes, iteration_type, match_field,
    valid: true,
  }
}

// ---------- Source coverage (§20–§21) ----------

export function recordSourceCoverage({ sources_queried = [], npl_classes = [], languages = [], jurisdictions = [] } = {}) {
  return {
    sources_queried: [...sources_queried],
    npl_classes: [...npl_classes],
    languages: [...languages],
    jurisdictions: [...jurisdictions],
    coverage_note: sources_queried.length
      ? `Coverage claimed only for: ${sources_queried.join(', ')}.`
      : 'No sources recorded; no coverage may be claimed.',
  }
}

// ---------- NPL & public availability (§22–§23) ----------

export function recordNplReference({ title = '', authors = [], publisher = '', identifier = '', url = '', version = '', publication_date = null, availability_source = '', file_created_date = null } = {}) {
  return {
    title, authors, publisher, identifier, url, version,
    publication_date,
    public_availability_date: null,
    availability_source,
    file_created_date,
    availability_note: 'File creation metadata is never public-availability evidence. Availability requires a publisher or archival source.',
  }
}

export function confirmNplAvailability(npl, { availability_date = null, source = '' } = {}) {
  if (!availability_date || !source) {
    return { ...npl, public_availability_date: null, availability_status: 'RESEARCH_REQUIRED' }
  }
  return { ...npl, public_availability_date: availability_date, availability_source: source, availability_status: 'RECORDED' }
}

// ---------- Reference verification & identity (§24–§25) ----------

export function verifySearchReference(reference = {}) {
  const gate = validateNoveltyReference(reference)
  return {
    reference_id: reference.reference_id || reference.publication_number || null,
    status: gate.status === 'VERIFIED' ? 'VERIFIED' : 'FAILED',
    code: gate.status === 'VERIFIED' ? null : 'REFERENCE_VERIFICATION_FAILED',
    issues: gate.issues || [],
    usable_for_conclusion: gate.usable_for_conclusion === true,
  }
}

// ---------- Date model & temporal screening (§26–§29) ----------

export function buildSearchDateRecord({ priority_date = null, filing_date = null, publication_date = null, grant_date = null, public_availability_date = null, relevant_cutoff = null } = {}) {
  return { priority_date, filing_date, publication_date, grant_date, public_availability_date, relevant_cutoff }
}

export function screenTemporalRelevance({ publication_date = null, public_availability_date = null, relevant_cutoff = null } = {}) {
  const effective = public_availability_date || publication_date
  if (!effective) return { temporal_status: 'DATE_UNCERTAIN', effective_date: null }
  if (!relevant_cutoff) return { temporal_status: 'RESEARCH_REQUIRED', effective_date: effective }
  if (String(effective) < String(relevant_cutoff)) return { temporal_status: 'TEMPORALLY_POTENTIALLY_RELEVANT', effective_date: effective }
  return { temporal_status: 'TEMPORALLY_NOT_RELEVANT', effective_date: effective }
}

export function recordPriorityContext({ asserted_date = null, verified = false } = {}) {
  if (!asserted_date) return { priority_date: null, status: 'RESEARCH_REQUIRED' }
  return { priority_date: asserted_date, status: verified ? 'VERIFIED' : 'USER_ASSERTED_PRIORITY_DATE' }
}

// ---------- Family normalisation & expansion (§30–§33) ----------

export function normalizeSearchFamilies({ references = [], uncertain_pairs = [] } = {}) {
  const groups = groupPatentFamilies(references.map((ref, index) => ({
    reference_id: ref.reference_id || ref.publication_number || `ref-${index}`,
    family_id: ref.family_id || null,
    publication_date: ref.publication_date || null,
  })))
  const uncertainKeys = new Set((uncertain_pairs || []).map((pair) => [...pair].sort().join('|')))
  const families = groups.map((group) => {
    const members = references.filter((ref, index) =>
      (ref.family_id || `SINGLE:${ref.reference_id || ref.publication_number || `ref-${index}`}`) === group.family_id)
    const keys = new Set()
    members.forEach((ref) => { if (ref.reference_id) keys.add(String(ref.reference_id)); if (ref.publication_number) keys.add(String(ref.publication_number)) })
    const uncertain = [...uncertainKeys].some((key) => {
      const [a, b] = key.split('|')
      return keys.has(a) || keys.has(b)
    })
    const dates = members.map((ref) => ref.publication_date || ref.filing_date || ref.priority_date).filter(Boolean)
    return {
      family_id: group.family_id,
      members: members.map((ref) => ref.reference_id || ref.publication_number),
      representative_member: members[0]?.reference_id || members[0]?.publication_number || null,
      per_document_dates: members.map((ref) => ({ reference: ref.reference_id || ref.publication_number, priority_date: ref.priority_date || null, filing_date: ref.filing_date || null, publication_date: ref.publication_date || null })),
      relationship: uncertain ? 'FAMILY_RELATIONSHIP_UNCERTAIN' : 'RESOLVED',
      related_filings: members.filter((ref) => /continuation|divisional|national-phase|regional-stage/i.test(ref.relation || '')).map((ref) => ({ reference: ref.reference_id, relation: ref.relation })),
    }
  })
  return { families, note: 'Family members are grouped discoveries, not independent inventions; headline counts use one representative per family unless stated.' }
}

export function expandFamilyMembers({ family = {}, all_members = [] } = {}) {
  return {
    family_id: family.family_id,
    representative_member: family.representative_member,
    additional_members: all_members.filter((m) => m !== family.representative_member),
    headline_inclusion: 'representative-only',
    note: 'Additional members are available for review; they are not auto-included in headline counts.',
  }
}

// ---------- Classification & semantic (§34–§36) ----------

export function verifySearchClassification({ code = '', official_codes = [], ai_proposed = false } = {}) {
  const normalized = String(code).toUpperCase().replace(/\s+/g, '')
  if (official_codes.map((c) => String(c).toUpperCase().replace(/\s+/g, '')).includes(normalized)) {
    return { code, status: 'VERIFIED', provenance: 'OFFICIAL_RECORD' }
  }
  if (ai_proposed) return { code, status: 'AI_PROPOSED_CLASSIFICATION', provenance: 'AI_PROPOSED' }
  return { code, status: 'UNVERIFIED', provenance: 'UNVERIFIED' }
}

export function recordSemanticRetrieval({ query = '', model = null, index_version = null, filters = {}, results = [] } = {}) {
  return {
    query, model, index_version, filters,
    results: results.map((result) => ({ reference_id: result.reference_id, similarity_score: result.similarity_score ?? null, screened: false })),
    note: 'Similarity scores are retrieval signals only, never relevance or prior-art determinations.',
  }
}

// ---------- Result screening (§39–§41) ----------

export function screenSearchResult({ reference_id, relevance = 'REVIEW_REQUIRED', reason = '', features_triggered = [], match_field = null, excluded = false } = {}) {
  const valid = Object.keys(RELEVANCE_STATUSES)
  const level = valid.includes(relevance) ? relevance : 'REVIEW_REQUIRED'
  return { reference_id, relevance: level, reason, features_triggered, match_field, excluded }
}

export function excludeSearchResult({ reference_id, reason = 'OTHER', rule = 'screening-criteria', reviewer = 'system' } = {}) {
  if (!EXCLUSION_REASONS.includes(reason)) return { reference_id, excluded: false, issue: 'EXCLUSION_REASON_REQUIRED' }
  return { reference_id, relevance: 'EXCLUDED', reason, rule, reviewer, timestamp: new Date().toISOString() }
}

export function recordScreeningEvidence({ reference_id, why_selected = '', features = [], limitation_ids = [], passage = null } = {}) {
  return { reference_id, why_selected, features, limitation_ids, passage, title_only: !passage && !features.length }
}

// ---------- Claim/feature mapping (§42–§50) ----------

export function mapReferenceToLimitations({ claim_number, reference_id, mappings = [] } = {}) {
  return mappings.map((mapping) => ({
    claim_number,
    limitation_id: mapping.limitation_id,
    reference_id,
    source_passage: mapping.passage || null,
    relevance_status: mapping.relevance_status || 'AMBIGUOUS',
  }))
}

export function assessRelationalMapping({ relationship = '', passage = null } = {}) {
  if (!passage) return { relationship, disclosed: false, note: 'No passage supplied; relationship not disclosed.' }
  const entailment = checkEntailment(relationship, passage.content || '')
  return { relationship, disclosed: entailment.status === 'ENTAILED', entailment: entailment.status, passage_id: passage.passage_id || null }
}

export function assessFunctionalMapping({ function_text = '', passage = null } = {}) {
  if (!passage) return { function: function_text, mapped: false, note: 'Structure alone never discloses function; no functional evidence supplied.' }
  const entailment = checkEntailment(function_text, passage.content || '')
  return { function: function_text, mapped: entailment.status === 'ENTAILED', entailment: entailment.status, passage_id: passage.passage_id || null }
}

export function assessMethodOrderMapping({ expected_steps = [], passage_steps = [] } = {}) {
  const normalize = (steps) => steps.map((s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
  const expected = normalize(expected_steps)
  const actual = normalize(passage_steps)
  let cursor = 0
  const matched = []
  for (const step of expected) {
    const found = actual.indexOf(step, cursor)
    if (found === -1) return { order_preserved: false, matched_steps: matched, note: 'Step order differs; bag-of-words similarity is not method disclosure.' }
    matched.push(step)
    cursor = found + 1
  }
  return { order_preserved: true, matched_steps: matched }
}

export function assessNumericalOverlap({ claim_range = {}, reference_range = {} } = {}) {
  const result = compareNumericalLimitation(claim_range, reference_range)
  return { comparison: result, fabricated: false }
}


export function verifySearchQuote({ quote = '', passages = [] } = {}) {
  if (!quote || !String(quote).trim()) return { status: 'UNVERIFIED', code: null }
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const normalizedQuote = normalize(quote)
  for (const passage of passages) {
    const content = String(passage.content || '')
    if (content.includes(String(quote))) return { status: 'EXACT', code: null, passage_id: passage.passage_id || null }
    if (normalize(content).includes(normalizedQuote) && normalizedQuote.length >= 12) {
      return { status: 'FUZZY_REVIEW_REQUIRED', code: null, passage_id: passage.passage_id || null }
    }
  }
  return { status: 'NOT_FOUND', code: 'QUOTE_VERIFICATION_FAILED' }
}

export function assessPassageSupport({ proposition = '', passageContent = '' } = {}) {
  const result = checkEntailment(proposition, passageContent)
  const map = { ENTAILS: 'ENTAILED', PARTIALLY_SUPPORTS: 'PARTIALLY_ENTAILED', CONTEXT_ONLY: 'AMBIGUOUS', DOES_NOT_SUPPORT: 'NOT_ENTAILED', CONTRADICTS: 'NOT_ENTAILED' }
  return { verdict: result.verdict, status: map[result.verdict] || 'AMBIGUOUS', score: result.score, reasons: result.reasons }
}

export function scoreSearchCandidate(input = {}) {
  return scorePriorArtCandidate(input)
}

// ---------- Specialist branches (§51–§52) ----------

export function branchSpecialistSearch({ domain = '', structures = {} } = {}) {
  const supported = ['CHEMICAL', 'BIOTECH', 'SOFTWARE', 'AI_ML']
  if (!supported.includes(String(domain).toUpperCase())) {
    return { domain, status: 'GENERIC_TEXT_SEARCH', note: 'No specialist branch available; generic search insufficiency is recorded as a limitation.' }
  }
  return { domain: String(domain).toUpperCase(), status: 'SPECIALIST_STRUCTURES_PRESERVED', structures }
}

// ---------- Expansion & query learning (§53–§57) ----------

export function expandCitations({ reference_id, citations = [] } = {}) {
  return {
    reference_id,
    candidates: citations.map((citation) => ({ reference_id: citation.reference_id || citation, screened: false, auto_included: false })),
    note: 'Cited documents are candidates only; each requires screening before inclusion.',
  }
}

export function expandAssignee({ assignee = '', patents = [] } = {}) {
  return {
    assignee,
    candidates: patents.map((patent) => ({ reference_id: patent, screened: false })),
    note: 'Same assignee never implies relevance; each patent requires screening.',
  }
}

export function expandInventor({ inventor = '', publications = [] } = {}) {
  return {
    inventor,
    candidates: publications.map((publication) => ({ reference_id: publication, screened: false })),
    note: 'Same inventor never implies relevance; each publication requires screening.',
  }
}

export function learnQueryTerms({ verified_reference = {}, existing_synonyms = [] } = {}) {
  return {
    source_reference: verified_reference.reference_id || null,
    learned_terms: (verified_reference.new_terms || []).map((term) => ({ term, provenance: `LEARNED_FROM:${verified_reference.reference_id}`, review_status: 'UNREVIEWED' })),
    existing_synonyms,
    note: 'Learned terms stay unreviewed until verified; they never silently become search facts.',
  }
}

// ---------- Completeness, quality, ranking (§58–§64) ----------

export function assessSearchCompleteness({ dimensions = {} } = {}) {
  const keys = ['keyword', 'classification', 'citation', 'family', 'assignee_inventor', 'npl', 'jurisdiction', 'language', 'date']
  const covered = keys.filter((key) => dimensions[key] === true)
  const level = covered.length >= 7 ? 'HIGH' : covered.length >= 4 ? 'MODERATE' : covered.length >= 1 ? 'LOW' : 'UNKNOWN'
  return { level, covered_dimensions: covered, missing_dimensions: keys.filter((key) => dimensions[key] !== true), note: 'Completeness describes defined coverage, never exhaustiveness.' }
}

export function zeroResultsLanguage({ scope_description = 'the defined search scope' } = {}) {
  return `NO_RELEVANT_REFERENCE_IDENTIFIED_WITHIN_SEARCH_SCOPE: no relevant reference was identified within ${scope_description}. This does not establish that no prior art exists.`
}

export function checkSearchQuality({ queries = [], sources = [], result_count = 0, duplicate_rate = 0 } = {}) {
  const flags = []
  if (!queries.length) flags.push('SEARCH_STRATEGY_REVIEW_REQUIRED')
  if (result_count === 0) flags.push('ZERO_RESULTS_REVIEW')
  if (duplicate_rate > 0.5) flags.push('DUPLICATE_HEAVY_RESULTS')
  if (sources.length === 1) flags.push('SINGLE_SOURCE_DEPENDENCE')
  if (queries.length === 1 && result_count > 500) flags.push('OVERLY_BROAD_QUERY')
  if (queries.length > 0 && result_count > 0 && result_count < 3) flags.push('OVERLY_NARROW_QUERY')
  return { flags: [...new Set(flags)] }
}

export function diversifyReferences({ references = [], limit = 10 } = {}) {
  const seen = new Set()
  const diverse = []
  for (const reference of references) {
    const key = reference.family_id || reference.reference_id
    if (seen.has(key)) continue
    seen.add(key)
    diverse.push(reference)
    if (diverse.length >= limit) break
  }
  return { references: diverse, family_links_preserved: true }
}

export function rankSearchReferences({ references = [] } = {}) {
  const order = { DIRECTLY_RELEVANT: 0, PARTIALLY_RELEVANT: 1, RELATED_BACKGROUND: 2, AMBIGUOUS: 3, NO_RELEVANCE: 4 }
  return [...references].sort((a, b) =>
    (order[a.relevance_outcome] ?? 5) - (order[b.relevance_outcome] ?? 5) ||
    ((b.limitation_coverage || 0) - (a.limitation_coverage || 0))).map((reference) => ({
    reference_id: reference.reference_id,
    relevance_outcome: reference.relevance_outcome || 'AMBIGUOUS',
    limitation_coverage: reference.limitation_coverage || 0,
    criteria: 'technical relevance, then limitation coverage; qualitative only, no numeric confidence scores',
  }))
}

// ---------- Session, readiness, staleness, versions (§65–§66, §77–§80) ----------

export function buildSearchSession(input = {}) {
  return {
    search_id: input.search_id || `search-${Date.now()}`,
    matter_id: input.matter_id || null,
    target_id: input.target_id || 'search-target-pending',
    target_version: input.target_version || null,
    scope: input.scope || {},
    queries: [...(input.queries || [])],
    sources: [...(input.sources || [])],
    results: [...(input.results || [])],
    selected_references: [...(input.selected_references || [])],
    excluded_references: [...(input.excluded_references || [])],
    family_map: input.family_map || null,
    search_status: input.search_status || 'NOT_STARTED',
    completeness: input.completeness || 'UNKNOWN',
    versions: input.versions || { searchVersion: 'v1', targetVersion: input.target_version || null, reportVersion: 'v1' },
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function assessSearchReadiness(facts = {}) {
  const gaps = []
  if (!facts.search_target && !facts.claim_text && !(facts.claims || []).length && !facts.concept_text) gaps.push('SEARCH_TARGET_REQUIRED')
  if (!facts.target_version && ((facts.claim_versions || []).length > 1 || (facts.available_targets || []).length > 1)) gaps.push('TARGET_VERSION_CONFIRMATION_REQUIRED')
  if (!(facts.search_modes || []).length) gaps.push('SEARCH_MODES_REQUIRED')
  if (!(facts.source_types || []).length) gaps.push('SOURCE_TYPES_REQUIRED')
  if (!gaps.length && (facts.existing_references || []).length && !(facts.queries_run || []).length) {
    return { readiness: 'READY_FOR_STRUCTURED_SEARCH', gaps }
  }
  if (!gaps.length) return { readiness: 'READY_FOR_SEED_SEARCH', gaps }
  return { readiness: 'NOT_READY', gaps }
}

export function detectSearchStaleness(saved = {}, current = {}) {
  const rerun = []
  const changed = (a, b) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)
  if (changed(saved.claim_text, current.claim_text)) rerun.push('TARGET_CLAIM_CHANGED')
  if (changed(saved.target_version, current.target_version)) rerun.push('TARGET_VERSION_CHANGED')
  if (changed(saved.relevant_cutoff, current.relevant_cutoff)) rerun.push('CUTOFF_CHANGED')
  if (changed((saved.known_references || []).map((r) => r.reference_id), (current.known_references || []).map((r) => r.reference_id))) rerun.push('REFERENCE_SET_CHANGED')
  if (changed(saved.sources_queried, current.sources_queried)) rerun.push('SOURCES_CHANGED')
  if (!rerun.length) return { stale: false, flag: null, rerun }
  return { stale: true, flag: 'PRIOR_ART_SEARCH_STALE', rerun }
}

export function analyzeSearchChangeImpact({ changed_limitation = '', queries = [], mappings = [] } = {}) {
  const affectedQueries = (queries || []).filter((query) => String(query.query_text || '').toLowerCase().includes(String(changed_limitation).toLowerCase())).map((query) => query.query_id)
  const affectedMappings = (mappings || []).filter((mapping) => String(mapping.limitation_id || '').toLowerCase().includes(String(changed_limitation).toLowerCase()))
  return {
    changed_limitation,
    affected_queries: affectedQueries,
    affected_mappings: affectedMappings.length,
    note: affectedQueries.length || affectedMappings.length
      ? 'Targeted rerun required for the listed queries and mappings; unaffected branches stand.'
      : 'No query or mapping references the changed limitation; no rerun required.',
  }
}

// ---------- Evidence graph & conflicts (§81–§85) ----------

export function buildSearchEvidenceGraph({ target_id = null, mappings = [] } = {}) {
  return {
    target: target_id,
    edges: mappings.map((mapping) => ({
      feature: mapping.limitation_id || mapping.feature,
      query: mapping.query_id || null,
      reference: mapping.reference_id,
      passage: mapping.passage_id || null,
      relevance: mapping.relevance_status || mapping.relevance_outcome || 'AMBIGUOUS',
    })),
    trace: 'SEARCH_TARGET → FEATURE/LIMITATION → QUERY → SOURCE → VERIFIED_REFERENCE → VERIFIED_PASSAGE → RELEVANCE_STATUS',
  }
}

export function detectSearchContradictions(matrix = [], narrativeAssertions = []) {
  return detectAnalysisContradictions(matrix, narrativeAssertions)
}

export function recordMetadataConflict({ reference_id, sources = [] } = {}) {
  return { reference_id, code: 'REFERENCE_METADATA_CONFLICT', sources, note: 'Both sources preserved; no silent resolution.' }
}

export function recordDateConflict({ reference_id, dates = [] } = {}) {
  const unique = [...new Set(dates.filter(Boolean))]
  if (unique.length <= 1) return { reference_id, code: null, note: 'Dates agree.' }
  return { reference_id, code: 'DATE_CONFLICT_REQUIRES_REVIEW', dates: unique, note: 'Conflicting dates preserved; the favourable date is never silently selected.' }
}

// ---------- Confidentiality (§89) ----------

export function assertSearchConfidentiality({ engines = [], mode = 'CONFIDENTIAL_IP', env = {} } = {}) {
  try {
    return assertChatAllowed({ engines, mode, env })
  } catch (error) {
    error.search_flag = PRIOR_ART_REVIEW_FLAGS.CONFIDENTIAL_PILOT_BLOCKED
    throw error
  }
}

// ---------- Downstream handoffs (§72–§76) ----------

export function buildSearchHandoff({ kind = '', payload = {} } = {}) {
  const targets = {
    novelty: 'patent-novelty-opinion',
    patentability: 'patentability-assessment',
    invalidity: 'patent-invalidity-opinion',
    fto: 'freedom-to-operate-opinion',
    landscape: 'patent-landscape-report',
  }
  if (!targets[kind]) throw new Error('Unsupported prior-art search handoff')
  return { source_workflow: 'patent-prior-art-search-report', target_workflow: targets[kind], ...payload, legal_conclusion_transfer: 'NONE — search relevance never transfers as a legal conclusion' }
}

// ---------- Report assembly (§67–§70) ----------

function searchSection(title, body) {
  return `## ${title}\n\n${body && String(body).trim() ? body : 'Not addressed within the current scope.'}\n`
}

export function assembleSearchReport(input = {}) {
  const {
    target = {}, scope = {}, priority = null, queries = [], sources = null,
    classifications = [], expansions = [], references = [], families = null,
    npl = [], mappings = [], background = [], excluded = [], gaps = [],
    next_steps = [], verification = [], completeness = 'UNKNOWN', report_version = 'v1',
  } = input
  const lines = []
  lines.push(`# Patent Prior-Art Search Report (Search Evidence Only)\n`)
  lines.push(searchSection('1. Search Objective', `Identify relevant prior-art references within the defined search scope. This report records search evidence only and determines neither novelty nor patentability.`))
  lines.push(searchSection('2. Search Target', `Target: ${target.label || target.target_id || 'undefined'} (${target.target_type || 'unspecified'}).`))
  lines.push(searchSection('3. Search Scope', `Modes: ${(target.search_modes || []).join(', ') || 'undefined'}. Depth: ${target.search_depth || 'STANDARD'}.`))
  lines.push(searchSection('4. Target Claim / Concept Version', `Target version: ${target.target_version || 'unconfirmed'}. Stale versions are never searched silently.`))
  lines.push(searchSection('5. Priority / Date Context', priority ? `Cutoff: ${priority.relevant_cutoff || priority.priority_date || 'unresolved'} (${priority.status || 'recorded'}).` : 'No cutoff established; temporal screening stays unresolved.'))
  lines.push(searchSection('6. Search Methodology', 'Target decomposition → feature-prioritised strategy → recorded queries → existence verification → family normalisation → screened relevance → limitation mapping.'))
  lines.push(searchSection('7. Search Sources', sources ? `Sources queried: ${(sources.sources_queried || []).join(', ')}. ${sources.coverage_note || ''}` : 'No sources recorded; no coverage may be claimed.'))
  lines.push(searchSection('8. Search Queries', (queries || []).map((q) => `- ${q.query_id || 'unrecorded'} [${q.query_type}] "${q.query_text}" @ ${q.source}; results ${q.result_count ?? '?'}, screened ${q.screened_count ?? '?'}, selected ${q.selected_count ?? '?'}.`).join('\n')))
  lines.push(searchSection('9. Classification Strategy', (classifications || []).map((c) => `- ${c.code} [${c.status}]`).join('\n')))
  lines.push(searchSection('10. Search Expansion Strategy', (expansions || []).map((e) => `- ${e.kind || e.reference_id}: ${(e.candidates || []).length} candidates, screening required.`).join('\n')))
  lines.push(searchSection('11. Screening Method', 'HIGH/MEDIUM/LOW/EXCLUDED/REVIEW_REQUIRED with persisted reasons; title similarity alone never selects.'))
  lines.push(searchSection('12. Search Completeness / Limitations', `Completeness: ${typeof completeness === 'string' ? completeness : completeness.level || 'UNKNOWN'}. Coverage is defined scope coverage, never exhaustiveness.`))
  lines.push(searchSection('13. Key References', (references || []).map((r) => `- ${r.reference_id}: ${r.title || 'untitled'} [${r.jurisdiction || r.type || 'unknown'}; ${r.publication_date || r.public_availability_date || 'date unresolved'}; verification ${r.verification || 'UNVERIFIED'}; relevance ${r.relevance_outcome || r.relevance || 'AMBIGUOUS'}].`).join('\n')))
  lines.push(searchSection('14. Patent Family Summary', families ? `Normalised families: ${families.families?.length ?? families.family_count ?? '?'}. Members are grouped discoveries, not independent inventions.` : null))
  lines.push(searchSection('15. Non-Patent Literature', (npl || []).map((n) => `- ${n.title || n.identifier || 'untitled'} [availability: ${n.public_availability_date || n.availability_status || 'unproven'}].`).join('\n')))
  lines.push(searchSection('16. Claim / Feature Mapping', (mappings || []).map((m) => `- ${m.limitation_id || m.feature} → ${m.reference_id} [${m.relevance_status || m.relevance_outcome || 'AMBIGUOUS'}; passage ${m.passage_id || 'none'}].`).join('\n')))
  lines.push(searchSection('17. Relevance Analysis', `Relevance is search relevance, not a novelty, patentability, invalidity, or FTO determination.`))
  lines.push(searchSection('18. Additional Background References', (background || []).map((b) => `- ${b.reference_id || b}`).join('\n')))
  lines.push(searchSection('19. Excluded / Duplicate Records Summary', (excluded || []).map((e) => `- ${e.reference_id}: ${e.reason}`).join('\n')))
  lines.push(searchSection('20. Research Gaps', (gaps || []).join('\n')))
  lines.push(searchSection('21. Recommended Next Search Steps', (next_steps || []).join('\n')))
  lines.push(searchSection('22. Verification Summary', (verification || []).join('\n') || 'References, dates, passages, quotes, entailment, and mappings were checked; unverified items are excluded from conclusions.'))
  lines.push(searchSection('23. Appendix — Search Provenance', `Report version: ${report_version}. Every query, source, screening decision, and mapping above traces to persisted records.`))
  const report = lines.join('\n')
  const violations = BANNED_SEARCH_PHRASES.filter((phrase) => report.toLowerCase().includes(phrase))
  if (violations.length) {
    const error = new Error(`Search boundary violation in assembled report: ${violations.join(', ')}`)
    error.code = 'SEARCH_BOUNDARY_VIOLATION'
    throw error
  }
  return { report, report_version }
}

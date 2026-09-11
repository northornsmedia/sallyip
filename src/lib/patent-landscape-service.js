/**
 * SALLYIP PATENT LANDSCAPE SERVICE — PART 1
 * Canonical Document #018: Patent Landscape Report (scope/corpus layer).
 *
 * Reuses shared infrastructure (no parallel engines):
 * - canonical claim model: patent-claim-service.js
 * - family grouping: novelty-service.js groupPatentFamilies
 * - legal status: fto-opinion-service.js verifyLegalStatus
 * - narrative consistency: novelty-service.js detectAnalysisContradictions
 * - confidentiality + export helpers
 *
 * CORE PRINCIPLE: NO VERIFIED CORPUS → NO LANDSCAPE CLAIM.
 * Every metric is deterministically calculated from stored corpus records.
 */

import { parsePatentClaims, buildEffectiveClaimLimitations } from './patent-claim-service.js'
import { groupPatentFamilies, detectAnalysisContradictions } from './novelty-service.js'
import { verifyLegalStatus } from './fto-opinion-service.js'
import { assertChatAllowed } from './provider-policy.js'

export const LANDSCAPE_WORKFLOW_MODES = Object.freeze([
  'TECHNOLOGY_LANDSCAPE', 'COMPETITOR_LANDSCAPE', 'ASSIGNEE_LANDSCAPE',
  'JURISDICTION_LANDSCAPE', 'PORTFOLIO_COMPARISON', 'CLAIM_THEME_LANDSCAPE',
  'FILING_TREND_LANDSCAPE', 'EMERGING_TECHNOLOGY_LANDSCAPE', 'WHITE_SPACE_EXPLORATION',
  'CITATION_NETWORK_LANDSCAPE', 'CLASSIFICATION_LANDSCAPE', 'LEGAL_STATUS_LANDSCAPE',
  'LANDSCAPE_UPDATE', 'LANDSCAPE_FROM_EXISTING_CORPUS',
])

export const LANDSCAPE_READINESS = Object.freeze({
  NOT_READY: 'NOT_READY',
  READY_FOR_SEED_SEARCH: 'READY_FOR_SEED_SEARCH',
  READY_FOR_CORPUS_REVIEW: 'READY_FOR_CORPUS_REVIEW',
  READY_FOR_PRELIMINARY_LANDSCAPE: 'READY_FOR_PRELIMINARY_LANDSCAPE',
  READY_FOR_VERIFIED_CORPUS_LANDSCAPE: 'READY_FOR_VERIFIED_CORPUS_LANDSCAPE',
})

export const LANDSCAPE_REVIEW_FLAGS = Object.freeze({
  LANDSCAPE_REVIEW_REQUIRED: 'LANDSCAPE_REVIEW_REQUIRED',
  FAMILY_RELATIONSHIP_UNCERTAIN: 'FAMILY_RELATIONSHIP_UNCERTAIN',
  PROBABLE_MATCH_REVIEW_REQUIRED: 'PROBABLE_MATCH_REVIEW_REQUIRED',
  STATUS_CONFLICT_REQUIRES_REVIEW: 'STATUS_CONFLICT_REQUIRES_REVIEW',
  RECENT_YEAR_INCOMPLETE: 'RECENT_YEAR_INCOMPLETE',
  ANALYSIS_CONTRADICTION: 'ANALYSIS_CONTRADICTION',
  LANDSCAPE_STALE: 'LANDSCAPE_STALE',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
})

export const DATA_QUALITY_LEVELS = Object.freeze(['HIGH', 'MODERATE', 'LIMITED', 'UNKNOWN'])
export const RESEARCH_COMPLETENESS_LEVELS = Object.freeze(['LOW', 'MODERATE', 'HIGH', 'UNKNOWN'])
export const ENTITY_RESOLUTION_STATUSES = Object.freeze(['VERIFIED_MATCH', 'PROBABLE_MATCH_REVIEW_REQUIRED', 'SEPARATE_ENTITY', 'UNKNOWN'])
export const DOCUMENT_VERIFICATION = Object.freeze(['VERIFIED', 'UNVERIFIED', 'FAILED', 'RESEARCH_REQUIRED'])

const BANNED_LANDSCAPE_PHRASES = [
  'market share', 'technology leader', 'most important patent', 'foundational patent',
  'blocking patent', 'most valuable', 'best patent', 'nobody has patented', 'nobody patented',
  'all patents in this field', 'patent is valid', 'patent is invalid', 'innovation score',
]

// ---------- Scope (§9–§10) ----------

export function buildLandscapeScope(input = {}) {
  return {
    matter_id: input.matter_id || null,
    landscape_id: input.landscape_id || 'landscape-pending',
    title: input.title || input.technology_scope || 'Untitled landscape',
    technology_scope: input.technology_scope || '',
    included_concepts: [...(input.included_concepts || [])],
    excluded_concepts: [...(input.excluded_concepts || [])],
    jurisdictions: [...(input.jurisdictions || [])],
    time_range: input.time_range || null,
    publication_cutoff: input.publication_cutoff || null,
    document_types: [...(input.document_types || [])],
    applicants_or_assignees: [...(input.applicants_or_assignees || input.competitors || [])],
    inventors: [...(input.inventors || [])],
    classifications: [...(input.classifications || [])],
    language_scope: [...(input.language_scope || [])],
    search_sources: [...(input.search_sources || input.data_sources || [])],
    analysis_modes: [...(input.analysis_modes || [])],
    claim_analysis_enabled: Boolean(input.claim_analysis_enabled),
    legal_status_enabled: input.legal_status_enabled !== false,
    citation_analysis_enabled: Boolean(input.citation_analysis_enabled),
    family_normalisation_enabled: input.family_normalisation_enabled !== false,
    corpus_version: input.corpus_version || 'corpus_v1',
    scope_version: input.scope_version || 'scope_v1',
  }
}

// ---------- Search strategy & provenance (§12–§14) ----------

let searchSequence = 0

export function recordSearchIteration({ query = '', source = '', filters = {}, result_count = 0, selected_count = 0, excluded_count = 0, notes = '', iteration_type = 'SEED_SEARCH', date_run = null } = {}) {
  searchSequence += 1
  return {
    query_id: `query-${String(searchSequence).padStart(3, '0')}`,
    query,
    source,
    filters,
    date_run: date_run || new Date().toISOString().slice(0, 10),
    result_count,
    selected_count,
    excluded_count,
    notes,
    iteration_type,
  }
}

export function buildSearchStrategy({ keywords = [], synonyms = [], classifications = [], assignees = [], inventors = [], citations = false, family_expansion = false, claim_terms = [], fields = ['title', 'abstract'] } = {}) {
  if (!keywords.length && !classifications.length && !assignees.length) {
    return { valid: false, issue: 'SEARCH_STRATEGY_UNDEFINED', note: 'A landscape search cannot rest on a single phrase or model memory.' }
  }
  return { valid: true, keywords, synonyms, classifications, assignees, inventors, citations, family_expansion, claim_terms, fields }
}

// ---------- Corpus (§15–§18) ----------

export function verifyCorpusDocument(document = {}) {
  if (!document.publication_number && !document.application_number && !document.source_id) {
    return { verification: 'FAILED', issues: ['DOCUMENT_IDENTITY_REQUIRED'] }
  }
  if (document.verified_existence === true || document.verified_existence === 'VERIFIED') {
    return { verification: 'VERIFIED', issues: [] }
  }
  if (document.verified_existence === false) return { verification: 'FAILED', issues: ['DOCUMENT_VERIFICATION_FAILED'] }
  return { verification: 'RESEARCH_REQUIRED', issues: ['DOCUMENT_EXISTENCE_UNVERIFIED'] }
}

export function applyInclusionExclusion({ candidates = [], include = {}, exclude = {} } = {}) {
  const included = []
  const excluded = []
  for (const candidate of candidates) {
    const reasons = []
    if (include.jurisdictions?.length && !include.jurisdictions.includes(candidate.jurisdiction)) reasons.push('outside-jurisdiction-scope')
    if (include.from && String(candidate.publication_date || '') < String(include.from)) reasons.push('outside-time-range')
    if (include.to && String(candidate.publication_date || '') > String(include.to)) reasons.push('outside-time-range')
    if (exclude.terms?.length && exclude.terms.some((term) => JSON.stringify(candidate).toLowerCase().includes(String(term).toLowerCase()))) reasons.push('excluded-concept')
    if (candidate.duplicate_of) reasons.push('duplicate-record')
    if (!reasons.length && candidate.relevance === 'false-positive') reasons.push('false-positive')
    const record = { ...candidate, exclusion_reason: reasons.length ? reasons.join(';') : null, reviewed_at: new Date().toISOString() }
    if (reasons.length) excluded.push(record)
    else included.push(record)
  }
  return { included_documents: included, excluded_documents: excluded }
}

export function buildPatentCorpus({ corpus_id = null, scope = {}, candidates = [], include = {}, exclude = {}, version = 'corpus_v1' } = {}) {
  const { included_documents, excluded_documents } = applyInclusionExclusion({ candidates, include, exclude })
  const verified = included_documents.filter((doc) => verifyCorpusDocument(doc).verification === 'VERIFIED')
  const unverified = included_documents.filter((doc) => verifyCorpusDocument(doc).verification !== 'VERIFIED')
  return {
    corpus_id: corpus_id || `corpus-${Date.now()}`,
    corpus_version: version,
    created_at: new Date().toISOString(),
    scope,
    included_documents,
    excluded_documents,
    verified_documents: verified,
    unverified_documents: unverified,
    normalisation_status: 'PENDING',
    quality_metrics: {
      raw_results: candidates.length,
      deduplicated_documents: included_documents.length,
      verified_documents: verified.length,
      unverified_documents: unverified.length,
      excluded_documents: excluded_documents.length,
    },
  }
}

export function versionCorpus(corpus, { new_candidates = [], removals = [], reason = 'Landscape corpus update' } = {}) {
  const versionNumber = Number(String(corpus.corpus_version).replace(/\D/g, '')) || 1
  const next = buildPatentCorpus({
    corpus_id: corpus.corpus_id,
    scope: corpus.scope,
    candidates: [...corpus.included_documents, ...new_candidates].filter((doc) => !removals.includes(doc.source_id || doc.publication_number)),
    version: `corpus_v${versionNumber + 1}`,
  })
  const added = new_candidates.filter((doc) => !corpus.included_documents.some((old) => (old.source_id || old.publication_number) === (doc.source_id || doc.publication_number)))
  return { previous_version: corpus.corpus_version, corpus: next, delta: { added: added.length, removed: removals.length, reason }, history_preserved: true }
}

export function appendExclusionLog(log = [], { document_id, reason, rule = 'inclusion-exclusion-criteria', reviewer = 'system' } = {}) {
  return [...log, { document_id, reason, rule, reviewer, timestamp: new Date().toISOString() }]
}

// ---------- Family normalisation (§20–§26) ----------

export function normalizeJurisdictionCode(value = '') {
  const clean = String(value || '').trim().toLowerCase()
  const map = {
    us: 'US', usa: 'US', 'united states': 'US', uspto: 'US',
    ep: 'EP', epo: 'EP', europe: 'EP', european: 'EP',
    wo: 'WO', pct: 'WO', wipo: 'WO',
    cn: 'CN', china: 'CN', jp: 'JP', japan: 'JP', kr: 'KR', korea: 'KR',
    gb: 'GB', uk: 'GB', de: 'DE', fr: 'FR',
  }
  return map[clean] || String(value || '').trim().toUpperCase() || 'UNKNOWN'
}

export function selectRepresentativeDocument(members = [], rule = 'earliest-publication-verified') {
  const sorted = [...members].sort((a, b) => String(a.publication_date || '9999').localeCompare(String(b.publication_date || '9999')))
  const verified = sorted.find((doc) => verifyCorpusDocument(doc).verification === 'VERIFIED')
  return { document: verified || sorted[0] || null, rule }
}

export function normalizeFamilies({ documents = [], family_definition = 'simple-family', uncertain_pairs = [] } = {}) {
  const groups = groupPatentFamilies(documents.map((doc, index) => ({
    reference_id: doc.source_id || doc.publication_number || `doc-${index}`,
    family_id: doc.family_id || null,
    publication_date: doc.publication_date || null,
  })))
  const uncertainKeys = new Set((uncertain_pairs || []).map((pair) => [...pair].sort().join('|')))
  const families = groups.map((group) => {
    const members = documents.filter((doc, index) =>
      (doc.family_id || `SINGLE:${doc.source_id || doc.publication_number || `doc-${index}`}`) === group.family_id)
    const representative = selectRepresentativeDocument(members)
    const jurisdictions = [...new Set(members.map((doc) => normalizeJurisdictionCode(doc.jurisdiction)))]
    const memberKeys = new Set(); members.forEach((doc) => { if (doc.source_id) memberKeys.add(String(doc.source_id)); if (doc.publication_number) memberKeys.add(String(doc.publication_number)) })
    const uncertain = [...uncertainKeys].some((key) => { const [a, b] = key.split('|'); return memberKeys.has(a) && memberKeys.has(b) })
    const unmergedUncertainty = [...uncertainKeys].some((key) => { const [a, b] = key.split('|'); return (memberKeys.has(a) || memberKeys.has(b)) && !(memberKeys.has(a) && memberKeys.has(b)) })
    return {
      family_id: group.family_id,
      family_type: group.family_id.startsWith('SINGLE:') ? 'UNRESOLVED_SINGLE' : family_definition,
      earliest_priority: members.map((doc) => doc.priority_date || doc.filing_date).filter(Boolean).sort()[0] || null,
      members: members.map((doc) => doc.source_id || doc.publication_number),
      jurisdictions,
      applicants: [...new Set(members.map((doc) => doc.applicant || doc.assignee).filter(Boolean))],
      status_summary: 'see-legal-status-layer',
      technical_theme: null,
      representative_document: representative.document?.source_id || representative.document?.publication_number || null,
      representative_rule: representative.rule,
      relationship: (uncertain || unmergedUncertainty) ? 'FAMILY_RELATIONSHIP_UNCERTAIN' : 'RESOLVED',
      continuations: members.filter((doc) => /continuation|divisional/i.test(doc.relation || '')).map((doc) => ({ document: doc.source_id || doc.publication_number, relation: doc.relation })),
    }
  })
  const document_count = documents.length
  const family_count = families.filter((f) => f.family_type !== 'UNRESOLVED_SINGLE').length + families.filter((f) => f.family_type === 'UNRESOLVED_SINGLE').length
  return { families, document_count, family_count, family_definition, note: 'DOCUMENT_COUNT and FAMILY_COUNT are distinct metrics; family members are never counted as independent inventions.' }
}

// ---------- Entity resolution (§33–§36) ----------

export function normalizeEntityName(value = '') {
  return String(value || '').toLowerCase()
    .replace(/\b(corporation|incorporated|corp\.?|inc\.?|ltd\.?|limited|llc|gmbh|ag|s\.?a\.?|pty|co\.?|company)\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function resolveAssigneeEntity({ raw_name = '', verified_mappings = [] } = {}) {
  const verified = verified_mappings.find((mapping) =>
    mapping.aliases?.some((alias) => normalizeEntityName(alias) === normalizeEntityName(raw_name)) ||
    normalizeEntityName(mapping.canonical_name) === normalizeEntityName(raw_name))
  if (verified) {
    return { raw_name, canonical_name: verified.canonical_name, aliases: verified.aliases || [], resolution_source: verified.source || 'verified-mapping', resolution_status: 'VERIFIED_MATCH' }
  }
  return { raw_name, canonical_name: raw_name, aliases: [], resolution_source: null, resolution_status: 'UNKNOWN' }
}

export function groupAssigneeRecords({ records = [], verified_mappings = [] } = {}) {
  const resolved = records.map((record) => resolveAssigneeEntity({ raw_name: record, verified_mappings }))
  const groups = new Map()
  for (const entity of resolved) {
    const key = entity.resolution_status === 'VERIFIED_MATCH' ? entity.canonical_name : `RAW:${entity.raw_name}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entity)
  }
  return [...groups.entries()].map(([key, members]) => ({
    canonical_name: members[0].canonical_name,
    raw_names: members.map((m) => m.raw_name),
    resolution_status: members[0].resolution_status,
    note: members[0].resolution_status === 'VERIFIED_MATCH'
      ? 'Grouped under verified mapping.'
      : 'Kept separate: string similarity alone never merges entities.',
  }))
}

export function labelOwnership({ applicant = null, assignee = null, owner_verified = false } = {}) {
  if (assignee && owner_verified) return { applicant, assignee, current_owner: assignee, label: 'CURRENT_OWNER_VERIFIED' }
  if (assignee) return { applicant, assignee, current_owner: null, label: 'RECORDED_ASSIGNEE_NOT_VERIFIED_AS_OWNER' }
  return { applicant, assignee: null, current_owner: null, label: 'APPLICANT_ONLY' }
}

// ---------- Date model & trends (§27–§30) ----------

export function yearOf(document = {}, basis = 'EARLIEST_PRIORITY_YEAR') {
  const pick = basis === 'FILING_YEAR' ? document.filing_date
    : basis === 'PUBLICATION_YEAR' ? document.publication_date
    : basis === 'GRANT_YEAR' ? document.grant_date
    : document.priority_date || document.filing_date
  const year = String(pick || '').slice(0, 4)
  return /^\d{4}$/.test(year) ? Number(year) : null
}

export function buildAnnualSeries({ families = [], basis = 'EARLIEST_PRIORITY_YEAR', current_year = new Date().getFullYear() } = {}) {
  const counts = new Map()
  for (const family of families) {
    const representative = family.earliest_priority || (family.members || [])[0]?.publication_date
    const year = typeof representative === 'number' ? representative : yearOf({ priority_date: family.earliest_priority, filing_date: representative, publication_date: representative, grant_date: representative }, basis)
    if (!year) continue
    counts.set(year, (counts.get(year) || 0) + 1)
  }
  const years = [...counts.entries()].sort((a, b) => a[0] - b[0])
  const flags = []
  const latestYear = years.length ? years[years.length - 1][0] : null
  if (latestYear && latestYear >= current_year - 1) flags.push('RECENT_YEAR_INCOMPLETE')
  return { basis, series: years.map(([year, count]) => ({ year, families: count })), flags, note: `Date basis: ${basis}. Recent years may be incomplete because of publication lag.` }
}

// ---------- Classification (§39–§41) ----------

export function normalizeClassificationCode(code = '') {
  const clean = String(code || '').trim().toUpperCase().replace(/\s+/g, '')
  const match = clean.match(/^([A-H])(\d{2})([A-Z])(\d{1,4})(?:\/(\d+))?$/)
  if (!match) return { code: clean, valid_format: false, section: null, class: null, subclass: null, group: null, subgroup: null }
  return { code: clean, valid_format: true, section: match[1], class: match[2], subclass: match[3], group: match[4], subgroup: match[5] || null }
}

export function verifyClassification({ code = '', source_codes = [], ai_proposed = false } = {}) {
  if (source_codes.map((c) => String(c).toUpperCase().replace(/\s+/g, '')).includes(String(code).toUpperCase().replace(/\s+/g, ''))) {
    return { code, status: 'VERIFIED', provenance: 'SOURCE' }
  }
  if (ai_proposed) return { code, status: 'AI_PROPOSED', provenance: 'AI_PROPOSED_THEME' }
  return { code, status: 'UNVERIFIED', provenance: 'UNVERIFIED' }
}

// ---------- Claim themes (§43–§45, canonical claim model) ----------

export function extractClaimThemes({ claim_text = '', claim_set_version = 'v1' } = {}) {
  const parsed = parsePatentClaims(claim_text)
  const effective = buildEffectiveClaimLimitations(parsed, claim_set_version)
  const themes = []
  for (const claim of effective) {
    for (const limitation of claim.full_effective_limitations || []) {
      const concept = String(limitation.normalized_concept || limitation.exact_text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      themes.push({
        claim_number: claim.claim_number,
        limitation_id: limitation.limitation_id,
        normalised_concept: concept,
        claim_version: claim_set_version,
        field: 'claims',
      })
    }
  }
  return themes
}

// ---------- Taxonomy & clustering (§11, §46–§49) ----------

export function buildTaxonomyNode({ domain, subdomain = null, theme = null, subtheme = null, feature = null, provenance = 'USER_PROVIDED' } = {}) {
  return { domain, subdomain, theme, subtheme, feature, provenance }
}

export function assignTheme({ family_id, theme = '', basis = '', confidence = 'UNREVIEWED', reviewer = null } = {}) {
  const aiProposed = /ai|model|cluster|semantic/i.test(basis) && !reviewer
  return {
    family_id,
    theme,
    basis,
    status: aiProposed ? 'AI_PROPOSED_THEME' : 'ASSIGNED',
    confidence,
    reviewer,
    multi_theme_allowed: true,
  }
}

export function assessClusterQuality({ clusters = [] } = {}) {
  return clusters.map((cluster) => ({
    cluster_id: cluster.cluster_id,
    size: (cluster.members || []).length,
    cohesion: cluster.cohesion || 'UNMEASURED',
    separation: cluster.separation || 'UNMEASURED',
    outliers: cluster.outliers || 0,
    coverage_note: cluster.force_all ? 'FORCED_FULL_COVERAGE_REVIEW_REQUIRED' : 'PARTIAL_COVERAGE_ALLOWED',
    labels: (cluster.labels || []).map((label) => ({ ...label, status: label.reviewed ? 'REVIEWED' : 'AI_PROPOSED_THEME' })),
  }))
}

// ---------- Deterministic calculation engine (§62–§63, §93) ----------

export function shareCount(numerator, denominator, label = 'share') {
  if (!denominator || denominator <= 0) return { value: null, numerator, denominator, label, note: 'Denominator is zero or unknown; no share calculated.' }
  const value = Math.round((numerator / denominator) * 1000) / 10
  return { value, numerator, denominator, label }
}

export function growthRate({ from = null, to = null, period = '' } = {}) {
  if (from === null || to === null || from <= 0) {
    return { value: null, numerator: to, denominator: from, period, note: 'Growth requires a positive baseline count.' }
  }
  return { value: Math.round(((to - from) / from) * 1000) / 10, numerator: to - from, denominator: from, period }
}

export function rankEntities(entries = [], { metric = 'families', denominator = 0, denominator_label = '', limit = 10 } = {}) {
  const sorted = [...entries].sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
  const ranked = []
  let rank = 0
  let previous = null
  for (const entry of sorted.slice(0, limit)) {
    if (entry[metric] !== previous) rank = ranked.length + 1
    previous = entry[metric]
    ranked.push({ rank, name: entry.name, [metric]: entry[metric], share: shareCount(entry[metric] || 0, denominator, denominator_label) })
  }
  return { metric, denominator, denominator_label, ranked, tie_handling: 'dense-rank; ties share a rank' }
}

export function concentrationTopN(entries = [], n = 5, denominator = 0) {
  const top = [...entries].sort((a, b) => (b.families || 0) - (a.families || 0)).slice(0, n)
  const total = top.reduce((sum, entry) => sum + (entry.families || 0), 0)
  return { top_n: n, families: total, share: shareCount(total, denominator, 'VERIFIED_FAMILIES_IN_CORPUS'), members: top.map((e) => e.name) }
}

// ---------- Corpus metrics & quality (§83–§86) ----------

export function corpusQualityMetrics({ corpus = {}, families = [], status_verified = 0, status_unknown = 0 } = {}) {
  const metrics = corpus.quality_metrics || {}
  return {
    raw_results: metrics.raw_results ?? 0,
    deduplicated_documents: metrics.deduplicated_documents ?? 0,
    verified_documents: metrics.verified_documents ?? 0,
    unverified_documents: metrics.unverified_documents ?? 0,
    families: families.length,
    unresolved_family_records: families.filter((f) => f.family_type === 'UNRESOLVED_SINGLE').length,
    excluded_documents: metrics.excluded_documents ?? 0,
    status_verified,
    status_unknown,
  }
}

export function assessDataQuality({ metadata_verification = 'UNKNOWN', family_resolution = 'UNKNOWN', assignee_normalisation = 'UNKNOWN', classification_coverage = 'UNKNOWN', status_freshness = 'UNKNOWN', text_availability = 'UNKNOWN', translation_quality = 'UNKNOWN' } = {}) {
  const levels = [metadata_verification, family_resolution, assignee_normalisation, classification_coverage, status_freshness, text_availability, translation_quality]
  if (levels.includes('UNKNOWN') || levels.includes('LIMITED')) return 'LIMITED'
  if (levels.includes('MODERATE')) return 'MODERATE'
  return 'HIGH'
}

// ---------- Trends, emergence, white space (§60–§72) ----------

export function describeTrend({ series = [], basis = '' } = {}) {
  if (series.length < 2) return { statement: 'Insufficient annual points for a trend statement.', basis }
  const first = series[0]
  const last = series[series.length - 1]
  const growth = growthRate({ from: first.families, to: last.families, period: `${first.year}-${last.year}` })
  return {
    statement: `Verified family counts in the corpus ${growth.value === null ? 'cannot be growth-rated' : `changed by ${growth.value}%`} between ${first.year} (${first.families}) and ${last.year} (${last.families}).`,
    basis,
    calculation: growth,
  }
}

export function detectEmergingThemes({ themes = [], recent_years = 3, current_year = new Date().getFullYear() } = {}) {
  return themes
    .filter((theme) => (theme.recent_family_growth || 0) > 0 || (theme.new_assignees || 0) > 0)
    .map((theme) => ({
      theme: theme.theme,
      evidence: { recent_family_growth: theme.recent_family_growth || 0, new_assignees: theme.new_assignees || 0, theme_share_change: theme.theme_share_change || 0 },
      lag_caveat: theme.window_includes_recent ? 'Window includes incomplete recent years; emergence is provisional.' : null,
    }))
}

export function detectDecliningThemes({ themes = [], min_window_years = 5 } = {}) {
  return themes
    .filter((theme) => (theme.window_years || 0) >= min_window_years && (theme.recent_complete_change || 0) < 0 && !theme.window_includes_incomplete)
    .map((theme) => ({ theme: theme.theme, evidence: { window_years: theme.window_years, recent_complete_change: theme.recent_complete_change } }))
}

export function whiteSpaceSignal({ dimension = '', theme = '', family_count = 0, corpus_families = 0, corpus_version = '' } = {}) {
  return {
    dimension,
    theme,
    signal: family_count === 0 ? 'NO_VERIFIED_FAMILY_IN_CORPUS' : 'UNDERREPRESENTED_THEME_WITHIN_SEARCH_SCOPE',
    family_count,
    corpus_families,
    corpus_version,
    trace: `Theme "${theme}" (${dimension}): ${family_count} of ${corpus_families} verified families in ${corpus_version}.`,
    not_claimed: ['commercial opportunity', 'patentability', 'FTO', 'unclaimed territory'],
  }
}

// ---------- Portfolios, competitors, overlap (§65–§75) ----------

export function comparePortfolios({ assignees = [], corpus_families = 0 } = {}) {
  return assignees.map((assignee) => ({
    assignee: assignee.name,
    verified_families: assignee.families || 0,
    family_share: shareCount(assignee.families || 0, corpus_families, 'VERIFIED_FAMILIES_IN_CORPUS'),
    jurisdiction_breadth: (assignee.jurisdictions || []).length,
    theme_distribution: assignee.themes || {},
    filing_trend: assignee.trend || null,
    status_mix: assignee.status_mix || null,
    note: 'Quantity is descriptive; no leadership, quality, or value inference is made.',
  }))
}

export function labelCompetitor({ name = '', user_defined = false, evidence = '' } = {}) {
  if (user_defined) return { name, status: 'USER_DEFINED_COMPETITOR', evidence }
  return { name, status: 'CORPUS_ASSIGNEE', note: 'Assignee presence alone does not establish competitor status.' }
}

export function portfolioOverlap({ portfolio_a = {}, portfolio_b = {} } = {}) {
  const themesA = new Set(portfolio_a.themes || [])
  const themesB = new Set(portfolio_b.themes || [])
  const shared = [...themesA].filter((theme) => themesB.has(theme))
  return {
    shared_themes: shared,
    theme_overlap_count: shared.length,
    note: 'Overlap is descriptive similarity only; overlap is never infringement.',
  }
}

export function newEntrants({ assignees = [], after_year = 0 } = {}) {
  return assignees
    .filter((assignee) => (assignee.first_corpus_year || 0) > after_year)
    .map((assignee) => ({ name: assignee.name, first_corpus_year: assignee.first_corpus_year, definition: `First verified family in corpus after ${after_year}. Patent-data entrant only, not a market entrant.` }))
}

// ---------- Citations (§53–§55) ----------

export function citationMetrics({ families = [] } = {}) {
  return families.map((family) => ({
    family_id: family.family_id,
    forward_citations: family.forward_citations ?? null,
    backward_citations: family.backward_citations ?? null,
    caveat: 'Citation counts are descriptive; they do not establish quality, validity, or commercial importance. Cross-age comparisons require a caveat.',
  }))
}

export function buildCitationGraph({ families = [] } = {}) {
  const nodes = families.map((family) => family.family_id)
  const edges = []
  for (const family of families) {
    for (const cited of family.cites || []) {
      if (nodes.includes(cited)) edges.push({ from: family.family_id, cites: cited })
    }
  }
  return { method: 'corpus citation fields only; no external citation expansion claimed', nodes, edges }
}

// ---------- Legal status (§56–§59) ----------

export function summarizeLegalStatus({ documents = [], checked_at = null, source = '' } = {}) {
  const distribution = {}
  let conflicts = 0
  for (const document of documents) {
    const result = verifyLegalStatus(document)
    const category = result.status_category || 'STATUS_UNCERTAIN'
    distribution[category] = (distribution[category] || 0) + 1
    if (result.flag === 'STATUS_CONFLICT_REQUIRES_REVIEW') conflicts += 1
  }
  return {
    distribution,
    status_conflicts: conflicts,
    status_checked_at: checked_at || new Date().toISOString().slice(0, 10),
    source,
    freshness: checked_at ? 'CHECKED' : 'UNKNOWN',
    note: 'Status is descriptive; granted is not valuable, expired is not irrelevant, pending is not weak.',
  }
}

// ---------- Representative patents (§51–§52) ----------

export function selectRepresentativePatents({ families = [], criteria = 'centrality', limit = 5 } = {}) {
  const scored = families.map((family) => {
    let score = 0
    const basis = []
    if (criteria === 'centrality' || criteria === 'all') { score += family.forward_citations || 0; basis.push(`forward citations: ${family.forward_citations ?? 'unknown'}`) }
    if (criteria === 'family-size' || criteria === 'all') { score += (family.members || []).length; basis.push(`family members: ${(family.members || []).length}`) }
    if (criteria === 'claim-relevance' || criteria === 'all') { score += (family.claim_themes || []).length * 10; basis.push(`claim themes: ${(family.claim_themes || []).length}`) }
    return { family_id: family.family_id, score, basis: basis.join('; '), label: criteria === 'all' ? 'REPRESENTATIVE_PATENT' : criteria === 'centrality' ? 'HIGHLY_CITED_WITHIN_CORPUS' : criteria === 'family-size' ? 'LARGE_FAMILY' : criteria === 'claim-relevance' ? 'RELEVANT_CLAIM_THEME' : criteria.toUpperCase().replace(/-/g, '_') }
  }).sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

// ---------- Chart data & narrative validation (§89–§96) ----------

export function buildChartData({ metrics = {} } = {}) {
  return {
    annual_family_counts: metrics.annual_series || null,
    top_assignees: metrics.assignee_ranking || null,
    jurisdiction_distribution: metrics.jurisdiction_distribution || null,
    theme_distribution: metrics.theme_distribution || null,
    status_distribution: metrics.status_distribution || null,
    assignee_theme_matrix: metrics.assignee_theme_matrix || null,
    source: 'single metric source shared with report prose',
  }
}

export function validateNarrativeClaims({ claims = [], metrics = {} } = {}) {
  const matrix = (claims || []).map((claim) => ({
    claim: claim.text,
    metric: claim.metric,
    corpus_version: claim.corpus_version,
    matches: JSON.stringify(metrics[claim.metric] || null).includes(String(claim.value)),
  }))
  const contradictions = detectAnalysisContradictions(
    matrix.map((item, index) => ({ claim_number: 1, limitation_id: `metric-${index}`, reference_id: 'corpus', disclosure_status: item.matches ? 'EXPLICITLY_DISCLOSED' : 'NOT_IDENTIFIED' })),
    matrix.filter((item) => !item.matches).map((item, index) => ({ claim_number: 1, limitation_id: `metric-${index}`, reference_id: 'corpus', assertion: 'DISCLOSED' }))
  )
  return { validated: matrix, contradictions, analysis_contradiction: contradictions.length > 0 }
}

export function buildLandscapeEvidenceGraph({ scope, searches = [], corpus_version = '', families = [], metrics = [], conclusions = [] } = {}) {
  return {
    scope: scope?.landscape_id || null,
    searches: searches.map((s) => s.query_id),
    corpus_version,
    families: families.length,
    metrics: metrics.map((m) => m.metric_id || m.label),
    conclusions: conclusions.map((c) => c.conclusion_id || c.text),
    trace: 'LANDSCAPE_SCOPE → SEARCH_QUERY → SOURCE_RESULT → PATENT_DOCUMENT → FAMILY → ASSIGNEE → CLASSIFICATION → THEME → METRIC → CONCLUSION',
  }
}

// ---------- Staleness, versions, delta (§103–§106) ----------

export function assessLandscapeStaleness({ last_search_date = null, status_age_days = null, update_window_days = 365, new_input = false } = {}) {
  const reasons = []
  if (!last_search_date) reasons.push('NO_SEARCH_DATE_RECORDED')
  if (new_input) reasons.push('NEW_CORPUS_INPUT')
  if (status_age_days !== null && status_age_days > update_window_days) reasons.push('STATUS_AGE_EXCEEDED')
  if (last_search_date) {
    const ageDays = Math.round((Date.now() - new Date(last_search_date).getTime()) / 86400000)
    if (ageDays > update_window_days) reasons.push('SEARCH_WINDOW_EXCEEDED')
  }
  return reasons.length ? { stale: true, flag: 'LANDSCAPE_STALE', reasons } : { stale: false, flag: null, reasons: [] }
}

export function createLandscapeVersion(history = [], snapshot = {}, reason = 'Landscape updated') {
  const version = `landscape_v${history.length + 1}`
  return { version, timestamp: new Date().toISOString(), reason, snapshot, history: [...history, version] }
}

// ---------- Downstream handoffs (§107–§111) ----------

export function buildLandscapeHandoff({ kind = '', payload = {} } = {}) {
  const targets = {
    'prior-art': 'patent-prior-art-search-report',
    novelty: 'patent-novelty-opinion',
    fto: 'freedom-to-operate-opinion',
    invalidity: 'patent-invalidity-opinion',
    patentability: 'patentability-assessment',
    monitoring: 'patent-watch',
  }
  if (!targets[kind]) throw new Error('Unsupported landscape handoff')
  return { source_workflow: 'patent-landscape-report', target_workflow: targets[kind], ...payload, legal_conclusion_transfer: 'NONE — landscape signals never transfer as legal conclusions' }
}

// ---------- Confidentiality (§113) ----------

export function assertLandscapeConfidentiality({ engines = [], mode = 'CONFIDENTIAL_IP', env = {} } = {}) {
  try {
    return assertChatAllowed({ engines, mode, env })
  } catch (error) {
    error.landscape_flag = LANDSCAPE_REVIEW_FLAGS.CONFIDENTIAL_PILOT_BLOCKED
    throw error
  }
}

// ---------- Report assembly (§98–§102) ----------

function landscapeSection(title, body) {
  return `## ${title}\n\n${body && String(body).trim() ? body : 'Not addressed within the current scope.'}\n`
}

export function assembleLandscapeReport(input = {}) {
  const {
    scope = {}, corpus_metrics = {}, annual_series = null, jurisdiction_distribution = null,
    assignee_ranking = null, themes = [], classifications = null, claim_themes = null,
    portfolio = null, citations = null, legal_status = null, emerging = [], white_space = [],
    representative = [], observations = [], limitations = [], next_steps = [], searches = [],
    data_quality = 'UNKNOWN', research_completeness = 'UNKNOWN', corpus_version = 'corpus_v1',
  } = input
  const lines = []
  lines.push(`# Patent Landscape Report (Corpus-Evidence Intelligence)\n`)
  lines.push(landscapeSection('1. Executive Summary',
    `The verified corpus contains ${corpus_metrics.deduplicated_documents ?? 0} patent documents representing ${corpus_metrics.families ?? 0} normalised families within the defined search scope (${corpus_version}). All figures below derive deterministically from that corpus; no market, validity, or value conclusions are made.`))
  lines.push(landscapeSection('2. Scope and Objectives', `Technology: ${scope.technology_scope || 'undefined'}. Exclusions: ${(scope.excluded_concepts || []).join('; ') || 'none recorded'}. Jurisdictions: ${(scope.jurisdictions || []).join(', ') || 'undefined'}. Period: ${scope.time_range || 'undefined'}.`))
  lines.push(landscapeSection('3. Methodology', 'Scope → reproducible search → existence verification → inclusion/exclusion → versioned corpus → family normalisation → entity resolution → deterministic metrics → qualified observations.'))
  lines.push(landscapeSection('4. Search Strategy', (searches || []).map((s) => `- ${s.query_id}: "${s.query}" @ ${s.source} (${s.iteration_type}); results ${s.result_count}, selected ${s.selected_count}, excluded ${s.excluded_count}.`).join('\n')))
  lines.push(landscapeSection('5. Inclusion / Exclusion Criteria', `Included: technical relevance, scope jurisdictions, scope period, in-scope document types. Excluded documents carry persisted reasons in the exclusion log (${corpus_metrics.excluded_documents ?? 0} excluded).`))
  lines.push(landscapeSection('6. Data Sources', `Sources queried: ${(scope.search_sources || []).join(', ') || 'none recorded'}. Only queried sources are claimed; no global coverage is implied.`))
  lines.push(landscapeSection('7. Corpus Quality', `Verified documents: ${corpus_metrics.verified_documents ?? 0}; unverified: ${corpus_metrics.unverified_documents ?? 0}; unresolved family records: ${corpus_metrics.unresolved_family_records ?? 0}. Data quality: ${data_quality}. Research completeness: ${research_completeness}.`))
  lines.push(landscapeSection('8. Patent Family Overview', `Documents: ${corpus_metrics.deduplicated_documents ?? 0}; normalised families: ${corpus_metrics.families ?? 0}. Document count and family count are distinct.`))
  lines.push(landscapeSection('9. Filing Trends', annual_series ? `Date basis: ${annual_series.basis}. ${annual_series.series.map((p) => `${p.year}: ${p.families}`).join('; ')}. ${(annual_series.flags || []).join(', ')}` : null))
  lines.push(landscapeSection('10. Geographic Distribution', jurisdiction_distribution ? JSON.stringify(jurisdiction_distribution) : null))
  lines.push(landscapeSection('11. Leading Applicants / Assignees', assignee_ranking ? (assignee_ranking.ranked || []).map((r) => `- #${r.rank} ${r.name}: ${r.families} families (${r.share?.value ?? '?'}% of ${r.share?.label || 'corpus'}).`).join('\n') : null))
  lines.push(landscapeSection('12. Technology Taxonomy', (input.taxonomy || []).map((t) => `- ${[t.domain, t.subdomain, t.theme, t.subtheme, t.feature].filter(Boolean).join(' → ')} [${t.provenance}]`).join('\n')))
  lines.push(landscapeSection('13. Key Technical Themes', (themes || []).map((t) => `- ${t.theme}: ${t.family_count ?? '?'} families, ${t.document_count ?? '?'} documents; top assignees ${(t.top_assignees || []).join(', ') || 'n/a'}.`).join('\n')))
  lines.push(landscapeSection('14. Classification Analysis', classifications ? JSON.stringify(classifications) : null))
  lines.push(landscapeSection('15. Claim Theme Analysis', claim_themes ? JSON.stringify(claim_themes) : null))
  lines.push(landscapeSection('16. Competitor / Portfolio Comparison', portfolio ? JSON.stringify(portfolio) : null))
  lines.push(landscapeSection('17. Citation Analysis', citations ? JSON.stringify(citations) : null))
  lines.push(landscapeSection('18. Legal Status Overview', legal_status ? JSON.stringify(legal_status.distribution || legal_status) : null))
  lines.push(landscapeSection('19. Emerging Themes', (emerging || []).map((e) => `- ${e.theme}: ${JSON.stringify(e.evidence)}${e.lag_caveat ? ` (${e.lag_caveat})` : ''}`).join('\n')))
  lines.push(landscapeSection('20. Underrepresented / White-Space Signals', (white_space || []).map((w) => `- ${w.trace}`).join('\n')))
  lines.push(landscapeSection('21. Representative Patents / Families', (representative || []).map((r) => `- ${r.family_id} [${r.label}]: ${r.basis}`).join('\n')))
  lines.push(landscapeSection('22. Key Observations', (observations || []).map((o) => `- ${o}`).join('\n')))
  lines.push(landscapeSection('23. Research Limitations', (limitations || []).join('\n')))
  lines.push(landscapeSection('24. Recommended Next Research', (next_steps || []).join('\n')))
  lines.push(landscapeSection('25. Appendix / Corpus Methodology', `Corpus ${corpus_version}; family definition and representative rules recorded per family; entity resolutions recorded per assignee; calculations deterministic with persisted numerators and denominators.`))
  const report = lines.join('\n')
  const violations = BANNED_LANDSCAPE_PHRASES.filter((phrase) => report.toLowerCase().includes(phrase))
  if (violations.length) {
    const error = new Error(`Landscape boundary violation in assembled report: ${violations.join(', ')}`)
    error.code = 'LANDSCAPE_BOUNDARY_VIOLATION'
    throw error
  }
  return { report, corpus_version }
}

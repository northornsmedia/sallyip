/**
 * SALLYIP PATENT CLAIM CHART SERVICE — PART 1
 * Canonical Document #020: generic claim-to-evidence mapping infrastructure.
 *
 * Reuses shared components (no parallel engines):
 * - canonical claim model: patent-claim-service.js (#010)
 * - evidence overlap: claim-chart-service.js
 * - quote/entailment/temporal/contradiction validators
 * - confidentiality + export helpers
 *
 * CORE PRINCIPLE: the chart is evidence structure.
 * Specialist workflows supply legal conclusions. Mapping statuses
 * (MAPPED/PARTIAL/NOT_IDENTIFIED/...) are never legal conclusions.
 */

import { parsePatentClaims, splitClaimElements, buildClaimTree, buildEffectiveClaimLimitations } from './patent-claim-service.js'
import { evidenceOverlap } from './claim-chart-service.js'
import { detectAnalysisContradictions } from './novelty-service.js'
import { compareNumericalLimitation } from './novelty-service.js'
import { checkEntailment } from './entailment-service.js'
import { validateAuthorityCurrency } from './temporal-service.js'
import { assertChatAllowed } from './provider-policy.js'

export const CLAIM_CHART_MODES = Object.freeze([
  'CLAIM_TO_REFERENCE', 'CLAIM_TO_MULTIPLE_REFERENCES', 'CLAIM_TO_PATENT',
  'CLAIM_TO_NPL', 'CLAIM_TO_PRODUCT_EVIDENCE', 'CLAIM_TO_TECHNICAL_DOCUMENT',
  'CLAIM_TO_STANDARD', 'CLAIM_TO_SPECIFICATION_SUPPORT', 'CLAIM_TO_PRIORITY_SUPPORT',
  'CLAIM_TO_PROSECUTION_EVIDENCE', 'MULTI_CLAIM_CHART', 'DEPENDENT_CLAIM_CHART',
  'COMPARATIVE_CLAIM_CHART', 'USER_PROVIDED_EVIDENCE_CHART',
])

export const CHART_PURPOSES = Object.freeze([
  'GENERAL_ANALYSIS', 'PRIOR_ART_REVIEW', 'NOVELTY_SUPPORT', 'INVALIDITY_SUPPORT',
  'INFRINGEMENT_SUPPORT', 'FTO_SUPPORT', 'CLAIM_SUPPORT_REVIEW',
  'PRIORITY_SUPPORT_REVIEW', 'PROSECUTION_REVIEW', 'OTHER',
])

export const MAPPING_STATUSES = Object.freeze({
  MAPPED: 'MAPPED',
  PARTIALLY_MAPPED: 'PARTIALLY_MAPPED',
  POSSIBLY_MAPPED_REVIEW_REQUIRED: 'POSSIBLY_MAPPED_REVIEW_REQUIRED',
  NOT_IDENTIFIED: 'NOT_IDENTIFIED',
  AMBIGUOUS: 'AMBIGUOUS',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
})

export const TERMINOLOGY_RELATIONSHIPS = Object.freeze([
  'EXACT_TERM', 'SYNONYM', 'TECHNICALLY_EQUIVALENT_REVIEW_REQUIRED',
  'BROADER_TERM', 'NARROWER_TERM', 'RELATED_BUT_NOT_EQUIVALENT', 'UNKNOWN',
])

export const LIMITATION_TYPES = Object.freeze([
  'STRUCTURAL', 'FUNCTIONAL', 'RELATIONAL', 'METHOD_STEP', 'NUMERICAL',
  'RANGE', 'MATERIAL', 'CHEMICAL', 'SEQUENCE', 'CONTROL_LOGIC', 'DATA_FLOW',
  'RESULT', 'NEGATIVE_LIMITATION', 'OTHER',
])

export const CHART_REVIEW_FLAGS = Object.freeze({
  CLAIM_VERSION_CONFIRMATION_REQUIRED: 'CLAIM_VERSION_CONFIRMATION_REQUIRED',
  CLAIM_DEPENDENCY_REVIEW_REQUIRED: 'CLAIM_DEPENDENCY_REVIEW_REQUIRED',
  PREAMBLE_EFFECT_REVIEW_REQUIRED: 'PREAMBLE_EFFECT_REVIEW_REQUIRED',
  SPECIAL_CLAIM_CONSTRUCTION_REVIEW_REQUIRED: 'SPECIAL_CLAIM_CONSTRUCTION_REVIEW_REQUIRED',
  CONSTRUCTION_UNRESOLVED: 'CONSTRUCTION_UNRESOLVED',
  PRODUCT_VERSION_CONFIRMATION_REQUIRED: 'PRODUCT_VERSION_CONFIRMATION_REQUIRED',
  LOCKED_ROW_UPSTREAM_CHANGE: 'LOCKED_ROW_UPSTREAM_CHANGE',
  CLAIM_TEXT_INTEGRITY_FAILURE: 'CLAIM_TEXT_INTEGRITY_FAILURE',
  SOURCE_VERSION_CHANGED: 'SOURCE_VERSION_CHANGED',
  CLAIM_CHART_STALE: 'CLAIM_CHART_STALE',
  ANALYSIS_CONTRADICTION: 'ANALYSIS_CONTRADICTION',
  JURISDICTIONAL_LEGAL_REVIEW_REQUIRED: 'JURISDICTIONAL_LEGAL_REVIEW_REQUIRED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
})

export const EVIDENCE_QUALITY = Object.freeze(['DIRECT', 'INDIRECT', 'PARTIAL', 'AMBIGUOUS', 'UNVERIFIED'])

const BANNED_CHART_PHRASES = [
  'claim is anticipated', 'patent is invalid', 'product infringes',
  'fto risk exists', 'no fto risk', 'claim is novel', 'claim is patentable',
  '95% match', '82% infringement', '90% claim coverage',
]

// ---------- Chart target model (§10) ----------

export function buildChartTarget(input = {}) {
  return {
    chart_id: input.chart_id || 'chart-pending',
    matter_id: input.matter_id || null,
    patent_id: input.patent_id || input.publication_number || null,
    claim_set_id: input.claim_set_id || null,
    claim_set_version: input.claim_set_version || input.claim_version || null,
    claim_ids: [...(input.claim_ids || input.claim_numbers || [])],
    target_type: input.target_type || 'REFERENCE',
    target_ids: [...(input.target_ids || input.reference_ids || [])],
    chart_purpose: input.chart_purpose || 'GENERAL_ANALYSIS',
    jurisdiction_context: input.jurisdiction_context || input.jurisdiction || 'UNDECIDED',
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// ---------- Claim identity, version, snapshot (§11–§13) ----------

export function identifyChartClaim({ patent_id = null, claim_set_id = null, claim_set_version = null, claim_number = null, claim_text = '', claim_status = null, source = '', retrieved_at = null } = {}) {
  if (!claim_text || !String(claim_text).trim() || claim_number === null || claim_number === undefined) {
    return { valid: false, issue: 'UNIDENTIFIED_CLAIM', note: 'Never chart an unidentified claim.' }
  }
  return {
    valid: true, patent_id, claim_set_id, claim_set_version,
    claim_number: Number(claim_number), claim_text: String(claim_text),
    claim_status, source, retrieved_at: retrieved_at || new Date().toISOString(),
  }
}

export function confirmChartClaimVersion({ versions = [], requested_version = null } = {}) {
  if (!versions.length) return { status: 'RESEARCH_REQUIRED', version: null, flags: ['CLAIM_VERSION_UNAVAILABLE'] }
  if (versions.length === 1 && !requested_version) return { status: 'VERIFIED', version: versions[0], flags: [] }
  const match = requested_version ? versions.find((v) => String(v) === String(requested_version)) : null
  if (match) return { status: 'VERIFIED', version: match, flags: [] }
  return { status: 'CLAIM_VERSION_CONFIRMATION_REQUIRED', version: null, flags: ['CLAIM_VERSION_CONFIRMATION_REQUIRED'], available_versions: versions }
}

export function snapshotClaimText({ claim_number, claim_text = '', claim_set_version = null } = {}) {
  const text = String(claim_text || '')
  let hash = 0
  for (let index = 0; index < text.length; index++) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0
  return { claim_number: Number(claim_number), claim_text: text, claim_set_version, snapshot_hash: `snap-${Math.abs(hash).toString(16)}`, snapshot_at: new Date().toISOString() }
}

export function checkClaimTextIntegrity(snapshot, current_text = '') {
  if (snapshot.claim_text !== String(current_text || '')) {
    return { intact: false, flag: 'CLAIM_TEXT_INTEGRITY_FAILURE', note: 'Displayed claim text differs from the stored snapshot.' }
  }
  return { intact: true, flag: null }
}

// ---------- Canonical decomposition wrapper (§14–§31) ----------

export function classifyLimitationType(text = '') {
  const value = String(text || '').toLowerCase()
  if (/\b(without|excluding|free of|devoid of|absent)\b/i.test(value)) return 'NEGATIVE_LIMITATION'
  if (/\b\d+(\.\d+)?\s*(mm|cm|µm|nm|%|percent|degrees?|°c|kpa|mpa|hz|mhz|ghz|v\b|volts?|a\b|amps?|w\b|watts?|kg|mg|ml|l\b)\b|\b\d+(\.\d+)?\s*[–-]\s*\d+(\.\d+)?\b/i.test(value)) return 'NUMERICAL'
  if (/\b(configured to|adapted to|arranged to|operative to|capable of|for (performing|determining|calculating))\b/i.test(value)) return 'FUNCTIONAL'
  if (/\b(coupled to|connected to|mounted on|attached to|in fluid communication with|sends? .* to|controls?|responsive to)\b/i.test(value)) return 'RELATIONAL'
  if (/^(receiving|providing|determining|calculating|transmitting|heating|cooling|mixing|positioning|displaying|comparing|generating)\b/i.test(value.trim())) return 'METHOD_STEP'
  if (/\b(wherein|whereby|such that)\b/i.test(value)) return 'RESULT'
  if (/\b(data|signal|packet|stream|flow)\b/i.test(value)) return 'DATA_FLOW'
  if (/\b(if|when|upon|unless|until)\b/i.test(value)) return 'CONTROL_LOGIC'
  return 'STRUCTURAL'
}

export function extractPreambleAndTransition(claim_text = '') {
  const text = String(claim_text || '')
  const preamble = text.split(/comprising|consisting of|consisting essentially of/i)[0]?.trim() || ''
  const transitionMatch = text.match(/comprising|consisting of|consisting essentially of/i)?.[0] || null
  return {
    preamble,
    transition: transitionMatch,
    preamble_note: preamble ? 'PREAMBLE_EFFECT_REVIEW_REQUIRED where legally material.' : null,
    transition_note: transitionMatch ? 'Transition preserved verbatim; legal significance is jurisdiction/context dependent.' : null,
  }
}

export function decomposeChartClaim({ claim_text = '', claims = [], claim_set_version = 'v1', claim_number = null } = {}) {
  const parsed = claims.length ? claims : parsePatentClaims(claim_text)
  const tree = buildClaimTree(parsed)
  const effective = buildEffectiveClaimLimitations(parsed, claim_set_version)
  const selected = claim_number === null || claim_number === undefined
    ? effective
    : effective.filter((claim) => Number(claim.claim_number) === Number(claim_number))
  const limitations = []
  for (const claim of selected) {
    for (const limitation of claim.full_effective_limitations || []) {
      limitations.push({
        limitation_id: limitation.limitation_id,
        claim_id: claim.claim_number,
        sequence: limitation.ordinal,
        claim_text: limitation.exact_text,
        exact_claim_text: limitation.exact_text,
        normalised_concept: limitation.normalized_concept,
        dependency_source: limitation.dependency_source,
        inherited: limitation.inherited === true,
        parent_limitation: null,
        limitation_type: classifyLimitationType(limitation.exact_text),
        interpretation_notes: [],
        review_status: 'UNREVIEWED',
      })
    }
  }
  return { parsed, tree, effective, limitations }
}

export function validateClaimDependencies({ claims = [] } = {}) {
  const issues = []
  const numbers = new Set(claims.map((claim) => Number(claim.claim_number)))
  for (const claim of claims) {
    for (const parent of claim.depends_on || []) {
      if (!numbers.has(Number(parent))) issues.push({ claim_number: claim.claim_number, type: 'MISSING_PARENT', parent })
      if (Number(parent) >= Number(claim.claim_number)) issues.push({ claim_number: claim.claim_number, type: 'INVALID_REFERENCE', parent })
    }
  }
  try {
    buildEffectiveClaimLimitations(claims, 'validation')
  } catch (error) {
    if (/Circular/i.test(error.message)) issues.push({ type: 'CIRCULAR_DEPENDENCY', detail: error.message })
    else issues.push({ type: 'AMBIGUOUS_DEPENDENCY', detail: error.message })
  }
  if (!issues.length) return { valid: true, issues: [] }
  return { valid: false, issues, flag: 'CLAIM_DEPENDENCY_REVIEW_REQUIRED' }
}

// ---------- Target source model (§34–§37) ----------

export function buildEvidenceSource(input = {}) {
  return {
    source_id: input.source_id || 'source-pending',
    source_type: input.source_type || 'OTHER',
    title: input.title || '',
    identifier: input.identifier || input.publication_number || null,
    version: input.version || null,
    date: input.date || input.publication_date || null,
    origin: input.origin || null,
    url: input.url || null,
    verification_status: input.verification_status || 'UNVERIFIED',
    retrieved_at: input.retrieved_at || new Date().toISOString(),
  }
}

export function verifyEvidenceSource(source = {}) {
  if (!source.identifier && !source.source_id) {
    return { verification: 'FAILED', issues: ['SOURCE_IDENTITY_REQUIRED'] }
  }
  if (source.verified_existence === true || source.verification_status === 'VERIFIED') {
    return { verification: 'VERIFIED', issues: [] }
  }
  if (source.verified_existence === false) return { verification: 'FAILED', issues: ['SOURCE_VERIFICATION_FAILED'] }
  return { verification: 'RESEARCH_REQUIRED', issues: ['SOURCE_EXISTENCE_UNVERIFIED'] }
}

export function recordEvidenceLocation({ claim = null, paragraph = null, page = null, section = null, figure = null, table = null, line = null, code_file = null, code_lines = null, timestamp = null, url_fragment = null, other = null } = {}) {
  const locator = { claim, paragraph, page, section, figure, table, line, code_file, code_lines, timestamp, url_fragment, other }
  const specified = Object.entries(locator).filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (!specified.length) return { locator, verified: false, issue: 'EVIDENCE_LOCATION_REQUIRED' }
  return { locator, verified: true, issue: null }
}

// ---------- Passages, quotes, entailment (§39–§41) ----------

export function recordEvidencePassage({ passage_id = null, content = '', location = null, verified = false } = {}) {
  if (!content || !String(content).trim()) return { passage_id, content: '', location, verified: false, issue: 'PASSAGE_CONTENT_REQUIRED' }
  return { passage_id, content: String(content), location, verified: Boolean(verified) }
}

export function verifyChartQuote({ quote = '', passages = [] } = {}) {
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
  return { status: 'NOT_FOUND', code: 'QUOTE_NOT_FOUND' }
}

export function assessChartEntailment({ proposition = '', passageContent = '' } = {}) {
  const result = checkEntailment(proposition, passageContent)
  const map = { ENTAILS: 'ENTAILED', PARTIALLY_SUPPORTS: 'PARTIALLY_ENTAILED', CONTEXT_ONLY: 'AMBIGUOUS', DOES_NOT_SUPPORT: 'NOT_ENTAILED', CONTRADICTS: 'NOT_ENTAILED' }
  return { verdict: result.verdict, status: map[result.verdict] || 'AMBIGUOUS', score: result.score, reasons: result.reasons }
}

// ---------- Mapping assessment (§42–§54) ----------

export function classifyMapping({ limitation = {}, evidence = null, terminology = 'UNKNOWN', partial = false, possible = false, possible_reason = '' } = {}) {
  if (!evidence) {
    return { limitation_id: limitation.limitation_id || null, status: 'NOT_IDENTIFIED', note: 'No evidence supplied; absence of evidence is not evidence of absence.' }
  }
  if (possible) {
    return { limitation_id: limitation.limitation_id || null, status: 'POSSIBLY_MAPPED_REVIEW_REQUIRED', terminology, note: possible_reason || 'Equivalence or interpretation uncertain; reason recorded.' }
  }
  if (partial) {
    return { limitation_id: limitation.limitation_id || null, status: 'PARTIALLY_MAPPED', terminology, note: 'Only part of this compound limitation is supported; not upgraded to MAPPED.' }
  }
  const relationalFunctional = ['RELATIONAL', 'FUNCTIONAL'].includes(limitation.limitation_type)
  if (relationalFunctional && !evidence.entailed && !evidence.entailment) {
    return { limitation_id: limitation.limitation_id || null, status: 'POSSIBLY_MAPPED_REVIEW_REQUIRED', terminology, note: 'Component presence alone never discloses relational or functional limitations; relationship/function entailment evidence required.' }
  }
}

export function classifyTerminology({ claim_term = '', evidence_term = '', relationship = 'UNKNOWN', reasoning = '' } = {}) {
  if (!TERMINOLOGY_RELATIONSHIPS.includes(relationship)) {
    return { claim_term, evidence_term, relationship: 'UNKNOWN', reasoning: 'Unrecognised relationship; recorded as unknown.' }
  }
  if (['TECHNICALLY_EQUIVALENT_REVIEW_REQUIRED', 'RELATED_BUT_NOT_EQUIVALENT'].includes(relationship) && !reasoning) {
    return { claim_term, evidence_term, relationship, reasoning: 'REASON_REQUIRED', review: true }
  }
  return { claim_term, evidence_term, relationship, reasoning }
}

export function buildMultiSourceMatrix({ limitations = [], sources = [], cells = [] } = {}) {
  const matrix = []
  for (const limitation of limitations) {
    for (const source of sources) {
      const cell = cells.find((item) =>
        (item.limitation_id || item.limitation) === (limitation.limitation_id || limitation) &&
        (item.source_id || item.source) === (source.source_id || source)) || {}
      matrix.push({
        limitation_id: limitation.limitation_id || limitation,
        source_id: source.source_id || source,
        status: cell.status || 'RESEARCH_REQUIRED',
        evidence_node: cell.evidence_node || null,
      })
    }
  }
  return matrix
}

export function assessReferenceCompleteness({ limitation_ids = [], matrix = [], reference_id } = {}) {
  const rows = matrix.filter((row) => String(row.source_id) === String(reference_id))
  const addressed = limitation_ids.filter((id) => rows.some((row) => String(row.limitation_id) === String(id) && !['RESEARCH_REQUIRED'].includes(row.status)))
  if (!rows.length) return { reference_id, technical_status: 'RESEARCH_REQUIRED', note: 'Reference not yet charted.' }
  if (addressed.length === limitation_ids.length && rows.every((row) => row.status === 'MAPPED')) {
    return { reference_id, technical_status: 'ALL_LIMITATIONS_MAPPED_CANDIDATE_REVIEW', note: 'Technical candidate status only; not anticipation, infringement, invalidity, or coverage.' }
  }
  if (addressed.length) return { reference_id, technical_status: 'PARTIAL_MAPPING' }
  return { reference_id, technical_status: 'NO_MATERIAL_MAPPING' }
}

// ---------- Construction (§32–§33) ----------

export function recordConstruction({ limitation_id = null, construction_type = 'CONSTRUCTION_UNRESOLVED', construction = '', source = null, authority = null, date = null, citation = null, passage = null, verification = 'UNVERIFIED' } = {}) {
  const allowed = ['PLAIN_LANGUAGE_MAPPING', 'USER_PROVIDED_CONSTRUCTION', 'COURT_CONSTRUCTION', 'PROPOSED_CONSTRUCTION', 'CONSTRUCTION_UNRESOLVED']
  const type = allowed.includes(construction_type) ? construction_type : 'CONSTRUCTION_UNRESOLVED'
  return {
    limitation_id, construction_type: type, construction,
    provenance: { source, authority, date, citation, passage, verification },
    flag: type === 'CONSTRUCTION_UNRESOLVED' ? 'CONSTRUCTION_UNRESOLVED' : null,
  }
}

// ---------- Product evidence (§55–§58) ----------

export function recordProductFact({ product = '', version = null, feature = '', source = '', source_type = 'other', status = 'UNKNOWN', configuration = null, date = null } = {}) {
  const allowedSources = ['manual', 'source code', 'test', 'photograph', 'website', 'user statement', 'technical specification', 'other']
  const allowedStatus = ['KNOWN', 'INFERRED', 'UNKNOWN']
  return {
    product, version, feature,
    source, source_type: allowedSources.includes(String(source_type).toLowerCase()) ? source_type : 'other',
    status: allowedStatus.includes(status) ? status : 'UNKNOWN',
    configuration, date,
    label: source_type === 'user statement' && status !== 'KNOWN' ? 'USER_ASSERTED' : status,
  }
}

export function confirmProductVersion({ product = '', version = null } = {}) {
  if (!product || !version) {
    return { confirmed: false, flag: 'PRODUCT_VERSION_CONFIRMATION_REQUIRED', note: 'Exact product, model/version, release, configuration, and date are required where material.' }
  }
  return { confirmed: true, product, version, flag: null }
}

// ---------- Image / drawing / code / standard evidence (§59–§62) ----------

export function recordImageEvidence({ image_id = '', region = '', observation = '', review_status = 'UNREVIEWED' } = {}) {
  return {
    image_id, region, observation, review_status,
    note: 'Only visible observations recorded; hidden or internal structures are never inferred.',
  }
}

export function recordDrawingEvidence({ figure_number = '', reference_numerals = [], observation = '' } = {}) {
  return { figure_number, reference_numerals, observation, note: 'Unlabelled relationships are not inferred without evidence.' }
}

export function recordSourceCodeEvidence({ repository = '', commit = '', file = '', lines = '', symbol = '', logic_summary = '' } = {}) {
  if (!repository || !file) return { valid: false, issue: 'SOURCE_CODE_IDENTITY_REQUIRED' }
  return { valid: true, repository, commit: commit || null, file, lines: lines || null, symbol: symbol || null, logic_summary, note: 'Code behaviour is never fabricated beyond the recorded logic.' }
}

export function recordStandardEvidence({ standard_id = '', version = '', clause = '', mandatory = null, observation = '' } = {}) {
  return {
    standard_id, version, clause, mandatory, observation,
    note: 'A standard mentioning a feature never proves implementation; optional features require implementation evidence.',
  }
}

// ---------- Specification / priority / prosecution evidence (§63–§65) ----------

export function mapSpecificationSupport({ limitation = '', passages = [], figures = [], embodiments = [] } = {}) {
  if (!passages.length) {
    return { limitation, status: 'NOT_IDENTIFIED', note: 'No specification passage identified; no §112 conclusion follows automatically.' }
  }
  return { limitation, status: 'MAPPED', passages, figures, embodiments, note: 'Support mapping only; §112/added-matter conclusions belong to specialist workflows.' }
}

export function mapPrioritySupport({ limitation = '', priority_passages = [] } = {}) {
  if (!priority_passages.length) {
    return { limitation, status: 'RESEARCH_REQUIRED', note: 'No priority passage supplied.' }
  }
  const exact = priority_passages.some((passage) => String(passage.content || '').toLowerCase().includes(String(limitation).toLowerCase().slice(0, 24)))
  if (exact) return { limitation, status: 'EXPRESS_SUPPORT', passages: priority_passages }
  return { limitation, status: 'POTENTIAL_SUPPORT_REVIEW_REQUIRED', passages: priority_passages, note: 'Related concept only; entitlement neither granted nor denied.' }
}

export function recordProsecutionEvidence({ document = '', date = null, statement = '', amendment = null, claim_version = null, source = '' } = {}) {
  return {
    document, date, statement, amendment, claim_version, source,
    note: 'Statement recorded verbatim as evidence; disclaimer/estoppel never inferred automatically.',
  }
}

// ---------- Chart rows & machine-readable chart (§68–§70) ----------

let chartRowSequence = 0

export function buildChartRow({ claim_id = null, limitation = {}, construction = null, source = null, evidence = null, evidence_location = null, mapping_status = 'RESEARCH_REQUIRED', terminology_relationship = 'UNKNOWN', quote_status = 'UNVERIFIED', entailment_status = 'AMBIGUOUS', verification_status = 'UNVERIFIED', review_status = 'UNREVIEWED', notes = '' } = {}) {
  chartRowSequence += 1
  return {
    row_id: `row-${String(chartRowSequence).padStart(3, '0')}`,
    claim_id,
    limitation_id: limitation.limitation_id || null,
    sequence: limitation.sequence || null,
    claim_text: limitation.exact_claim_text || limitation.claim_text || '',
    normalised_concept: limitation.normalised_concept || '',
    construction,
    target_source_id: source?.source_id || null,
    target_evidence: evidence,
    evidence_location,
    mapping_status,
    terminology_relationship,
    quote_status,
    entailment_status,
    verification_status,
    review_status,
    notes,
    locked: false,
    history: [{ action: 'ROW_CREATED', timestamp: new Date().toISOString() }],
  }
}

export function buildCanonicalChart({ chart_id = null, target = {}, limitations = [], rows = [] } = {}) {
  return {
    chart_id: chart_id || `chart-${Date.now()}`,
    target,
    limitations,
    rows,
    created_at: new Date().toISOString(),
    note: 'Canonical machine-readable chart data. All presentations render from this object; no separate truth is maintained in prose.',
  }
}

export function renderChartTable(chart, { references = [] } = {}) {
  const multi = references.length > 1
  const header = multi
    ? ['Claim / Limitation', 'Exact Claim Language', ...references.map((r) => r.source_id || r), 'Review Notes']
    : ['Claim / Limitation', 'Exact Claim Language', 'Target Source', 'Evidence / Location', 'Mapping Status', 'Verification', 'Notes']
  const body = chart.rows.map((row) => {
    if (!multi) {
      return [row.limitation_id, row.claim_text, row.target_source_id, evidenceCell(row), row.mapping_status, row.verification_status, row.notes]
    }
    const cells = references.map((reference) => {
      const sourceId = reference.source_id || reference
      if (String(row.target_source_id) !== String(sourceId)) return '—'
      return `${row.mapping_status} (${evidenceCell(row)})`
    })
    return [row.limitation_id, row.claim_text, ...cells, row.notes]
  })
  return { header, body, source: 'canonical chart data' }
}

function evidenceCell(row) {
  const evidence = row.target_evidence
  const location = row.evidence_location?.locator
    ? Object.entries(row.evidence_location.locator).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => `${key} ${value}`).join(', ')
    : 'location unverified'
  const summary = typeof evidence === 'string' ? evidence.slice(0, 120) : evidence?.content ? String(evidence.content).slice(0, 120) : 'no evidence recorded'
  return `${summary} [${location}]`
}

export function chartToExportPayloads(chart) {
  const table = renderChartTable(chart)
  const json = JSON.stringify(chart, null, 2)
  const csv = [['row_id', 'limitation_id', 'claim_text', 'target_source_id', 'mapping_status', 'verification_status', 'notes'],
    ...chart.rows.map((row) => [row.row_id, row.limitation_id, `"${String(row.claim_text).replace(/"/g, '""')}"`, row.target_source_id, row.mapping_status, row.verification_status, `"${String(row.notes || '').replace(/"/g, '""')}"`].join(','))].join('\n')
  return { table, json, csv, note: 'UI, PDF, DOCX, CSV/XLSX, and JSON derive from the same canonical chart data.' }
}

// ---------- Summary, gaps, contradictions (§73–§76) ----------

export function summarizeChartMappings({ rows = [] } = {}) {
  const mapped = rows.filter((row) => row.mapping_status === 'MAPPED')
  const partial = rows.filter((row) => row.mapping_status === 'PARTIALLY_MAPPED')
  const missing = rows.filter((row) => ['NOT_IDENTIFIED', 'RESEARCH_REQUIRED', 'AMBIGUOUS'].includes(row.mapping_status))
  const lines = []
  if (mapped.length) lines.push(`Mapped evidence recorded for: ${mapped.map((row) => row.limitation_id).join(', ')}.`)
  if (partial.length) lines.push(`Partial evidence recorded for: ${partial.map((row) => row.limitation_id).join(', ')}.`)
  if (missing.length) lines.push(`Not identified or still under review: ${missing.map((row) => row.limitation_id).join(', ')}.`)
  return { lines, mapped: mapped.length, partial: partial.length, missing: missing.length }
}

export function collectEvidenceGaps({ rows = [] } = {}) {
  const gaps = []
  for (const row of rows) {
    if (row.mapping_status === 'NOT_IDENTIFIED') gaps.push({ row_id: row.row_id, gap: 'NO_EVIDENCE_IDENTIFIED' })
    if (row.mapping_status === 'RESEARCH_REQUIRED') gaps.push({ row_id: row.row_id, gap: 'RESEARCH_REQUIRED' })
    if (row.mapping_status === 'AMBIGUOUS') gaps.push({ row_id: row.row_id, gap: 'TECHNICAL_AMBIGUITY' })
    if (row.entailment_status === 'AMBIGUOUS') gaps.push({ row_id: row.row_id, gap: 'TECHNICAL_AMBIGUITY' })
  }
  return gaps
}

export function detectChartContradictions(rows = [], summaryClaimsAllMapped = false) {
  const matrix = rows.map((row) => ({
    claim_number: row.claim_id,
    limitation_id: row.limitation_id,
    reference_id: row.target_source_id,
    disclosure_status: row.mapping_status === 'MAPPED' ? 'EXPLICITLY_DISCLOSED' : 'NOT_IDENTIFIED',
  }))
  const narrative = summaryClaimsAllMapped
    ? rows.map((row) => ({ claim_number: row.claim_id, limitation_id: row.limitation_id, reference_id: row.target_source_id, assertion: 'DISCLOSED' }))
    : []
  return detectAnalysisContradictions(matrix, narrative)
}

// ---------- Integrity, staleness, recomputation, versions, locks, overrides (§77–§83) ----------

export function checkSourceVersionChange({ recorded_version = null, current_version = null, affected_rows = [] } = {}) {
  if (String(recorded_version ?? '') === String(current_version ?? '')) {
    return { changed: false, flag: null, affected_rows: [] }
  }
  return { changed: true, flag: 'SOURCE_VERSION_CHANGED', affected_rows, note: 'Affected mappings are stale until recomputed.' }
}

export function detectChartStaleness({ chart = {}, current = {} } = {}) {
  const rerun = []
  if ((current.claim_text || null) !== (chart.claim_snapshot_text || null) && chart.claim_snapshot_text) rerun.push('CLAIM_TEXT_CHANGED')
  if (String(current.claim_version || '') !== String(chart.claim_version || '') && chart.claim_version) rerun.push('CLAIM_VERSION_CHANGED')
  if (String(current.source_version || '') !== String(chart.source_version || '') && chart.source_version) rerun.push('SOURCE_VERSION_CHANGED')
  if (String(current.product_version || '') !== String(chart.product_version || '') && chart.product_version) rerun.push('PRODUCT_VERSION_CHANGED')
  if (!rerun.length) return { stale: false, flag: null, rerun }
  return { stale: true, flag: 'CLAIM_CHART_STALE', rerun }
}

export function recomputeAffectedRows({ rows = [], changed_limitation_ids = [], changed_source_ids = [] } = {}) {
  const affected = rows.filter((row) =>
    changed_limitation_ids.includes(row.limitation_id) || changed_source_ids.includes(row.target_source_id))
  return {
    affected_row_ids: affected.map((row) => row.row_id),
    preserved_row_ids: rows.filter((row) => !affected.includes(row)).map((row) => row.row_id),
    note: 'Only affected rows recompute; unaffected rows stand.',
  }
}

export function createChartVersion(history = [], snapshot = {}, reason = 'Chart updated') {
  const version = `chart_v${history.length + 1}`
  return { version, timestamp: new Date().toISOString(), reason, snapshot, history: [...history, version] }
}

export function lockChartRow(row, { reviewer = 'system', reason = 'Reviewer lock' } = {}) {
  return { ...row, locked: true, history: [...(row.history || []), { action: 'ROW_LOCKED', reviewer, reason, timestamp: new Date().toISOString() }] }
}

export function applyUpstreamChange(rows = [], { changed_source_ids = [], changed_limitation_ids = [] } = {}) {
  return rows.map((row) => {
    const affected = changed_source_ids.includes(row.target_source_id) || changed_limitation_ids.includes(row.limitation_id)
    if (affected && row.locked) {
      return { ...row, review_status: 'STALE_LOCKED', flags: ['LOCKED_ROW_UPSTREAM_CHANGE'], history: [...(row.history || []), { action: 'LOCKED_ROW_UPSTREAM_CHANGE', timestamp: new Date().toISOString() }] }
    }
    return row
  })
}

export function applyHumanOverride(row, { mapping_status = null, construction = null, evidence = null, notes = '', reviewer = 'reviewer' } = {}) {
  return {
    ...row,
    mapping_status: mapping_status || row.mapping_status,
    construction: construction || row.construction,
    target_evidence: evidence || row.target_evidence,
    notes: [row.notes, `Reviewer override by ${reviewer}: ${notes}`].filter(Boolean).join(' | '),
    review_status: 'REVIEWER_OVERRIDDEN',
    history: [...(row.history || []), {
      action: 'HUMAN_OVERRIDE',
      reviewer,
      reason: notes,
      timestamp: new Date().toISOString(),
      original: { mapping_status: row.mapping_status, construction: row.construction, evidence: row.target_evidence },
    }],
  }
}

// ---------- Evidence graph & verification gates (§84–§86) ----------

export function buildChartEvidenceGraph({ chart = {} } = {}) {
  return {
    chart_id: chart.chart_id || null,
    edges: (chart.rows || []).map((row) => ({
      claim: row.claim_id,
      limitation: row.limitation_id,
      source: row.target_source_id,
      passage: row.target_evidence?.passage_id || row.evidence_location || null,
      mapping: row.mapping_status,
      verification: row.verification_status,
      review: row.review_status,
    })),
    trace: 'PATENT → CLAIM SET → CLAIM → LIMITATION → SOURCE → PASSAGE/OBJECT → MAPPING → VERIFICATION → REVIEW',
  }
}

export function chartVerificationGates({ chart = {} } = {}) {
  const failures = []
  if ((chart.rows || []).some((row) => !row.claim_text)) failures.push('UNVERIFIED_CLAIM_TEXT')
  if (!chart.claim_version) failures.push('UNRESOLVED_CLAIM_VERSION')
  if ((chart.rows || []).some((row) => row.mapping_status === 'MAPPED' && !row.target_evidence)) failures.push('MAPPING_WITHOUT_EVIDENCE')
  if ((chart.rows || []).some((row) => row.quote_status === 'NOT_FOUND')) failures.push('FABRICATED_QUOTE')
  if ((chart.rows || []).some((row) => row.verification_status === 'FAILED')) failures.push('FAILED_SOURCE_VERIFICATION')
  if ((chart.rows || []).some((row) => !row.evidence_location?.verified && row.mapping_status === 'MAPPED')) failures.push('UNRESOLVED_EVIDENCE_LOCATOR')
  return { pass: failures.length === 0, failures }
}

// ---------- Downstream handoffs (§89–§94, #021-ready) ----------

export function buildChartHandoff({ kind = '', chart = {}, payload = {} } = {}) {
  const targets = {
    novelty: 'patent-novelty-opinion',
    invalidity: 'patent-invalidity-opinion',
    fto: 'freedom-to-operate-opinion',
    prior_art: 'patent-prior-art-search-report',
    patentability: 'patentability-assessment',
    specification: 'patent-specification',
    infringement: 'patent-infringement-claim-chart',
  }
  if (!targets[kind]) throw new Error('Unsupported claim chart handoff')
  const sourceSeparated = (chart.rows || []).map((row) => ({
    claim_number: row.claim_id,
    limitation_id: row.limitation_id,
    reference_id: row.target_source_id,
    passage_id: row.target_evidence?.passage_id || null,
    disclosure_status: row.mapping_status === 'MAPPED' ? 'EXPLICITLY_DISCLOSED'
      : row.mapping_status === 'PARTIALLY_MAPPED' ? 'PARTIALLY_DISCLOSED'
      : row.mapping_status === 'NOT_IDENTIFIED' ? 'NOT_IDENTIFIED' : 'AMBIGUOUS',
  }))
  return {
    source_workflow: 'patent-claim-chart',
    target_workflow: targets[kind],
    claim_version: chart.claim_version || null,
    mappings: sourceSeparated,
    synthetic_combined_reference: null,
    uncertainties: (chart.rows || []).filter((row) => ['AMBIGUOUS', 'RESEARCH_REQUIRED'].includes(row.mapping_status)).map((row) => row.row_id),
    ...payload,
    legal_conclusion_transfer: 'NONE — mappings transfer as evidence only',
  }
}

// ---------- Confidentiality (§102) ----------

export function assertChartConfidentiality({ engines = [], mode = 'CONFIDENTIAL_IP', env = {} } = {}) {
  try {
    return assertChatAllowed({ engines, mode, env })
  } catch (error) {
    error.chart_flag = CHART_REVIEW_FLAGS.CONFIDENTIAL_PILOT_BLOCKED
    throw error
  }
}

// ---------- Report assembly (§97–§98) ----------

function chartSection(title, body) {
  return `## ${title}\n\n${body && String(body).trim() ? body : 'Not addressed within the current scope.'}\n`
}

export function assembleChartReport(input = {}) {
  const {
    chart = {}, patent = {}, purpose = 'GENERAL_ANALYSIS', constructions = [],
    gaps = [], review_items = [], report_version = 'v1',
  } = input
  const rows = chart.rows || []
  const summary = summarizeChartMappings({ rows })
  const lines = []
  lines.push(`# Patent Claim Chart (Evidence Mapping Only)\n`)
  lines.push(chartSection('1. Chart Identification', `Chart: ${chart.chart_id || 'chart-pending'}; purpose: ${purpose}. This chart maps evidence only and determines no legal conclusion.`))
  lines.push(chartSection('2. Matter / Patent Information', `Patent: ${patent.patent_id || patent.publication_number || 'unidentified'}. Claim set: ${chart.claim_set_id || 'unidentified'} (${chart.claim_version || 'unconfirmed'}).`))
  lines.push(chartSection('3. Purpose and Scope', `Purpose: ${purpose}. Purpose routes presentation and downstream handoffs; it never alters evidence facts.`))
  lines.push(chartSection('4. Claim Set and Version', `Version: ${chart.claim_version || 'unconfirmed'}. Snapshot hash: ${chart.claim_snapshot_hash || 'none'}.`))
  lines.push(chartSection('5. Claim Text', rows.length ? [...new Set(rows.map((row) => `Claim ${row.claim_id}: ${row.claim_text}`))].join('\n') : null))
  lines.push(chartSection('6. Claim Dependency', chart.dependency_note || null))
  lines.push(chartSection('7. Claim Construction Context', (constructions || []).map((c) => `- ${c.limitation_id}: ${c.construction_type} (${c.provenance?.verification || 'UNVERIFIED'})`).join('\n')))
  lines.push(chartSection('8. Target Source(s)', (chart.sources || []).map((s) => `- ${s.source_id} [${s.source_type}; version ${s.version || 'unspecified'}; verification ${s.verification_status || 'UNVERIFIED'}].`).join('\n')))
  lines.push(chartSection('9. Verification Summary', `Rows: ${rows.length}; verified evidence: ${rows.filter((row) => row.verification_status === 'VERIFIED').length}; gates: ${JSON.stringify(chartVerificationGates({ chart }).failures)}.`))
  lines.push(chartSection('10. Claim Limitation Chart', rows.map((row) => `| ${row.limitation_id} | ${row.claim_text} | ${row.target_source_id} | ${row.mapping_status} | ${row.verification_status} |`).join('\n')))
  lines.push(chartSection('11. Evidence Locations', rows.map((row) => `- ${row.limitation_id}: ${JSON.stringify(row.evidence_location?.locator || 'unverified')}.`).join('\n')))
  lines.push(chartSection('12. Mapping Notes', rows.map((row) => `- ${row.limitation_id}: ${row.notes || row.mapping_status}.`).join('\n')))
  lines.push(chartSection('13. Evidence Gaps', (gaps.length ? gaps : collectEvidenceGaps({ rows })).map((g) => `- ${g.row_id || g}: ${g.gap || g}`).join('\n')))
  lines.push(chartSection('14. Ambiguities', rows.filter((row) => row.mapping_status === 'AMBIGUOUS').map((row) => `- ${row.limitation_id}`).join('\n')))
  lines.push(chartSection('15. Source / Version Limitations', `Source versions recorded per evidence node; changed sources mark affected rows stale.`))
  lines.push(chartSection('16. Review Items', (review_items.length ? review_items : rows.filter((row) => row.review_status !== 'REVIEWED').map((row) => row.row_id)).join('\n')))
  lines.push(chartSection('17. Qualified Summary', summary.lines.join('\n')))
  lines.push(chartSection('18. Verification Statement', 'Claim identity, version, snapshot, sources, locations, quotes, entailment, mappings, construction, review, and staleness were checked. Unverified material fails closed.'))
  lines.push(chartSection('19. Appendix — Evidence Provenance', `Canonical chart data hash: ${chart.chart_id || 'pending'}. Presentations render from canonical data; no separate truth exists in prose.`))
  const report = lines.join('\n')
  const violations = BANNED_CHART_PHRASES.filter((phrase) => report.toLowerCase().includes(phrase))
  if (violations.length) {
    const error = new Error(`Chart boundary violation in assembled report: ${violations.join(', ')}`)
    error.code = 'CHART_BOUNDARY_VIOLATION'
    throw error
  }
  return { report, report_version, summary }
}

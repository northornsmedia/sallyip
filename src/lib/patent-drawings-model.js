/**
 * SALLYIP PATENT DRAWINGS INSTRUCTIONS MODEL — PART 1
 * Canonical Document #012: shared deterministic helpers and fact extraction.
 */

export const DRAWING_WORKFLOW_MODES = [
  'NEW_DRAWING_INSTRUCTIONS',
  'DRAWINGS_FROM_SPECIFICATION',
  'DRAWINGS_FROM_CLAIMS',
  'DRAWINGS_FROM_INVENTION_DISCLOSURE',
  'DRAWINGS_FROM_EXISTING_SKETCHES',
  'DRAWINGS_FROM_PRODUCT_IMAGES',
  'DRAWING_SET_REVIEW',
  'FIGURE_GAP_ANALYSIS',
  'REFERENCE_NUMERAL_REVIEW',
  'FIGURE_DESCRIPTION_GENERATION',
  'DRAWING_UPDATE_INSTRUCTIONS',
  'JURISDICTION_ADAPTATION',
]

export const DRAWING_INVENTION_TYPES = [
  'SYSTEM', 'METHOD', 'DEVICE', 'APPARATUS', 'MECHANICAL', 'ELECTRONICS',
  'SOFTWARE', 'AI_ML', 'NETWORK', 'PROCESS', 'MANUFACTURING', 'CHEMICAL',
  'BIOTECH', 'MEDICAL_DEVICE', 'MATERIALS', 'OTHER',
]

export const DRAWING_JURISDICTION_CONTEXTS = [
  'US', 'PCT', 'EP', 'NATIONAL_PHASE_SPECIFIC', 'DESIGN_PATENT', 'OTHER', 'UNDECIDED',
]

export const FIGURE_STATUSES = {
  PROPOSED: 'PROPOSED', CONFIRMED: 'CONFIRMED', PARTIAL: 'PARTIAL',
  MISSING_INFORMATION: 'MISSING_INFORMATION', READY_FOR_INSTRUCTIONS: 'READY_FOR_INSTRUCTIONS',
  SUPERSEDED: 'SUPERSEDED',
}

export const FIGURE_NECESSITY = {
  CORE: 'CORE', SUPPORTING: 'SUPPORTING', OPTIONAL: 'OPTIONAL', REDUNDANT: 'REDUNDANT', UNKNOWN: 'UNKNOWN',
}

export const DRAWING_SUPPORT = {
  SUPPORTED: 'SUPPORTED', PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED', UNSUPPORTED: 'UNSUPPORTED', UNKNOWN: 'UNKNOWN',
}

export const CLAIM_FIGURE_SUPPORT = {
  SHOWN: 'SHOWN', PARTIALLY_SHOWN: 'PARTIALLY_SHOWN', NOT_SHOWN: 'NOT_SHOWN',
  NOT_APPLICABLE: 'NOT_APPLICABLE', UNKNOWN: 'UNKNOWN',
}

export const DRAWING_PROVENANCE = {
  USER_PROVIDED: 'USER_PROVIDED', MATTER_CONTEXT: 'MATTER_CONTEXT',
  SPECIFICATION_SOURCE: 'SPECIFICATION_SOURCE', CLAIM_SOURCE: 'CLAIM_SOURCE',
  SOURCE_IMAGE: 'SOURCE_IMAGE', SOURCE_SKETCH: 'SOURCE_SKETCH', AI_PROPOSED: 'AI_PROPOSED',
  USER_EDITED: 'USER_EDITED', VERIFIED: 'VERIFIED', UNVERIFIED: 'UNVERIFIED', PLACEHOLDER: 'PLACEHOLDER',
}

export const FIGURE_LOCKS = { UNLOCKED: 'UNLOCKED', USER_LOCKED: 'USER_LOCKED', REVIEW_LOCKED: 'REVIEW_LOCKED' }

export const DRAWING_READINESS = {
  NOT_READY: 'NOT_READY', PARTIALLY_READY: 'PARTIALLY_READY', READY_FOR_INSTRUCTIONS: 'READY_FOR_INSTRUCTIONS',
}

export const DRAWING_REVIEW_FLAGS = {
  DRAWING_REVIEW_REQUIRED: 'DRAWING_REVIEW_REQUIRED',
  FIGURE_SPEC_NUMERAL_CONFLICT: 'FIGURE_SPEC_NUMERAL_CONFLICT',
  IMAGE_SPEC_CONFLICT: 'IMAGE_SPEC_CONFLICT',
  CROSS_SECTION_DETAIL_REQUIRED: 'CROSS_SECTION_DETAIL_REQUIRED',
  SPECIALIST_DRAWING_REVIEW_REQUIRED: 'SPECIALIST_DRAWING_REVIEW_REQUIRED',
  FORMAL_RULE_VERIFICATION_REQUIRED: 'FORMAL_RULE_VERIFICATION_REQUIRED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
  TERM_CONFLICT: 'TERM_CONFLICT',
  SAME_NUMERAL_DIFFERENT_COMPONENT: 'SAME_NUMERAL_DIFFERENT_COMPONENT',
  SAME_COMPONENT_MULTIPLE_NUMERALS: 'SAME_COMPONENT_MULTIPLE_NUMERALS',
  UNDEFINED_NUMERAL: 'UNDEFINED_NUMERAL',
  ORPHAN_NUMERAL: 'ORPHAN_NUMERAL',
  CLAIMED_FEATURE_NOT_SHOWN: 'CLAIMED_FEATURE_NOT_SHOWN',
  SPEC_COMPONENT_NOT_SHOWN: 'SPEC_COMPONENT_NOT_SHOWN',
  RELATIONSHIP_NOT_SHOWN: 'RELATIONSHIP_NOT_SHOWN',
  METHOD_STEP_NOT_VISUALISED: 'METHOD_STEP_NOT_VISUALISED',
  REFERENCE_NUMERAL_GAP: 'REFERENCE_NUMERAL_GAP',
  EXISTING_FIGURE_CONFLICT: 'EXISTING_FIGURE_CONFLICT',
  INSUFFICIENT_TECHNICAL_CONTEXT: 'INSUFFICIENT_TECHNICAL_CONTEXT',
  FIGURE_LOCKED: 'FIGURE_LOCKED',
}

const STOP_TERMS = new Set([
  'method', 'system', 'apparatus', 'device', 'invention', 'disclosure', 'process',
  'step', 'steps', 'figure', 'figures', 'drawing', 'drawings', 'embodiment',
  'wherein', 'comprising', 'includes', 'including', 'thereof', 'thereto',
])

export function normalizeTerm(term = '') {
  return String(term || '').toLowerCase().replace(/[“”"']/g, '')
    .replace(/[^a-z0-9\/+_.-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function slugifyTerm(term = '', fallback = 'component') {
  const normalized = normalizeTerm(term).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || fallback
}

function uniquePreserveOrder(values = []) {
  const seen = new Set()
  const out = []
  for (const value of values) {
    const key = normalizeTerm(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(String(value).trim())
  }
  return out
}

export function splitList(value) {
  if (Array.isArray(value)) {
    return uniquePreserveOrder(value.map((item) => {
      if (item && typeof item === 'object') return item.term || item.name || item.label || ''
      return item
    }).filter(Boolean))
  }
  const text = String(value || '').replace(/\r/g, '\n')
  if (!text.trim()) return []
  const normalized = text.replace(/[•●▪◦]/g, '\n').replace(/(^|\n)\s*(?:\d+[.)]|[-*])\s+/g, '$1\n')
  const chunks = normalized.split(/[\n;|]+/).map((part) => part.trim()).filter(Boolean)
  if (chunks.length === 1 && chunks[0].includes(',') && chunks[0].length <= 180 && !/[.?!]$/.test(chunks[0])) {
    return uniquePreserveOrder(chunks[0].split(','))
  }
  return uniquePreserveOrder(chunks)
}

export function extractListedFeatures(text = '', maxTerms = 40) {
  const source = String(text || '')
  if (!source.trim()) return []
  const candidates = []
  const segments = source.split(/(?:includes?|comprising|comprises?|contains?|having|with|consists? of|steps? (?:of|are|include)?|features? (?:include|are)?)\s*[:]?/i)
  for (const segment of segments.slice(1)) {
    candidates.push(...splitList(segment.split(/[.?!](\s|$)/)[0]))
  }
  candidates.push(...splitList(source))
  return uniquePreserveOrder(candidates.filter((term) => {
    const normalized = normalizeTerm(term)
    if (normalized.length < 3 || normalized.length > 80) return false
    if (STOP_TERMS.has(normalized)) return false
    if (/^(fig|figure)\b/.test(normalized)) return false
    return true
  })).slice(0, maxTerms)
}

export function parseNumeralMentions(text = '') {
  const source = String(text || '')
  const out = []
  const pattern = /([A-Za-z][A-Za-z0-9 _\/+-]{1,60}?)\s+(\d{2,4})(?!\d)/g
  let match
  while ((match = pattern.exec(source)) !== null) {
    const term = match[1].trim().replace(/^(?:the|a|an)\s+/i, '')
    if (!term || STOP_TERMS.has(normalizeTerm(term))) continue
    out.push({ term, numeral: match[2] })
  }
  return out
}

export function classifySourceAsset(asset = {}) {
  const visible = splitList(asset.visible_features || asset.visible || [])
  const confirmed = splitList(asset.confirmed_features || [])
  return {
    asset_id: asset.asset_id || asset.id || slugifyTerm(asset.label || asset.kind || 'source-asset', 'source-asset'),
    kind: asset.kind || 'UNKNOWN',
    label: asset.label || 'Unlabelled source asset',
    visible_features: visible.map((term) => ({ term, observation: 'VISIBLE', provenance: asset.provenance || DRAWING_PROVENANCE.SOURCE_IMAGE })),
    confirmed_features: confirmed.map((term) => ({ term, observation: 'USER_CONFIRMED', provenance: DRAWING_PROVENANCE.USER_PROVIDED })),
    unknown_features: [
      'hidden internal components', 'dimensions', 'angles', 'scale',
      'material composition', 'electrical values', 'unreadable labels',
    ].map((term) => ({ term, observation: 'UNKNOWN', provenance: DRAWING_PROVENANCE.UNVERIFIED })),
    source: asset.source || DRAWING_PROVENANCE.SOURCE_IMAGE,
  }
}

export function extractTechnicalFacts(input = {}) {
  const components = uniquePreserveOrder([
    ...splitList(input.components || input.components_text || []),
    ...extractListedFeatures(input.specification_components || ''),
    ...splitList(input.existing_component_terms || []),
  ])
  const steps = uniquePreserveOrder([
    ...splitList(input.steps || input.steps_text || input.method_steps || []),
    ...extractListedFeatures(input.specification_steps || ''),
  ])
  const relationships = uniquePreserveOrder([
    ...splitList(input.relationships || input.relationships_text || []),
    ...splitList(input.flows || []),
  ])
  const claimedFeatures = uniquePreserveOrder([
    ...splitList(input.claimed_features || []),
    ...extractListedFeatures(input.claims_text || ''),
  ])
  const specComponents = uniquePreserveOrder([
    ...splitList(input.spec_components || []),
    ...extractListedFeatures(input.specification_text || ''),
  ])
  const numeralMentions = [
    ...(Array.isArray(input.existing_numerals) ? input.existing_numerals : []),
    ...parseNumeralMentions(input.reference_numerals_text || ''),
  ]
  const existingFigures = Array.isArray(input.existing_figures)
    ? input.existing_figures
    : splitList(input.existing_figures).map((label) => ({ label }))
  const sourceAssets = Array.isArray(input.source_assets) ? input.source_assets.map(classifySourceAsset) : []
  const assetTerms = sourceAssets.flatMap((asset) => [...asset.visible_features.map((item) => item.term), ...asset.confirmed_features.map((item) => item.term)])
  return {
    invention_title: String(input.invention_title || input.title || '').trim(),
    invention_type: String(input.invention_type || 'OTHER').toUpperCase(),
    workflow_mode: String(input.workflow_mode || 'NEW_DRAWING_INSTRUCTIONS').toUpperCase(),
    jurisdiction_context: String(input.jurisdiction_context || input.jurisdiction || 'UNDECIDED').toUpperCase(),
    components: uniquePreserveOrder([...components, ...assetTerms]), steps, relationships, claimed_features: claimedFeatures, spec_components: specComponents,
    numeral_mentions: numeralMentions, existing_figures: existingFigures, source_assets: sourceAssets,
    alternatives: splitList(input.alternative_embodiments || input.alternatives || []),
    internal_detail_supported: Boolean(input.internal_detail_supported),
    excluded_features: splitList(input.excluded_features || []),
  }
}

function candidatePurposesForType(inventionType) {
  switch (inventionType) {
    case 'SOFTWARE':
      return [
        { figure_type: 'system architecture', purpose: 'overall system architecture', needs: 'components:2' },
        { figure_type: 'module relationship diagram', purpose: 'software module interaction', needs: 'components:2' },
        { figure_type: 'data flow', purpose: 'data flow', needs: 'relationships:1' },
        { figure_type: 'method flowchart', purpose: 'method flowchart', needs: 'steps:2' },
      ]
    case 'AI_ML':
      return [
        { figure_type: 'system architecture', purpose: 'overall system architecture', needs: 'components:2' },
        { figure_type: 'processing pipeline', purpose: 'input preprocessing and model interaction', needs: 'components:2' },
        { figure_type: 'method flowchart', purpose: 'supported training or inference pipeline', needs: 'steps:2' },
      ]
    case 'MECHANICAL':
    case 'DEVICE':
    case 'APPARATUS':
      return [
        { figure_type: 'perspective view', purpose: 'device perspective view', needs: 'components:2' },
        { figure_type: 'exploded view', purpose: 'exploded assembly', needs: 'components:3' },
        { figure_type: 'cross-section', purpose: 'cross-sectional view', needs: 'internal:1' },
        { figure_type: 'detail view', purpose: 'detail view', needs: 'components:3' },
      ]
    case 'ELECTRONICS':
      return [
        { figure_type: 'block diagram', purpose: 'overall system architecture', needs: 'components:2' },
        { figure_type: 'component connection diagram', purpose: 'component connection', needs: 'relationships:1' },
        { figure_type: 'signal path diagram', purpose: 'signal flow', needs: 'relationships:1' },
      ]
    case 'METHOD':
    case 'PROCESS':
      return [
        { figure_type: 'method flowchart', purpose: 'method flowchart', needs: 'steps:2' },
        { figure_type: 'state diagram', purpose: 'state transition', needs: 'relationships:1' },
      ]
    case 'NETWORK':
      return [
        { figure_type: 'network architecture', purpose: 'network architecture', needs: 'components:2' },
        { figure_type: 'sequence diagram', purpose: 'timing sequence', needs: 'relationships:1' },
        { figure_type: 'method flowchart', purpose: 'method flowchart', needs: 'steps:2' },
      ]
    case 'CHEMICAL':
    case 'BIOTECH':
      return [
        { figure_type: 'process flow', purpose: 'process flow', needs: 'steps:2' },
        { figure_type: 'apparatus diagram', purpose: 'supported experimental setup', needs: 'components:2' },
      ]
    case 'MEDICAL_DEVICE':
      return [
        { figure_type: 'device perspective', purpose: 'device perspective view', needs: 'components:2' },
        { figure_type: 'system architecture', purpose: 'system architecture', needs: 'components:2' },
        { figure_type: 'operational sequence', purpose: 'supported operational states', needs: 'steps:2' },
      ]
    default:
      return [
        { figure_type: 'system architecture', purpose: 'overall system architecture', needs: 'components:2' },
        { figure_type: 'method flowchart', purpose: 'method flowchart', needs: 'steps:2' },
      ]
  }
}

function componentTermsForCandidate(candidate, facts) {
  const terms = candidate.needs.startsWith('steps') ? facts.steps : facts.components
  return terms.map(normalizeTerm).filter(Boolean)
}
function candidateSupported(candidate, facts) {
  const [kind, minimum] = candidate.needs.split(':')
  const required = Number(minimum || 0)
  if (kind === 'components') return facts.components.length >= required
  if (kind === 'steps') return facts.steps.length >= required
  if (kind === 'relationships') return facts.relationships.length >= required
  if (kind === 'internal') {
    return facts.internal_detail_supported || facts.existing_figures.some((figure) => /cross-section|cross section/i.test(figure.label || figure.title || ''))
  }
  return false
}

export function proposeFigurePlan(factsInput = {}, options = {}) {
  const facts = extractTechnicalFacts(factsInput)
  const figures = []
  const gaps = []
  let displayCounter = 1
  for (const [index, existing] of facts.existing_figures.entries()) {
    figures.push({
      figure_id: existing.figure_id || `existing-${index + 1}`,
      display_number: existing.display_number || existing.label || `FIG. ${displayCounter}`,
      figure_type: existing.figure_type || 'existing figure',
      title: existing.title || existing.label || `Existing figure ${index + 1}`,
      purpose: existing.purpose || 'preserve supplied figure context; do not infer missing content',
      source_support: [existing.source || DRAWING_PROVENANCE.SOURCE_SKETCH],
      components: splitList(existing.visible_features || existing.components || []).map((term) => ({
        term, provenance: existing.source || DRAWING_PROVENANCE.SOURCE_SKETCH, support: DRAWING_SUPPORT.SUPPORTED,
      })),
      relationships: splitList(existing.relationships || []),
      reference_numerals: Array.isArray(existing.reference_numerals) ? existing.reference_numerals : [],
      required_views: splitList(existing.required_views || existing.views || []),
      status: existing.status || FIGURE_STATUSES.CONFIRMED,
      necessity: FIGURE_NECESSITY.CORE,
      review_flags: [],
      version: 1,
      lock: FIGURE_LOCKS.UNLOCKED,
      history: [{ version: 1, change: 'Imported existing figure without inferring hidden content.' }],
    })
    displayCounter += 1
  }
  const requestedUpdateTarget = options.updateTargetFigureId || factsInput.update_target_figure_id
  if (requestedUpdateTarget && !figures.some((figure) => figure.figure_id === requestedUpdateTarget)) {
    gaps.push({ code: DRAWING_REVIEW_FLAGS.EXISTING_FIGURE_CONFLICT, detail: `Requested update target ${requestedUpdateTarget} was not found among existing figures.` })
  }
  if (facts.components.length === 0 && facts.steps.length === 0 && figures.length === 0) {
    gaps.push({ code: DRAWING_REVIEW_FLAGS.INSUFFICIENT_TECHNICAL_CONTEXT, detail: 'No supported components, steps, or existing figures were supplied.' })
    return { facts, figures, gaps, necessity: FIGURE_NECESSITY.UNKNOWN }
  }
  const candidates = candidatePurposesForType(facts.invention_type)
  let coreAssigned = figures.length > 0
  for (const candidate of candidates) {
    if (!candidateSupported(candidate, facts)) continue
    const isCrossSection = /cross-section|cross section/i.test(candidate.figure_type)
    const review_flags = []
    if (isCrossSection && !facts.internal_detail_supported) review_flags.push(DRAWING_REVIEW_FLAGS.CROSS_SECTION_DETAIL_REQUIRED)
    if ((facts.invention_type === 'CHEMICAL' || facts.invention_type === 'BIOTECH') && /apparatus|experimental/i.test(candidate.purpose)) {
      review_flags.push(DRAWING_REVIEW_FLAGS.SPECIALIST_DRAWING_REVIEW_REQUIRED)
    }
    figures.push({
      figure_id: `fig-${displayCounter}`,
      display_number: `FIG. ${displayCounter}`,
      figure_type: candidate.figure_type,
      title: `${candidate.figure_type} — ${facts.invention_title || 'supported invention arrangement'}`,
      purpose: candidate.purpose,
      source_support: [DRAWING_PROVENANCE.USER_PROVIDED],
      components: (candidate.needs.startsWith('steps') ? facts.steps : facts.components).map((term) => ({
        term, provenance: DRAWING_PROVENANCE.USER_PROVIDED, support: DRAWING_SUPPORT.SUPPORTED,
      })),
      relationships: candidate.needs.startsWith('relationships') ? facts.relationships : facts.relationships.filter((relationship) => componentTermsForCandidate(candidate, facts).some((term) => normalizeTerm(relationship).includes(term))),
      reference_numerals: [],
      required_views: [candidate.figure_type],
      status: isCrossSection && !facts.internal_detail_supported ? FIGURE_STATUSES.MISSING_INFORMATION : FIGURE_STATUSES.PROPOSED,
      necessity: !coreAssigned ? FIGURE_NECESSITY.CORE : FIGURE_NECESSITY.SUPPORTING,
      review_flags,
      version: 1,
      lock: FIGURE_LOCKS.UNLOCKED,
      history: [{ version: 1, change: `Proposed from supported ${candidate.needs} without inventing additional content.` }],
    })
    coreAssigned = true
    displayCounter += 1
    if (figures.length >= 6) break
  }
  if (facts.alternatives.length > 0 && facts.workflow_mode !== 'DRAWING_UPDATE_INSTRUCTIONS') {
    figures.push({
      figure_id: `fig-${displayCounter}-alternative`,
      display_number: `FIG. ${displayCounter}`,
      figure_type: 'alternative embodiment',
      title: `Alternative embodiment — ${facts.invention_title || 'supported variant'}`,
      purpose: 'alternative embodiment',
      source_support: [DRAWING_PROVENANCE.USER_PROVIDED],
      components: [],
      relationships: [],
      reference_numerals: [],
      required_views: ['alternative embodiment'],
      status: FIGURE_STATUSES.PROPOSED,
      necessity: FIGURE_NECESSITY.SUPPORTING,
      review_flags: [],
      version: 1,
      lock: FIGURE_LOCKS.UNLOCKED,
      history: [{ version: 1, change: 'Alternative-embodiment view proposed without merging incompatible variants.' }],
      alternative_note: 'Show supported alternatives separately. Do not depict incompatible alternatives as simultaneously mandatory.',
      alternatives: facts.alternatives,
    })
  }
  return { facts, figures, gaps, necessity: figures.some((figure) => figure.necessity === FIGURE_NECESSITY.CORE) ? FIGURE_NECESSITY.CORE : FIGURE_NECESSITY.UNKNOWN }
}

export function allocateReferenceNumerals({ components = [], existingNumerals = [], start = 110, step = 10 } = {}) {
  const registry = []
  const conflicts = []
  const byTerm = new Map()
  const byNumeral = new Map()
  let next = start
  for (const entry of existingNumerals) {
    const term = typeof entry === 'string' ? entry : entry.term
    const numeral = typeof entry === 'string' ? null : entry.numeral
    const key = normalizeTerm(term)
    if (!key) continue
    if (numeral) {
      const numeralText = String(numeral)
      if (byNumeral.has(numeralText) && byNumeral.get(numeralText) !== key) {
        conflicts.push({ code: DRAWING_REVIEW_FLAGS.SAME_NUMERAL_DIFFERENT_COMPONENT, numeral: numeralText, components: [byNumeral.get(numeralText), key], detail: `Numeral ${numeralText} is assigned to different components.` })
      }
      if (byTerm.has(key) && byTerm.get(key) !== numeralText) {
        conflicts.push({ code: DRAWING_REVIEW_FLAGS.SAME_COMPONENT_MULTIPLE_NUMERALS, component: key, numerals: [byTerm.get(key), numeralText], detail: `Component "${term}" has multiple numerals without a stated reason.` })
      }
      byTerm.set(key, numeralText)
      byNumeral.set(numeralText, key)
      const numeric = Number(numeralText)
      if (Number.isFinite(numeric)) next = Math.max(next, numeric + step)
    }
    registry.push({
      component_id: slugifyTerm(term), preferred_term: String(term).trim(),
      reference_numeral: numeral ? String(numeral) : null, aliases: [], first_figure: null, other_figures: [],
      source: (entry && entry.source) || DRAWING_PROVENANCE.USER_PROVIDED, status: numeral ? 'ASSIGNED' : 'UNASSIGNED',
    })
  }
  for (const term of uniquePreserveOrder(components)) {
    const key = normalizeTerm(term)
    if (byTerm.has(key)) continue
    const numeral = String(next)
    next += step
    byTerm.set(key, numeral)
    byNumeral.set(numeral, key)
    registry.push({
      component_id: slugifyTerm(term), preferred_term: String(term).trim(), reference_numeral: numeral,
      aliases: [], first_figure: null, other_figures: [], source: DRAWING_PROVENANCE.AI_PROPOSED, status: 'ASSIGNED',
    })
  }
  return { registry, conflicts }
}

export function assignNumeralsToFigures(figurePlan = [], numeralRegistry = []) {
  const registryByTerm = new Map(numeralRegistry.map((entry) => [normalizeTerm(entry.preferred_term), entry]))
  return figurePlan.map((figure) => {
    const assigned = []
    for (const component of figure.components || []) {
      const entry = registryByTerm.get(normalizeTerm(component.term))
      if (entry?.reference_numeral) {
        assigned.push({ term: entry.preferred_term, numeral: entry.reference_numeral })
        if (!entry.first_figure) entry.first_figure = figure.display_number
        else if (!entry.other_figures.includes(figure.display_number)) entry.other_figures.push(figure.display_number)
      }
    }
    return { ...figure, reference_numerals: assigned }
  })
}

export function analyzeFigureGaps({ claimedFeatures = [], specComponents = [], relationships = [], steps = [], figures = [] } = {}) {
  const gaps = []
  const figureTerms = new Set()
  for (const figure of figures) {
    for (const component of figure.components || []) figureTerms.add(normalizeTerm(component.term))
    for (const relationship of figure.relationships || []) figureTerms.add(normalizeTerm(relationship))
  }
  for (const feature of claimedFeatures) {
    if (!figureTerms.has(normalizeTerm(feature))) gaps.push({ code: DRAWING_REVIEW_FLAGS.CLAIMED_FEATURE_NOT_SHOWN, feature, detail: `Claimed feature "${feature}" is not shown in the current figure plan. This identifies a gap; it does not by itself establish that a separate figure is legally required.` })
  }
  for (const component of specComponents) {
    if (!figureTerms.has(normalizeTerm(component))) gaps.push({ code: DRAWING_REVIEW_FLAGS.SPEC_COMPONENT_NOT_SHOWN, feature: component, detail: `Specification component "${component}" is not shown.` })
  }
  for (const relationship of relationships) {
    if (!figureTerms.has(normalizeTerm(relationship))) gaps.push({ code: DRAWING_REVIEW_FLAGS.RELATIONSHIP_NOT_SHOWN, feature: relationship, detail: `Relationship "${relationship}" is not visualised.` })
  }
  for (const step of steps) {
    if (!figureTerms.has(normalizeTerm(step))) gaps.push({ code: DRAWING_REVIEW_FLAGS.METHOD_STEP_NOT_VISUALISED, feature: step, detail: `Method step "${step}" is not visualised.` })
  }
  return gaps
}

export function buildClaimFigureMap({ claimsText = '', claimedFeatures = [], figures = [] } = {}) {
  const features = claimedFeatures.length ? claimedFeatures : extractListedFeatures(claimsText)
  if (!features.length) return []
  return features.map((feature) => {
    const key = normalizeTerm(feature)
    const matchingFigures = figures.filter((figure) => (figure.components || []).some((component) => normalizeTerm(component.term) === key))
    return { claim: 'CLAIM_SOURCE', limitation: feature, figures: matchingFigures.map((figure) => figure.display_number), status: matchingFigures.length ? CLAIM_FIGURE_SUPPORT.SHOWN : CLAIM_FIGURE_SUPPORT.NOT_SHOWN }
  })
}

export function buildSpecificationFigureMap({ specificationText = '', specComponents = [], figures = [] } = {}) {
  const components = specComponents.length ? specComponents : extractListedFeatures(specificationText)
  if (!components.length) return []
  return components.map((component) => {
    const key = normalizeTerm(component)
    const matchingFigures = figures.filter((figure) => (figure.components || []).some((item) => normalizeTerm(item.term) === key))
    return { technical_element: component, figures: matchingFigures.map((figure) => figure.display_number), status: matchingFigures.length ? DRAWING_SUPPORT.SUPPORTED : DRAWING_SUPPORT.UNKNOWN }
  })
}

export function detectNumeralConflicts({ registry = [], figures = [], specificationNumerals = [] } = {}) {
  const conflicts = []
  const registryNumerals = new Map(registry.filter((entry) => entry.reference_numeral).map((entry) => [String(entry.reference_numeral), normalizeTerm(entry.preferred_term)]))
  const registryTerms = new Map(registry.map((entry) => [normalizeTerm(entry.preferred_term), entry.reference_numeral ? String(entry.reference_numeral) : null]))
  for (const figure of figures) {
    for (const item of figure.reference_numerals || []) {
      const numeral = String(item.numeral)
      const term = normalizeTerm(item.term)
      if (!registryNumerals.has(numeral)) conflicts.push({ code: DRAWING_REVIEW_FLAGS.UNDEFINED_NUMERAL, figure: figure.display_number, numeral, detail: `Figure ${figure.display_number} uses undefined numeral ${numeral}.` })
      else if (registryNumerals.get(numeral) !== term) conflicts.push({ code: DRAWING_REVIEW_FLAGS.SAME_NUMERAL_DIFFERENT_COMPONENT, figure: figure.display_number, numeral, detail: `Numeral ${numeral} means different components in the registry and ${figure.display_number}.` })
    }
  }
  const usedNumerals = new Set()
  for (const figure of figures) for (const item of figure.reference_numerals || []) usedNumerals.add(String(item.numeral))
  for (const entry of registry) {
    if (entry.reference_numeral && !usedNumerals.has(String(entry.reference_numeral))) conflicts.push({ code: DRAWING_REVIEW_FLAGS.ORPHAN_NUMERAL, numeral: String(entry.reference_numeral), detail: `Registry numeral ${entry.reference_numeral} is not used by any figure.` })
  }
  for (const spec of specificationNumerals) {
    const key = normalizeTerm(spec.term)
    if (registryTerms.has(key) && registryTerms.get(key) && String(spec.numeral) !== registryTerms.get(key)) {
      conflicts.push({ code: DRAWING_REVIEW_FLAGS.FIGURE_SPEC_NUMERAL_CONFLICT, term: spec.term, detail: `Specification uses ${spec.numeral} for "${spec.term}", conflicting with the figure registry.` })
    }
  }
  return conflicts
}

export function checkTerminologyConsistency({ instructionTerms = [], specificationTerms = [], claimTerms = [], equivalences = {}, instruction_terms = [], specification_terms = [], claim_terms = [] } = {}) {
  const instructions = instructionTerms.length ? instructionTerms : instruction_terms;  const specifications = specificationTerms.length ? specificationTerms : specification_terms;  const claims = claimTerms.length ? claimTerms : claim_terms;  const sourceTerms = new Set([...specifications, ...claims].map(normalizeTerm));  if (sourceTerms.size === 0) return []
  const equivalenceMap = new Map(Object.entries(equivalences).map(([key, value]) => [normalizeTerm(key), normalizeTerm(value)]))
  const conflicts = []
  for (const term of instructions) {
    const key = normalizeTerm(term)
    if (!key || sourceTerms.has(key)) continue
    const equivalent = equivalenceMap.get(key)
    if (equivalent && sourceTerms.has(equivalent)) continue
    conflicts.push({ code: DRAWING_REVIEW_FLAGS.TERM_CONFLICT, term, detail: `Instruction term "${term}" does not match specification/claim terminology and no equivalence was established.` })
  }
  return conflicts
}

export function detectImageSpecConflict({ imageCounts = {}, specificationCounts = {} } = {}) {
  const conflicts = []
  for (const [term, specCount] of Object.entries(specificationCounts)) {
    if (!(term in imageCounts)) continue
    if (Number(imageCounts[term]) !== Number(specCount)) conflicts.push({ code: DRAWING_REVIEW_FLAGS.IMAGE_SPEC_CONFLICT, term, image_count: Number(imageCounts[term]), specification_count: Number(specCount), detail: `Image shows ${imageCounts[term]} ${term}; specification describes ${specCount}. Do not silently prefer either source.` })
  }
  return conflicts
}

export function assessDrawingReadiness({ facts = {}, figures = [], numeralConflicts = [], terminologyConflicts = [], gaps = [] } = {}) {
  const missing = []
  if (!facts.invention_title) missing.push('invention_title')
  if (!facts.invention_type || facts.invention_type === 'OTHER') missing.push('invention_type')
  if (!figures.length) missing.push('figure_plan')
  if (!facts.components.length && !facts.steps.length) missing.push('supported_components_or_steps')
  if (figures.some((figure) => figure.status === FIGURE_STATUSES.MISSING_INFORMATION)) missing.push('missing_figure_information')
  if (numeralConflicts.length) missing.push('reference_numeral_conflicts')
  if (terminologyConflicts.length) missing.push('terminology_conflicts')
  if (gaps.some((gap) => gap.code === DRAWING_REVIEW_FLAGS.CLAIMED_FEATURE_NOT_SHOWN)) missing.push('claimed_feature_gap_review')
  const major = figures.filter((figure) => figure.necessity === FIGURE_NECESSITY.CORE && figure.status !== FIGURE_STATUSES.MISSING_INFORMATION)
  if (!missing.length && major.length) return { readiness: DRAWING_READINESS.READY_FOR_INSTRUCTIONS, missing }
  if (major.length || figures.length) return { readiness: DRAWING_READINESS.PARTIALLY_READY, missing }
  return { readiness: DRAWING_READINESS.NOT_READY, missing }
}

export function createFigureVersion(figure, change, updatedFields = {}) {
  const nextVersion = Number(figure.version || 1) + 1
  const snapshot = { ...figure, ...updatedFields, version: nextVersion }
  return { figure: snapshot, history: [...(figure.history || []), { version: nextVersion, change }] }
}

export function applyFigureEdit(figure, updatedFields = {}, change = 'User-edited figure instruction.') {
  if (figure.lock === FIGURE_LOCKS.USER_LOCKED || figure.lock === FIGURE_LOCKS.REVIEW_LOCKED) {
    return { updated: false, reason: DRAWING_REVIEW_FLAGS.FIGURE_LOCKED, figure }
  }
  const result = createFigureVersion(figure, change, updatedFields)
  return { updated: true, ...result }
}

export function renumberFigures(figures = []) {
  let counter = 1
  const history = []
  const renumbered = figures.map((figure) => {
    if (figure.lock === FIGURE_LOCKS.USER_LOCKED || figure.lock === FIGURE_LOCKS.REVIEW_LOCKED) return figure
    const display_number = /^FIG\.?\s*\d+/i.test(figure.display_number || '') ? `FIG. ${counter}` : figure.display_number
    history.push({ figure_id: figure.figure_id, previous: figure.display_number, current: display_number })
    counter += 1
    return { ...figure, display_number, history: [...(figure.history || []), { version: figure.version || 1, change: `Renumbered to ${display_number}; prior number preserved in history.` }] }
  })
  return { figures: renumbered, history }
}

export function analyzeDrawingChangeImpact({ changedField = '', oldValue = '', newValue = '', figures = [], claimFigureMap = [] } = {}) {
  const oldTerms = splitList(oldValue).map(normalizeTerm).filter(Boolean)
  const affectedFigures = figures.filter((figure) => {
    const haystack = [...(figure.components || []).map((item) => normalizeTerm(item.term)), ...(figure.relationships || []).map(normalizeTerm)].join(' ')
    return oldTerms.some((term) => term && haystack.includes(term))
  }).map((figure) => figure.display_number)
  const affectedClaims = claimFigureMap.filter((row) => oldTerms.includes(normalizeTerm(row.limitation))).map((row) => row.limitation)
  return {
    changed_field: changedField,
    affected_figures: affectedFigures,
    affected_claim_mappings: affectedClaims,
    locked_figures_preserved: figures.filter((figure) => affectedFigures.includes(figure.display_number) && figure.lock !== FIGURE_LOCKS.UNLOCKED).map((figure) => figure.display_number),
    review_flag: affectedFigures.length ? DRAWING_REVIEW_FLAGS.DRAWING_REVIEW_REQUIRED : null,
    note: affectedFigures.length
      ? `Technical change to "${changedField}" requires review of ${affectedFigures.join(', ')}. Locked figures were not silently modified.`
      : 'No figure directly references the changed technical fact.',
  }
}

export function getFormalDrawingRequirements({ jurisdictionContext = 'UNDECIDED', verifiedAuthority = null } = {}) {
  if (verifiedAuthority?.source && verifiedAuthority?.retrieved_at) {
    return { status: 'VERIFIED_AUTHORITY_SUPPLIED', jurisdiction_context: jurisdictionContext, authority: verifiedAuthority, rules: verifiedAuthority.rules || [], review_flags: [] }
  }
  return {
    status: 'UNVERIFIED', jurisdiction_context: jurisdictionContext, authority: null, rules: [],
    review_flags: [DRAWING_REVIEW_FLAGS.FORMAL_RULE_VERIFICATION_REQUIRED],
    note: 'No verified jurisdiction-specific drawing authority was supplied. Do not assert paper size, margins, line quality, numbering, text, colour, photograph, shading, sheet, or electronic-format requirements.',
  }
}

export function isFormalDesignDrawingRequest(text = '') {
  const value = String(text || '')
  if (!value.trim()) return false
  if (/ornamental/i.test(value) && /design|view|drawing|figure/i.test(value)) return true
  if (/design patent/i.test(value) && /(view|drawing|figure|formal)/i.test(value)) return true
  if (/seven formal views/i.test(value)) return true
  if (/(front|rear|left|right|top|bottom).*(front|rear|left|right|top|bottom)/i.test(value) && /design/i.test(value)) return true
  return false
}

export function isPatentDrawingInstructionRequest(text = '') {
  const value = String(text || '')
  if (!value.trim()) return false
  if (/generate (the )?actual patent drawing|create (the )?patent (drawing|illustration|image)|render (the )?figure|draw it for me/i.test(value)) return false
  if (/draft (the )?patent specification|write (the )?specification/i.test(value)) return false
  if (isFormalDesignDrawingRequest(value)) return false
  return /patent drawing instructions|instructions for (the )?(patent )?figures?|figure instructions|drawing instructions for (this|the|my) patent|patent (figure|illustration) brief|drawing brief for (my|this|the) patent|tell the illustrator what to draw|what drawings do i need|map (the )?specification into drawings|prepare instructions for figures?/i.test(value)
}

export function assembleDrawingInstructionPackage({
  matter = {}, facts = {}, figures = [], numeralRegistry = [], claimFigureMap = [],
  specificationFigureMap = [], gaps = [], numeralConflicts = [], terminologyConflicts = [],
  imageConflicts = [], openQuestions = [], jurisdictionContext = 'UNDECIDED',
  formalRequirements = null, workflowMode = 'NEW_DRAWING_INSTRUCTIONS',
} = {}) {
  const formal = formalRequirements || getFormalDrawingRequirements({ jurisdictionContext })
  const lines = []
  lines.push(`# Patent Drawings Instructions`)
  lines.push(``)
  lines.push(`**Matter / invention:** ${matter.title || facts.invention_title || 'Unnamed invention'}`)
  lines.push(`**Workflow mode:** ${workflowMode}`)
  lines.push(`**Jurisdiction context:** ${jurisdictionContext}`)
  lines.push(``)
  lines.push(`## 1. Drawing overview and instructions-vs-drawings distinction`)
  lines.push(``)
  lines.push(`This package contains PATENT_DRAWINGS_INSTRUCTIONS, not FINAL_DRAWINGS. It tells a patent illustrator, drafter, engineer, or attorney what to draw, how components relate, which views are required, which reference numerals to use, what not to add, and which source supports each element.`)
  lines.push(``)
  lines.push(`It is not a CAD file, patent illustration, guaranteed filing-compliant drawing set, or substitute for a professional patent illustrator where required.`)
  lines.push(``)
  lines.push(`## 2. Reference numeral index`)
  lines.push(``)
  if (!numeralRegistry.length) lines.push(`No reference numerals have been assigned. Unknown remains UNKNOWN.`)
  else for (const entry of numeralRegistry) lines.push(`- ${entry.preferred_term} — ${entry.reference_numeral || 'UNASSIGNED'} [${entry.source}; ${entry.status}; first figure: ${entry.first_figure || 'unassigned'}]`)
  lines.push(``)
  lines.push(`## 3. Figure-by-figure illustrator instructions`)
  lines.push(``)
  if (!figures.length) lines.push(`No figures can be responsibly proposed from the supplied sources. Ask the next missing technical question instead of inventing figures.`)
  for (const figure of figures) {
    lines.push(`### ${figure.display_number} — ${figure.title || figure.figure_type}`)
    lines.push(``)
    lines.push(`- Figure type: ${figure.figure_type}`)
    lines.push(`- Purpose: ${figure.purpose}`)
    lines.push(`- View / orientation: ${(figure.required_views || []).join('; ') || 'As supported by the source; do not invent geometry.'}`)
    lines.push(`- Status: ${figure.status}; necessity: ${figure.necessity}; lock: ${figure.lock || FIGURE_LOCKS.UNLOCKED}; version: v${figure.version || 1}`)
    lines.push(`- Elements to include:`)
    if (!(figure.components || []).length) lines.push(`  - No supported elements supplied for this figure. Do not invent hidden components.`)
    else for (const component of figure.components) {
      const numeral = (figure.reference_numerals || []).find((item) => normalizeTerm(item.term) === normalizeTerm(component.term))
      lines.push(`  - ${component.term}${numeral ? ` ${numeral.numeral}` : ''} [${component.provenance || DRAWING_PROVENANCE.UNVERIFIED}; ${component.support || DRAWING_SUPPORT.UNKNOWN}]`)
    }
    lines.push(`- Relationships to show: ${(figure.relationships || []).join('; ') || 'Only relationships explicitly supported by the source.'}`)
    if (figure.alternative_note) lines.push(`- Alternative-embodiment note: ${figure.alternative_note}`)
    if ((figure.alternatives || []).length) lines.push(`- Supported alternatives: ${figure.alternatives.join('; ')}`)
    lines.push(`- Elements not to add: any component, relationship, dimension, angle, hidden surface, internal geometry, material, flow, signal, process step, dataset, model layer, or view not listed above as SUPPORTED.`)
    lines.push(`- Source references: ${(figure.source_support || []).join('; ') || 'No source location supplied.'}`)
    if ((figure.review_flags || []).length) lines.push(`- Review flags: ${figure.review_flags.join(', ')}`)
    if (figure.open_question) lines.push(`- Open question: ${figure.open_question}`)
    lines.push(``)
  }
  lines.push(`## 4. Cross-view and terminology consistency notes`)
  lines.push(``)
  lines.push(`- Preserve existing approved numerals. Do not renumber locked figures silently.`)
  lines.push(`- Use specification/claim terminology exactly unless an equivalence has been established and recorded.`)
  if (terminologyConflicts.length) for (const conflict of terminologyConflicts) lines.push(`- TERM_CONFLICT: ${conflict.detail}`)
  else lines.push(`- No terminology conflicts were detected among the supplied supported terms.`)
  lines.push(``)
  lines.push(`## 5. Source support map`)
  lines.push(``)
  if (claimFigureMap.length) {
    lines.push(`### Claim mapping`)
    for (const row of claimFigureMap) lines.push(`- ${row.limitation} → ${(row.figures || []).join(', ') || 'no figure'} [${row.status}]`)
    lines.push(``)
  }
  if (specificationFigureMap.length) {
    lines.push(`### Specification mapping`)
    for (const row of specificationFigureMap) lines.push(`- ${row.technical_element} → ${(row.figures || []).join(', ') || 'no figure'} [${row.status}]`)
    lines.push(``)
  }
  if (!claimFigureMap.length && !specificationFigureMap.length) lines.push(`No claim/specification mapping sources were supplied.`)
  lines.push(``)
  lines.push(`## 6. Open technical questions`)
  lines.push(``)
  const questions = [...openQuestions]
  for (const gap of gaps) questions.push(`${gap.code}: ${gap.detail}`)
  if (!questions.length) lines.push(`None recorded. Unknown remains UNKNOWN.`)
  else for (const question of questions) lines.push(`- ${question}`)
  lines.push(``)
  lines.push(`## 7. Do-not-invent and geometry safety notes`)
  lines.push(``)
  lines.push(`- Describe only known spatial relationships. Do not invent dimensions, angles, hidden surfaces, internal geometry, scale, material thickness, process steps, software modules, flows, signals, datasets, or experimental setups.`)
  lines.push(`- Exterior photographs alone do not support cross-sectional internal arrangements.`)
  lines.push(`- Product images support only visibly supported features.`)
  if ((facts.excluded_features || []).length) lines.push(`- Explicitly excluded unless separately confirmed: ${facts.excluded_features.join('; ')}`)
  lines.push(``)
  lines.push(`## 8. Jurisdiction and formality notes`)
  lines.push(``)
  lines.push(`- Formal requirements status: ${formal.status}`)
  if (formal.review_flags?.length) lines.push(`- Review flags: ${formal.review_flags.join(', ')}`)
  if (formal.note) lines.push(`- ${formal.note}`)
  if (formal.authority) lines.push(`- Verified authority source: ${formal.authority.source}; retrieved: ${formal.authority.retrieved_at}`)
  lines.push(``)
  lines.push(`## 9. Attorney and internal QA mapping`)
  lines.push(``)
  lines.push(`- Gaps: ${gaps.length ? gaps.map((gap) => gap.code).join(', ') : 'none recorded'}`)
  lines.push(`- Numeral conflicts: ${numeralConflicts.length ? numeralConflicts.map((conflict) => conflict.code).join(', ') : 'none detected'}`)
  lines.push(`- Image/specification conflicts: ${imageConflicts.length ? imageConflicts.map((conflict) => `${conflict.code} (${conflict.term})`).join(', ') : 'none detected'}`)
  lines.push(`- Unsupported drawing elements must not silently enter the instruction package.`)
  lines.push(`- Attorney review is required before treating these instructions as filing-ready.`)
  lines.push(``)
  return lines.join('\n')
}





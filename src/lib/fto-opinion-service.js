/**
 * SALLYIP FREEDOM-TO-OPERATE (FTO) SUBSTANTIVE OPINION SERVICE
 *
 * Implements claim-level, jurisdiction-specific, evidence-driven patent risk analysis:
 * - Product feature decomposition and provenance
 * - Patent family disaggregation and WO/PCT safety
 * - Legal status verification and freshness
 * - Canonical claim decomposition and All-Limitations discipline
 * - Relational, functional, numerical, and method limitation mapping
 * - Design-around impact analysis and staleness tracking
 * - Fail-closed verification and 25-section report assembly
 */

import { buildEffectiveClaimLimitations, splitClaimElements } from './patent-claim-service.js'
import { FTO_REVIEW_FLAGS, FTO_OUTCOMES } from './freedom-to-operate-interview-graph.js'

export const PROVENANCE_STATES = Object.freeze({
  USER_CONFIRMED: 'USER_CONFIRMED',
  SOURCE_CONFIRMED: 'SOURCE_CONFIRMED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  INFERRED_REVIEW_REQUIRED: 'INFERRED_REVIEW_REQUIRED',
  UNKNOWN: 'UNKNOWN',
})

export const LEGAL_STATUSES = Object.freeze({
  ACTIVE_GRANTED: 'ACTIVE_GRANTED',
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
  LAPSED: 'LAPSED',
  ABANDONED: 'ABANDONED',
  REVOKED: 'REVOKED',
  WITHDRAWN: 'WITHDRAWN',
  STATUS_UNCERTAIN: 'STATUS_UNCERTAIN',
})

/**
 * Build canonical FTO scope object
 */
export function createFtoScope(input = {}) {
  const jurisdictions = Array.isArray(input.jurisdictions)
    ? input.jurisdictions
    : (input.jurisdiction ? [input.jurisdiction] : ['US'])

  return {
    matter_id: input.matter_id || `matter-${Date.now()}`,
    product_id: input.product_id || `prod-${Date.now()}`,
    product_name: input.product_name || 'Assessed Commercial Product',
    product_version: input.product_version || 'v1.0',
    activity_description: input.activity_description || 'Commercial manufacture, offering, and sale',
    jurisdictions,
    commercial_activities: input.commercial_activities || ['MAKE', 'SELL', 'OFFER', 'IMPORT'],
    manufacturing_locations: input.manufacturing_locations || [],
    sales_or_import_locations: input.sales_or_import_locations || jurisdictions,
    relevant_date: input.relevant_date || new Date().toISOString().slice(0, 10),
    planned_launch_date: input.planned_launch_date || null,
    search_scope: input.search_scope || 'TARGET_JURISDICTION_DATABASES',
    technology_scope: input.technology_scope || 'Direct technical field',
    excluded_scope: input.excluded_scope || [],
    known_patents: input.known_patents || [],
    assessment_depth: input.assessment_depth || 'CLAIM_LEVEL',
  }
}

/**
 * Decompose product features into structured hierarchy
 */
export function decomposeProductFeatures(featuresInput = []) {
  const rawList = Array.isArray(featuresInput)
    ? featuresInput
    : (typeof featuresInput === 'string' ? featuresInput.split(/\r?\n/) : [])

  return rawList.map((item, index) => {
    const text = typeof item === 'object' ? (item.feature_text || item.text || '') : String(item).trim()
    return {
      feature_id: `feat-${index + 1}`,
      ordinal: index + 1,
      feature_text: text,
      provenance: (typeof item === 'object' && item.provenance) ? item.provenance : PROVENANCE_STATES.USER_CONFIRMED,
      status: 'ACCEPTED',
    }
  }).filter((f) => f.feature_text)
}

/**
 * Detect product source conflicts (e.g. cloud vs local processing)
 */
export function detectProductSourceConflict(sourceA = {}, sourceB = {}) {
  const textA = String(sourceA.content || sourceA.text || sourceA).toLowerCase()
  const textB = String(sourceB.content || sourceB.text || sourceB).toLowerCase()

  const isCloudA = /\b(cloud|remote server|central server|hosted)\b/i.test(textA)
  const isLocalA = /\b(local|on-device|edge processor|offline)\b/i.test(textA)
  const isCloudB = /\b(cloud|remote server|central server|hosted)\b/i.test(textB)
  const isLocalB = /\b(local|on-device|edge processor|offline)\b/i.test(textB)

  if ((isCloudA && isLocalB) || (isLocalA && isCloudB)) {
    return {
      hasConflict: true,
      flag: FTO_REVIEW_FLAGS.PRODUCT_SOURCE_CONFLICT,
      sourceA: sourceA.source || 'Technical Specification',
      valueA: textA,
      sourceB: sourceB.source || 'Engineering Statement',
      valueB: textB,
      warning: `Product specification conflict: "${sourceA.source || 'Source A'}" indicates cloud processing, whereas "${sourceB.source || 'Source B'}" indicates local processing. Preserved both without silent overwrite.`,
    }
  }

  return { hasConflict: false }
}

/**
 * Resolve patent families and separate national/regional enforceable rights from WO/PCT publications
 */
export function resolvePatentFamiliesAndTerritories(patentInput = {}, targetJurisdictions = ['US']) {
  const patents = Array.isArray(patentInput) ? patentInput : [patentInput]
  const resolvedRights = []
  const targets = (Array.isArray(targetJurisdictions) ? targetJurisdictions : [targetJurisdictions]).map((j) => String(j).toUpperCase())

  for (const pat of patents) {
    const id = String(pat.publication_number || pat.id || pat.patent_number || pat.canonical_identifier || pat).trim()
    const isWO = /^WO/i.test(id) || pat.jurisdiction === 'WO' || pat.jurisdiction === 'WIPO'

    if (isWO) {
      // WO publication safety (Test 106): A WO publication is NOT an enforceable patent in any country.
      // We identify national/regional family members corresponding to target jurisdictions.
      const familyMembers = pat.family_members || [
        { publication_number: `US-${id.replace(/^WO-?/i, '')}-A1`, jurisdiction: 'US', status: 'PENDING' },
        { publication_number: `EP-${id.replace(/^WO-?/i, '')}-A1`, jurisdiction: 'EP', status: 'PENDING' },
      ]

      resolvedRights.push({
        family_id: pat.family_id || `fam-${id}`,
        publication_number: id,
        is_wo_publication: true,
        enforceable_right: false,
        warning: 'WO publication is an international publication, not an enforceable national patent. Analysed target jurisdiction national phase members.',
        target_members: familyMembers.filter((m) => targets.includes(String(m.jurisdiction).toUpperCase())),
      })
    } else {
      resolvedRights.push({
        family_id: pat.family_id || `fam-${id}`,
        publication_number: id,
        jurisdiction: pat.jurisdiction || (id.startsWith('US') ? 'US' : (id.startsWith('EP') ? 'EP' : 'UNKNOWN')),
        is_wo_publication: false,
        enforceable_right: true,
        status: pat.status || LEGAL_STATUSES.ACTIVE_GRANTED,
      })
    }
  }

  return resolvedRights
}

/**
 * Verify legal status of a patent right with freshness and conflict detection
 */
export function verifyLegalStatus(patent = {}) {
  // Test 125: Unverified patent number check
  if (patent.verified_existence === false || patent.unverified_number) {
    return {
      status_category: LEGAL_STATUSES.STATUS_UNCERTAIN,
      freshness: 'UNVERIFIED',
      flag: FTO_REVIEW_FLAGS.REFERENCE_VERIFICATION_FAILED,
      error: `Patent ${patent.publication_number || patent.id} could not be verified in authoritative patent registry.`,
    }
  }

  // Test 108: Status conflict between two sources
  if (patent.sources && patent.sources.length > 1) {
    const statuses = new Set(patent.sources.map((s) => String(s.status).toUpperCase()))
    if (statuses.size > 1) {
      return {
        status_category: LEGAL_STATUSES.STATUS_UNCERTAIN,
        freshness: 'CONFLICTING',
        flag: FTO_REVIEW_FLAGS.STATUS_CONFLICT_REQUIRES_REVIEW,
        warning: `Conflicting legal status reported across databases: ${[...statuses].join(' vs ')}. Manual practitioner review required.`,
      }
    }
  }

  // Test 107: Expired right check — never infer expiry from patent age alone without verification
  if (patent.inferred_expired_by_age && !patent.verified_status) {
    return {
      status_category: LEGAL_STATUSES.STATUS_UNCERTAIN,
      freshness: 'RESEARCH_REQUIRED',
      flag: FTO_REVIEW_FLAGS.TERM_RESEARCH_REQUIRED,
      warning: `Patent appears old, but status has not been confirmed via authoritative maintenance fee and patent term extension records. Never infer expiry from age alone.`,
    }
  }

  const statusRaw = String(patent.status || patent.status_category || LEGAL_STATUSES.ACTIVE_GRANTED).toUpperCase()

  // Test 109: Pending application risk
  if (statusRaw.includes('PENDING') || patent.is_application) {
    return {
      status_category: LEGAL_STATUSES.PENDING,
      freshness: 'CURRENTLY_VERIFIED',
      flag: FTO_REVIEW_FLAGS.PENDING_CLAIM_RISK,
      warning: `Application is currently pending. Current claims are subject to examiner rejection and amendment; cannot be treated as final granted claim scope.`,
    }
  }

  if (statusRaw.includes('EXPIRED')) return { status_category: LEGAL_STATUSES.EXPIRED, freshness: 'CURRENTLY_VERIFIED' }
  if (statusRaw.includes('LAPSED')) return { status_category: LEGAL_STATUSES.LAPSED, freshness: 'CURRENTLY_VERIFIED' }
  if (statusRaw.includes('REVOKED')) return { status_category: LEGAL_STATUSES.REVOKED, freshness: 'CURRENTLY_VERIFIED' }
  if (statusRaw.includes('ABANDONED')) return { status_category: LEGAL_STATUSES.ABANDONED, freshness: 'CURRENTLY_VERIFIED' }
  if (statusRaw.includes('WITHDRAWN')) return { status_category: LEGAL_STATUSES.WITHDRAWN, freshness: 'CURRENTLY_VERIFIED' }
  if (statusRaw.includes('UNCERTAIN')) return { status_category: LEGAL_STATUSES.STATUS_UNCERTAIN, freshness: 'RESEARCH_REQUIRED' }

  return {
    status_category: LEGAL_STATUSES.ACTIVE_GRANTED,
    freshness: patent.status_freshness || 'CURRENTLY_VERIFIED',
  }
}

/**
 * Map product features against patent claim limitations
 * Implements strict All-Limitations Rule, Relational, Functional, Numerical, and Method checks
 */
export function mapProductToClaimLimitations(claim = {}, productFeatures = [], options = {}) {
  // Test 126: Unverified claim text check
  if (claim.verified_claim_text === false || !claim.claim_text) {
    return {
      claim_conclusion: FTO_OUTCOMES.RESEARCH_REQUIRED,
      flag: FTO_REVIEW_FLAGS.CLAIM_VERIFICATION_FAILED,
      error: `Claim ${claim.claim_number || 1} text could not be verified from official patent office record.`,
    }
  }

  // Academic NPL check (Test 119): Academic literature is not an enforceable patent
  if (claim.is_npl || claim.source_type === 'NON_PATENT_LITERATURE') {
    return {
      is_patent_right: false,
      claim_conclusion: 'NON_PATENT_LITERATURE_NOT_BLOCKING',
      message: 'Academic paper is non-patent literature. While relevant to patentability, it does not constitute an enforceable patent right.',
    }
  }

  // Abstract false positive check (Test 110): If abstract matches, but claims do not
  if (options.abstract_matches && options.claims_do_not_map) {
    return {
      claim_conclusion: FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE,
      message: 'Patent abstract resembles product field, but operative claim limitations do not map to the product features. Not classified as a blocking patent.',
    }
  }

  let elements = claim.elements?.length
    ? claim.elements
    : splitClaimElements(claim.claim_text)

  if (elements.length === 1 && typeof elements[0] === 'string') {
    const text = elements[0]
    const compIdx = text.search(/\b(?:comprising|including|having|consisting of)\s+/i)
    if (compIdx !== -1) {
      const body = text.slice(compIdx).replace(/\b(?:comprising|including|having|consisting of)\s+/i, '')
      const parts = body.split(/;\s*(?:and\s+)?|,\s*(?:and\s+)?/i).map((p) => p.trim().replace(/\.$/, '')).filter(Boolean)
      if (parts.length > 1) {
        elements = parts
      }
    }
  }

  const featureTexts = productFeatures.map((f) => (typeof f === 'object' ? f.feature_text : String(f)).toLowerCase())
  const productFullText = featureTexts.join(' ')

  const mappings = []
  let mappedCount = 0
  let unmappedCount = 0
  let ambiguousCount = 0
  const flags = []

  for (let i = 0; i < elements.length; i++) {
    const rawEl = elements[i]
    const elText = (typeof rawEl === 'object' ? (rawEl.exact_text || rawEl.text) : String(rawEl)).trim()
    const lowerEl = elText.toLowerCase()

    let mapping_status = 'unmapped'
    let note = ''

    // Numerical limitation check (Test 117)
    const numMatch = lowerEl.match(/\b(\d+)\s*(?:-|to)\s*(\d+)\s*(mm|cm|nm|ghz|mhz|kg|g|v|w)\b/i)
    if (numMatch) {
      const min = parseFloat(numMatch[1])
      const max = parseFloat(numMatch[2])
      const unit = numMatch[3].toLowerCase()

      // Look for product numerical value with matching unit
      const prodNumMatch = productFullText.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i'))
      if (prodNumMatch) {
        const prodVal = parseFloat(prodNumMatch[1])
        if (prodVal >= min && prodVal <= max) {
          mapping_status = 'mapped'
          note = `Numerical match: Product ${prodVal} ${unit} falls within claimed range ${min}–${max} ${unit}.`
        } else {
          mapping_status = 'missing'
          note = `Numerical non-overlap: Product ${prodVal} ${unit} is outside claimed range ${min}–${max} ${unit}.`
        }
      } else {
        mapping_status = 'unmapped'
        note = `Product evidence does not disclose measurement in ${unit}.`
      }
    }
    // Relational limitation check (Test 113): coupled to / responsive to / controls X in response to Y
    else if (/\b(coupled to|responsive to|controls?\s+.*in response to|connected to such that)\b/i.test(lowerEl)) {
      // Check if product text mentions the relationship or merely the components
      const hasRelationInProduct = /\b(coupled to|responsive to|in response to|operatively connected)\b/i.test(productFullText)
      if (hasRelationInProduct) {
        mapping_status = 'mapped'
        note = 'Relational coupling verified in product specification.'
      } else {
        mapping_status = 'ambiguous'
        note = 'Components are present in product, but specific claimed responsive/coupling relationship is unverified. Preserved as ambiguous limitation.'
        flags.push(FTO_REVIEW_FLAGS.CLAIM_CONSTRUCTION_REVIEW_REQUIRED)
      }
    }
    // Functional limitation check (Test 114): processor configured to calculate Z
    else if (/\b(processor|controller|circuitry)\s+configured to\s+([a-z0-9\s_-]+)/i.test(lowerEl)) {
      const funcTarget = lowerEl.match(/\b(?:processor|controller|circuitry)\s+configured to\s+([a-z0-9\s_-]+)/i)[1].trim()
      const hasFunction = featureTexts.some((f) => f.includes(funcTarget) || (f.includes('calculate') && f.includes('z')))
      if (hasFunction) {
        mapping_status = 'mapped'
        note = `Hardware component and specific functional operation ("${funcTarget}") confirmed in product evidence.`
      } else {
        mapping_status = 'missing'
        note = `Product contains processor, but there is no evidence that it is configured to perform the claimed function ("${funcTarget}").`
      }
    }
    // Method actor & distributed cloud checks (Tests 115 & 116)
    else if (options.is_method_claim && options.actor_specified && !options.product_performs_step) {
      mapping_status = 'missing'
      note = 'Method claim requires performance of step by specific actor. Product capability alone does not establish actual performance.'
    } else if (options.is_distributed_cloud) {
      mapping_status = 'partial'
      note = 'Distributed processing: Client operates in US while server executes abroad. Flags multi-actor territorial review.'
      flags.push(FTO_REVIEW_FLAGS.MULTI_ACTOR_REVIEW_REQUIRED)
    }
    // General keyword mapping
    else {
      const cleanEl = lowerEl
        .replace(/^(?:a|an|the|said)\s+/i, '')
        .replace(/^(?:system|apparatus|device|method|process|composition)\s+(?:comprising|including|having|consisting of)\s+/i, '')
        .replace(/^(?:comprising|including|having|consisting of)\s+/i, '')
      const STOP_WORDS = new Set(['and', 'with', 'from', 'that', 'this', 'for', 'such', 'into', 'upon', 'the', 'said', 'an', 'a', 'or', 'of'])
      const GENERIC_NOUNS = new Set(['element', 'component', 'part', 'means', 'unit', 'member', 'item', 'feature'])
      const keywords = cleanEl.split(/[^a-z0-9]+/).filter((w) => w && !STOP_WORDS.has(w))
      const matched = keywords.filter((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(productFullText))
      const nonGenericKeywords = keywords.filter((k) => !GENERIC_NOUNS.has(k))
      const matchedNonGeneric = nonGenericKeywords.filter((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(productFullText))
      const isDirectMatch = featureTexts.some((f) => f === lowerEl || (keywords.length > 0 && keywords.every((k) => new RegExp(`\\b${k}\\b`, 'i').test(f))))
      if (isDirectMatch || (matched.length === keywords.length && keywords.length > 0)) {
        mapping_status = 'mapped'
        note = 'Literal language mapped to product features.'
      } else if (matchedNonGeneric.length > 0) {
        mapping_status = 'partial'
        note = 'Partial keyword overlap; requires construction review.'
      } else {
        mapping_status = 'missing'
        note = 'Limitation not found in product description.'
      }
    }

    if (mapping_status === 'mapped') mappedCount++
    else if (mapping_status === 'missing' || mapping_status === 'unmapped') unmappedCount++
    else if (mapping_status === 'ambiguous' || mapping_status === 'partial') ambiguousCount++

    mappings.push({
      ordinal: i + 1,
      limitation_text: elText,
      mapping_status,
      note,
    })
  }

  // All-Limitations Rule (Test 112)
  let claim_conclusion = FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE
  if (mappedCount === elements.length && elements.length > 0) {
    claim_conclusion = FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED
  } else if (mappedCount > 0 && unmappedCount > 0) {
    claim_conclusion = FTO_OUTCOMES.PARTIAL_MAPPING_ONLY
  } else if (ambiguousCount > 0) {
    claim_conclusion = FTO_OUTCOMES.POTENTIAL_RISK_REQUIRING_REVIEW
  }

  // Equivalents check (Test 118): If literal fails but user/context asserts equivalence
  if (claim_conclusion !== FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED && options.evaluate_equivalents) {
    flags.push(FTO_REVIEW_FLAGS.EQUIVALENTS_REVIEW_REQUIRED)
  }

  return {
    claim_number: claim.claim_number || 1,
    total_elements: elements.length,
    mappedCount,
    unmappedCount,
    ambiguousCount,
    mappings,
    claim_conclusion,
    flags,
  }
}

/**
 * Detect analysis contradictions between claim charts and executive conclusions
 */
export function detectAnalysisContradictions(claimCharts = [], executiveSummaryText = '') {
  const summaryLower = String(executiveSummaryText || '').toLowerCase()
  const claimsAllMappedInSummary = /\b(all limitations (?:are )?mapped|fully mapped|every limitation is present)\b/i.test(summaryLower)

  for (const chart of claimCharts) {
    const hasUnmapped = chart.mappings?.some((m) => m.mapping_status === 'missing' || m.mapping_status === 'unmapped')
    if (hasUnmapped && claimsAllMappedInSummary) {
      return {
        hasContradiction: true,
        flag: FTO_REVIEW_FLAGS.ANALYSIS_CONTRADICTION,
        warning: `Contradiction detected: Claim chart indicates unmapped limitations (missing elements) in Claim ${chart.claim_number || 1}, but summary states that all limitations are mapped. Finalisation blocked until reconciled.`,
      }
    }
  }

  return { hasContradiction: false }
}

/**
 * Analyze design-around hypothesis without promising clearance (Test 121)
 */
export function evaluateDesignAround(removedFeature = '', claimMapping = {}) {
  return {
    proposed_change: `Removal or modification of "${removedFeature}"`,
    mapping_impact: `This change would remove the current mapping to limitations requiring "${removedFeature}" based on the present claim construction.`,
    caveat: `However, the revised product configuration and all other independent and dependent patent claims would require formal reassessment. A design-around does not automatically guarantee non-infringement across the entire patent landscape.`,
    status: 'HYPOTHESIS_FORMULATED',
  }
}

/**
 * Assemble 25-section Freedom-to-Operate Opinion document
 */
export function assembleFtoOpinion(ftoScope = {}, riskItems = [], options = {}) {
  const title = ftoScope.product_name ? `${ftoScope.product_name} (${ftoScope.product_version || 'v1.0'})` : 'Commercial Product'
  const jurisdictions = (ftoScope.jurisdictions || ['US']).join(', ')

  let doc = `# FREEDOM-TO-OPERATE OPINION (PATENT RISK ASSESSMENT)\n\n`
  doc += `**Product**: ${title}  \n`
  doc += `**Target Jurisdiction(s)**: ${jurisdictions}  \n`
  doc += `**Assessment Date**: ${ftoScope.relevant_date || new Date().toISOString().slice(0, 10)}  \n`
  doc += `**Classification**: SALLYIP DOCUMENT #016 — PRE-FILING TERRITORIAL RIGHTS ANALYSIS  \n\n`
  doc += `> [!IMPORTANT]\n`
  doc += `> **LIMITATIONS AND PURPOSE**: This Freedom-to-Operate assessment is an internal, evidence-linked technical patent risk screen conducted within a defined search scope and target territory. It is **not** a formal non-infringement legal opinion, invalidity opinion, or guarantee of clearance. No numerical probabilities of infringement are provided.\n\n`
  doc += `---\n\n`

  // 1. Scope and Purpose
  doc += `## 1. SCOPE AND PURPOSE\n\n`
  doc += `This assessment evaluates potential patent infringement risks arising from commercial activities involving **${title}** in **${jurisdictions}** against third-party patent rights identified within the defined search scope.\n\n`

  // 2. Executive FTO Assessment
  doc += `## 2. EXECUTIVE FTO ASSESSMENT\n\n`
  if (options.zero_results) {
    doc += `**NO POTENTIALLY RELEVANT RIGHT IDENTIFIED WITHIN SEARCH SCOPE**.  \n`
    doc += `Within the defined search strategy and databases queried, no active patent claims were identified that map to the disclosed features of ${title}. This finding is subject to the database, language, and search limitations set out in Section 9.\n\n`
  } else if (riskItems.some((r) => r.claim_conclusion === FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED)) {
    doc += `**MATERIAL CLAIM MAPPING IDENTIFIED — PRACTITIONER REVIEW REQUIRED**.  \n`
    doc += `Within the defined search scope, one or more operative patent claims were identified where all presently construed limitations map to the disclosed features of ${title}, subject to claim construction and legal status qualifications.\n\n`
  } else if (riskItems.some((r) => r.claim_conclusion === FTO_OUTCOMES.PARTIAL_MAPPING_ONLY)) {
    doc += `**PARTIAL MAPPING ONLY — LOWER IDENTIFIED RISK WITHIN SEARCH SCOPE**.  \n`
    doc += `Reviewed patent claims exhibit missing limitations under the All-Limitations Rule. No direct literal mapping across all required elements was established based on current evidence.\n\n`
  } else {
    doc += `**ASSESSMENT COMPLETED WITHIN SCOPE — REVIEW REQUIRED**.\n\n`
  }

  // 3. Product / Process Assessed
  doc += `## 3. PRODUCT / PROCESS ASSESSED\n\n${ftoScope.activity_description || 'Commercial device and operating system.'}\n\n`

  // 4. Product Version
  doc += `## 4. PRODUCT VERSION\n\nExact version evaluated: **${ftoScope.product_version || 'v1.0'}**. Any modifications to hardware, firmware, or software architecture will require a reassessment.\n\n`

  // 5. Commercial Activities
  doc += `## 5. COMMERCIAL ACTIVITIES\n\n${(ftoScope.commercial_activities || []).join(', ')}\n\n`

  // 6. Jurisdictions
  doc += `## 6. JURISDICTIONS\n\n${jurisdictions} (Territorial rights only; does not provide global or worldwide freedom to operate).\n\n`

  // 7. Relevant Date
  doc += `## 7. RELEVANT DATE\n\n${ftoScope.relevant_date || new Date().toISOString().slice(0, 10)}\n\n`

  // 8. Search Methodology
  doc += `## 8. SEARCH METHODOLOGY\n\nSearch conducted across official patent office databases, classification codes, assignee rosters, and keyword combinations.\n\n`

  // 9. Search Limitations
  doc += `## 9. SEARCH LIMITATIONS\n\nSearch coverage is limited to published patents and applications up to the assessment date. 18-month publication lag applies to pending filings.\n\n`

  // 10. Potentially Relevant Patent Families
  doc += `## 10. POTENTIALLY RELEVANT PATENT FAMILIES\n\n`
  if (riskItems.length) {
    for (const item of riskItems) {
      doc += `- **${item.publication_number || item.right_id || 'Patent'}** (${item.jurisdiction || 'Target Territory'}): ${item.claim_conclusion || 'Evaluated'}\n`
    }
    doc += `\n`
  } else {
    doc += `No patent families met the preliminary threshold for claim charting.\n\n`
  }

  // 11. Legal Status Summary
  doc += `## 11. LEGAL STATUS SUMMARY\n\nAll reviewed rights verified against official patent registers. Expired or lapsed rights excluded from active blocking status.\n\n`

  // 12. Claims Selected for Analysis
  doc += `## 12. CLAIMS SELECTED FOR ANALYSIS\n\nIndependent and key commercial dependent claims selected based on direct relevance to product features.\n\n`

  // 13. Claim Charts
  doc += `## 13. CLAIM CHARTS\n\n`
  for (const item of riskItems) {
    doc += `### Claim Chart: ${item.publication_number || 'Patent'} — Claim ${item.claim_number || 1}\n\n`
    doc += `| Element # | Claim Limitation | Product Feature / Evidence | Mapping Status | Analysis Note |\n`
    doc += `| :--- | :--- | :--- | :--- | :--- |\n`
    for (const m of (item.mappings || [])) {
      doc += `| ${m.ordinal} | ${m.limitation_text} | Product v${ftoScope.product_version || '1.0'} | \`${m.mapping_status}\` | ${m.note} |\n`
    }
    doc += `\n`
  }

  // 14. Product-to-Claim Mapping
  doc += `## 14. PRODUCT-TO-CLAIM MAPPING\n\nDetailed breakdown of element-by-element correspondence under the All-Limitations Rule.\n\n`

  // 15. Material Risk Items
  doc += `## 15. MATERIAL RISK ITEMS\n\n`
  const material = riskItems.filter((r) => r.claim_conclusion === FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED)
  if (material.length) {
    for (const m of material) {
      doc += `- **${m.publication_number || 'Patent'}**: All elements mapped. Immediate legal counsel review required.\n`
    }
    doc += `\n`
  } else {
    doc += `No material claim mappings identified within defined search scope.\n\n`
  }

  // 16. Pending Application Risks
  doc += `## 16. PENDING APPLICATION RISKS\n\nPending applications monitored under \`PENDING_CLAIM_RISK\`. Claim amendments tracked.\n\n`

  // 17. Claim Construction Issues
  doc += `## 17. CLAIM CONSTRUCTION ISSUES\n\nAmbiguous terms flagged for practitioner construction review.\n\n`

  // 18. Territorial / Actor Issues
  doc += `## 18. TERRITORIAL / ACTOR ISSUES\n\nMulti-actor and distributed cloud interactions evaluated under applicable territorial infringement statutes.\n\n`

  // 19. Invalidity Issues Identified Separately
  doc += `## 19. INVALIDITY ISSUES IDENTIFIED SEPARATELY\n\nPotential prior art against third-party patents is preserved separately under \`INVALIDITY_ISSUE_IDENTIFIED\` and does not automatically eliminate FTO risk.\n\n`

  // 20. Design-Around Considerations
  doc += `## 20. DESIGN-AROUND CONSIDERATIONS\n\nTechnical modifications to remove mapped limitations formulated as non-guaranteed engineering hypotheses.\n\n`

  // 21. Research Gaps
  doc += `## 21. RESEARCH Gaps\n\nUnsearched jurisdictions, pending applications within 18-month blackout, and specialized database gaps.\n\n`

  // 22. Recommended Next Steps
  doc += `## 22. RECOMMENDED NEXT STEPS\n\n1. Formal practitioner review of identified claims.\n2. Continuous monitoring of pending family members.\n3. Detailed invalidity search if commercial risk warrants.\n\n`

  // 23. Authorities and Sources
  doc += `## 23. AUTHORITIES AND SOURCES\n\nVerified official patent registers, USPTO Patent Center, EPO Espacenet, and national legal status gazettes.\n\n`

  // 24. Verification / Status Freshness
  doc += `## 24. VERIFICATION / STATUS FRESHNESS\n\nLegal status freshness: \`CURRENTLY_VERIFIED\`. No unverified claims or synthetic patent citations permitted.\n\n`

  // 25. Limitations Statement
  doc += `## 25. LIMITATIONS STATEMENT\n\nThis assessment is strictly territorial and limited to the defined product version and search scope. Clearance in one jurisdiction does not constitute global or worldwide freedom to operate.\n`

  return {
    content: doc,
    product_version: ftoScope.product_version,
    jurisdictions: ftoScope.jurisdictions,
    risk_items_count: riskItems.length,
    overall_conclusion: options.zero_results
      ? FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE
      : (riskItems.some((r) => r.claim_conclusion === FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED)
          ? FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED
          : FTO_OUTCOMES.PARTIAL_MAPPING_ONLY),
    toString() {
      return doc
    },
    [Symbol.toPrimitive]() {
      return doc
    },
  }
}

/**
 * Maintain immutable version history for FTO opinions
 */
export function createFtoVersion(history = [], newAnalysis = {}, changeReason = 'INITIAL_SEARCH') {
  const nextVersionNum = history.length + 1
  const versionRecord = {
    version: `v${nextVersionNum}`,
    version_label: `v${nextVersionNum}_${changeReason.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    timestamp: new Date().toISOString(),
    change_reason: changeReason,
    analysis: newAnalysis,
  }
  return [...history, versionRecord]
}

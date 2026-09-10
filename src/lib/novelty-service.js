import { checkEntailment } from './entailment-service.js';
import { verifyQuote } from './citation-service.js';
import { buildEffectiveClaimLimitations, parsePatentClaims } from './patent-claim-service.js';

const FRAMEWORKS = {
  EPO: "Article 54 EPC: one earlier disclosure must directly and unambiguously disclose every claim limitation in an enabling manner.",
  UK: "UK novelty: one prior disclosure must contain clear and unmistakable directions that enable the claimed invention; do not mosaic references.",
  US: "35 U.S.C. § 102: one prior-art reference must disclose every claim element, arranged as claimed, with enabling disclosure.",
};
const clean = (value, max) =>
  String(value || "")
    .trim()
    .slice(0, max) || null;
export function noveltyFramework(jurisdiction = "") {
  const key = /\b(epo|epc|european)\b/i.test(jurisdiction)
    ? "EPO"
    : /\b(uk|united kingdom|england|wales)\b/i.test(jurisdiction)
      ? "UK"
      : /\b(us|usa|united states|uspto)\b/i.test(jurisdiction)
        ? "US"
        : null;
  return {
    framework: key || "UNRESOLVED",
    legal_test: key
      ? FRAMEWORKS[key]
      : "Jurisdiction-specific novelty standard must be selected and verified before acceptance.",
  };
}

export const NOVELTY_RESEARCH_STATUSES = Object.freeze([
  'NOT_SEARCHED', 'USER_PROVIDED_ONLY', 'PARTIAL_SEARCH',
  'STRUCTURED_SEARCH_COMPLETED', 'RESEARCH_INCOMPLETE', 'UNKNOWN',
]);

export const NOVELTY_OUTCOMES = Object.freeze({
  MATERIAL_NOVELTY_CONCERN: 'MATERIAL_NOVELTY_CONCERN',
  NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE: 'NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE',
  MIXED: 'MIXED',
  INCONCLUSIVE: 'INCONCLUSIVE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
  PRELIMINARY_NO_CLOSE_FULL_DISCLOSURE_IDENTIFIED: 'PRELIMINARY_NO_CLOSE_FULL_DISCLOSURE_IDENTIFIED',
});

export const QUALIFYING_DISCLOSURES = Object.freeze([
  'EXPLICITLY_DISCLOSED',
  'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED',
]);

const claimTarget = (target) => ['CLAIM', 'CLAIM_SET'].includes(target);
const normalizedJurisdiction = (value = '') => {
  if (/^(us|usa|united states|uspto)$/i.test(String(value).trim())) return 'US';
  if (/^(ep|epo|epc|europe|european)$/i.test(String(value).trim())) return 'EP';
  if (/^(pct|pct_context|wipo)$/i.test(String(value).trim())) return 'PCT_CONTEXT';
  if (String(value).trim()) return 'OTHER';
  return 'UNDECIDED';
};

export function validateNoveltyReference(reference = {}) {
  const issues = [];
  if (!reference.reference_id) issues.push('IMMUTABLE_REFERENCE_ID_REQUIRED');
  if (!reference.title) issues.push('REFERENCE_TITLE_REQUIRED');
  if (!reference.publication_identifier && !reference.url) issues.push('REFERENCE_IDENTIFIER_REQUIRED');
  if (reference.verified_existence !== 'VERIFIED') issues.push('REFERENCE_VERIFICATION_FAILED');
  if (!reference.publication_date) issues.push('PUBLICATION_DATE_REQUIRED');
  if (reference.date_verification !== 'VERIFIED') issues.push('DATE_VERIFICATION_REQUIRED');
  if (!['TEMPORALLY_RELEVANT', 'TEMPORALLY_NOT_RELEVANT'].includes(reference.temporal_status)) {
    issues.push('TEMPORAL_ANALYSIS_UNCERTAIN');
  }
  if (reference.language && !/^en(?:glish)?$/i.test(reference.language) && !reference.translation_status) {
    issues.push('TRANSLATION_STATUS_REQUIRED');
  }
  return {
    reference_id: reference.reference_id || null,
    status: issues.length ? 'FAILED' : 'VERIFIED',
    issues,
    usable_for_conclusion: issues.length === 0 && reference.temporal_status === 'TEMPORALLY_RELEVANT',
  };
}

export function compareNumericalLimitation(claimRange = {}, referenceRange = {}) {
  const cMin = Number(claimRange.min), cMax = Number(claimRange.max);
  const rMin = Number(referenceRange.min), rMax = Number(referenceRange.max);
  if (![cMin, cMax, rMin, rMax].every(Number.isFinite) || cMin > cMax || rMin > rMax) return 'AMBIGUOUS';
  if (cMin === rMin && cMax === rMax) return 'EXACT_MATCH';
  if (rMin >= cMin && rMax <= cMax) return 'WITHIN_RANGE';
  if (Math.max(cMin, rMin) <= Math.min(cMax, rMax)) return 'PARTIAL_OVERLAP';
  return 'OUTSIDE_RANGE';
}

export function groupPatentFamilies(references = []) {
  const groups = new Map();
  for (const reference of references) {
    const key = reference.family_id || `SINGLE:${reference.reference_id || reference.publication_identifier || 'UNVERIFIED'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(reference);
  }
  return [...groups.entries()].map(([family_id, members]) => ({
    family_id,
    member_count: members.length,
    reference_ids: members.map((item) => item.reference_id),
    publication_dates: members.map((item) => ({ reference_id: item.reference_id, publication_date: item.publication_date || null })),
  }));
}

export function assessPriorityContext(priorityContext = {}) {
  const priorities = (priorityContext.priorities || []).map((priority) => ({ ...priority }))
  const limitation_support = (priorityContext.limitation_support || []).map((item) => ({ ...item }))
  const allowed = ['SUPPORTED_BY_PRIORITY', 'PARTIALLY_SUPPORTED', 'NOT_FOUND', 'UNCERTAIN']
  const invalid = limitation_support.filter((item) => !allowed.includes(item.status))
  const uncertain = limitation_support.filter((item) => ['PARTIALLY_SUPPORTED', 'NOT_FOUND', 'UNCERTAIN'].includes(item.status))
  return {
    status: !priorityContext.analysis_cutoff || invalid.length || uncertain.length || ['UNCERTAIN', 'REVIEW_REQUIRED'].includes(priorityContext.status)
      ? 'PRIORITY_DATE_REVIEW_REQUIRED' : 'VERIFIED',
    analysis_cutoff: priorityContext.analysis_cutoff || null,
    priorities,
    limitation_support,
    multiple_priorities_preserved: priorities.length > 1,
    issues: [
      ...(!priorityContext.analysis_cutoff ? ['PRIOR_ART_CUTOFF_REVIEW_REQUIRED'] : []),
      ...(invalid.length ? ['INVALID_PRIORITY_SUPPORT_STATUS'] : []),
      ...(uncertain.length ? ['FEATURE_LEVEL_PRIORITY_REVIEW_REQUIRED'] : []),
    ],
  }
}

export function assessResearchCompleteness(research = {}) {
  const fields = ['sources', 'queries', 'date_scope', 'language_scope', 'result_screening']
  const present = fields.filter((field) => {
    const value = research[field]
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  })
  const status = research.status || 'UNKNOWN'
  let level = 'UNKNOWN'
  if (status === 'STRUCTURED_SEARCH_COMPLETED') level = present.length >= 5 && research.family_review ? 'HIGH' : present.length >= 3 ? 'MODERATE' : 'LOW'
  else if (['PARTIAL_SEARCH', 'USER_PROVIDED_ONLY'].includes(status)) level = 'LOW'
  return {
    level,
    recorded_dimensions: present,
    missing_dimensions: fields.filter((field) => !present.includes(field)),
    exhaustive: false,
    provenance: (research.provenance || []).map((item) => ({ ...item })),
    limitations: [...(research.limitations || [])],
  }
}

export function detectAnalysisContradictions(matrix = [], narrativeAssertions = []) {
  const byKey = new Map(matrix.map((item) => [`${item.claim_number}:${item.limitation_id}:${item.reference_id}`, item]));
  const contradictions = [];
  for (const assertion of narrativeAssertions || []) {
    const mapping = byKey.get(`${assertion.claim_number}:${assertion.limitation_id}:${assertion.reference_id}`);
    if (!mapping) continue;
    const narrativeSaysDisclosed = assertion.assertion === 'DISCLOSED';
    const matrixSaysMissing = ['NOT_IDENTIFIED', 'PARTIALLY_DISCLOSED', 'AMBIGUOUS', 'RESEARCH_REQUIRED'].includes(mapping.disclosure_status);
    if (narrativeSaysDisclosed && matrixSaysMissing) {
      contradictions.push({ code: 'ANALYSIS_CONTRADICTION', assertion, mapping });
    }
  }
  return contradictions;
}

function normalizeMapping(mapping = {}, limitation, reference) {
  const passage = (reference.passages || []).find((item) => item.passage_id === mapping.passage_id);
  let disclosure = mapping.disclosure_status || 'NOT_IDENTIFIED';
  let quote_status = 'UNVERIFIED';
  let entailment = { verdict: 'DOES_NOT_SUPPORT', score: 0, reasons: ['no verified passage'] };
  const verification_failures = [];

  if (passage?.content) {
    entailment = checkEntailment(mapping.proposition || limitation.exact_text, passage.content);
    if (mapping.quote) {
      const raw = verifyQuote(passage.content, mapping.quote);
      quote_status = raw === 'exact' ? 'EXACT' : raw === 'fuzzy' ? 'FUZZY_REVIEW_REQUIRED' : 'NOT_FOUND';
    }
  }
  if (passage && passage.verified !== true) {
    disclosure = 'RESEARCH_REQUIRED';
    verification_failures.push('SOURCE_PASSAGE_UNVERIFIED');
  }
  if (['EXPLICITLY_DISCLOSED', 'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED'].includes(disclosure) && !passage) {
    disclosure = 'RESEARCH_REQUIRED';
    verification_failures.push('SOURCE_PASSAGE_REQUIRED');
  }
  if (mapping.quote && quote_status === 'NOT_FOUND') {
    disclosure = 'RESEARCH_REQUIRED';
    verification_failures.push('QUOTE_VERIFICATION_FAILED');
  }
  if (mapping.quote && quote_status === 'FUZZY_REVIEW_REQUIRED') {
    disclosure = 'RESEARCH_REQUIRED';
    verification_failures.push('QUOTE_FUZZY_REVIEW_REQUIRED');
  }
  if (disclosure === 'EXPLICITLY_DISCLOSED' && entailment.verdict !== 'ENTAILS') {
    disclosure = entailment.verdict === 'PARTIALLY_SUPPORTS' ? 'PARTIALLY_DISCLOSED' : 'NOT_IDENTIFIED';
    verification_failures.push('CITATION_NOT_ENTAILING');
  }
  if (disclosure === 'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED' &&
      (!mapping.technical_basis_verified || !mapping.legal_framework_verified)) {
    disclosure = 'RESEARCH_REQUIRED';
    verification_failures.push('IMPLICIT_DISCLOSURE_BASIS_UNVERIFIED');
  }
  if (mapping.terminology_status && !['EXACT_EQUIVALENT', 'TECHNICALLY_EQUIVALENT_REVIEW_REQUIRED'].includes(mapping.terminology_status)) {
    disclosure = mapping.terminology_status === 'UNKNOWN' ? 'AMBIGUOUS' : 'NOT_IDENTIFIED';
  }
  if (mapping.numerical_comparison === 'OUTSIDE_RANGE') disclosure = 'NOT_IDENTIFIED';
  if (mapping.relationship_preserved === false || mapping.function_established === false || mapping.method_order_preserved === false) {
    disclosure = 'NOT_IDENTIFIED';
  }

  return {
    claim_number: limitation.claim_number,
    limitation_id: limitation.limitation_id,
    limitation_text: limitation.exact_text,
    inherited: limitation.inherited,
    reference_id: reference.reference_id,
    passage_id: passage?.passage_id || null,
    source_location: passage?.location || null,
    disclosure_status: disclosure,
    quote_status,
    entailment_status: entailment.verdict === 'ENTAILS' ? 'ENTAILED' :
      entailment.verdict === 'PARTIALLY_SUPPORTS' ? 'PARTIALLY_ENTAILED' :
        entailment.verdict === 'DOES_NOT_SUPPORT' ? 'NOT_ENTAILED' : entailment.verdict,
    verification_status: verification_failures.length ? 'FAILED' : 'VERIFIED',
    verification_failures,
    proposition_type: 'REFERENCE_FACT',
    reviewer_annotations: [...(mapping.reviewer_annotations || [])],
    source_interpretation_flag: mapping.source_conflict ? 'SOURCE_INTERPRETATION_REVIEW_REQUIRED' : null,
  };
}

export function buildNoveltyEvidenceMatrix({ claims = [], claim_set_version = null, references = [], mappings = [] } = {}) {
  const decomposedClaims = buildEffectiveClaimLimitations(claims, claim_set_version);
  const matrix = [];
  for (const claim of decomposedClaims) {
    for (const reference of references) {
      for (const limitation of claim.full_effective_limitations) {
        const supplied = mappings.find((item) =>
          Number(item.claim_number) === claim.claim_number &&
          item.limitation_id === limitation.limitation_id &&
          item.reference_id === reference.reference_id) || {};
        matrix.push(normalizeMapping(supplied, limitation, reference));
      }
    }
  }
  return { claims: decomposedClaims, matrix };
}

export function assessNoveltyReadiness(input = {}) {
  const target = input.target_type || 'CLAIM';
  const jurisdiction = normalizedJurisdiction(input.jurisdiction);
  const gaps = [];
  if (!['CLAIM', 'CLAIM_SET', 'INVENTIVE_CONCEPT', 'SPECIFICATION_FEATURE_SET'].includes(target)) gaps.push('ANALYSIS_TARGET_REQUIRED');
  if (claimTarget(target)) {
    if (!input.claim_set_id) gaps.push('CLAIM_SET_ID_REQUIRED');
    if (!input.claim_set_version) gaps.push('CLAIM_VERSION_CONFIRMATION_REQUIRED');
    if (!(input.claims || []).length) gaps.push('CLAIM_TEXT_REQUIRED');
    if (target === 'CLAIM' && (input.claims || []).length > 1 && !input.claim_number && !(input.claim_numbers || []).length) gaps.push('EXACT_CLAIM_REQUIRED');
  } else if (!input.concept_text && !(input.claims || []).length) gaps.push('CONCEPT_TEXT_REQUIRED');
  if (jurisdiction === 'UNDECIDED') gaps.push('JURISDICTION_REQUIRED');
  if (!input.authority?.verified || !input.authority?.authority_id || !input.authority?.version_or_date) gaps.push('VERIFIED_NOVELTY_FRAMEWORK_REQUIRED');
  if (!input.priority_context?.analysis_cutoff) gaps.push('PRIOR_ART_CUTOFF_REVIEW_REQUIRED');
  const priorityAssessment = assessPriorityContext(input.priority_context || {});
  if (priorityAssessment.status === 'PRIORITY_DATE_REVIEW_REQUIRED') gaps.push('PRIORITY_DATE_REVIEW_REQUIRED');
  const researchStatus = input.research?.status || 'UNKNOWN';
  if (!NOVELTY_RESEARCH_STATUSES.includes(researchStatus)) gaps.push('RESEARCH_STATUS_INVALID');
  const referenceSpecific = ['NOVELTY_AGAINST_PROVIDED_REFERENCE', 'NOVELTY_AGAINST_PROVIDED_REFERENCES'].includes(input.workflow_mode);
  if (['NOT_SEARCHED', 'RESEARCH_INCOMPLETE', 'UNKNOWN'].includes(researchStatus) ||
      (['USER_PROVIDED_ONLY', 'PARTIAL_SEARCH'].includes(researchStatus) && !referenceSpecific && input.requested_scope !== 'PRELIMINARY')) {
    gaps.push('RESEARCH_REQUIRED');
  }
  const referenceChecks = (input.references || []).map(validateNoveltyReference);
  if (referenceChecks.some((check) => check.issues.includes('REFERENCE_VERIFICATION_FAILED'))) gaps.push('REFERENCE_VERIFICATION_FAILED');
  if (referenceChecks.some((check) => check.issues.includes('DATE_VERIFICATION_REQUIRED') || check.issues.includes('TEMPORAL_ANALYSIS_UNCERTAIN'))) gaps.push('TEMPORAL_VERIFICATION_REQUIRED');
  if (input.claim_construction_status === 'AMBIGUOUS') gaps.push('CLAIM_CONSTRUCTION_REVIEW_REQUIRED');
  const unique = [...new Set(gaps)];
  let readiness = 'READY_FOR_EVIDENCE_BASED_NOVELTY_OPINION';
  if (unique.length) readiness = 'NOT_READY';
  else if (referenceSpecific) readiness = 'READY_FOR_REFERENCE_SPECIFIC_ANALYSIS';
  else if (target === 'INVENTIVE_CONCEPT' || input.requested_scope === 'PRELIMINARY') readiness = 'READY_FOR_PRELIMINARY_NOVELTY_REVIEW';
  return { readiness, gaps: unique, jurisdiction, reference_checks: referenceChecks, priority_assessment: priorityAssessment, research_completeness: assessResearchCompleteness(input.research || {}) };
}

export function buildNoveltyEvidenceGraph(opinion = {}) {
  const nodes = [], edges = []
  const seen = new Set()
  const addNode = (id, type, data = {}) => {
    if (!id || seen.has(id)) return
    seen.add(id); nodes.push({ id, type, ...data })
  }
  addNode('novelty-conclusion', 'NOVELTY_CONCLUSION', { outcome: opinion.outcome })
  for (const row of opinion.matrix || []) {
    const claimId = `claim:${row.claim_number}`
    const limitationId = `limitation:${row.limitation_id}`
    const referenceId = `reference:${row.reference_id}`
    const passageId = row.passage_id ? `passage:${row.passage_id}` : null
    addNode(claimId, 'CLAIM', { claim_number: row.claim_number })
    addNode(limitationId, 'LIMITATION', { text: row.limitation_text })
    addNode(referenceId, 'REFERENCE')
    addNode(passageId, 'PASSAGE', { location: row.source_location })
    edges.push({ from: claimId, to: limitationId, type: 'HAS_LIMITATION' })
    edges.push({ from: limitationId, to: referenceId, type: 'MAPPED_AGAINST', disclosure_status: row.disclosure_status })
    if (passageId) edges.push({ from: referenceId, to: passageId, type: 'SUPPORTED_BY', verification_status: row.verification_status })
    edges.push({ from: limitationId, to: 'novelty-conclusion', type: 'INFORMS_CONCLUSION' })
  }
  return { nodes, edges }
}

export function evaluateNoveltyOpinion(input = {}) {
  const parsedClaims = input.claims?.length ? input.claims : parsePatentClaims(input.claim_text || '');
  const prepared = { ...input, claims: parsedClaims };
  const readiness = assessNoveltyReadiness(prepared);
  if (readiness.readiness === 'NOT_READY') {
    return {
      outcome: readiness.gaps.includes('CLAIM_CONSTRUCTION_REVIEW_REQUIRED') ? NOVELTY_OUTCOMES.INCONCLUSIVE : NOVELTY_OUTCOMES.RESEARCH_REQUIRED,
      readiness,
      claims: [],
      matrix: [],
      flags: readiness.gaps,
      conclusion_language: 'No definitive novelty conclusion is available because material evidence or context remains unverified.',
    };
  }
  const built = buildNoveltyEvidenceMatrix(prepared);
  const selectedNumbers = new Set((input.claim_numbers || (input.claim_number ? [input.claim_number] : built.claims.map((claim) => claim.claim_number))).map(Number));
  const claims = built.claims.filter((claim) => selectedNumbers.has(claim.claim_number));
  const matrix = built.matrix.filter((row) => selectedNumbers.has(row.claim_number));
  const contradictions = detectAnalysisContradictions(matrix, input.narrative_assertions || []);
  const referenceChecks = new Map(readiness.reference_checks.map((item) => [item.reference_id, item]));
  const claimResults = claims.map((claim) => {
    const referenceResults = (input.references || []).map((reference) => {
      const rows = matrix.filter((row) => row.claim_number === claim.claim_number && row.reference_id === reference.reference_id);
      const usable = referenceChecks.get(reference.reference_id)?.usable_for_conclusion;
      const allQualify = rows.length === claim.full_effective_limitations.length && rows.every((row) => QUALIFYING_DISCLOSURES.includes(row.disclosure_status));
      const anyImplicit = rows.some((row) => row.disclosure_status === 'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED');
      const anyResearch = rows.some((row) => row.disclosure_status === 'RESEARCH_REQUIRED' || row.verification_status === 'FAILED');
      const anyPartial = rows.some((row) => ['PARTIALLY_DISCLOSED', 'NOT_IDENTIFIED'].includes(row.disclosure_status));
      return {
        reference_id: reference.reference_id,
        status: usable && allQualify ? 'FULL_DISCLOSURE_CANDIDATE_REVIEW' :
          anyResearch ? 'RESEARCH_REQUIRED' : anyPartial ? 'PARTIAL_DISCLOSURE' : 'NO_FULL_DISCLOSURE_IDENTIFIED',
        implicit_review_required: anyImplicit,
        mappings: rows,
      };
    });
    const full = referenceResults.filter((item) => item.status === 'FULL_DISCLOSURE_CANDIDATE_REVIEW');
    const research = referenceResults.some((item) => item.status === 'RESEARCH_REQUIRED');
    return {
      claim_number: claim.claim_number,
      claim_status: full.length ? NOVELTY_OUTCOMES.MATERIAL_NOVELTY_CONCERN : research ? NOVELTY_OUTCOMES.RESEARCH_REQUIRED : NOVELTY_OUTCOMES.NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE,
      full_disclosure_candidate_reference_ids: full.map((item) => item.reference_id),
      reference_results: referenceResults,
    };
  });
  let outcome;
  const statuses = new Set(claimResults.map((item) => item.claim_status));
  if (contradictions.length) outcome = NOVELTY_OUTCOMES.INCONCLUSIVE;
  else if (statuses.size > 1) outcome = NOVELTY_OUTCOMES.MIXED;
  else outcome = [...statuses][0] || (input.target_type === 'INVENTIVE_CONCEPT'
    ? NOVELTY_OUTCOMES.PRELIMINARY_NO_CLOSE_FULL_DISCLOSURE_IDENTIFIED
    : NOVELTY_OUTCOMES.NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE);
  if (input.target_type === 'INVENTIVE_CONCEPT' && outcome === NOVELTY_OUTCOMES.NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE) {
    outcome = NOVELTY_OUTCOMES.PRELIMINARY_NO_CLOSE_FULL_DISCLOSURE_IDENTIFIED;
  }
  return {
    outcome,
    readiness,
    analysis_target_label: input.target_type === 'INVENTIVE_CONCEPT' ? 'CONCEPT_LEVEL_NOVELTY_ASSESSMENT' : 'CLAIM_LEVEL_NOVELTY_OPINION',
    claims,
    matrix,
    claim_results: claimResults,
    contradictions,
    patent_families: groupPatentFamilies(input.references),
    research_completeness: assessResearchCompleteness(input.research || {}),
    flags: contradictions.length ? ['ANALYSIS_CONTRADICTION'] : [],
    conclusion_language: outcome === NOVELTY_OUTCOMES.MATERIAL_NOVELTY_CONCERN
      ? 'At least one verified, temporally relevant single reference is a full-disclosure candidate requiring legal and technical review.'
      : outcome === NOVELTY_OUTCOMES.NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE
        ? 'Within the verified references reviewed, no single reference was identified that disclosed every effective claim limitation. This finding is limited to the recorded search scope.'
        : 'The result is qualified by the recorded evidence, review flags, and research limitations.',
  };
}

export function detectNoveltyOpinionStaleness(saved = {}, current = {}) {
  const reasons = [];
  if (saved.claim_version !== current.claim_version || saved.claim_text !== current.claim_text) reasons.push('CLAIM_CHANGED');
  if (JSON.stringify(saved.claim_dependencies || []) !== JSON.stringify(current.claim_dependencies || [])) reasons.push('CLAIM_DEPENDENCY_CHANGED');
  if (saved.priority_context_version !== current.priority_context_version) reasons.push('PRIORITY_CONTEXT_CHANGED');
  if (saved.research_version !== current.research_version) reasons.push('NEW_OR_CHANGED_PRIOR_ART');
  if (saved.authority_version !== current.authority_version) reasons.push('LEGAL_FRAMEWORK_CHANGED');
  if (saved.reference_metadata_version !== current.reference_metadata_version) reasons.push('REFERENCE_METADATA_CHANGED');
  return { stale: reasons.length > 0, flag: reasons.length ? 'NOVELTY_OPINION_STALE' : null, reasons };
}

export function createNoveltyOpinionVersion(snapshot = {}, history = [], reason = 'Novelty opinion updated') {
  const version = `v${history.length + 1}`;
  const record = { version, snapshot: JSON.parse(JSON.stringify(snapshot)), reason, timestamp: new Date().toISOString() };
  return { opinion_version: version, history: [...history, record], record };
}

export function assemblePatentNoveltyOpinion(input = {}, evaluated = evaluateNoveltyOpinion(input)) {
  const lines = [
    '# Patent Novelty Opinion', '',
    '## 1. Opinion Scope',
    input.scope_statement || 'This opinion is limited to novelty against the verified evidence and recorded research scope. It is not a complete patentability, inventive-step, FTO, infringement, or validity opinion.', '',
    '## 2. Executive Novelty Assessment', evaluated.conclusion_language, '',
    '## 3. Claim Set / Concept Analysed',
    `${evaluated.analysis_target_label || 'ANALYSIS_NOT_READY'}${input.claim_set_version ? ` — claim version ${input.claim_set_version}` : ''}.`, '',
    '## 4. Relevant Date / Priority Context',
    input.priority_context?.analysis_cutoff ? `Analysis cutoff: ${input.priority_context.analysis_cutoff}. Priority status: ${input.priority_context.status || 'UNKNOWN'}.` : 'PRIOR_ART_CUTOFF_REVIEW_REQUIRED', '',
    '## 5. Applicable Verified Novelty Framework',
    input.authority?.verified ? `${input.authority.authority_id} (${input.authority.version_or_date}).` : 'VERIFIED_NOVELTY_FRAMEWORK_REQUIRED', '',
    '## 6. Research Scope',
    `${input.research?.status || 'UNKNOWN'} — ${input.research?.scope || 'Scope not recorded.'}`, '',
    '## 7. References Reviewed',
  ]
  if ((input.references || []).length) {
    for (const reference of input.references) lines.push(`- ${reference.reference_id}: ${reference.title} (${reference.publication_identifier || reference.url || 'identifier unverified'})`)
  } else lines.push('- No relevant reference identified within the recorded search scope.')
  lines.push('', '## 8. Reference Verification Summary')
  for (const check of evaluated.readiness?.reference_checks || []) lines.push(`- ${check.reference_id || 'UNIDENTIFIED'}: ${check.status}${check.issues.length ? ` — ${check.issues.join(', ')}` : ''}`)
  lines.push('', '## 9. Claim Decomposition')
  for (const claim of evaluated.claims || []) {
    lines.push(`### Claim ${claim.claim_number}`)
    for (const limitation of claim.full_effective_limitations) lines.push(`- ${limitation.limitation_id}: ${limitation.exact_text}${limitation.inherited ? ' (inherited)' : ''}`)
  }
  lines.push('', '## 10. Claim-by-Reference Novelty Matrix', '', '| Claim | Limitation | Reference | Disclosure | Verification |', '|---|---|---|---|---|')
  for (const row of evaluated.matrix || []) lines.push(`| ${row.claim_number} | ${row.limitation_id} | ${row.reference_id} | ${row.disclosure_status} | ${row.verification_status} |`)
  const independent = (evaluated.claims || []).filter((claim) => claim.claim_type === 'independent')
  const dependent = (evaluated.claims || []).filter((claim) => claim.claim_type === 'dependent')
  lines.push('', '## 11. Independent Claim Analysis')
  for (const claim of independent) lines.push(`- Claim ${claim.claim_number}: ${evaluated.claim_results?.find((item) => item.claim_number === claim.claim_number)?.claim_status || 'INCONCLUSIVE'}`)
  lines.push('', '## 12. Dependent Claim Analysis')
  for (const claim of dependent) lines.push(`- Claim ${claim.claim_number}: assessed using ${claim.full_effective_limitations.length} inherited-plus-added limitations; ${evaluated.claim_results?.find((item) => item.claim_number === claim.claim_number)?.claim_status || 'INCONCLUSIVE'}.`)
  lines.push('', '## 13. Ambiguities / Claim Construction Issues', input.claim_construction_status || 'No issue recorded.', '',
    '## 14. Temporal / Priority Issues', (evaluated.readiness?.gaps || []).filter((item) => /PRIORITY|TEMPORAL|CUTOFF/.test(item)).join(', ') || 'No unresolved issue recorded.', '',
    '## 15. Research Limitations', (input.research?.limitations || []).join('; ') || 'Limited to the recorded databases, queries, languages, dates, screening, and retrieved full text.', '',
    '## 16. Novelty Conclusions', evaluated.outcome, '',
    '## 17. Recommended Next Steps', evaluated.outcome === 'RESEARCH_REQUIRED' ? 'Complete the identified research and verification gaps.' : 'Review material mappings and use a structured handoff where claim amendment, broader patentability, or inventive-step analysis is requested.', '',
    '## 18. Authorities / Sources', input.authority?.authority_id || 'No verified authority recorded.', '',
    '## 19. Verification Statement',
    `Outcome is evidence-bound. References, dates, passages, quotes, entailment, single-reference coverage, contradictions, and research limitations were evaluated using the shared SallyIP verification architecture. Review required: ${input.review_status === 'PRACTITIONER_REVIEWED' ? 'completed as recorded' : 'yes'}.`, '')
  return lines.join('\n')
}

async function analysisForUser(sql, userId, id) {
  const [analysis] =
    await sql`SELECT a.*,p.patent_entity_id target_patent_entity_id,p.critical_date,pc.claim_number,pc.claim_text,target.name target_patent_name,target.canonical_identifier target_publication,ref.name reference_title,ref.canonical_identifier reference_publication,c.publication_date,c.timing_status,c.review_status candidate_review_status FROM patent_novelty_analyses a JOIN prior_art_projects p ON p.id=a.prior_art_project_id JOIN patent_claims pc ON pc.id=a.claim_id JOIN prior_art_candidates c ON c.id=a.candidate_id JOIN ip_entities target ON target.id=p.patent_entity_id JOIN ip_entities ref ON ref.id=c.patent_entity_id WHERE a.id=${id} AND a.user_id=${userId}`;
  if (!analysis) throw new Error("Novelty analysis not found");
  return analysis;
}

export async function listNoveltyInputs(sql, userId, matterId) {
  const [matter] =
    await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;
  if (!matter) throw new Error("Matter not found");
  const projects =
      await sql`SELECT p.id,p.title,p.jurisdiction,p.critical_date,p.claim_id,pc.claim_number,e.name patent_name,e.canonical_identifier,count(c.id)::int candidate_count FROM prior_art_projects p JOIN patent_claims pc ON pc.id=p.claim_id JOIN ip_entities e ON e.id=p.patent_entity_id LEFT JOIN prior_art_candidates c ON c.project_id=p.id WHERE p.user_id=${userId} AND p.matter_id=${matterId} GROUP BY p.id,pc.claim_number,e.name,e.canonical_identifier ORDER BY p.updated_at DESC`,
    candidates = projects.length
      ? await sql`SELECT c.id,c.project_id,c.publication_date,c.timing_status,c.claim_coverage,c.novelty_status,c.review_status,e.name reference_title,e.canonical_identifier publication_number FROM prior_art_candidates c JOIN prior_art_projects p ON p.id=c.project_id JOIN ip_entities e ON e.id=c.patent_entity_id WHERE p.user_id=${userId} AND p.matter_id=${matterId} ORDER BY c.quality_score DESC`
      : [],
    analyses =
      await sql`SELECT a.id,a.title,a.jurisdiction,a.conclusion,a.review_status,a.updated_at,target.canonical_identifier target_publication,ref.canonical_identifier reference_publication,pc.claim_number FROM patent_novelty_analyses a JOIN patent_claims pc ON pc.id=a.claim_id JOIN prior_art_candidates c ON c.id=a.candidate_id JOIN prior_art_projects p ON p.id=a.prior_art_project_id JOIN ip_entities target ON target.id=p.patent_entity_id JOIN ip_entities ref ON ref.id=c.patent_entity_id WHERE a.user_id=${userId} AND a.matter_id=${matterId} ORDER BY a.updated_at DESC`;
  return { projects, candidates, analyses };
}

export async function getNoveltyAnalysis(sql, userId, id) {
  const analysis = await analysisForUser(sql, userId, id),
    mappings =
      await sql`SELECT m.*,e.ordinal,e.element_text,sp.locator_type,sp.locator,left(sp.content,900) evidence_content,s.id source_id,s.title source_title,s.citation,s.official_url,s.authority_tier,s.verified_at FROM prior_art_element_mappings m JOIN patent_claim_elements e ON e.id=m.claim_element_id LEFT JOIN source_passages sp ON sp.id=m.evidence_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE m.candidate_id=${analysis.candidate_id} ORDER BY e.ordinal`,
    passages =
      await sql`SELECT s.id source_id,sp.id passage_id,sp.locator_type,sp.locator,left(sp.content,700) content,s.title source_title,s.citation,s.source_type,s.authority_tier,s.jurisdiction,s.verified_at FROM legal_sources s JOIN source_passages sp ON sp.source_id=s.id WHERE s.user_id=${userId} AND s.matter_id=${analysis.matter_id} ORDER BY s.authority_tier,s.created_at DESC LIMIT 800`,
    events =
      await sql`SELECT * FROM patent_novelty_review_events WHERE analysis_id=${analysis.id} ORDER BY created_at DESC LIMIT 100`;
  const disclosed = mappings.filter(
      (m) =>
        m.review_status === "accepted" &&
        ["explicit", "implicit"].includes(m.disclosure_status) &&
        m.verified_at,
    ).length,
    missing = mappings.filter(
      (m) =>
        m.review_status === "accepted" &&
        ["not_found", "disputed"].includes(m.disclosure_status),
    ).length;
  return {
    analysis,
    mappings,
    passages,
    events,
    gaps: {
      total_elements: mappings.length,
      verified_disclosures: disclosed,
      missing_or_disputed: missing,
      unreviewed: mappings.filter((m) => m.review_status !== "accepted").length,
      unknown_timing: analysis.timing_status !== "pre_critical",
      authority_unverified: !analysis.governing_authority_passage_id,
      reference_source_unverified: !analysis.reference_source_id,
    },
  };
}

export async function createNoveltyAnalysis(sql, userId, body) {
  const [project] =
    await sql`SELECT p.*,pc.claim_number FROM prior_art_projects p JOIN patent_claims pc ON pc.id=p.claim_id WHERE p.id=${body.prior_art_project_id} AND p.user_id=${userId}`;
  if (!project) throw new Error("Claim-scoped prior-art project not found");
  const [candidate] =
    await sql`SELECT c.id,c.patent_entity_id,e.name,e.canonical_identifier FROM prior_art_candidates c JOIN ip_entities e ON e.id=c.patent_entity_id WHERE c.id=${body.candidate_id} AND c.project_id=${project.id}`;
  if (!candidate) throw new Error("Single novelty reference not found");
  const framework = noveltyFramework(
      body.jurisdiction || project.jurisdiction || "",
    ),
    [analysis] =
      await sql`INSERT INTO patent_novelty_analyses(user_id,matter_id,prior_art_project_id,claim_id,candidate_id,title,jurisdiction,legal_test) VALUES(${userId},${project.matter_id},${project.id},${project.claim_id},${candidate.id},${clean(body.title, 300) || `Claim ${project.claim_number} novelty over ${candidate.canonical_identifier || candidate.name}`},${body.jurisdiction || project.jurisdiction || "Unresolved"},${clean(body.legal_test, 4000) || framework.legal_test}) RETURNING id`;
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data) VALUES(${userId},${project.matter_id},${candidate.patent_entity_id},'ASSESSES_NOVELTY_OF',${project.patent_entity_id},${JSON.stringify({ analysis_id: analysis.id, claim_id: project.claim_id, candidate_id: candidate.id })}::jsonb) ON CONFLICT DO NOTHING`;
  return getNoveltyAnalysis(sql, userId, analysis.id);
}

export async function reviewNoveltyMapping(sql, userId, body) {
  const [analysis] =
    await sql`SELECT a.id,a.review_status,a.matter_id FROM patent_novelty_analyses a JOIN prior_art_element_mappings m ON m.candidate_id=a.candidate_id WHERE a.id=${body.analysis_id} AND m.id=${body.mapping_id} AND a.user_id=${userId}`;
  if (!analysis) throw new Error("Novelty mapping not found");
  if (analysis.review_status === "accepted")
    throw new Error(
      "Accepted novelty analysis must be reopened before mappings change",
    );
  const disclosure = [
      "unreviewed",
      "explicit",
      "implicit",
      "not_found",
      "disputed",
    ].includes(body.disclosure_status)
      ? body.disclosure_status
      : null,
    review = ["unreviewed", "accepted", "rejected", "needs_evidence"].includes(
      body.review_status,
    )
      ? body.review_status
      : null;
  if (!disclosure || !review) throw new Error("Invalid novelty mapping review");
  const evidence = body.evidence_passage_id || null;
  if (["explicit", "implicit"].includes(disclosure) && !evidence)
    throw new Error(
      "Disclosure requires pinpoint evidence from this reference",
    );
  if (evidence) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${evidence} AND s.user_id=${userId} AND s.matter_id=${analysis.matter_id}`;
    if (!passage) throw new Error("Matter evidence passage not found");
  }
  await sql`UPDATE prior_art_element_mappings SET disclosure_status=${disclosure},review_status=${review},evidence_passage_id=${evidence},confidence=${body.confidence == null ? null : Math.min(1, Math.max(0, Number(body.confidence)))},note=${clean(body.note, 4000)},reviewed_at=${review === "unreviewed" ? null : new Date()} WHERE id=${body.mapping_id}`;
  return getNoveltyAnalysis(sql, userId, analysis.id);
}

export async function finalizeNoveltyAnalysis(sql, userId, body) {
  const analysis = await analysisForUser(sql, userId, body.analysis_id);
  if (
    !["draft", "in_review", "accepted", "reopened"].includes(
      body.review_status,
    ) ||
    ![
      "unreviewed",
      "anticipated",
      "not_anticipated",
      "insufficient_evidence",
    ].includes(body.conclusion)
  )
    throw new Error("Invalid novelty review state");
  if (body.governing_authority_passage_id) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.governing_authority_passage_id} AND s.user_id=${userId} AND s.matter_id=${analysis.matter_id}`;
    if (!passage) throw new Error("Governing authority passage not found");
  }
  if (body.reference_source_id) {
    const [source] =
      await sql`SELECT id FROM legal_sources WHERE id=${body.reference_source_id} AND user_id=${userId} AND matter_id=${analysis.matter_id}`;
    if (!source) throw new Error("Selected-reference source record not found");
  }
  await sql`UPDATE patent_novelty_analyses SET reference_source_id=${body.reference_source_id || null},governing_authority_passage_id=${body.governing_authority_passage_id || null},direct_and_unambiguous=${body.direct_and_unambiguous === true},enabling_disclosure=${body.enabling_disclosure === true},public_availability_checked=${body.public_availability_checked === true},conclusion=${body.conclusion},conclusion_note=${clean(body.conclusion_note, 8000)},review_status=${body.review_status},updated_at=now() WHERE id=${analysis.id}`;
  if (body.review_status === "accepted") {
    const noveltyStatus =
      body.conclusion === "anticipated"
        ? "potentially_anticipates"
        : body.conclusion === "not_anticipated"
          ? "does_not_anticipate"
          : "insufficient_evidence";
    await sql`UPDATE prior_art_candidates SET novelty_status=${noveltyStatus},review_status='accepted',review_note=${clean(body.conclusion_note, 4000)},reviewed_at=now() WHERE id=${analysis.candidate_id}`;
  } else if (body.review_status === "reopened") {
    await sql`UPDATE prior_art_candidates SET novelty_status='unreviewed',review_status='needs_research',review_note='Novelty analysis reopened',reviewed_at=now() WHERE id=${analysis.candidate_id}`;
  }
  await sql`INSERT INTO patent_novelty_review_events(user_id,analysis_id,action,previous_status,new_status,note) VALUES(${userId},${analysis.id},'analysis_review',${analysis.review_status},${body.review_status},${clean(body.conclusion_note, 1000)})`;
  return getNoveltyAnalysis(sql, userId, analysis.id);
}

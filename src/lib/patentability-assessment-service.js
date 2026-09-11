/**
 * Document #014 orchestration service: Patentability Assessment.
 *
 * Substantive engines are REUSED, never duplicated:
 * - novelty-service: validateNoveltyReference, buildNoveltyEvidenceMatrix,
 *   evaluateNoveltyOpinion, assessNoveltyReadiness, assessResearchCompleteness,
 *   assessPriorityContext, detectAnalysisContradictions, groupPatentFamilies
 * - patent-claim-service: parsePatentClaims, buildEffectiveClaimLimitations
 * - inventive-step-service: frameworkDefinition, listInventiveStepFrameworks (pure)
 * - entailment-service: checkEntailment
 * - contradiction-service: classifyContradiction
 * - citation-service: verifyQuote
 *
 * Fail-closed: any missing evidence, unverified reference/quote/citation,
 * uncertain cutoff, or unverified framework forces RESEARCH_REQUIRED /
 * INCONCLUSIVE — never a manufactured patentability guarantee.
 */
import { checkEntailment } from './entailment-service.js';
import { verifyQuote } from './citation-service.js';
import { classifyContradiction } from './contradiction-service.js';
import { buildEffectiveClaimLimitations, parsePatentClaims } from './patent-claim-service.js';
import { frameworkDefinition, listInventiveStepFrameworks } from './inventive-step-service.js';
import {
  NOVELTY_OUTCOMES,
  NOVELTY_RESEARCH_STATUSES,
  assessNoveltyReadiness,
  assessPriorityContext,
  assessResearchCompleteness,
  buildNoveltyEvidenceMatrix,
  detectAnalysisContradictions,
  evaluateNoveltyOpinion,
  groupPatentFamilies,
  validateNoveltyReference,
} from './novelty-service.js';

export const PATENTABILITY_WORKFLOW_MODES = Object.freeze([
  'PRELIMINARY_PATENTABILITY_ASSESSMENT',
  'FULL_EVIDENCE_BASED_ASSESSMENT',
  'PATENTABILITY_FROM_INVENTION_DISCLOSURE',
  'PATENTABILITY_FROM_CLAIMS',
  'PATENTABILITY_FROM_SPECIFICATION',
  'PATENTABILITY_AGAINST_PROVIDED_PRIOR_ART',
  'PATENTABILITY_REASSESSMENT',
  'PATENTABILITY_AFTER_PRIOR_ART_SEARCH',
  'CLAIM_BY_CLAIM_PATENTABILITY',
  'CONCEPT_LEVEL_PATENTABILITY',
  'JURISDICTION_COMPARISON',
]);

export const PATENTABILITY_ANALYSIS_TARGETS = Object.freeze([
  'DEFINED_CLAIMS',
  'DRAFT_CLAIMS',
  'INVENTIVE_CONCEPT',
  'SPECIFICATION',
  'INVENTION_DISCLOSURE',
  'OTHER',
]);

export const PATENTABILITY_JURISDICTIONS = Object.freeze(['US', 'EP', 'PCT_CONTEXT', 'OTHER', 'UNDECIDED']);

export const PATENTABILITY_RESEARCH_STATUSES = NOVELTY_RESEARCH_STATUSES;

export const PATENTABILITY_OUTCOMES = Object.freeze({
  PRELIMINARY_FAVOURABLE: 'PRELIMINARY_FAVOURABLE',
  PRELIMINARY_MIXED: 'PRELIMINARY_MIXED',
  MATERIAL_PATENTABILITY_CONCERNS: 'MATERIAL_PATENTABILITY_CONCERNS',
  INCONCLUSIVE: 'INCONCLUSIVE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
});

export const PATENTABILITY_ISSUE_STATUSES = Object.freeze({
  FAVOURABLE_WITHIN_SCOPE: 'FAVOURABLE_WITHIN_SCOPE',
  MIXED: 'MIXED',
  MATERIAL_CONCERN: 'MATERIAL_CONCERN',
  INCONCLUSIVE: 'INCONCLUSIVE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
});

export const PATENTABILITY_READINESS_LEVELS = Object.freeze([
  'NOT_READY',
  'PARTIALLY_READY',
  'READY_FOR_PRELIMINARY_ANALYSIS',
  'READY_FOR_EVIDENCE_BASED_ANALYSIS',
]);

export const PATENTABILITY_REVIEW_FLAGS = Object.freeze([
  'SCOPE_CONFIRMATION_REQUIRED',
  'CLAIM_VERSION_CONFIRMATION_REQUIRED',
  'PRIORITY_DATE_REVIEW_REQUIRED',
  'PRIOR_ART_CUTOFF_REVIEW_REQUIRED',
  'REFERENCE_VERIFICATION_FAILED',
  'QUOTE_VERIFICATION_FAILED',
  'CITATION_NOT_ENTAILING',
  'ANALYSIS_CONTRADICTION',
  'COMBINATION_RATIONALE_REVIEW_REQUIRED',
  'HINDSIGHT_RISK',
  'TECHNICAL_EFFECT_UNVERIFIED',
  'ELIGIBILITY_REVIEW_REQUIRED',
  'SUPPORT_GAP',
  'CLARITY_REVIEW_REQUIRED',
  'CONFLICT_REQUIRES_REVIEW',
  'PATENTABILITY_ASSESSMENT_STALE',
  'PATENTABILITY_VS_FTO_CLARIFIED',
  'PCT_CONTEXT_CLARIFIED',
  'RESEARCH_REQUIRED',
  'CONFIDENTIAL_PILOT_BLOCKED',
]);

export const PROPOSITION_TYPES = Object.freeze([
  'TECHNICAL_FACT',
  'PRIOR_ART_FACT',
  'LEGAL_RULE',
  'LEGAL_ANALYSIS',
  'INFERENCE',
  'USER_ASSERTION',
  'CONCLUSION',
  'LIMITATION',
  'UNCERTAINTY',
]);

export function normalizePatentabilityJurisdiction(value = '') {
  const clean = String(value || '').trim();
  if (/^(us|usa|united states|uspto)$/i.test(clean)) return 'US';
  if (/^(ep|epo|epc|europe|european|european patent office)$/i.test(clean)) return 'EP';
  if (/^(pct|pct_context|wipo|international phase)$/i.test(clean)) return 'PCT_CONTEXT';
  if (clean) return 'OTHER';
  return 'UNDECIDED';
}

export function inventiveStepFrameworkForJurisdiction(jurisdiction = '') {
  const key = normalizePatentabilityJurisdiction(jurisdiction);
  if (key === 'EP') return 'epo_problem_solution';
  if (key === 'US') return 'us_graham_ksr';
  return null;
}

export function validatePatentabilityReference(reference = {}) {
  const base = validateNoveltyReference(reference);
  return {
    reference_id: base.reference_id,
    status: base.status,
    issues: base.issues,
    usable_for_conclusion: base.usable_for_conclusion,
  };
}

function classifyReferenceUsability(reference = {}, check = null) {
  const validation = check || validatePatentabilityReference(reference);
  return {
    reference_id: reference.reference_id || null,
    verified_existence: reference.verified_existence || 'UNVERIFIED',
    temporal_status: reference.temporal_status || 'UNKNOWN',
    usable: Boolean(validation.usable_for_conclusion),
    issues: validation.issues,
  };
}

function noveltyConcernFromMatrix(matrix = [], claimNumbers = []) {
  const selected = matrix.filter((row) => !claimNumbers.length || claimNumbers.includes(Number(row.claim_number)));
  const fullDisclosureRows = selected.filter((row) =>
    ['EXPLICITLY_DISCLOSED', 'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED'].includes(row.disclosure_status));
  const researchRows = selected.filter((row) =>
    row.disclosure_status === 'RESEARCH_REQUIRED' || row.verification_status === 'FAILED');
  const partialRows = selected.filter((row) =>
    ['PARTIALLY_DISCLOSED', 'NOT_IDENTIFIED', 'AMBIGUOUS'].includes(row.disclosure_status));
  return { fullDisclosureRows, researchRows, partialRows, evaluated: selected.length };
}

export function assessCombinationRationale({ reference_ids = [], rationale = '', evidence_passage_ids = [], legal_framework_verified = false } = {}) {
  const issues = [];
  if ((reference_ids || []).length < 2) issues.push('COMBINATION_REQUIRES_AT_LEAST_TWO_REFERENCES');
  if (!String(rationale || '').trim()) issues.push('COMBINATION_RATIONALE_REQUIRED');
  if (!(evidence_passage_ids || []).length) issues.push('COMBINATION_EVIDENCE_REQUIRED');
  if (!legal_framework_verified) issues.push('COMBINATION_FRAMEWORK_UNVERIFIED');
  return {
    status: issues.length ? 'RESEARCH_REQUIRED' : 'RECORDED',
    issues,
    hindsight_risk: !String(rationale || '').trim() || !(evidence_passage_ids || []).length ? 'HINDSIGHT_RISK' : 'NO_HINDSIGHT_FLAG_RECORDED',
  };
}

export function assessTechnicalEffect({ feature = '', technical_effect = '', source = null, support_status = 'UNSUPPORTED' } = {}) {
  const allowed = ['SUPPORTED', 'USER_ASSERTED', 'INFERRED_REVIEW_REQUIRED', 'UNSUPPORTED'];
  const status = allowed.includes(support_status) ? support_status : 'UNSUPPORTED';
  return {
    feature: String(feature || '').slice(0, 500),
    technical_effect: String(technical_effect || '').slice(0, 1000),
    source,
    support_status: status,
    usable_as_inventive_step_fact: status === 'SUPPORTED',
    issues: status === 'SUPPORTED' ? [] : ['TECHNICAL_EFFECT_UNVERIFIED'],
  };
}

export function assessEligibilityIssue({ jurisdiction = '', signals = [], authority_verified = false } = {}) {
  if (!signals.length) return { status: 'NO_ISSUE_IDENTIFIED_WITHIN_SCOPE', issues: [] };
  if (!authority_verified) return { status: 'RESEARCH_REQUIRED', issues: ['ELIGIBILITY_FRAMEWORK_UNVERIFIED'] };
  const material = signals.some((signal) => /abstract idea|mental process|mathematical|business method|natural phenomenon|law of nature/i.test(String(signal)));
  return {
    status: material ? 'MATERIAL_ISSUE_REQUIRING_REVIEW' : 'POTENTIAL_ISSUE',
    issues: material ? ['ELIGIBILITY_REVIEW_REQUIRED'] : ['ELIGIBILITY_REVIEW_REQUIRED'],
  };
}

export function assessClaimClarity(claims = []) {
  const issues = [];
  for (const claim of claims || []) {
    const text = String(claim.claim_text || claim.text || '');
    if (/\bthe\b/i.test(text) && !/\b(a|an)\b/i.test(text)) issues.push(`CLAIM_${claim.claim_number || '?'}:ANTECEDENT_BASIS_REVIEW`);
    if (/\b(substantially|relatively|effective|appropriate|suitable)\b/i.test(text)) issues.push(`CLAIM_${claim.claim_number || '?'}:INDEFINITE_TERM_REVIEW`);
  }
  return { status: issues.length ? 'CLARITY_REVIEW_REQUIRED' : 'NO_ISSUE_RECORDED', issues };
}

export function assessSupportGaps({ decomposedClaims = [], specification_present = false } = {}) {
  const issues = [];
  for (const claim of decomposedClaims || []) {
    for (const limitation of claim.full_effective_limitations || []) {
      if (limitation.specification_support === 'UNSUPPORTED' || limitation.specification_support === 'UNKNOWN') {
        issues.push(`${limitation.limitation_id}:SUPPORT_GAP`);
      }
    }
  }
  if (!specification_present && issues.length) issues.push('SPECIFICATION_REVIEW_REQUIRED');
  return { status: issues.length ? 'SUPPORT_GAP' : 'NO_GAP_RECORDED', issues: issues.slice(0, 50) };
}

export function assessPatentabilityReadiness(input = {}) {
  const gaps = [];
  const jurisdiction = normalizePatentabilityJurisdiction(input.jurisdiction);
  const target = input.analysis_target || (input.target_type === 'INVENTIVE_CONCEPT' ? 'INVENTIVE_CONCEPT' : null);

  if (!PATENTABILITY_ANALYSIS_TARGETS.includes(input.analysis_target)) gaps.push('ANALYSIS_TARGET_REQUIRED');
  if (['DEFINED_CLAIMS', 'DRAFT_CLAIMS'].includes(input.analysis_target)) {
    if (!input.claim_set_id) gaps.push('CLAIM_SET_ID_REQUIRED');
    if (!input.claim_set_version) gaps.push('CLAIM_VERSION_CONFIRMATION_REQUIRED');
    if (!(input.claims || []).length && !String(input.claim_text || '').trim()) gaps.push('CLAIM_TEXT_REQUIRED');
  } else if (['INVENTIVE_CONCEPT', 'SPECIFICATION', 'INVENTION_DISCLOSURE', 'OTHER'].includes(input.analysis_target)) {
    if (!String(input.concept_text || input.specification_text || input.disclosure_text || '').trim() && !(input.claims || []).length) {
      gaps.push('CONCEPT_TEXT_REQUIRED');
    }
  } else if (!target) gaps.push('ANALYSIS_TARGET_REQUIRED');
  if (jurisdiction === 'UNDECIDED') gaps.push('JURISDICTION_REQUIRED');
  if (jurisdiction === 'OTHER') gaps.push('JURISDICTION_RESEARCH_REQUIRED');
  if (!input.authority?.verified || !input.authority?.authority_id || !input.authority?.version_or_date) {
    gaps.push('VERIFIED_PATENTABILITY_FRAMEWORK_REQUIRED');
  }
  if (!input.priority_context?.analysis_cutoff) gaps.push('PRIOR_ART_CUTOFF_REVIEW_REQUIRED');
  const priorityAssessment = assessPriorityContext(input.priority_context || {});
  if (priorityAssessment.status === 'PRIORITY_DATE_REVIEW_REQUIRED') gaps.push('PRIORITY_DATE_REVIEW_REQUIRED');

  const researchStatus = input.research?.status || 'UNKNOWN';
  if (!PATENTABILITY_RESEARCH_STATUSES.includes(researchStatus)) gaps.push('RESEARCH_STATUS_INVALID');
  const providedOnlyMode = input.workflow_mode === 'PATENTABILITY_AGAINST_PROVIDED_PRIOR_ART';
  if (['NOT_SEARCHED', 'RESEARCH_INCOMPLETE', 'UNKNOWN'].includes(researchStatus) ||
      (['USER_PROVIDED_ONLY', 'PARTIAL_SEARCH'].includes(researchStatus) && !providedOnlyMode && input.requested_scope !== 'PRELIMINARY')) {
    gaps.push('RESEARCH_REQUIRED');
  }
  const referenceChecks = (input.references || []).map(validatePatentabilityReference);
  if (referenceChecks.some((check) => check.issues.includes('REFERENCE_VERIFICATION_FAILED'))) gaps.push('REFERENCE_VERIFICATION_FAILED');
  if (referenceChecks.some((check) => check.issues.includes('DATE_VERIFICATION_REQUIRED') || check.issues.includes('TEMPORAL_ANALYSIS_UNCERTAIN'))) {
    gaps.push('TEMPORAL_VERIFICATION_REQUIRED');
  }

  const unique = [...new Set(gaps)];
  let readiness = 'READY_FOR_EVIDENCE_BASED_ANALYSIS';
  if (unique.length) readiness = unique.every((gap) => ['JURISDICTION_RESEARCH_REQUIRED'].includes(gap)) ? 'PARTIALLY_READY' : 'NOT_READY';
  else if (input.workflow_mode === 'PRELIMINARY_PATENTABILITY_ASSESSMENT' || input.requested_scope === 'PRELIMINARY' || input.analysis_target === 'INVENTIVE_CONCEPT') {
    readiness = 'READY_FOR_PRELIMINARY_ANALYSIS';
  }
  return {
    readiness,
    gaps: unique,
    jurisdiction,
    reference_checks: referenceChecks,
    priority_assessment: priorityAssessment,
    research_completeness: assessResearchCompleteness(input.research || {}),
  };
}

export function evaluateUsObviousnessStructure({ claims = [], references = [], combinations = [], framework_verified = false } = {}) {
  if (!framework_verified) return { status: 'RESEARCH_REQUIRED', issues: ['US_OBVIOUSNESS_FRAMEWORK_UNVERIFIED'], combinations: [] };
  const assessed = (combinations || []).map((combination) => ({
    ...combination,
    assessment: assessCombinationRationale(combination),
  }));
  const missing = assessed.filter((item) => item.assessment.status === 'RESEARCH_REQUIRED');
  return {
    status: missing.length ? 'RESEARCH_REQUIRED' : assessed.length ? 'RECORDED' : 'INCONCLUSIVE',
    issues: missing.length ? ['COMBINATION_RATIONALE_REVIEW_REQUIRED', 'HINDSIGHT_RISK'] : [],
    combinations: assessed,
    framework: 'us_graham_ksr',
  };
}

export function evaluateEpInventiveStepStructure({ claims = [], references = [], closest_prior_art = null, distinguishing_features = [], technical_effects = [], framework_verified = false } = {}) {
  if (!framework_verified) return { status: 'RESEARCH_REQUIRED', issues: ['EP_INVENTIVE_STEP_FRAMEWORK_UNVERIFIED'] };
  const issues = [];
  if (!closest_prior_art) issues.push('CLOSEST_PRIOR_ART_REVIEW_REQUIRED');
  if (!distinguishing_features.length) issues.push('DISTINGUISHING_FEATURES_REVIEW_REQUIRED');
  const unverifiedEffects = (technical_effects || []).filter((effect) => assessTechnicalEffect(effect).support_status !== 'SUPPORTED');
  if (unverifiedEffects.length) issues.push('TECHNICAL_EFFECT_UNVERIFIED');
  return {
    status: issues.length ? 'RESEARCH_REQUIRED' : 'RECORDED',
    issues,
    framework: 'epo_problem_solution',
    closest_prior_art,
    distinguishing_feature_count: distinguishing_features.length,
  };
}

export function evaluatePatentabilityAssessment(input = {}) {
  const parsedClaims = input.claims?.length ? input.claims : parsePatentClaims(input.claim_text || '');
  const prepared = { ...input, claims: parsedClaims };
  const readiness = assessPatentabilityReadiness(prepared);
  if (readiness.readiness === 'NOT_READY') {
    return {
      outcome: PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED,
      readiness,
      scope: prepared.assessment_scope || null,
      claims: [],
      matrix: [],
      claim_results: [],
      flags: readiness.gaps,
      conclusion_language: 'No patentability conclusion is available because material evidence, context, or verification remains outstanding.',
    };
  }

  const noveltyInput = {
    ...prepared,
    target_type: ['DEFINED_CLAIMS', 'DRAFT_CLAIMS'].includes(prepared.analysis_target) ? 'CLAIM_SET' : 'INVENTIVE_CONCEPT',
    claim_set_id: prepared.claim_set_id || 'PATENTABILITY_ASSESSMENT_TARGET',
    claim_set_version: prepared.claim_set_version || 'UNVERSIONED',
    authority: { verified: Boolean(prepared.authority?.verified), authority_id: prepared.authority?.authority_id, version_or_date: prepared.authority?.version_or_date },
    research: prepared.research,
    references: prepared.references,
    workflow_mode: prepared.workflow_mode === 'PATENTABILITY_AGAINST_PROVIDED_PRIOR_ART' ? 'NOVELTY_AGAINST_PROVIDED_REFERENCES' : undefined,
    requested_scope: prepared.workflow_mode === 'PRELIMINARY_PATENTABILITY_ASSESSMENT' || prepared.requested_scope === 'PRELIMINARY' ? 'PRELIMINARY' : undefined,
    mappings: prepared.mappings,
    narrative_assertions: prepared.narrative_assertions,
  };
  const novelty = evaluateNoveltyOpinion(noveltyInput);
  const matrix = novelty.matrix || [];
  const decomposedClaims = novelty.claims?.length ? novelty.claims : buildEffectiveClaimLimitations(parsedClaims, prepared.claim_set_version).map((claim) => ({
    ...claim,
    claim_type: (claim.depends_on || []).length ? 'dependent' : 'independent',
  }));

  const jurisdiction = readiness.jurisdiction;
  const frameworkKey = inventiveStepFrameworkForJurisdiction(jurisdiction);
  let framework = null;
  try { framework = frameworkKey ? frameworkDefinition(frameworkKey) : null; } catch { framework = null; }
  const frameworkVerified = Boolean(prepared.inventive_step_framework_verified ?? prepared.authority?.verified) && Boolean(framework);

  const usObviousness = jurisdiction === 'US'
    ? evaluateUsObviousnessStructure({ claims: decomposedClaims, references: prepared.references, combinations: prepared.combinations, framework_verified: frameworkVerified })
    : { status: 'NOT_APPLICABLE', issues: [], combinations: [], framework: null };
  const epInventiveStep = jurisdiction === 'EP'
    ? evaluateEpInventiveStepStructure({
        claims: decomposedClaims,
        references: prepared.references,
        closest_prior_art: prepared.closest_prior_art || null,
        distinguishing_features: prepared.distinguishing_features || [],
        technical_effects: prepared.technical_effects || [],
        framework_verified: frameworkVerified,
      })
    : { status: 'NOT_APPLICABLE', issues: [], framework: null };

  const technicalEffectAssessments = (prepared.technical_effects || []).map(assessTechnicalEffect);
  const eligibility = assessEligibilityIssue({
    jurisdiction,
    signals: prepared.eligibility_signals || [],
    authority_verified: Boolean(prepared.eligibility_framework_verified ?? false),
  });
  const clarity = assessClaimClarity(decomposedClaims.map((claim) => ({ claim_number: claim.claim_number, claim_text: claim.claim_text })));
  const support = assessSupportGaps({ decomposedClaims, specification_present: Boolean(prepared.specification_present ?? prepared.specification_text) });

  const quoteChecks = [];
  for (const mapping of prepared.mappings || []) {
    if (!mapping.quote || !mapping.passage_id) continue;
    const passage = (prepared.passages || []).find((item) => item.passage_id === mapping.passage_id);
    if (!passage?.content) {
      quoteChecks.push({ mapping_id: mapping.mapping_id || null, status: 'RESEARCH_REQUIRED', issue: 'QUOTE_VERIFICATION_FAILED' });
      continue;
    }
    const verdict = verifyQuote(passage.content, mapping.quote);
    quoteChecks.push({
      mapping_id: mapping.mapping_id || null,
      status: verdict === 'exact' ? 'VERIFIED' : 'RESEARCH_REQUIRED',
      issue: verdict === 'exact' ? null : 'QUOTE_VERIFICATION_FAILED',
      verdict,
    });
  }
  const entailmentChecks = [];
  for (const proposition of prepared.propositions || []) {
    if (!proposition.passage_id) {
      entailmentChecks.push({ proposition_id: proposition.proposition_id || null, status: 'RESEARCH_REQUIRED', verdict: 'DOES_NOT_SUPPORT', issue: 'SOURCE_PASSAGE_REQUIRED' });
      continue;
    }
    const passage = (prepared.passages || []).find((item) => item.passage_id === proposition.passage_id);
    if (!passage?.content) {
      entailmentChecks.push({ proposition_id: proposition.proposition_id || null, status: 'RESEARCH_REQUIRED', verdict: 'DOES_NOT_SUPPORT', issue: 'SOURCE_PASSAGE_UNVERIFIED' });
      continue;
    }
    const result = checkEntailment(proposition.text, passage.content);
    entailmentChecks.push({
      proposition_id: proposition.proposition_id || null,
      status: result.verdict === 'ENTAILS' ? 'VERIFIED' : 'RESEARCH_REQUIRED',
      verdict: result.verdict,
      issue: result.verdict === 'ENTAILS' ? null : 'CITATION_NOT_ENTAILING',
    });
  }
  const contradiction = classifyContradiction({
    proposition: prepared.contradiction_proposition || '',
    passages: prepared.contradiction_passages || [],
  });

  const materialNovelty = (novelty.claim_results || []).some((item) => item.claim_status === NOVELTY_OUTCOMES.MATERIAL_NOVELTY_CONCERN);
  const noveltyResearch = (novelty.claim_results || []).some((item) => item.claim_status === NOVELTY_OUTCOMES.RESEARCH_REQUIRED);
  const assessmentBlockers = [
    ...quoteChecks.filter((item) => item.status === 'RESEARCH_REQUIRED').map(() => 'QUOTE_VERIFICATION_FAILED'),
    ...entailmentChecks.filter((item) => item.status === 'RESEARCH_REQUIRED').map(() => 'CITATION_NOT_ENTAILING'),
    ...(contradiction.class === 'MATERIAL_CONFLICT' ? ['ANALYSIS_CONTRADICTION'] : []),
    ...(contradiction.class === 'POTENTIAL_CONFLICT' ? ['CONFLICT_REQUIRES_REVIEW'] : []),
    ...((usObviousness.issues || []).filter((issue) => issue === 'COMBINATION_RATIONALE_REVIEW_REQUIRED')),
    ...((epInventiveStep.issues || []).filter((issue) => issue !== 'CLOSEST_PRIOR_ART_REVIEW_REQUIRED' || true)),
    ...(technicalEffectAssessments.some((item) => item.support_status !== 'SUPPORTED') && (prepared.technical_effects || []).length ? ['TECHNICAL_EFFECT_UNVERIFIED'] : []),
    ...(eligibility.status === 'MATERIAL_ISSUE_REQUIRING_REVIEW' ? ['ELIGIBILITY_REVIEW_REQUIRED'] : []),
    ...(support.status === 'SUPPORT_GAP' ? ['SUPPORT_GAP'] : []),
    ...(clarity.status === 'CLARITY_REVIEW_REQUIRED' ? ['CLARITY_REVIEW_REQUIRED'] : []),
  ];

  const isPreliminary = readiness.readiness === 'READY_FOR_PRELIMINARY_ANALYSIS' ||
    prepared.workflow_mode === 'PRELIMINARY_PATENTABILITY_ASSESSMENT' ||
    prepared.requested_scope === 'PRELIMINARY' ||
    prepared.analysis_target === 'INVENTIVE_CONCEPT';

  let outcome;
  const flags = [...new Set([...(novelty.flags || []), ...assessmentBlockers])];
  if (noveltyResearch || quoteChecks.some((item) => item.status === 'RESEARCH_REQUIRED') || entailmentChecks.some((item) => item.status === 'RESEARCH_REQUIRED')) {
    outcome = PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED;
  } else if (contradiction.class === 'MATERIAL_CONFLICT' || novelty.outcome === NOVELTY_OUTCOMES.INCONCLUSIVE) {
    outcome = PATENTABILITY_OUTCOMES.INCONCLUSIVE;
  } else if (materialNovelty || eligibility.status === 'MATERIAL_ISSUE_REQUIRING_REVIEW' || support.status === 'SUPPORT_GAP') {
    outcome = isPreliminary ? PATENTABILITY_OUTCOMES.PRELIMINARY_MIXED : PATENTABILITY_OUTCOMES.MATERIAL_PATENTABILITY_CONCERNS;
  } else if (flags.length || usObviousness.status === 'RESEARCH_REQUIRED' || epInventiveStep.status === 'RESEARCH_REQUIRED') {
    outcome = isPreliminary ? PATENTABILITY_OUTCOMES.PRELIMINARY_MIXED : PATENTABILITY_OUTCOMES.INCONCLUSIVE;
  } else {
    outcome = isPreliminary ? PATENTABILITY_OUTCOMES.PRELIMINARY_FAVOURABLE : PATENTABILITY_OUTCOMES.PRELIMINARY_FAVOURABLE;
  }
  if (isPreliminary && outcome === PATENTABILITY_OUTCOMES.MATERIAL_PATENTABILITY_CONCERNS) outcome = PATENTABILITY_OUTCOMES.PRELIMINARY_MIXED;

  const evidenceStrength = outcome === PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED || outcome === PATENTABILITY_OUTCOMES.INCONCLUSIVE
    ? 'RESEARCH_REQUIRED'
    : flags.length ? 'EVIDENCE_MIXED'
      : (prepared.references || []).length >= 3 ? 'EVIDENCE_STRONG' : 'EVIDENCE_LIMITED';

  return {
    outcome,
    readiness,
    scope: prepared.assessment_scope || null,
    analysis_target_label: ['DEFINED_CLAIMS', 'DRAFT_CLAIMS'].includes(prepared.analysis_target) ? 'CLAIM_BY_CLAIM_PATENTABILITY' : 'CONCEPT_LEVEL_ASSESSMENT',
    jurisdiction,
    pct_context: jurisdiction === 'PCT_CONTEXT',
    claims: decomposedClaims,
    matrix,
    claim_results: novelty.claim_results || [],
    novelty,
    novelty_concern: noveltyConcernFromMatrix(matrix, (prepared.claim_numbers || []).map(Number)),
    us_obviousness: usObviousness,
    ep_inventive_step: epInventiveStep,
    inventive_step_frameworks: listInventiveStepFrameworks().map((item) => item.key),
    technical_effects: technicalEffectAssessments,
    eligibility,
    clarity,
    support,
    quote_checks: quoteChecks,
    entailment_checks: entailmentChecks,
    contradiction,
    patent_families: groupPatentFamilies(prepared.references || []),
    research_completeness: assessResearchCompleteness(prepared.research || {}),
    evidence_strength: evidenceStrength,
    flags,
    conclusion_language: outcome === PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED
      ? 'No patentability conclusion is available. Complete the identified research and verification gaps before relying on this assessment.'
      : outcome === PATENTABILITY_OUTCOMES.INCONCLUSIVE
        ? 'The evidence does not support a reasoned patentability conclusion. Material contradictions or verification failures require review.'
        : outcome === PATENTABILITY_OUTCOMES.MATERIAL_PATENTABILITY_CONCERNS
          ? 'The verified evidence reviewed within the defined scope raises material patentability concerns identified claim-by-claim below.'
          : outcome === PATENTABILITY_OUTCOMES.PRELIMINARY_MIXED
            ? 'This preliminary assessment identifies both favourable indicators and material concerns within the limited evidence reviewed. It is not a full researched opinion.'
            : 'Within the verified references and legal framework reviewed, no dispositive patentability bar was identified. This preliminary finding is limited to the recorded search scope and requires qualified review.',
  };
}

export function buildPatentabilityEvidenceGraph(assessment = {}) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const addNode = (id, type, data = {}) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, type, ...data });
  };
  addNode('patentability-conclusion', 'PATENTABILITY_CONCLUSION', { outcome: assessment.outcome });
  for (const row of assessment.matrix || []) {
    const claimId = `claim:${row.claim_number}`;
    const limitationId = `limitation:${row.limitation_id}`;
    const referenceId = `reference:${row.reference_id}`;
    const passageId = row.passage_id ? `passage:${row.passage_id}` : null;
    addNode(claimId, 'CLAIM', { claim_number: row.claim_number });
    addNode(limitationId, 'LIMITATION', { text: row.limitation_text });
    addNode(referenceId, 'REFERENCE');
    addNode(passageId, 'PASSAGE', { location: row.source_location });
    edges.push({ from: claimId, to: limitationId, type: 'HAS_LIMITATION' });
    edges.push({ from: limitationId, to: referenceId, type: 'ASSESSED_AGAINST', disclosure_status: row.disclosure_status });
    if (passageId) edges.push({ from: referenceId, to: passageId, type: 'SUPPORTED_BY', verification_status: row.verification_status });
    edges.push({ from: limitationId, to: 'patentability-conclusion', type: 'INFORMS_CONCLUSION' });
  }
  return { nodes, edges };
}

export function detectPatentabilityStaleness(saved = {}, current = {}) {
  const reasons = [];
  if (saved.claim_version !== current.claim_version || saved.claim_text !== current.claim_text) reasons.push('CLAIM_CHANGED');
  if (saved.specification_version !== current.specification_version) reasons.push('SPECIFICATION_CHANGED');
  if (saved.priority_context_version !== current.priority_context_version) reasons.push('PRIORITY_CONTEXT_CHANGED');
  if (saved.research_version !== current.research_version) reasons.push('NEW_OR_CHANGED_PRIOR_ART');
  if (saved.authority_version !== current.authority_version) reasons.push('LEGAL_FRAMEWORK_CHANGED');
  if (saved.reference_metadata_version !== current.reference_metadata_version) reasons.push('REFERENCE_METADATA_CHANGED');
  return { stale: reasons.length > 0, flag: reasons.length ? 'PATENTABILITY_ASSESSMENT_STALE' : null, reasons };
}

export function createPatentabilityVersion(snapshot = {}, history = [], reason = 'Patentability assessment updated') {
  const version = `v${history.length + 1}`;
  const record = { version, snapshot: JSON.parse(JSON.stringify(snapshot)), reason, timestamp: new Date().toISOString() };
  return { assessment_version: version, history: [...history, record], record };
}

export function buildPatentabilityHandoff(assessment = {}, target) {
  const allowed = ['patent-claims-set', 'patent-specification', 'patent-prior-art-search-report', 'patent-novelty-opinion', 'inventive-step-analysis'];
  if (!allowed.includes(target)) throw new Error('Unsupported Patentability Assessment handoff');
  return {
    source_workflow: 'patentability-assessment',
    target_workflow: target,
    claims: assessment.claims || [],
    limitation_matrix: assessment.matrix || [],
    references: (assessment.novelty?.readiness?.reference_checks || []).map((item) => item.reference_id),
    jurisdiction: assessment.jurisdiction || null,
    research_gaps: assessment.readiness?.gaps || [],
    outcome: assessment.outcome,
    automatic_claim_amendment: false,
    new_matter_review_required: target === 'patent-specification',
  };
}

export function assemblePatentabilityAssessment(input = {}, evaluated = evaluatePatentabilityAssessment(input)) {
  const lines = [
    '# Patentability Assessment', '',
    '## 1. Assessment Scope',
    input.assessment_scope?.statement || `${evaluated.analysis_target_label || 'ASSESSMENT_NOT_READY'} — jurisdiction ${evaluated.jurisdiction || 'UNDECIDED'}; workflow ${input.workflow_mode || 'FULL_EVIDENCE_BASED_ASSESSMENT'}. This assessment is not a guarantee of patentability, grant, validity, freedom-to-operate, or infringement clearance.`, '',
    '## 2. Executive Assessment', evaluated.conclusion_language, '',
    '## 3. Invention / Claim Set Analysed',
    `${evaluated.analysis_target_label || 'ANALYSIS_NOT_READY'}${input.claim_set_version ? ` — claim version ${input.claim_set_version}` : ''}.`, '',
    '## 4. Jurisdiction and Legal Framework',
    evaluated.jurisdiction === 'PCT_CONTEXT'
      ? 'PCT international-phase context only. The PCT does not grant patents; national patentability remains jurisdiction-specific and requires review.'
      : `Jurisdiction: ${evaluated.jurisdiction}. Framework verified: ${input.authority?.verified ? `${input.authority.authority_id} (${input.authority.version_or_date})` : 'VERIFIED_PATENTABILITY_FRAMEWORK_REQUIRED'}.`, '',
    '## 5. Source Materials',
    `Claims/specification/disclosure version recorded: ${input.claim_set_version || input.specification_version || 'UNVERSIONED'}. Priority cutoff: ${input.priority_context?.analysis_cutoff || 'PRIOR_ART_CUTOFF_REVIEW_REQUIRED'}.`, '',
    '## 6. Research Scope and Limitations',
    `${input.research?.status || 'UNKNOWN'} — ${input.research?.scope || 'Scope not recorded.'} Zero results do not establish absence of prior art.`, '',
    '## 7. Prior Art Identified',
  ];
  if ((input.references || []).length) {
    for (const reference of input.references) lines.push(`- ${reference.reference_id}: ${reference.title} (${reference.publication_identifier || reference.url || 'identifier unverified'})`);
  } else lines.push('- No relevant reference identified within the recorded search scope.');
  lines.push('', '## 8. Claim / Feature Matrix', '', '| Claim | Limitation | Reference | Novelty | Verification |', '|---|---|---|---|---|');
  for (const row of evaluated.matrix || []) lines.push(`| ${row.claim_number} | ${row.limitation_id} | ${row.reference_id} | ${row.disclosure_status} | ${row.verification_status} |`);
  lines.push('', '## 9. Novelty Analysis', `Outcome: ${evaluated.novelty?.outcome || 'RESEARCH_REQUIRED'}. Single-reference discipline preserved; partial disclosure is not collapsed into anticipation.`, '');
  lines.push('## 10. Inventive Step / Obviousness Analysis');
  if (evaluated.jurisdiction === 'US') lines.push(`US Graham/KSR structure: ${evaluated.us_obviousness?.status || 'RESEARCH_REQUIRED'}. Combinations require recorded rationale, evidence, and verified framework; hindsight flagged where absent.`);
  else if (evaluated.jurisdiction === 'EP') lines.push(`EPO problem-solution structure: ${evaluated.ep_inventive_step?.status || 'RESEARCH_REQUIRED'}. Closest prior art, distinguishing features, supported technical effects, and could-would analysis must be evidence-backed.`);
  else lines.push(`Inventive-step analysis: jurisdiction ${evaluated.jurisdiction}. PCT context does not substitute for national inventive-step law.`);
  lines.push('', '## 11. Subject-Matter / Eligibility Issues', evaluated.eligibility?.status || 'NO_ISSUE_IDENTIFIED_WITHIN_SCOPE', '');
  lines.push('## 12. Disclosure / Support Issues', evaluated.support?.status || 'NO_GAP_RECORDED', '');
  lines.push('## 13. Claim Clarity Issues', evaluated.clarity?.status || 'NO_ISSUE_RECORDED', '');
  lines.push('## 14. Other Patentability Considerations', 'Patentability is distinct from freedom-to-operate, infringement, validity, and commercial freedom to use.', '');
  lines.push('## 15. Key Strengths', 'Strengths below are evidence-linked and scope-limited; no absolute novelty is claimed from limited searching.', '');
  lines.push('## 16. Key Risks');
  for (const flag of evaluated.flags || []) lines.push(`- ${flag}`);
  if (!(evaluated.flags || []).length) lines.push('- No material risk recorded within the verified scope.');
  lines.push('', '## 17. Evidence Gaps', (evaluated.readiness?.gaps || []).join(', ') || 'No unresolved gap recorded.', '');
  lines.push('## 18. Recommended Further Research / Actions', evaluated.outcome === 'RESEARCH_REQUIRED' ? 'Complete the identified research and verification gaps before relying on this assessment.' : 'Review material mappings, combination rationale, technical effects, support gaps, and use a structured handoff where amendment or further search is requested. Do not manufacture new post-filing disclosure.', '');
  lines.push('## 19. Assessment Status', `${evaluated.outcome} — evidence strength ${evaluated.evidence_strength}.`, '');
  lines.push('## 20. Authorities / Sources', input.authority?.authority_id || 'No verified authority recorded.', '');
  lines.push('## 21. Verification / Limitations Statement',
    `Outcome is evidence-bound. Reference existence, dates, passages, quotes, entailment, single-reference coverage, combination rationale, hindsight, technical effects, contradictions, and research limitations were evaluated using the shared SallyIP verification architecture. Patentability is not FTO. Review required: ${input.review_status === 'PRACTITIONER_REVIEWED' ? 'completed as recorded' : 'yes'}.`, '');
  return lines.join('\n');
}

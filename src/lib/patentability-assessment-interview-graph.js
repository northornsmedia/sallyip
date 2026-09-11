/**
 * Document #014 orchestration layer: Patentability Assessment.
 * Substantive aggregation remains in patentability-assessment-service;
 * this module only manages matter-first intake, one-question turn taking,
 * readiness, staleness-aware reassessment, and downstream handoffs.
 */
import { assessPatentabilityReadiness, evaluatePatentabilityAssessment } from './patentability-assessment-service.js';

export const PATENTABILITY_ASSESSMENT_WORKFLOW_MODES = Object.freeze([
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

export const PATENTABILITY_ASSESSMENT_REVIEW_FLAGS = Object.freeze([
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

const QUESTIONS = [
  {
    id: 'jurisdiction', field: 'jurisdiction',
    question: 'Yes. I can help assess the invention against the available technical evidence, prior art and the applicable patentability framework. I’ll first use anything already stored in this matter and only ask for information that is missing. First, which jurisdiction or filing context would you like the assessment to focus on — US, EP, PCT context, or another specified jurisdiction?',
  },
  {
    id: 'analysis_target', field: 'analysis_target',
    question: 'Should I assess defined claims (and which claim-set version), or perform a clearly labelled concept-level preliminary assessment from the invention disclosure or specification?',
  },
  {
    id: 'claim_set_version', field: 'claim_set_version',
    question: 'Which exact claim-set version should govern this patentability assessment?',
  },
  {
    id: 'priority_context', field: 'priority_context',
    question: 'What priority or filing-date context and analysis cutoff should govern the prior-art comparison?',
  },
  {
    id: 'research_status', field: 'research',
    question: 'What prior-art research has been completed — no search, provided references only, partial search, or a completed structured search — and what search scope should I use?',
  },
  {
    id: 'authority', field: 'authority',
    question: 'Do you have a verified, current patentability authority for the selected jurisdiction, or should this remain RESEARCH_REQUIRED pending authority verification?',
  },
];

export function isPatentabilityRequest(text = '') {
  return /\b(?:is|would|could)\s+(?:this|the|my|our)\s+invention\s+patentable\b|\bpatentability\s+(?:assessment|opinion|analysis|report)\b|\bassess(?:\s+whether)?\s+(?:this\s+|the\s+|my\s+)?invention\s+is\s+patentable\b|\bevaluate\s+whether\s+this\s+can\s+be\s+patented\b|\breview\s+the\s+patentability\s+of\s+this\s+invention\b|\bassess\s+novelty\s+and\s+(?:inventive\s+step|obviousness)\b|\bdoes\s+this\s+invention\s+appear\s+patentable\b|\banaly[sz]e\s+patentability\s+against\s+this\s+prior\s+art\b|\bprepare\s+a\s+preliminary\s+patentability\s+report\b/i.test(String(text || ''));
}

export function isNoveltyOnlyRequest(text = '') {
  return /\bprepare\s+(?:a\s+)?(?:patent\s+)?novelty\s+(?:opinion|assessment)\b|\bnovelty\s+only\b|\bcheck\s+claim\s+\d+\s+for\s+novelty\b/i.test(String(text || ''));
}

export function isFtoRequest(text = '') {
  const clean = String(text || '');
  return /\b(?:prepare\s+(?:an\s+)?fto|freedom[- ]to[- ]operate|can\s+we\s+(?:launch|sell)\s+this\s+product|are\s+there\s+patents\s+blocking|check\s+third[- ]party\s+patent\s+risk|clear\s+this\s+product\s+for\s+launch|do\s+these\s+patents\s+cover\s+our\s+product|assess\s+infringement\s+risk\s+before\s+launch)\b/i.test(clean)
    || /patentable.{0,60}\bsell\b|\bsell\b.{0,60}patentable/i.test(clean)
    || /\bcan\s+we\s+sell\s+it\b/i.test(clean);
}

export function isInfringementRequest(text = '') {
  return /\bdoes\s+this\s+product\s+infringe\b|\bpatent\s+infringement\s+analysis\b|\binfringement\s+claim\s+chart\b/i.test(String(text || ''));
}

export function isPatentDraftingRequest(text = '') {
  return /\bdraft\s+(?:a\s+)?(?:patent\s+application|provisional|nonprovisional|utility\s+patent|plant\s+patent|pct\s+application)\b/i.test(String(text || ''));
}

export function extractPatentabilityMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {};
  const artifacts = matterContext.artifacts || matter.documents || [];
  const claimSets = matterContext.claim_sets || matter.claim_sets || [];
  const directClaims = matterContext.claims || matter.claims || [];
  const references = matterContext.references || matter.prior_art_references || [];
  const facts = {};
  const status = {};

  const versions = claimSets.map((item) => item.version).filter(Boolean);
  const selectedClaimSet = claimSets.find((item) => item.current === true) || (claimSets.length === 1 ? claimSets[0] : null);
  const claims = selectedClaimSet?.claims || directClaims;
  if (claims.length) {
    facts.claims = claims;
    facts.claim_set_id = selectedClaimSet?.id || matter.claim_set_id || null;
    facts.analysis_target = claims.length > 1 ? 'DEFINED_CLAIMS' : 'DEFINED_CLAIMS';
    status.claims = 'KNOWN';
  }
  if (selectedClaimSet?.version || (versions.length === 1 && versions[0])) {
    facts.claim_set_version = selectedClaimSet?.version || versions[0];
    status.claim_set_version = 'KNOWN';
  } else if (versions.length > 1) {
    status.claim_set_version = 'UNKNOWN';
    facts.available_claim_versions = versions;
    facts.available_claim_sets = claimSets.map((item) => ({ id: item.id, version: item.version, claims: item.claims || [] }));
  }
  if (!claims.length && (matter.core_inventive_concept || matter.inventive_concept || matter.invention_summary)) {
    facts.analysis_target = 'INVENTIVE_CONCEPT';
    facts.concept_text = matter.core_inventive_concept || matter.inventive_concept || matter.invention_summary;
    facts.workflow_mode = 'CONCEPT_LEVEL_PATENTABILITY';
    status.concept_text = 'KNOWN';
  }
  if (matter.jurisdiction || matter.patent_jurisdiction) {
    facts.jurisdiction = matter.jurisdiction || matter.patent_jurisdiction;
    status.jurisdiction = 'KNOWN';
  }
  if (matter.priority_context || matter.analysis_cutoff || matter.priority_date) {
    facts.priority_context = matter.priority_context || {
      status: matter.priority_status || 'VERIFIED',
      analysis_cutoff: matter.analysis_cutoff || matter.priority_date,
      priorities: matter.priority_records || [],
    };
    status.priority_context = 'KNOWN';
  }
  if (references.length) {
    facts.references = references;
    status.references = 'KNOWN';
  }
  if (matter.research || matter.prior_art_research) {
    facts.research = matter.research || matter.prior_art_research;
    status.research = 'KNOWN';
  }
  if (matter.patentability_authority || matter.novelty_authority) {
    facts.authority = matter.patentability_authority || matter.novelty_authority;
    status.authority = facts.authority?.verified ? 'KNOWN' : 'INFERRED';
  }
  facts.inspected_artifact_types = artifacts.map((item) => item.document_type || item.type || item.slug).filter(Boolean);
  return { facts, status };
}

function applyAnswer(facts, questionId, answer) {
  const value = String(answer || '').trim();
  if (!value) return;
  if (questionId === 'jurisdiction') {
    if (/pct/i.test(value)) facts.jurisdiction = 'PCT_CONTEXT';
    else if (/\bep\b|epo|european/i.test(value)) facts.jurisdiction = 'EP';
    else if (/\bus\b|united states|uspto/i.test(value)) facts.jurisdiction = 'US';
    else if (/undecided|not sure|don.?t know/i.test(value)) facts.jurisdiction = 'UNDECIDED';
    else facts.jurisdiction = 'OTHER';
  } else if (questionId === 'analysis_target') {
    if (/concept|disclosure|no claims|preliminary/i.test(value)) {
      facts.analysis_target = 'INVENTIVE_CONCEPT';
      facts.workflow_mode = 'CONCEPT_LEVEL_PATENTABILITY';
      facts.concept_text = value;
    } else {
      facts.analysis_target = /draft/i.test(value) ? 'DRAFT_CLAIMS' : 'DEFINED_CLAIMS';
      facts.workflow_mode = 'CLAIM_BY_CLAIM_PATENTABILITY';
    }
  } else if (questionId === 'claim_set_version') {
    facts.claim_set_version = value;
    const selected = (facts.available_claim_sets || []).find((item) => String(item.version).toLowerCase() === value.toLowerCase());
    if (selected) {
      facts.claim_set_id = selected.id;
      facts.claims = selected.claims;
      delete facts.available_claim_sets;
    }
  } else if (questionId === 'priority_context') {
    const date = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    facts.priority_context = { status: date ? 'VERIFIED' : 'REVIEW_REQUIRED', analysis_cutoff: date || null, user_statement: value };
  } else if (questionId === 'research_status') {
    const status = /no search|not searched/i.test(value) ? 'NOT_SEARCHED' :
      /provided reference|these references|only these/i.test(value) ? 'USER_PROVIDED_ONLY' :
        /structured|completed|full search/i.test(value) ? 'STRUCTURED_SEARCH_COMPLETED' : 'PARTIAL_SEARCH';
    facts.research = { status, scope: value, provenance: 'USER_PROVIDED' };
  } else if (questionId === 'authority') {
    facts.authority = /verified/i.test(value)
      ? { verified: true, authority_id: value, version_or_date: new Date().toISOString().slice(0, 10) }
      : { verified: false };
  }
}

function nextQuestion(facts) {
  if (!facts.jurisdiction) return QUESTIONS[0];
  if (!facts.analysis_target) return QUESTIONS[1];
  if (['DEFINED_CLAIMS', 'DRAFT_CLAIMS'].includes(facts.analysis_target) && !facts.claim_set_version) return QUESTIONS[2];
  if (!facts.priority_context?.analysis_cutoff) return QUESTIONS[3];
  if (!facts.research?.status) return QUESTIONS[4];
  if (!facts.authority?.verified) return QUESTIONS[5];
  return null;
}

export function evaluatePatentabilityInterviewStep({ session = {}, latestMessage = '', matterContext = {} } = {}) {
  const nextSession = {
    ...session,
    facts: { ...(session.facts || {}) },
    flags: [...(session.flags || [])],
    answers: [...(session.answers || [])],
  };
  if (!nextSession.initialized) {
    const extracted = extractPatentabilityMatterContext(matterContext);
    nextSession.facts = { ...extracted.facts, ...nextSession.facts };
    nextSession.context_status = extracted.status;
    nextSession.initialized = true;
  }
  if (isFtoRequest(latestMessage)) {
    if (!nextSession.flags.includes('PATENTABILITY_VS_FTO_CLARIFIED')) nextSession.flags.push('PATENTABILITY_VS_FTO_CLARIFIED');
    return {
      action: 'CLARIFICATION_REQUIRED',
      message: 'Patentability and freedom-to-operate are distinct. Patentability asks whether your invention may be patentable over the prior art; freedom-to-operate asks whether commercialising a product risks third-party patent rights. Would you like a Patentability Assessment, or should I route you to the Freedom-to-Operate workflow?',
      suggestions: ['Continue Patentability Assessment', 'Prepare an FTO'],
      flags: nextSession.flags,
      session: nextSession,
      facts: nextSession.facts,
    };
  }
  if (isNoveltyOnlyRequest(latestMessage)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      message: 'A novelty-only opinion analyses single-reference anticipation, while a Patentability Assessment additionally covers inventive-step/obviousness, eligibility, support, and clarity. Would you like novelty-only analysis, or the full patentability workflow?',
      suggestions: ['Continue Patentability Assessment', 'Prepare a Patent Novelty Opinion'],
      flags: nextSession.flags,
      session: nextSession,
      facts: nextSession.facts,
    };
  }
  if (isInfringementRequest(latestMessage) || isPatentDraftingRequest(latestMessage)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      message: 'That request belongs to a different workflow (infringement analysis or patent drafting). I can continue the Patentability Assessment, or route you to the correct workflow on confirmation.',
      suggestions: ['Continue Patentability Assessment'],
      flags: nextSession.flags,
      session: nextSession,
      facts: nextSession.facts,
    };
  }
  const requestedClaim = String(latestMessage || '').match(/\bclaim\s+(\d+)\b/i)?.[1];
  if (requestedClaim && !nextSession.facts.claim_numbers) {
    nextSession.facts.claim_numbers = [Number(requestedClaim)];
    if (!nextSession.facts.analysis_target) nextSession.facts.analysis_target = 'DEFINED_CLAIMS';
  }
  if (nextSession.currentQuestionId && String(latestMessage || '').trim()) {
    applyAnswer(nextSession.facts, nextSession.currentQuestionId, latestMessage);
    nextSession.answers.push({ question_id: nextSession.currentQuestionId, answer: latestMessage, timestamp: new Date().toISOString() });
    nextSession.currentQuestionId = null;
  }
  const question = nextQuestion(nextSession.facts);
  if (question) {
    nextSession.currentQuestionId = question.id;
    if (question.id === 'claim_set_version' && !nextSession.flags.includes('CLAIM_VERSION_CONFIRMATION_REQUIRED')) {
      nextSession.flags.push('CLAIM_VERSION_CONFIRMATION_REQUIRED');
    }
    return {
      action: 'ASK_QUESTION',
      single_question: question,
      questions: [question],
      drafting_status: 'INFORMATION_GATHERING',
      readiness: 'NOT_READY',
      session: nextSession,
      facts: nextSession.facts,
    };
  }
  const readiness = assessPatentabilityReadiness(nextSession.facts);
  nextSession.flags = [...new Set([...nextSession.flags, ...readiness.gaps])];
  if (readiness.readiness === 'NOT_READY') {
    return {
      action: 'RESEARCH_REQUIRED',
      outcome: 'RESEARCH_REQUIRED',
      message: 'A patentability conclusion is not available. The recorded gaps must be resolved, or the scope must be explicitly limited to a preliminary assessment, before analysis.',
      readiness,
      session: nextSession,
      facts: nextSession.facts,
    };
  }
  if (!session.analysisConfirmed) {
    return {
      action: 'PROMPT_ANALYSIS_CONFIRMATION',
      message: `I have enough information to begin the patentability assessment using the current evidence (${nextSession.facts.analysis_target || 'target pending'}, ${readiness.jurisdiction}, cutoff ${nextSession.facts.priority_context?.analysis_cutoff || 'pending'}). Would you like me to proceed?`,
      pre_analysis_summary: {
        analysis_target: nextSession.facts.analysis_target,
        claim_set_version: nextSession.facts.claim_set_version || null,
        jurisdiction: readiness.jurisdiction,
        workflow_mode: nextSession.facts.workflow_mode || null,
        analysis_cutoff: nextSession.facts.priority_context?.analysis_cutoff,
        reference_count: nextSession.facts.references?.length || 0,
        research_status: nextSession.facts.research?.status,
        uncertainties: nextSession.flags,
      },
      readiness,
      session: nextSession,
    };
  }
  const assessment = evaluatePatentabilityAssessment(nextSession.facts);
  return { action: 'DRAFT', document_family: 'patentability-assessment', assessment, session: nextSession, readiness };
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

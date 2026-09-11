/**
 * SALLYIP PATENT ABSTRACT INTERVIEW GRAPH — DOCUMENT #011
 *
 * Strict one-question-at-a-time intake for the formal Patent Abstract workflow.
 * Matter context is inspected before any question. Source versions are tracked.
 * No technical, quantitative, terminological, or jurisdictional fact is invented.
 */

import {
  extractMatterFacts,
  inferInventionType,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  detectFactCorrection,
  READINESS_STATES,
} from './patent-interview-graph.js';
import {
  ABSTRACT_REVIEW_FLAGS,
  ABSTRACT_TECHNICAL_EFFECT_STATUSES,
  ABSTRACT_LOCK_STATUSES,
  PROVENANCE_STATES,
  normalizeAbstractWhitespace,
  normalizeSourceSnapshot,
  detectSourceDrift,
  classifyTechnicalEffect,
  assemblePatentAbstract,
  rewriteAbstractPreservingMeaning,
  shortenAbstractDeterministic,
  validateAbstractDraft,
  createAbstractVersion,
  countAbstractWords,
  hashSourceText,
} from './patent-abstract-service.js';

export { ABSTRACT_REVIEW_FLAGS, ABSTRACT_LOCK_STATUSES, READINESS_STATES };

export const ABSTRACT_WORKFLOW_MODES = {
  ABSTRACT_FROM_SPECIFICATION: 'ABSTRACT_FROM_SPECIFICATION',
  ABSTRACT_FROM_CLAIMS: 'ABSTRACT_FROM_CLAIMS',
  ABSTRACT_FROM_INVENTION_DISCLOSURE: 'ABSTRACT_FROM_INVENTION_DISCLOSURE',
  ABSTRACT_FROM_EXISTING_APPLICATION: 'ABSTRACT_FROM_EXISTING_APPLICATION',
  ABSTRACT_FROM_MATTER_CONTEXT: 'ABSTRACT_FROM_MATTER_CONTEXT',
  ABSTRACT_REVIEW: 'ABSTRACT_REVIEW',
  ABSTRACT_REWRITE: 'ABSTRACT_REWRITE',
  ABSTRACT_SHORTENING: 'ABSTRACT_SHORTENING',
  ABSTRACT_CONSISTENCY_CHECK: 'ABSTRACT_CONSISTENCY_CHECK',
  ABSTRACT_JURISDICTION_ADAPTATION: 'ABSTRACT_JURISDICTION_ADAPTATION',
};

const REVIEW_LIKE_MODES = new Set([
  ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW,
  ABSTRACT_WORKFLOW_MODES.ABSTRACT_REWRITE,
  ABSTRACT_WORKFLOW_MODES.ABSTRACT_SHORTENING,
  ABSTRACT_WORKFLOW_MODES.ABSTRACT_CONSISTENCY_CHECK,
  ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION,
]);

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return asText(value.label ?? value.value ?? value.text ?? value.content ?? value.body ?? value.name ?? '');
  }
  return String(value);
}

function factConfidence(item) {
  const confidence = Number(item?.confidence ?? item?.score ?? 0);
  return Number.isFinite(confidence) ? confidence : 0;
}

function findMatterFact(facts = [], types = []) {
  const wanted = new Set(types.map((type) => String(type).toLowerCase()));
  for (const fact of facts || []) {
    if (wanted.has(String(fact?.fact_type || '').toLowerCase())) {
      const text = normalizeAbstractWhitespace(asText(fact));
      if (text) return { text, confidence: factConfidence(fact) };
    }
  }
  return null;
}

function findSourceDocument(documents = [], types = []) {
  const wanted = new Set(types.map((type) => String(type).toUpperCase()));
  for (const document of documents || []) {
    const kind = String(document?.type || document?.document_type || document?.kind || '').toUpperCase();
    if (!wanted.has(kind)) continue;
    const text = normalizeAbstractWhitespace(asText(document));
    if (text || document?.id || document?.version) {
      return {
        id: document?.id || document?.document_id || null,
        version: document?.version || document?.revision || null,
        text,
      };
    }
  }
  return null;
}

function extractSourceDocuments(matterContext = {}, sessionFacts = {}) {
  const documents = Array.isArray(matterContext?.source_documents)
    ? matterContext.source_documents
    : Array.isArray(matterContext?.documents)
      ? matterContext.documents
      : [];
  const facts = Array.isArray(matterContext?.facts) ? matterContext.facts : [];
  const specification = findSourceDocument(documents, ['SPECIFICATION', 'PATENT_SPECIFICATION'])
    || factToSource(findMatterFact(facts, ['specification', 'specification_text', 'spec_text']));
  const claims = findSourceDocument(documents, ['CLAIMS', 'CLAIM_SET', 'PATENT_CLAIMS'])
    || factToSource(findMatterFact(facts, ['claims', 'claims_text', 'claim_set', 'claim_set_text']));
  const disclosure = findSourceDocument(documents, ['INVENTION_DISCLOSURE', 'DISCLOSURE'])
    || factToSource(findMatterFact(facts, ['invention_disclosure', 'disclosure', 'disclosure_text']));
  const application = findSourceDocument(documents, ['APPLICATION', 'EXISTING_APPLICATION', 'PRIORITY_APPLICATION'])
    || factToSource(findMatterFact(facts, ['existing_application', 'application', 'priority_application']));

  return {
    specification: textOrSessionSource(specification, sessionFacts.specification_text),
    claims: textOrSessionSource(claims, sessionFacts.claims_text),
    disclosure: textOrSessionSource(disclosure, sessionFacts.invention_disclosure),
    application: textOrSessionSource(application, sessionFacts.existing_application),
  };
}

function factToSource(found) {
  if (!found) return { id: null, version: null, text: '' };
  return { id: null, version: null, text: found.text };
}

function textOrSessionSource(source, sessionText) {
  const text = normalizeAbstractWhitespace(source?.text || asText(sessionText));
  if (!text && !source?.id && !source?.version) return { id: null, version: null, text: '' };
  return { id: source?.id || null, version: source?.version || null, text };
}

export function extractPatentAbstractMatterFacts(matterContext = {}) {
  const { facts: baseFacts, status: baseStatus } = extractMatterFacts(matterContext);
  const facts = { ...baseFacts };
  const status = { ...baseStatus };
  const matterFacts = Array.isArray(matterContext?.facts) ? matterContext.facts : [];

  const mappings = [
    ['title', ['title', 'invention_title', 'working_title']],
    ['technical_problem', ['technical_problem', 'problem', 'technical_field', 'problem_need']],
    ['core_solution', ['core_solution', 'technical_solution', 'core_inventive_concept', 'technical_mechanism']],
    ['principal_components', ['principal_components', 'components', 'components_or_steps', 'method_steps']],
    ['technical_effect', ['technical_effect', 'effect', 'technical_result', 'result']],
    ['specification_text', ['specification', 'specification_text', 'spec_text']],
    ['claims_text', ['claims', 'claims_text', 'claim_set', 'claim_set_text']],
    ['invention_disclosure', ['invention_disclosure', 'disclosure', 'disclosure_text']],
    ['existing_application', ['existing_application', 'application', 'priority_application']],
    ['existing_abstract', ['existing_abstract', 'abstract', 'abstract_text']],
  ];
  for (const [field, types] of mappings) {
    if (facts[field]) continue;
    const found = findMatterFact(matterFacts, types);
    if (found && (found.confidence >= 0.7 || found.text.length >= 24 || field === 'existing_abstract')) {
      facts[field] = found.text;
      status[field] = found.confidence >= 0.7 ? 'KNOWN' : 'INFERRED';
    }
  }

  if (!facts.title && matterContext?.matter?.description && String(matterContext.matter.description).trim().length > 80) {
    facts.plain_description = String(matterContext.matter.description).trim();
    status.plain_description = 'INFERRED';
  }

  if (!facts.jurisdiction_context) {
    if (baseStatus?.jurisdiction === 'KNOWN' && baseFacts?.jurisdiction) {
      facts.jurisdiction_context = baseFacts.jurisdiction;
      status.jurisdiction_context = 'KNOWN';
    } else {
      facts.jurisdiction_context = 'UNDECIDED';
      status.jurisdiction_context = 'UNKNOWN';
    }
  }

  const combinedTechnicalText = [facts.technical_problem, facts.core_solution, facts.principal_components, facts.title]
    .map((value) => asText(value)).join('\n');
  if (!facts.invention_type && combinedTechnicalText.trim().length >= 12) {
    facts.invention_type = inferInventionType(combinedTechnicalText);
    status.invention_type = 'INFERRED';
  }

  const sources = extractSourceDocuments(matterContext, facts);
  return { facts, status, sources };
}

export function isGeneralBusinessSummaryRequest(text = '') {
  const cleaned = String(text || '').toLowerCase();
  if (/\bpatent\s+abstract\b|\babstract\s+of\s+(?:the\s+)?disclosure\b/.test(cleaned)) return false;
  return /\b(summariz|summaris|summary|investor|business|executive|marketing|pitch|client-friendly)\b/.test(cleaned);
}

export function detectPatentAbstractMode(text = '', facts = {}, sources = {}) {
  const cleaned = String(text || '').toLowerCase();
  if (/\b(review|check|consistency|compare|validate)\b.{0,40}\babstract\b|\babstract\b.{0,40}\b(review|consistency|conflict)\b/.test(cleaned)) {
    return cleaned.includes('consist') ? ABSTRACT_WORKFLOW_MODES.ABSTRACT_CONSISTENCY_CHECK : ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW;
  }
  if (/\b(rewrite|reword|improve|revise|rephrase)\b.{0,40}\babstract\b|\babstract\b.{0,40}\b(rewrite|improve)\b/.test(cleaned)) {
    return ABSTRACT_WORKFLOW_MODES.ABSTRACT_REWRITE;
  }
  if (/\b(shorten|shorter|concise|reduce|compress|make\b.{0,20}\babstract\b.{0,20}\bshort)/.test(cleaned)) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_SHORTENING;
  if (/\b(adapt|localiz|localis|convert)\b.{0,40}\babstract\b|\babstract\b.{0,40}\bfor\b.{0,20}\b(pct|ep|epo|us|national)\b/.test(cleaned)) {
    return ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION;
  }
  if (/\bfrom\b.{0,20}\bclaims?\b|\bclaims?\s+abstract\b/.test(cleaned)) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_CLAIMS;
  if (/\bfrom\b.{0,20}\bspecification\b|\bspecification\s+abstract\b/.test(cleaned)) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_SPECIFICATION;
  if (/\bfrom\b.{0,20}\bdisclosure\b|\bdisclosure\s+abstract\b/.test(cleaned)) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_INVENTION_DISCLOSURE;
  if (/\bfrom\b.{0,40}\bapplication\b|\bexisting\s+application\b/.test(cleaned)) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_EXISTING_APPLICATION;
  if (sources?.claims?.text && !sources?.specification?.text && !sources?.disclosure?.text) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_CLAIMS;
  if (sources?.specification?.text) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_SPECIFICATION;
  if (sources?.disclosure?.text) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_INVENTION_DISCLOSURE;
  if (facts?.existing_abstract) return ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW;
  return ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_MATTER_CONTEXT;
}

function isExplicitModeSwitch(text = '') {
  return /\b(review|rewrite|shorten|adapt|from\s+(?:the\s+)?(?:specification|claims|disclosure|application)|jurisdiction)\b/i.test(String(text || ''));
}

function hasValue(value, minimum = 1) {
  return Boolean(value && value !== 'UNKNOWN' && normalizeAbstractWhitespace(asText(value)).length >= minimum);
}

function sourceLength(source) {
  return normalizeAbstractWhitespace(source?.text || '').length;
}

export function assessPatentAbstractReadiness(facts = {}, sources = {}, workflowMode = ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_MATTER_CONTEXT) {
  if (REVIEW_LIKE_MODES.has(workflowMode)) {
    if (hasValue(facts.existing_abstract, 30)) {
      if (workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION) {
        return facts.jurisdiction_context && facts.jurisdiction_context !== 'UNDECIDED'
          ? READINESS_STATES.READY_FOR_FIRST_DRAFT
          : READINESS_STATES.PARTIALLY_READY;
      }
      return READINESS_STATES.READY_FOR_FIRST_DRAFT;
    }
    return hasValue(facts.existing_abstract, 1) ? READINESS_STATES.PARTIALLY_READY : READINESS_STATES.NOT_READY;
  }

  const problem = hasValue(facts.technical_problem, 15);
  const solution = hasValue(facts.core_solution, 20);
  const components = hasValue(facts.principal_components, 10);
  const title = hasValue(facts.title, 3) || facts.title === 'UNKNOWN';
  const specification = sourceLength(sources?.specification) >= 200;
  const claims = sourceLength(sources?.claims) >= 100;
  const disclosure = sourceLength(sources?.disclosure) >= 200;

  if ((problem && solution && components && title) || (specification && claims && problem && solution && title)) return READINESS_STATES.READY_FOR_FIRST_DRAFT;
  if ((problem && solution) || (solution && components) || (problem && components) || specification || claims || disclosure) {
    return READINESS_STATES.PARTIALLY_READY;
  }
  return READINESS_STATES.NOT_READY;
}

export const ABSTRACT_CANONICAL_QUESTIONS = [
  {
    question_id: 'a_technical_problem',
    field: 'technical_problem',
    question: 'First, what is the core technical problem the invention addresses?',
    reason: 'Identifies the supported technical purpose without asking for a full specification.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts, sources, mode) => {
      if (REVIEW_LIKE_MODES.has(mode) && hasValue(facts.existing_abstract, 30)) return true;
      return hasValue(facts.technical_problem, 15);
    },
    follow_up_conditions: [
      {
        test: (answer) => {
          const cleaned = normalizeAbstractWhitespace(answer).replace(/[.,!?;]+$/, '');
          return cleaned.split(/\s+/).filter(Boolean).length < 5
            || /\b(it makes .* better|it is good|makes things better|improves it|works better)\b/i.test(cleaned);
        },
        followUp: 'Could you state the technical limitation more specifically—for example, what is slow, inaccurate, incompatible, unreliable, or otherwise limiting?',
      },
    ],
    answer_type: 'textarea',
    source: 'matter_or_user',
  },
  {
    question_id: 'a_core_solution',
    field: 'core_solution',
    question: 'What is the central technical solution, stated without optional variants or secondary embodiments?',
    reason: 'Isolates the core inventive concept for a concise abstract.',
    required: true,
    blocking: true,
    dependencies: ['technical_problem'],
    skip_if: (facts, sources, mode) => {
      if (REVIEW_LIKE_MODES.has(mode) && hasValue(facts.existing_abstract, 30)) return true;
      return hasValue(facts.core_solution, 20);
    },
    follow_up_conditions: [
      {
        test: (answer) => normalizeAbstractWhitespace(answer).split(/\s+/).filter(Boolean).length < 8,
        followUp: 'Could you add one concrete technical sentence explaining how the solution operates?',
      },
    ],
    answer_type: 'textarea',
    source: 'matter_or_user',
  },
  {
    question_id: 'a_principal_components',
    field: 'principal_components',
    question: (facts = {}) => {
      const type = String(facts.invention_type || 'SYSTEM').toUpperCase();
      if (type === 'METHOD' || type === 'PROCESS' || type === 'MANUFACTURING') {
        return 'What are the principal method steps and their key processing relationship?';
      }
      if (type === 'SOFTWARE' || type === 'AI_ML') {
        return 'What are the principal software components or processing stages—inputs, processing/model operation, and technical output?';
      }
      if (type === 'MECHANICAL' || type === 'DEVICE' || type === 'APPARATUS') {
        return 'What are the principal physical components, their relationship, and how do they operate together?';
      }
      return 'What are the principal components or steps and their main technical relationship?';
    },
    reason: 'Captures only the principal architecture needed for the abstract.',
    required: true,
    blocking: true,
    dependencies: ['core_solution'],
    skip_if: (facts, sources, mode) => {
      if (REVIEW_LIKE_MODES.has(mode) && hasValue(facts.existing_abstract, 30)) return true;
      return hasValue(facts.principal_components, 10);
    },
    follow_up_conditions: [
      {
        test: (answer) => normalizeAbstractWhitespace(answer).split(/\s+/).filter(Boolean).length < 5,
        followUp: 'Which two or three components or steps are indispensable, and how are they connected?',
      },
    ],
    answer_type: 'textarea',
    source: 'matter_or_user',
  },
  {
    question_id: 'a_claims_text',
    field: 'claims_text',
    question: 'Please supply the current claim text or claim-set version that should anchor the abstract.',
    reason: 'The abstract must remain consistent with the current claims without paraphrasing Claim 1 verbatim.',
    required: true,
    blocking: true,
    dependencies: ['principal_components'],
    modes: [ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_CLAIMS],
    skip_if: (facts, sources) => sourceLength(sources?.claims) >= 50 || hasValue(facts.claims_text, 50),
    follow_up_conditions: [],
    answer_type: 'textarea',
    source: 'user',
  },
  {
    question_id: 'a_specification_text',
    field: 'specification_text',
    question: 'Please supply the approved specification passage that should anchor the abstract.',
    reason: 'Prevents new matter by tying abstract propositions to specification disclosure.',
    required: true,
    blocking: true,
    dependencies: ['principal_components'],
    modes: [ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_SPECIFICATION],
    skip_if: (facts, sources) => sourceLength(sources?.specification) >= 100 || hasValue(facts.specification_text, 100),
    follow_up_conditions: [],
    answer_type: 'textarea',
    source: 'user',
  },
  {
    question_id: 'a_invention_disclosure',
    field: 'invention_disclosure',
    question: 'Please supply the invention-disclosure passage containing the problem, solution, components, and result.',
    reason: 'Uses disclosure facts without manufacturing patent-specific detail.',
    required: true,
    blocking: true,
    dependencies: ['principal_components'],
    modes: [ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_INVENTION_DISCLOSURE],
    skip_if: (facts, sources) => sourceLength(sources?.disclosure) >= 100 || hasValue(facts.invention_disclosure, 100),
    follow_up_conditions: [],
    answer_type: 'textarea',
    source: 'user',
  },
  {
    question_id: 'a_existing_application',
    field: 'existing_application',
    question: 'Please identify or supply the existing application text and version that should anchor the abstract.',
    reason: 'Tracks the exact application source and version used for the abstract.',
    required: true,
    blocking: true,
    dependencies: ['principal_components'],
    modes: [ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_EXISTING_APPLICATION],
    skip_if: (facts, sources) => sourceLength(sources?.application) >= 100 || hasValue(facts.existing_application, 100),
    follow_up_conditions: [],
    answer_type: 'textarea',
    source: 'user',
  },
  {
    question_id: 'a_existing_abstract',
    field: 'existing_abstract',
    question: (facts = {}, sources = {}, mode = ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW) => {
      if (mode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_SHORTENING) return 'Please supply the complete abstract to be shortened.';
      if (mode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_REWRITE) return 'Please supply the complete abstract to be rewritten without changing its technical meaning.';
      if (mode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_CONSISTENCY_CHECK) return 'Please supply the abstract to be checked against the current claims and specification.';
      if (mode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION) return 'Please supply the abstract to be adapted for the selected jurisdiction context.';
      return 'Please supply the complete abstract to be reviewed.';
    },
    reason: 'Review and revision must operate on the supplied abstract, not an invented replacement.',
    required: true,
    blocking: true,
    dependencies: [],
    modes: [
      ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW,
      ABSTRACT_WORKFLOW_MODES.ABSTRACT_REWRITE,
      ABSTRACT_WORKFLOW_MODES.ABSTRACT_SHORTENING,
      ABSTRACT_WORKFLOW_MODES.ABSTRACT_CONSISTENCY_CHECK,
      ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION,
    ],
    skip_if: (facts) => hasValue(facts.existing_abstract, 20),
    follow_up_conditions: [],
    answer_type: 'textarea',
    source: 'user',
  },
  {
    question_id: 'a_title',
    field: 'title',
    question: 'What working patent title should be checked for consistency with the abstract?',
    reason: 'Keeps the abstract semantically consistent with the patent title.',
    required: true,
    blocking: false,
    dependencies: ['principal_components'],
    skip_if: (facts, sources, mode) => {
      if (REVIEW_LIKE_MODES.has(mode) && hasValue(facts.existing_abstract, 30)) return true;
      return hasValue(facts.title, 3) || facts.title === 'UNKNOWN';
    },
    follow_up_conditions: [],
    answer_type: 'text',
    source: 'matter_or_user',
  },
  {
    question_id: 'a_technical_effect',
    field: 'technical_effect',
    question: 'What technical result is actually supported by the source material? If none is supported, say so rather than estimating an improvement.',
    reason: 'Prevents unsupported quantitative or qualitative performance assertions.',
    required: false,
    blocking: false,
    dependencies: ['core_solution'],
    skip_if: (facts, sources, mode) => {
      if (REVIEW_LIKE_MODES.has(mode) && hasValue(facts.existing_abstract, 30)) return true;
      return hasValue(facts.technical_effect, 8) || facts.technical_effect === 'UNKNOWN';
    },
    follow_up_conditions: [
      {
        test: (answer) => /\b(works better|better performance|much faster|significantly improves?)\b/i.test(normalizeAbstractWhitespace(answer))
          && !/\d/.test(String(answer || '')),
        followUp: 'What evidence supports that result—measured data, an observed behavior, or a disclosed mechanism? If there is none, please say “no supported effect.”',
      },
    ],
    answer_type: 'textarea',
    source: 'matter_or_user',
  },
  {
    question_id: 'a_jurisdiction_context',
    field: 'jurisdiction_context',
    question: 'For which jurisdiction context should the abstract be adapted: US, PCT, EP, a national-phase jurisdiction, OTHER, or UNDECIDED?',
    reason: 'Jurisdiction-specific handling applies only where relevant and verified.',
    required: false,
    blocking: false,
    dependencies: [],
    modes: [ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION],
    skip_if: (facts) => Boolean(facts.jurisdiction_context && facts.jurisdiction_context !== 'UNDECIDED'),
    follow_up_conditions: [],
    answer_type: 'text',
    source: 'matter_or_user',
  },
];

function resolveQuestionText(question, facts, sources, mode, intro = '') {
  const raw = typeof question.question === 'function' ? question.question(facts, sources, mode) : question.question;
  return `${intro}${raw}`;
}

function nextAbstractQuestion(facts, sources, workflowMode) {
  for (const question of ABSTRACT_CANONICAL_QUESTIONS) {
    if (question.modes && !question.modes.includes(workflowMode)) continue;
    if (question.skip_if(facts, sources, workflowMode)) continue;
    const dependenciesMet = (question.dependencies || []).every((dependency) => hasValue(facts[dependency], 3));
    if (!dependenciesMet) continue;
    return question;
  }
  return null;
}

function currentSourceTexts(facts, sources) {
  return {
    specification: normalizeAbstractWhitespace(sources?.specification?.text || asText(facts.specification_text)),
    claims: normalizeAbstractWhitespace(sources?.claims?.text || asText(facts.claims_text)),
    disclosure: normalizeAbstractWhitespace(sources?.disclosure?.text || asText(facts.invention_disclosure)),
    application: normalizeAbstractWhitespace(sources?.application?.text || asText(facts.existing_application)),
  };
}

function buildPreDraftSummary({ facts, sources, workflowMode, readiness, flags }) {
  const sourceItems = [];
  if (sourceLength(sources?.specification)) sourceItems.push(`specification ${sources.specification.id || 'matter source'} ${sources.specification.version || 'unversioned'}`);
  if (sourceLength(sources?.claims)) sourceItems.push(`claims ${sources.claims.id || 'matter source'} ${sources.claims.version || 'unversioned'}`);
  if (sourceLength(sources?.disclosure)) sourceItems.push(`invention disclosure ${sources.disclosure.id || 'matter source'} ${sources.disclosure.version || 'unversioned'}`);
  if (sourceLength(sources?.application)) sourceItems.push(`existing application ${sources.application.id || 'matter source'} ${sources.application.version || 'unversioned'}`);
  if (!sourceItems.length) sourceItems.push('user-provided abstract facts');

  const effectStatus = classifyTechnicalEffect(facts.technical_effect, currentSourceTexts(facts, sources));
  const lines = [
    'I have enough information to prepare the first patent abstract. Would you like me to proceed?',
    '',
    `Workflow mode: ${workflowMode}`,
    `Readiness: ${readiness}`,
    `Source material: ${sourceItems.join('; ')}`,
    `Core invention: ${normalizeAbstractWhitespace(asText(facts.core_solution)).slice(0, 180) || 'Captured'}`,
    `Main components or steps: ${normalizeAbstractWhitespace(asText(facts.principal_components)).slice(0, 180) || 'Captured'}`,
    `Supported technical effect: ${effectStatus === ABSTRACT_TECHNICAL_EFFECT_STATUSES.SOURCE_SUPPORTED ? normalizeAbstractWhitespace(asText(facts.technical_effect)).slice(0, 180) : 'None supplied with source support'}`,
    `Jurisdiction context: ${facts.jurisdiction_context || 'UNDECIDED'}`,
    `Known limitations or review flags: ${flags.length ? flags.join(', ') : 'None'}`,
  ];
  return lines.join('\n');
}

function ensureSessionShape(session = {}) {
  return {
    facts: { ...(session.facts || {}) },
    factProvenance: { ...(session.factProvenance || {}) },
    placeholders: { ...(session.placeholders || {}) },
    flags: [...(session.flags || [])],
    locks: { ...(session.locks || {}) },
    versions: Array.isArray(session.versions) ? [...session.versions] : [],
    sourceSnapshot: { ...(session.sourceSnapshot || {}) },
    questionHistory: [...(session.questionHistory || [])],
    currentQuestionId: session.currentQuestionId || null,
    inFollowUp: session.inFollowUp || false,
    awaitingConfirmation: session.awaitingConfirmation || false,
    confirmedReady: session.confirmedReady || false,
    workflowMode: session.workflowMode || null,
    abstractId: session.abstractId || null,
    matterId: session.matterId || session.matter_id || null,
    draftSessionId: session.draftSessionId || session.draft_session_id || null,
    documentId: session.documentId || session.document_id || 'patent-abstract',
  };
}

function setProvenance(session, field, value) {
  session.factProvenance[field] = value;
}

function adoptMatterFacts(session, matterFacts, matterStatus, matterProvenance = PROVENANCE_STATES.MATTER_CONTEXT) {
  for (const [field, value] of Object.entries(matterFacts || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (session.facts[field] === undefined || session.facts[field] === '') {
      session.facts[field] = value;
      if (!session.factProvenance[field]) {
        session.factProvenance[field] = matterStatus?.[field] === 'KNOWN' ? matterProvenance : PROVENANCE_STATES.UNVERIFIED;
      }
    }
  }
}

function makeAbstractId(session) {
  if (session.abstractId) return session.abstractId;
  const seed = `${asText(session.facts.title)}|${asText(session.facts.technical_problem)}|${asText(session.facts.core_solution)}`;
  return `patent-abstract-${hashSourceText(seed || 'unscoped-matter').slice(7, 15)}`;
}

export function evaluatePatentAbstractInterviewStep({
  session = {},
  messages = [],
  latestMessage = '',
  matterContext = {},
  attachments = [],
} = {}) {
  const nextSession = ensureSessionShape(session);
  const latestText = normalizeAbstractWhitespace(asText(latestMessage));
  const matter = extractPatentAbstractMatterFacts(matterContext);
  adoptMatterFacts(nextSession, matter.facts, matter.status);
  if (!nextSession.facts.invention_type && (nextSession.facts.technical_problem || nextSession.facts.core_solution || nextSession.facts.title)) {
    nextSession.facts.invention_type = inferInventionType(
      [nextSession.facts.title, nextSession.facts.technical_problem, nextSession.facts.core_solution, nextSession.facts.principal_components].join('\n'),
    );
  }

  const sources = {
    specification: {
      id: matter.sources.specification.id,
      version: matter.sources.specification.version,
      text: normalizeAbstractWhitespace(matter.sources.specification.text || asText(nextSession.facts.specification_text)),
    },
    claims: {
      id: matter.sources.claims.id,
      version: matter.sources.claims.version,
      text: normalizeAbstractWhitespace(matter.sources.claims.text || asText(nextSession.facts.claims_text)),
    },
    disclosure: {
      id: matter.sources.disclosure.id,
      version: matter.sources.disclosure.version,
      text: normalizeAbstractWhitespace(matter.sources.disclosure.text || asText(nextSession.facts.invention_disclosure)),
    },
    application: {
      id: matter.sources.application.id,
      version: matter.sources.application.version,
      text: normalizeAbstractWhitespace(matter.sources.application.text || asText(nextSession.facts.existing_application)),
    },
  };
  const sourceSnapshot = normalizeSourceSnapshot(sources);
  const driftedSources = detectSourceDrift(nextSession.sourceSnapshot, sourceSnapshot);
  if (driftedSources.length && (nextSession.versions.length || nextSession.confirmedReady || nextSession.awaitingConfirmation)) {
    if (!nextSession.flags.includes(ABSTRACT_REVIEW_FLAGS.ABSTRACT_REVIEW_REQUIRED)) {
      nextSession.flags.push(ABSTRACT_REVIEW_FLAGS.ABSTRACT_REVIEW_REQUIRED);
    }
  }
  nextSession.sourceSnapshot = sourceSnapshot;
  if (!nextSession.flags.includes(ABSTRACT_REVIEW_FLAGS.CONFIDENTIAL_MATTER_UNPUBLISHED)) {
    nextSession.flags.push(ABSTRACT_REVIEW_FLAGS.CONFIDENTIAL_MATTER_UNPUBLISHED);
  }

  if (isGeneralBusinessSummaryRequest(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: null,
      message: 'That request sounds like a general investor, business, or executive summary rather than the formal technical abstract associated with a patent application. Please confirm whether you need the formal Patent Abstract workflow.',
      flags: ['ABSTRACT_VS_GENERAL_SUMMARY_CLARIFICATION_REQUIRED'],
      session: nextSession,
    };
  }

  const shouldDetectMode = !nextSession.workflowMode
    || (Boolean(latestText) && isExplicitModeSwitch(latestText));
  if (shouldDetectMode && latestText) {
    nextSession.workflowMode = detectPatentAbstractMode(latestText, nextSession.facts, sources);
  }
  if (!nextSession.workflowMode) nextSession.workflowMode = ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_MATTER_CONTEXT;
  const workflowMode = nextSession.workflowMode;
  if ((!nextSession.facts.jurisdiction_context || nextSession.facts.jurisdiction_context === 'UNDECIDED') && latestText) {
    if (/\bpct\b/i.test(latestText)) nextSession.facts.jurisdiction_context = 'PCT';
    else if (/\bepo\b|\beuropean\b|\bep\b/i.test(latestText)) nextSession.facts.jurisdiction_context = 'EP';
    else if (/\buspto\b|\bunited states patent\b/i.test(latestText)) nextSession.facts.jurisdiction_context = 'US';
  }

  const isInitialAbstractRequest = /(draft|prepare|write|review|rewrite|shorten|adapt|check).{0,40}abstract/i.test(latestText)
    || /\bpatent\s+abstract\b/i.test(latestText);

  if (nextSession.awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return finalizeAbstractDraft(nextSession, sources, workflowMode, matterContext);
    }
    if (isSkipOrUnknown(latestText)) {
      nextSession.awaitingConfirmation = false;
      nextSession.confirmedReady = false;
    } else if (latestText && !isInitialAbstractRequest) {
      nextSession.awaitingConfirmation = false;
      nextSession.confirmedReady = false;
    }
  }

  if (nextSession.currentQuestionId && latestText && !isInitialAbstractRequest) {
    const correction = detectFactCorrection(latestText, nextSession.facts);
    if (correction && (correction.field === 'title' || correction.field === 'components')) {
      if (!nextSession.locks[correction.field]) {
        const target = correction.field === 'components' ? 'principal_components' : correction.field;
        nextSession.facts[target] = correction.value;
        setProvenance(nextSession, target, PROVENANCE_STATES.USER_EDITED);
      }
      nextSession.inFollowUp = false;
    } else {
      const current = ABSTRACT_CANONICAL_QUESTIONS.find((item) => item.question_id === nextSession.currentQuestionId);
      if (current && !nextSession.locks[current.field]) {
        if (isSkipOrUnknown(latestText)) {
          nextSession.facts[current.field] = 'UNKNOWN';
          nextSession.placeholders[current.field] = current.blocking
            ? `[UNKNOWN / TO BE DETERMINED: ${current.field}]`
            : `[NOT PROVIDED: ${current.field}]`;
          setProvenance(nextSession, current.field, PROVENANCE_STATES.PLACEHOLDER);
          nextSession.inFollowUp = false;
        } else {
          let followUp = null;
          for (const condition of current.follow_up_conditions || []) {
            if (condition.test(latestText)) {
              followUp = condition.followUp;
              break;
            }
          }
          if (followUp && !nextSession.inFollowUp) {
            return {
              action: 'ASK_QUESTION',
              drafting_status: 'INFORMATION_GATHERING',
              single_question: {
                question_id: `${current.question_id}_followup`,
                field: current.field,
                question: followUp,
                reason: 'The supplied answer needs a more specific supported technical fact.',
                is_follow_up: true,
              },
              questions: [{
                question_id: `${current.question_id}_followup`,
                field: current.field,
                question: followUp,
              }],
              readiness: assessPatentAbstractReadiness(nextSession.facts, sources, workflowMode),
              session: { ...nextSession, inFollowUp: true },
            };
          }
          nextSession.facts[current.field] = latestText;
          setProvenance(nextSession, current.field, PROVENANCE_STATES.USER_PROVIDED);
          if (['technical_problem', 'core_solution', 'principal_components', 'title'].includes(current.field)) {
            nextSession.facts.invention_type = inferInventionType(
              [nextSession.facts.title, nextSession.facts.technical_problem, nextSession.facts.core_solution, nextSession.facts.principal_components].join('\n'),
            );
          }
          if (current.field === 'jurisdiction_context') {
            const normalized = latestText.toUpperCase().replace(/[\s-]+/g, '_');
            nextSession.facts.jurisdiction_context = ['US', 'PCT', 'EP', 'NATIONAL_PHASE_SPECIFIC', 'OTHER', 'UNDECIDED'].includes(normalized)
              ? normalized
              : 'UNDECIDED';
          }
          nextSession.inFollowUp = false;
        }
      }
    }
  }

  const readiness = assessPatentAbstractReadiness(nextSession.facts, sources, workflowMode);
  if (readiness === READINESS_STATES.READY_FOR_FIRST_DRAFT && !nextSession.confirmedReady) {
    const message = workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW
      ? `I have the supplied abstract and enough source context to review it.\n\nExisting abstract word count: ${countAbstractWords(nextSession.facts.existing_abstract)}\nJurisdiction context: ${nextSession.facts.jurisdiction_context || 'UNDECIDED'}\nReview flags: ${nextSession.flags.length ? nextSession.flags.join(', ') : 'None'}\n\nWould you like me to proceed?`
      : buildPreDraftSummary({ facts: nextSession.facts, sources, workflowMode, readiness, flags: nextSession.flags });
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness,
      message,
      session: { ...nextSession, currentQuestionId: null, awaitingConfirmation: true, confirmedReady: true },
      facts: nextSession.facts,
      flags: nextSession.flags,
    };
  }

  const nextQuestion = nextAbstractQuestion(nextSession.facts, sources, workflowMode);
  if (!nextQuestion) {
    const message = buildPreDraftSummary({ facts: nextSession.facts, sources, workflowMode, readiness, flags: nextSession.flags });
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness,
      message,
      session: { ...nextSession, currentQuestionId: null, awaitingConfirmation: true, confirmedReady: true },
      facts: nextSession.facts,
      flags: nextSession.flags,
    };
  }

  let intro = '';
  if (!session.currentQuestionId && isInitialAbstractRequest && nextQuestion.question_id === 'a_technical_problem') {
    intro = 'Absolutely. I can help prepare the abstract.\n\nI’ll first use the existing invention and specification information in this matter. If anything essential is missing, I’ll ask you one question at a time before preparing the draft.\n\n';
  }
  const questionText = resolveQuestionText(nextQuestion, nextSession.facts, sources, workflowMode, intro);
  return {
    action: 'ASK_QUESTION',
    drafting_status: 'INFORMATION_GATHERING',
    readiness,
    single_question: {
      question_id: nextQuestion.question_id,
      field: nextQuestion.field,
      question: questionText,
      raw_question: typeof nextQuestion.question === 'function' ? nextQuestion.question(nextSession.facts, sources, workflowMode) : nextQuestion.question,
      reason: nextQuestion.reason,
      required: nextQuestion.required,
      answer_type: nextQuestion.answer_type,
    },
    questions: [{ question_id: nextQuestion.question_id, field: nextQuestion.field, question: questionText }],
    session: {
      ...nextSession,
      currentQuestionId: nextQuestion.question_id,
      questionHistory: [...nextSession.questionHistory, nextQuestion.question_id],
      inFollowUp: false,
      awaitingConfirmation: false,
    },
  };
}

function finalizeAbstractDraft(session, sources, workflowMode, matterContext = {}) {
  const nextSession = ensureSessionShape({ ...session, awaitingConfirmation: false });
  const sourceTexts = currentSourceTexts(nextSession.facts, sources);
  const isLocked = nextSession.locks.abstract === ABSTRACT_LOCK_STATUSES.USER_LOCKED
    || nextSession.locks.abstract === ABSTRACT_LOCK_STATUSES.REVIEW_LOCKED;
  const latestVersion = nextSession.versions[nextSession.versions.length - 1] || null;

  if (isLocked && latestVersion) {
    const validation = validateAbstractDraft({
      abstractText: latestVersion.text,
      title: nextSession.facts.title,
      specificationText: sourceTexts.specification,
      claimsText: sourceTexts.claims,
      disclosureText: sourceTexts.disclosure,
      applicationText: sourceTexts.application,
      facts: nextSession.facts,
    });
    const flags = [...new Set([...nextSession.flags, ...validation.flags, ABSTRACT_REVIEW_FLAGS.ABSTRACT_LOCKED_PRESERVED])];
    if (detectSourceDrift(latestVersion.source_snapshot || {}, nextSession.sourceSnapshot).length) {
      flags.push(ABSTRACT_REVIEW_FLAGS.ABSTRACT_REVIEW_REQUIRED);
    }
    return {
      action: 'DRAFT',
      drafting_status: 'READY_TO_ASSEMBLE',
      readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
      facts: nextSession.facts,
      session: { ...nextSession, flags, confirmedReady: true },
      draft: {
        abstractId: makeAbstractId(nextSession),
        workflowMode,
        jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED',
        abstractText: latestVersion.text,
        wordCount: { abstract_text: latestVersion.text, word_count: latestVersion.word_count, target_limit: null, jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED', rule_source: null, rule_version: null, verification_status: 'UNVERIFIED', status: 'RULE_UNVERIFIED' },
        supportMap: validation.supportMap,
        validation,
        flags,
        locked: true,
        version: latestVersion,
        versions: nextSession.versions,
        sourceSnapshot: nextSession.sourceSnapshot,
        execution_mode: 'CONFIDENTIAL_IP',
        confidentiality: { content_class: 'unpublished_invention', free_provider_allowed: false },
      },
    };
  }

  if (workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_SHORTENING) {
    const shortened = shortenAbstractDeterministic({
      abstractText: nextSession.facts.existing_abstract,
      specificationText: sourceTexts.specification,
      claimsText: sourceTexts.claims,
      facts: nextSession.facts,
    });
    return persistNewAbstractVersion(nextSession, sources, workflowMode, shortened.text, {
      supportMap: shortened.validation.supportMap, validation: shortened.validation, shortening: shortened,
    });
  }

  if (workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_REWRITE) {
    const rewritten = rewriteAbstractPreservingMeaning({
      existingAbstract: nextSession.facts.existing_abstract,
      specificationText: sourceTexts.specification,
      claimsText: sourceTexts.claims,
      disclosureText: sourceTexts.disclosure,
      applicationText: sourceTexts.application,
      facts: nextSession.facts,
    });
    return persistNewAbstractVersion(nextSession, sources, workflowMode, rewritten.text, {
      supportMap: rewritten.validation.supportMap, validation: rewritten.validation, changed: rewritten.changed,
    });
  }

  if (workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_REVIEW
    || workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_CONSISTENCY_CHECK
    || workflowMode === ABSTRACT_WORKFLOW_MODES.ABSTRACT_JURISDICTION_ADAPTATION) {
    const validation = validateAbstractDraft({
      abstractText: nextSession.facts.existing_abstract,
      title: nextSession.facts.title,
      specificationText: sourceTexts.specification,
      claimsText: sourceTexts.claims,
      disclosureText: sourceTexts.disclosure,
      applicationText: sourceTexts.application,
      facts: nextSession.facts,
    });
    const flags = [...new Set([...nextSession.flags, ...validation.flags])];
    if (sourceTexts.claims && !sourceTexts.specification && !sourceTexts.disclosure) {
      flags.push(ABSTRACT_REVIEW_FLAGS.SPECIFICATION_CONTEXT_LIMITED);
    }
    return {
      action: 'DRAFT',
      drafting_status: 'READY_TO_ASSEMBLE',
      readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
      facts: nextSession.facts,
      session: { ...nextSession, flags, confirmedReady: true },
      draft: {
        abstractId: makeAbstractId(nextSession),
        workflowMode,
        jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED',
        abstractText: validation.sanitizedText,
        wordCount: {
          abstract_text: validation.sanitizedText, word_count: countAbstractWords(validation.sanitizedText), target_limit: null,
          jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED', rule_source: null, rule_version: null,
          verification_status: 'UNVERIFIED', status: 'RULE_UNVERIFIED',
        },
        supportMap: validation.supportMap,
        validation,
        flags,
        locked: false,
        versions: nextSession.versions,
        sourceSnapshot: nextSession.sourceSnapshot,
        execution_mode: 'CONFIDENTIAL_IP',
        confidentiality: { content_class: 'unpublished_invention', free_provider_allowed: false },
      },
    };
  }

  const assembled = assemblePatentAbstract({
    facts: nextSession.facts,
    specificationText: sourceTexts.specification,
    claimsText: sourceTexts.claims,
    disclosureText: sourceTexts.disclosure,
    applicationText: sourceTexts.application,
    workflowMode,
    jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED',
    targetWordLimit: Number.isInteger(nextSession.facts.target_word_limit) ? nextSession.facts.target_word_limit : null,
    ruleSource: nextSession.facts.verified_word_limit_rule_source || null,
    ruleVersion: nextSession.facts.verified_word_limit_rule_version || null,
    provenance: nextSession.factProvenance,
  });
  return persistNewAbstractVersion(nextSession, sources, workflowMode, assembled.abstractText, {
    supportMap: assembled.validation.supportMap,
    validation: assembled.validation,
    wordCount: assembled.wordCount,
    technicalEffectStatus: assembled.technicalEffectStatus,
    shortening: assembled.shortening,
  });
}

function persistNewAbstractVersion(session, sources, workflowMode, text, result = {}) {
  const nextSession = ensureSessionShape(session);
  const flags = [...new Set([...nextSession.flags, ...(result.validation?.flags || [])])];
  if ((currentSourceTexts(nextSession.facts, sources).claims) && !currentSourceTexts(nextSession.facts, sources).specification && !currentSourceTexts(nextSession.facts, sources).disclosure) {
    if (!flags.includes(ABSTRACT_REVIEW_FLAGS.SPECIFICATION_CONTEXT_LIMITED)) {
      flags.push(ABSTRACT_REVIEW_FLAGS.SPECIFICATION_CONTEXT_LIMITED);
    }
  }
  const version = createAbstractVersion({
    index: nextSession.versions.length + 1,
    text,
    workflowMode,
    jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED',
    sourceSnapshot: nextSession.sourceSnapshot,
    wordCount: result.wordCount || { word_count: countAbstractWords(text) },
    status: 'DRAFT',
  });
  nextSession.versions.push(version);
  nextSession.facts.existing_abstract = version.text;
  setProvenance(nextSession, 'existing_abstract', PROVENANCE_STATES.AI_DRAFTED);
  nextSession.locks.abstract = nextSession.locks.abstract || ABSTRACT_LOCK_STATUSES.UNLOCKED;
  return {
    action: 'DRAFT',
    drafting_status: 'READY_TO_ASSEMBLE',
    readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
    facts: nextSession.facts,
    session: { ...nextSession, flags, confirmedReady: true },
    draft: {
      abstractId: makeAbstractId(nextSession),
      workflowMode,
      jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED',
      abstractText: version.text,
      wordCount: result.wordCount || {
        abstract_text: version.text, word_count: version.word_count, target_limit: null,
        jurisdiction: nextSession.facts.jurisdiction_context || 'UNDECIDED', rule_source: null, rule_version: null,
        verification_status: 'UNVERIFIED', status: 'RULE_UNVERIFIED',
      },
      supportMap: result.supportMap,
      validation: result.validation,
      technicalEffectStatus: result.technicalEffectStatus,
      shortening: result.shortening,
      changed: result.changed,
      flags,
      locked: false,
      version,
      versions: nextSession.versions,
      sourceSnapshot: nextSession.sourceSnapshot,
      execution_mode: 'CONFIDENTIAL_IP',
      confidentiality: { content_class: 'unpublished_invention', free_provider_allowed: false },
    },
  };
}

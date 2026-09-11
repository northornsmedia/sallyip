/**
 * SALLYIP PATENT SPECIFICATION INTERVIEW GRAPH — DOCUMENT #009
 *
 * Strict one-question-at-a-time intake for the standalone Patent Specification
 * workflow (substantive technical description, NOT a filing route).
 *
 * Enforces:
 * - Matter context first (KNOWN / INFERRED / UNKNOWN); never re-ask KNOWN facts.
 * - ONE_QUESTION_AT_A_TIME turn-taking with dependency-aware DAG.
 * - Drafting-mode awareness (full vs section-level drafting).
 * - Jurisdiction context (US / PCT / EP / OTHER / UNDECIDED, explicit or undecided).
 * - Invention-type adaptive branching (system/method/device/software/AI/mech/...).
 * - Disclosure completeness (drafting-readiness, not a legal sufficiency opinion).
 * - Claim-aware intake WITHOUT inventing embodiments to cure unsupported limits.
 * - Essential vs optional feature discipline, terminology + numeral consistency,
 *   actual-vs-hypothetical examples, experimental-data safety, background safety,
 *   new-matter tracking, section locking, change-impact analysis.
 * - Specification-vs-application guard: full filing requests route out.
 * - Confidentiality fail-closed (CONFIDENTIAL_PILOT_BLOCKED, no silent fallback).
 * - Voice/typed share the same session (draftSessionId/matterId/documentId).
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
  SPEC_READINESS_STATES,
  SPEC_REVIEW_FLAGS,
  SPEC_LOCK_STATUSES,
  SPEC_PROVENANCE_STATES,
  SPEC_DRAFTING_MODES,
  SPEC_JURISDICTIONS,
  assessDisclosureCompleteness,
  assessSpecificationReadiness,
  buildClaimSupportMapForSpecification,
  normalizeSpecWhitespace,
} from './patent-specification-drafting-service.js';

export {
  SPEC_READINESS_STATES,
  SPEC_REVIEW_FLAGS,
  SPEC_LOCK_STATUSES,
  SPEC_PROVENANCE_STATES,
  SPEC_DRAFTING_MODES,
  SPEC_JURISDICTIONS,
  READINESS_STATES,
};

export const SPEC_WORKFLOW_MODES = { ...SPEC_DRAFTING_MODES };

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return asText(value.label ?? value.value ?? value.text ?? value.content ?? value.body ?? value.name ?? value.statement ?? '');
  }
  return String(value);
}

function factConfidence(item) {
  const c = Number(item?.confidence ?? item?.score ?? 0);
  return Number.isFinite(c) ? c : 0;
}

function findMatterFact(facts = [], types = []) {
  const wanted = new Set(types.map((t) => String(t).toLowerCase()));
  for (const f of facts || []) {
    if (wanted.has(String(f?.fact_type || '').toLowerCase())) {
      const text = normalizeSpecWhitespace(asText(f));
      if (text) return { text, confidence: factConfidence(f) };
    }
  }
  return null;
}

function findSourceDocument(documents = [], types = []) {
  const wanted = new Set(types.map((t) => String(t).toUpperCase()));
  for (const d of documents || []) {
    const kind = String(d?.type || d?.document_type || d?.kind || '').toUpperCase();
    if (!wanted.has(kind)) continue;
    const text = normalizeSpecWhitespace(asText(d));
    if (text || d?.id || d?.version) {
      return { id: d?.id || d?.document_id || null, version: d?.version || d?.revision || null, text };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mode + jurisdiction + filing-route detection
// ---------------------------------------------------------------------------

export function detectPatentSpecificationMode(text = '', facts = {}) {
  const t = String(text || '').toLowerCase();
  if (/\b(detailed description only|only (want|need) the detailed description|detailed description section only)\b/i.test(text)) return SPEC_DRAFTING_MODES.DETAILED_DESCRIPTION_ONLY;
  if (/\b(description only|only (want|need) the description)\b/i.test(text)) return SPEC_DRAFTING_MODES.DESCRIPTION_ONLY;
  if (/\b(background only|only (want|need) the background)\b/i.test(text)) return SPEC_DRAFTING_MODES.BACKGROUND_ONLY;
  if (/\b(summary only|only (want|need) the summary)\b/i.test(text)) return SPEC_DRAFTING_MODES.SUMMARY_ONLY;
  if (/\b(drawing descriptions? only|only (want|need) (the )?drawings?|figure descriptions? only|brief description of (the )?drawings? only)\b/i.test(text)) return SPEC_DRAFTING_MODES.DRAWING_DESCRIPTIONS_ONLY;
  if (/\b(expand|expansion).{0,20}(embodiment|technical explanation)|add (a )?supported embodiment\b/i.test(text)) return SPEC_DRAFTING_MODES.EMBODIMENT_EXPANSION;
  if (/\b(specification )?(around|from) (these|the|my) claims\b|specification.from.claims|claims first|here are (the|my) claims\b/i.test(text)) return SPEC_DRAFTING_MODES.SPECIFICATION_FROM_CLAIMS;
  if (/\bfrom (this |the |my )?(invention disclosure|disclosure document)\b|turn this invention disclosure into/i.test(text)) return SPEC_DRAFTING_MODES.SPECIFICATION_FROM_INVENTION_DISCLOSURE;
  if (/\breview (this|the|my) (specification|draft|description)\b/i.test(text)) return SPEC_DRAFTING_MODES.SPECIFICATION_REVIEW;
  if (/\brevise|revision|update (this|the) specification|amend (this|the) specification\b/i.test(text)) return SPEC_DRAFTING_MODES.SPECIFICATION_REVISION;
  if (facts?.drafting_mode && SPEC_DRAFTING_MODES[facts.drafting_mode]) return facts.drafting_mode;
  if (facts?.existing_claims && !facts?.core_inventive_concept) return SPEC_DRAFTING_MODES.SPECIFICATION_FROM_CLAIMS;
  if (facts?.invention_disclosure && !facts?.core_inventive_concept) return SPEC_DRAFTING_MODES.SPECIFICATION_FROM_INVENTION_DISCLOSURE;
  return SPEC_DRAFTING_MODES.FULL_SPECIFICATION;
}

export function detectSpecificationJurisdiction(text = '', facts = {}) {
  const t = String(text || '');
  if (/\bPCT\b|international application|WIPO/i.test(t)) return 'PCT';
  if (/\bEP\b|\bEPO\b|european/i.test(t)) return 'EP';
  if (/\bUS\b|USPTO|united states|35\s*U\.?S\.?C/i.test(t)) return 'US';
  if (/\b(undecided|not sure|haven'?t decided|no jurisdiction|neutral)\b/i.test(t)) return 'UNDECIDED';
  if (facts?.jurisdiction_context && SPEC_JURISDICTIONS[facts.jurisdiction_context]) return facts.jurisdiction_context;
  return null;
}

/**
 * Specification-vs-application guard.
 * Full filing-route requests must NOT stay in the standalone specification flow.
 */
export function detectFilingRouteRequest(text = '') {
  const t = String(text || '').toLowerCase();
  if (/\b(full|complete|entire)\b.{0,20}\bpct\b.{0,20}\bapplication\b|\bprepare the full pct application\b|\bfile.{0,20}\bpct\b/i.test(t) && !/specification|description only|detailed description/i.test(t)) {
    return { route: 'pct-international-patent-application', reason: 'Full PCT filing request' };
  }
  if (/\beuropean\b.{0,20}\bpatent\b.{0,20}\bapplication\b|\bdirect\s+ep\b.{0,10}\b(application|filing)\b/i.test(t) && !/specification|description/i.test(t)) {
    return { route: 'european-patent-application', reason: 'Full EP filing request' };
  }
  if (/\b(draft|prepare|write)\b.{0,30}\bpatent claims\b|\bclaim set\b|\bclaims set\b/i.test(t) && !/specification|support|description/i.test(t)) {
    return { route: 'patent-claims-set', reason: 'Standalone claims request' };
  }
  if (/\b(draft|prepare|write)\b.{0,30}\bpatent abstract\b/i.test(t) && !/specification/i.test(t)) {
    return { route: 'patent-abstract', reason: 'Standalone abstract request' };
  }
  if (/\b(non-?provisional|provisional|utility patent|national phase)\b.{0,20}\bapplication\b/i.test(t) && !/specification/i.test(t)) {
    return { route: 'filing-route', reason: 'Filing-route application request' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Matter context first
// ---------------------------------------------------------------------------

export function extractPatentSpecificationMatterFacts(matterContext = {}) {
  const { facts: baseFacts, status: baseStatus } = extractMatterFacts(matterContext);
  const facts = {};
  const status = {};
  const rawFacts = Array.isArray(matterContext?.facts) ? matterContext.facts : [];
  const documents = Array.isArray(matterContext?.source_documents)
    ? matterContext.source_documents
    : Array.isArray(matterContext?.documents) ? matterContext.documents : [];
  const matter = matterContext?.matter || {};

  const assign = (key, value, conf = 1) => {
    const text = normalizeSpecWhitespace(asText(value));
    if (!text) return;
    facts[key] = text;
    status[key] = conf >= 0.8 ? 'KNOWN' : 'INFERRED';
  };

  if (baseFacts.title) { facts.title = baseFacts.title; status.title = baseStatus.title || 'KNOWN'; }
  if (baseFacts.applicant) { facts.applicant = baseFacts.applicant; status.applicant = baseStatus.applicant || 'KNOWN'; }
  if (baseFacts.inventors) { facts.inventors = baseFacts.inventors; status.inventors = baseStatus.inventors || 'KNOWN'; }

  const jurisdictionFound = findMatterFact(rawFacts, ['jurisdiction', 'filing_jurisdiction', 'jurisdiction_context'])
    || (matter.jurisdictions?.[0] ? { text: String(matter.jurisdictions[0]), confidence: 0.9 } : null);
  if (jurisdictionFound) {
    const j = /pct/i.test(jurisdictionFound.text) ? 'PCT' : /ep|european/i.test(jurisdictionFound.text) ? 'EP' : /us/i.test(jurisdictionFound.text) ? 'US' : 'OTHER';
    facts.jurisdiction_context = j;
    status.jurisdiction_context = jurisdictionFound.confidence >= 0.8 ? 'KNOWN' : 'INFERRED';
  }

  const mappings = [
    ['technical_field', ['technical_field', 'field', 'technical_domain']],
    ['problem_being_solved', ['technical_problem', 'problem', 'problem_need', 'problem_being_solved']],
    ['core_inventive_concept', ['core_solution', 'core_inventive_concept', 'technical_solution', 'technical_mechanism', 'how_it_works']],
    ['components_or_steps', ['principal_components', 'components', 'components_or_steps', 'method_steps', 'major_components']],
    ['technical_effects', ['technical_effect', 'effect', 'technical_result', 'advantage']],
    ['alternative_embodiments', ['alternative_embodiments', 'alternatives', 'variations']],
    ['examples_use_cases', ['examples', 'examples_use_cases', 'use_cases']],
    ['experimental_data', ['experimental_data', 'test_results', 'test_data']],
    ['invention_disclosure', ['invention_disclosure', 'disclosure', 'disclosure_text']],
    ['existing_claims', ['claims', 'claims_text', 'claim_set', 'claim_set_text', 'existing_claims']],
    ['drawings', ['drawings', 'figures', 'figure_plan', 'drawings_description']],
    ['prior_art', ['prior_art', 'known_prior_art', 'background_art']],
    ['invention_type', ['invention_type', 'technology_type']],
  ];
  for (const [key, types] of mappings) {
    const found = findMatterFact(rawFacts, types);
    if (found) assign(key, found.text, found.confidence);
  }

  // Direct matter-object fields (matter-first, no re-ask)
  if (!facts.title && (matter.title || matter.invention_title)) assign('title', matter.title || matter.invention_title, 0.9);
  if (!facts.technical_field && matter.technical_field) assign('technical_field', matter.technical_field, 0.9);
  if (!facts.problem_being_solved && (matter.problem || matter.technical_problem)) assign('problem_being_solved', matter.problem || matter.technical_problem, 0.85);
  if (!facts.core_inventive_concept && (matter.core_concept || matter.technical_disclosure || matter.description)) {
    assign('core_inventive_concept', matter.core_concept || matter.technical_disclosure || matter.description, 0.85);
  }
  if (!facts.components_or_steps && (matter.components || matter.technical_features)) assign('components_or_steps', matter.components || matter.technical_features, 0.85);
  if (!facts.invention_disclosure && matter.invention_disclosure) assign('invention_disclosure', matter.invention_disclosure, 0.9);
  if (!facts.existing_claims && (matter.claims || matter.claims_text)) assign('existing_claims', matter.claims || matter.claims_text, 0.9);
  if (!facts.drawings && matter.drawings) assign('drawings', matter.drawings, 0.85);
  if (!facts.invention_type && matter.invention_type) assign('invention_type', String(matter.invention_type).toUpperCase(), 0.8);

  const spec = findSourceDocument(documents, ['SPECIFICATION', 'PATENT_SPECIFICATION']);
  const claims = findSourceDocument(documents, ['CLAIMS', 'CLAIM_SET', 'PATENT_CLAIMS']);
  const disclosure = findSourceDocument(documents, ['INVENTION_DISCLOSURE', 'DISCLOSURE']);
  const sources = {
    specification: spec || { id: null, version: null, text: '' },
    claims: claims || { id: null, version: null, text: '' },
    disclosure: disclosure || { id: null, version: null, text: '' },
  };
  if (sources.specification.text && !facts.specification_text) { facts.specification_text = sources.specification.text; status.specification_text = 'KNOWN'; }
  if (sources.claims.text && !facts.existing_claims) { facts.existing_claims = sources.claims.text; status.existing_claims = 'KNOWN'; }
  if (sources.disclosure.text && !facts.invention_disclosure) { facts.invention_disclosure = sources.disclosure.text; status.invention_disclosure = 'KNOWN'; }

  if (!facts.invention_type && (facts.core_inventive_concept || facts.problem_being_solved)) {
    facts.invention_type = inferInventionType(`${facts.core_inventive_concept || ''} ${facts.problem_being_solved || ''} ${facts.components_or_steps || ''}`);
    status.invention_type = 'INFERRED';
  }

  if (!facts.drafting_mode) {
    facts.drafting_mode = detectPatentSpecificationMode('', facts);
    status.drafting_mode = 'INFERRED';
  }
  if (!facts.jurisdiction_context) {
    facts.jurisdiction_context = 'UNDECIDED';
    status.jurisdiction_context = 'INFERRED';
  }

  return { facts, status, sources };
}

// ---------------------------------------------------------------------------
// Canonical one-question DAG
// ---------------------------------------------------------------------------

function branchMechanismQuestion(inventionType) {
  if (inventionType === 'SOFTWARE' || inventionType === 'AI_ML' || inventionType === 'COMPUTER_IMPLEMENTED') {
    return 'How does the system work technically? Describe the architecture, modules, data flow, inputs, outputs, and processing steps from input to output — without inventing protocols or components.';
  }
  if (inventionType === 'MECHANICAL' || inventionType === 'DEVICE' || inventionType === 'APPARATUS') {
    return 'How does the device operate? Walk me through the components, physical arrangement, connections, movement, and operation — without inventing measurements or materials.';
  }
  if (inventionType === 'CHEMICAL' || inventionType === 'COMPOSITION' || inventionType === 'PHARMACEUTICAL') {
    return 'What is the composition, including components, concentrations/ranges, preparation, and conditions? Provide only supported values — do not invent experimental data. (Specialist review may be required.)';
  }
  if (inventionType === 'BIOTECH') {
    return 'What are the biological elements (sequences, cell lines, assays), preparation, and observed activity? Provide only supported information. (Specialist review may be required.)';
  }
  return 'How does the invention work? Walk me step-by-step through what happens when it is made and used.';
}

export const CANONICAL_SPEC_QUESTIONS = [
  {
    question_id: 'q_jurisdiction_context',
    field: 'jurisdiction_context',
    question: 'First, is this specification intended for a particular filing route or jurisdiction, such as a US, PCT or European application?',
    reason: 'Determines terminology adaptation; explicit UNDECIDED is allowed (neutral mode).',
    required: true,
    blocking: false,
    dependencies: [],
    modes: null,
    skip_if: (facts) => Boolean(facts._jurisdictionConfirmed || (facts.jurisdiction_context && facts.jurisdiction_context !== 'UNDECIDED' && facts.jurisdiction_context !== 'UNKNOWN')),
  },
  {
    question_id: 'q_drafting_mode',
    field: 'drafting_mode',
    question: 'Do you want a full patent specification, or only a particular section — for example, the detailed description, background, summary, or drawing descriptions?',
    reason: 'Avoids forcing a full draft when only one section is wanted.',
    required: false,
    blocking: false,
    dependencies: [],
    modes: null,
    skip_if: (facts) => Boolean(facts._draftingModeConfirmed || (facts.drafting_mode && facts.drafting_mode !== 'FULL_SPECIFICATION')),
  },
  {
    question_id: 'q_title',
    field: 'title',
    question: 'What working title should the specification use for the invention?',
    reason: 'Title anchors terminology consistency across all sections.',
    required: true,
    blocking: true,
    dependencies: [],
    modes: null,
    skip_if: (facts) => Boolean(facts.title && facts.title !== 'UNKNOWN'),
  },
  {
    question_id: 'q_technical_field',
    field: 'technical_field',
    question: 'What is the technical field of the invention?',
    reason: 'Technical Field section and matter classification.',
    required: true,
    blocking: true,
    dependencies: ['title'],
    modes: ['FULL_SPECIFICATION', 'DESCRIPTION_ONLY', 'SPECIFICATION_FROM_CLAIMS', 'SPECIFICATION_FROM_INVENTION_DISCLOSURE', 'SPECIFICATION_REVIEW', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => Boolean(facts.technical_field && facts.technical_field !== 'UNKNOWN'),
  },
  {
    question_id: 'q_problem',
    field: 'problem_being_solved',
    question: 'What specific technical problem does the invention solve, and what are the limitations of known approaches you are aware of?',
    reason: 'Background/Summary grounding without fabricating prior art.',
    required: true,
    blocking: true,
    dependencies: ['title'],
    modes: null,
    skip_if: (facts) => Boolean(facts.problem_being_solved && facts.problem_being_solved !== 'UNKNOWN' && String(facts.problem_being_solved).length >= 15),
  },
  {
    question_id: 'q_core_concept',
    field: 'core_inventive_concept',
    question: (facts) => branchMechanismQuestion(facts.invention_type || 'OTHER'),
    reason: 'Core disclosure for Detailed Description and claim support (enablement).',
    required: true,
    blocking: true,
    dependencies: ['problem_being_solved'],
    modes: null,
    skip_if: (facts) => Boolean(facts.core_inventive_concept && facts.core_inventive_concept !== 'UNKNOWN' && String(facts.core_inventive_concept).length >= 25),
  },
  {
    question_id: 'q_components',
    field: 'components_or_steps',
    question: (facts) => {
      const t = facts.invention_type || 'OTHER';
      if (t === 'SOFTWARE' || t === 'AI_ML' || t === 'COMPUTER_IMPLEMENTED') return 'What are the main modules, components, interfaces, inputs, outputs, and computing environment? List only what exists — do not invent code or protocols.';
      if (t === 'MECHANICAL' || t === 'DEVICE' || t === 'APPARATUS' || t === 'ELECTRONICS') return 'What are the main components, their arrangement, connections, and how do they interact during operation?';
      if (t === 'CHEMICAL' || t === 'COMPOSITION' || t === 'PHARMACEUTICAL' || t === 'BIOTECH' || t === 'MATERIALS') return 'What are the components, variants, formulations, and preparation conditions? Give only supported ranges and examples.';
      return 'What are the key components, structural elements, or method steps, and how do they relate to each other?';
    },
    reason: 'Component/relationship disclosure; basis for embodiments and claim mapping.',
    required: true,
    blocking: true,
    dependencies: ['core_inventive_concept'],
    modes: null,
    skip_if: (facts) => Boolean(facts.components_or_steps && facts.components_or_steps !== 'UNKNOWN' && String(facts.components_or_steps).length >= 15),
  },
  {
    question_id: 'q_operation',
    field: 'operation',
    question: 'How do these components or steps interact in practice to achieve the result? Include implementation options and technical effects only where supported.',
    reason: 'Relationships + making/using disclosure; broad-to-narrow support.',
    required: false,
    blocking: false,
    dependencies: ['components_or_steps'],
    modes: ['FULL_SPECIFICATION', 'DESCRIPTION_ONLY', 'DETAILED_DESCRIPTION_ONLY', 'EMBODIMENT_EXPANSION', 'SPECIFICATION_FROM_CLAIMS', 'SPECIFICATION_FROM_INVENTION_DISCLOSURE', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => Boolean(facts.operation && facts.operation !== 'UNKNOWN'),
  },
  {
    question_id: 'q_essential_optional',
    field: 'essential_optional',
    question: 'Which features are essential for the invention to work, and which are preferred, optional, or example-only? For example, is any sensor, camera, or module strictly required or optional?',
    reason: 'Preserves essential/preferred/optional distinctions; prevents accidental mandatory language.',
    required: false,
    blocking: false,
    dependencies: ['components_or_steps'],
    modes: null,
    skip_if: (facts) => Boolean(facts.essential_optional && facts.essential_optional !== 'UNKNOWN'),
  },
  {
    question_id: 'q_alternatives',
    field: 'alternative_embodiments',
    question: 'Are there alternative ways to implement the invention — for example, could an optical sensor be replaced by another sensor type, or processing be local versus remote? Describe only known alternatives.',
    reason: 'Alternative-embodiment discovery without fabrication; fallback positions.',
    required: false,
    blocking: false,
    dependencies: ['components_or_steps'],
    modes: ['FULL_SPECIFICATION', 'EMBODIMENT_EXPANSION', 'SPECIFICATION_FROM_CLAIMS', 'SPECIFICATION_FROM_INVENTION_DISCLOSURE', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => facts.alternative_embodiments !== undefined,
  },
  {
    question_id: 'q_examples',
    field: 'examples_use_cases',
    question: 'Are there concrete examples or experimental results? Distinguish tested results from hypothetical illustrations — if nothing has been tested, say so and no performance numbers will be invented.',
    reason: 'Actual vs prophetic example discipline; quantitative-result safety.',
    required: false,
    blocking: false,
    dependencies: ['core_inventive_concept'],
    modes: ['FULL_SPECIFICATION', 'EMBODIMENT_EXPANSION', 'SPECIFICATION_FROM_INVENTION_DISCLOSURE', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => facts.examples_use_cases !== undefined || facts.experimental_data !== undefined,
  },
  {
    question_id: 'q_drawings',
    field: 'drawings',
    question: 'Are there drawings or planned figures (e.g. FIG. 1 system diagram)? For each figure, list the figure number, what it shows, and any reference numerals with their component names.',
    reason: 'Figure-aware drafting; numeral consistency (orphan/conflicting/undefined).',
    required: false,
    blocking: false,
    dependencies: ['components_or_steps'],
    modes: ['FULL_SPECIFICATION', 'DRAWING_DESCRIPTIONS_ONLY', 'SPECIFICATION_FROM_CLAIMS', 'SPECIFICATION_FROM_INVENTION_DISCLOSURE', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => facts.drawings !== undefined,
  },
  {
    question_id: 'q_claims',
    field: 'existing_claims',
    question: 'Do claims already exist for this invention? If so, paste them — they will be mapped to disclosure for support, but they do not substitute for technical detail and no embodiments will be invented to match them.',
    reason: 'Claim-aware specification; support mapping SUPPORTED/PARTIAL/UNSUPPORTED.',
    required: false,
    blocking: false,
    dependencies: [],
    modes: ['FULL_SPECIFICATION', 'SPECIFICATION_FROM_CLAIMS', 'SPECIFICATION_REVIEW', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => facts.existing_claims !== undefined,
  },
  {
    question_id: 'q_prior_art',
    field: 'prior_art',
    question: 'Is there known prior art or background context to reflect? Provide references only if known — nothing will be fabricated and nothing supplied is automatically admitted to be legally prior art.',
    reason: 'Background safety; neutral drafting where evidence is absent.',
    required: false,
    blocking: false,
    dependencies: ['problem_being_solved'],
    modes: ['FULL_SPECIFICATION', 'DESCRIPTION_ONLY', 'BACKGROUND_ONLY', 'SPECIFICATION_REVISION'],
    skip_if: (facts) => facts.prior_art !== undefined,
  },
  {
    question_id: 'q_priority_revision',
    field: 'priority_existing_spec',
    question: 'Is this specification a revision of an existing or priority-based draft? If so, identify the earlier draft so added content can be tracked as potentially new matter.',
    reason: 'New-matter awareness; basis mapping for amendments/EP support.',
    required: false,
    blocking: false,
    dependencies: [],
    modes: ['SPECIFICATION_REVISION', 'SPECIFICATION_REVIEW', 'FULL_SPECIFICATION'],
    skip_if: (facts) => facts.priority_existing_spec !== undefined,
  },
];

function questionAppliesToMode(q, mode) {
  if (!q.modes) return true;
  return q.modes.includes(mode || 'FULL_SPECIFICATION');
}

function buildReadinessSummary(facts = {}, flags = [], completeness = null) {
  const items = [
    `Working title: "${facts.title && facts.title !== 'UNKNOWN' ? facts.title : 'To be supplied'}"`,
    `Filing context: ${facts.jurisdiction_context || 'UNDECIDED'}`,
    `Drafting mode: ${facts.drafting_mode || 'FULL_SPECIFICATION'}`,
    `Core concept: ${facts.core_inventive_concept && facts.core_inventive_concept !== 'UNKNOWN' ? String(facts.core_inventive_concept).slice(0, 140) + '...' : 'To be captured'}`,
    `Components/steps: ${facts.components_or_steps && facts.components_or_steps !== 'UNKNOWN' ? String(facts.components_or_steps).slice(0, 140) + '...' : 'To be captured'}`,
    `Embodiments/alternatives: ${facts.alternative_embodiments ? String(facts.alternative_embodiments).slice(0, 120) + '...' : 'None supplied yet'}`,
    `Claims: ${facts.existing_claims ? 'Supplied — support will be mapped, gaps flagged.' : 'None supplied.'}`,
    `Figures: ${facts.drawings ? String(facts.drawings).slice(0, 120) + '...' : 'None supplied.'}`,
  ];
  const unknowns = [];
  if (!facts.title || facts.title === 'UNKNOWN') unknowns.push('title');
  if (!facts.technical_field || facts.technical_field === 'UNKNOWN') unknowns.push('technical field');
  if (!facts.problem_being_solved || facts.problem_being_solved === 'UNKNOWN') unknowns.push('problem');
  if (!facts.core_inventive_concept || facts.core_inventive_concept === 'UNKNOWN') unknowns.push('core concept');
  const lines = [
    'I have enough information to prepare the first patent specification draft.',
    '',
    '**Summary of established information:**',
    ...items.map((i) => `• ${i}`),
  ];
  if (unknowns.length) lines.push('', `Important unknowns (left as placeholders, not invented): ${unknowns.join(', ')}.`);
  if (completeness) lines.push('', `Disclosure completeness: ${completeness.overall} (${completeness.sufficientCount}/${completeness.totalDimensions} dimensions sufficient).`);
  if (flags.length) lines.push('', `**Review flags:** ${[...new Set(flags)].join(', ')}.`);
  lines.push('', 'I have enough information to prepare the first patent specification draft. Would you like me to proceed?');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main step evaluator
// ---------------------------------------------------------------------------

export function evaluatePatentSpecificationInterviewStep({
  session = {},
  messages = [],
  latestMessage = '',
  matterContext = {},
  attachments = [],
} = {}) {
  const latestText = String(latestMessage || '').trim();
  let facts = { ...(session.facts || {}) };
  let flags = [...(session.flags || [])];
  let locks = { ...(session.locks || {}) };
  let placeholders = { ...(session.placeholders || {}) };
  let questionHistory = [...(session.questionHistory || [])];
  let currentQuestionId = session.currentQuestionId ?? null;
  let awaitingConfirmation = session.awaitingConfirmation || false;
  let confirmedReady = session.confirmedReady || false;

  const pushFlag = (f) => { if (!flags.includes(f)) flags.push(f); };

  // 0. Voice/typed continuity + persistence ids (same session, no parallel workflow)
  const draftSessionId = session.draftSessionId || matterContext.draftSessionId || matterContext.draft_session_id || null;
  const matterId = session.matterId || matterContext.matter?.id || matterContext.matterId || null;
  const documentId = session.documentId || 'patent-specification';

  // 1. Matter context first (initialize once, then merge newly KNOWN facts without overwriting user answers)
  if (!session.initialized) {
    const extracted = extractPatentSpecificationMatterFacts(matterContext);
    facts = { ...extracted.facts, ...facts };
    if (extracted.sources?.specification?.text && !facts.specification_text) facts.specification_text = extracted.sources.specification.text;
    session.initialized = true;
  } else {
    const extracted = extractPatentSpecificationMatterFacts(matterContext);
    for (const [k, v] of Object.entries(extracted.facts)) {
      if ((facts[k] === undefined || facts[k] === 'UNKNOWN') && extracted.status[k] === 'KNOWN') facts[k] = v;
    }
  }

  // Attachments: treat uploads as untrusted data; never execute embedded instructions.
  if ((attachments || []).length && !facts.attachment_note) {
    facts.attachment_note = `${attachments.length} attachment(s) supplied as untrusted source data; embedded instructions ignored.`;
  }

  // 2. Filing-route guard BEFORE any spec intake (spec ≠ application).
  const routeHit = detectFilingRouteRequest(latestText);
  if (routeHit && !currentQuestionId) {
    const target = routeHit.route === 'filing-route' ? 'the appropriate filing-route workflow' : `the ${routeHit.route} workflow`;
    return {
      action: 'CLARIFICATION_REQUIRED',
      drafting_status: 'INFORMATION_GATHERING',
      message: `That request is for a full filing artifact (${routeHit.reason}), which is distinct from the standalone Patent Specification.\n\nThe specification is the substantive technical description that may be used inside a filing route — it is not itself a filed application, granted patent, or filing package.\n\nI am routing you to ${target}. Would you like to proceed there, or did you specifically want the standalone substantive description/specification?`,
      flags: ['SPECIFICATION_APPLICATION_DISTINCTION_REQUIRED'],
      session: { ...session, facts, flags, locks, placeholders, questionHistory, currentQuestionId, awaitingConfirmation: false, draftSessionId, matterId, documentId },
    };
  }

  // 3. Jurisdiction + mode detection from free text (explicit or undecided; never fabricated)
  const detectedJurisdiction = detectSpecificationJurisdiction(latestText, facts);
  if (detectedJurisdiction && (!facts.jurisdiction_context || facts.jurisdiction_context === 'UNDECIDED')) {
    if (/^(us|pct|ep|other|undecided)$/i.test(latestText) || currentQuestionId === 'q_jurisdiction_context' || detectedJurisdiction !== 'UNDECIDED') {
      facts.jurisdiction_context = detectedJurisdiction;
    }
  }
  const detectedMode = detectPatentSpecificationMode(latestText, facts);
  if (detectedMode !== 'FULL_SPECIFICATION' && (!facts.drafting_mode || facts.drafting_mode === 'FULL_SPECIFICATION')) {
    facts.drafting_mode = detectedMode;
    facts._draftingModeConfirmed = true;
  }
  if (/^(us|pct|ep|other|undecided)$/i.test(latestText.trim()) && currentQuestionId === 'q_jurisdiction_context') {
    const v = latestText.trim().toUpperCase();
    facts.jurisdiction_context = SPEC_JURISDICTIONS[v] ? v : facts.jurisdiction_context;
  }

  // 4. Confirmation gate: draft only after explicit permission.
  if (awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        readiness: SPEC_READINESS_STATES.READY_FOR_FIRST_DRAFT,
        facts,
        jurisdiction: facts.jurisdiction_context || 'UNDECIDED',
        message: 'Understood. Preparing the first patent specification draft from supported facts only.',
        session: { ...session, facts, flags: [...new Set(flags)], locks, placeholders, questionHistory, currentQuestionId: null, awaitingConfirmation: false, confirmedReady: true, draftSessionId, matterId, documentId, drafting_mode: facts.drafting_mode, jurisdiction_context: facts.jurisdiction_context },
      };
    }
    if (!isSkipOrUnknown(latestText) && latestText) {
      // User added information instead of confirming — fall through to answer processing.
      awaitingConfirmation = false;
    } else if (isSkipOrUnknown(latestText)) {
      awaitingConfirmation = false;
    }
  }

  // 5. Lock / edit intents (collaborative drafting; locked sections preserved).
  const lockMatch = latestText.match(/\block\b.{0,20}\b(summary|detailed description|background|embodiments?|examples?|drawings?|title)\b/i);
  if (lockMatch && currentQuestionId === null) {
    const key = lockMatch[1].toLowerCase().startsWith('detailed') ? 'detailed_description' : lockMatch[1].toLowerCase().startsWith('back') ? 'background' : lockMatch[1].toLowerCase().startsWith('embod') ? 'embodiments' : lockMatch[1].toLowerCase().startsWith('exam') ? 'examples' : lockMatch[1].toLowerCase().startsWith('draw') ? 'brief_description_drawings' : lockMatch[1].toLowerCase();
    locks[key] = SPEC_LOCK_STATUSES.USER_LOCKED;
    return {
      action: 'ASK_QUESTION',
      drafting_status: 'INFORMATION_GATHERING',
      message: `Locked section "${key}" — regenerating other sections will not overwrite it.`,
      single_question: getNextSpecQuestion(facts) ? toQuestionShape(getNextSpecQuestion(facts), facts, true) : null,
      session: { ...session, facts, flags: [...new Set(flags)], locks, placeholders, questionHistory, currentQuestionId: getNextSpecQuestion(facts)?.question_id || null, awaitingConfirmation: false, draftSessionId, matterId, documentId },
      readiness: assessSpecificationReadiness(facts, facts.drafting_mode),
    };
  }

  // 6. Process answer to pending question.
  const isColdDraftRequest = !currentQuestionId && /draft|prepare|write|turn into|specification|description/i.test(latestText);
  if (currentQuestionId && !isColdDraftRequest && latestText) {
    const correction = detectFactCorrection(latestText, facts);
    if (correction) {
      facts[correction.field === 'components' ? 'components_or_steps' : correction.field] = correction.value;
    } else {
      const qObj = CANONICAL_SPEC_QUESTIONS.find((q) => q.question_id === currentQuestionId)
        || (currentQuestionId === 'q_claim_support_followup' ? { question_id: 'q_claim_support_followup', field: 'core_inventive_concept', required: false, blocking: false } : null);
      if (qObj) {
        const field = qObj.field;
        if (isSkipOrUnknown(latestText)) {
          if (qObj.blocking) {
            placeholders[field] = `[UNKNOWN / TO BE DETERMINED: ${field}]`;
            facts[field] = 'UNKNOWN';
          } else {
            // Non-blocking: record UNKNOWN without forcing fabrication.
            if (facts[field] === undefined) facts[field] = 'UNKNOWN';
            placeholders[field] = `[NOT PROVIDED: ${field}]`;
          }
          if (field === 'jurisdiction_context') facts.jurisdiction_context = 'UNDECIDED';
          if (field === 'drafting_mode') facts.drafting_mode = 'FULL_SPECIFICATION';
        } else {
          // Field-specific capture with safety discipline
          if (field === 'jurisdiction_context') {
            facts.jurisdiction_context = detectSpecificationJurisdiction(latestText, facts) || 'UNDECIDED';
            facts._jurisdictionConfirmed = true;
          } else if (field === 'drafting_mode') {
            facts.drafting_mode = detectPatentSpecificationMode(latestText, facts);
            facts._draftingModeConfirmed = true;
          } else if (field === 'existing_claims') {
            facts.existing_claims = latestText;
            facts.drafting_mode = facts.drafting_mode === 'FULL_SPECIFICATION' ? 'SPECIFICATION_FROM_CLAIMS' : facts.drafting_mode;
          } else if (field === 'essential_optional') {
            facts.essential_optional = latestText;
            facts.feature_classes = facts.feature_classes || {};
            const cleanFeature = (s = '') => String(s).trim().toLowerCase().replace(/^(the|a|an)\s+/i, '');
            const optMatch = latestText.match(/\b([a-z][a-z0-9 _-]{1,40})\s+is\s+optional\b/i);
            if (optMatch) facts.feature_classes[cleanFeature(optMatch[1])] = 'OPTIONAL';
            const essMatch = latestText.match(/\b([a-z][a-z0-9 _-]{1,40})\s+is\s+(essential|required|mandatory)\b/i);
            if (essMatch) facts.feature_classes[cleanFeature(essMatch[1])] = 'ESSENTIAL';
          } else if (field === 'examples_use_cases') {
            facts.examples_use_cases = latestText;
            if (/(have not tested|not (yet )?tested|no (test|experimental) data|untested|concept(ual)? only|no prototype)/i.test(latestText)) {
              facts.development_status = 'CONCEPT_ONLY';
              facts.experimental_data_status = 'NOT_TESTED';
            }
          } else if (field === 'drawings') {
            facts.drawings = latestText;
          } else if (field === 'prior_art') {
            facts.prior_art = latestText;
          } else if (field === 'invention_type') {
            facts.invention_type = String(latestText).trim().toUpperCase();
          } else {
            facts[field] = latestText;
          }

          // Invention-type inference + specialist flags (no legal conclusions)
          if ((field === 'problem_being_solved' || field === 'core_inventive_concept' || field === 'components_or_steps') && !facts.invention_type) {
            facts.invention_type = inferInventionType(`${facts.problem_being_solved || ''} ${facts.core_inventive_concept || ''} ${facts.components_or_steps || ''} ${latestText}`);
          }
          if (facts.invention_type === 'CHEMICAL' || facts.invention_type === 'PHARMACEUTICAL' || facts.invention_type === 'BIOTECH') {
            pushFlag(SPEC_REVIEW_FLAGS.SPECIALIST_REVIEW_REQUIRED);
          }
          // Optional-feature + terminology + numeral bookkeeping
          if (/\bis\b.{0,10}\boptional\b/i.test(latestText) && !facts.feature_classes) facts.feature_classes = { noted: 'OPTIONAL_FEATURE_SUPPLIED' };
          if (/\b(processor|controller)\b/i.test(latestText)) {
            facts.terminology_notes = [asText(facts.terminology_notes), latestText].filter(Boolean).join('\n');
          }
          // Change-impact: record edits for downstream analysis
          facts._lastChangedField = field;
        }
      }
    }
  } else if (!currentQuestionId && latestText && !isColdDraftRequest) {
    // Free-form technical detail offered without a pending question: attach conservatively.
    if (/\b(lidar|chemical sensor|ultrasonic|optical)\b/i.test(latestText) && facts.existing_claims) {
      facts.supplemental_technical_note = latestText;
      pushFlag(SPEC_REVIEW_FLAGS.NEW_MATTER_REVIEW_REQUIRED);
    }
  }

  // New-matter awareness for revisions
  if (facts.priority_existing_spec && facts.core_inventive_concept && !facts._newMatterChecked) {
    pushFlag(SPEC_REVIEW_FLAGS.NEW_MATTER_REVIEW_REQUIRED);
    facts._newMatterChecked = true;
  }

  // 7. Readiness (drafting-readiness measure, not legal sufficiency opinion)
  const completeness = assessDisclosureCompleteness(facts);
  const readiness = assessSpecificationReadiness(facts, facts.drafting_mode || 'FULL_SPECIFICATION');

  if (readiness === SPEC_READINESS_STATES.READY_FOR_FIRST_DRAFT && !confirmedReady && !awaitingConfirmation) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness,
      message: buildReadinessSummary(facts, flags, completeness),
      session: { ...session, facts, flags: [...new Set(flags)], locks, placeholders, questionHistory, currentQuestionId: null, awaitingConfirmation: true, draftSessionId, matterId, documentId, drafting_mode: facts.drafting_mode, jurisdiction_context: facts.jurisdiction_context, completeness },
      facts,
    };
  }

  // 8. Next single question (exactly one)
  const nextQ = getNextSpecQuestion(facts);
  if (!nextQ) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness,
      message: buildReadinessSummary(facts, flags, completeness),
      session: { ...session, facts, flags: [...new Set(flags)], locks, placeholders, questionHistory, currentQuestionId: null, awaitingConfirmation: true, draftSessionId, matterId, documentId, drafting_mode: facts.drafting_mode, jurisdiction_context: facts.jurisdiction_context, completeness },
      facts,
    };
  }

  const shaped = toQuestionShape(nextQ, facts, !currentQuestionId && isColdDraftRequest);
  return {
    action: 'ASK_QUESTION',
    drafting_status: 'INFORMATION_GATHERING',
    readiness,
    message: shaped.question,
    single_question: shaped,
    questions: [shaped],
    session: {
      ...session, facts, flags: [...new Set(flags)], locks, placeholders,
      currentQuestionId: nextQ.question_id,
      questionHistory: [...questionHistory, nextQ.question_id],
      awaitingConfirmation: false,
      draftSessionId, matterId, documentId,
      drafting_mode: facts.drafting_mode, jurisdiction_context: facts.jurisdiction_context,
      completeness,
    },
    facts,
    jurisdiction: facts.jurisdiction_context || 'UNDECIDED',
  };
}

function getNextSpecQuestion(facts) {
  // Prefer the shared helper for testability
  const mode = facts.drafting_mode || 'FULL_SPECIFICATION';
  if (facts.existing_claims && (!facts.core_inventive_concept || facts.core_inventive_concept === 'UNKNOWN')) {
    const support = buildClaimSupportMapForSpecification(asText(facts.existing_claims), facts, {});
    const unsupported = support.map.find((m) => m.status === 'UNSUPPORTED');
    if (unsupported) {
      return {
        question_id: 'q_claim_support_followup',
        field: 'core_inventive_concept',
        question: `Your claims recite "${String(unsupported.limitation).slice(0, 120)}" which is not yet described in the supplied disclosure. How is this limitation implemented — using only known technical detail?`,
        reason: 'Targeted claim-support follow-up; no embodiment will be invented.',
        required: false,
        is_follow_up: true,
      };
    }
  }
  for (const q of CANONICAL_SPEC_QUESTIONS) {
    if (q.modes && !q.modes.includes(mode)) continue;
    const depsMet = (q.dependencies || []).every((d) => Boolean(facts[d] && facts[d] !== 'UNKNOWN'));
    if (!depsMet) continue;
    try { if (q.skip_if(facts)) continue; } catch { continue; }
    return q;
  }
  return null;
}

function toQuestionShape(q, facts, isColdStart) {
  const text = typeof q.question === 'function' ? q.question(facts) : q.question;
  const intro = isColdStart
    ? 'Absolutely. I can help you prepare the specification.\n\nI\'ll ask you a few questions one at a time so I can understand the invention and the intended filing context before preparing the first draft.\n\n'
    : '';
  return {
    question_id: q.question_id,
    field: q.field,
    question: `${intro}${text}`,
    raw_question: text,
    reason: q.reason || 'Specification intake.',
    required: q.required || false,
    answer_type: q.field === 'jurisdiction_context' || q.field === 'drafting_mode' ? 'select' : 'text',
    is_follow_up: q.is_follow_up || false,
  };
}

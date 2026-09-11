/**
 * SALLYIP PATENT SPECIFICATION DRAFTING SERVICE — DOCUMENT #009
 *
 * Deterministic, source-grounded helpers for the standalone Patent Specification
 * workflow. This is the substantive technical specification component (description,
 * embodiments, drawings) that may later be used inside US / PCT / EP filing routes.
 * It is NOT itself a filed application, granted patent, filing package, or
 * substitute for jurisdiction-specific forms.
 *
 * Hard rules (no exceptions):
 * - Never invent technical components, materials, dimensions, algorithms,
 *   performance, experiments, prior art, inventors, dates, figures, or examples.
 * - Unknown stays UNKNOWN / PLACEHOLDER. Hypothetical examples are labelled.
 * - Claims are NOT permission to invent embodiments. Unsupported limitations stay
 *   UNSUPPORTED — never silently cured by inserting disclosure.
 * - Legal/process statements (USPTO/EPO/PCT rules, statutes, deadlines) must use
 *   verified authority; this service emits none by itself.
 * - Confidential content must never route to unapproved/free providers
 *   (CONFIDENTIAL_PILOT_BLOCKED, fail-closed via provider-policy).
 */

export const SPEC_READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  READY_FOR_FIRST_DRAFT: 'READY_FOR_FIRST_DRAFT',
};

export const SPEC_REVIEW_FLAGS = {
  DISCLOSURE_TIMING_REVIEW_REQUIRED: 'DISCLOSURE_TIMING_REVIEW_REQUIRED',
  INVENTORSHIP_REVIEW_REQUIRED: 'INVENTORSHIP_REVIEW_REQUIRED',
  UNSUPPORTED_LIMITATION_FLAGGED: 'UNSUPPORTED_LIMITATION_FLAGGED',
  SUBJECT_MATTER_101_RISK: 'SUBJECT_MATTER_101_RISK',
  CONFIDENTIAL_MATTER_UNPUBLISHED: 'CONFIDENTIAL_MATTER_UNPUBLISHED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
  NEW_MATTER_REVIEW_REQUIRED: 'NEW_MATTER_REVIEW_REQUIRED',
  SPECIALIST_REVIEW_REQUIRED: 'SPECIALIST_REVIEW_REQUIRED',
  TERMINOLOGY_CONFLICT_DETECTED: 'TERMINOLOGY_CONFLICT_DETECTED',
  DRAWING_CONSISTENCY_REVIEW_REQUIRED: 'DRAWING_CONSISTENCY_REVIEW_REQUIRED',
  INTERNAL_TECHNICAL_CONTRADICTION: 'INTERNAL_TECHNICAL_CONTRADICTION',
  OVER_NARROWING_REVIEW_REQUIRED: 'OVER_NARROWING_REVIEW_REQUIRED',
  BACKGROUND_ADMISSION_REVIEW_REQUIRED: 'BACKGROUND_ADMISSION_REVIEW_REQUIRED',
  EXPERIMENTAL_DATA_UNVERIFIED: 'EXPERIMENTAL_DATA_UNVERIFIED',
  HYPOTHETICAL_EXAMPLE_LABEL_REQUIRED: 'HYPOTHETICAL_EXAMPLE_LABEL_REQUIRED',
};

export const SPEC_PROVENANCE_STATES = {
  USER_PROVIDED: 'USER_PROVIDED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  SOURCE_DOCUMENT: 'SOURCE_DOCUMENT',
  SOURCE_IMAGE: 'SOURCE_IMAGE',
  CLAIM_DERIVED: 'CLAIM_DERIVED',
  AI_DRAFTED: 'AI_DRAFTED',
  USER_EDITED: 'USER_EDITED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  PLACEHOLDER: 'PLACEHOLDER',
};

export const SPEC_LOCK_STATUSES = {
  UNLOCKED: 'UNLOCKED',
  USER_LOCKED: 'USER_LOCKED',
  REVIEW_LOCKED: 'REVIEW_LOCKED',
};

export const SPEC_DRAFTING_MODES = {
  FULL_SPECIFICATION: 'FULL_SPECIFICATION',
  DESCRIPTION_ONLY: 'DESCRIPTION_ONLY',
  DETAILED_DESCRIPTION_ONLY: 'DETAILED_DESCRIPTION_ONLY',
  BACKGROUND_ONLY: 'BACKGROUND_ONLY',
  SUMMARY_ONLY: 'SUMMARY_ONLY',
  DRAWING_DESCRIPTIONS_ONLY: 'DRAWING_DESCRIPTIONS_ONLY',
  EMBODIMENT_EXPANSION: 'EMBODIMENT_EXPANSION',
  SPECIFICATION_FROM_CLAIMS: 'SPECIFICATION_FROM_CLAIMS',
  SPECIFICATION_FROM_INVENTION_DISCLOSURE: 'SPECIFICATION_FROM_INVENTION_DISCLOSURE',
  SPECIFICATION_REVIEW: 'SPECIFICATION_REVIEW',
  SPECIFICATION_REVISION: 'SPECIFICATION_REVISION',
};

export const SPEC_JURISDICTIONS = {
  US: 'US',
  PCT: 'PCT',
  EP: 'EP',
  OTHER: 'OTHER',
  UNDECIDED: 'UNDECIDED',
};

export const SPEC_SUPPORT_STATUSES = {
  SUPPORTED: 'SUPPORTED',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN: 'UNKNOWN',
};

export const SPEC_FEATURE_CLASSES = {
  ESSENTIAL: 'ESSENTIAL',
  PREFERRED: 'PREFERRED',
  OPTIONAL: 'OPTIONAL',
  EXAMPLE_ONLY: 'EXAMPLE_ONLY',
  UNKNOWN: 'UNKNOWN',
};

export const SPEC_EXAMPLE_KINDS = {
  ACTUAL_EXAMPLE: 'ACTUAL_EXAMPLE',
  PROPHETIC_OR_HYPOTHETICAL_EXAMPLE: 'PROPHETIC_OR_HYPOTHETICAL_EXAMPLE',
  ILLUSTRATIVE_SCENARIO: 'ILLUSTRATIVE_SCENARIO',
};

export const SPEC_TECHNICAL_EFFECT_STATUSES = {
  USER_ASSERTED: 'USER_ASSERTED',
  SOURCE_SUPPORTED: 'SOURCE_SUPPORTED',
  INFERRED_REVIEW_REQUIRED: 'INFERRED_REVIEW_REQUIRED',
  UNSUPPORTED: 'UNSUPPORTED',
};

export const SPEC_NEW_MATTER_CLASSES = {
  SUPPORTED_BY_EXISTING_DISCLOSURE: 'SUPPORTED_BY_EXISTING_DISCLOSURE',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  NEWLY_ADDED: 'NEWLY_ADDED',
  UNCERTAIN: 'UNCERTAIN',
};

export const SPEC_SECTION_OPTIONALITY = {
  REQUIRED_FOR_CURRENT_TEMPLATE: 'REQUIRED_FOR_CURRENT_TEMPLATE',
  RECOMMENDED: 'RECOMMENDED',
  OPTIONAL: 'OPTIONAL',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const ABSOLUTE_SCOPE_RE = /\b(must|only|always|requires?\s+exactly|cannot|never|exclusively)\b/i;
const REFERENCE_NUMERAL_RE = /\b([A-Za-z][A-Za-z0-9 _-]{0,40}?)\s*\(?\s*(?:reference\s+numeral\s+)?(\d{2,4}[A-Z]?)\s*\)?/g;
const BARE_NUMERAL_RE = /(?:^|[\s(,;])(1[0-9]{2}|[2-9][0-9]{2}[A-Z]?)(?=[\s).,;:]|$)/g;
const QUANT_RESULT_RE = /(\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:x|times)\b|\b\d+(?:\.\d+)?\s?(?:ms|s|mhz|ghz|nm|mm|cm|accuracy|yield)\b)/i;
const HYPOTHETICAL_MARKERS = /(hypothetical|prophetic|illustrative|simulated|predicted|for illustration|not yet tested|has not been tested|conceptual)/i;

export function normalizeSpecWhitespace(text = '') {
  return String(text || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return asText(value.label ?? value.value ?? value.text ?? value.content ?? value.body ?? value.name ?? value.statement ?? '');
  }
  return String(value);
}

function normLower(text = '') {
  return normalizeSpecWhitespace(text).toLowerCase();
}

// ---------------------------------------------------------------------------
// Claims parsing (deterministic, no invention)
// ---------------------------------------------------------------------------

export function splitSpecificationClaims(claimsText = '') {
  const text = normalizeSpecWhitespace(asText(claimsText));
  if (!text) return [];
  const parts = text.split(/(?=^\s*\d+\s*[.)]\s+)/m).map((p) => p.trim()).filter(Boolean);
  const claims = parts.length > 1 ? parts : text.split(/;\s*(?=\d+\s*[.)])/).map((p) => p.trim()).filter(Boolean);
  const list = (claims.length ? claims : [text]).map((raw, idx) => {
    const m = raw.match(/^\s*(\d+)\s*[.)]\s*([\s\S]+)$/);
    return {
      claim_number: m ? Number(m[1]) : idx + 1,
      text: m ? m[2].trim() : raw,
    };
  });
  return list;
}

export function splitClaimLimitations(claimText = '') {
  const text = normalizeSpecWhitespace(claimText);
  if (!text) return [];
  // Split each claim into granular limitations on semicolons and commas so that
  // a single unsupported element (e.g. a LiDAR sensor) is never masked by
  // neighbouring supported elements in the same chunk.
  return text
    .split(/;\s*|\s*,\s*/)
    .map((s) => normalizeSpecWhitespace(s).replace(/^[,\s;]+|[,\s;]+$/g, ''))
    .filter((s) => s.length > 2);
}

function tokenizeSignificant(text = '') {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'by', 'on', 'as', 'is', 'are', 'be', 'said', 'wherein', 'whereby', 'comprising', 'comprises', 'including', 'having', 'system', 'method', 'device', 'apparatus', 'invention', 'uses', 'use', 'used', 'using', 'further', 'embodiment', 'embodiments', 'example', 'examples', 'that', 'this', 'which', 'from']);
  return normLower(text)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stop.has(t));
}

function limitationSupportedInDisclosure(limitation, disclosureText) {
  const disc = normLower(disclosureText);
  if (!disc || !normLower(limitation)) return false;
  const tokens = tokenizeSignificant(limitation);
  if (!tokens.length) return false;
  const hits = tokens.filter((t) => disc.includes(t)).length;
  // SUPPORTED requires all significant tokens present; PARTIALLY requires >= half.
  return { hits, total: tokens.length };
}

// ---------------------------------------------------------------------------
// Claim-aware specification: CLAIM -> LIMITATION -> SUPPORT -> SECTION ...
// ---------------------------------------------------------------------------

export function buildClaimSupportMapForSpecification(claimsText = '', disclosure = {}, sections = {}) {
  const disclosureText = [
    asText(disclosure.core_inventive_concept),
    asText(disclosure.technical_mechanism),
    asText(disclosure.components_or_steps),
    asText(disclosure.detailed_description_source),
    asText(disclosure.invention_disclosure),
    asText(sections.detailed_description),
    asText(sections.summary),
    asText(sections.embodiments),
  ].join('\n');
  const claims = splitSpecificationClaims(claimsText);
  const map = [];
  for (const claim of claims) {
    const limitations = splitClaimLimitations(claim.text);
    if (!limitations.length) {
      map.push({
        claim: claim.claim_number,
        limitation: claim.text.slice(0, 160),
        specification_support: 'No discrete limitation parsed; manual review required.',
        section: 'detailed_description',
        source: SPEC_PROVENANCE_STATES.CLAIM_DERIVED,
        status: SPEC_SUPPORT_STATUSES.UNKNOWN,
      });
      continue;
    }
    for (const limitation of limitations) {
      const check = limitationSupportedInDisclosure(limitation, disclosureText);
      let status = SPEC_SUPPORT_STATUSES.UNSUPPORTED;
      let support = 'No supporting disclosure found in provided technical facts. Do NOT invent disclosure.';
      let section = 'detailed_description';
      if (check && check.hits === check.total) {
        status = SPEC_SUPPORT_STATUSES.SUPPORTED;
        support = 'Limitation terms appear in provided disclosure.';
        section = 'detailed_description';
      } else if (check && check.hits >= Math.ceil(check.total / 2)) {
        status = SPEC_SUPPORT_STATUSES.PARTIALLY_SUPPORTED;
        support = 'Partial term overlap with provided disclosure; targeted follow-up required.';
      }
      map.push({
        claim: claim.claim_number,
        limitation,
        specification_support: support,
        section,
        source: status === SPEC_SUPPORT_STATUSES.SUPPORTED
          ? SPEC_PROVENANCE_STATES.USER_PROVIDED
          : SPEC_PROVENANCE_STATES.CLAIM_DERIVED,
        status,
      });
    }
  }
  return {
    map,
    totalLimitations: map.length,
    supported: map.filter((m) => m.status === SPEC_SUPPORT_STATUSES.SUPPORTED).length,
    partiallySupported: map.filter((m) => m.status === SPEC_SUPPORT_STATUSES.PARTIALLY_SUPPORTED).length,
    unsupported: map.filter((m) => m.status === SPEC_SUPPORT_STATUSES.UNSUPPORTED).length,
    hasUnsupported: map.some((m) => m.status === SPEC_SUPPORT_STATUSES.UNSUPPORTED),
  };
}

export function extractClaimTerms(claimsText = '') {
  const claims = splitSpecificationClaims(claimsText);
  const terms = new Map();
  for (const claim of claims) {
    for (const limitation of splitClaimLimitations(claim.text)) {
      // Capture head-noun terms with at most two preceding modifiers
      // (e.g. "optical sensor", "control unit") — never the whole limitation.
      const candidates = limitation.match(/\b([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,2}\s+(?:sensor|processor|controller|control unit|module|circuit|memory|actuator|motor|valve|camera|network|server|model|composition|compound|polymer|cell|antibody|device|apparatus))\b/gi) || [];
      for (const c of candidates) {
        // Keep only modifier + head (e.g. "optical sensor"), stripping articles
        // and transitional verbs so coverage checks the real term.
        const words = String(c).trim().split(/\s+/).filter((w) => !/^(a|an|the|comprising|including|having|with|said)$/i.test(w));
        const short = words.slice(-2).join(' ');
        const key = normLower(short || c);
        if (!key) continue;
        if (!terms.has(key)) terms.set(key, { term: short || c.trim(), claims: [] });
        if (!terms.get(key).claims.includes(claim.claim_number)) terms.get(key).claims.push(claim.claim_number);
      }
    }
  }
  return [...terms.values()];
}

export function buildClaimTermCoverage(claimsText = '', disclosureText = '') {
  const disc = normLower(disclosureText);
  return extractClaimTerms(claimsText).map((t) => {
    const inDisclosure = disc.includes(normLower(t.term));
    const firstIdx = inDisclosure ? disc.indexOf(normLower(t.term)) : -1;
    return {
      claim_term: t.term,
      claims: t.claims,
      definition_context: inDisclosure ? 'Term appears in provided disclosure.' : 'No definition/context found in provided disclosure.',
      first_disclosure: inDisclosure ? `offset ${firstIdx}` : 'NOT_FOUND',
      support_status: inDisclosure ? SPEC_SUPPORT_STATUSES.SUPPORTED : SPEC_SUPPORT_STATUSES.UNSUPPORTED,
    };
  });
}

// ---------------------------------------------------------------------------
// Terminology model + consistency
// ---------------------------------------------------------------------------

export function buildTerminologyModel(facts = {}) {
  const entries = new Map();
  const addTerm = (term, source, scope = 'specification-wide') => {
    const key = normLower(term);
    if (!key || key.length < 2) return;
    if (!entries.has(key)) {
      entries.set(key, {
        preferred_term: term.trim(),
        aliases: [],
        defined_meaning: '',
        source: source || SPEC_PROVENANCE_STATES.USER_PROVIDED,
        scope,
        ambiguity_status: 'UNREVIEWED',
      });
    }
  };
  const corpus = [
    asText(facts.components_or_steps),
    asText(facts.core_inventive_concept),
    asText(facts.existing_claims || facts.claims_text),
  ].join('\n');
  const knownPairs = [
    ['controller', 'processor'],
    ['processor', 'controller'],
    ['control unit', 'controller'],
    ['computing device', 'processor'],
  ];
  for (const [a, b] of knownPairs) {
    if (normLower(corpus).includes(a) || normLower(corpus).includes(b)) {
      addTerm(a, SPEC_PROVENANCE_STATES.USER_PROVIDED);
      addTerm(b, SPEC_PROVENANCE_STATES.USER_PROVIDED);
    }
  }
  // Also register explicit user-declared aliases
  const aliasText = asText(facts.terminology_notes || facts.terminology);
  if (aliasText) addTerm(aliasText.split('\n')[0].slice(0, 60), SPEC_PROVENANCE_STATES.USER_PROVIDED);
  return { terms: [...entries.values()] };
}

export function detectTerminologyConflicts(facts = {}, draftSections = {}) {
  const conflicts = [];
  const corpus = normLower([
    asText(facts.components_or_steps),
    asText(facts.core_inventive_concept),
    asText(draftSections.summary),
    asText(draftSections.detailed_description),
    asText(facts.existing_claims || facts.claims_text),
  ].join('\n'));
  const hasController = corpus.includes('controller');
  const hasProcessor = corpus.includes('processor');
  if (hasController && hasProcessor) {
    const declaredSame = /same (concept|component|thing)|synonym|interchangeab/i.test(corpus);
    if (!declaredSame) {
      conflicts.push({
        code: 'TERM_CONFLICT',
        terms: ['controller', 'processor'],
        message: 'Sources use both "controller" and "processor" without stating whether they are the same concept. Do not silently merge; confirm identity or difference.',
      });
    }
  }
  // Summary vs detailed description feature conflicts are handled separately; here flag title/field mismatches
  return conflicts;
}

export function detectInternalContradictions(facts = {}, draftSections = {}) {
  const flags = [];
  const summary = normLower(asText(draftSections.summary) + '\n' + asText(facts.summary_source));
  const detailed = normLower(asText(draftSections.detailed_description) + '\n' + asText(facts.core_inventive_concept));
  const countOf = (text, noun) => {
    const m = text.match(new RegExp(`\\b(one|two|three|four|1|2|3|4)\\b[^.]{0,30}\\b${noun}s?\\b`, 'i'));
    return m ? m[1].toLowerCase() : null;
  };
  for (const noun of ['sensor', 'processor', 'camera', 'module', 'step']) {
    const a = countOf(summary, noun);
    const b = countOf(detailed, noun);
    if (a && b && a !== b) {
      flags.push({
        code: 'INTERNAL_TECHNICAL_CONTRADICTION',
        message: `Summary states "${a} ${noun}" while detailed description states "${b} ${noun}". Do not silently resolve; confirm correct count.`,
      });
    }
  }
  const summaryLocal = /processing must be local|local processing (is )?required/i.test(summary);
  const detailedRemote = /processing must be remote|remote processing (is )?required/i.test(detailed);
  if (summaryLocal && detailedRemote) {
    flags.push({
      code: 'INTERNAL_TECHNICAL_CONTRADICTION',
      message: 'Summary requires local processing while an embodiment requires remote processing. Confirm intended architecture.',
    });
  }
  // Sensor count example from training tests
  return flags;
}

export function detectOverNarrowing(facts = {}, draftText = '') {
  const hits = [];
  const sourceAllowsAlternative = /alternative|optionally|option|may|can (also|either)|embodiment|variation/i.test(
    asText(facts.alternative_embodiments) + '\n' + asText(facts.components_or_steps),
  );
  const sentences = String(draftText || '').split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (ABSOLUTE_SCOPE_RE.test(s) && sourceAllowsAlternative) {
      hits.push({
        code: 'OVER_NARROWING_REVIEW_REQUIRED',
        sentence: s.slice(0, 200),
        message: 'Absolute wording ("must/only/always/requires exactly/cannot") used where source facts indicate alternatives. Confirm intent before keeping.',
      });
      if (hits.length >= 5) break;
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Figures / reference numerals
// ---------------------------------------------------------------------------

export function buildFigureRegistry(facts = {}, draftSections = {}) {
  const figures = [];
  const raw = asText(facts.drawings || facts.figure_plan || draftSections.brief_description_drawings);
  if (!raw) return { figures, numerals: [] };
  const figMatches = raw.match(/FIG\.\s*\d+[A-Z]?[^.\n]*[.\n]?/gi) || [];
  figMatches.forEach((m, idx) => {
    figures.push({
      figure_number: (m.match(/FIG\.\s*(\d+[A-Z]?)/i) || [])[1] || String(idx + 1),
      figure_type: /flow|process|method|step/i.test(m) ? 'FLOWCHART' : /block|system|architect/i.test(m) ? 'BLOCK_DIAGRAM' : 'UNKNOWN',
      description: m.trim().slice(0, 280),
      source: SPEC_PROVENANCE_STATES.USER_PROVIDED,
      components: [],
      reference_numerals: [],
    });
  });
  const numerals = [];
  const corpus = [asText(facts.components_or_steps), asText(draftSections.detailed_description), raw].join('\n');
  let m;
  REFERENCE_NUMERAL_RE.lastIndex = 0;
  while ((m = REFERENCE_NUMERAL_RE.exec(corpus)) !== null) {
    numerals.push({ component: m[1].trim(), numeral: m[2], source: SPEC_PROVENANCE_STATES.USER_PROVIDED });
  }
  return { figures, numerals };
}

export function detectNumeralConflicts(figureRegistry = {}, draftSections = {}) {
  const conflicts = [];
  const byNumeral = new Map();
  for (const n of figureRegistry.numerals || []) {
    const key = String(n.numeral);
    if (!byNumeral.has(key)) byNumeral.set(key, new Set());
    byNumeral.get(key).add(normLower(n.component));
  }
  for (const [numeral, names] of byNumeral) {
    if (names.size > 1) {
      conflicts.push({
        code: 'CONFLICTING_REFERENCE_NUMERAL',
        numeral,
        components: [...names],
        message: `Reference numeral ${numeral} maps to multiple components (${[...names].join(' vs ')}). Confirm correct mapping; do not silently choose one. Example: FIG. 2 component 120 described as both "sensor" and "motor".`,
      });
    }
  }
  const detailed = normLower(asText(draftSections.detailed_description));
  const bare = new Set();
  let b;
  BARE_NUMERAL_RE.lastIndex = 0;
  while ((b = BARE_NUMERAL_RE.exec(detailed)) !== null) bare.add(String(b[1]));
  for (const numeral of bare) {
    if (!byNumeral.has(numeral)) {
      conflicts.push({
        code: 'ORPHAN_REFERENCE_NUMERAL',
        numeral,
        message: `Numeral ${numeral} appears in the detailed description without a defined component. Flag as UNDEFINED_COMPONENT.`,
      });
    }
  }
  return conflicts;
}

// ---------------------------------------------------------------------------
// Technical effects / examples / experimental data / prior art / new matter
// ---------------------------------------------------------------------------

export function classifyTechnicalEffect(effectText = '', disclosureText = '') {
  const effect = normalizeSpecWhitespace(effectText);
  if (!effect || /^unknown$/i.test(effect)) return { status: SPEC_TECHNICAL_EFFECT_STATUSES.UNSUPPORTED, note: 'No technical effect supplied.' };
  const disc = normLower(disclosureText);
  if (QUANT_RESULT_RE.test(effect) && !normLower(effect).split(' ').every((t) => disc.includes(t))) {
    return { status: SPEC_TECHNICAL_EFFECT_STATUSES.UNSUPPORTED, note: 'Quantitative improvement asserted without source values. Do not invent percentages, accuracy, yield, or timing.' };
  }
  if (disc && normLower(effect).length > 3 && disc.includes(normLower(effect).slice(0, 24))) {
    return { status: SPEC_TECHNICAL_EFFECT_STATUSES.SOURCE_SUPPORTED, note: 'Effect wording grounded in provided disclosure.' };
  }
  if (/we (observed|measured|tested)|test(s|ed|ing) (showed|shows|demonstrated)/i.test(effect)) {
    return { status: SPEC_TECHNICAL_EFFECT_STATUSES.USER_ASSERTED, note: 'User-asserted test observation; preserve exact values and provenance, do not embellish.' };
  }
  return { status: SPEC_TECHNICAL_EFFECT_STATUSES.INFERRED_REVIEW_REQUIRED, note: 'Effect inferred during drafting; requires review before reliance.' };
}

export function classifyExampleKind(exampleText = '') {
  const text = normalizeSpecWhitespace(exampleText);
  if (!text) return SPEC_EXAMPLE_KINDS.ILLUSTRATIVE_SCENARIO;
  if (/(tested|measured|observed|trial \d+|example \d+.*yield|table \d+)/i.test(text) && !HYPOTHETICAL_MARKERS.test(text)) {
    return SPEC_EXAMPLE_KINDS.ACTUAL_EXAMPLE;
  }
  if (HYPOTHETICAL_MARKERS.test(text) || /(may|might|could|would|e\.g\.|for example,? (a|an) hypothetical)/i.test(text)) {
    return SPEC_EXAMPLE_KINDS.PROPHETIC_OR_HYPOTHETICAL_EXAMPLE;
  }
  return SPEC_EXAMPLE_KINDS.ILLUSTRATIVE_SCENARIO;
}

export function detectFabricatedExperimentalData(facts = {}) {
  const issues = [];
  const tested = /tested|measured|trial|experiment/i.test(asText(facts.experimental_data) + asText(facts.examples_use_cases));
  const notTested = /(have not tested|not (yet )?tested|no (test|experimental) data|untested|concept(ual)? only|no prototype)/i.test(
    asText(facts.development_status) + '\n' + asText(facts.experimental_data) + '\n' + asText(facts.prototype_details),
  );
  if (notTested && QUANT_RESULT_RE.test(asText(facts.experimental_data) + asText(facts.technical_effects))) {
    issues.push({
      code: 'EXPERIMENTAL_DATA_UNVERIFIED',
      message: 'User states the system has not been tested, but quantitative results are present. Remove invented gains (e.g. "35% improvement") and label any scenario as hypothetical.',
    });
  }
  if (!tested && QUANT_RESULT_RE.test(asText(facts.technical_effects))) {
    issues.push({
      code: 'EXPERIMENTAL_DATA_UNVERIFIED',
      message: 'Quantitative technical effect asserted without test provenance. Preserve only user-supplied values with provenance.',
    });
  }
  return issues;
}

export function buildNeutralBackground(facts = {}) {
  const priorArt = asText(facts.prior_art || facts.known_prior_art);
  if (priorArt && !/^unknown$/i.test(priorArt.trim()) && !/^(none|n\/a|no|not applicable)/i.test(priorArt.trim())) {
    return `User-identified background references include: ${normalizeSpecWhitespace(priorArt).slice(0, 600)} These references are described as user-supplied context only and are not admitted to be legally prior art. No closest-prior-art assertion is made without verification.`;
  }
  return 'No user-supplied prior-art references were provided. The background below uses neutral language and makes no admission about what is conventional, deficient, or closest prior art.';
}

export function classifyNewMatter(addedText = '', existingDisclosureText = '') {
  const added = normLower(addedText);
  const existing = normLower(existingDisclosureText);
  if (!added) return SPEC_NEW_MATTER_CLASSES.UNCERTAIN;
  const tokens = tokenizeSignificant(added);
  if (!tokens.length) return SPEC_NEW_MATTER_CLASSES.UNCERTAIN;
  const hits = tokens.filter((t) => existing.includes(t)).length;
  if (hits === tokens.length) return SPEC_NEW_MATTER_CLASSES.SUPPORTED_BY_EXISTING_DISCLOSURE;
  if (hits >= Math.ceil(tokens.length / 2)) return SPEC_NEW_MATTER_CLASSES.PARTIALLY_SUPPORTED;
  if (hits === 0) return SPEC_NEW_MATTER_CLASSES.NEWLY_ADDED;
  return SPEC_NEW_MATTER_CLASSES.UNCERTAIN;
}

export function buildBasisMap(facts = {}, sections = {}, claimSupportMap = { map: [] }) {
  const rows = [];
  const push = (proposition, source_fact, original_section, figure, claim, status) => {
    rows.push({ proposition, source_fact, original_section, figure: figure || '—', claim: claim || '—', status });
  };
  if (facts.core_inventive_concept) push('Core inventive concept', 'core_inventive_concept', 'detailed_description', null, null, SPEC_PROVENANCE_STATES.USER_PROVIDED);
  if (facts.components_or_steps) push('Components/steps', 'components_or_steps', 'detailed_description', null, null, SPEC_PROVENANCE_STATES.USER_PROVIDED);
  for (const row of claimSupportMap.map || []) {
    push(`Claim ${row.claim} limitation: ${String(row.limitation).slice(0, 80)}`, 'existing_claims', row.section, null, `Claim ${row.claim}`, row.status);
  }
  void sections;
  return rows;
}

// ---------------------------------------------------------------------------
// Disclosure completeness + readiness
// ---------------------------------------------------------------------------

export function assessDisclosureCompleteness(facts = {}) {
  const has = (v, min = 10) => Boolean(v && v !== 'UNKNOWN' && normalizeSpecWhitespace(asText(v)).length >= min);
  const dims = {
    CORE_CONCEPT: has(facts.core_inventive_concept, 20) ? 'SUFFICIENT' : has(facts.core_inventive_concept, 5) ? 'PARTIAL' : 'MISSING',
    IMPLEMENTATION: has(facts.technical_mechanism || facts.core_inventive_concept, 30) ? 'SUFFICIENT' : 'PARTIAL',
    MAKING: has(facts.components_or_steps, 15) ? 'SUFFICIENT' : has(facts.components_or_steps, 5) ? 'PARTIAL' : 'MISSING',
    USING: has(facts.operation || facts.core_inventive_concept, 15) ? 'SUFFICIENT' : 'PARTIAL',
    COMPONENT_RELATIONSHIPS: has(facts.operation || facts.component_relationships, 15) ? 'SUFFICIENT' : 'UNKNOWN',
    PROCESS_STEPS: /step|stage|phase|first|then|next|finally/i.test(asText(facts.core_inventive_concept) + asText(facts.components_or_steps)) ? 'SUFFICIENT' : 'UNKNOWN',
    EMBODIMENTS: has(facts.preferred_embodiment || facts.embodiments, 10) ? 'SUFFICIENT' : has(facts.alternative_embodiments, 5) ? 'PARTIAL' : 'MISSING',
    ALTERNATIVES: has(facts.alternative_embodiments, 10) ? 'SUFFICIENT' : 'MISSING',
    EXAMPLES: has(facts.examples_use_cases || facts.experimental_data, 10) ? 'SUFFICIENT' : 'MISSING',
    DRAWINGS: has(facts.drawings || facts.figure_plan, 5) ? 'SUFFICIENT' : 'UNKNOWN',
    SUPPORT_FOR_CLAIMS: facts.existing_claims || facts.claims_text ? 'PARTIAL' : 'UNKNOWN',
  };
  const sufficient = Object.values(dims).filter((v) => v === 'SUFFICIENT').length;
  let overall = 'INSUFFICIENT';
  // SUFFICIENT_FOR_FIRST_DRAFT = core enablement present (concept + making) plus
  // enough surrounding disclosure; remaining gaps stay as placeholders/flags.
  if (dims.CORE_CONCEPT === 'SUFFICIENT' && dims.MAKING === 'SUFFICIENT' && sufficient >= 4) overall = 'SUFFICIENT_FOR_FIRST_DRAFT';
  else if (sufficient >= 2 || dims.CORE_CONCEPT !== 'MISSING') overall = 'PARTIAL';
  return { dimensions: dims, overall, sufficientCount: sufficient, totalDimensions: Object.keys(dims).length };
}

export function assessSpecificationReadiness(facts = {}, draftingMode = 'FULL_SPECIFICATION') {
  const completeness = assessDisclosureCompleteness(facts);
  const hasTitle = Boolean(facts.title && facts.title !== 'UNKNOWN');
  const hasField = Boolean(facts.technical_field && facts.technical_field !== 'UNKNOWN');
  const hasProblem = Boolean(facts.problem_being_solved && facts.problem_being_solved !== 'UNKNOWN');
  const sectionOnly = new Set(['BACKGROUND_ONLY', 'SUMMARY_ONLY', 'DRAWING_DESCRIPTIONS_ONLY', 'DETAILED_DESCRIPTION_ONLY', 'DESCRIPTION_ONLY']);
  if (sectionOnly.has(draftingMode)) {
    if ((draftingMode === 'BACKGROUND_ONLY' && hasProblem) || (draftingMode === 'SUMMARY_ONLY' && has(facts.core_inventive_concept)) || hasTitle) {
      return SPEC_READINESS_STATES.READY_FOR_FIRST_DRAFT;
    }
    return hasTitle || hasProblem ? SPEC_READINESS_STATES.PARTIALLY_READY : SPEC_READINESS_STATES.NOT_READY;
  }
  if (hasTitle && hasField && hasProblem && completeness.overall === 'SUFFICIENT_FOR_FIRST_DRAFT') {
    return SPEC_READINESS_STATES.READY_FOR_FIRST_DRAFT;
  }
  if (hasTitle && (hasProblem || has(facts.core_inventive_concept))) return SPEC_READINESS_STATES.PARTIALLY_READY;
  return SPEC_READINESS_STATES.NOT_READY;

  function has(v) {
    return Boolean(v && v !== 'UNKNOWN' && normalizeSpecWhitespace(asText(v)).length >= 10);
  }
}

// ---------------------------------------------------------------------------
// Section optionality + change impact + locking
// ---------------------------------------------------------------------------

export function sectionOptionality(sectionId, facts = {}) {
  const mode = facts.drafting_mode || 'FULL_SPECIFICATION';
  const jurisdiction = facts.jurisdiction_context || 'UNDECIDED';
  const map = {
    title: SPEC_SECTION_OPTIONALITY.REQUIRED_FOR_CURRENT_TEMPLATE,
    technical_field: SPEC_SECTION_OPTIONALITY.REQUIRED_FOR_CURRENT_TEMPLATE,
    background: mode === 'DETAILED_DESCRIPTION_ONLY' || mode === 'DRAWING_DESCRIPTIONS_ONLY' ? SPEC_SECTION_OPTIONALITY.NOT_APPLICABLE : SPEC_SECTION_OPTIONALITY.RECOMMENDED,
    summary: mode === 'DETAILED_DESCRIPTION_ONLY' || mode === 'BACKGROUND_ONLY' || mode === 'DRAWING_DESCRIPTIONS_ONLY' ? SPEC_SECTION_OPTIONALITY.NOT_APPLICABLE : SPEC_SECTION_OPTIONALITY.RECOMMENDED,
    brief_description_drawings: facts.drawings || facts.figure_plan ? SPEC_SECTION_OPTIONALITY.RECOMMENDED : SPEC_SECTION_OPTIONALITY.OPTIONAL,
    detailed_description: mode === 'BACKGROUND_ONLY' || mode === 'SUMMARY_ONLY' ? SPEC_SECTION_OPTIONALITY.NOT_APPLICABLE : SPEC_SECTION_OPTIONALITY.REQUIRED_FOR_CURRENT_TEMPLATE,
    embodiments: SPEC_SECTION_OPTIONALITY.OPTIONAL,
    examples: facts.examples_use_cases || facts.experimental_data ? SPEC_SECTION_OPTIONALITY.RECOMMENDED : SPEC_SECTION_OPTIONALITY.OPTIONAL,
    industrial_applicability: jurisdiction === 'PCT' || jurisdiction === 'EP' ? SPEC_SECTION_OPTIONALITY.RECOMMENDED : SPEC_SECTION_OPTIONALITY.NOT_APPLICABLE,
    claims: facts.existing_claims ? SPEC_SECTION_OPTIONALITY.OPTIONAL : SPEC_SECTION_OPTIONALITY.NOT_APPLICABLE,
    abstract: mode === 'FULL_SPECIFICATION' ? SPEC_SECTION_OPTIONALITY.OPTIONAL : SPEC_SECTION_OPTIONALITY.NOT_APPLICABLE,
  };
  return map[sectionId] || SPEC_SECTION_OPTIONALITY.OPTIONAL;
}

export function analyzeChangeImpact(changedField, facts = {}) {
  const impact = {
    summary: ['summary', 'detailed_description', 'embodiments'],
    detailed_description: ['summary', 'embodiments', 'brief_description_drawings'],
    components_or_steps: ['summary', 'detailed_description', 'embodiments', 'brief_description_drawings', 'abstract'],
    alternative_embodiments: ['detailed_description', 'embodiments', 'summary'],
    drawings: ['brief_description_drawings', 'detailed_description'],
    existing_claims: ['detailed_description', 'summary', 'embodiments'],
    terminology_notes: ['summary', 'detailed_description', 'embodiments', 'brief_description_drawings'],
  };
  const affected = impact[changedField] || ['detailed_description'];
  void facts;
  return { changedField, affectedSections: affected, preserveUnrelated: true };
}

export function applySectionEdits(existingSections = {}, edits = {}, locks = {}) {
  const next = { ...existingSections };
  const preserved = [];
  const applied = [];
  for (const [sectionId, content] of Object.entries(edits)) {
    if (locks[sectionId] === SPEC_LOCK_STATUSES.USER_LOCKED || locks[sectionId] === SPEC_LOCK_STATUSES.REVIEW_LOCKED) {
      preserved.push(sectionId);
      continue;
    }
    next[sectionId] = content;
    applied.push(sectionId);
  }
  return { sections: next, applied, preserved };
}

// ---------------------------------------------------------------------------
// Validation (heuristic checks — never legal certainty)
// ---------------------------------------------------------------------------

export function validateSpecificationDraft(facts = {}, sections = {}, options = {}) {
  const issues = [];
  const claimSupport = buildClaimSupportMapForSpecification(
    asText(facts.existing_claims || facts.claims_text),
    facts,
    sections,
  );
  if (claimSupport.hasUnsupported) {
    issues.push({ code: 'UNSUPPORTED_LIMITATION_FLAGGED', message: `${claimSupport.unsupported} claim limitation(s) lack disclosure support. Do not insert LiDAR-like matter silently to cure the gap.` });
  }
  for (const c of detectTerminologyConflicts(facts, sections)) issues.push(c);
  for (const c of detectInternalContradictions(facts, sections)) issues.push(c);
  for (const c of detectNumeralConflicts(buildFigureRegistry(facts, sections), sections)) issues.push(c);
  const fullText = Object.values(sections).map(asText).join('\n');
  for (const o of detectOverNarrowing(facts, fullText)) issues.push(o);
  for (const e of detectFabricatedExperimentalData(facts)) issues.push(e);
  if (/conventional systems suffer from|well-known deficiencies|closest prior art is/i.test(fullText) && !asText(facts.prior_art || facts.known_prior_art)) {
    issues.push({ code: 'BACKGROUND_ADMISSION_REVIEW_REQUIRED', message: 'Background uses admission-like wording without user-supplied prior art. Rewrite neutrally.' });
  }
  void options;
  return { issues, claimSupport, ok: issues.length === 0 };
}

// ---------------------------------------------------------------------------
// Assembly — structured, collaborative, provenance-tracked
// ---------------------------------------------------------------------------

function placeholder(label) {
  return `[${label}]`;
}

function jurisdictionNote(jurisdiction) {
  if (jurisdiction === 'US') return 'Terminology follows US practice ("Brief Summary", "Detailed Description"); no EP/PCT formal requirements are asserted.';
  if (jurisdiction === 'PCT') return 'Structure notes PCT Rule 5 headings ("Disclosure of Invention", "Modes for Carrying Out the Invention", "Industrial Applicability") without asserting filing formalities.';
  if (jurisdiction === 'EP') return 'Structure notes EPC Rules 42–44 headings without asserting EPO filing formalities.';
  return 'Neutral patent-specification mode: no jurisdiction-specific formal requirements are asserted (JURISDICTION_UNDECIDED).';
}

export function assemblePatentSpecification(facts = {}, existingSections = {}, locks = {}) {
  const jurisdiction = facts.jurisdiction_context || 'UNDECIDED';
  const mode = facts.drafting_mode || SPEC_DRAFTING_MODES.FULL_SPECIFICATION;
  const title = facts.title && facts.title !== 'UNKNOWN' ? facts.title : placeholder('UNKNOWN — working title to be supplied');
  const field = facts.technical_field && facts.technical_field !== 'UNKNOWN' ? facts.technical_field : placeholder('UNKNOWN — technical field to be supplied');
  const problem = facts.problem_being_solved && facts.problem_being_solved !== 'UNKNOWN' ? facts.problem_being_solved : placeholder('UNKNOWN — technical problem to be supplied');
  const concept = facts.core_inventive_concept && facts.core_inventive_concept !== 'UNKNOWN' ? facts.core_inventive_concept : placeholder('UNKNOWN — core inventive concept to be supplied');
  const components = facts.components_or_steps && facts.components_or_steps !== 'UNKNOWN' ? facts.components_or_steps : placeholder('UNKNOWN — components/steps to be supplied');

  const disclosureText = [concept, components, asText(facts.invention_disclosure)].join('\n');
  const claimSupportMap = buildClaimSupportMapForSpecification(asText(facts.existing_claims || facts.claims_text), facts, existingSections);
  const claimTermCoverage = buildClaimTermCoverage(asText(facts.existing_claims || facts.claims_text), disclosureText);
  const terminologyModel = buildTerminologyModel(facts);
  const figureRegistry = buildFigureRegistry(facts, existingSections);
  const basisMap = buildBasisMap(facts, existingSections, claimSupportMap);
  const validation = validateSpecificationDraft(facts, existingSections);

  const exampleKind = facts.examples_use_cases ? classifyExampleKind(asText(facts.examples_use_cases)) : null;
  const effectCheck = facts.technical_effects ? classifyTechnicalEffect(asText(facts.technical_effects), disclosureText) : null;

  const cand = {};
  cand.title = `Title of the Invention\n\n${title}`;
  cand.technical_field = `Technical Field\n\nThis specification relates to ${field}.`;
  cand.background = `Background\n\n${buildNeutralBackground(facts)}\n\nThe technical problem addressed is: ${problem}`;
  cand.summary = `Summary of the Invention\n\nIn some embodiments, the invention comprises: ${components.slice(0, 500)}${effectCheck && effectCheck.status !== 'UNSUPPORTED' ? `\n\nTechnical effect (status: ${effectCheck.status}): ${normalizeSpecWhitespace(asText(facts.technical_effects)).slice(0, 400)}` : ''}`;
  cand.brief_description_drawings = figureRegistry.figures.length
    ? `Brief Description of the Drawings\n\n${figureRegistry.figures.map((f) => `FIG. ${f.figure_number} illustrates ${f.description.slice(0, 160)}`).join('\n')}`
    : `Brief Description of the Drawings\n\n${placeholder('PLACEHOLDER — no figures supplied; no figure descriptions invented')}`;
  cand.detailed_description = `Detailed Description\n\nThe following describes supported embodiments without adding new technical matter.\n\nCore inventive concept: ${concept}\n\nComponents/steps and relationships: ${components}${facts.operation ? `\n\nOperation: ${asText(facts.operation).slice(0, 800)}` : ''}${facts.alternative_embodiments ? `\n\nAlternative implementations (user-supplied only): ${asText(facts.alternative_embodiments).slice(0, 800)}` : ''}`;
  cand.embodiments = facts.preferred_embodiment || facts.embodiments || facts.alternative_embodiments
    ? `Embodiments\n\nPreferred embodiment: ${normalizeSpecWhitespace(asText(facts.preferred_embodiment || facts.embodiments || 'See detailed description.')).slice(0, 800)}\n\nAlternatives (user-supplied only): ${normalizeSpecWhitespace(asText(facts.alternative_embodiments || 'None supplied.')).slice(0, 600)}`
    : `Embodiments\n\n${placeholder('PLACEHOLDER — no embodiments supplied; none invented for length')}`;
  cand.examples = facts.examples_use_cases || facts.experimental_data
    ? `Examples\n\n[${exampleKind}] ${normalizeSpecWhitespace(asText(facts.examples_use_cases || facts.experimental_data)).slice(0, 900)}${effectCheck && effectCheck.status === 'UNSUPPORTED' ? '\n\nNote: quantitative improvement language was withheld as unsupported by test provenance.' : ''}`
    : `Examples\n\n${placeholder('PLACEHOLDER — no examples supplied')}`;
  cand.industrial_applicability = jurisdiction === 'PCT' || jurisdiction === 'EP'
    ? `Industrial Applicability\n\nThe described embodiments are capable of industrial application where supported by the disclosure above. No new use is asserted beyond the disclosure.`
    : `Industrial Applicability\n\n${placeholder('NOT_APPLICABLE in neutral/US specification mode unless requested')}`;
  cand.claims = facts.existing_claims
    ? `Claims (as supplied; not drafted here)\n\n${normalizeSpecWhitespace(asText(facts.existing_claims)).slice(0, 1200)}`
    : `Claims\n\n${placeholder('NOT_APPLICABLE — claims drafted in the Patent Claims Set workflow unless supplied')}`;
  cand.abstract = `Abstract\n\n${placeholder('PLACEHOLDER — abstract generated only after specification context exists and without new matter')}`;

  // Respect drafting mode: only include requested sections, but always keep provenance.
  const modeSections = {
    FULL_SPECIFICATION: ['title', 'technical_field', 'background', 'summary', 'brief_description_drawings', 'detailed_description', 'embodiments', 'examples', 'industrial_applicability'],
    DESCRIPTION_ONLY: ['technical_field', 'background', 'summary', 'detailed_description'],
    DETAILED_DESCRIPTION_ONLY: ['detailed_description'],
    BACKGROUND_ONLY: ['background'],
    SUMMARY_ONLY: ['summary'],
    DRAWING_DESCRIPTIONS_ONLY: ['brief_description_drawings'],
    EMBODIMENT_EXPANSION: ['detailed_description', 'embodiments'],
    SPECIFICATION_FROM_CLAIMS: ['title', 'technical_field', 'summary', 'detailed_description', 'embodiments'],
    SPECIFICATION_FROM_INVENTION_DISCLOSURE: ['title', 'technical_field', 'background', 'summary', 'detailed_description', 'embodiments', 'examples'],
    SPECIFICATION_REVIEW: ['title', 'technical_field', 'background', 'summary', 'detailed_description', 'embodiments'],
    SPECIFICATION_REVISION: ['title', 'technical_field', 'background', 'summary', 'detailed_description', 'embodiments', 'examples'],
  };
  const include = modeSections[mode] || modeSections.FULL_SPECIFICATION;

  // Apply locks: locked user-approved sections win over regeneration.
  const merged = applySectionEdits(cand, existingSections, {});
  const locked = applySectionEdits(merged.sections, {}, locks);
  void locked;

  let specification = `# Patent Specification — ${title}\n\n_${jurisdictionNote(jurisdiction)}_\n\n`;
  specification += `Drafting mode: ${mode} · Jurisdiction context: ${jurisdiction}\n\n---\n\n`;
  for (const id of include) {
    const lockedContent = locks[id] === SPEC_LOCK_STATUSES.USER_LOCKED || locks[id] === SPEC_LOCK_STATUSES.REVIEW_LOCKED
      ? existingSections[id]
      : (existingSections[id] || cand[id]);
    if (!lockedContent) continue;
    specification += `## ${id}\n\n${lockedContent}\n\n---\n\n`;
  }
  specification += `## Provenance & review notes\n\n`;
  specification += `- Sources: user-provided facts, matter context, and supplied documents only. AI-drafted language is structural; no technical facts were invented.\n`;
  if (claimSupportMap.hasUnsupported) specification += `- Claim support: ${claimSupportMap.unsupported} limitation(s) UNSUPPORTED — targeted disclosure questions remain. No disclosure was invented to cure gaps.\n`;
  if (validation.issues.length) specification += `- Open checks (${validation.issues.length}): ${validation.issues.map((i) => i.code).join(', ')}.\n`;
  specification += `- Attorney review required before any filing use.\n`;

  return {
    specification: specification.trim(),
    sections: include,
    sectionContents: cand,
    claimSupportMap,
    claimTermCoverage,
    terminologyModel,
    figureRegistry,
    numeralConflicts: detectNumeralConflicts(figureRegistry, existingSections),
    terminologyConflicts: detectTerminologyConflicts(facts, existingSections),
    contradictions: detectInternalContradictions(facts, existingSections),
    basisMap,
    completeness: assessDisclosureCompleteness(facts),
    validation,
    jurisdiction,
    draftingMode: mode,
  };
}

// ---------------------------------------------------------------------------
// Confidentiality: fail-closed provider gate for unpublished inventions
// ---------------------------------------------------------------------------

export function assertSpecificationChatAllowed({ engines, mode = 'CONFIDENTIAL_IP', env = {} } = {}) {
  // Lazy import to keep this service dependency-light in browser bundles.
  // Caller (router/tests) supplies engines; we enforce the same fail-closed rule
  // as provider-policy: free/unapproved providers throw CONFIDENTIAL_PILOT_BLOCKED.
  const free = (engines || []).filter((e) => {
    const slug = typeof e === 'string' ? e : (e.slug || '');
    return /:free$/i.test(slug) || slug.includes('free');
  });
  if ((mode === 'CONFIDENTIAL_IP' || mode === 'HIGHLY_CONFIDENTIAL') && (engines || []).length > 0 && free.length === (engines || []).length) {
    const error = new Error('CONFIDENTIAL_PILOT_BLOCKED: confidential invention content cannot reach an unapproved/free provider. No silent fallback.');
    error.code = 'CONFIDENTIAL_PILOT_BLOCKED';
    throw error;
  }
  return { mode, allowed: (engines || []).filter((e) => !free.includes(e)) };
}

/**
 * SALLYIP PATENT ABSTRACT SERVICE — DOCUMENT #011
 *
 * Deterministic, source-grounded helpers for the formal Patent Abstract workflow.
 * This service reuses SallyIP's existing claim/specification support machinery and
 * must not invent technical facts, quantitative effects, terminology, reference
 * numerals, jurisdiction rules, or legal conclusions.
 */

import {
  buildClaimSupportMap,
  verifyClaimSupport112,
  PROVENANCE_STATES,
} from './patent-drafting-service.js';
import { splitClaimElements } from './patent-claim-service.js';

export { PROVENANCE_STATES };

export const ABSTRACT_REVIEW_FLAGS = {
  ABSTRACT_REVIEW_REQUIRED: 'ABSTRACT_REVIEW_REQUIRED',
  ABSTRACT_NEW_MATTER_DETECTED: 'ABSTRACT_NEW_MATTER_DETECTED',
  ABSTRACT_UNSUPPORTED_BROADENING: 'ABSTRACT_UNSUPPORTED_BROADENING',
  ABSTRACT_OVER_NARROWING_REVIEW_REQUIRED: 'ABSTRACT_OVER_NARROWING_REVIEW_REQUIRED',
  ABSTRACT_CLAIM_CONFLICT: 'ABSTRACT_CLAIM_CONFLICT',
  ABSTRACT_SPECIFICATION_CONFLICT: 'ABSTRACT_SPECIFICATION_CONFLICT',
  TITLE_ABSTRACT_CONSISTENCY_REVIEW_REQUIRED: 'TITLE_ABSTRACT_CONSISTENCY_REVIEW_REQUIRED',
  SPECIFICATION_CONTEXT_LIMITED: 'SPECIFICATION_CONTEXT_LIMITED',
  ABSTRACT_WORD_LIMIT_REVIEW_REQUIRED: 'ABSTRACT_WORD_LIMIT_REVIEW_REQUIRED',
  ABSTRACT_LOCKED_PRESERVED: 'ABSTRACT_LOCKED_PRESERVED',
  ABSTRACT_PRIOR_ART_ADMISSION_REVIEW_REQUIRED: 'ABSTRACT_PRIOR_ART_ADMISSION_REVIEW_REQUIRED',
  ABSTRACT_REFERENCE_NUMERAL_REVIEW_REQUIRED: 'ABSTRACT_REFERENCE_NUMERAL_REVIEW_REQUIRED',
  CONFIDENTIAL_MATTER_UNPUBLISHED: 'CONFIDENTIAL_MATTER_UNPUBLISHED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
};

export const ABSTRACT_TECHNICAL_EFFECT_STATUSES = {
  SOURCE_SUPPORTED: 'SOURCE_SUPPORTED',
  USER_ASSERTED: 'USER_ASSERTED',
  INFERRED_REVIEW_REQUIRED: 'INFERRED_REVIEW_REQUIRED',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN: 'UNKNOWN',
};

export const ABSTRACT_SUPPORT_STATUSES = {
  SUPPORTED: 'SUPPORTED',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN: 'UNKNOWN',
};

export const ABSTRACT_LOCK_STATUSES = {
  UNLOCKED: 'UNLOCKED',
  USER_LOCKED: 'USER_LOCKED',
  REVIEW_LOCKED: 'REVIEW_LOCKED',
};

const ABSTRACT_STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'all', 'also', 'among', 'and', 'are', 'because',
  'been', 'before', 'being', 'between', 'both', 'but', 'can', 'cannot', 'could', 'does', 'each',
  'either', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'here', 'into', 'its',
  'itself', 'more', 'most', 'much', 'must', 'only', 'other', 'ought', 'over', 'same', 'shall',
  'should', 'such', 'than', 'that', 'then', 'there', 'these', 'this', 'those', 'through', 'under',
  'until', 'using', 'very', 'was', 'were', 'what', 'when', 'where', 'which', 'while', 'with',
  'within', 'without', 'invention', 'disclosure', 'patent', 'said', 'whereby',
]);

const MARKETING_TERMS = [
  'revolutionary', 'groundbreaking', 'best-in-class', 'best in class', 'industry-leading',
  'industry leading', 'dramatically superior', 'unprecedented', 'world-class', 'world class',
  'cutting-edge', 'cutting edge', 'state-of-the-art', 'state of the art', 'game-changing',
  'game changing', 'amazing', 'magical', 'miraculous', 'perfect solution',
];

const LEGAL_CONCLUSION_PATTERNS = [
  /\bnovel\b.{0,40}\bnon[-\s]?obvious\b/i,
  /\bnon[-\s]?obvious\b/i,
  /\bthe invention is novel\b/i,
  /\bpatentable\b/i,
  /\bsatisf(?:ies|y)\s+section\s+101\b/i,
  /\b35\s*u\.?s\.?c\.?\s*§?\s*101\b/i,
  /\bvalid (?:patent|claim)\b/i,
  /\binvalid (?:patent|claim)\b/i,
];

const ABSOLUTE_SCOPE_TERMS = [
  'must', 'only', 'always', 'exclusively', 'exclusive', 'exclusively', 'requires', 'required', 'never',
];

const SOURCE_ALTERNATIVE_MARKERS = [
  ' or ', ' either ', ' optionally ', ' optional ', ' alternative ', ' alternatively ',
  ' embodiment ', ' embodiments ', ' example ', ' examples ', ' variation ', ' variations ',
];

const ABSTRACT_FUNCTIONAL_WORDS = new Set([
  'relating', 'relate', 'address', 'addresses', 'solution', 'comprise', 'comprises', 'configure', 'configured',
  'generate', 'generates', 'send', 'sends', 'analyze', 'analyzes', 'receive', 'receives', 'control', 'controls',
  'using', 'used', 'uses', 'include', 'includes', 'including', 'contain', 'contains', 'comprising', 'having',
  'system', 'method', 'device', 'apparatus', 'technical', 'principal', 'main', 'central', 'result', 'operation',
  'operates', 'operate', 'limited', 'available', 'language', 'because', 'specification', 'context', 'supplied',
  'abstract', 'relates',
]);
const COMPONENT_VOCABULARY = [
  'controller', 'processor', 'sensor', 'actuator', 'camera', 'memory', 'model', 'module',
  'circuit', 'server', 'network', 'signal', 'valve', 'motor', 'battery', 'antenna',
];

export function normalizeAbstractWhitespace(text = '') {
  return String(text || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic word count policy:
 * - normalize Unicode zero-width characters and whitespace;
 * - remove Markdown emphasis/code markers without changing visible words;
 * - count whitespace-separated tokens;
 * - retain hyphenated compounds and numeric ranges as single tokens.
 */
export function countAbstractWords(text = '') {
  const cleaned = normalizeAbstractWhitespace(text)
    .replace(/[`*_~#>|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(' ').filter(Boolean).length;
}

export function createAbstractWordCountRecord({
  abstractText = '',
  targetLimit = null,
  jurisdiction = 'UNDECIDED',
  ruleSource = null,
  ruleVersion = null,
} = {}) {
  const wordCount = countAbstractWords(abstractText);
  const verifiedTarget = Number.isInteger(targetLimit) && targetLimit > 0 ? targetLimit : null;
  let status = 'RULE_UNVERIFIED';
  if (verifiedTarget) {
    status = wordCount <= verifiedTarget ? 'WITHIN_TARGET' : 'OVER_TARGET';
  }
  return {
    abstract_text: normalizeAbstractWhitespace(abstractText),
    word_count: wordCount,
    target_limit: verifiedTarget,
    jurisdiction,
    rule_source: ruleSource,
    rule_version: ruleVersion,
    verification_status: ruleSource && ruleVersion && verifiedTarget ? 'VERIFIED' : 'UNVERIFIED',
    status,
  };
}

export function hashSourceText(text = '') {
  const normalized = normalizeAbstractWhitespace(text).toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}-${normalized.length}`;
}

export function normalizeSourceSnapshot(sources = {}) {
  const snapshot = {};
  for (const [key, source] of Object.entries(sources || {})) {
    if (!source) continue;
    const text = normalizeAbstractWhitespace(source.text || source.content || '');
    if (!text && !source.id && !source.version) continue;
    snapshot[key] = {
      id: source.id || source.document_id || null,
      version: source.version || source.revision || null,
      hash: text ? hashSourceText(text) : null,
    };
  }
  return snapshot;
}

export function detectSourceDrift(previousSnapshot = {}, currentSnapshot = {}) {
  const changed = [];
  for (const [key, current] of Object.entries(currentSnapshot || {})) {
    const previous = previousSnapshot?.[key];
    if (!previous) continue;
    if ((previous.id || null) !== (current.id || null)) changed.push(key);
    else if ((previous.version || null) !== (current.version || null)) changed.push(key);
    else if ((previous.hash || null) !== (current.hash || null)) changed.push(key);
  }
  return changed;
}

function splitAbstractSentences(text = '') {
  const normalized = normalizeAbstractWhitespace(text);
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g);
  return (matches || [normalized]).map((sentence) => sentence.trim()).filter(Boolean);
}

function normalizeToken(token = '') {
  const cleaned = String(token || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (cleaned.length > 4 && cleaned.endsWith('ies')) return `${cleaned.slice(0, -3)}y`;
  if (cleaned.length > 5 && cleaned.endsWith('ses')) return cleaned.slice(0, -2);
  if (cleaned.length > 4 && cleaned.endsWith('s') && !cleaned.endsWith('ss')) return cleaned.slice(0, -1);
  return cleaned;
}

export function extractMeaningfulTokens(text = '') {
  const tokens = normalizeAbstractWhitespace(text)
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map(normalizeToken)
    .filter((token) => token.length >= 4 && !ABSTRACT_STOPWORDS.has(token));
  return [...new Set(tokens)];
}

function sourceContainsToken(sourceText = '', token = '') {
  const haystack = ` ${normalizeAbstractWhitespace(sourceText).toLowerCase()} `;
  if (!token) return false;
  if (haystack.includes(` ${token} `) || haystack.includes(` ${token}s `)) return true;
  if (token.endsWith('s')) return haystack.includes(` ${token.slice(0, -1)} `);
  return haystack.includes(` ${token} `) || haystack.includes(token);
}

function getCombinedSourceText(sources = {}) {
  return [sources.specification, sources.claims, sources.disclosure, sources.application]
    .map((source) => normalizeAbstractWhitespace(source))
    .filter(Boolean)
    .join('\n');
}

function classifySentenceSupport(sentence, sources = {}) {
  const combined = getCombinedSourceText(sources);
  const tokens = extractMeaningfulTokens(sentence);
  if (!tokens.length) return { status: ABSTRACT_SUPPORT_STATUSES.UNKNOWN, matchedTokens: [] };
  if (!combined) return { status: ABSTRACT_SUPPORT_STATUSES.UNKNOWN, matchedTokens: [] };
  const matched = tokens.filter((token) => sourceContainsToken(combined, token));
  if (matched.length >= Math.min(2, tokens.length) && matched.length / tokens.length >= 0.34) {
    return { status: ABSTRACT_SUPPORT_STATUSES.SUPPORTED, matchedTokens: matched };
  }
  if (matched.length > 0) return { status: ABSTRACT_SUPPORT_STATUSES.PARTIALLY_SUPPORTED, matchedTokens: matched };
  return { status: ABSTRACT_SUPPORT_STATUSES.UNSUPPORTED, matchedTokens: [] };
}

function findSentenceSource(sentence, sources = {}) {
  const locations = [];
  const tokens = extractMeaningfulTokens(sentence);
  const entries = [
    ['SPECIFICATION_TEXT', sources.specification],
    ['CLAIMS_TEXT', sources.claims],
    ['DISCLOSURE_TEXT', sources.disclosure],
    ['APPLICATION_TEXT', sources.application],
  ];
  for (const [location, text] of entries) {
    if (!text) continue;
    if (tokens.some((token) => sourceContainsToken(text, token))) locations.push(location);
  }
  return locations;
}

export function buildAbstractSupportMap({
  abstractText = '',
  specificationText = '',
  claimsText = '',
  disclosureText = '',
  applicationText = '',
  facts = {},
  provenance = {},
} = {}) {
  const sentences = splitAbstractSentences(abstractText);
  const sources = {
    specification: specificationText,
    claims: claimsText,
    disclosure: disclosureText,
    application: applicationText,
  };
  const sentenceMap = sentences.map((sentence, index) => {
    const support = classifySentenceSupport(sentence, sources);
    return {
      abstract_sentence: sentence,
      sentence_index: index,
      propositions: splitClaimElements(sentence),
      supporting_sources: findSentenceSource(sentence, sources),
      provenance: provenance?.[`sentence_${index}`] || PROVENANCE_STATES.AI_DRAFTED,
      status: support.status,
      matched_tokens: support.matchedTokens,
    };
  });

  let claimSupport = { supportMap: [], hasUnsupportedLimitations: false, issues: [] };
  if (claimsText || specificationText) {
    const disclosureFacts = {
      plain_description: facts.technical_problem,
      technical_mechanism: facts.core_solution,
      components: facts.principal_components,
      matter_title: facts.title,
    };
    claimSupport = buildClaimSupportMap(claimsText || '', specificationText || '', disclosureFacts);
  }

  return { sentences: sentenceMap, claimSupport };
}

export function sanitizeAbstractProse(text = '') {
  let cleaned = normalizeAbstractWhitespace(text);
  for (const term of MARKETING_TERMS) {
    cleaned = cleaned.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
  }
  const sentences = splitAbstractSentences(cleaned).filter((sentence) => {
    if (LEGAL_CONCLUSION_PATTERNS.some((pattern) => pattern.test(sentence))) return false;
    if (/\b(existing|current|conventional|prior)\b.{0,60}\b(fail|fails|failure|unable|inadequate|inferior)\b/i.test(sentence)) {
      return /\b(according to|as described in|specification states|claims recite)\b/i.test(sentence);
    }
    return sentence.length > 0;
  });
  return normalizeAbstractWhitespace(sentences.join(' ')).replace(/\s+([,.;:!?])/g, '$1');
}

function findOptionalComponents(sourceText = '') {
  const found = new Set();
  for (const sentence of splitAbstractSentences(sourceText)) {
    if (!/\boptional(?:ly)?\b|\bin some embodiments\b|\bfor example\b|\be\.g\.\b|\balternatively\b/i.test(sentence)) continue;
    for (const token of extractMeaningfulTokens(sentence)) {
      if (!ABSTRACT_FUNCTIONAL_WORDS.has(token)) found.add(token);
    }
  }
  return [...found];
}

function assertMandatoryComponent(sentence, component) {
  return new RegExp(`\\b(includes?|including|comprises?|comprising|contains?|has|having|uses?|using)\\b[^.]{0,100}?\\b${component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence);
}

function countVocabularyTerms(text = '', vocabulary = COMPONENT_VOCABULARY) {
  const counts = new Map();
  for (const term of vocabulary) {
    const matches = normalizeAbstractWhitespace(text).toLowerCase().match(new RegExp(`\\b${term}s?\\b`, 'g')) || [];
    if (matches.length) counts.set(term, matches.length);
  }
  return counts;
}

function removeUnsupportedTechnicalTerms(text = '', combinedSources = '', title = '') {
  const allowed = new Set([...ABSTRACT_FUNCTIONAL_WORDS, ...extractMeaningfulTokens(title)]);
  const novel = new Set();
  for (const sentence of splitAbstractSentences(text)) {
    for (const token of extractMeaningfulTokens(sentence)) {
      if (!allowed.has(token) && combinedSources && !sourceContainsToken(combinedSources, token)) novel.add(token);
    }
  }
  let cleaned = normalizeAbstractWhitespace(text);
  for (const term of novel) {
    cleaned = cleaned.replace(new RegExp(`\\b${term}s?\\b`, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
  }
  cleaned = cleaned
    .replace(/,\s*and\s*(?=[.])/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\band\s+and\b/gi, 'and')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
  return { text: cleaned, removed: [...novel] };
}

export function validateAbstractDraft({
  abstractText = '',
  title = '',
  specificationText = '',
  claimsText = '',
  disclosureText = '',
  applicationText = '',
  facts = {},
  provenance = {},
} = {}) {
  const flags = new Set();
  const sanitizedText = sanitizeAbstractProse(abstractText);
  if (sanitizeAbstractProse(abstractText) !== normalizeAbstractWhitespace(abstractText)) {
    flags.add('ABSTRACT_MARKETING_OR_LEGAL_LANGUAGE_REMOVED');
  }
  const supportMap = buildAbstractSupportMap({
    abstractText: sanitizedText,
    specificationText,
    claimsText,
    disclosureText,
    applicationText,
    facts,
    provenance,
  });

  for (const sentence of supportMap.sentences) {
    if (sentence.status === ABSTRACT_SUPPORT_STATUSES.UNSUPPORTED && extractMeaningfulTokens(sentence.abstract_sentence).length >= 3) {
      flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_NEW_MATTER_DETECTED);
    }
  }

  const combinedSources = getCombinedSourceText({ specification: specificationText, claims: claimsText, disclosure: disclosureText, application: applicationText });
  const allowedNonSourceTerms = new Set([...ABSTRACT_FUNCTIONAL_WORDS, ...extractMeaningfulTokens(title)]);
  for (const sentence of supportMap.sentences) {
    if (!combinedSources) continue;
    const novelTerms = extractMeaningfulTokens(sentence.abstract_sentence).filter((token) => (
      !allowedNonSourceTerms.has(token) && !sourceContainsToken(combinedSources, token)
    ));
    if (novelTerms.length) flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_NEW_MATTER_DETECTED);
  }
  const optionalComponents = findOptionalComponents(combinedSources);
  for (const sentence of supportMap.sentences) {
    for (const component of optionalComponents) {
      if (assertMandatoryComponent(sentence.abstract_sentence, component) && !/\boptional\b/i.test(sentence.abstract_sentence)) {
        flags.add('ABSTRACT_OPTIONAL_FEATURE_AS_MANDATORY');
      }
    }
  }

  if (ABSOLUTE_SCOPE_TERMS.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(sanitizedText))) {
    const sourceHasAlternative = SOURCE_ALTERNATIVE_MARKERS.some((marker) => combinedSources.toLowerCase().includes(marker));
    if (sourceHasAlternative) flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_OVER_NARROWING_REVIEW_REQUIRED);
  }

  const genericMatches = sanitizedText.match(/\bany\s+[a-z][a-z0-9-]*/gi) || [];
  for (const generic of genericMatches) {
    const noun = generic.split(/\s+/)[1].toLowerCase();
    const specificPattern = new RegExp(`\\b[a-z][a-z0-9-]*\\s+${noun}\\b`, 'i');
    const genericPattern = new RegExp(`\\bany\\s+${noun}\\b`, 'i');
    if (specificPattern.test(combinedSources) && !genericPattern.test(combinedSources)) {
      flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_UNSUPPORTED_BROADENING);
    }
  }

  if (claimsText && specificationText) {
    try {
      const verification = verifyClaimSupport112(claimsText, specificationText);
      if (verification.issues?.length) flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_CLAIM_CONFLICT);
    } catch {
      flags.add('ABSTRACT_CLAIM_VERIFICATION_UNAVAILABLE');
    }
  }
  if (supportMap.sentences.some((sentence) => sentence.status === ABSTRACT_SUPPORT_STATUSES.UNSUPPORTED)) {
    if (specificationText) flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_SPECIFICATION_CONFLICT);
    if (claimsText) flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_CLAIM_CONFLICT);
  }

  const sourceVocabulary = countVocabularyTerms(combinedSources);
  const abstractVocabulary = countVocabularyTerms(sanitizedText);
  for (const [term] of abstractVocabulary) {
    if (!sourceVocabulary.has(term) && [...sourceVocabulary.keys()].length > 0) {
      flags.add('TERM_CONFLICT');
      break;
    }
  }

  const titleTokens = extractMeaningfulTokens(title);
  const abstractTokens = new Set(extractMeaningfulTokens(sanitizedText));
  if (titleTokens.length > 0 && !titleTokens.some((token) => abstractTokens.has(token))) {
    flags.add(ABSTRACT_REVIEW_FLAGS.TITLE_ABSTRACT_CONSISTENCY_REVIEW_REQUIRED);
  }

  if (/\bFIGS?\.\s*\d+|\b\d{1,4}\s*(?:reference|numeral)|\([0-9]{1,4}\)/.test(sanitizedText)) {
    flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_REFERENCE_NUMERAL_REVIEW_REQUIRED);
  }
  if (/\b(existing|current|conventional|prior)\b.{0,80}\b(fail|fails|failure|unable|inadequate|inferior)\b/i.test(sanitizedText)) {
    flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_PRIOR_ART_ADMISSION_REVIEW_REQUIRED);
  }

  let finalText = sanitizedText;
  let finalSupportMap = supportMap;
  if (combinedSources) {
    const removal = removeUnsupportedTechnicalTerms(sanitizedText, combinedSources, title);
    if (removal.removed.length && removal.text !== sanitizedText) {
      flags.add(ABSTRACT_REVIEW_FLAGS.ABSTRACT_NEW_MATTER_DETECTED);
      flags.add('ABSTRACT_NEW_MATTER_REMOVED');
      finalText = removal.text;
      finalSupportMap = buildAbstractSupportMap({
        abstractText: finalText, specificationText, claimsText, disclosureText, applicationText, facts, provenance,
      });
    }
  }

  return { sanitizedText: finalText, supportMap: finalSupportMap, flags: [...flags] };
}

export function classifyTechnicalEffect(effectText = '', sources = {}) {
  const effect = normalizeAbstractWhitespace(effectText);
  if (!effect || effect === 'UNKNOWN') return ABSTRACT_TECHNICAL_EFFECT_STATUSES.UNKNOWN;
  const combined = getCombinedSourceText(sources);
  const quantitativePattern = /(\d+\s?%|\d+\s?x\b|\b\d+(?:\.\d+)?\s*(?:percent|ms|milliseconds|seconds|minutes|hours|watts?|mah|nm|mm|cm|gb|mbps|ghz)\b|\b(latency|accuracy|throughput|efficiency|yield|energy|power|speed)\b.{0,30}\b(improv|reduc|increas|faster|slower|lower|higher|savings?)\b)/i;
  const quantitative = quantitativePattern.test(effect);
  const supportedVerbatim = combined && normalizeAbstractWhitespace(combined).toLowerCase().includes(effect.toLowerCase().slice(0, 48));
  if (quantitative && !supportedVerbatim) return ABSTRACT_TECHNICAL_EFFECT_STATUSES.UNSUPPORTED;
  if (supportedVerbatim) return ABSTRACT_TECHNICAL_EFFECT_STATUSES.SOURCE_SUPPORTED;
  if (combined) return ABSTRACT_TECHNICAL_EFFECT_STATUSES.USER_ASSERTED;
  return ABSTRACT_TECHNICAL_EFFECT_STATUSES.UNSUPPORTED;
}

function sentenceScore(sentence, coreTokens) {
  const tokens = extractMeaningfulTokens(sentence);
  const overlap = tokens.filter((token) => coreTokens.has(token)).length;
  let score = overlap * 3 + Math.min(tokens.length / 8, 2);
  if (/\boptional\b|\bin some embodiments\b|\bfor example\b|\be\.g\.\b|\balternatively\b/i.test(sentence)) score -= 4;
  if (new RegExp(MARKETING_TERMS.map((term) => `\\b${term}\\b`).join('|'), 'i').test(sentence)) score -= 10;
  if (LEGAL_CONCLUSION_PATTERNS.some((pattern) => pattern.test(sentence))) score -= 10;
  return score;
}

export function shortenAbstractDeterministic({
  abstractText = '',
  specificationText = '',
  claimsText = '',
  facts = {},
  targetReduction = 0.25,
} = {}) {
  const validation = validateAbstractDraft({ abstractText, specificationText, claimsText, facts });
  const candidates = validation.supportMap.sentences.map((item) => item.abstract_sentence).filter(Boolean);
  if (candidates.length <= 1) return { text: validation.sanitizedText, removed: [], validation };
  const coreTokens = new Set([
    ...extractMeaningfulTokens(facts.core_solution || ''),
    ...extractMeaningfulTokens(facts.principal_components || ''),
    ...extractMeaningfulTokens(claimsText),
    ...extractMeaningfulTokens(specificationText),
  ]);
  const ranked = candidates
    .map((sentence, index) => ({ sentence, index, score: sentenceScore(sentence, coreTokens) }))
    .sort((a, b) => a.score - b.score);
  const removeCount = Math.max(1, Math.ceil(candidates.length * targetReduction));
  const removable = ranked.filter((item) => item.score < 4 || validation.supportMap.sentences[item.index].status !== ABSTRACT_SUPPORT_STATUSES.SUPPORTED);
  const selected = (removable.length ? removable : ranked).slice(0, Math.min(removeCount, candidates.length - 1));
  const removedIndexes = new Set(selected.map((item) => item.index));
  const retained = candidates.filter((_, index) => !removedIndexes.has(index));
  return {
    text: normalizeAbstractWhitespace(retained.join(' ')),
    removed: selected.map((item) => item.sentence),
    validation,
  };
}

function describeInventionType(type = 'SYSTEM') {
  const normalized = String(type || 'SYSTEM').toUpperCase();
  const labels = {
    SYSTEM: 'system', METHOD: 'method', DEVICE: 'device', APPARATUS: 'apparatus', SOFTWARE: 'software system',
    AI_ML: 'machine-learning system', MECHANICAL: 'mechanical apparatus', ELECTRONICS: 'electronic system',
    CHEMICAL: 'chemical process', COMPOSITION: 'composition', PHARMACEUTICAL: 'pharmaceutical composition',
    BIOTECH: 'biotechnical system', MANUFACTURING: 'manufacturing method',
  };
  return labels[normalized] || 'technical system';
}

export function assemblePatentAbstract({
  facts = {},
  specificationText = '',
  claimsText = '',
  disclosureText = '',
  applicationText = '',
  workflowMode = 'ABSTRACT_FROM_MATTER_CONTEXT',
  jurisdiction = 'UNDECIDED',
  targetWordLimit = null,
  ruleSource = null,
  ruleVersion = null,
  provenance = {},
} = {}) {
  const effectStatus = classifyTechnicalEffect(facts.technical_effect, {
    specification: specificationText, claims: claimsText, disclosure: disclosureText, application: applicationText,
  });
  const sentences = [];
  if (facts.title && facts.technical_problem && facts.technical_problem !== 'UNKNOWN') {
    sentences.push(`A ${describeInventionType(facts.invention_type)} relating to ${facts.title} addresses ${facts.technical_problem}.`);
  } else if (facts.technical_problem && facts.technical_problem !== 'UNKNOWN') {
    sentences.push(`A ${describeInventionType(facts.invention_type)} addresses ${facts.technical_problem}.`);
  }
  if (facts.core_solution && facts.core_solution !== 'UNKNOWN' && facts.principal_components && facts.principal_components !== 'UNKNOWN') {
    sentences.push(`The solution comprises ${facts.principal_components}, configured so that ${facts.core_solution}.`);
  } else if (facts.core_solution && facts.core_solution !== 'UNKNOWN') {
    sentences.push(`The solution is configured so that ${facts.core_solution}.`);
  } else if (facts.principal_components && facts.principal_components !== 'UNKNOWN') {
    sentences.push(`The system comprises ${facts.principal_components}.`);
  }
  if (effectStatus === ABSTRACT_TECHNICAL_EFFECT_STATUSES.SOURCE_SUPPORTED) {
    sentences.push(`${facts.technical_effect}.`);
  }
  if (workflowMode === 'ABSTRACT_FROM_CLAIMS' && !specificationText && !disclosureText) {
    sentences.push('The abstract is limited to the available claim language because specification context was not supplied.');
  }

  let draft = sanitizeAbstractProse(sentences.join(' '));
  let shortening = null;
  let wordCount = createAbstractWordCountRecord({ abstractText: draft, targetLimit: targetWordLimit, jurisdiction, ruleSource, ruleVersion });
  if (wordCount.status === 'OVER_TARGET') {
    shortening = shortenAbstractDeterministic({ abstractText: draft, specificationText, claimsText, facts });
    draft = shortening.text;
    wordCount = createAbstractWordCountRecord({ abstractText: draft, targetLimit: targetWordLimit, jurisdiction, ruleSource, ruleVersion });
  }
  const validation = validateAbstractDraft({
    abstractText: draft, title: facts.title, specificationText, claimsText, disclosureText, applicationText, facts, provenance,
  });
  if (wordCount.status === 'OVER_TARGET') validation.flags.push(ABSTRACT_REVIEW_FLAGS.ABSTRACT_WORD_LIMIT_REVIEW_REQUIRED);

  return {
    abstractText: validation.sanitizedText,
    wordCount,
    technicalEffectStatus: effectStatus,
    validation,
    shortening,
    workflowMode,
    jurisdiction,
    provenance: {
      technical_problem: provenance.technical_problem || PROVENANCE_STATES.USER_PROVIDED,
      core_solution: provenance.core_solution || PROVENANCE_STATES.USER_PROVIDED,
      principal_components: provenance.principal_components || PROVENANCE_STATES.USER_PROVIDED,
      technical_effect: effectStatus === ABSTRACT_TECHNICAL_EFFECT_STATUSES.SOURCE_SUPPORTED
        ? PROVENANCE_STATES.VERIFIED
        : PROVENANCE_STATES.UNVERIFIED,
    },
  };
}

export function rewriteAbstractPreservingMeaning({
  existingAbstract = '',
  specificationText = '',
  claimsText = '',
  disclosureText = '',
  applicationText = '',
  facts = {},
} = {}) {
  const validation = validateAbstractDraft({ abstractText: existingAbstract, specificationText, claimsText, disclosureText, applicationText, facts });
  return { text: validation.sanitizedText, validation, changed: validation.sanitizedText !== normalizeAbstractWhitespace(existingAbstract) };
}

export function compareAbstractVersions(previousText = '', nextText = '') {
  const previous = splitAbstractSentences(previousText);
  const next = splitAbstractSentences(nextText);
  const previousSet = new Set(previous.map((sentence) => sentence.toLowerCase()));
  const nextSet = new Set(next.map((sentence) => sentence.toLowerCase()));
  const previousTokens = new Set(extractMeaningfulTokens(previousText));
  const nextTokens = new Set(extractMeaningfulTokens(nextText));
  return {
    added_propositions: next.filter((sentence) => !previousSet.has(sentence.toLowerCase())),
    deleted_propositions: previous.filter((sentence) => !nextSet.has(sentence.toLowerCase())),
    added_terms: [...nextTokens].filter((token) => !previousTokens.has(token)),
    removed_terms: [...previousTokens].filter((token) => !nextTokens.has(token)),
    previous_word_count: countAbstractWords(previousText),
    next_word_count: countAbstractWords(nextText),
  };
}

export function createAbstractVersion({
  index = 1,
  text = '',
  workflowMode = 'ABSTRACT_FROM_MATTER_CONTEXT',
  jurisdiction = 'UNDECIDED',
  sourceSnapshot = {},
  wordCount = null,
  creator = 'SALLYIP_ABSTRACT_WORKFLOW',
  status = 'DRAFT',
} = {}) {
  return {
    version: `v${index}`,
    timestamp: new Date().toISOString(),
    text: normalizeAbstractWhitespace(text),
    text_hash: hashSourceText(text),
    word_count: wordCount?.word_count ?? countAbstractWords(text),
    workflow_mode: workflowMode,
    jurisdiction,
    source_snapshot: sourceSnapshot,
    creator,
    status,
  };
}

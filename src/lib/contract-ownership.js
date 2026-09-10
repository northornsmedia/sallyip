// SallyIP contract-ownership signals v1 — EXTENSION, not a replacement.
// Pure deterministic helpers for IP-ownership / assignment clause triage.
// Does NOT modify flagClause (contract-service.js) or checkEntailment
// (entailment-service.js). No DB, no network, no live model calls.
//
// Covers three known weaknesses documented in benchmarks/external/legalbench-probe.json:
//   1. vesting-language synonyms (vest / work product / work-made-for-hire / deliverables)
//      that lexical entailment misses;
//   2. assign-vs-license distinction (grant of license, even exclusive/perpetual,
//      is NOT an assignment when ownership/title is retained or never transferred);
//   3. retention red flags (retains / reserves / pre-existing / nothing assigns /
//      agree-to-agree negotiation) that share IP vocabulary but mean No transfer.

const IP_SUBJECT = [
  /intellectual property/i,
  /\bwork product\b/i,
  /right,?\s*title and interest/i,
  /\binventions?\b/i,
  /\bpatents?\b/i,
  /\bdeliverables?\b/i,
  /patent rights/i,
  /copyrights?/i,
  /trade secrets?/i,
  /\bIP rights\b/i,
  /\bbackground technology\b/i,
  /\bcustomer data\b/i,
];

const ASSIGN_VERB = [
  /hereby assigns?/i,
  /\bassign(s|ed|ing|ment)?\b/i,
  /\bconvey(s|ed|ing)?\b/i,
  /\btransfer(s|red|ring)?\b/i,
  /\bowned by\b/i,
  /\bbelongs?\b[^.]{0,40}\b(client|customer|company|employer|counterparty|assignee)\b/i,
  /\bsole (property|ownership)\b/i,
  /exclusive ownership/i,
];

const VESTING = [
  /\bvest(s|ed|ing)?\b/i,
  /\bshall vest\b/i,
  /\bwill vest\b/i,
  /\bvests?\b[^.]{0,40}\b(client|customer|company|employer|counterparty|exclusively|solely)\b/i,
];

const WORK_FOR_HIRE = [/works?\s+made\s+for\s+hire/i, /work-made-for-hire/i];

const LICENSE_GRANT = [
  /\blicen[cs]e\b/i,
  /\bgrant(s|ed|ing)?\b[^.]{0,80}\blicen[cs]e\b/i,
  /\bright to use\b/i,
  /\bnon-exclusive\b/i,
  /\bnon-transferable\b/i,
];

const RETENTION = [
  /\bretain(s|ed|ing)?\b/i,
  /\breserv(e|es|ed|ing)\b[^.]{0,20}\brights?\b/i,
  /pre-existing/i,
  /background (technology|ip|intellectual property)/i,
  /prior inventions?/i,
  /each party (owns|retains)/i,
  /retaining title/i,
  /without transferring ownership/i,
  /title .* retained/i,
  /no .* (transferred|allocation is made)/i,
];

const NEGATED_ASSIGN = [
  /nothing in this[^.]{0,80}\bassign/i,
  /\bdoes not\b[^.]{0,80}\bassign/i,
  /\bdo not\b[^.]{0,80}\bassign/i,
  /\bshall not\b[^.]{0,80}\bassign/i,
  /\bwill not\b[^.]{0,80}\bassign/i,
  /\bno assignment\b/i,
  /\bnever assign/i,
  /\bno ownership\b[^.]{0,40}\btransfer/i,
  /\bis not\b[^.]{0,40}\btransfer/i,
];

const NEGOTIATE_ONLY = [
  /negotiat/i,
  /agree to agree/i,
  /discuss and agree/i,
  /agree upon allocation/i,
  /to be (agreed|determined|negotiated)/i,
  /no allocation is made/i,
];

const AGREEMENT_ASSIGNMENT_ONLY = [
  /neither party may assign (this agreement|any rights hereunder)/i,
  /without the prior written consent/i,
  /may not assign this agreement/i,
];

const BENEFICIARY = /\b(client|customer|company|employer|counterparty|assignee)\b/i;

const has = (text, patterns) => patterns.some((r) => r.test(text));

function norm(text) {
  return String(text || '');
}

/** Raw signal booleans for a clause. Pure. */
export function detectOwnershipSignals(clauseText) {
  const text = norm(clauseText);
  const hasIpSubject = has(text, IP_SUBJECT);
  // "without transferring/assigning ..." explicitly denies transfer: do not count
  // that verb occurrence as affirmative assignment language.
  const cleanedForAssign = text.replace(/without[^.]{0,30}(transferring|transfer|assigning|assignment|conveying|vesting)/gi, ' ');
  const hasAssignVerb = has(cleanedForAssign, ASSIGN_VERB);
  const hasVesting = has(text, VESTING);
  const hasWorkMadeForHire = has(text, WORK_FOR_HIRE);
  const hasLicenseGrant = has(text, LICENSE_GRANT);
  const hasRetention = has(text, RETENTION);
  const hasNegatedAssignment = has(text, NEGATED_ASSIGN);
  const hasNegotiateOnly = has(text, NEGOTIATE_ONLY);
  const hasAgreementAssignmentOnly =
    has(text, AGREEMENT_ASSIGNMENT_ONLY) && !hasVesting && !has(text, [/hereby assign/i, /shall vest/i, /right,?\s*title and interest/i]);
  // License-only = license grant present with NO assignment/vesting/work-for-hire transfer verb.
  // Exclusive or perpetual breadth does not convert a license into an assignment.
  const licenseOnly = hasLicenseGrant && !hasAssignVerb && !hasVesting && !hasWorkMadeForHire;
  const affirmativeTransfer =
    (hasAssignVerb && hasIpSubject) || (hasVesting && hasIpSubject) || (hasWorkMadeForHire && hasIpSubject);
  return {
    hasIpSubject,
    hasAssignVerb,
    hasVesting,
    hasWorkMadeForHire,
    hasLicenseGrant,
    licenseOnly,
    hasRetention,
    hasNegatedAssignment,
    hasNegotiateOnly,
    hasAgreementAssignmentOnly,
    hasBeneficiary: BENEFICIARY.test(text),
    affirmativeTransfer,
  };
}

/** True when assignment/transfer/vesting transfer verbs are present. Pure. */
export function isAssignmentLanguage(clauseText) {
  const s = detectOwnershipSignals(clauseText);
  return s.hasAssignVerb || s.hasVesting || s.hasWorkMadeForHire;
}

/** True when vesting-family language (vest/vests/vested/shall vest) is present. Pure. */
export function isVestingLanguage(clauseText) {
  return detectOwnershipSignals(clauseText).hasVesting;
}

/** True when the clause grants only a license (no assignment/vesting verbs). Pure. */
export function isLicenseOnly(clauseText) {
  return detectOwnershipSignals(clauseText).licenseOnly;
}

/** True when retention/reservation/pre-existing language is present. Pure. */
export function hasRetentionSignal(clauseText) {
  return detectOwnershipSignals(clauseText).hasRetention;
}

/** True when the clause explicitly negates an assignment/transfer. Pure. */
export function hasNegatedAssignment(clauseText) {
  return detectOwnershipSignals(clauseText).hasNegatedAssignment;
}

/**
 * Classify a clause for the CUAD-style question: does IP created by one party
 * become the property of the counterparty? Returns Yes/No (never null).
 * Fail-closed: no transfer language -> No with low confidence. Pure.
 */
export function classifyIpOwnership(clauseText) {
  const text = norm(clauseText);
  const s = detectOwnershipSignals(text);
  const reasons = [];

  if (s.hasNegatedAssignment) {
    reasons.push('explicit negated assignment (nothing/does-not/shall-not assign, no transfer)');
    return { assigns_ip: 'No', confidence: 'high', reasons, signals: s };
  }
  if (s.licenseOnly) {
    reasons.push('license-only grant with no assign/vest/transfer verb (license != assignment)');
    if (s.hasRetention) reasons.push('retention/reservation reinforces license-only reading');
    return { assigns_ip: 'No', confidence: 'high', reasons, signals: s };
  }
  if (s.hasAgreementAssignmentOnly) {
    reasons.push('agreement anti-assignment/consent gate only; no IP ownership transfer');
    return { assigns_ip: 'No', confidence: 'high', reasons, signals: s };
  }
  if (s.affirmativeTransfer) {
    if (s.hasVesting && s.hasIpSubject) reasons.push('vesting language with IP subject (shall vest / vests + work product / right title interest)');
    if (s.hasWorkMadeForHire) reasons.push('work-made-for-hire designation');
    if (/hereby assigns?/i.test(text)) reasons.push('present assignment (hereby assign)');
    else if (s.hasAssignVerb) reasons.push('assignment verb with IP subject (assign/convey/transfer)');
    if (s.hasRetention || s.hasNegotiateOnly) reasons.push('note: retention/negotiation words present but affirmative transfer controls');
    return { assigns_ip: 'Yes', confidence: 'high', reasons, signals: s };
  }
  if (s.hasRetention) {
    reasons.push('retention/reservation/pre-existing language with no affirmative transfer');
    return { assigns_ip: 'No', confidence: 'medium', reasons, signals: s };
  }
  if (s.hasNegotiateOnly) {
    reasons.push('agree-to-agree: ownership deferred to future negotiation, no present transfer');
    return { assigns_ip: 'No', confidence: 'medium', reasons, signals: s };
  }
  reasons.push('no assignment, vesting, or transfer language with an IP subject (fail closed)');
  return { assigns_ip: 'No', confidence: 'low', reasons, signals: s };
}

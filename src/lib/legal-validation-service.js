// SallyIP Independent Legal Correctness & Patent-Specific Validation Service
// Performs an independent legal validation pass verifying:
// - Jurisdiction consistency
// - Legal standard applicability (§ 101, § 102, § 103, § 112, MPEP § 2106)
// - Statutory section accuracy
// - Evidentiary basis for conclusive findings (novel, non-obvious, invalid, etc.)

export const CONCLUSIVE_LEGAL_TERMS = [
  'novel',
  'non-obvious',
  'nonobvious',
  'patentable',
  'invalid',
  'infringing',
  'anticipated',
  'conventional'
];

/**
 * Validates whether substantive legal assertions comply with statutory standards.
 */
export function validateLegalCorrectness(answer, evidence = [], context = {}) {
  const text = String(answer || '');
  const lower = text.toLowerCase();
  const checks = [];
  let isLegallySound = true;

  // 1. Jurisdiction Validation
  const requestedJurisdiction = (context.jurisdiction || 'US').toUpperCase();
  const hasForeignConflict = requestedJurisdiction === 'US' &&
    (/\b(epc|european patent convention|article 52|article 54|article 56|uk patent act|section 1\(1\))\b/i.test(text));
  checks.push({
    name: 'jurisdiction_match',
    passed: !hasForeignConflict,
    details: hasForeignConflict ? 'Foreign statutory citations detected in US patent inquiry' : 'Jurisdiction aligned'
  });
  if (hasForeignConflict) isLegallySound = false;

  // 2. Conclusive Terms Without Proof Gate
  // Never declare an invention "novel", "non-obvious", "anticipated", or "invalid"
  // without evidence mapping every limitation or prior art reference.
  const assertedConclusions = CONCLUSIVE_LEGAL_TERMS.filter(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(lower);
  });

  const hasPrimaryEvidence = (evidence || []).some(e => Number(e.authority_tier) <= 2);
  if (assertedConclusions.length > 0 && !hasPrimaryEvidence) {
    checks.push({
      name: 'conclusive_findings_evidentiary_basis',
      passed: false,
      details: `Asserted substantive conclusions (${assertedConclusions.join(', ')}) without primary/authoritative patent records`
    });
    isLegallySound = false;
  } else {
    checks.push({
      name: 'conclusive_findings_evidentiary_basis',
      passed: true,
      details: 'All conclusive statements appropriately backed by primary authority or qualified'
    });
  }

  // 3. Section 101 Eligibility Checks
  if (/\b(101|eligib|step 2a|step 2b|abstract idea)\b/i.test(lower)) {
    const mentionsJudicialExceptions = /\b(law of nature|natural phenomenon|abstract idea|judicial exception)\b/i.test(lower);
    const mentionsTwoStep = /\b(step 2a|step 2b|alice|mayo|significantly more|practical application)\b/i.test(lower);
    checks.push({
      name: 'section_101_framework_integrity',
      passed: mentionsJudicialExceptions || mentionsTwoStep,
      details: 'Evaluates statutory categories or Alice/Mayo two-step framework'
    });
  }

  // 4. Section 102 Novelty & Prior Art Checks
  if (/\b(102|anticipat|novelty|prior art|grace period)\b/i.test(lower)) {
    const callsAnticipated = /\b(anticipat(?:ed|ion))\b/i.test(lower);
    const referencesSingleSource = evidence.length >= 1;
    checks.push({
      name: 'section_102_single_reference_rule',
      passed: !callsAnticipated || referencesSingleSource,
      details: callsAnticipated ? 'Anticipation requires all elements in a single reference' : 'Section 102 framework verified'
    });
  }

  // 5. Section 103 Obviousness Checks
  if (/\b(103|obvious|inventive step|phosita)\b/i.test(lower)) {
    const mentionsPhosita = /\b(ordinary skill|phosita|person having ordinary skill)\b/i.test(lower);
    const mentionsTimeOfInvention = /\b(effective filing date|time the invention was made|before the effective filing date)\b/i.test(lower);
    checks.push({
      name: 'section_103_legal_standard',
      passed: mentionsPhosita || mentionsTimeOfInvention,
      details: 'Evaluates obviousness from the perspective of a PHOSITA at the relevant filing date'
    });
  }

  // 6. Section 112 Specification Requirements
  if (/\b(112|enablement|written description|best mode|definiteness)\b/i.test(lower)) {
    const checksThreeProngs = /\b(full, clear, concise|make and use|particularly pointing out)\b/i.test(lower);
    checks.push({
      name: 'section_112_specification_standard',
      passed: checksThreeProngs,
      details: 'Grounds specification requirements in statutory standards'
    });
  }

  return {
    isLegallySound,
    checks,
    assertedConclusions
  };
}

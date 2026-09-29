/**
 * SALLYIP PATENT DRAFTING VALIDATOR
 * 
 * 10-Point Automated Patent Quality & Statutory Compliance Pipeline
 * Internal Workflow:
 * Draft → Support-Check → Legal Terminology Check → Claim/Specification Mapping →
 * § 101/112 Stress Test → Prior-Art Warning → Final Output
 */

export const CONTROLLED_LEGAL_TERMS = new Map([
  ['definiteness', { statute: '35 U.S.C. § 112(b)', valid: true, note: 'Particularity and distinct claiming requirement' }],
  ['written description', { statute: '35 U.S.C. § 112(a)', valid: true, note: 'Possession of the claimed subject matter' }],
  ['enablement', { statute: '35 U.S.C. § 112(a)', valid: true, note: 'Enable PHOSITA to make and use without undue experimentation' }],
  ['means-plus-function', { statute: '35 U.S.C. § 112(f)', valid: true, note: 'Functional element construed to cover corresponding structure in spec' }],
  ['step-plus-function', { statute: '35 U.S.C. § 112(f)', valid: true, note: 'Act-plus-function limitation in method claim' }],
  ['inventive concept', { statute: '35 U.S.C. § 101', valid: true, note: 'Alice Step 2B significantly more than abstract idea' }],
  ['subject matter eligibility', { statute: '35 U.S.C. § 101', valid: true, note: 'Statutory categories: process, machine, manufacture, composition' }],
  ['novelty', { statute: '35 U.S.C. § 102', valid: true, note: 'Single prior-art reference disclosing every limitation' }],
  ['non-obviousness', { statute: '35 U.S.C. § 103', valid: true, note: 'Differences over prior art obvious to PHOSITA (Graham factors)' }],
  ['antecedent basis', { statute: '35 U.S.C. § 112(b)', valid: true, note: 'Definite article must refer to previously introduced element' }],
  ['phosita', { statute: '35 U.S.C. § 103', valid: true, note: 'Person having ordinary skill in the art' }],
  ['person having ordinary skill in the art', { statute: '35 U.S.C. § 103', valid: true, note: 'Legal standard for obviousness and enablement' }],
  ['prosecution history estoppel', { statute: 'Common Law Doctrine', valid: true, note: 'Surrendered subject matter during prosecution cannot be reclaimed under DOE' }],
  ['doctrine of equivalents', { statute: 'Common Law Doctrine', valid: true, note: 'Substantially same function, way, result (Graver Tank / Warner-Jenkinson)' }]
])

export const FABRICATED_OR_DISALLOWED_TERMS = [
  { term: 'definite authorship', correction: 'Definiteness under 35 U.S.C. § 112(b); "authorship" is a copyright concept, not patent law.' },
  { term: 'patent compliance engine', correction: 'Overbroad result-oriented language. Identify specific processing steps and statutory requirements being evaluated.' },
  { term: 'inherent novelty', correction: 'Novelty is determined by prior art comparison under § 102. Inherency applies to anticipation (§ 102), not novelty generation.' },
  { term: 'prosecution guarantee', correction: 'Patent prosecution is discretionary with USPTO examiners; no AI or specification can promise allowance.' },
  { term: 'enforces §112 compliance', correction: 'Overbroad functional statement. Recite specific automated tests: antecedent basis, dependency, and specification-support verification.' }
]

export const BAD_DRAFT_ATTORNEY_CORRECTIONS = [
  {
    bad: 'configured to ensure patent compliance.',
    attorney_correction: 'Unsupported result-oriented language. Identify the specific processing steps used to evaluate compliance and identify which compliance requirement is being assessed (e.g., verifying antecedent basis under § 112(b) or checking claim limitation support under § 112(a)).',
    category: 'FUNCTIONAL_CLAIMING'
  },
  {
    bad: 'the invention is novel because it independently verifies AI output.',
    attorney_correction: 'Novelty is a conclusion requiring prior-art analysis under 35 U.S.C. § 102. Rewrite as: "In one embodiment, the system includes a verification component separate from the generative model..." and reserve novelty conclusions until search results are available.',
    category: 'PREMATURE_NOVELTY'
  },
  {
    bad: 'enforces §112 compliance.',
    attorney_correction: 'Overbroad. Describe individual tests such as antecedent-basis detection, dependency validation, terminology consistency, and specification-support checks.',
    category: 'VAGUE_STATUTE_CITATION'
  },
  {
    bad: 'a verification engine configured to eliminate all legal research hallucinations.',
    attorney_correction: 'Laudatory absolute statement creating written description estoppel. Recite deterministic quotation verification, citation regex extraction, and database truth-table matching.',
    category: 'ABSOLUTE_STATEMENT'
  },
  {
    bad: 'said verification engine satisfying definite authorship requirements.',
    attorney_correction: 'Legally erroneous terminology conflating copyright authorship with patent claim definiteness under 35 U.S.C. § 112(b). Replace with distinct claim boundaries and explicit structural support.',
    category: 'ERRONEOUS_LEGAL_TERM'
  }
]

const CLAIM_STOP_WORDS = new Set([
  'configured', 'wherein', 'operatively', 'coupled', 'connected', 'having', 'comprising',
  'includes', 'including', 'further', 'to', 'for', 'which', 'that', 'of', 'in', 'with',
  'and', 'or', 'by', 'is', 'are', 'said', 'the', 'a', 'an', 'at', 'least', 'one',
  'validates', 'controls', 'extracts', 'stores', 'receives', 'transmits', 'determines',
  'performs', 'causes', 'generates', 'provides', 'executes', 'operates', 'assigns'
])

function extractCleanNounPhrases(text, article = 'indefinite') {
  const isDefinite = article === 'definite'
  const pattern = isDefinite
    ? /\b(?:the|said)\s+([a-z0-9_-]+(?:\s+[a-z0-9_-]+)*?)(?=\s+(?:configured|wherein|operatively|coupled|connected|having|comprising|includes|including|further|to|for|which|that|of|in|with|\band\b|\bor\b|\bby\b|\bis\b|\bare\b|\ba\b|\ban\b|\bthe\b|\bsaid\b)|[;,.:()\n]|$)/gi
    : /\b(?:a|an)\s+([a-z0-9_-]+(?:\s+[a-z0-9_-]+)*?)(?=\s+(?:configured|wherein|operatively|coupled|connected|having|comprising|includes|including|further|to|for|which|that|of|in|with|\band\b|\bor\b|\bby\b|\bis\b|\bare\b|\ba\b|\ban\b|\bthe\b|\bsaid\b)|[;,.:()\n]|$)/gi

  const phrases = []
  let match
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1].toLowerCase().replace(/[;,.:()]/g, ' ').trim()
    if (raw && raw.length >= 2) {
      phrases.push(raw)
    }
  }
  return phrases
}

// 1. Antecedent Basis Checker (35 U.S.C. § 112(b))
export function validateAntecedentBasis(claimsText = '') {
  const issues = []
  const claimBlocks = String(claimsText).split(/(?:^|\n)(?=\d+\.\s+)/).filter(Boolean)
  const introducedTermsByClaim = new Map()

  for (const block of claimBlocks) {
    const numMatch = block.match(/^(\d+)\.\s+/)
    if (!numMatch) continue
    const claimNum = parseInt(numMatch[1], 10)
    const introduced = new Set()

    // Find parent claim if dependent
    const depMatch = block.match(/(?:of|according to)\s+claim\s+(\d+)/i)
    const parentClaim = depMatch ? parseInt(depMatch[1], 10) : null

    // Inherit terms from parent claim
    if (parentClaim && introducedTermsByClaim.has(parentClaim)) {
      for (const t of introducedTermsByClaim.get(parentClaim)) {
        introduced.add(t)
      }
    }

    // Identify preamble type (e.g. system, method, apparatus, medium)
    const preambleMatch = block.match(/^\d+\.\s+(?:a|an)\s+([a-z0-9_-]+(?:\s+[a-z0-9_-]+){0,2})/i)
    if (preambleMatch) {
      const pTerm = preambleMatch[1].toLowerCase()
      introduced.add(pTerm)
      if (pTerm.includes('system')) introduced.add('system')
      if (pTerm.includes('method')) introduced.add('method')
      if (pTerm.includes('medium')) introduced.add('medium')
    }

    // Extract indefinite articles "a/an"
    const indefinitePhrases = extractCleanNounPhrases(block, 'indefinite')
    for (const term of indefinitePhrases) {
      if (!['plurality', 'first', 'second', 'third'].includes(term)) {
        introduced.add(term)
      }
    }
    introducedTermsByClaim.set(claimNum, introduced)

    // Check definite articles "the/said"
    const definitePhrases = extractCleanNounPhrases(block, 'definite')
    for (const term of definitePhrases) {
      // Skip dependency references like "the system of claim 1"
      if (/^(system|method|apparatus|medium)$/.test(term) && /(?:system|method|apparatus|medium)\s+of\s+claim\s+\d+/i.test(block)) {
        continue
      }
      const skipTerms = ['invention', 'method', 'system', 'apparatus', 'disclosure', 'step', 'process', 'present disclosure', 'user', 'user interface']
      if (skipTerms.includes(term)) continue

      const hasDirect = introduced.has(term)
      const hasSubword = Array.from(introduced).some(d => d.includes(term) || term.includes(d))

      if (!hasDirect && !hasSubword) {
        issues.push({
          claimNumber: claimNum,
          type: 'MISSING_ANTECEDENT_BASIS',
          term,
          message: `Claim ${claimNum} references "the ${term}" without preceding introduction as "a/an ${term}". Violates 35 U.S.C. § 112(b).`
        })
      }
    }
  }

  return {
    passed: issues.length === 0,
    issueCount: issues.length,
    issues
  }
}

// 2. Claim Limitation to Specification Support Check (35 U.S.C. § 112(a))
export function validateClaimSpecificationSupport(claimsText = '', specText = '') {
  const spec = String(specText || '').toLowerCase()
  const claims = String(claimsText || '')
  const claimBlocks = claims.split(/(?:^|\n)(?=\d+\.\s+)/).filter(Boolean)
  const mapping = []
  const missingLimitations = []

  for (const block of claimBlocks) {
    const numMatch = block.match(/^(\d+)\.\s+/)
    if (!numMatch) continue
    const claimNum = numMatch[1]

    const phrases = [...new Set([...extractCleanNounPhrases(block, 'indefinite'), ...extractCleanNounPhrases(block, 'definite')])]
    const seenInClaim = new Set()

    for (const limitation of phrases) {
      if (limitation.length < 3 || seenInClaim.has(limitation)) continue
      if (['plurality', 'first', 'second', 'system', 'method', 'apparatus', 'medium', 'step'].includes(limitation)) continue
      seenInClaim.add(limitation)

      const supported = spec.includes(limitation) || limitation.split(/\s+/).every(word => spec.includes(word))
      mapping.push({
        claimNumber: claimNum,
        limitation,
        supported,
        citation: supported ? 'Found in Detailed Description' : 'Missing from specification (§ 112(a) risk)'
      })

      if (!supported && spec.length > 50) {
        missingLimitations.push({
          claimNumber: claimNum,
          limitation,
          severity: 'HIGH',
          detail: `Limitation "${limitation}" in claim ${claimNum} has no literal or substantive support in the Detailed Description.`
        })
      }
    }
  }

  const supportedCount = mapping.filter(m => m.supported).length
  const supportRatio = mapping.length > 0 ? (supportedCount / mapping.length) : 1

  return {
    passed: missingLimitations.length === 0,
    supportPercentage: Math.round(supportRatio * 100),
    totalLimitations: mapping.length,
    missingLimitations,
    mapping
  }
}

// 3. Controlled Legal Terminology QA
export function validateLegalTerminology(text = '') {
  const raw = String(text || '')
  const issues = []

  for (const bad of FABRICATED_OR_DISALLOWED_TERMS) {
    const re = new RegExp(`\\b${bad.term}\\b`, 'gi')
    if (re.test(raw)) {
      issues.push({
        type: 'FABRICATED_LEGAL_TERM',
        term: bad.term,
        recommendation: bad.correction,
        severity: 'CRITICAL'
      })
    }
  }

  const lower = raw.toLowerCase()
  for (const [term] of CONTROLLED_LEGAL_TERMS.entries()) {
    if (lower.includes(term)) {
      if (term === 'definiteness' && lower.includes('definiteness under § 101')) {
        issues.push({
          type: 'STATUTORY_MISMATCH',
          term,
          message: 'Definiteness is governed by 35 U.S.C. § 112(b), not § 101.',
          severity: 'HIGH'
        })
      }
      if (term === 'written description' && lower.includes('written description under § 102')) {
        issues.push({
          type: 'STATUTORY_MISMATCH',
          term,
          message: 'Written description is governed by 35 U.S.C. § 112(a), not § 102.',
          severity: 'HIGH'
        })
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues
  }
}

// 4. Unsupported Absolute Statements & Premature Novelty Check
export function validateUnsupportedAbsoluteStatements(text = '') {
  const raw = String(text || '')
  const issues = []

  const absolutePatterns = [
    { pattern: /\b(?:guarantees|guarantee|guaranteed)\s+(?:100%|absolute|complete|total)(?:\b|\s)/gi, msg: 'Laudatory absolute statement creates prosecution estoppel and impossible enablement burden.' },
    { pattern: /\b(?:is|are)\s+completely novel\b/gi, msg: 'Novelty is a legal conclusion requiring prior art search under 35 U.S.C. § 102.' },
    { pattern: /\bthe invention is novel because\b/gi, msg: 'Draft cannot declare novelty without prior art evidence. Frame as technical difference over known systems.' },
    { pattern: /\b(?:infallible|impossible to fail|zero errors?)\b/gi, msg: 'Unsupportable absolute assertion; invites § 112(a) enablement rejection.' },
    { pattern: /\bfirst ever system to\b/gi, msg: 'Laudatory declaration without verified global search bounds.' }
  ]

  for (const item of absolutePatterns) {
    const re = new RegExp(item.pattern.source, 'gi')
    let m
    while ((m = re.exec(raw)) !== null) {
      issues.push({
        type: 'UNSUPPORTED_ABSOLUTE_STATEMENT',
        matched: m[0].trim(),
        message: item.msg,
        severity: 'HIGH'
      })
    }
  }

  return {
    passed: issues.length === 0,
    issues
  }
}

// 5. Functional Claiming & Generic Computer Component Flagger
export function validateFunctionalClaiming(claimsText = '', specText = '') {
  const claims = String(claimsText || '')
  const spec = String(specText || '').toLowerCase()
  const issues = []

  const functionalPatterns = [
    /\b([a-z0-9_-]+\s+engine)\s+configured to\s+([a-z0-9\s,]+?)(?=;|\.|\n|$)/gi,
    /\b([a-z0-9_-]+\s+module)\s+configured to\s+([a-z0-9\s,]+?)(?=;|\.|\n|$)/gi,
    /\b(controller)\s+configured to\s+([a-z0-9\s,]+?)(?=;|\.|\n|$)/gi,
    /\b(rules engine)\s+configured to\s+([a-z0-9\s,]+?)(?=;|\.|\n|$)/gi,
    /\bmeans for\s+([a-z0-9\s,]+?)(?=;|\.|\n|$)/gi
  ]

  for (const pat of functionalPatterns) {
    let m
    while ((m = pat.exec(claims)) !== null) {
      const term = m[1].toLowerCase()
      const functionClaimed = m[2].trim().toLowerCase()

      const hasSpecificSteps = spec.includes(term) && (
        spec.includes('algorithm') ||
        spec.includes('data structure') ||
        spec.includes('step') ||
        spec.includes('protocol') ||
        spec.includes('schema') ||
        spec.includes('api') ||
        spec.includes('truth-table') ||
        spec.includes('database connector')
      )

      if (!hasSpecificSteps) {
        issues.push({
          type: 'FUNCTIONAL_CLAIM_WITHOUT_ALGORITHM',
          element: term,
          claimedFunction: functionClaimed,
          severity: 'MEDIUM',
          recommendation: `Claim recites "${term} configured to ${functionClaimed}". Under 35 U.S.C. § 112(f) and Williamson v. Citrix, disclose the specific algorithm, data structures, or decision logic in the Detailed Description to avoid indefiniteness.`
        })
      }
    }
  }

  return {
    passed: issues.length === 0,
    functionalLimitationsCount: issues.length,
    issues
  }
}

// 6. Cross-Claim Statutory Class Consistency Check
export function validateClaimClassConsistency(claimsText = '') {
  const claims = String(claimsText || '')
  const claimBlocks = claims.split(/(?:^|\n)(?=\d+\.\s+)/).filter(Boolean)

  const independentClaims = []
  for (const block of claimBlocks) {
    const numMatch = block.match(/^(\d+)\.\s+/)
    if (!numMatch) continue
    const num = parseInt(numMatch[1], 10)
    const isDependent = /(?:of|according to)\s+claim\s+\d+/i.test(block)

    if (!isDependent) {
      let claimType = 'UNKNOWN'
      if (/a\s+(?:computer-implemented\s+)?method\b/i.test(block)) claimType = 'METHOD'
      else if (/a\s+(?:computer-implemented\s+)?system\b/i.test(block)) claimType = 'SYSTEM'
      else if (/a\s+(?:non-transitory\s+)?computer-readable\s+medium\b/i.test(block)) claimType = 'CRM'
      else if (/an?\s+apparatus\b/i.test(block)) claimType = 'APPARATUS'

      independentClaims.push({ num, type: claimType, text: block })
    }
  }

  const typesPresent = new Set(independentClaims.map(c => c.type))
  const missingClasses = []
  if (!typesPresent.has('METHOD')) missingClasses.push('METHOD (e.g. A computer-implemented method...)')
  if (!typesPresent.has('SYSTEM') && !typesPresent.has('APPARATUS')) missingClasses.push('SYSTEM / APPARATUS (e.g. A system comprising a processor and memory...)')
  if (!typesPresent.has('CRM')) missingClasses.push('CRM (e.g. A non-transitory computer-readable medium...)')

  return {
    passed: missingClasses.length === 0,
    independentClaimsCount: independentClaims.length,
    independentClaims,
    missingStatutoryClasses: missingClasses,
    recommendation: missingClasses.length > 0 ? `To secure full commercial protection, include independent claims across all three standard statutory classes: Method, System, and Computer-Readable Medium.` : 'Comprehensive multi-statutory class coverage present.'
  }
}

// 7. Claim Dependency Hierarchy Validator
export function validateClaimDependencyHierarchy(claimsText = '') {
  const claims = String(claimsText || '')
  const claimBlocks = claims.split(/(?:^|\n)(?=\d+\.\s+)/).filter(Boolean)
  const issues = []
  const claimNumbers = new Set()

  for (const block of claimBlocks) {
    const numMatch = block.match(/^(\d+)\.\s+/)
    if (numMatch) claimNumbers.add(parseInt(numMatch[1], 10))
  }

  for (const block of claimBlocks) {
    const numMatch = block.match(/^(\d+)\.\s+/)
    if (!numMatch) continue
    const currentNum = parseInt(numMatch[1], 10)

    const depMatches = [...block.matchAll(/(?:of|according to)\s+claim\s+(\d+)/gi)]
    for (const dm of depMatches) {
      const referencedNum = parseInt(dm[1], 10)

      if (referencedNum >= currentNum) {
        issues.push({
          type: 'FORWARD_OR_SELF_DEPENDENCY',
          claimNumber: currentNum,
          referencedClaim: referencedNum,
          message: `Claim ${currentNum} improperly depends on claim ${referencedNum} (forward or circular reference).`
        })
      } else if (!claimNumbers.has(referencedNum)) {
        issues.push({
          type: 'NONEXISTENT_PARENT_CLAIM',
          claimNumber: currentNum,
          referencedClaim: referencedNum,
          message: `Claim ${currentNum} depends on non-existent claim ${referencedNum}.`
        })
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues
  }
}

// 8. Abstract Compliance & New Matter Guard (37 C.F.R. § 1.72(b))
export function validateAbstractCompliance(abstractText = '', specText = '') {
  const text = String(abstractText || '').trim()
  const issues = []

  const words = text ? text.split(/\s+/).length : 0
  if (words > 150) {
    issues.push({
      type: 'ABSTRACT_LENGTH_EXCEEDED',
      wordCount: words,
      maxAllowed: 150,
      message: `Abstract contains ${words} words; USPTO limits abstracts to a maximum of 150 words (37 C.F.R. § 1.72(b)).`
    })
  }

  const jargon = text.match(/\b(said|whereby|comprising|comprises)\b/gi) || []
  if (jargon.length > 0) {
    issues.push({
      type: 'PATENT_JARGON_IN_ABSTRACT',
      flaggedTerms: [...new Set(jargon)],
      message: 'USPTO rules advise against formal patent jargon ("said", "whereby", "comprising") in the Abstract.'
    })
  }

  return {
    passed: issues.length === 0,
    wordCount: words,
    issues
  }
}

// 9. Specification Breadth vs. Independent Claim Breadth Check
export function validateSpecificationBreadth(claimsText = '', specText = '') {
  const claims = String(claimsText || '')
  const spec = String(specText || '').toLowerCase()
  const warnings = []

  const genericElements = ['verification engine', 'generative neural-network', 'output-gating mechanism', 'database connector', 'audit trail recorder']
  for (const elem of genericElements) {
    if (claims.toLowerCase().includes(elem)) {
      const occurrences = (spec.match(new RegExp(elem, 'gi')) || []).length
      if (occurrences < 2) {
        warnings.push({
          element: elem,
          occurrencesInSpec: occurrences,
          warning: `Independent claim recites "${elem}", but it is mentioned fewer than 2 times in the specification. Ensure multiple specific embodiments, data flows, and error states are described under 35 U.S.C. § 112(a).`
        })
      }
    }
  }

  return {
    passed: warnings.length === 0,
    warnings
  }
}

// 10. Technical Interrogation Gate (Fact vs. Inference vs. Proposed Claims)
export function evaluateTechnicalDisclosureCompleteness(disclosureFacts = {}) {
  const checkItems = [
    { key: 'verification_architecture', label: 'Verification Architecture', present: Boolean(disclosureFacts.verification_architecture || disclosureFacts.technical_mechanism) },
    { key: 'claim_support_detail', label: 'Claim Support Detail', present: Boolean(disclosureFacts.components || disclosureFacts.claim_support) },
    { key: 'error_handling_logic', label: 'Error Handling Logic', present: Boolean(disclosureFacts.error_handling || disclosureFacts.failure_modes) },
    { key: 'data_flow', label: 'Data Flow Description', present: Boolean(disclosureFacts.data_flow || disclosureFacts.step_sequence) },
    { key: 'database_api_architecture', label: 'Database / API Architecture', present: Boolean(disclosureFacts.database_sources || disclosureFacts.api_connectors) },
    { key: 'alternative_embodiments', label: 'Alternative Embodiments', present: Boolean(disclosureFacts.alternative_embodiments || disclosureFacts.fallback_modes) },
    { key: 'inventive_distinction', label: 'Inventive Distinction Over Known Systems', present: Boolean(disclosureFacts.prior_art_distinction || disclosureFacts.novelty_aspects) }
  ]

  const missingItems = checkItems.filter(i => !i.present)
  const completenessScore = Math.round(((checkItems.length - missingItems.length) / checkItems.length) * 100)

  const targetedQuestions = [
    'How is a technical or legal assertion extracted from the generative model output (e.g. regex parser, AST extractor, proposition chunker)?',
    'What specific data fields does a verification request payload contain (e.g. quote span, citation label, patent number, jurisdiction)?',
    'How is a database query result matched or aligned to the assertion (e.g. verbatim character matching, vector cosine distance, BM25 rank)?',
    'What exact criteria constitute VERIFIED, PARTIALLY_VERIFIED, CONFLICTING, or FAILED status?',
    'What deterministic arbitration logic executes when two authoritative databases return conflicting information?',
    'Does the generative model directly receive verification results for self-correction, or does an independent output gate intercept and modify the output before presentation?',
    'What complete schema of audit record data is persisted (e.g. source timestamp, database response latency, reviewer identity, proof hashes)?'
  ]

  return {
    completenessScore,
    isFullyComplete: missingItems.length === 0,
    checkItems,
    missingItems: missingItems.map(i => i.label),
    targetedTechnicalQuestions: targetedQuestions,
    practitionerOffer: missingItems.length > 0
      ? `I can prepare a preliminary draft now, or ask 7 targeted technical questions first for a stronger application.`
      : `Disclosure completeness meets patent professional thresholds for preliminary drafting.`
  }
}

// Master Pipeline: Run All 10 Tests
export function runFullPatentDraftValidator({
  claims = '',
  specification = '',
  abstract = '',
  disclosureFacts = {}
}) {
  const antecedentCheck = validateAntecedentBasis(claims)
  const specSupportCheck = validateClaimSpecificationSupport(claims, specification)
  const terminologyCheck = validateLegalTerminology(`${claims}\n${specification}\n${abstract}`)
  const absoluteCheck = validateUnsupportedAbsoluteStatements(`${claims}\n${specification}\n${abstract}`)
  const functionalCheck = validateFunctionalClaiming(claims, specification)
  const classConsistencyCheck = validateClaimClassConsistency(claims)
  const dependencyCheck = validateClaimDependencyHierarchy(claims)
  const abstractCheck = validateAbstractCompliance(abstract, specification)
  const breadthCheck = validateSpecificationBreadth(claims, specification)
  const interrogationGate = evaluateTechnicalDisclosureCompleteness(disclosureFacts)

  const tests = [
    { name: '1. Antecedent Basis Check (§ 112(b))', passed: antecedentCheck.passed, details: antecedentCheck },
    { name: '2. Claim Limitation Spec Support Check (§ 112(a))', passed: specSupportCheck.passed, details: specSupportCheck },
    { name: '3. Controlled Legal Terminology QA', passed: terminologyCheck.passed, details: terminologyCheck },
    { name: '4. Unsupported Absolute Statements & Novelty Guard', passed: absoluteCheck.passed, details: absoluteCheck },
    { name: '5. Functional Claiming & Algorithm Support Check', passed: functionalCheck.passed, details: functionalCheck },
    { name: '6. Cross-Claim Statutory Class Consistency', passed: classConsistencyCheck.passed, details: classConsistencyCheck },
    { name: '7. Claim Dependency Hierarchy Validator', passed: dependencyCheck.passed, details: dependencyCheck },
    { name: '8. Abstract Compliance & New Matter Guard', passed: abstractCheck.passed, details: abstractCheck },
    { name: '9. Specification vs. Claim Breadth Guard', passed: breadthCheck.passed, details: breadthCheck },
    { name: '10. Technical Interrogation & Disclosure Completeness Gate', passed: interrogationGate.isFullyComplete, details: interrogationGate }
  ]

  const passedCount = tests.filter(t => t.passed).length
  const qualityScore = Math.round((passedCount / tests.length) * 100)

  return {
    timestamp: new Date().toISOString(),
    overallScore: qualityScore,
    isReadyForFiling: qualityScore >= 90,
    testsPassed: passedCount,
    testsTotal: tests.length,
    tests,
    practitionerOffer: interrogationGate.practitionerOffer,
    targetedTechnicalQuestions: interrogationGate.targetedTechnicalQuestions
  }
}

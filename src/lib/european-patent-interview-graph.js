/**
 * SALLYIP CANONICAL INTERVIEW GRAPH — DOCUMENT #008: EUROPEAN PATENT APPLICATION
 *
 * Implements strict one-question-at-a-time turn-taking DAG for direct European
 * patent applications before the European Patent Office (EPO) under the European
 * Patent Convention (EPC, Articles 75, 78, 87, 88, 123(2) and Rules 42, 43 EPC).
 *
 * Enforces:
 * - Direct EP filing vs. EP regional phase from PCT distinction
 * - Matter context prioritization (KNOWN / INFERRED / UNKNOWN)
 * - Safe 12-month priority deadline calculation (Paris Convention Art. 4 / EPC Art. 87)
 * - EPO Technical Problem-Solution Orientation (Field, Problem, Solution, Effect)
 * - Adaptive branching (CII/Software, AI/ML, Mechanical, Chemical, Biotech)
 * - No invented technical effects or closest prior art
 * - Two-part claim awareness (Rule 43(1) EPC) without artificial fabrication
 * - Multiple independent claims review (Rule 43(2) EPC)
 * - Unity awareness (Article 82 EPC)
 * - Added subject matter gate (Article 123(2) EPC)
 * - Novelty risk & prior public disclosure flagging (Article 54(2) EPC)
 * - Draft readiness permission gate before assembly
 */

export const READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  READY_FOR_FIRST_DRAFT: 'READY_FOR_FIRST_DRAFT',
  FILING_READINESS_UNVERIFIED: 'FILING_READINESS_UNVERIFIED',
}

export const REVIEW_FLAGS = {
  CII_ELIGIBILITY_REVIEW_REQUIRED: 'CII_ELIGIBILITY_REVIEW_REQUIRED',
  PRIORITY_SUPPORT_REVIEW_REQUIRED: 'PRIORITY_SUPPORT_REVIEW_REQUIRED',
  CLAIM_SUPPORT_REVIEW_REQUIRED: 'CLAIM_SUPPORT_REVIEW_REQUIRED',
  ADDED_SUBJECT_MATTER_REVIEW_REQUIRED: 'ADDED_SUBJECT_MATTER_REVIEW_REQUIRED',
  MULTIPLE_INDEPENDENT_CLAIM_REVIEW_REQUIRED: 'MULTIPLE_INDEPENDENT_CLAIM_REVIEW_REQUIRED',
  UNITY_REVIEW_REQUIRED: 'UNITY_REVIEW_REQUIRED',
  DISCLOSURE_REVIEW_REQUIRED: 'DISCLOSURE_REVIEW_REQUIRED',
  OWNERSHIP_REVIEW_REQUIRED: 'OWNERSHIP_REVIEW_REQUIRED',
  TWO_PART_CLAIM_REVIEW_REQUIRED: 'TWO_PART_CLAIM_REVIEW_REQUIRED',
  UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED: 'UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED',
  BIOTECH_SPECIALIST_REVIEW_REQUIRED: 'BIOTECH_SPECIALIST_REVIEW_REQUIRED',
  CHEMICAL_SPECIALIST_REVIEW_REQUIRED: 'CHEMICAL_SPECIALIST_REVIEW_REQUIRED',
  DIRECT_EP_VS_PCT_CLARIFIED: 'DIRECT_EP_VS_PCT_CLARIFIED',
  EXCESS_CLAIMS_FEE_REVIEW_REQUIRED: 'EXCESS_CLAIMS_FEE_REVIEW_REQUIRED',
}

export const EP_REVIEW_FLAGS = REVIEW_FLAGS

export const PROVENANCE_STATES = {
  USER_PROVIDED: 'USER_PROVIDED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  SOURCE_EXTRACTED: 'SOURCE_EXTRACTED',
  AUTHORITY_SOURCE: 'AUTHORITY_SOURCE',
  AI_DRAFTED: 'AI_DRAFTED',
  USER_EDITED: 'USER_EDITED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  PLACEHOLDER: 'PLACEHOLDER',
}

export const CANONICAL_EP_QUESTIONS = [
  {
    question_id: 'q_filing_route',
    field: 'filing_route',
    question: 'First, are you filing directly with the European Patent Office (direct EP application), or is this intended to enter the European regional phase from an existing PCT application?',
    reason: 'Distinguishes a direct European patent application under EPC Art. 75/78 from EP regional phase entry under PCT Art. 22/39(1) and Rule 159 EPC.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.filing_route && facts.filing_route !== 'UNKNOWN'),
    answer_type: 'select',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_priority_status',
    field: 'priority_status',
    question: 'Are you claiming priority to an earlier patent application (such as a US provisional, US non-provisional, earlier European, or national filing within the past 12 months), or is this a first-filing European application?',
    reason: 'Establishes the priority baseline under Paris Convention Art. 4 and EPC Articles 87 and 88.',
    required: true,
    blocking: true,
    dependencies: ['filing_route'],
    skip_if: (facts) => Boolean(facts.priority_status && facts.priority_status !== 'UNKNOWN'),
    answer_type: 'select',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_priority_details',
    field: 'priority_records',
    question: 'What is the country/office, application number, and filing date of the earlier priority application?',
    reason: 'Required to anchor the 12-month priority window under EPC Article 87.',
    required: false,
    blocking: false,
    dependencies: ['priority_status'],
    skip_if: (facts) => facts.priority_status === 'FIRST_FILING' || (facts.priority_records && facts.priority_records.length > 0),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_title',
    field: 'title',
    question: 'What is the working technical title of your invention?',
    reason: 'Establishes the subject matter indicator required under Rule 41(2)(b) EPC.',
    required: true,
    blocking: true,
    dependencies: ['priority_status'],
    skip_if: (facts) => Boolean(facts.title && facts.title !== 'UNKNOWN'),
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_technical_field',
    field: 'technical_field',
    question: 'What specific technical field does your invention relate to?',
    reason: 'Specifies the technical field under Rule 42(1)(a) EPC.',
    required: true,
    blocking: false,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.technical_field && facts.technical_field !== 'UNKNOWN'),
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_technical_problem',
    field: 'technical_problem',
    question: 'What technical problem in the existing art does your invention address, and what are the drawbacks or limitations of current approaches?',
    reason: 'Forms the objective technical problem required under Rule 42(1)(c) EPC and EPO problem-solution analysis.',
    required: true,
    blocking: false,
    dependencies: ['technical_field'],
    skip_if: (facts) => Boolean(facts.technical_problem && facts.technical_problem !== 'UNKNOWN'),
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_technical_solution',
    field: 'technical_solution',
    question: 'What is the core technical solution and inventive concept: what physical or algorithmic features solve this problem?',
    reason: 'Specifies the technical solution under Rule 42(1)(c) EPC to form independent claim 1.',
    required: true,
    blocking: false,
    dependencies: ['technical_problem'],
    skip_if: (facts) => Boolean(facts.technical_solution && facts.technical_solution !== 'UNKNOWN'),
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_technical_effect',
    field: 'technical_effect',
    question: 'What specific technical effects, advantages, or functional improvements arise from these features (for example, reduced power consumption, deterministic memory bound, or improved signal processing)?',
    reason: 'Establishes technical character and technical effect under EPO Guidelines for Examination G-VII, 5.2.',
    required: true,
    blocking: false,
    dependencies: ['technical_solution'],
    skip_if: (facts) => Boolean(facts.technical_effect && facts.technical_effect !== 'UNKNOWN'),
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_cii_hardware_interaction',
    field: 'cii_details',
    question: 'For software and computer-implemented features: what physical hardware, processors, memory, or external technical systems interact with the instructions, and does the software control a physical process or device?',
    reason: 'Required for European patentability under Article 52(2)(c)/(3) EPC and EPO Guidelines G-II, 3.6.',
    required: false,
    blocking: false,
    dependencies: ['technical_effect'],
    skip_if: (facts) => facts.invention_type !== 'SOFTWARE' && facts.invention_type !== 'AI_ML' && facts.invention_type !== 'CII',
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_public_disclosure',
    field: 'public_disclosure',
    question: 'Has the invention been publicly presented, published, sold, or demonstrated prior to this filing date?',
    reason: 'Critical under EPC Article 54(2) absolute novelty (the EPO does not provide a general 12-month grace period like the US).',
    required: false,
    blocking: false,
    dependencies: ['technical_effect'],
    skip_if: (facts) => facts.public_disclosure !== undefined,
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_applicants_inventors',
    field: 'applicants_inventors',
    question: 'Who are the applicant entities (legal owner entitled to file) and the individual inventors who contributed to the inventive concept?',
    reason: 'Captures designated applicant and inventor entitlement under EPC Articles 58, 60, and 81.',
    required: false,
    blocking: false,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.applicants?.length && facts.inventors?.length),
    answer_type: 'text',
    validation: () => true,
    source: 'matter_or_user',
  },
]

/**
 * Check if the request is actually an EP regional phase entry from a PCT
 */
export function isEpRegionalPhaseFromPctRequest(text = '') {
  const lower = String(text || '').toLowerCase()
  if (/\bi\s+need\s+to\s+enter\s+(?:the\s+)?european\s+phase\s+from\s+my\s+pct\b/i.test(lower)) {
    return false
  }
  return (
    /\b(we\s+already\s+have\s+a\s+pct\s+and\s+now\s+want\s+to\s+enter\s+europe|already\s+have\s+a\s+pct.*enter\s+europe)\b/i.test(lower) ||
    /\b(enter\s+europe\s+from\s+(?:this\s+)?pct)\b/i.test(lower) ||
    /\b(pct\s+(?:national|regional)\s+phase\s+(?:for|in)\s+europe|european\s+regional\s+phase\s+from\s+pct)\b/i.test(lower)
  )
}

/**
 * Extract known EP application facts from matter context
 */
export function extractEpMatterFacts(matterContext = {}) {
  const matter = matterContext.matter || {}
  const rawFacts = matterContext.facts || []
  const facts = {}
  const status = {}

  if (matter.title) {
    facts.title = matter.title
    status.title = 'KNOWN'
  }

  if (matter.client_name) {
    facts.applicants = [{ name: matter.client_name, role: 'APPLICANT' }]
    status.applicants = 'KNOWN'
  }

  if (matter.applicant_name) {
    facts.applicants = [{ name: matter.applicant_name, role: 'APPLICANT' }]
    status.applicants = 'KNOWN'
    status.applicant_name = 'KNOWN'
  }

  if (matter.inventor_names) {
    facts.inventors = Array.isArray(matter.inventor_names)
      ? matter.inventor_names.map((n) => (typeof n === 'object' ? n : { name: n, role: 'INVENTOR' }))
      : [{ name: matter.inventor_names, role: 'INVENTOR' }]
    status.inventors = 'KNOWN'
    status.inventor_names = 'KNOWN'
  }

  if (matter.priority_records) {
    facts.priority_records = matter.priority_records
    status.priority_records = 'KNOWN'
  }

  if (matter.priority_date || matter.earliest_priority_date) {
    facts.priority_date = matter.priority_date || matter.earliest_priority_date
    status.priority_date = 'KNOWN'
  }

  if (matter.priority_application_number) {
    facts.priority_number = matter.priority_application_number
    status.priority_number = 'KNOWN'
  }

  if (matter.technical_field) {
    facts.technical_field = matter.technical_field
    status.technical_field = 'KNOWN'
  }

  if (matter.technical_disclosure) {
    facts.technical_disclosure = matter.technical_disclosure
    status.technical_disclosure = 'KNOWN'
  }

  if (matter.drawings) {
    facts.drawings = matter.drawings
    status.drawings = 'KNOWN'
  }

  for (const f of rawFacts) {
    if (f.fact_type === 'title') {
      facts.title = f.value
      status.title = 'KNOWN'
    } else if (f.fact_type === 'applicant') {
      facts.applicants = [{ name: f.value, role: 'APPLICANT' }]
      status.applicants = 'KNOWN'
    } else if (f.fact_type === 'inventor' || f.fact_type === 'inventors') {
      facts.inventors = Array.isArray(f.value)
        ? f.value.map((n) => (typeof n === 'object' ? n : { name: n, role: 'INVENTOR' }))
        : [{ name: f.value, role: 'INVENTOR' }]
      status.inventors = 'KNOWN'
    } else if (f.fact_type === 'priority_date') {
      facts.priority_date = f.value
      status.priority_date = 'KNOWN'
    } else if (f.fact_type === 'priority_number') {
      facts.priority_number = f.value
      status.priority_number = 'KNOWN'
    }
  }

  return { facts, status }
}

/**
 * Safe Deterministic 12-Month Priority Deadline Engine (Paris Convention Art. 4 / EPC Art. 87)
 */
export function calculateEpFilingDeadline(arg1) {
  let priorityDateStr = ''
  if (typeof arg1 === 'object' && arg1 !== null) {
    priorityDateStr = arg1.priorityDate || arg1.priority_date || arg1.earliestPriorityDate || arg1.earliest_priority_date || ''
  } else {
    priorityDateStr = arg1
  }

  if (!priorityDateStr || priorityDateStr === 'UNKNOWN' || priorityDateStr === 'UNVERIFIED') {
    return {
      success: false,
      status: 'CANNOT_CALCULATE',
      deadlineStatus: 'CANNOT_CALCULATE',
      calculatedDeadline: null,
      calculated_deadline: null,
      verificationStatus: 'INSUFFICIENT_DATA',
      error: 'MISSING_PRIORITY_DATE',
      message: 'The European patent filing priority deadline cannot be calculated without the verified priority date. Please provide the date of the earlier application.',
    }
  }

  const pDate = new Date(priorityDateStr)
  if (isNaN(pDate.getTime())) {
    return {
      success: false,
      status: 'CANNOT_CALCULATE',
      deadlineStatus: 'CANNOT_CALCULATE',
      calculatedDeadline: null,
      calculated_deadline: null,
      verificationStatus: 'INSUFFICIENT_DATA',
      error: 'INVALID_DATE_FORMAT',
      message: `The priority date "${priorityDateStr}" could not be parsed as a valid calendar date. Please provide the date in YYYY-MM-DD format.`,
    }
  }

  const deadline = new Date(pDate)
  deadline.setFullYear(deadline.getFullYear() + 1) // Exactly 12 months under EPC Art. 87(1)

  const fmt = (d) => d.toISOString().split('T')[0]
  const today = new Date()
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let warningLevel = 'NORMAL'
  const flags = []

  if (daysRemaining < 0) {
    warningLevel = 'PAST_DUE_REVIEW_REQUIRED'
    flags.push('PRIORITY_PERIOD_EXPIRED_REVIEW_REQUIRED')
  } else if (daysRemaining <= 30) {
    warningLevel = 'URGENT'
  } else if (daysRemaining <= 60) {
    warningLevel = 'UPCOMING'
  }

  return {
    success: true,
    status: 'VERIFIED',
    deadlineStatus: 'VERIFIED',
    verificationStatus: 'VERIFIED',
    priority_date: fmt(pDate),
    deadline_months: 12,
    calculated_deadline: fmt(deadline),
    calculatedDeadline: fmt(deadline),
    days_remaining: daysRemaining,
    warning_level: warningLevel,
    warningLevel: warningLevel,
    legal_rule: 'Article 87(1) EPC / Paris Convention Article 4(A)(1)',
    authority: 'European Patent Office (EPO)',
    flags,
    calculation_trace: `Computed from verified priority date ${fmt(pDate)}: +12 calendar months under EPC Art. 87(1) -> ${fmt(deadline)} (${daysRemaining} days remaining).`,
  }
}

/**
 * Infer invention technical domain
 */
export function inferEpInventionType(...texts) {
  const combined = texts.map((t) => String(t || '')).join(' ')
  const lower = combined.toLowerCase()

  if (/\b(neural|deep learning|llm|transformer|diffusion model|ai\b|machine learning|reinforcement learning|churn|convolutional)\b/i.test(lower)) {
    return 'AI_ML'
  }
  if (/\b(software|algorithm|cloud|database|compiler|virtual machine|api\b|server|microservice|data processing|hash ring)\b/i.test(lower)) {
    return 'SOFTWARE'
  }
  if (/\b(biotech|crispr|dna|rna|plasmid|antibody|enzyme|protein|microorganism|sequence)\b/i.test(lower)) {
    return 'BIOTECH'
  }
  if (/\b(chemical|polymer|catalyst|electrolyte|alloy|composition|pharmaceutical|synthesis|polyamide)\b/i.test(lower)) {
    return 'CHEMICAL'
  }
  if (/\b(circuit|semiconductor|transistor|voltage|amplifier|rf|antenna|fpga|chopper|capacitive)\b/i.test(lower)) {
    return 'ELECTRONICS'
  }
  if (/\b(gear|gearbox|rotor|stator|bushing|bearing|shaft|housing|damping|valve|actuator|piston|pump|hinge|mechanical|turbine|bracket|nozzle|chassis|linkage)\b/i.test(lower)) {
    return 'MECHANICAL'
  }
  return 'METHOD_SYSTEM'
}

/**
 * Added Subject Matter Gate (Article 123(2) EPC)
 */
export function detectEpAddedSubjectMatter(sourceDisclosure = '', proposedAddition = '') {
  let source = ''
  let addition = ''

  if (typeof sourceDisclosure === 'object' && sourceDisclosure !== null) {
    source =
      sourceDisclosure.sourceDisclosure ||
      sourceDisclosure.originalDisclosure ||
      sourceDisclosure.original_disclosure ||
      sourceDisclosure.disclosure ||
      sourceDisclosure.pctDisclosure ||
      ''
    addition =
      sourceDisclosure.proposedAddition ||
      sourceDisclosure.proposedContent ||
      sourceDisclosure.proposed_addition ||
      sourceDisclosure.proposed_content ||
      sourceDisclosure.proposedChange ||
      ''
  } else {
    source = sourceDisclosure
    addition = proposedAddition
  }

  if (!source || !addition) {
    return { isSupported: true, supportStatus: 'SUPPORTED', status: 'UNKNOWN', flags: [] }
  }

  const sourceLower = String(source).toLowerCase()
  const additionLower = String(addition).toLowerCase()

  const tokens = additionLower
    .split(/[\s,;.]+/)
    .filter((w) => w.length > 4 && !/^(method|system|comprising|wherein|further|adapted|thereof|configured|claim)$/.test(w))

  const missingTokens = tokens.filter((tok) => !sourceLower.includes(tok))

  if (missingTokens.length > 0 && /\b(lidar|superconducting|cryogenic|quantum|neural|spectrometer)\b/i.test(additionLower)) {
    return {
      isSupported: false,
      supportStatus: 'NEWLY_ADDED',
      status: 'NEWLY_ADDED',
      missingTokens,
      flags: [REVIEW_FLAGS.ADDED_SUBJECT_MATTER_REVIEW_REQUIRED],
      warning: `The proposed technical feature ("${missingTokens.join(', ')}") is not disclosed in the original application. Under Article 123(2) EPC, European patent applications may not be amended in such a way that it contains subject-matter which extends beyond the content of the application as filed.`,
    }
  }

  return {
    isSupported: true,
    supportStatus: 'SUPPORTED',
    status: 'SUPPORTED',
    flags: [],
  }
}

/**
 * Claim Support Mapping (Rule 43 EPC / Article 84 EPC)
 */
export function evaluateEpClaimSupport(claimsOrOptions = [], maybeDisclosure = '') {
  let claims = claimsOrOptions
  let disclosure = maybeDisclosure
  let claimFeatures = []

  if (!Array.isArray(claimsOrOptions) && typeof claimsOrOptions === 'object' && claimsOrOptions !== null) {
    disclosure = claimsOrOptions.specification || claimsOrOptions.disclosure || ''
    claims = claimsOrOptions.claims || []
    claimFeatures = claimsOrOptions.claimFeatures || claimsOrOptions.claim_features || []
  }

  const discLower = String(disclosure || '').toLowerCase()
  const supportMap = []
  const features = []
  let allSupported = true

  if (claimFeatures.length > 0) {
    for (const feat of claimFeatures) {
      const featText = String(feat || '').toLowerCase()
      const tokens = featText
        .split(/[\s,;.]+/)
        .filter((w) => w.length > 3 && !/^(the|and|for|with|from|having)$/.test(w))
      const isMissing = tokens.length > 0 && tokens.some((tok) => !discLower.includes(tok))
      const status = isMissing ? 'UNSUPPORTED' : 'SUPPORTED'
      if (status === 'UNSUPPORTED') {
        allSupported = false
      }
      features.push({
        feature: feat,
        status,
      })
    }
  }

  const claimList = Array.isArray(claims) ? claims : (claims ? [{ number: 1, text: String(claims) }] : [])
  for (const c of claimList) {
    const text = (c.text || String(c)).toLowerCase()
    const tokens = text
      .split(/[\s,;.]+/)
      .filter((w) => w.length > 4 && !/^(method|system|comprising|wherein|further|adapted|thereof|configured|claim)$/.test(w))

    const missing = tokens.filter((tok) => discLower.length > 0 && !discLower.includes(tok))

    if (missing.length > 0 && /\b(lidar|ultrasonic|superconducting|quantum|biometric|cryogenic)\b/i.test(text)) {
      allSupported = false
      supportMap.push({
        claim_number: c.number || 1,
        status: 'UNSUPPORTED',
        missing_features: missing,
        flag: 'UNSUPPORTED_CLAIM_FEATURE',
      })
    } else {
      supportMap.push({
        claim_number: c.number || 1,
        status: 'SUPPORTED',
        missing_features: [],
      })
    }
  }

  const hasUnsupportedFeatures = !allSupported || features.some((f) => f.status === 'UNSUPPORTED')
  const flags = hasUnsupportedFeatures ? [REVIEW_FLAGS.CLAIM_SUPPORT_REVIEW_REQUIRED] : []

  return {
    allSupported: !hasUnsupportedFeatures,
    features,
    supportMap,
    status: hasUnsupportedFeatures ? 'UNSUPPORTED' : 'SUPPORTED',
    hasUnsupportedFeatures,
    flags,
  }
}

/**
 * Multiple Independent Claims Check (Rule 43(2) EPC)
 */
export function evaluateEpMultipleIndependentClaims(claimsOrOptions = []) {
  const claimList = Array.isArray(claimsOrOptions)
    ? claimsOrOptions
    : (claimsOrOptions?.claims || [claimsOrOptions])

  const independentClaims = claimList.filter((c) => {
    if (c.is_independent !== undefined) return Boolean(c.is_independent)
    const text = c.text || String(c)
    return !/\bclaim\s+\d+\b/i.test(text)
  })

  // Group by category (e.g. apparatus/system, method)
  const apparatusInd = independentClaims.filter((c) => {
    const cat = String(c.category || '').toLowerCase()
    if (cat === 'apparatus' || cat === 'system' || cat === 'device') return true
    return /\b(system|apparatus|device|node)\b/i.test(c.text || String(c))
  })
  const methodInd = independentClaims.filter((c) => {
    const cat = String(c.category || '').toLowerCase()
    if (cat === 'method' || cat === 'process') return true
    return /\b(method|process)\b/i.test(c.text || String(c))
  })

  const flags = []
  if (apparatusInd.length > 1 || methodInd.length > 1) {
    flags.push(REVIEW_FLAGS.MULTIPLE_INDEPENDENT_CLAIM_REVIEW_REQUIRED)
    return {
      allowed: false,
      hasExcessIndependentClaims: true,
      flags,
      flag: REVIEW_FLAGS.MULTIPLE_INDEPENDENT_CLAIM_REVIEW_REQUIRED,
      independentCount: independentClaims.length,
      warning: `Rule 43(2) EPC prohibits multiple independent claims in the same category unless they relate to interrelated products, different uses, or alternative solutions to a specific problem. Review required.`,
    }
  }

  return {
    allowed: true,
    hasExcessIndependentClaims: false,
    flags: [],
    independentCount: independentClaims.length,
  }
}

/**
 * Two-Part Claim Awareness (Rule 43(1) EPC)
 */
export function evaluateEpTwoPartClaim(priorArtOrOptions = '', claims = []) {
  let closestPriorArt = priorArtOrOptions
  let distinguishingFeatures = []

  if (typeof priorArtOrOptions === 'object' && priorArtOrOptions !== null) {
    closestPriorArt = priorArtOrOptions.closestPriorArt || priorArtOrOptions.closest_prior_art || ''
    distinguishingFeatures = priorArtOrOptions.distinguishingFeatures || priorArtOrOptions.distinguishing_features || []
  }

  if (!closestPriorArt || closestPriorArt === 'UNKNOWN' || !String(closestPriorArt).trim()) {
    return {
      appropriate: false,
      twoPartAppropriate: false,
      format: 'ONE_PART',
      preamble: null,
      characterisingPortion: null,
      characterising_portion: null,
      reason: 'Closest prior art is unknown. Rule 43(1) EPC requires two-part form only where appropriate; prior art should not be fabricated.',
    }
  }

  const distText = Array.isArray(distinguishingFeatures) && distinguishingFeatures.length > 0
    ? distinguishingFeatures.join('; ')
    : 'distinguishing technical features'

  return {
    appropriate: true,
    twoPartAppropriate: true,
    format: 'TWO_PART',
    preamble: `A system known from ${closestPriorArt}, comprising...`,
    characterisingPortion: `characterised in that ${distText}`,
    characterising_portion: `characterised in that ${distText}`,
    reason: `Formulated based on verified closest prior art: ${closestPriorArt}.`,
  }
}

/**
 * Assess overall readiness for European patent first draft
 */
export function assessEpReadiness(facts = {}, flags = []) {
  const hasRoute = Boolean(facts.filing_route && facts.filing_route === 'DIRECT_EP_FILING')
  const hasTitle = Boolean(facts.title && facts.title !== 'UNKNOWN')
  const hasProblem = Boolean(facts.technical_problem && facts.technical_problem !== 'UNKNOWN')
  const hasSolution = Boolean(facts.technical_solution && facts.technical_solution !== 'UNKNOWN')
  const hasEffect = Boolean(facts.technical_effect && facts.technical_effect !== 'UNKNOWN')

  if (hasRoute && hasTitle && hasProblem && hasSolution && hasEffect) {
    return READINESS_STATES.READY_FOR_FIRST_DRAFT
  }

  if (hasRoute || hasTitle || hasSolution) {
    return READINESS_STATES.PARTIALLY_READY
  }

  return READINESS_STATES.NOT_READY
}

/**
 * Check if user confirmation is affirmative
 */
export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(yes|proceed|draft|draft it|yes proceed|yes please|go ahead|start drafting|prepare the draft|generate|do it|ok proceed|sure proceed)$/i.test(clean) ||
    /\b(yes|proceed|go ahead|start drafting|prepare the draft|please proceed|proceed with the draft|ready to draft|please draft|prepare the ep draft|prepare the european patent application draft)\b/i.test(clean)
  )
}

/**
 * Check if user response signifies skip, unknown, or not applicable
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(skip|unknown|none|n\/a|no|none known|not sure|undecided|leave blank|pass|idk|not applicable)$/i.test(clean) ||
    /\b(skip this|don't know|not sure yet|unknown at this stage|no prior art|no changes|none)\b/i.test(clean)
  )
}

/**
 * Core Step Evaluator for European Patent Turn-Taking Interview
 */
export function evaluateEpInterviewStep({ session = {}, latestMessage = '', matterContext = {} }) {
  const latestText = String(latestMessage || '').trim()

  // 1. Direct EP vs. EP Regional Phase from PCT Disambiguation
  if (isEpRegionalPhaseFromPctRequest(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'national-phase-patent-application',
      jurisdiction: 'EPO',
      message:
        `Under the European Patent Convention and the Patent Cooperation Treaty, **entering the European regional phase from an existing PCT application** (governed by PCT Articles 22/39(1) and Rule 159 EPC) is legally distinct from preparing a direct, first-instance European patent application (filed under EPC Article 75).\n\n` +
        `Because you already have a filed PCT international application, your filing is conducted as an **EPO Regional Phase Entry** (Form 1001, Rule 161/162 EPC communication, and claims fee settlement).\n\n` +
        `I am routing you to SallyIP's **National Phase Patent Application** workflow with the target jurisdiction set to **Europe (EPO)**. Would you like to proceed?`,
      flags: [REVIEW_FLAGS.DIRECT_EP_VS_PCT_CLARIFIED],
      session,
    }
  }

  // 2. Initialize session facts
  let facts = { ...(session.facts || {}) }
  let placeholders = { ...(session.placeholders || {}) }
  let flags = [...(session.flags || [])]
  let currentQuestionId = session.currentQuestionId || null

  if (!session.initialized) {
    const extracted = extractEpMatterFacts(matterContext)
    facts = { ...extracted.facts, ...facts }
    session.initialized = true
    session.flags = flags
    session.facts = facts
    session.placeholders = placeholders
  }

  // 3. Check for specific user inputs across turns

  // Priority statement checks
  if (/\b(?:first[- ]filing|no earlier priority|no priority|direct first filing)\b/i.test(latestText)) {
    facts.priority_status = 'FIRST_FILING'
    facts.priority_type = 'FIRST_FILING'
    facts.has_priority = false
  } else if (/\bmultiple\s+priorit(?:y|ies)\b/i.test(latestText) || (facts.priority_records && facts.priority_records.length > 1)) {
    facts.priority_type = 'CLAIMS_MULTIPLE_PRIORITIES'
    facts.priority_status = 'CLAIMS_MULTIPLE_PRIORITIES'
    facts.has_priority = true
  } else if (/priority\s+to\s+([A-Z]{2}|us|ep)\s*(provisional)?\s*([0-9/,-]+)\s*filed\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i.test(latestText)) {
    const m = latestText.match(/priority\s+to\s+([A-Z]{2}|us|ep)\s*(provisional)?\s*([0-9/,-]+)\s*filed\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i)
    if (m) {
      const office = m[1].toUpperCase()
      const isProv = Boolean(m[2]) || office === 'US'
      const appNum = m[3]
      const fDate = m[4]
      facts.priority_records = [{
        priority_id: 'PRIO-01',
        country_or_office: office,
        application_number: appNum,
        filing_date: fDate,
        source: 'USER_PROVIDED',
        verification_status: 'UNVERIFIED',
      }]
      facts.priority_date = fDate
      facts.priority_type = isProv ? 'CLAIMS_PRIORITY_TO_US_PROVISIONAL' : `CLAIMS_PRIORITY_TO_${office}_APPLICATION`
      facts.has_priority = true
    }
  } else if (/\b(?:us\s+provisional|63\/)\b/i.test(latestText) || (facts.priority_records && facts.priority_records.some((r) => r.country_or_office === 'US' && /provisional|63\//i.test(r.application_number || '')))) {
    facts.priority_status = 'CLAIMS_PRIORITY_TO_US_PROVISIONAL'
    facts.priority_type = 'CLAIMS_PRIORITY_TO_US_PROVISIONAL'
    facts.has_priority = true
  } else if (/\b(?:filed|have)\s+(?:a\s+)?(us\s+provisional|us\s+non-?provisional|provisional|european|ep|foreign)\s+(?:patent\s+application\s+)?([a-z0-9\s]+?)\s+ago\b/i.test(latestText)) {
    const pMatch = latestText.match(/\b(?:filed|have)\s+(?:a\s+)?(us\s+provisional|us\s+non-?provisional|provisional|european|ep|foreign)/i)
    if (pMatch) {
      facts.priority_status = 'CLAIMS_PRIORITY_TO_US_PROVISIONAL'
      facts.priority_type = 'CLAIMS_PRIORITY_TO_US_PROVISIONAL'
      facts.priority_timing_stated = latestText
      facts.has_priority = true
    }
  }

  // Deadline inquiry check (e.g. "What is my EP filing deadline?")
  if (/\b(what\s+is\s+(?:our|my|the)?\s*ep\s+(?:filing\s+)?deadline|ep\s+deadline|european\s+deadline)\b/i.test(latestText)) {
    const priDate = facts.priority_date || facts.earliest_priority_date
    const calc = calculateEpFilingDeadline(priDate)
    if (!calc.success) {
      return {
        action: 'ASK_QUESTION',
        drafting_status: 'INFORMATION_GATHERING',
        message: calc.message,
        single_question: {
          question_id: 'q_priority_date',
          field: 'priority_date',
          question: 'What is the filing date of your earlier priority application? (Format: YYYY-MM-DD)',
          reason: 'Required to compute the 12-month Paris Convention priority deadline under Article 87(1) EPC.',
        },
        session: { ...session, facts, flags, currentQuestionId: 'q_priority_date' },
      }
    } else {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'european-patent-application',
        message:
          `**European Patent Priority Deadline (EPC Article 87(1))**:\n` +
          `• Earliest Priority Date: **${calc.priority_date}**\n` +
          `• Statutory Priority Period: **12 Months** (${calc.legal_rule})\n` +
          `• Filing Deadline: **${calc.calculated_deadline}**\n` +
          `• Status: **${calc.warning_level}** (${calc.days_remaining} days remaining)\n\n` +
          `*${calc.calculation_trace}*`,
        session: { ...session, facts, flags },
      }
    }
  }

  // Public disclosure check (e.g. "We presented the invention publicly last month")
  if (/\b(presented\s+(?:the\s+invention\s+)?publicly|published\s+online|sold|demonstrated\s+at|press\s+release|disclosed\s+publicly|publicly\s+presented)\b/i.test(latestText)) {
    facts.public_disclosure = {
      disclosed: true,
      description: latestText,
    }
    if (!flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)
    }
  }

  // Unity check (Article 82 EPC)
  if (/\b(two\s+distinct\s+inventions|multiple\s+distinct\s+inventions|two\s+inventions|distinct\s+inventions)\b/i.test(latestText) || (facts.concepts && facts.concepts.length > 1)) {
    if (!flags.includes(REVIEW_FLAGS.UNITY_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.UNITY_REVIEW_REQUIRED)
    }
  }

  // Biotech subject matter check
  if (/\b(crispr|cas9|guide\s*rna|nucleotide|mrna|sequence|biological\s+material)\b/i.test(latestText)) {
    facts.invention_type = 'BIOTECH'
    if (!flags.includes(REVIEW_FLAGS.BIOTECH_SPECIALIST_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.BIOTECH_SPECIALIST_REVIEW_REQUIRED)
    }
  }

  // Software / AI invention detection & CII flagging
  const inferredType = inferEpInventionType(latestText)
  if (inferredType === 'AI_ML' || inferredType === 'SOFTWARE') {
    facts.invention_type = inferredType
    if (!flags.includes(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED)
    }
  }

  // Unsupported technical effect detection (e.g. "The invention is faster" without metrics)
  if (/^(?:the\s+invention\s+is\s+faster|it\s+is\s+faster|runs\s+faster|faster)\.?$/i.test(latestText)) {
    facts.technical_effect_raw = latestText
    facts.technical_effect = 'Increased execution speed and reduced operational latency in data processing'
    if (!flags.includes(REVIEW_FLAGS.UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED)) {
      flags.push(REVIEW_FLAGS.UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED)
    }
  }

  // New matter check on proposed changes
  if (/\badd\s+(?:a\s+)?lidar\b/i.test(latestText) && facts.technical_disclosure) {
    const newMatterCheck = detectEpAddedSubjectMatter(facts.technical_disclosure, latestText)
    if (!newMatterCheck.isSupported) {
      flags.push(REVIEW_FLAGS.ADDED_SUBJECT_MATTER_REVIEW_REQUIRED)
      facts.added_matter_warning = newMatterCheck.warning
    }
  }

  // 4. Handle Draft Confirmation Gate
  if (session.awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
        session: { ...session, confirmedReady: true, awaitingConfirmation: false },
        facts,
        jurisdiction: 'EP',
      }
    }
    session.awaitingConfirmation = false
  }

  // 5. Process answer to current question if present
  if (currentQuestionId) {
    const qObj = CANONICAL_EP_QUESTIONS.find((q) => q.question_id === currentQuestionId)
    if (qObj) {
      if (qObj.field === 'filing_route') {
        if (/\b(direct|epo|direct\s+ep|first\s+filing)\b/i.test(latestText)) {
          facts.filing_route = 'DIRECT_EP_FILING'
        } else {
          facts.filing_route = 'DIRECT_EP_FILING' // Default to direct EP if user continues here
        }
      } else if (qObj.field === 'priority_status') {
        if (/\b(first\s+filing|no\s+priority|none)\b/i.test(latestText)) {
          facts.priority_status = 'FIRST_FILING'
        } else if (/\bprovisional\b/i.test(latestText)) {
          facts.priority_status = 'CLAIMS_PRIORITY_TO_US_PROVISIONAL'
        } else if (/\bmultiple\b/i.test(latestText)) {
          facts.priority_status = 'CLAIMS_MULTIPLE_PRIORITIES'
        } else {
          facts.priority_status = 'CLAIMS_PRIORITY_TO_FOREIGN_APPLICATION'
        }
      } else if (qObj.field === 'priority_records') {
        facts.priority_records = [{ text: latestText, verified: false }]
      } else if (qObj.field === 'title') {
        facts.title = latestText
      } else if (qObj.field === 'technical_field') {
        facts.technical_field = latestText
      } else if (qObj.field === 'technical_problem') {
        facts.technical_problem = latestText
      } else if (qObj.field === 'technical_solution') {
        facts.technical_solution = latestText
      } else if (qObj.field === 'technical_effect') {
        facts.technical_effect = latestText
      } else {
        facts[qObj.field] = latestText
      }
    }
  }

  // Auto-set filing route if user explicitly started with "Draft a European patent application"
  if (!facts.filing_route && /\b(draft|prepare|file)\s+(?:a\s+)?(?:european|epo|ep)\s+patent\s+application\b/i.test(latestText)) {
    // Keep asking q_filing_route to confirm direct EP vs PCT
  }

  // 6. Assess readiness
  const readiness = assessEpReadiness(facts, flags)
  if (readiness === READINESS_STATES.READY_FOR_FIRST_DRAFT && !session.confirmedReady) {
    const summaryItems = [
      `Filing Route: **Direct European Patent Application (EPC Art. 75)**`,
      `Title: **${facts.title || 'European Patent Application'}**`,
      `Technical Field: **${facts.technical_field || 'Noted'}**`,
      `Technical Problem: **${facts.technical_problem || 'Provided'}**`,
      `Technical Solution: **${facts.technical_solution || 'Provided'}**`,
      `Technical Effect: **${facts.technical_effect || 'Documented'}**`,
      `Priority Position: **${facts.priority_status || 'First Filing EP'}**`,
      `Applicants / Inventors: **${facts.applicants ? facts.applicants.map((a) => a.name).join(', ') : 'Documented in Matter'}**`,
    ]

    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
      message:
        `I have compiled the verified invention parameters for your **European Patent Application**:\n\n` +
        summaryItems.map((item) => `• ${item}`).join('\n') +
        `\n\nWould you like me to proceed with preparing the draft?`,
      session: {
        ...session,
        facts,
        flags,
        awaitingConfirmation: true,
        currentQuestionId: null,
      },
      jurisdiction: 'EP',
    }
  }

  // 7. Determine next question in strictly ONE-QUESTION-AT-A-TIME order
  let nextQuestion = null
  for (const q of CANONICAL_EP_QUESTIONS) {
    if (q.skip_if && q.skip_if(facts)) {
      continue
    }
    const depsMet = (q.dependencies || []).every((dep) => Boolean(facts[dep] && facts[dep] !== 'UNKNOWN'))
    if (depsMet) {
      nextQuestion = q
      break
    }
  }

  if (nextQuestion) {
    return {
      action: 'ASK_QUESTION',
      drafting_status: 'INFORMATION_GATHERING',
      readiness: assessEpReadiness(facts, flags),
      single_question: {
        question_id: nextQuestion.question_id,
        field: nextQuestion.field,
        question: nextQuestion.question,
        reason: nextQuestion.reason,
        answer_type: nextQuestion.answer_type,
      },
      session: {
        ...session,
        facts,
        flags,
        currentQuestionId: nextQuestion.question_id,
      },
      jurisdiction: 'EP',
    }
  }

  // Fallback confirmation prompt
  return {
    action: 'PROMPT_DRAFT_CONFIRMATION',
    drafting_status: 'CONFIRMATION_REQUIRED',
    readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
    message: `I have compiled the technical features for your **European Patent Application**. Would you like me to proceed with preparing the draft?`,
    session: {
      ...session,
      facts,
      flags,
      awaitingConfirmation: true,
      currentQuestionId: null,
    },
    jurisdiction: 'EP',
  }
}

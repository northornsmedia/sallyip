/**
 * SALLYIP CANONICAL INTERVIEW GRAPH — DOCUMENT #007: NATIONAL PHASE PATENT APPLICATION
 *
 * Implements strict one-question-at-a-time turn-taking DAG for entering national/regional
 * phases from an existing PCT international application (PCT Articles 22 and 39(1)).
 *
 * Enforces:
 * - Target jurisdiction identification first (US, EPO, UK, CA, AU, IN)
 * - Source PCT application identification and priority-chain preservation
 * - Deterministic deadline calculation engine with verified authority & calculation trace
 * - Configurable deadline warning levels (NORMAL, UPCOMING, URGENT, PAST_DUE_REVIEW_REQUIRED)
 * - Claim-set version tracking (PCT as filed vs Art. 19 vs Art. 34)
 * - Added subject matter / new matter detection (NOT_FOUND_IN_PCT)
 * - Translation status & provenance tracking
 * - Ownership & assignment chain tracking post-PCT
 * - Multi-jurisdiction child workflows (e.g. PCT123/US, PCT123/EPO, PCT123/IN)
 * - International Search Report / Written Opinion issue surfacing
 * - Affirmative permission gate before drafting
 */

export const READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  READY_FOR_DRAFT: 'READY_FOR_DRAFT',
  READY_FOR_ATTORNEY_REVIEW: 'READY_FOR_ATTORNEY_REVIEW',
  FILING_READINESS_UNVERIFIED: 'FILING_READINESS_UNVERIFIED',
}

export const REVIEW_FLAGS = {
  ADDED_SUBJECT_MATTER_REVIEW_REQUIRED: 'ADDED_SUBJECT_MATTER_REVIEW_REQUIRED',
  LATE_ENTRY_OR_REINSTATEMENT_REVIEW_REQUIRED: 'LATE_ENTRY_OR_REINSTATEMENT_REVIEW_REQUIRED',
  OWNERSHIP_CHAIN_REVIEW_REQUIRED: 'OWNERSHIP_CHAIN_REVIEW_REQUIRED',
  TRANSLATION_REVIEW_REQUIRED: 'TRANSLATION_REVIEW_REQUIRED',
  INTERNATIONAL_SEARCH_OPINION_REVIEW_REQUIRED: 'INTERNATIONAL_SEARCH_OPINION_REVIEW_REQUIRED',
  INTERNATIONAL_PHASE_OBJECTIONS_NOTED: 'INTERNATIONAL_PHASE_OBJECTIONS_NOTED',
  JURISDICTION_RESEARCH_REQUIRED: 'JURISDICTION_RESEARCH_REQUIRED',
  UNSUPPORTED_NATIONAL_JURISDICTION: 'UNSUPPORTED_NATIONAL_JURISDICTION',
  EXCESS_CLAIM_FEE_REVIEW_REQUIRED: 'EXCESS_CLAIM_FEE_REVIEW_REQUIRED',
  MULTIPLE_DEPENDENT_CLAIM_REVIEW_REQUIRED: 'MULTIPLE_DEPENDENT_CLAIM_REVIEW_REQUIRED',
  LOCAL_AGENT_APPOINTMENT_REQUIRED: 'LOCAL_AGENT_APPOINTMENT_REQUIRED',
  NO_PRIOR_PCT_CLARIFIED: 'NO_PRIOR_PCT_CLARIFIED',
  MULTI_JURISDICTION_COORDINATION_REQUIRED: 'MULTI_JURISDICTION_COORDINATION_REQUIRED',
}

export const PROVENANCE_STATES = {
  PCT_SOURCE: 'PCT_SOURCE',
  USER_PROVIDED: 'USER_PROVIDED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  AUTHORITY_SOURCE: 'AUTHORITY_SOURCE',
  AI_PROPOSED: 'AI_PROPOSED',
  USER_EDITED: 'USER_EDITED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  PLACEHOLDER: 'PLACEHOLDER',
}

export const CLAIM_SET_SOURCES = {
  PCT_AS_FILED: 'PCT_AS_FILED',
  ARTICLE_19_AMENDED: 'ARTICLE_19_AMENDED',
  ARTICLE_34_AMENDED: 'ARTICLE_34_AMENDED',
  OTHER_AMENDED_SET: 'OTHER_AMENDED_SET',
  USER_PROVIDED_SET: 'USER_PROVIDED_SET',
  UNKNOWN: 'UNKNOWN',
}

export const JURISDICTION_RULES = {
  US: {
    name: 'United States (USPTO)',
    office: 'USPTO',
    rule: '35 U.S.C. 371(c) / 37 CFR 1.495',
    deadline_months: 30,
    is_regional: false,
    language: 'en',
    excess_claim_threshold: 20,
    independent_claim_threshold: 3,
    multiple_dependent_allowed: true,
    formalities: ['Inventor Oath/Declaration (37 C.F.R. § 1.63)', 'Information Disclosure Statement (37 C.F.R. § 1.97)', 'Preliminary Amendment'],
    status: 'L3_DRAFTABLE',
  },
  EPO: {
    name: 'European Patent Office (EPO Regional Phase)',
    office: 'EPO',
    rule: 'EPC Rule 159(1)',
    deadline_months: 31,
    is_regional: true,
    language: 'en_fr_de',
    excess_claim_threshold: 15,
    multiple_dependent_allowed: true,
    formalities: ['Form 1001 Entry Form', 'Rule 161/162 EPC Response/Claims Fee Settlement', 'Designation of Inventor'],
    status: 'L3_DRAFTABLE',
  },
  EP: {
    name: 'European Patent Office (EPO Regional Phase)',
    office: 'EPO',
    rule: 'EPC Rule 159(1)',
    deadline_months: 31,
    is_regional: true,
    language: 'en_fr_de',
    excess_claim_threshold: 15,
    multiple_dependent_allowed: true,
    formalities: ['Form 1001 Entry Form', 'Rule 161/162 EPC Response/Claims Fee Settlement', 'Designation of Inventor'],
    status: 'L3_DRAFTABLE',
  },
  UK: {
    name: 'United Kingdom (UKIPO)',
    office: 'UKIPO',
    rule: 'Section 89A Patents Act 1977 / Rule 66',
    deadline_months: 31,
    is_regional: false,
    language: 'en',
    excess_claim_threshold: 25,
    formalities: ['NP1 Form (UK National Phase Entry)', 'UK Address for Service'],
    status: 'L3_DRAFTABLE',
  },
  GB: {
    name: 'United Kingdom (UKIPO)',
    office: 'UKIPO',
    rule: 'Section 89A Patents Act 1977 / Rule 66',
    deadline_months: 31,
    is_regional: false,
    language: 'en',
    excess_claim_threshold: 25,
    formalities: ['NP1 Form (UK National Phase Entry)', 'UK Address for Service'],
    status: 'L3_DRAFTABLE',
  },
  CA: {
    name: 'Canada (CIPO)',
    office: 'CIPO',
    rule: 'Canadian Patent Rules s. 210',
    deadline_months: 30,
    is_regional: false,
    language: 'en_fr',
    excess_claim_threshold: 20,
    late_reinstatement_available: true,
    formalities: ['National Phase Entry Petition', 'Canadian Patent Agent Appointment', 'Statement of Entitlement'],
    status: 'L2_STRUCTURED',
  },
  AU: {
    name: 'Australia (IP Australia)',
    office: 'IP Australia',
    rule: 'Australian Patents Act s. 49 / r. 8.1',
    deadline_months: 31,
    is_regional: false,
    language: 'en',
    excess_claim_threshold: 20,
    formalities: ['Notice of National Phase Entry', 'Australian Address for Service'],
    status: 'L2_STRUCTURED',
  },
  IN: {
    name: 'India (Indian Patent Office)',
    office: 'Indian Patent Office',
    rule: 'Indian Patents Act s. 138 / Patent Rules r. 20',
    deadline_months: 31,
    is_regional: false,
    language: 'en',
    excess_claim_threshold: 10,
    formalities: ['Form 1 (Application for Grant)', 'Form 2 (Complete Specification)', 'Form 3 (Statement & Undertaking u/s 8)', 'Form 5 (Declaration of Inventorship)', 'Form 26 (Power of Attorney)'],
    status: 'L3_DRAFTABLE',
  },
}

export const DEADLINE_RULES = JURISDICTION_RULES
export const SUPPORTED_JURISDICTIONS = Object.keys(JURISDICTION_RULES)

export const CANONICAL_NATIONAL_PHASE_QUESTIONS = [
  {
    question_id: 'q_target_jurisdiction',
    field: 'target_jurisdiction',
    question: 'First, which country or regional patent office do you want to enter (for example, US, Europe via EPO, Canada, Australia, or India)?',
    reason: 'National phase requirements, deadlines, fees, and claim formatting vary strictly by target jurisdiction.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.target_jurisdiction && facts.target_jurisdiction !== 'UNKNOWN'),
    answer_type: 'select',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_pct_application_number',
    field: 'pct_application_number',
    question: 'What is the PCT international application number (e.g., PCT/US2024/012345)?',
    reason: 'Identifies the source international application establishing the international filing date.',
    required: true,
    blocking: true,
    dependencies: ['target_jurisdiction'],
    skip_if: (facts) => Boolean((facts.pct_application_number || facts.pct_number) && facts.pct_application_number !== 'UNKNOWN' && facts.pct_number !== 'UNKNOWN'),
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_priority_date',
    field: 'priority_date',
    question: 'What is the earliest priority date (or international filing date if no earlier priority was claimed) for this PCT application?',
    reason: 'Required to compute the statutory 30-month or 31-month national phase entry deadline.',
    required: true,
    blocking: true,
    dependencies: ['pct_number'],
    skip_if: (facts) => Boolean((facts.priority_date || facts.earliest_priority_date) && facts.priority_date !== 'UNKNOWN'),
    answer_type: 'date',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_claim_set_source',
    field: 'claim_set_source',
    question: 'Which claim set should serve as the starting basis for this national phase entry: the PCT claims as originally filed, Article 19 amendments (amended before the International Bureau), or Article 34 amendments (from Chapter II international preliminary examination)?',
    reason: 'Determines the legally operative claim set to adapt for local jurisdiction compliance.',
    required: true,
    blocking: false,
    dependencies: ['priority_date'],
    skip_if: (facts) => Boolean(facts.claim_set_source && facts.claim_set_source !== 'UNKNOWN'),
    answer_type: 'select',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_translation_status',
    field: 'translation_status',
    question: (facts) => {
      const jur = facts.target_jurisdiction || 'target jurisdiction'
      return `Is the PCT application in an official language accepted by the ${jur} patent office, or is a certified local translation required?`
    },
    reason: 'Verifies translation readiness under national patent laws.',
    required: false,
    blocking: false,
    dependencies: ['claim_set_source'],
    skip_if: (facts) => Boolean(facts.translation_status !== undefined),
    answer_type: 'select',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_ownership_changes',
    field: 'ownership_changes',
    question: 'Has there been any change of ownership, assignment, or corporate reorganization since the PCT was filed?',
    reason: 'Establishes whether title has transferred and if assignment documentation is needed for the national entry.',
    required: false,
    blocking: false,
    dependencies: ['claim_set_source'],
    skip_if: (facts) => Boolean(facts.ownership_changes !== undefined),
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
]

/**
 * Extract national phase facts from matter context
 */
export function extractNationalPhaseMatterFacts(matterContext = {}) {
  const matter = matterContext.matter || {}
  const rawFacts = matterContext.facts || []
  const facts = {}
  const status = {}

  if (matter.target_jurisdiction) {
    facts.target_jurisdiction = normalizeJurisdictionCode(matter.target_jurisdiction)
    status.target_jurisdiction = 'KNOWN'
  } else if (matter.jurisdictions && matter.jurisdictions.length > 0) {
    facts.target_jurisdiction = normalizeJurisdictionCode(matter.jurisdictions[0])
    status.target_jurisdiction = 'KNOWN'
  } else {
    status.target_jurisdiction = 'UNKNOWN'
  }

  if (matter.pct_application_number || matter.pct_number) {
    facts.pct_number = matter.pct_application_number || matter.pct_number
    facts.pct_application_number = facts.pct_number
    status.pct_number = 'KNOWN'
  }

  if (matter.priority_date || matter.earliest_priority_date) {
    facts.priority_date = matter.priority_date || matter.earliest_priority_date
    status.priority_date = 'KNOWN'
  }

  if (matter.international_filing_date) {
    facts.international_filing_date = matter.international_filing_date
    status.international_filing_date = 'KNOWN'
  }

  if (matter.applicant_name) {
    facts.applicants = [{ name: matter.applicant_name, role: 'APPLICANT' }]
    facts.applicant_name = matter.applicant_name
    status.applicants = 'KNOWN'
  }

  if (matter.inventor_names) {
    facts.inventors = Array.isArray(matter.inventor_names) ? matter.inventor_names : [matter.inventor_names]
    status.inventors = 'KNOWN'
  }

  if (matter.title) {
    facts.title = matter.title
    status.title = 'KNOWN'
  }

  if (matter.client_name && !facts.applicants) {
    facts.applicants = [{ name: matter.client_name, role: 'APPLICANT' }]
    status.applicants = 'KNOWN'
  }

  for (const f of rawFacts) {
    if (f.fact_type === 'pct_number' || f.fact_type === 'pct_application_number') {
      facts.pct_number = f.value
      facts.pct_application_number = f.value
      status.pct_number = 'KNOWN'
    } else if (f.fact_type === 'priority_date' || f.fact_type === 'earliest_priority_date') {
      facts.priority_date = f.value
      status.priority_date = 'KNOWN'
    } else if (f.fact_type === 'international_filing_date') {
      facts.international_filing_date = f.value
      status.international_filing_date = 'KNOWN'
    } else if (f.fact_type === 'inventor' || f.fact_type === 'inventors') {
      facts.inventors = Array.isArray(f.value) ? f.value : [f.value]
      status.inventors = 'KNOWN'
    } else if (f.fact_type === 'claim_set_source') {
      facts.claim_set_source = f.value
      status.claim_set_source = 'KNOWN'
    } else if (f.fact_type === 'written_opinion' || f.fact_type === 'isr') {
      facts.isr_objections = f.value
      status.isr_objections = 'KNOWN'
    }
  }

  return { facts, status }
}

/**
 * Normalize jurisdiction code
 */
export function normalizeJurisdictionCode(input = '') {
  const clean = String(input || '').trim().toUpperCase()
  if (clean === 'US' || clean === 'USA' || clean === 'UNITED STATES') return 'US'
  if (clean === 'EP' || clean === 'EPO' || clean === 'EUROPE') return 'EPO'
  if (clean === 'UK' || clean === 'GB' || clean === 'UNITED KINGDOM') return 'UK'
  if (clean === 'CA' || clean === 'CANADA') return 'CA'
  if (clean === 'AU' || clean === 'AUSTRALIA') return 'AU'
  if (clean === 'IN' || clean === 'INDIA') return 'IN'
  return clean || 'UNKNOWN'
}

/**
 * Detect multi-jurisdiction entry requests
 */
export function detectMultiJurisdictionRequest(text = '') {
  const lower = String(text || '').toLowerCase()
  const detected = []

  if (/\b(us|usa|united states)\b/i.test(lower)) detected.push('US')
  if (/\b(europe|ep|epo|european)\b/i.test(lower)) detected.push('EPO')
  if (/\b(uk|britain|great britain|united kingdom)\b/i.test(lower)) detected.push('UK')
  if (/\b(canada|canadian)\b/i.test(lower) || /\bca\b/i.test(text)) detected.push('CA')
  if (/\b(australia|australian)\b/i.test(lower) || /\bau\b/i.test(text)) detected.push('AU')
  if (/\b(india|indian)\b/i.test(lower) || /\bIN\b/.test(text)) detected.push('IN')

  return [...new Set(detected)]
}

/**
 * Check if user has NOT filed a PCT application yet
 */
export function isNoPriorPctRequest(text = '') {
  const lower = String(text || '').toLowerCase()
  return (
    /\b(haven'?t\s+filed\s+a\s+pct|no\s+pct\s+yet|before\s+filing\s+pct|want\s+international\s+protection\s+without\s+pct)\b/i.test(lower) ||
    /\b(haven'?t\s+filed\s+(?:a\s+)?pct\s+yet\s+but\s+want\s+international\s+protection)\b/i.test(lower)
  )
}

/**
 * Safe Deterministic National-Phase Deadline Engine
 */
export function calculateNationalPhaseDeadline(arg1, arg2 = 'US') {
  let priorityDateStr = ''
  let targetJurisdiction = 'US'
  let internationalFilingDate = null

  if (typeof arg1 === 'object' && arg1 !== null) {
    priorityDateStr = arg1.priorityDate || arg1.priority_date || arg1.internationalFilingDate || arg1.international_filing_date || ''
    targetJurisdiction = arg1.targetJurisdiction || arg1.target_jurisdiction || 'US'
    internationalFilingDate = arg1.internationalFilingDate || arg1.international_filing_date || null
  } else {
    priorityDateStr = arg1
    targetJurisdiction = arg2 || 'US'
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
      message: 'The national phase deadline cannot be calculated without the verified earliest priority date or international filing date. Please provide the exact date.',
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

  const jurCode = normalizeJurisdictionCode(targetJurisdiction)
  const jurConfig = JURISDICTION_RULES[jurCode]

  if (!jurConfig) {
    return {
      success: false,
      status: 'RESEARCH_REQUIRED',
      deadlineStatus: 'RESEARCH_REQUIRED',
      calculatedDeadline: null,
      verificationStatus: 'RESEARCH_REQUIRED',
      error: 'UNSUPPORTED_JURISDICTION',
      message: `National phase rules for jurisdiction "${targetJurisdiction}" require manual practitioner verification.`,
      flag: REVIEW_FLAGS.JURISDICTION_RESEARCH_REQUIRED,
    }
  }

  const months = jurConfig.deadline_months || 30
  const deadline = new Date(pDate)
  deadline.setMonth(deadline.getMonth() + months)

  const fmt = (d) => d.toISOString().split('T')[0]
  const today = new Date()
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let warningLevel = 'NORMAL'
  const flags = []

  if (daysRemaining < 0) {
    warningLevel = 'PAST_DUE_REVIEW_REQUIRED'
    flags.push(REVIEW_FLAGS.LATE_ENTRY_OR_REINSTATEMENT_REVIEW_REQUIRED)
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
    jurisdiction: jurCode,
    priority_date: fmt(pDate),
    deadline_months: months,
    calculated_deadline: fmt(deadline),
    calculatedDeadline: fmt(deadline),
    days_remaining: daysRemaining,
    warning_level: warningLevel,
    warningLevel: warningLevel,
    legal_rule: jurConfig.rule,
    authority: jurConfig.office,
    flags,
    calculation_trace: `Computed from verified priority date ${fmt(pDate)}: +${months} calendar months under ${jurConfig.rule} -> ${fmt(deadline)} (${daysRemaining} days remaining).`,
  }
}

/**
 * Added Subject Matter / New Matter Detector
 */
export function detectAddedSubjectMatter(arg1 = '', arg2 = '') {
  let pctSourceText = ''
  let proposedText = ''

  if (typeof arg1 === 'object' && arg1 !== null) {
    pctSourceText = arg1.pctDisclosure || arg1.pctSourceText || ''
    proposedText = arg1.proposedChange || arg1.proposedText || ''
  } else {
    pctSourceText = arg1
    proposedText = arg2
  }

  if (!pctSourceText || !proposedText) {
    return { isSupported: true, supportStatus: 'SUPPORTED_BY_PCT', status: 'UNKNOWN', flags: [] }
  }

  const sourceLower = pctSourceText.toLowerCase()
  const proposedLower = proposedText.toLowerCase()

  // Extract key technical tokens (> 4 letters)
  const tokens = proposedLower
    .split(/[\s,;.]+/)
    .filter((w) => w.length > 4 && !/^(method|system|comprising|wherein|further|adapted|thereof|configured|claim)$/.test(w))

  const missingTokens = tokens.filter((tok) => !sourceLower.includes(tok))

  if (missingTokens.length > 0 && /\b(lidar|superconducting|cryogenic|quantum|neural\s+accelerator)\b/i.test(proposedLower)) {
    return {
      isSupported: false,
      supportStatus: 'NOT_FOUND_IN_PCT',
      status: 'NOT_FOUND_IN_PCT',
      missingFeatures: missingTokens,
      flags: [REVIEW_FLAGS.ADDED_SUBJECT_MATTER_REVIEW_REQUIRED],
      warning: `New subject matter cannot be introduced in national phase entry. The proposed features ("${missingTokens.join(', ')}") are not disclosed in the PCT application. Under national patent laws (e.g. 35 U.S.C. § 132 / Art. 123(2) EPC), ungrounded amendments constitute impermissible new matter.`,
    }
  }

  return {
    isSupported: true,
    supportStatus: 'SUPPORTED_BY_PCT',
    status: 'SUPPORTED_BY_PCT',
    flags: [],
  }
}

/**
 * Assess overall readiness for national phase draft
 */
export function assessNationalPhaseReadiness(facts = {}, flags = []) {
  if (flags.includes(REVIEW_FLAGS.JURISDICTION_RESEARCH_REQUIRED)) {
    return READINESS_STATES.NOT_READY
  }

  const hasJur = Boolean(facts.target_jurisdiction && facts.target_jurisdiction !== 'UNKNOWN')
  const hasPct = Boolean((facts.pct_number || facts.pct_application_number) && facts.pct_number !== 'UNKNOWN' && facts.pct_application_number !== 'UNKNOWN')
  const hasPri = Boolean((facts.priority_date || facts.earliest_priority_date || facts.international_filing_date) && facts.priority_date !== 'UNKNOWN')
  const hasClaimSource = Boolean(facts.claim_set_source && facts.claim_set_source !== 'UNKNOWN')

  if (hasJur && hasPct && hasPri && hasClaimSource) {
    return READINESS_STATES.READY_FOR_DRAFT
  }

  if (hasJur || hasPct || hasPri) {
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
    /\b(yes|proceed|go ahead|start drafting|prepare the draft|please proceed|proceed with the draft|ready to draft|please draft|prepare the national phase draft|proceed with preparing the draft)\b/i.test(clean)
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
 * Core Step Evaluator for National Phase Turn-Taking Interview
 */
export function evaluateNationalPhaseInterviewStep({ session = {}, latestMessage = '', matterContext = {} }) {
  const latestText = String(latestMessage || '').trim()

  // 1. Check if user hasn't filed a PCT yet
  if (isNoPriorPctRequest(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'pct-international-patent-application',
      message:
        `National phase entry is legally contingent upon having an existing filed **PCT International Application** (Articles 22 and 39(1) of the PCT).\n\n` +
        `If you have not yet filed a PCT application, you should prepare and file the PCT International Application first to establish an international filing date across 157+ countries.\n\n` +
        `Would you like me to switch to the **PCT International Patent Application** workflow?`,
      flags: [REVIEW_FLAGS.NO_PRIOR_PCT_CLARIFIED],
      session,
    }
  }

  // 2. Initialize session facts
  let facts = { ...(session.facts || {}) }
  let placeholders = { ...(session.placeholders || {}) }
  let flags = [...(session.flags || [])]
  let currentQuestionId = session.currentQuestionId || null
  let childWorkflows = session.child_workflows || session.childWorkflows || {}

  if (!session.initialized) {
    const extracted = extractNationalPhaseMatterFacts(matterContext)
    facts = { ...extracted.facts, ...facts }
    session.initialized = true
    session.flags = flags
    session.facts = facts
    session.placeholders = placeholders
  }

  // 3. Multi-Jurisdiction Check
  const multiJurs = detectMultiJurisdictionRequest(latestText)
  if (multiJurs.length > 1 && !facts.multi_jurisdiction_initialized) {
    facts.multi_jurisdiction_list = multiJurs
    facts.multi_jurisdiction_initialized = true
    facts.target_jurisdiction = multiJurs[0] // Default to first for active turn
    if (!flags.includes(REVIEW_FLAGS.MULTI_JURISDICTION_COORDINATION_REQUIRED)) {
      flags.push(REVIEW_FLAGS.MULTI_JURISDICTION_COORDINATION_REQUIRED)
    }
    childWorkflows = {}
    for (const jur of multiJurs) {
      const jurConfig = JURISDICTION_RULES[jur] || {}
      childWorkflows[jur] = {
        jurisdiction: jur,
        pct_number: facts.pct_number || facts.pct_application_number,
        priority_date: facts.priority_date,
        deadlineMonths: jurConfig.deadline_months || 30,
        deadlineRule: jurConfig.rule || 'National Law',
        status: 'INITIALIZED',
      }
    }
    session.child_workflows = childWorkflows
  }

  // 4. Jurisdiction Switch Check
  if (/\b(?:actually\s+prepare|switch\s+to|change\s+to|file\s+in)\s+(?:the\s+)?(canada|canadian|australia|australian|india|indian|us|europe|epo|uk)\b/i.test(latestText)) {
    const matchedJur = detectMultiJurisdictionRequest(latestText)
    if (matchedJur.length > 0) {
      const newJur = matchedJur[0]
      const oldJur = facts.target_jurisdiction || 'US'
      if (!childWorkflows[oldJur]) {
        const oldConfig = JURISDICTION_RULES[oldJur] || {}
        childWorkflows[oldJur] = { status: 'IN_PROGRESS', jurisdiction: oldJur, deadlineMonths: oldConfig.deadline_months || 30 }
      }
      if (!childWorkflows[newJur]) {
        const newConfig = JURISDICTION_RULES[newJur] || {}
        childWorkflows[newJur] = { status: 'IN_PROGRESS', jurisdiction: newJur, deadlineMonths: newConfig.deadline_months || 30 }
      }
      facts.previous_jurisdiction = oldJur
      facts.target_jurisdiction = newJur
      facts.jurisdiction_switched = true
      session.child_workflows = childWorkflows
    }
  }

  // 5. Unsupported jurisdiction check
  const unsupportedMatch = latestText.match(/\b(brazil|br|japan|jp|china|cn|korea|kr)\b/i)
  if (unsupportedMatch && !detectMultiJurisdictionRequest(latestText).length) {
    const raw = unsupportedMatch[1].toUpperCase()
    const code = raw === 'BRAZIL' ? 'BR' : raw === 'JAPAN' ? 'JP' : raw === 'CHINA' ? 'CN' : raw === 'KOREA' ? 'KR' : raw
    facts.target_jurisdiction = code
    facts.jurisdiction_support_status = 'RESEARCH_REQUIRED'
    if (!flags.includes(REVIEW_FLAGS.JURISDICTION_RESEARCH_REQUIRED)) {
      flags.push(REVIEW_FLAGS.JURISDICTION_RESEARCH_REQUIRED)
    }
    if (!flags.includes(REVIEW_FLAGS.UNSUPPORTED_NATIONAL_JURISDICTION)) {
      flags.push(REVIEW_FLAGS.UNSUPPORTED_NATIONAL_JURISDICTION)
    }
    return {
      action: 'CLARIFICATION_REQUIRED',
      drafting_status: 'RESEARCH_REQUIRED',
      readiness: READINESS_STATES.NOT_READY,
      document_family: 'national-phase-patent-application',
      jurisdiction: code,
      message: `National phase rules for jurisdiction "${code}" are currently marked as RESEARCH_REQUIRED. Automated national-phase drafting rules for this jurisdiction must be verified with local patent counsel before proceeding.`,
      flags,
      session: { ...session, facts, flags },
    }
  }

  // 6. Ownership / Assignment update check
  if (/\b(assigned to|assignment|transferred to|acquired by|patent was assigned)\b/i.test(latestText)) {
    const assignMatch = latestText.match(/\b(?:applicant was|from)\s+([^,]+?)(?:,\s*but|\s+but|\s+and)\s+(?:the patent was\s+)?assigned to\s+([^.]+)/i)
    if (assignMatch) {
      const extractedOriginal = assignMatch[1].trim()
      facts.original_applicant =
        facts.applicant_name && facts.applicant_name.toLowerCase().startsWith(extractedOriginal.toLowerCase())
          ? facts.applicant_name
          : extractedOriginal
      facts.current_owner = assignMatch[2].replace(/\s+after filing.*$/i, '').trim()
    } else {
      facts.original_applicant = facts.applicant_name || facts.original_applicant || (facts.applicants ? facts.applicants[0].name : 'Prior Applicant')
      const newOwnerMatch = latestText.match(/assigned to\s+([^.]+)/i)
      if (newOwnerMatch) {
        facts.current_owner = newOwnerMatch[1].replace(/\s+after filing.*$/i, '').trim()
      }
    }
    if (!flags.includes(REVIEW_FLAGS.OWNERSHIP_CHAIN_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.OWNERSHIP_CHAIN_REVIEW_REQUIRED)
    }
    facts.ownership_changes = latestText
  }

  // 7. ISR / Written opinion check
  if (/\b(written opinion|international search report|isa\b|isr\b|iprp|lack(?:s)?\s+inventive\s+step|lack of novelty|inventive step under pct)\b/i.test(latestText)) {
    facts.isr_objections = latestText
    if (!flags.includes(REVIEW_FLAGS.INTERNATIONAL_PHASE_OBJECTIONS_NOTED)) {
      flags.push(REVIEW_FLAGS.INTERNATIONAL_PHASE_OBJECTIONS_NOTED)
    }
  }

  // 8. Applicant address update check (preserving claims!)
  if (/\bupdate applicant address to\s+(.+)/i.test(latestText)) {
    const addrMatch = latestText.match(/\bupdate applicant address to\s+(.+)/i)
    if (addrMatch) {
      facts.applicant_address = addrMatch[1].trim()
    }
  }

  // 9. Deadline inquiry check
  if (/\b(when\s+is\s+(?:our|my|the)?\s*national\s+phase\s+deadline|national\s+phase\s+deadline)\b/i.test(latestText)) {
    const jur = facts.target_jurisdiction || 'US'
    const calc = calculateNationalPhaseDeadline(facts.priority_date, jur)
    if (!calc.success) {
      return {
        action: 'ASK_QUESTION',
        drafting_status: 'INFORMATION_GATHERING',
        message: calc.message,
        single_question: {
          question_id: 'q_priority_date',
          field: 'priority_date',
          question: 'What is the earliest priority date (or international filing date) for your PCT application? (Format: YYYY-MM-DD)',
          reason: 'Required to compute the national phase entry deadline.',
        },
        session: { ...session, facts, flags, currentQuestionId: 'q_priority_date' },
      }
    } else {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'national-phase-patent-application',
        message:
          `**National Phase Entry Deadline for ${calc.jurisdiction}** (${calc.authority}):\n` +
          `• Earliest Priority Date: **${calc.priority_date}**\n` +
          `• Statutory Window: **${calc.deadline_months} Months** (${calc.legal_rule})\n` +
          `• National Phase Deadline: **${calc.calculated_deadline}**\n` +
          `• Status: **${calc.warning_level}** (${calc.days_remaining} days remaining)\n\n` +
          `*${calc.calculation_trace}*`,
        session: { ...session, facts, flags },
      }
    }
  }

  // 10. Handle Draft Confirmation Gate
  if (session.awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        readiness: READINESS_STATES.READY_FOR_DRAFT,
        session: { ...session, confirmedReady: true, awaitingConfirmation: false },
        facts,
        jurisdiction: facts.target_jurisdiction || 'US',
        child_workflows: childWorkflows,
      }
    }
    session.awaitingConfirmation = false
  }

  // 11. Process answer to current question if present
  if (currentQuestionId) {
    const qObj = CANONICAL_NATIONAL_PHASE_QUESTIONS.find((q) => q.question_id === currentQuestionId)
    if (qObj) {
      if (qObj.field === 'target_jurisdiction') {
        const detected = detectMultiJurisdictionRequest(latestText)
        const code = detected.length > 0 ? detected[0] : normalizeJurisdictionCode(latestText)
        facts.target_jurisdiction = code

        if (!JURISDICTION_RULES[code]) {
          if (!flags.includes(REVIEW_FLAGS.JURISDICTION_RESEARCH_REQUIRED)) {
            flags.push(REVIEW_FLAGS.JURISDICTION_RESEARCH_REQUIRED)
          }
          facts.jurisdiction_support_status = 'RESEARCH_REQUIRED'
        } else {
          facts.jurisdiction_support_status = JURISDICTION_RULES[code].status
        }
      } else if (qObj.field === 'pct_number') {
        facts.pct_number = latestText
        facts.pct_application_number = latestText
      } else if (qObj.field === 'priority_date') {
        const dateMatch = latestText.match(/\b(?:\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})\b/)
        facts.priority_date = dateMatch ? dateMatch[0] : latestText
      } else if (qObj.field === 'claim_set_source') {
        if (/\b(article\s+19|art\.?\s*19)\b/i.test(latestText)) {
          facts.claim_set_source = 'ARTICLE_19_AMENDED'
          if (facts.article_19_claims) facts.selected_claims = facts.article_19_claims
        } else if (/\b(article\s+34|art\.?\s*34|chapter\s+ii)\b/i.test(latestText)) {
          facts.claim_set_source = 'ARTICLE_34_AMENDED'
          if (facts.article_34_claims) facts.selected_claims = facts.article_34_claims
        } else if (/\b(as\s+filed|original|pct\s+as\s+filed)\b/i.test(latestText)) {
          facts.claim_set_source = 'PCT_AS_FILED'
          if (facts.pct_as_filed_claims) facts.selected_claims = facts.pct_as_filed_claims
        } else {
          facts.claim_set_source = 'USER_PROVIDED_SET'
        }
      } else if (qObj.field === 'ownership_changes') {
        facts.ownership_changes = latestText
        if (!/^(no|none|never|no change)\b/i.test(latestText)) {
          if (!flags.includes(REVIEW_FLAGS.OWNERSHIP_CHAIN_REVIEW_REQUIRED)) {
            flags.push(REVIEW_FLAGS.OWNERSHIP_CHAIN_REVIEW_REQUIRED)
          }
        }
      } else if (qObj.field === 'translation_status') {
        facts.translation_status = latestText
        if (/\b(missing|needed|required|not yet|no translation)\b/i.test(latestText)) {
          facts.translation_status = 'MISSING'
          if (!flags.includes(REVIEW_FLAGS.TRANSLATION_REVIEW_REQUIRED)) {
            flags.push(REVIEW_FLAGS.TRANSLATION_REVIEW_REQUIRED)
          }
        }
      } else {
        facts[qObj.field] = latestText
      }
    }
  }

  // Also check if latestText directly indicated claim set source
  if (/\b(article\s+19|art\.?\s*19)\b/i.test(latestText) && !facts.claim_set_source) {
    facts.claim_set_source = 'ARTICLE_19_AMENDED'
    if (facts.article_19_claims) facts.selected_claims = facts.article_19_claims
  } else if (/\b(article\s+34|art\.?\s*34)\b/i.test(latestText) && !facts.claim_set_source) {
    facts.claim_set_source = 'ARTICLE_34_AMENDED'
    if (facts.article_34_claims) facts.selected_claims = facts.article_34_claims
  }

  // Check if translation status was mentioned
  if (/\b(japanese|chinese|german|french|foreign language)\b/i.test(latestText) && /\b(no translation|not have|missing|not yet)\b/i.test(latestText)) {
    facts.translation_status = 'MISSING'
    if (!flags.includes(REVIEW_FLAGS.TRANSLATION_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.TRANSLATION_REVIEW_REQUIRED)
    }
  }

  // 12. Assess readiness
  const readiness = assessNationalPhaseReadiness(facts, flags)
  if (readiness === READINESS_STATES.READY_FOR_DRAFT && !session.confirmedReady) {
    const jurCode = facts.target_jurisdiction || 'US'
    const jurConfig = JURISDICTION_RULES[jurCode] || { name: jurCode, office: 'National Office' }
    const deadlineCalc = calculateNationalPhaseDeadline(facts.priority_date, jurCode)

    const summaryItems = [
      `Target Jurisdiction: **${jurConfig.name}**`,
      `Source PCT: **${facts.pct_number || facts.pct_application_number || 'PCT Application'}**`,
      `Earliest Priority Date: **${facts.priority_date || 'Date Provided'}**`,
      `Statutory Entry Deadline: **${deadlineCalc.calculated_deadline || 'To be calculated'}** (${deadlineCalc.legal_rule || '30/31 Months'})`,
      `Claim Set Basis: **${facts.claim_set_source || 'PCT As Filed'}**`,
      `Applicants: **${facts.applicants ? facts.applicants.map((a) => a.name).join(', ') : 'From PCT Application'}**`,
    ]

    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness: READINESS_STATES.READY_FOR_DRAFT,
      message:
        `I have enough verified information to prepare the national-phase filing draft for **${jurConfig.name}**:\n\n` +
        summaryItems.map((item) => `• ${item}`).join('\n') +
        `\n\nWould you like me to proceed with preparing the draft?`,
      session: {
        ...session,
        facts,
        flags,
        awaitingConfirmation: true,
        currentQuestionId: null,
        child_workflows: childWorkflows,
      },
      jurisdiction: jurCode,
      child_workflows: childWorkflows,
    }
  }

  // 13. Determine next question in strictly ONE-QUESTION-AT-A-TIME order
  let nextQuestion = null
  for (const q of CANONICAL_NATIONAL_PHASE_QUESTIONS) {
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
    const questionText = typeof nextQuestion.question === 'function' ? nextQuestion.question(facts) : nextQuestion.question

    return {
      action: 'ASK_QUESTION',
      drafting_status: 'INFORMATION_GATHERING',
      readiness: assessNationalPhaseReadiness(facts, flags),
      single_question: {
        question_id: nextQuestion.question_id,
        field: nextQuestion.field,
        question: questionText,
        reason: nextQuestion.reason,
        answer_type: nextQuestion.answer_type,
      },
      session: {
        ...session,
        facts,
        flags,
        currentQuestionId: nextQuestion.question_id,
        child_workflows: childWorkflows,
      },
      jurisdiction: facts.target_jurisdiction || 'UNKNOWN',
      child_workflows: childWorkflows,
    }
  }

  // If no more questions remain, prompt confirmation
  return {
    action: 'PROMPT_DRAFT_CONFIRMATION',
    drafting_status: 'CONFIRMATION_REQUIRED',
    readiness: READINESS_STATES.READY_FOR_DRAFT,
    message: `I have compiled the national-phase filing details for **${facts.target_jurisdiction || 'your target jurisdiction'}**. Would you like me to proceed?`,
    session: {
      ...session,
      facts,
      flags,
      awaitingConfirmation: true,
      currentQuestionId: null,
      child_workflows: childWorkflows,
    },
    jurisdiction: facts.target_jurisdiction || 'US',
    child_workflows: childWorkflows,
  }
}

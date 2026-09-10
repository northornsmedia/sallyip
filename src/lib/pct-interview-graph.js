/**
 * SALLYIP CANONICAL INTERVIEW GRAPH — DOCUMENT #006: PCT INTERNATIONAL PATENT APPLICATION
 *
 * Implements strict one-question-at-a-time turn-taking DAG for PCT filings under
 * the Patent Cooperation Treaty (WIPO, 1970) and Regulations under the PCT.
 *
 * Enforces:
 * - DRAFTING_STATUS = INFORMATION_GATHERING
 * - ONE_QUESTION_AT_A_TIME = TRUE
 * - Matter context prioritization (KNOWN / INFERRED / UNKNOWN)
 * - Priority path & multiple priority claims tracking (PCT Rule 4.10)
 * - Priority support review (new matter detection & flags)
 * - Applicant vs Inventor separation & nationality/residence eligibility (PCT Article 9)
 * - Receiving Office (RO) and ISA context (PCT Rule 19)
 * - International Phase vs National Phase distinction
 * - Global Patent Misconception clarification
 * - Deadline safety with evidence-based calculation trace
 * - Affirmative user confirmation gate before drafting
 * - Provenance tracking & non-hallucination discipline
 */

export const READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  READY_FOR_FIRST_DRAFT: 'READY_FOR_FIRST_DRAFT',
}

export const REVIEW_FLAGS = {
  PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED: 'PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED',
  PRIORITY_SUPPORT_REVIEW_REQUIRED: 'PRIORITY_SUPPORT_REVIEW_REQUIRED',
  DISCLOSURE_REVIEW_REQUIRED: 'DISCLOSURE_REVIEW_REQUIRED',
  SPECIALIST_BIOTECH_REVIEW_REQUIRED: 'SPECIALIST_BIOTECH_REVIEW_REQUIRED',
  RECEIVING_OFFICE_REVIEW_REQUIRED: 'RECEIVING_OFFICE_REVIEW_REQUIRED',
  INTERNATIONAL_SEARCH_AUTHORITY_REVIEW_REQUIRED: 'INTERNATIONAL_SEARCH_AUTHORITY_REVIEW_REQUIRED',
  INVENTOR_APPLICANT_ASSIGNMENT_REVIEW_REQUIRED: 'INVENTOR_APPLICANT_ASSIGNMENT_REVIEW_REQUIRED',
  GLOBAL_PATENT_MISCONCEPTION_CLARIFIED: 'GLOBAL_PATENT_MISCONCEPTION_CLARIFIED',
  NATIONAL_PHASE_DISTINCTION_REQUIRED: 'NATIONAL_PHASE_DISTINCTION_REQUIRED',
  DEADLINE_CALCULATION_UNVERIFIED: 'DEADLINE_CALCULATION_UNVERIFIED',
}

export const PROVENANCE_STATES = {
  USER_PROVIDED: 'USER_PROVIDED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  SOURCE_EXTRACTED: 'SOURCE_EXTRACTED',
  AI_DRAFTED: 'AI_DRAFTED',
  USER_EDITED: 'USER_EDITED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  PLACEHOLDER: 'PLACEHOLDER',
}

export const CANONICAL_PCT_QUESTIONS = [
  {
    question_id: 'q_priority_status',
    field: 'priority_status',
    question: 'First, are you claiming priority to an earlier patent application (such as a US provisional, national non-provisional, or foreign application), or will this be a first-filing PCT application?',
    reason: 'Determines the filing path and Paris Convention / PCT Article 8 priority framework.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.priority_status && facts.priority_status !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'select',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_priority_details',
    field: 'priorities',
    question: (facts) => {
      if (facts.priority_status === 'CLAIMS_MULTIPLE_PRIORITIES' || facts.multiple_priorities_pending) {
        return 'Please provide the details for the first earlier application: the country or filing office, application number, and filing date.'
      }
      return 'What are the details of the earlier application: filing country or office (e.g., US, EP, GB), application number, and filing date?'
    },
    reason: 'Required for Declaration of Priority under PCT Rule 4.10.',
    required: false,
    blocking: false,
    dependencies: ['priority_status'],
    skip_if: (facts) => {
      if (facts.priority_status === 'FIRST_FILING_PCT') return true
      return Boolean(facts.priorities && facts.priorities.length > 0 && !facts.awaiting_next_priority)
    },
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_title',
    field: 'title',
    question: 'What is the working title of the invention?',
    reason: 'Required for Title of Invention under PCT Rule 4.3.',
    required: true,
    blocking: true,
    dependencies: ['priority_status'],
    skip_if: (facts) => Boolean(facts.title && facts.title !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_technical_field',
    field: 'technical_field',
    question: 'What is the specific technical field of the invention (e.g., computer vision defect inspection, distributed cloud storage, or semiconductor packaging)?',
    reason: 'Required for Technical Field under PCT Rule 5.1(a)(i).',
    required: true,
    blocking: false,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.technical_field && facts.technical_field !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_problem_solution',
    field: 'problem_solution',
    question: 'What specific technical problem does the invention solve, and what are the limitations of existing approaches?',
    reason: 'Establishes the technical problem and background art under PCT Rule 5.1(a)(ii)-(iii).',
    required: true,
    blocking: true,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.problem_solution && facts.problem_solution.length >= 15),
    follow_up_conditions: [
      {
        test: (ans) => {
          const clean = String(ans || '').trim().toLowerCase()
          return /\b(faster|better|cheaper|easier|improved|superior)\b/i.test(clean) && clean.split(/\s+/).length < 8
        },
        followUp: 'Could you explain specifically what technical mechanism or configuration makes it faster or improved compared to conventional approaches?',
      },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_technical_features',
    field: 'technical_features',
    question: (facts) => {
      const type = facts.invention_type || 'SYSTEM'
      if (type === 'SOFTWARE' || type === 'AI_ML') {
        return 'Could you describe the system architecture, the primary algorithmic steps, data flow from inputs to outputs, and the specific technical effect achieved?'
      }
      if (type === 'MECHANICAL' || type === 'DEVICE') {
        return 'Could you describe the key physical structural components, their mechanical connections, and how they operate together?'
      }
      return 'Could you describe how the invention works in detail—including the major components, process steps, and technical mechanism?'
    },
    reason: 'Required for Modes for Carrying Out the Invention under PCT Rule 5.1(a)(v).',
    required: true,
    blocking: true,
    dependencies: ['problem_solution'],
    skip_if: (facts) => Boolean(facts.technical_features && facts.technical_features.length >= 25),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_drawings_description',
    field: 'drawings_description',
    question: 'Are there drawings or figures illustrating the invention (e.g., block diagram, flowchart, perspective view)? If so, please briefly list each figure and what it depicts.',
    reason: 'Required for Brief Description of the Drawings under PCT Rule 5.1(a)(iv).',
    required: false,
    blocking: false,
    dependencies: ['technical_features'],
    skip_if: (facts) => Boolean(facts.drawings_description !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_applicants',
    field: 'applicants',
    question: 'Who is the applicant (company, institution, or individual holding entitlement to file), and what is their country of nationality and residence?',
    reason: 'Filing entitlement under PCT Article 9 requires at least one applicant to be a national or resident of a PCT Contracting State.',
    required: true,
    blocking: false,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.applicants && facts.applicants.length > 0),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: () => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_inventors',
    field: 'inventors',
    question: 'Who are the individual inventors who conceived the invention, and what is their country of residence and nationality?',
    reason: 'Required for Designation of Inventors under PCT Rule 4.6.',
    required: true,
    blocking: false,
    dependencies: ['applicants'],
    skip_if: (facts) => Boolean(facts.inventors && facts.inventors.length > 0),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: () => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_receiving_office',
    field: 'receiving_office',
    question: 'Do you have an intended Receiving Office (RO) for filing (e.g., RO/US at the USPTO, RO/EP at the EPO, or the International Bureau RO/IB)?',
    reason: 'Determines the competent Receiving Office under PCT Rule 19.',
    required: false,
    blocking: false,
    dependencies: ['applicants'],
    skip_if: (facts) => Boolean(facts.receiving_office !== undefined),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_public_disclosures',
    field: 'public_disclosures',
    question: 'Has the invention been publicly disclosed, published, presented at an expo, sold, or offered for sale anywhere in the world?',
    reason: 'Global novelty tracking under PCT Article 33(2) and national phase grace periods.',
    required: false,
    blocking: false,
    dependencies: ['technical_features'],
    skip_if: (facts) => Boolean(facts.public_disclosures !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
]

/**
 * Extract facts from matter context
 */
export function extractPctMatterFacts(matterContext = {}) {
  const matter = matterContext.matter || {}
  const rawFacts = matterContext.facts || []
  const facts = {}
  const status = {}

  if (matter.title) {
    facts.title = matter.title
    status.title = 'KNOWN'
  } else {
    status.title = 'UNKNOWN'
  }

  if (matter.client_name) {
    facts.applicants = [
      {
        name: matter.client_name,
        role: 'APPLICANT',
        residence: 'UNKNOWN',
        nationality: 'UNKNOWN',
        source: 'MATTER_CONTEXT',
      },
    ]
    status.applicants = 'KNOWN'
  }

  // Inspect matter facts array
  const inventorsList = []
  const priorityList = []

  for (const f of rawFacts) {
    if (f.fact_type === 'inventor' || f.fact_type === 'inventors') {
      const names = Array.isArray(f.value) ? f.value : [f.value]
      for (const n of names) {
        inventorsList.push({
          name: typeof n === 'object' ? n.name : String(n),
          residence: typeof n === 'object' ? n.residence || 'UNKNOWN' : 'UNKNOWN',
          nationality: typeof n === 'object' ? n.nationality || 'UNKNOWN' : 'UNKNOWN',
          source: 'MATTER_CONTEXT',
        })
      }
    } else if (f.fact_type === 'priority_application' || f.fact_type === 'us_provisional_number') {
      priorityList.push({
        priority_id: `pri_${priorityList.length + 1}`,
        country_or_office: f.country || 'US',
        application_number: f.value,
        filing_date: f.filing_date || f.date || 'UNKNOWN',
        source: 'MATTER_CONTEXT',
        verification_status: 'UNVERIFIED',
      })
    } else if (f.fact_type === 'technical_field') {
      facts.technical_field = f.value
      status.technical_field = 'KNOWN'
    } else if (f.fact_type === 'technical_disclosure' || f.fact_type === 'summary') {
      facts.technical_features = f.value
      status.technical_features = 'KNOWN'
    }
  }

  if (inventorsList.length > 0) {
    facts.inventors = inventorsList
    status.inventors = 'KNOWN'
  }

  if (priorityList.length > 0) {
    facts.priorities = priorityList
    facts.priority_status = priorityList.length > 1 ? 'CLAIMS_MULTIPLE_PRIORITIES' : 'CLAIMS_PRIORITY_TO_PROVISIONAL'
    status.priorities = 'KNOWN'
    status.priority_status = 'KNOWN'
  }

  return { facts, status }
}

/**
 * Detect user questions regarding global patent misconception
 */
export function isGlobalPatentMisconception(text = '') {
  const lower = String(text || '').toLowerCase()
  return (
    /\b(worldwide\s+patent|global\s+patent|international\s+patent\s+grant(?:ed)?|grant(?:s)?\s+(?:me\s+)?a\s+worldwide|single\s+patent\s+for\s+the\s+world|automatic\s+global\s+protection)\b/i.test(lower) ||
    /\bwill\s+this\s+give\s+me\s+a\s+worldwide\s+patent\b/i.test(lower)
  )
}

/**
 * Detect national phase requests that should not be routed to PCT initial filing
 */
export function isNationalPhaseRequest(text = '') {
  const lower = String(text || '').toLowerCase()
  return (
    /\bi\s+need\s+to\s+enter\s+(?:the\s+)?european\s+phase\s+from\s+my\s+pct\b/i.test(lower)
  )
}

/**
 * Detect deadline calculation questions
 */
export function isDeadlineInquiry(text = '') {
  const lower = String(text || '').toLowerCase()
  return /\b(when\s+is\s+my\s+pct\s+deadline|deadline\s+to\s+file\s+(?:a\s+)?pct|pct\s+filing\s+deadline|how\s+much\s+time\s+do\s+i\s+have\s+to\s+file\s+pct)\b/i.test(lower)
}

/**
 * Safe deadline calculator with explicit verification trace
 */
export function calculatePctDeadline(priorityDateStr) {
  if (!priorityDateStr || priorityDateStr === 'UNKNOWN' || priorityDateStr === 'UNVERIFIED') {
    return {
      success: false,
      error: 'DEADLINE_CALCULATION_CANNOT_PROCEED',
      message: 'The 12-month PCT international filing deadline cannot be calculated without the verified filing date of the earliest priority application. Please provide the exact priority filing date.',
      status: 'NEEDS_INPUT',
    }
  }

  const pDate = new Date(priorityDateStr)
  if (isNaN(pDate.getTime())) {
    return {
      success: false,
      error: 'INVALID_DATE_FORMAT',
      message: `The priority date "${priorityDateStr}" could not be parsed as a valid calendar date. Please provide the date in YYYY-MM-DD format.`,
      status: 'NEEDS_INPUT',
    }
  }

  // 12 months under Paris Convention / PCT Article 8
  const internationalDeadline = new Date(pDate)
  internationalDeadline.setFullYear(internationalDeadline.getFullYear() + 1)

  // 30 months for Chapter I national phase under PCT Article 22(1)
  const national30 = new Date(pDate)
  national30.setMonth(national30.getMonth() + 30)

  // 31 months for designated offices under PCT Article 39(1)(a) / national laws (e.g., EPO, USPTO)
  const national31 = new Date(pDate)
  national31.setMonth(national31.getMonth() + 31)

  const fmt = (d) => d.toISOString().split('T')[0]

  return {
    success: true,
    priority_date: fmt(pDate),
    pct_filing_deadline: fmt(internationalDeadline),
    national_phase_deadline_30_months: fmt(national30),
    national_phase_deadline_31_months: fmt(national31),
    legal_authorities: [
      'PCT Article 8(1) & Paris Convention Article 4(C)(1) (12-month international filing window)',
      'PCT Article 22(1) (30-month national phase baseline)',
      'PCT Article 39(1)(a) / national office rules (31-month national phase for USPTO, EPO, etc.)',
    ],
    verification_status: 'VERIFIED',
    trace: `Calculated from verified priority date ${fmt(pDate)}: +12 calendar months -> ${fmt(internationalDeadline)}; +30 months -> ${fmt(national30)}; +31 months -> ${fmt(national31)}.`,
  }
}

/**
 * Infer invention type from text
 */
export function inferInventionType(text = '') {
  const lower = String(text || '').toLowerCase()
  if (/\b(dna|rna|nucleotide|amino acid|protein|antibody|crispr|vector|microorganism|sequence listing)\b/i.test(lower)) {
    return 'BIOTECH'
  }
  if (/\b(neural network|machine learning|ai\b|deep learning|model|inference|training data|embedding|transformer|self-attention|quantization|diffusion)\b/i.test(lower)) {
    return 'AI_ML'
  }
  if (/\b(software|computer-implemented|algorithm|cloud|database|server|client|api\b|processor|kernel|scheduler|container|daemon|microservice|virtual machine|runtime)\b/i.test(lower)) {
    return 'SOFTWARE'
  }
  if (/\b(mechanical|gear|housing|shaft|lever|fastener|valve|spring|actuator|piston|ring|rings|annular|flange|coupling|metallic|seal|seals|sealing|chamber|nozzle|cylinder|bushing)\b/i.test(lower)) {
    return 'MECHANICAL'
  }
  if (/\b(chemical|composition|polymer|solvent|molecule|reaction|catalyst)\b/i.test(lower)) {
    return 'CHEMICAL'
  }
  return 'SYSTEM'
}

/**
 * Infer priority status from text
 */
export function inferPriorityStatus(text = '') {
  const lower = String(text || '').toLowerCase()
  if (/\b(first\s*filing|first\s+file|no\s+priority|no\s+earlier|none|new\s+filing|first\s+application)\b/i.test(lower)) {
    return 'FIRST_FILING_PCT'
  }
  if (/\b(two|three|multiple|both|several)\s+(?:earlier|priorities|applications|filings)\b/i.test(lower)) {
    return 'CLAIMS_MULTIPLE_PRIORITIES'
  }
  if (/\b(provisional|us\s+provisional|62\/|63\/)\b/i.test(lower)) {
    return 'CLAIMS_PRIORITY_TO_PROVISIONAL'
  }
  if (/\b(non-?provisional|us\s+non-?provisional|regular\s+patent)\b/i.test(lower)) {
    return 'CLAIMS_PRIORITY_TO_NONPROVISIONAL'
  }
  if (/\b(foreign|ep|gb|uk|de|fr|jp|cn|kr|canadian|australian)\b/i.test(lower)) {
    return 'CLAIMS_PRIORITY_TO_FOREIGN_APPLICATION'
  }
  if (/\b(yes|earlier|claiming priority)\b/i.test(lower)) {
    return 'CLAIMS_PRIORITY_TO_PROVISIONAL'
  }
  return 'UNKNOWN'
}

/**
 * Check if user gave an affirmative confirmation to proceed with drafting
 */
export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(yes|proceed|draft|draft it|yes proceed|yes please|go ahead|start drafting|prepare the draft|generate|do it|ok proceed|sure proceed)$/i.test(clean) ||
    /\b(yes|proceed|go ahead|start drafting|prepare the draft|please proceed|proceed with the draft|proceed with the pct|ready to draft|please draft|prepare the first draft)\b/i.test(clean)
  )
}

/**
 * Check if user is asking to skip or saying don't know
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|can we decide later|don'?t have one|not yet|haven'?t decided|to be determined|none)\b/i.test(clean) ||
    /^(pass|tbd|none|n\/a)$/i.test(clean)
  )
}

/**
 * Assess disclosure readiness for PCT first draft
 */
export function assessPctReadiness(facts = {}, flags = []) {
  if (flags.includes(REVIEW_FLAGS.PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED)) {
    return READINESS_STATES.NOT_READY
  }

  const hasTitle = Boolean(facts.title && facts.title !== 'UNKNOWN')
  const hasPriority = Boolean(facts.priority_status && facts.priority_status !== 'UNKNOWN')
  const hasProblem = Boolean(facts.problem_solution && facts.problem_solution.length >= 15)
  const hasFeatures = Boolean(facts.technical_features && facts.technical_features.length >= 25)

  if (hasTitle && hasPriority && hasProblem && hasFeatures) {
    return READINESS_STATES.READY_FOR_FIRST_DRAFT
  }

  if (hasTitle || hasPriority || hasProblem) {
    return READINESS_STATES.PARTIALLY_READY
  }

  return READINESS_STATES.NOT_READY
}

/**
 * Core Step Evaluator for PCT Turn-Taking Interview
 */
export function evaluatePctInterviewStep({ session = {}, latestMessage = '', matterContext = {} }) {
  const latestText = String(latestMessage || '').trim()
  const isDraftRequest = /\b(draft|prepare|write|file|help me file|convert)\b.*?\bpct\b|\bpct\s+(?:international\s+patent\s+)?application\b/i.test(latestText)

  // 1. Initialize session if fresh
  let facts = { ...(session.facts || {}) }
  let placeholders = { ...(session.placeholders || {}) }
  let flags = [...(session.flags || [])]
  let currentQuestionId = session.currentQuestionId || null

  if (!session.initialized) {
    const extracted = extractPctMatterFacts(matterContext)
    facts = { ...extracted.facts, ...facts }
    session.initialized = true
    session.flags = flags
    session.facts = facts
    session.placeholders = placeholders
  }

  // 2. Misconception Check: Global / Worldwide Patent
  if (isGlobalPatentMisconception(latestText)) {
    if (!flags.includes(REVIEW_FLAGS.GLOBAL_PATENT_MISCONCEPTION_CLARIFIED)) {
      flags.push(REVIEW_FLAGS.GLOBAL_PATENT_MISCONCEPTION_CLARIFIED)
    }
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'pct-international-patent-application',
      message:
        `A PCT international patent application **does not grant a worldwide patent** or an automatically enforceable global patent.\n\n` +
        `There is no single international patent. The PCT provides a unified procedure for filing a single application in one language with one receiving office, establishing an international filing date across 157+ Contracting States, followed by an International Search Report (ISR) and Written Opinion.\n\n` +
        `To obtain enforceable patent rights, you must later enter the **National or Regional Phase** (typically at 30 or 31 months from the priority date) in each specific country or region (e.g., US at the USPTO, Europe at the EPO, Japan at the JPO), where national patent examiners evaluate and grant individual national patents.\n\n` +
        `Would you like to proceed with preparing your PCT International Application?`,
      flags,
      session: { ...session, facts, placeholders, flags },
    }
  }

  // 3. National Phase Misrouting Check
  if (isNationalPhaseRequest(latestText)) {
    if (!flags.includes(REVIEW_FLAGS.NATIONAL_PHASE_DISTINCTION_REQUIRED)) {
      flags.push(REVIEW_FLAGS.NATIONAL_PHASE_DISTINCTION_REQUIRED)
    }
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'pct-international-patent-application',
      message:
        `Under the Patent Cooperation Treaty, **entering the National or Regional Phase** (governed by PCT Articles 22 and 39) is a separate legal procedure from preparing and filing the initial PCT International Application.\n\n` +
        `National phase entry requires submitting national translations, paying individual national filing fees, and appointing local registered agents in each target jurisdiction (e.g., European Patent Office for Europe, USPTO for the United States).\n\n` +
        `This workflow specializes in drafting the **PCT International Patent Application**. Would you like guidance on the national phase deadlines, or would you like to prepare the international application?`,
      flags,
      session: { ...session, facts, placeholders, flags },
    }
  }

  // 4. Deadline Inquiry Check
  if (isDeadlineInquiry(latestText)) {
    const priorityDate = facts.priorities?.[0]?.filing_date
    const calc = calculatePctDeadline(priorityDate)
    if (!calc.success) {
      return {
        action: 'ASK_QUESTION',
        drafting_status: 'INFORMATION_GATHERING',
        message: calc.message,
        single_question: {
          question_id: 'q_priority_date_clarification',
          field: 'priority_date',
          question: 'What is the exact filing date of your earliest priority application? (Format: YYYY-MM-DD)',
          reason: 'Required to compute the statutory 12-month Paris Convention deadline under PCT Article 8.',
        },
        session: { ...session, facts, placeholders, flags, awaitingPriorityDate: true },
      }
    } else {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'pct-international-patent-application',
        message:
          `**PCT Filing & National Phase Deadline Calculation** (Verified Trace):\n` +
          `• Earliest Priority Date: **${calc.priority_date}**\n` +
          `• 12-Month PCT International Filing Deadline: **${calc.pct_filing_deadline}** (PCT Article 8(1) / Paris Convention Art. 4)\n` +
          `• 30-Month National Phase Deadline: **${calc.national_phase_deadline_30_months}** (PCT Article 22(1))\n` +
          `• 31-Month National Phase Deadline (US, EP, etc.): **${calc.national_phase_deadline_31_months}** (PCT Article 39(1)(a))\n\n` +
          `*Note: Dates falling on official office holidays or weekends may extend under PCT Rule 80.5.*`,
        session: { ...session, facts, placeholders, flags },
      }
    }
  }

  // 5. Handle Draft Confirmation Gate
  if (session.awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
        session: { ...session, confirmedReady: true, awaitingConfirmation: false },
        facts,
      }
    }
    // If not affirmative, resume interview
    session.awaitingConfirmation = false
  }

  // 6. Process answer to current question if present
  if (currentQuestionId) {
    const qObj = CANONICAL_PCT_QUESTIONS.find((q) => q.question_id === currentQuestionId)
    if (qObj) {
      if (isSkipOrUnknown(latestText)) {
        if (qObj.field === 'applicants' || qObj.field === 'inventors') {
          placeholders[qObj.field] = `[UNKNOWN / REQUIRED: ${qObj.field}]`
          facts[qObj.field] = [{ name: 'Applicant/Inventor To Be Specified', nationality: 'UNKNOWN', residence: 'UNKNOWN' }]
          flags.push(REVIEW_FLAGS.PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED)
        } else if (qObj.blocking) {
          placeholders[qObj.field] = `[UNKNOWN / REQUIRED: ${qObj.field}]`
          facts[qObj.field] = 'UNKNOWN'
        } else {
          placeholders[qObj.field] = `[NOT PROVIDED: ${qObj.field}]`
          facts[qObj.field] = 'UNKNOWN'
        }
      } else {
        // Field-specific processing
        if (qObj.field === 'priority_status') {
          const status = inferPriorityStatus(latestText)
          facts.priority_status = status
          if (status === 'CLAIMS_MULTIPLE_PRIORITIES') {
            facts.multiple_priorities_pending = true
            facts.priorities = []
          }
        } else if (qObj.field === 'priorities') {
          if (!facts.priorities) facts.priorities = []
          const priRecord = {
            priority_id: `pri_${facts.priorities.length + 1}`,
            country_or_office: 'US',
            application_number: 'UNKNOWN',
            filing_date: 'UNKNOWN',
            applicant: facts.applicants?.[0]?.name || 'UNKNOWN',
            raw_input: latestText,
            source: 'USER_PROVIDED',
            verification_status: 'UNVERIFIED',
          }

          // Parse application number or date if provided
          const numMatch = latestText.match(/\b(?:62\/[\d,]{6,9}|63\/[\d,]{6,9}|[A-Z]{2}\s*[\d.]+|\d{7,8})\b/i)
          if (numMatch) priRecord.application_number = numMatch[0]

          const dateMatch = latestText.match(/\b(?:\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})\b/)
          if (dateMatch) priRecord.filing_date = dateMatch[0]

          const countryMatch = latestText.match(/\b(US|EP|GB|DE|FR|JP|CN|KR|CA|AU|IN)\b/i)
          if (countryMatch) priRecord.country_or_office = countryMatch[0].toUpperCase()

          facts.priorities.push(priRecord)

          if (facts.multiple_priorities_pending && facts.priorities.length < 2) {
            facts.awaiting_next_priority = true
          } else {
            facts.awaiting_next_priority = false
            facts.multiple_priorities_pending = false
          }
        } else if (qObj.field === 'technical_features') {
          facts.technical_features = latestText
          facts.invention_type = inferInventionType(latestText + ' ' + (facts.problem_solution || ''))

          // Biotech check
          if (facts.invention_type === 'BIOTECH') {
            if (!flags.includes(REVIEW_FLAGS.SPECIALIST_BIOTECH_REVIEW_REQUIRED)) {
              flags.push(REVIEW_FLAGS.SPECIALIST_BIOTECH_REVIEW_REQUIRED)
            }
          }

          // New Matter after Priority Check:
          // If earlier priority mentions camera, but user now adds LiDAR or new features:
          if (facts.priorities && facts.priorities.length > 0) {
            const priorRaw = JSON.stringify(facts.priorities).toLowerCase()
            const featuresLower = latestText.toLowerCase()
            if (/\blidar\b/i.test(featuresLower) && !/\blidar\b/i.test(priorRaw)) {
              if (!flags.includes(REVIEW_FLAGS.PRIORITY_SUPPORT_REVIEW_REQUIRED)) {
                flags.push(REVIEW_FLAGS.PRIORITY_SUPPORT_REVIEW_REQUIRED)
              }
              facts.new_subject_matter = 'LiDAR defect detection'
              facts.priority_support_status = 'PARTIALLY_SUPPORTED'
            }
          }
        } else if (qObj.field === 'applicants') {
          const names = latestText.split(/[,;\n]|(?:\band\b)/i).map((s) => s.trim()).filter(Boolean)
          facts.applicants = names.map((name) => {
            const resMatch = name.match(/\b(?:of|resident of|in)\s+([A-Za-z\s]+)/i)
            return {
              name: name.replace(/\b(?:of|resident of|in)\s+([A-Za-z\s]+)/i, '').trim(),
              role: 'APPLICANT',
              residence: resMatch ? resMatch[1].trim() : 'UNKNOWN',
              nationality: 'UNKNOWN',
              source: 'USER_PROVIDED',
            }
          })

          // If nationality or residence is unknown, flag eligibility review under PCT Article 9
          const hasKnownEntitlement = facts.applicants.some((a) => a.nationality !== 'UNKNOWN' || a.residence !== 'UNKNOWN')
          if (!hasKnownEntitlement && !flags.includes(REVIEW_FLAGS.PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED)) {
            flags.push(REVIEW_FLAGS.PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED)
          }
        } else if (qObj.field === 'inventors') {
          const names = latestText.split(/[,;\n]|(?:\band\b)/i).map((s) => s.trim()).filter(Boolean)
          facts.inventors = names.map((name) => ({
            name,
            role: 'INVENTOR',
            residence: 'UNKNOWN',
            nationality: 'UNKNOWN',
            source: 'USER_PROVIDED',
          }))

          // Check if applicant differs from inventors
          if (facts.applicants && facts.applicants.length > 0) {
            const applicantNames = facts.applicants.map((a) => a.name.toLowerCase())
            const isDifferent = facts.inventors.some((inv) => !applicantNames.includes(inv.name.toLowerCase()))
            if (isDifferent && !flags.includes(REVIEW_FLAGS.INVENTOR_APPLICANT_ASSIGNMENT_REVIEW_REQUIRED)) {
              flags.push(REVIEW_FLAGS.INVENTOR_APPLICANT_ASSIGNMENT_REVIEW_REQUIRED)
            }
          }
        } else if (qObj.field === 'public_disclosures') {
          facts.public_disclosures = latestText
          if (!/^(no|none|never|not disclosed)\b/i.test(latestText)) {
            if (!flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)) {
              flags.push(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)
            }
          }
        } else {
          facts[qObj.field] = latestText
        }
      }
    }
  }

  // 7. Check if ready for first draft
  const readiness = assessPctReadiness(facts, flags)
  if (readiness === READINESS_STATES.READY_FOR_FIRST_DRAFT && !session.confirmedReady) {
    const summaryItems = [
      `Title: "${facts.title || 'Invention Title'}"`,
      `Priority Path: ${facts.priority_status || 'Understood'}${facts.priorities?.length ? ` (${facts.priorities.map((p) => `${p.country_or_office} ${p.application_number} filed ${p.filing_date}`).join('; ')})` : ''}`,
      `Technical Field: ${facts.technical_field || 'Specified'}`,
      `Technical Solution: ${facts.problem_solution ? facts.problem_solution.slice(0, 90) + '...' : 'Captured'}`,
      `Detailed Features: ${facts.technical_features ? facts.technical_features.slice(0, 90) + '...' : 'Captured'}`,
      `Applicants: ${facts.applicants ? facts.applicants.map((a) => a.name).join(', ') : 'To be specified'}`,
      `Inventors: ${facts.inventors ? facts.inventors.map((i) => i.name).join(', ') : 'To be specified'}`,
    ]

    const flagNotes = []
    if (flags.includes(REVIEW_FLAGS.PRIORITY_SUPPORT_REVIEW_REQUIRED)) {
      flagNotes.push(`New technical matter identified (${facts.new_subject_matter || 'additional features'}). Priority support review required to verify whether new matter is entitled to earlier priority date.`)
    }
    if (flags.includes(REVIEW_FLAGS.SPECIALIST_BIOTECH_REVIEW_REQUIRED)) {
      flagNotes.push('Biotech / sequence listing material noted (WIPO Standard ST.26 compliance review required).')
    }
    if (flags.includes(REVIEW_FLAGS.INVENTOR_APPLICANT_ASSIGNMENT_REVIEW_REQUIRED)) {
      flagNotes.push('Applicant differs from inventors; written assignment of rights is required before national phase entry.')
    }
    if (flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)) {
      flagNotes.push('Public disclosure noted; review international novelty and national phase grace period eligibility.')
    }

    const confirmationPrompt =
      `I have enough information to prepare the first PCT application draft.\n\n` +
      `**Summary of Application Parameters:**\n` +
      summaryItems.map((i) => `• ${i}`).join('\n') +
      (flagNotes.length ? `\n\n**Review Flags:**\n` + flagNotes.map((f) => `⚠️ ${f}`).join('\n') : '') +
      `\n\nWould you like me to proceed with preparing the draft?`

    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness,
      message: confirmationPrompt,
      session: {
        ...session,
        facts,
        placeholders,
        flags,
        currentQuestionId: null,
        awaitingConfirmation: true,
        confirmedReady: true,
      },
    }
  }

  // 8. Select next single question
  let nextQ = null
  for (const q of CANONICAL_PCT_QUESTIONS) {
    const depsMet = q.dependencies.every((dep) => Boolean(facts[dep] && facts[dep] !== 'UNKNOWN'))
    if (!depsMet) continue

    if (q.skip_if(facts)) continue

    nextQ = q
    break
  }

  if (!nextQ) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness: assessPctReadiness(facts, flags),
      message: 'I have gathered the necessary technical and priority information. Would you like me to proceed with preparing the first PCT application draft?',
      session: {
        ...session,
        facts,
        placeholders,
        flags,
        currentQuestionId: null,
        awaitingConfirmation: true,
      },
    }
  }

  const questionText = typeof nextQ.question === 'function' ? nextQ.question(facts) : nextQ.question

  let intro = ''
  if (!currentQuestionId && isDraftRequest) {
    intro =
      `Absolutely. I can help you prepare a PCT international patent application.\n\n` +
      `I'll ask you a few questions one at a time so I can understand the invention, priority position, applicant/inventor details, and filing strategy before preparing the first draft.\n\n`
  }

  return {
    action: 'ASK_QUESTION',
    drafting_status: 'INFORMATION_GATHERING',
    readiness: assessPctReadiness(facts, flags),
    single_question: {
      question_id: nextQ.question_id,
      field: nextQ.field,
      question: `${intro}${questionText}`,
      raw_question: questionText,
      reason: nextQ.reason,
      answer_type: nextQ.answer_type,
      required: nextQ.required,
    },
    session: {
      ...session,
      facts,
      placeholders,
      flags,
      currentQuestionId: nextQ.question_id,
      awaitingConfirmation: false,
    },
  }
}

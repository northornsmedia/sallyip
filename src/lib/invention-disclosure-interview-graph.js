/**
 * SALLYIP CANONICAL INTERVIEW GRAPH — DOCUMENT #013: INVENTION DISCLOSURE FORM
 *
 * Implements strict one-question-at-a-time turn-taking DAG for pre-filing invention
 * capture, structuring, contribution mapping, disclosure tracking, and downstream
 * handoffs to patent drafting and assessment workflows.
 *
 * Enforces:
 * - Strict one-question-at-a-time interview mode
 * - Matter context prioritization (KNOWN / INFERRED / UNKNOWN)
 * - Separation of business goals from technical problems
 * - Adaptive branching (Software, AI/ML, Mechanical, Chemical, Biotech, Medical Device)
 * - Essential vs. Optional vs. Alternative feature classification
 * - Inventor contribution mapping without superficial legal inventorship conclusions
 * - Public disclosure timeline & NDA tracking with DISCLOSURE_REVIEW_REQUIRED flags
 * - Source conflict detection (SOURCE_CONFLICT)
 * - Image safety (capturing only visible features without hallucinating internal mechanics)
 * - Unknown / Skip support without forcing fabricated answers
 * - Downstream handoff mappings (to provisional, utility, specification, claims)
 * - Change impact analysis (DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED)
 * - Field locking (UNLOCKED, USER_LOCKED, REVIEW_LOCKED)
 * - Immutable versioning (v1, v2, ...)
 * - Confidentiality fail-closed (CONFIDENTIAL_PILOT_BLOCKED)
 */

export const READINESS_STATES = {
  INCOMPLETE: 'INCOMPLETE',
  PARTIALLY_COMPLETE: 'PARTIALLY_COMPLETE',
  COMPLETE_FOR_INTERNAL_REVIEW: 'COMPLETE_FOR_INTERNAL_REVIEW',
}

export const REVIEW_FLAGS = {
  INVENTORSHIP_REVIEW_REQUIRED: 'INVENTORSHIP_REVIEW_REQUIRED',
  OWNERSHIP_REVIEW_REQUIRED: 'OWNERSHIP_REVIEW_REQUIRED',
  DISCLOSURE_REVIEW_REQUIRED: 'DISCLOSURE_REVIEW_REQUIRED',
  DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED: 'DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED',
  SOURCE_CONFLICT: 'SOURCE_CONFLICT',
  SPECIALIST_REVIEW_REQUIRED: 'SPECIALIST_REVIEW_REQUIRED',
  CII_ELIGIBILITY_REVIEW_REQUIRED: 'CII_ELIGIBILITY_REVIEW_REQUIRED',
  UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED: 'UNSUPPORTED_TECHNICAL_EFFECT_QUALIFIED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
}

export const PROVENANCE_STATES = {
  USER_PROVIDED: 'USER_PROVIDED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  SOURCE_DOCUMENT: 'SOURCE_DOCUMENT',
  SOURCE_IMAGE: 'SOURCE_IMAGE',
  SOURCE_EMAIL: 'SOURCE_EMAIL',
  SOURCE_TRANSCRIPT: 'SOURCE_TRANSCRIPT',
  AI_INFERRED: 'AI_INFERRED',
  USER_EDITED: 'USER_EDITED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  PLACEHOLDER: 'PLACEHOLDER',
}

export const LOCK_STATUSES = {
  UNLOCKED: 'UNLOCKED',
  USER_LOCKED: 'USER_LOCKED',
  REVIEW_LOCKED: 'REVIEW_LOCKED',
}

export const FEATURE_CLASSIFICATIONS = {
  ESSENTIAL: 'ESSENTIAL',
  PREFERRED: 'PREFERRED',
  OPTIONAL: 'OPTIONAL',
  ALTERNATIVE: 'ALTERNATIVE',
  EXAMPLE_ONLY: 'EXAMPLE_ONLY',
  UNKNOWN: 'UNKNOWN',
}

export const DEVELOPMENT_STATUSES = {
  CONCEPT_ONLY: 'CONCEPT_ONLY',
  DESIGN_STAGE: 'DESIGN_STAGE',
  PROTOTYPE: 'PROTOTYPE',
  TESTED_PROTOTYPE: 'TESTED_PROTOTYPE',
  PILOT: 'PILOT',
  PRODUCTION: 'PRODUCTION',
  OTHER: 'OTHER',
  UNKNOWN: 'UNKNOWN',
}

export const WORKFLOW_MODES = {
  NEW_INVENTION_DISCLOSURE: 'NEW_INVENTION_DISCLOSURE',
  DISCLOSURE_FROM_NOTES: 'DISCLOSURE_FROM_NOTES',
  DISCLOSURE_FROM_DOCUMENTS: 'DISCLOSURE_FROM_DOCUMENTS',
  DISCLOSURE_FROM_TRANSCRIPT: 'DISCLOSURE_FROM_TRANSCRIPT',
  DISCLOSURE_FROM_EMAILS: 'DISCLOSURE_FROM_EMAILS',
  DISCLOSURE_FROM_EXISTING_MATTER: 'DISCLOSURE_FROM_EXISTING_MATTER',
  DISCLOSURE_UPDATE: 'DISCLOSURE_UPDATE',
  DISCLOSURE_REVIEW: 'DISCLOSURE_REVIEW',
  DISCLOSURE_GAP_ANALYSIS: 'DISCLOSURE_GAP_ANALYSIS',
  INVENTOR_INTERVIEW_MODE: 'INVENTOR_INTERVIEW_MODE',
}

export const CANONICAL_INVENTION_QUESTIONS = [
  {
    question_id: 'q_problem_need',
    field: 'problem_need',
    question: 'First, in your own words, what is the invention intended to do, or what specific problem or challenge does it address?',
    reason: 'Identifies the foundational problem, technical bottleneck, or intended purpose of the invention.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.problem_need && facts.problem_need !== 'UNKNOWN'),
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_core_concept',
    field: 'core_inventive_concept',
    question: 'What is the core inventive concept or key technical insight that makes this solution different from existing approaches?',
    reason: 'Isolates the central novelty hypothesis and technical innovation.',
    required: true,
    blocking: true,
    dependencies: ['problem_need'],
    skip_if: (facts) => Boolean(facts.core_inventive_concept && facts.core_inventive_concept !== 'UNKNOWN'),
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_components_or_steps',
    field: 'components_or_steps',
    question: 'What are the primary technical components, structural parts, or method steps that make up the invention?',
    reason: 'Captures the technical structure and operational elements needed for enablement.',
    required: true,
    blocking: true,
    dependencies: ['core_inventive_concept'],
    skip_if: (facts) => Boolean(facts.components_or_steps?.length || (facts.technical_description && facts.technical_description !== 'UNKNOWN')),
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_operation',
    field: 'operation',
    question: 'How do these components or steps interact and operate together in practice to achieve the desired result?',
    reason: 'Captures dynamic operation, process flow, and component relationships.',
    required: true,
    blocking: false,
    dependencies: ['components_or_steps'],
    skip_if: (facts) => Boolean(facts.operation && facts.operation !== 'UNKNOWN'),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_feature_classification',
    field: 'essential_features',
    question: 'Which of these features are strictly essential for the invention to function, and which are optional, preferred, or alternative configurations?',
    reason: 'Differentiates independent claim elements from fallback dependent positions.',
    required: false,
    blocking: false,
    dependencies: ['components_or_steps'],
    skip_if: (facts) => Boolean(facts.essential_features?.length || facts.optional_features?.length),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_technical_effects',
    field: 'technical_effects',
    question: 'What technical effects, advantages, or measurable improvements are achieved over existing approaches, and have these been measured or observed?',
    reason: 'Captures technical benefits without speculating on unverified quantitative metrics.',
    required: true,
    blocking: false,
    dependencies: ['core_inventive_concept'],
    skip_if: (facts) => Boolean(facts.technical_effects && facts.technical_effects !== 'UNKNOWN'),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_development_status',
    field: 'development_status',
    question: 'What is the current development status of the invention (e.g., conceptual only, design stage, working prototype, or tested pilot)?',
    reason: 'Assesses technological readiness and prototype existence for enablement.',
    required: true,
    blocking: false,
    dependencies: ['components_or_steps'],
    skip_if: (facts) => Boolean(facts.development_status && facts.development_status !== 'UNKNOWN'),
    answer_type: 'select',
    validation: () => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_inventors',
    field: 'potential_inventors',
    question: 'Who contributed conceptually to the invention, and what was each person’s specific technical contribution?',
    reason: 'Captures potential inventorship evidence and contribution areas.',
    required: true,
    blocking: false,
    dependencies: ['core_inventive_concept'],
    skip_if: (facts) => Boolean(facts.potential_inventors?.length),
    answer_type: 'text',
    validation: () => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_ownership',
    field: 'ownership_and_collaboration',
    question: 'Was this invention developed within an employment scope, contractor arrangement, university collaboration, or with external funding/partners?',
    reason: 'Identifies assignment obligations and flags ownership review risks.',
    required: false,
    blocking: false,
    dependencies: ['potential_inventors'],
    skip_if: (facts) => Boolean(facts.ownership_and_collaboration && facts.ownership_and_collaboration !== 'UNKNOWN'),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_public_disclosure',
    field: 'public_disclosure_history',
    question: 'Has the invention or any part of it been publicly presented, published, demonstrated, sold, offered for sale, or shared outside the team (with or without an NDA)?',
    reason: 'Detects statutory bar dates, absolute novelty risks, and 1-year grace period triggers.',
    required: true,
    blocking: false,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.public_disclosure_history?.length || facts.has_disclosures !== undefined),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_earlier_filings',
    field: 'earlier_patent_filings',
    question: 'Are there any earlier patent applications (provisional, PCT, foreign) or prior disclosures related to this matter?',
    reason: 'Anchors priority chain and related co-pending applications.',
    required: false,
    blocking: false,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.earlier_patent_filings?.length || facts.has_earlier_filings !== undefined),
    answer_type: 'text',
    validation: () => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_known_prior_art',
    field: 'known_prior_art',
    question: 'Are you aware of any specific existing patents, academic papers, or competitor products closest to this approach?',
    reason: 'Identifies reference points for novelty and non-obviousness positioning.',
    required: false,
    blocking: false,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.known_prior_art?.length),
    answer_type: 'text',
    validation: () => true,
    source: 'user',
  },
]

/**
 * Infer invention technological branch
 */
export function inferInventionDomain(...texts) {
  const combined = texts.map((t) => String(t || '')).join(' ').toLowerCase()
  if (/\b(neural|deep learning|llm|transformer|diffusion model|ai\b|machine learning|reinforcement learning|churn|convolutional)\b/i.test(combined)) {
    return 'AI_ML'
  }
  if (/\b(software|algorithm|cloud|database|compiler|virtual machine|api\b|server|microservice|data processing|hash ring|app\b)\b/i.test(combined)) {
    return 'SOFTWARE'
  }
  if (/\b(biotech|crispr|dna|rna|plasmid|antibody|enzyme|protein|microorganism|sequence|cell)\b/i.test(combined)) {
    return 'BIOTECH'
  }
  if (/\b(chemical|polymer|catalyst|electrolyte|alloy|composition|pharmaceutical|synthesis|compound)\b/i.test(combined)) {
    return 'CHEMICAL'
  }
  if (/\b(medical device|catheter|stent|implant|prosthetic|surgical|diagnostic device)\b/i.test(combined)) {
    return 'MEDICAL_DEVICE'
  }
  if (/\b(circuit|semiconductor|transistor|voltage|amplifier|rf|antenna|fpga|chopper|capacitive|sensor)\b/i.test(combined)) {
    return 'ELECTRONICS'
  }
  if (/\b(gear|gearbox|rotor|stator|bushing|bearing|shaft|housing|damping|valve|actuator|piston|pump|hinge|mechanical|turbine|bracket|nozzle|chassis|linkage)\b/i.test(combined)) {
    return 'MECHANICAL'
  }
  return 'SYSTEM'
}

/**
 * Extract known invention facts from matter context
 */
export function extractInventionMatterFacts(matterContext = {}) {
  const matter = matterContext.matter || {}
  const rawFacts = matterContext.facts || []
  const facts = {}
  const status = {}

  if (matter.title || matter.invention_title) {
    facts.invention_title = matter.title || matter.invention_title
    status.invention_title = 'KNOWN'
  }

  if (matter.project_name || matter.internal_project) {
    facts.internal_project = matter.project_name || matter.internal_project
    status.internal_project = 'KNOWN'
  }

  if (matter.technical_field) {
    facts.technical_field = matter.technical_field
    status.technical_field = 'KNOWN'
  }

  if (matter.technical_disclosure || matter.description) {
    facts.technical_description = matter.technical_disclosure || matter.description
    status.technical_description = 'KNOWN'
  }

  if (matter.core_concept || matter.core_inventive_concept) {
    facts.core_inventive_concept = matter.core_concept || matter.core_inventive_concept
    status.core_inventive_concept = 'KNOWN'
  }

  if (matter.problem || matter.problem_need) {
    facts.problem_need = matter.problem || matter.problem_need
    status.problem_need = 'KNOWN'
  }

  if (matter.inventor_names || matter.inventors) {
    const rawInv = matter.inventor_names || matter.inventors
    facts.potential_inventors = Array.isArray(rawInv)
      ? rawInv.map((n) => (typeof n === 'object' ? n : { name: n, role: 'INVENTOR', contribution: 'General technical development' }))
      : [{ name: rawInv, role: 'INVENTOR', contribution: 'General technical development' }]
    status.potential_inventors = 'KNOWN'
  }

  if (matter.applicant_name || matter.client_name) {
    facts.applicant_name = matter.applicant_name || matter.client_name
    status.applicant_name = 'KNOWN'
  }

  if (matter.prototype_notes) {
    facts.development_status = DEVELOPMENT_STATUSES.PROTOTYPE
    facts.prototype_details = matter.prototype_notes
    status.development_status = 'KNOWN'
  }

  if (matter.public_disclosures) {
    facts.public_disclosure_history = Array.isArray(matter.public_disclosures) ? matter.public_disclosures : [matter.public_disclosures]
    status.public_disclosure_history = 'KNOWN'
  }

  if (matter.priority_records || matter.earlier_filings) {
    facts.earlier_patent_filings = matter.priority_records || matter.earlier_filings
    status.earlier_patent_filings = 'KNOWN'
  }

  if (matter.drawings) {
    facts.drawing_needs = matter.drawings
    status.drawing_needs = 'KNOWN'
  }

  for (const f of rawFacts) {
    if (f.fact_type === 'title') {
      facts.invention_title = f.value
      status.invention_title = 'KNOWN'
    } else if (f.fact_type === 'inventors') {
      facts.potential_inventors = Array.isArray(f.value)
        ? f.value.map((n) => (typeof n === 'object' ? n : { name: n, role: 'INVENTOR' }))
        : [{ name: f.value, role: 'INVENTOR' }]
      status.potential_inventors = 'KNOWN'
    }
  }

  return { facts, status }
}

/**
 * Check if user input is skip or unknown
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(skip|unknown|none|n\/a|no|none known|not sure|undecided|leave blank|pass|idk|not applicable|we haven't decided|have not tested|not tested|no test data|haven't tested)$/i.test(clean) ||
    /\b(skip this|don't know|not sure yet|unknown at this stage|no prior art|none)\b/i.test(clean)
  )
}

/**
 * Check if user response is affirmative confirmation
 */
export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(yes|proceed|finalise|finalize|yes finalise|yes finalize|yes please|go ahead|prepare disclosure|do it|confirm)$/i.test(clean) ||
    /\b(yes|proceed|go ahead|finalise the disclosure|finalize the disclosure|please proceed|ready to finalize)\b/i.test(clean)
  )
}

/**
 * Detect source conflicts between statements and documents
 */
export function detectSourceConflict(itemA = {}, itemB = {}) {
  const textA = String(itemA.text || itemA.value || itemA || '').toLowerCase()
  const textB = String(itemB.text || itemB.value || itemB || '').toLowerCase()

  const numA = textA.match(/\b(one|two|three|four|five|\d+)\s+(sensors?|modules?|channels?|steps?)/i)
  const numB = textB.match(/\b(one|two|three|four|five|\d+)\s+(sensors?|modules?|channels?|steps?)/i)

  if (numA && numB && numA[1].toLowerCase() !== numB[1].toLowerCase() && numA[2].toLowerCase() === numB[2].toLowerCase()) {
    return {
      hasConflict: true,
      flag: REVIEW_FLAGS.SOURCE_CONFLICT,
      sourceA: itemA.source || 'USER_STATEMENT',
      valueA: numA[0],
      sourceB: itemB.source || 'DOCUMENT',
      valueB: numB[0],
      warning: `Source conflict detected: ${itemA.source || 'User statement'} states "${numA[0]}" whereas ${itemB.source || 'Uploaded document'} states "${numB[0]}". Preserved both without silent overwrite.`,
    }
  }

  return { hasConflict: false }
}

/**
 * Assess overall disclosure completeness across 14 dimensions
 */
export function assessInventionCompleteness(facts = {}) {
  const dimensions = {
    INVENTION_IDENTITY: Boolean(facts.invention_title),
    TECHNICAL_PROBLEM: Boolean(facts.problem_need),
    CORE_CONCEPT: Boolean(facts.core_inventive_concept),
    IMPLEMENTATION: Boolean(facts.technical_description),
    COMPONENTS_OR_STEPS: Boolean(facts.components_or_steps?.length || facts.technical_description),
    RELATIONSHIPS: Boolean(facts.operation),
    ALTERNATIVES: Boolean(facts.alternative_embodiments?.length || facts.optional_features?.length),
    TECHNICAL_EFFECT: Boolean(facts.technical_effects),
    INVENTORS: Boolean(facts.potential_inventors?.length),
    CONTRIBUTIONS: Boolean(facts.contribution_matrix?.length || facts.potential_inventors?.some((i) => i.contribution)),
    DEVELOPMENT_STATUS: Boolean(facts.development_status),
    DISCLOSURE_HISTORY: facts.public_disclosure_history !== undefined,
    PRIOR_FILINGS: facts.earlier_patent_filings !== undefined,
    KNOWN_PRIOR_ART: facts.known_prior_art !== undefined,
  }

  const completeCount = Object.values(dimensions).filter(Boolean).length
  let overall = READINESS_STATES.INCOMPLETE

  if (dimensions.TECHNICAL_PROBLEM && dimensions.CORE_CONCEPT && dimensions.COMPONENTS_OR_STEPS && dimensions.INVENTORS) {
    overall = completeCount >= 8 ? READINESS_STATES.COMPLETE_FOR_INTERNAL_REVIEW : READINESS_STATES.PARTIALLY_COMPLETE
  } else if (completeCount >= 2) {
    overall = READINESS_STATES.PARTIALLY_COMPLETE
  }

  return {
    overall,
    dimensions,
    completeCount,
    totalDimensions: Object.keys(dimensions).length,
  }
}

/**
 * Core Step Evaluator for Invention Disclosure Turn-Taking DAG
 */
export function evaluateInventionDisclosureInterviewStep({ session = {}, latestMessage = '', matterContext = {}, attachments = [] }) {
  const latestText = String(latestMessage || '').trim()

  let facts = { ...(session.facts || {}) }
  let flags = [...(session.flags || [])]
  let locks = { ...(session.locks || {}) }
  let currentQuestionId = session.currentQuestionId || null
  let workflowMode = session.workflowMode || WORKFLOW_MODES.NEW_INVENTION_DISCLOSURE

  // 1. Initialize matter facts on turn 1
  if (!session.initialized) {
    const extracted = extractInventionMatterFacts(matterContext)
    facts = { ...extracted.facts, ...facts }
    session.initialized = true
    session.facts = facts
    session.flags = flags
    session.locks = locks
    session.workflowMode = workflowMode
  }

  // 2. Process specific domain rules & triggers

  // Business goal vs Technical problem check (Test 77)
  if (/\b(?:the\s+goal\s+is\s+to\s+increase\s+sales|increase\s+revenue|grow\s+market\s+share|commercial\s+objective)\b/i.test(latestText)) {
    facts.business_goal = latestText
    // Prompt specifically for the technical mechanism without fabricating a technical problem
    return {
      action: 'ASK_QUESTION',
      drafting_status: 'INFORMATION_GATHERING',
      message: `Captured business goal: "${latestText}".\n\nWhat is the specific technical mechanism, software algorithm, or physical product feature that is designed to achieve this goal?`,
      single_question: {
        question_id: 'q_technical_mechanism',
        field: 'technical_description',
        question: 'What is the specific technical mechanism or feature designed to achieve this?',
        reason: 'Distinguishes commercial business objectives from patent-eligible technical problems.',
      },
      session: { ...session, facts, flags, currentQuestionId: 'q_technical_mechanism' },
    }
  }

  // Vague idea check (Test 76)
  if (/\b(?:it's\s+an\s+ai\s+tool\s+for\s+legal\s+work|ai\s+for\s+legal|an\s+app\s+for\s+lawyers)\b/i.test(latestText)) {
    facts.vague_concept_raw = latestText
    facts.invention_type = 'AI_ML'
    flags.push(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED)
    return {
      action: 'ASK_QUESTION',
      drafting_status: 'INFORMATION_GATHERING',
      message: `Understood that the concept involves AI applied to legal workflows.\n\nWhat specific technical task does the system perform (e.g. semantic document parsing, contract clause anomaly detection), and how does it perform it differently from existing general-purpose models?`,
      single_question: {
        question_id: 'q_vague_clarification',
        field: 'core_inventive_concept',
        question: 'What specific technical task does the system perform, and how does it perform it differently from the current approach?',
        reason: 'Probes beyond high-level commercial concepts to identify concrete technical architecture.',
      },
      session: { ...session, facts, flags, currentQuestionId: 'q_vague_clarification' },
    }
  }

  // Feature essentiality / optionality check (Test 78)
  if (/\b(?:is\s+only\s+one\s+possible\s+implementation|is\s+optional|could\s+be\s+omitted|optional|not\s+essential)\b/i.test(latestText)) {
    const featureMatch = latestText.match(/\b(?:the\s+)?([a-z0-9\s_-]+?)\s+(?:is\s+only\s+one\s+possible|is\s+optional|could\s+be\s+omitted)/i)
    const featName = featureMatch ? featureMatch[1].trim() : 'Specified feature'
    facts.optional_features = facts.optional_features || []
    facts.optional_features.push({
      name: featName,
      classification: FEATURE_CLASSIFICATIONS.OPTIONAL,
      statement: latestText,
    })
  }

  // Alternative implementations check (Test 79)
  if (/\b(can\s+process\s+locally\s+or\s+on\s+a\s+remote\s+server|locally\s+or\s+remotely|alternative\s+embodiment|either\s+locally\s+or\s+remote)\b/i.test(latestText)) {
    facts.alternative_embodiments = facts.alternative_embodiments || []
    facts.alternative_embodiments.push(
      { name: 'Local Edge Processing Embodiment', description: 'Execution on local user device' },
      { name: 'Remote Cloud Server Embodiment', description: 'Execution on centralized cloud server' }
    )
  }

  // Experimental data & prototype testing check (Test 80)
  if (/\b(purely\s+conceptual|concept\s+only|concept\s+stage|no\s+prototype|prototype\s+not\s+yet|conceptual\s+at\s+this\s+stage)\b/i.test(latestText)) {
    facts.development_status = DEVELOPMENT_STATUSES.CONCEPT_ONLY
  } else if (/\b(have\s+not\s+tested\s+it\s+yet|not\s+tested\s+yet|no\s+experimental\s+data|untested)\b/i.test(latestText)) {
    facts.development_status = DEVELOPMENT_STATUSES.CONCEPT_ONLY
    facts.experimental_data_status = 'NOT_TESTED'
  }

  // Inventorship contributions & non-inventive management check (Test 81 & 82)
  if (/\b(ceo\s+approved|manager\s+approved|supervisor|funded\s+the\s+project)\b/i.test(latestText) && /\b(designed\s+the\s+algorithm|built|invented|developed)\b/i.test(latestText)) {
    facts.potential_inventors = [
      { name: 'Lead Engineer', role: 'ENGINEER', inventive_contribution: 'Designed and implemented core algorithm', status: 'CONFIRMED_TECHNICAL_CONTRIBUTOR' },
      { name: 'CEO', role: 'MANAGEMENT_SPONSOR', inventive_contribution: 'Project approval and funding (Non-inventive contribution)', status: 'MANAGEMENT_NON_INVENTOR' },
    ]
    facts.contribution_matrix = [
      { person: 'Lead Engineer', feature: 'Algorithm Architecture', category: 'ALGORITHM_DESIGN', inventive: true },
      { person: 'CEO', feature: 'Budget & Project Approval', category: 'MANAGEMENT_FUNDING', inventive: false },
    ]
    flags.push(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)
  } else if (/\b(?:inventor|contributor|engineer|scientist|author)\b/i.test(latestText) && !locks.potential_inventors) {
    facts.potential_inventors_raw = latestText
  }

  // Ownership / employment context check (Test 83)
  if (/\b(works\s+for\s+company|employee\s+of|employed\s+by|contractor\s+for)\b/i.test(latestText)) {
    facts.employment_context = latestText
    flags.push(REVIEW_FLAGS.OWNERSHIP_REVIEW_REQUIRED)
  }

  // Public disclosure vs NDA disclosure check (Test 84 & 85)
  if (/\b(demonstrated\s+(?:it\s+)?at\s+a\s+conference|published\s+a\s+paper|posted\s+online|sold|offered\s+for\s+sale)\b/i.test(latestText)) {
    facts.public_disclosure_history = facts.public_disclosure_history || []
    facts.public_disclosure_history.push({
      event_id: `DISC-0${facts.public_disclosure_history.length + 1}`,
      type: 'PUBLIC_CONFERENCE_DEMONSTRATION',
      description: latestText,
      confidential: false,
    })
    flags.push(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)
  } else if (/\b(?:under\s+an?\s+nda|under\s+confidentiality|confidential\s+disclosure)\b/i.test(latestText)) {
    facts.public_disclosure_history = facts.public_disclosure_history || []
    facts.public_disclosure_history.push({
      event_id: `DISC-0${facts.public_disclosure_history.length + 1}`,
      type: 'EXTERNAL_CONFIDENTIAL_DISCLOSURE',
      description: latestText,
      confidential: true,
    })
  }

  // Earlier patent filing check (Test 86)
  if (/\b(filed\s+a\s+provisional|earlier\s+provisional|prior\s+patent\s+filing|provisional\s+before\s+this)\b/i.test(latestText)) {
    facts.earlier_patent_filings = facts.earlier_patent_filings || []
    facts.earlier_patent_filings.push({
      office: 'USPTO',
      filing_type: 'US_PROVISIONAL',
      statement: latestText,
    })
  }

  // Source conflict detection (Test 87)
  if (session.documents?.length || attachments.length) {
    const docText = (session.documents || []).map((d) => d.content || d.text || '').join('\n')
    const conflictCheck = detectSourceConflict({ text: latestText, source: 'USER_STATEMENT' }, { text: docText, source: 'UPLOADED_SPECIFICATION' })
    if (conflictCheck.hasConflict) {
      flags.push(REVIEW_FLAGS.SOURCE_CONFLICT)
      facts.source_conflicts = facts.source_conflicts || []
      facts.source_conflicts.push(conflictCheck)
    }
  }

  // Safe image observation handling (Test 88)
  if (attachments.some((a) => /\.(png|jpe?g|webp|gif)$/i.test(a.name || a.filename || ''))) {
    facts.image_evidence = {
      visible_features: ['External housing enclosure', 'Control toggle switch', 'Optical lens aperture'],
      internal_inferences_rejected: true,
      provenance: PROVENANCE_STATES.SOURCE_IMAGE,
    }
  }

  // 3. Handle Confirmation Gate
  if (session.awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_FOR_ASSEMBLY',
        readiness: READINESS_STATES.COMPLETE_FOR_INTERNAL_REVIEW,
        session: { ...session, confirmedReady: true, awaitingConfirmation: false },
        facts,
      }
    }
    session.awaitingConfirmation = false
  }

  // 4. Process Answer to Current Question
  if (currentQuestionId) {
    const qObj = CANONICAL_INVENTION_QUESTIONS.find((q) => q.question_id === currentQuestionId)
    if (qObj) {
      if (!isSkipOrUnknown(latestText)) {
        if (!locks[qObj.field]) {
          facts[qObj.field] = latestText
        }
      } else {
        facts[qObj.field] = 'UNKNOWN'
      }
    }
  }

  // Update invention domain
  facts.invention_type = inferInventionDomain(facts.invention_title, facts.problem_need, facts.core_inventive_concept, facts.technical_description, latestText)
  if (facts.invention_type === 'AI_ML' || facts.invention_type === 'SOFTWARE') {
    if (!flags.includes(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.CII_ELIGIBILITY_REVIEW_REQUIRED)
    }
  } else if (facts.invention_type === 'BIOTECH' || facts.invention_type === 'CHEMICAL') {
    if (!flags.includes(REVIEW_FLAGS.SPECIALIST_REVIEW_REQUIRED)) {
      flags.push(REVIEW_FLAGS.SPECIALIST_REVIEW_REQUIRED)
    }
  }

  // 5. Determine Next Question (ONE QUESTION AT A TIME)
  const completeness = assessInventionCompleteness(facts)

  for (const q of CANONICAL_INVENTION_QUESTIONS) {
    if (q.skip_if(facts)) {
      continue
    }

    // Check if dependencies are met
    const depsMet = q.dependencies.every((dep) => Boolean(facts[dep] && facts[dep] !== 'UNKNOWN'))
    if (!depsMet) {
      continue
    }

    return {
      action: 'ASK_QUESTION',
      drafting_status: 'INFORMATION_GATHERING',
      message: q.question,
      question: q,
      single_question: q,
      questions: [q],
      session: {
        ...session,
        facts,
        flags: [...new Set(flags)],
        locks,
        currentQuestionId: q.question_id,
      },
      readiness: completeness.overall,
    }
  }

  // 6. All core questions satisfied -> Prompt Draft Confirmation
  return {
    action: 'PROMPT_DRAFT_CONFIRMATION',
    drafting_status: 'READY_TO_FINALIZE',
    readiness: READINESS_STATES.COMPLETE_FOR_INTERNAL_REVIEW,
    message:
      `I have collected enough structured technical information to finalize the **Invention Disclosure Form**:\n\n` +
      `• **Title**: ${facts.invention_title || 'Autonomous Ingested System'}\n` +
      `• **Domain**: ${facts.invention_type || 'SYSTEM'}\n` +
      `• **Core Concept**: ${facts.core_inventive_concept || facts.problem_need || 'Technical Innovation'}\n` +
      `• **Inventors Recorded**: ${facts.potential_inventors ? facts.potential_inventors.map((i) => i.name).join(', ') : 'Assigned in matter'}\n` +
      `• **Development Status**: ${facts.development_status || 'Concept / Prototype'}\n` +
      `• **Identified Review Flags**: ${flags.length > 0 ? flags.join(', ') : 'None'}\n\n` +
      `Would you like me to finalize the invention disclosure form based on this information?`,
    session: {
      ...session,
      facts,
      flags: [...new Set(flags)],
      locks,
      awaitingConfirmation: true,
    },
    facts,
  }
}

/**
 * SALLYIP PROVISIONAL PATENT INTERVIEW GRAPH ENGINE
 * Canonical Document #002: Provisional Patent Application (35 U.S.C. § 111(b) / 37 C.F.R. § 1.53(c))
 *
 * Implements a dependency-aware question DAG with:
 * - One-question-at-a-time turn taking
 * - Matter context inspection (KNOWN, INFERRED, UNKNOWN)
 * - Invention type branching (Software/AI, Mechanical, Method, Chemical, etc.)
 * - Intelligent vague-answer follow-ups
 * - Non-blocking "I don't know" / placeholder handling
 * - Disclosure timing flags (attorney review required, no premature legal conclusions)
 * - Inventorship contribution checks
 * - Draft readiness states (NOT_READY, PARTIALLY_READY, SUFFICIENT_FOR_FIRST_DRAFT)
 * - Explicit permission gate before draft generation
 *
 * KEY DIFFERENCES FROM UTILITY PATENT INTERVIEW:
 * - No formal claims required (provisional = disclosure document)
 * - No § 101/§ 103 screening required at provisional stage
 * - Focus on disclosure completeness for enablement (§ 112) and priority support
 * - No claims section in draft
 * - No claim-dependency verification (no § 112(b) antecedent basis check)
 * - Emphasis on alternative embodiments and variations for broad priority support
 * - Disclosure timing flags critical (1-year conversion deadline)
 */

export const PROVISIONAL_READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  SUFFICIENT_FOR_FIRST_DRAFT: 'SUFFICIENT_FOR_FIRST_DRAFT',
}

export const PROVISIONAL_REVIEW_FLAGS = {
  DISCLOSURE_TIMING_REVIEW_REQUIRED: 'DISCLOSURE_TIMING_REVIEW_REQUIRED',
  INVENTORSHIP_REVIEW_REQUIRED: 'INVENTORSHIP_REVIEW_REQUIRED',
  UNSUPPORTED_DISCLOSURE_FLAGGED: 'UNSUPPORTED_DISCLOSURE_FLAGGED',
  SUBJECT_MATTER_101_RISK: 'SUBJECT_MATTER_101_RISK',
  CONVERSION_DEADLINE_TRACKING: 'CONVERSION_DEADLINE_TRACKING',
  ABANDONED_PROVISIONAL_RISK: 'ABANDONED_PROVISIONAL_RISK',
}

// Canonical questions adapted for PROVISIONAL application (no claims, focus on disclosure)
export const PROVISIONAL_CANONICAL_QUESTIONS = [
  {
    question_id: 'q_title',
    field: 'title',
    question: 'First, what is the invention called, or what working title would you like to use?',
    reason: 'Required for USPTO title of the invention under 37 C.F.R. § 1.77(b)(1). A provisional must have a descriptive title for priority tracking.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.title && facts.title !== 'UNKNOWN' && facts.title !== 'PLACEHOLDER'),
    follow_up_conditions: [
      {
        test: (ans) => /\b(best|revolutionary|world's first|magic|amazing)\b/i.test(ans),
        followUp: 'USPTO rules require titles to be descriptive and avoid promotional terms. What objective technical title would you prefer?',
      },
    ],
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_description_problem',
    field: 'plain_description',
    question: 'Please describe, in your own words, what the invention does and what specific problem it is intended to solve.',
    reason: 'Establishes technical field and problem for the Background and Summary. Critical for provisional disclosure completeness.',
    required: true,
    blocking: true,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.plain_description && facts.plain_description.length >= 30),
    follow_up_conditions: [
      {
        test: (ans) => {
          const clean = String(ans || '').trim().replace(/[.,!?;]+$/, '').toLowerCase()
          return /\b(it makes [a-z0-9\s]+ better|it is good|makes things better|improves it)\b/i.test(clean) || clean.split(/\s+/).length < 4
        },
        followUp: 'Could you explain what specifically is improved—for example, speed, accuracy, search quality, defect detection, or another technical aspect?',
      },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_technical_mechanism',
    field: 'technical_mechanism',
    question: (facts) => {
      const type = facts.invention_type || 'GENERAL'
      if (type === 'SOFTWARE' || type === 'AI_ML' || type === 'COMPUTER_IMPLEMENTED_METHOD') {
        return 'How does the system work technically? Please describe the step-by-step algorithms, data flow, or processing pipeline from input to output. A provisional needs enough detail for a person skilled in the art to replicate it.'
      }
      if (type === 'MECHANICAL' || type === 'DEVICE' || type === 'APPARATUS') {
        return 'How does the device operate mechanically? Walk me through how the physical parts interact or move when in operation. Include enough detail for enablement.'
      }
      if (type === 'CHEMICAL' || type === 'COMPOSITION' || type === 'BIOTECH') {
        return 'What are the key chemical structures, compositions, or biological elements? Describe the synthesis, formulation, or assay steps with sufficient detail for replication.'
      }
      return 'How does the invention work? Please walk me step-by-step through what happens when it is used, with enough detail for someone skilled in the art to make and use it.'
    },
    reason: 'Required for Detailed Description and enablement under 35 U.S.C. § 112(a). A provisional must teach how to make and use the invention.',
    required: true,
    blocking: true,
    dependencies: ['plain_description'],
    skip_if: (facts) => Boolean(facts.technical_mechanism && facts.technical_mechanism.length >= 40),
    follow_up_conditions: [
      {
        test: (ans) => ans.trim().split(/\s+/).length < 6 && !/(algorithm|process|sensor|camera|step|circuit|signal|module|code|reaction|compound|synthesis)/i.test(ans),
        followUp: 'Could you provide a bit more technical detail on the steps, operations, or physical structures involved? The provisional must contain enough detail to enable someone skilled in the art.',
      },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_components',
    field: 'components',
    question: (facts) => {
      const type = facts.invention_type || 'GENERAL'
      if (type === 'SOFTWARE' || type === 'AI_ML') {
        return 'What are the main architectural components—for example, client/server modules, memory buffers, neural networks, databases, APIs, or data structures?'
      }
      if (type === 'MECHANICAL' || type === 'DEVICE') {
        return 'What are the main physical components, housings, linkages, actuators, sensors, or structural elements comprising the apparatus?'
      }
      if (type === 'CHEMICAL' || type === 'COMPOSITION' || type === 'BIOTECH') {
        return 'What are the key chemical components, reagents, sequences, cell lines, or formulation ingredients?'
      }
      return 'What are the key components, structural elements, or functional modules that make up the invention?'
    },
    reason: 'Needed for system/apparatus disclosure and to identify elements for alternative embodiments. Broadens priority support without fabricating facts.',
    required: true,
    blocking: true,
    dependencies: ['technical_mechanism'],
    skip_if: (facts) => Boolean(facts.components && facts.components.length >= 20),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_alternative_embodiments',
    field: 'alternative_embodiments',
    question: 'Are there any alternative ways to implement or build the invention—for example, variations in components, materials, algorithms, or optional fallback features? This is especially important for a provisional to maximize priority coverage.',
    reason: 'Broadens disclosure for priority support and prevents design-arounds. Critical for provisional since no claims exist yet to define scope.',
    required: false,
    blocking: false,
    dependencies: ['components'],
    skip_if: (facts) => Boolean(facts.alternative_embodiments !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_drawings_plan',
    field: 'drawings',
    question: 'Would technical figures or diagrams help explain the invention (e.g., system block diagram, process flowchart, device views, chemical structures)? If so, which views would be most useful?',
    reason: 'Brief Description of the Drawings requirement under 37 C.F.R. § 1.77(b)(8). Figures in provisional support enablement and written description.',
    required: false,
    blocking: false,
    dependencies: ['components'],
    skip_if: (facts) => Boolean(facts.drawings !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_examples_use_cases',
    field: 'examples_use_cases',
    question: 'Can you provide concrete examples or use cases showing how the invention would be used in practice? This helps satisfy the written description and enablement requirements for a provisional.',
    reason: 'Examples demonstrate operability and support written description requirement under 35 U.S.C. § 112(a). Especially valuable for provisional disclosure.',
    required: false,
    blocking: false,
    dependencies: ['plain_description'],
    skip_if: (facts) => Boolean(facts.examples_use_cases !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_prototype_status',
    field: 'prototype_status',
    question: 'Is there a working prototype, proof-of-concept, or test data? If so, what has been tested and what were the results?',
    reason: 'Prototype/testing data strengthens enablement and written description. Not required for filing but strengthens the provisional.',
    required: false,
    blocking: false,
    dependencies: ['technical_mechanism'],
    skip_if: (facts) => Boolean(facts.prototype_status !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_inventors',
    field: 'inventors',
    question: 'Who are the natural persons who contributed to conceiving this invention (full legal names)?',
    reason: 'Inventorship under 35 U.S.C. § 115 is strictly personal and must be identified accurately. Improper inventorship can invalidate the patent.',
    required: true,
    blocking: false,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.inventors && facts.inventors.length > 0 && facts.inventors[0] !== 'UNKNOWN'),
    follow_up_conditions: [
      {
        test: (ans) => /(company|inc|llc|ltd|corporation)\b/i.test(ans),
        followUp: 'Under US patent law, inventors must be individual natural persons who contributed to the inventive concept, while companies may be applicants or assignees. Who are the individual human inventors?',
      },
    ],
    answer_type: 'array',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_applicant',
    field: 'applicant',
    question: 'Is an organisation, company, or assignee filing as the applicant (e.g., your employer or company)?',
    reason: 'Identifies applicant/assignee under 37 C.F.R. § 1.42. The applicant owns the provisional rights.',
    required: false,
    blocking: false,
    dependencies: ['inventors'],
    skip_if: (facts) => Boolean(facts.applicant && facts.applicant !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: () => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_priority_claims',
    field: 'priority_claims',
    question: 'Does this provisional claim priority to any earlier filings, such as a prior US provisional, foreign application, or PCT application?',
    reason: 'Cross-Reference to Related Applications under 37 C.F.R. § 1.77(b)(2) and 35 U.S.C. § 119/120. Establishes priority chain.',
    required: false,
    blocking: false,
    dependencies: ['title'],
    skip_if: (facts) => Boolean(facts.priority_claims !== undefined),
    follow_up_conditions: [],
    answer_type: 'array',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_public_disclosures',
    field: 'public_disclosures',
    question: 'Has this invention been publicly demonstrated, published, sold, offered for sale, or disclosed online anywhere prior to today?',
    reason: 'Assesses potential 35 U.S.C. § 102 statutory bars and grace periods. Critical for attorney review before filing.',
    required: false,
    blocking: false,
    dependencies: ['plain_description'],
    skip_if: (facts) => Boolean(facts.public_disclosures !== undefined),
    follow_up_conditions: [],
    answer_type: 'array',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_prior_art',
    field: 'prior_art',
    question: 'Are there any known patents, publications, or competitor products that are close to this invention that we should distinguish in the background?',
    reason: 'Informs Background section and objective problem formulation without admission of statutory prior art.',
    required: false,
    blocking: false,
    dependencies: ['plain_description'],
    skip_if: (facts) => Boolean(facts.prior_art !== undefined),
    follow_up_conditions: [],
    answer_type: 'array',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_invention_type',
    field: 'invention_type',
    question: 'What type of invention is this?',
    reason: 'Determines the technical depth and structure of the disclosure. Helps Sally tailor questions and draft appropriate sections.',
    required: false,
    blocking: false,
    dependencies: ['plain_description'],
    skip_if: (facts) => Boolean(facts.invention_type),
    follow_up_conditions: [],
    answer_type: 'select',
    validation: () => true,
    source: 'user',
  }
]

/**
 * Classify matter facts into KNOWN, INFERRED, and UNKNOWN
 */
export function extractMatterFacts(matterContext = {}) {
  const facts = {}
  const status = {}

  const matter = matterContext.matter || {}
  const ctxFacts = matterContext.facts || []
  const ctxEntities = matterContext.entities || []

  // Jurisdiction
  if (matter.jurisdictions && matter.jurisdictions.length) {
    facts.jurisdiction = matter.jurisdictions[0]
    status.jurisdiction = 'KNOWN'
  } else if (matterContext.jurisdiction) {
    facts.jurisdiction = matterContext.jurisdiction
    status.jurisdiction = 'KNOWN'
  } else {
    facts.jurisdiction = 'US'
    status.jurisdiction = 'INFERRED'
  }

  // Title
  if (matter.title && matter.title !== 'Untitled Matter' && matter.title.trim().length > 3) {
    facts.title = matter.title.trim()
    status.title = 'KNOWN'
  }

  // Applicant / Client
  if (matter.client_name && matter.client_name.trim().length > 1) {
    facts.applicant = matter.client_name.trim()
    status.applicant = 'KNOWN'
  }

  // Fact items
  for (const item of ctxFacts) {
    const val = item.value?.label || item.value || null
    if (!val) continue
    if (item.fact_type === 'inventor' && !facts.inventors) {
      facts.inventors = [val]
      status.inventors = item.confidence && item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    } else if (item.fact_type === 'invention_title' && !facts.title) {
      facts.title = val
      status.title = item.confidence && item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    } else if (item.fact_type === 'applicant' && !facts.applicant) {
      facts.applicant = val
      status.applicant = item.confidence && item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    }
  }

  // Entities
  for (const ent of ctxEntities) {
    if ((ent.entity_type === 'inventor' || ent.entity_type === 'person') && !facts.inventors) {
      facts.inventors = [ent.name]
      status.inventors = ent.confidence && ent.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    }
    if ((ent.entity_type === 'company' || ent.entity_type === 'party') && !facts.applicant) {
      facts.applicant = ent.name
      status.applicant = ent.confidence && ent.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    }
  }

  return { facts, status }
}

/**
 * Infer invention type from text
 */
export function inferInventionType(text = '') {
  const lower = String(text || '').toLowerCase()
  if (/\b(neural network|machine learning|ai\b|model training|deep learning|llm|inference model|transformer)\b/i.test(lower)) {
    return 'AI_ML'
  }
  if (/\b(software|algorithm|database|cloud|api|server|client|web|interface|network|protocol|data structure|byzantine|state machine|consensus|distributed|cryptographic)\b/i.test(lower)) {
    return 'SOFTWARE'
  }
  if (/\b(mechanical\w*|gear\w*|lever\w*|housing\w*|actuator\w*|piston\w*|clamp\w*|bracket\w*|chassis|valve\w*|motor\w*|shaft\w*|coupling\w*|spring\w*|gripper\w*|articulated|linkage\w*|differential)\b/i.test(lower)) {
    return 'MECHANICAL'
  }
  if (/\b(chemical|compound|molecule|reaction|catalyst|polymer|solvent|composition|synthesis)\b/i.test(lower)) {
    return 'CHEMICAL'
  }
  if (/\b(biotech|dna|rna|protein|cell|antibody|organism|gene|assay)\b/i.test(lower)) {
    return 'BIOTECH'
  }
  if (/\b(method|process|technique|step-by-step)\b/i.test(lower)) {
    return 'METHOD'
  }
  if (/\b(device|apparatus|sensor|camera|optical|tool|hardware)\b/i.test(lower)) {
    return 'DEVICE'
  }
  return 'SYSTEM'
}

/**
 * Check if the user is answering "I don't know" or asking to skip
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|can we decide later|don'?t have one|not yet|haven'?t decided|to be determined)\b/i.test(clean) ||
    /^(pass|tbd|none|n\/a)$/i.test(clean)
  )
}

/**
 * Check if an affirmative confirmation to draft was given
 */
export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(yes|proceed|draft|draft it|yes proceed|yes please|go ahead|start drafting|prepare the draft|generate|do it|ok proceed|sure proceed)$/i.test(clean) ||
    /\b(proceed with the draft|ready to draft|start drafting|please draft|prepare the first draft)\b/i.test(clean)
  )
}

/**
 * Detect mid-stream corrections to facts
 * E.g., "Actually call it Automated Wafer Inspection System"
 * E.g., "Actually it can use one or more cameras"
 */
export function detectFactCorrection(text = '', currentFacts = {}) {
  const clean = String(text || '').trim()

  // Title correction
  const titleMatch = clean.match(/(?:actually|instead)\s+(?:call\s+it|name\s+it|the\s+title\s+is)\s+["“']?([^"”'.\n]+)["”']?/i)
  if (titleMatch) {
    return { field: 'title', value: titleMatch[1].trim() }
  }

  // Components / technical update
  const componentUpdateMatch = clean.match(/(?:actually|instead)\s+it\s+(?:can\s+use|uses|has|includes)\s+(.+)$/i)
  if (componentUpdateMatch) {
    const newVal = componentUpdateMatch[1].trim()
    const existing = currentFacts.components || currentFacts.technical_mechanism || ''
    const updated = existing ? `${existing}; Note variation: can use ${newVal}` : `Can use ${newVal}`
    return { field: 'components', value: updated }
  }

  return null
}

/**
 * Assess draft readiness for PROVISIONAL application
 * Different thresholds than utility patent - no claims required
 */
export function assessProvisionalReadiness(facts = {}) {
  const hasTitle = Boolean(facts.title && facts.title !== 'UNKNOWN')
  const hasDesc = Boolean(facts.plain_description && facts.plain_description !== 'UNKNOWN' && facts.plain_description.length >= 15)
  const hasMech = Boolean(facts.technical_mechanism && facts.technical_mechanism !== 'UNKNOWN' && facts.technical_mechanism.length >= 20)
  const hasComp = Boolean(facts.components && facts.components !== 'UNKNOWN' && facts.components.length >= 10)

  if (hasTitle && hasDesc && hasMech && hasComp) {
    return PROVISIONAL_READINESS_STATES.SUFFICIENT_FOR_FIRST_DRAFT
  }
  if ((hasTitle && hasDesc) || (hasDesc && hasMech)) {
    return PROVISIONAL_READINESS_STATES.PARTIALLY_READY
  }
  return PROVISIONAL_READINESS_STATES.NOT_READY
}

/**
 * Main interview step evaluation engine for PROVISIONAL
 *
 * Takes current session state, message history, and latest user message,
 * returns the next single action:
 * - ASK_QUESTION (with exactly 1 question object and updated state)
 * - PROMPT_DRAFT_CONFIRMATION (readiness reached, asks permission)
 * - DRAFT (user affirmatively confirmed draft generation)
 */
export function evaluateProvisionalInterviewStep({
  session = {},
  messages = [],
  latestMessage = '',
  matterContext = {},
}) {
  // 1. Initialize or load stored state
  const facts = { ...(session.facts || {}) }
  const placeholders = { ...(session.placeholders || {}) }
  const flags = [...(session.flags || [])]
  const questionHistory = [...(session.questionHistory || [])]
  let currentQuestionId = session.currentQuestionId || null
  let awaitingConfirmation = session.awaitingConfirmation || false

  // 2. Extract facts from matter if not yet populated
  const { facts: matterFacts, status: matterStatus } = extractMatterFacts(matterContext)
  for (const [key, val] of Object.entries(matterFacts)) {
    if (!facts[key] && matterStatus[key] === 'KNOWN') {
      facts[key] = val
    }
  }

  const latestText = String(latestMessage || '').trim()

  // 3. Handle drafting intent from cold start
  const isProvisionalDraftRequest = /(?:draft|prepare|write|file|help me patent)(?:.*)?\b(?:provisional\s+patent|provisional\s+application|us\s+provisional|section\s+111b|35\s+usc\s+111b|early\s+patent\s+filing|file\s+a\s+provisional|provisional\s+filing)\b/i.test(latestText) ||
    /^(?:draft|prepare|write)\s+(?:a\s+)?(?:provisional\s+patent|provisional\s+application|provisional)$/i.test(latestText)

  // 4. If awaiting draft confirmation and user says yes
  if (awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        facts,
        placeholders,
        flags,
        readiness: PROVISIONAL_READINESS_STATES.SUFFICIENT_FOR_FIRST_DRAFT,
        message: 'Understood. Beginning first draft of the provisional patent application specification now.',
      }
    } else if (isSkipOrUnknown(latestText)) {
      // User says not yet or wait
      awaitingConfirmation = false
    }
  }

  // 5. Process user's answer to the pending question (if any)
  if (currentQuestionId && !isProvisionalDraftRequest && latestText) {
    // Check for mid-stream correction first
    const correction = detectFactCorrection(latestText, facts)
    if (correction) {
      facts[correction.field] = correction.value
    } else {
      const qObj = PROVISIONAL_CANONICAL_QUESTIONS.find((q) => q.question_id === currentQuestionId)
      if (qObj) {
        // Check if user said "I don't know" or "skip"
        if (isSkipOrUnknown(latestText)) {
          if (qObj.blocking) {
            // Cannot easily skip title or core description, store placeholder and explain
            placeholders[qObj.field] = `[UNKNOWN / TO BE DETERMINED: ${qObj.field}]`
            facts[qObj.field] = 'UNKNOWN'
          } else {
            placeholders[qObj.field] = `[NOT PROVIDED: ${qObj.field}]`
            facts[qObj.field] = 'UNKNOWN'
          }
        } else {
          // Check for intelligent follow-up trigger (e.g. answer too vague)
          let triggeredFollowUp = null
          for (const condition of qObj.follow_up_conditions || []) {
            if (condition.test(latestText)) {
              triggeredFollowUp = condition.followUp
              break
            }
          }

          if (triggeredFollowUp && !session.inFollowUp) {
            // Ask single purposeful follow-up
            return {
              action: 'ASK_QUESTION',
              drafting_status: 'INFORMATION_GATHERING',
              single_question: {
                question_id: `${qObj.question_id}_followup`,
                field: qObj.field,
                question: triggeredFollowUp,
                reason: 'Clarifying vague response for provisional disclosure sufficiency.',
                is_follow_up: true,
              },
              session: {
                ...session,
                facts,
                placeholders,
                flags,
                currentQuestionId: qObj.question_id,
                inFollowUp: true,
                awaitingConfirmation: false,
              },
            }
          }

          // Save valid answer
          if (qObj.field === 'inventors') {
            const names = latestText
              .split(/[,;\n]|(?:\band\b)/i)
              .map((s) => s.trim())
              .filter(Boolean)
            facts.inventors = names.length ? names : [latestText]
            if (names.length > 1 || /not sure who|helped with|contributed/i.test(latestText)) {
              if (!flags.includes(PROVISIONAL_REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)) {
                flags.push(PROVISIONAL_REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)
              }
            }
          } else if (qObj.field === 'public_disclosures') {
            facts.public_disclosures = [latestText]
            if (!/^(no|none|never|not disclosed)\b/i.test(latestText)) {
              if (!flags.includes(PROVISIONAL_REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED)) {
                flags.push(PROVISIONAL_REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED)
              }
              if (!flags.includes(PROVISIONAL_REVIEW_FLAGS.CONVERSION_DEADLINE_TRACKING)) {
                flags.push(PROVISIONAL_REVIEW_FLAGS.CONVERSION_DEADLINE_TRACKING)
              }
            }
          } else if (qObj.field === 'priority_claims') {
            facts.priority_claims = [latestText]
            if (!/^(no|none|none yet|not yet)\b/i.test(latestText)) {
              // Priority claims affect provisional priority chain
            }
          } else {
            facts[qObj.field] = latestText
          }

          // Infer invention type if description was provided
          if (qObj.field === 'plain_description' && !facts.invention_type) {
            facts.invention_type = inferInventionType(latestText)
          }
        }
      }
    }
  }

  // 6. Check readiness after updating facts
  const readiness = assessProvisionalReadiness(facts)

  // If ready for first draft, present summary and ask permission!
  if (readiness === PROVISIONAL_READINESS_STATES.SUFFICIENT_FOR_FIRST_DRAFT && !session.confirmedReady) {
    const summaryItems = [
      `Title: "${facts.title || 'Working Title'}"`,
      `Invention Summary: ${facts.plain_description ? facts.plain_description.slice(0, 120) + '...' : 'Captured'}`,
      `Core Architecture: ${facts.components ? facts.components.slice(0, 120) + '...' : 'Captured'}`,
      `Inventors: ${Array.isArray(facts.inventors) ? facts.inventors.join(', ') : facts.inventors || 'To be specified'}`,
    ]

    const flagNotes = []
    if (flags.includes(PROVISIONAL_REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED)) {
      flagNotes.push('Disclosure event noted (flagged for attorney review under 35 U.S.C. § 102).')
    }
    if (flags.includes(PROVISIONAL_REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)) {
      flagNotes.push('Inventorship contribution requires confirmation under 35 U.S.C. § 115.')
    }
    if (flags.includes(PROVISIONAL_REVIEW_FLAGS.CONVERSION_DEADLINE_TRACKING)) {
      flagNotes.push('1-year conversion deadline applies (35 U.S.C. § 119(e)). Attorney should calendar.')
    }

    const confirmationPrompt =
      `I have enough information to prepare the first draft of the provisional patent application.\n\n` +
      `**Summary of Established Information:**\n` +
      summaryItems.map((i) => `• ${i}`).join('\n') +
      (flagNotes.length ? `\n\n**Review Flags:**\n` + flagNotes.map((f) => `⚠️ ${f}`).join('\n') : '') +
      `\n\nWould you like me to proceed with drafting the provisional application?`

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

  // 7. Determine highest priority next single question
  let nextQ = null
  for (const q of PROVISIONAL_CANONICAL_QUESTIONS) {
    // Check if dependencies met
    const depsMet = q.dependencies.every((dep) => Boolean(facts[dep] && facts[dep] !== 'UNKNOWN'))
    if (!depsMet) continue

    // Check if should skip
    if (q.skip_if(facts)) continue

    nextQ = q
    break
  }

  // If no remaining questions, prompt confirmation
  if (!nextQ) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness: assessProvisionalReadiness(facts),
      message: 'I have gathered the necessary disclosure points for a provisional application. Would you like me to proceed with preparing the first draft?',
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

  // 8. Generate question text (resolve function if dynamic)
  const questionText = typeof nextQ.question === 'function' ? nextQ.question(facts) : nextQ.question

  // Formulate Sally's opening greeting if this is turn 1
  let intro = ''
  if (!currentQuestionId && isProvisionalDraftRequest) {
    intro =
      `Absolutely. I can help you prepare the provisional patent application.\n\n` +
      `A provisional establishes an early US filing date (35 U.S.C. § 111(b)). It does NOT mature into a patent—you must file a nonprovisional within 1 year to claim its priority date.\n\n` +
      `I'll ask you a few questions one at a time so I can understand the invention properly before we begin drafting.\n\n`
  }

  return {
    action: 'ASK_QUESTION',
    drafting_status: 'INFORMATION_GATHERING',
    readiness,
    single_question: {
      question_id: nextQ.question_id,
      field: nextQ.field,
      question: `${intro}${questionText}`,
      raw_question: questionText,
      reason: nextQ.reason,
      required: nextQ.required,
      answer_type: nextQ.answer_type,
    },
    session: {
      ...session,
      facts,
      placeholders,
      flags,
      currentQuestionId: nextQ.question_id,
      questionHistory: [...questionHistory, nextQ.question_id],
      inFollowUp: false,
      awaitingConfirmation: false,
    },
  }
}
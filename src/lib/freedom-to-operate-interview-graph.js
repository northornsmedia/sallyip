/**
 * SALLYIP FREEDOM-TO-OPERATE OPINION INTERVIEW GRAPH (DOCUMENT #016)
 *
 * Implements canonical pre-launch patent clearance and risk analysis DAG:
 * - Matter context first (KNOWN / INFERRED / UNKNOWN)
 * - Strict one-question-at-a-time turn taking (ONE_QUESTION_AT_A_TIME = TRUE)
 * - FTO != Patentability and FTO != Invalidity disambiguation
 * - Territoriality and multi-jurisdiction tracking
 * - Product version ambiguity handling
 * - Search readiness and zero-results safety
 * - Draft readiness confirmation gate
 */

export const FTO_WORKFLOW_MODES = Object.freeze({
  PRELIMINARY_FTO_SCREEN: 'PRELIMINARY_FTO_SCREEN',
  FULL_FTO_ASSESSMENT: 'FULL_FTO_ASSESSMENT',
  FTO_AGAINST_KNOWN_PATENTS: 'FTO_AGAINST_KNOWN_PATENTS',
  FTO_AFTER_PATENT_SEARCH: 'FTO_AFTER_PATENT_SEARCH',
  PRODUCT_FEATURE_FTO: 'PRODUCT_FEATURE_FTO',
  PROCESS_FTO: 'PROCESS_FTO',
  SOFTWARE_FTO: 'SOFTWARE_FTO',
  DEVICE_FTO: 'DEVICE_FTO',
  MULTI_JURISDICTION_FTO: 'MULTI_JURISDICTION_FTO',
  FTO_REASSESSMENT: 'FTO_REASSESSMENT',
  FTO_AFTER_PRODUCT_CHANGE: 'FTO_AFTER_PRODUCT_CHANGE',
  FTO_AFTER_NEW_PATENT: 'FTO_AFTER_NEW_PATENT',
  FTO_AFTER_LEGAL_STATUS_CHANGE: 'FTO_AFTER_LEGAL_STATUS_CHANGE',
  DESIGN_AROUND_REASSESSMENT: 'DESIGN_AROUND_REASSESSMENT',
})

export const FTO_REVIEW_FLAGS = Object.freeze({
  PRODUCT_VERSION_CONFIRMATION_REQUIRED: 'PRODUCT_VERSION_CONFIRMATION_REQUIRED',
  JURISDICTION_RESEARCH_REQUIRED: 'JURISDICTION_RESEARCH_REQUIRED',
  MULTI_ACTOR_REVIEW_REQUIRED: 'MULTI_ACTOR_REVIEW_REQUIRED',
  CLAIM_CONSTRUCTION_REVIEW_REQUIRED: 'CLAIM_CONSTRUCTION_REVIEW_REQUIRED',
  EQUIVALENTS_REVIEW_REQUIRED: 'EQUIVALENTS_REVIEW_REQUIRED',
  INDIRECT_INFRINGEMENT_REVIEW_REQUIRED: 'INDIRECT_INFRINGEMENT_REVIEW_REQUIRED',
  EXCEPTION_REVIEW_REQUIRED: 'EXCEPTION_REVIEW_REQUIRED',
  LICENSE_SCOPE_REVIEW_REQUIRED: 'LICENSE_SCOPE_REVIEW_REQUIRED',
  TERM_RESEARCH_REQUIRED: 'TERM_RESEARCH_REQUIRED',
  STATUS_CONFLICT_REQUIRES_REVIEW: 'STATUS_CONFLICT_REQUIRES_REVIEW',
  PENDING_CLAIM_RISK: 'PENDING_CLAIM_RISK',
  CLAIM_STATUS_RESEARCH_REQUIRED: 'CLAIM_STATUS_RESEARCH_REQUIRED',
  PRODUCT_SOURCE_CONFLICT: 'PRODUCT_SOURCE_CONFLICT',
  ANALYSIS_CONTRADICTION: 'ANALYSIS_CONTRADICTION',
  REFERENCE_VERIFICATION_FAILED: 'REFERENCE_VERIFICATION_FAILED',
  CLAIM_VERIFICATION_FAILED: 'CLAIM_VERIFICATION_FAILED',
  FTO_ASSESSMENT_STALE: 'FTO_ASSESSMENT_STALE',
  NEW_RIGHT_REVIEW_REQUIRED: 'NEW_RIGHT_REVIEW_REQUIRED',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
  CONFIDENTIAL_PILOT_BLOCKED: 'CONFIDENTIAL_PILOT_BLOCKED',
  PATENTABILITY_VS_FTO_CLARIFIED: 'PATENTABILITY_VS_FTO_CLARIFIED',
  GLOBAL_CLEARANCE_DISCLAIMED: 'GLOBAL_CLEARANCE_DISCLAIMED',
})

export const FTO_OUTCOMES = Object.freeze({
  MATERIAL_CLAIM_MAPPING_IDENTIFIED: 'MATERIAL_CLAIM_MAPPING_IDENTIFIED',
  POTENTIAL_RISK_REQUIRING_REVIEW: 'POTENTIAL_RISK_REQUIRING_REVIEW',
  PARTIAL_MAPPING_ONLY: 'PARTIAL_MAPPING_ONLY',
  NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE: 'NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE',
  STATUS_UNCERTAIN: 'STATUS_UNCERTAIN',
  INCONCLUSIVE: 'INCONCLUSIVE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
})

export const FTO_READINESS = Object.freeze({
  NOT_READY: 'NOT_READY',
  READY_FOR_KNOWN_PATENT_SCREEN: 'READY_FOR_KNOWN_PATENT_SCREEN',
  READY_FOR_PRELIMINARY_FTO: 'READY_FOR_PRELIMINARY_FTO',
  READY_FOR_EVIDENCE_BASED_FTO: 'READY_FOR_EVIDENCE_BASED_FTO',
})

const FTO_QUESTIONS = [
  {
    question_id: 'q_jurisdiction',
    field: 'jurisdiction',
    question: 'Which country or jurisdiction do you plan to make, use, sell, offer, import, or otherwise commercialise this product or process in?',
    reason: 'Patent rights are strictly territorial; FTO analysis requires an identified national or regional jurisdiction.',
    required: true,
    skip_if: (facts) => Boolean(facts.jurisdiction && facts.jurisdiction !== 'UNKNOWN'),
  },
  {
    question_id: 'q_product_definition',
    field: 'product_name',
    question: 'What is the commercial name and technical definition of the product, apparatus, or process being assessed?',
    reason: 'Identifies the core commercial target being cleared against third-party patent claims.',
    required: true,
    skip_if: (facts) => Boolean(facts.product_name && facts.product_name !== 'UNKNOWN'),
  },
  {
    question_id: 'q_product_version',
    field: 'product_version',
    question: 'Which specific version, release, or engineering revision of the product is being assessed (e.g., v1.0, v2.1, or prototype revision)?',
    reason: 'FTO conclusions are version-specific; technical changes between versions can alter claim mapping.',
    required: true,
    skip_if: (facts) => Boolean(facts.product_version && facts.product_version !== 'UNKNOWN' && !facts.product_version_conflict),
  },
  {
    question_id: 'q_commercial_activities',
    field: 'commercial_activities',
    question: 'What specific commercial activities are contemplated in the target jurisdiction (e.g., manufacturing, importing, selling, offering for sale, using, or hosting)?',
    reason: 'Different commercial acts engage distinct statutory infringement provisions and territorial boundaries.',
    required: true,
    skip_if: (facts) => Boolean(facts.commercial_activities?.length),
  },
  {
    question_id: 'q_product_features',
    field: 'product_features',
    question: 'What are the essential technical features, components, and operating mechanisms of this product or process?',
    reason: 'Provides the factual basis for element-by-element comparison against third-party patent claims.',
    required: true,
    skip_if: (facts) => Boolean(facts.product_features?.length || facts.features?.length),
  },
  {
    question_id: 'q_known_patents',
    field: 'known_patents',
    question: 'Are there specific known competitor patents, patent applications, or prior search results you want included in this assessment?',
    reason: 'Identifies specific target rights for claim-level mapping and distinguishes known-patent reviews from full searches.',
    required: false,
    skip_if: (facts) => Boolean(facts.known_patents !== undefined),
  },
  {
    question_id: 'q_timing_launch',
    field: 'planned_launch_date',
    question: 'What is the anticipated commercial launch or deployment date for this product or process in the target jurisdiction?',
    reason: 'Determines the relevant date for patent status, expiration timing, and pending application risk.',
    required: false,
    skip_if: (facts) => Boolean(facts.planned_launch_date || facts.relevant_date),
  },
]

/**
 * Extract known FTO facts from matter context
 */
export function extractFtoMatterContext(matterContext = {}) {
  const matter = matterContext.matter || {}
  const facts = {}
  const status = {}

  // 1. Product name and description
  if (matter.product_name || matter.product || matter.title) {
    facts.product_name = matter.product_name || matter.product || matter.title
    status.product_name = 'KNOWN'
  }

  // 2. Product versions
  const availableVersions = matter.product_versions || matter.available_versions || []
  if (availableVersions.length > 1) {
    facts.available_versions = availableVersions
    facts.product_version_conflict = true
    status.product_version = 'UNKNOWN'
  } else if (matter.product_version || matter.version) {
    facts.product_version = matter.product_version || matter.version
    status.product_version = 'KNOWN'
  } else if (availableVersions.length === 1) {
    facts.product_version = availableVersions[0]
    status.product_version = 'KNOWN'
  }

  // 3. Target jurisdictions
  if (matter.jurisdiction || matter.jurisdictions || matter.launch_markets) {
    const raw = matter.jurisdictions || matter.launch_markets || matter.jurisdiction
    facts.jurisdiction = Array.isArray(raw) ? (raw.length === 1 ? raw[0] : raw) : raw
    status.jurisdiction = 'KNOWN'
  }

  // 4. Commercial activities
  if (matter.commercial_activities || matter.activities) {
    facts.commercial_activities = matter.commercial_activities || matter.activities
    status.commercial_activities = 'KNOWN'
  }

  // 5. Product features & technical specifications
  if (matter.features || matter.product_features || matter.technical_description) {
    const feats = matter.product_features || matter.features
    facts.product_features = Array.isArray(feats)
      ? feats
      : (typeof feats === 'string' ? [feats] : (matter.technical_description ? [matter.technical_description] : []))
    status.product_features = 'KNOWN'
  }

  // 6. Known patents or competitor rights
  if (matter.known_patents || matter.competitor_patents || matter.patents) {
    facts.known_patents = matter.known_patents || matter.competitor_patents || matter.patents
    status.known_patents = 'KNOWN'
  }

  // 7. Timing / launch date
  if (matter.planned_launch_date || matter.launch_date || matter.relevant_date) {
    facts.planned_launch_date = matter.planned_launch_date || matter.launch_date || matter.relevant_date
    status.planned_launch_date = 'KNOWN'
  }

  return { facts, status }
}

/**
 * Check if user input is an FTO vs Patentability misconception
 */
export function isPatentabilityMisconception(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /\b(?:our\s+invention\s+is\s+novel|since\s+we\s+are\s+patentable|our\s+patent\s+was\s+granted|we\s+have\s+a\s+patent|invention\s+is\s+patentable)\b/i.test(clean) &&
    /\b(?:so\s+we\s+have\s+fto|free\s+to\s+operate|freedom\s+to\s+operate|we\s+can\s+sell|safe\s+to\s+launch|can't\s+infringe|cannot\s+infringe)\b/i.test(clean)
  )
}

/**
 * Check if user input is affirmative confirmation
 */
export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(yes|proceed|run fto|generate fto|generate opinion|prepare fto|start assessment|confirm|do it)$/i.test(clean) ||
    /\b(yes|proceed|please proceed|go ahead|ready to assess|run the fto assessment)\b/i.test(clean)
  )
}

/**
 * Check if user wants to skip or does not know
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(skip|i don't know|idk|not sure|unknown|no idea|n\/a|pass|none)$/i.test(clean) ||
    /\b(skip this|don't know|not sure yet|unknown at this stage|haven't decided|undecided)\b/i.test(clean)
  )
}

/**
 * Assess FTO readiness level based on current facts
 */
export function assessFtoReadiness(facts = {}) {
  const hasProduct = Boolean(facts.product_name)
  const hasVersion = Boolean(facts.product_version && !facts.product_version_conflict)
  const hasJurisdiction = Boolean(facts.jurisdiction && facts.jurisdiction !== 'UNKNOWN')
  const hasFeatures = Boolean(facts.product_features?.length || facts.features?.length)
  const hasRights = Boolean(facts.known_patents?.length || facts.search_scope)

  if (!hasProduct || !hasJurisdiction) {
    return FTO_READINESS.NOT_READY
  }

  if (hasProduct && hasJurisdiction && hasRights && hasFeatures && hasVersion) {
    return FTO_READINESS.READY_FOR_EVIDENCE_BASED_FTO
  }

  if (hasProduct && hasJurisdiction && hasRights) {
    return FTO_READINESS.READY_FOR_KNOWN_PATENT_SCREEN
  }

  if (hasProduct && hasJurisdiction) {
    return FTO_READINESS.READY_FOR_PRELIMINARY_FTO
  }

  return FTO_READINESS.NOT_READY
}

/**
 * Core Step Evaluator for Freedom-to-Operate Turn-Taking DAG
 */
export function evaluateFtoInterviewStep({ session = {}, latestMessage = '', matterContext = {} }) {
  const latestText = String(latestMessage || '').trim()

  let facts = { ...(session.facts || {}) }
  let flags = [...(session.flags || [])]
  let currentQuestionId = session.currentQuestionId || null
  let workflowMode = session.workflowMode || FTO_WORKFLOW_MODES.FULL_FTO_ASSESSMENT

  // 1. Initialize matter facts on turn 1
  if (!session.initialized) {
    const extracted = extractFtoMatterContext(matterContext)
    facts = { ...extracted.facts, ...facts }
    session.initialized = true
    session.facts = facts
    session.flags = flags
    session.workflowMode = workflowMode
  }

  // 2. Interceptor: Patentability vs. FTO Misconception (Test 101)
  if (isPatentabilityMisconception(latestText)) {
    flags.push(FTO_REVIEW_FLAGS.PATENTABILITY_VS_FTO_CLARIFIED)
    return {
      action: 'CLARIFICATION_REQUIRED',
      drafting_status: 'INFORMATION_GATHERING',
      message:
        `No. A finding that your invention is novel or patentable does **not** establish freedom to operate.\n\n` +
        `Patent rights are exclusionary (the right to stop others), not affirmative rights to practice. A product may incorporate patentable improvements while still falling within the broader claims of an existing, enforceable third-party patent.\n\n` +
        `To properly assess freedom to operate, we must evaluate third-party patent claims in your target commercial territory.\n\n` +
        `Which country or jurisdiction do you plan to commercialise the product in?`,
      single_question: {
        question_id: 'q_jurisdiction',
        field: 'jurisdiction',
        question: 'Which country or jurisdiction do you plan to commercialise the product in?',
        reason: 'Distinguishes patentability from freedom to operate.',
      },
      session: { ...session, facts, flags, currentQuestionId: 'q_jurisdiction' },
    }
  }

  // 3. Interceptor: Multiple Product Versions Ambiguity (Test 103)
  if (facts.available_versions && facts.available_versions.length > 1 && (!facts.product_version || facts.product_version_conflict)) {
    // Check if the user specified one of the versions in latestText
    const matchedVersion = facts.available_versions.find((v) => new RegExp(`\\b${v}\\b`, 'i').test(latestText))
    if (matchedVersion) {
      facts.product_version = matchedVersion
      facts.product_version_conflict = false
    } else {
      flags.push(FTO_REVIEW_FLAGS.PRODUCT_VERSION_CONFIRMATION_REQUIRED)
      return {
        action: 'CONFIRMATION_REQUIRED',
        drafting_status: 'INFORMATION_GATHERING',
        message:
          `The matter contains multiple product versions: **${facts.available_versions.join(', ')}**.\n\n` +
          `Freedom-to-operate conclusions are strictly product-version-specific. Which specific version would you like me to assess?`,
        single_question: {
          question_id: 'q_product_version',
          field: 'product_version',
          question: `Which specific product version (${facts.available_versions.join(' or ')}) should be assessed?`,
          reason: 'Prevents evaluating the wrong engineering revision.',
        },
        session: { ...session, facts, flags, currentQuestionId: 'q_product_version' },
      }
    }
  }

  // 4. Process user's answer to currentQuestionId
  if (currentQuestionId) {
    if (isSkipOrUnknown(latestText)) {
      const q = FTO_QUESTIONS.find((item) => item.question_id === currentQuestionId)
      if (q) facts[q.field] = 'UNKNOWN'
    } else {
      if (currentQuestionId === 'q_jurisdiction') {
        facts.jurisdiction = latestText
      } else if (currentQuestionId === 'q_product_definition') {
        facts.product_name = latestText
      } else if (currentQuestionId === 'q_product_version') {
        facts.product_version = latestText
        facts.product_version_conflict = false
      } else if (currentQuestionId === 'q_commercial_activities') {
        facts.commercial_activities = latestText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      } else if (currentQuestionId === 'q_product_features') {
        facts.product_features = latestText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      } else if (currentQuestionId === 'q_known_patents') {
        facts.known_patents = latestText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      } else if (currentQuestionId === 'q_timing_launch') {
        facts.planned_launch_date = latestText
      }
    }
  }

  // 5. Check if user is confirming generation
  if (session.readyForConfirmation && isAffirmativeConfirmation(latestText)) {
    return {
      action: 'DRAFT_DOCUMENT',
      drafting_status: 'READY_TO_ASSEMBLE',
      message: `Starting evidence-based Freedom-to-Operate assessment for **${facts.product_name || 'Product'}** in **${facts.jurisdiction || 'target jurisdiction'}**...`,
      facts,
      flags,
      session: { ...session, facts, flags, readyForConfirmation: false },
    }
  }

  // 6. Find next highest-priority unanswered question
  for (const q of FTO_QUESTIONS) {
    if (!q.skip_if(facts)) {
      // Vague request check (Test 100): If user simply asks "Can we sell our product?"
      // Sally asks ONE material question, specifically jurisdiction if missing.
      let promptPrefix = ''
      if (!currentQuestionId && !facts.jurisdiction) {
        promptPrefix = `I can assess potential patent risk for the proposed product against relevant patent rights within a defined search scope.\n\n`
      }

      return {
        action: 'ASK_QUESTION',
        drafting_status: 'INFORMATION_GATHERING',
        message: `${promptPrefix}${q.question}`,
        single_question: q,
        session: {
          ...session,
          facts,
          flags,
          currentQuestionId: q.question_id,
        },
      }
    }
  }

  // 7. All primary questions answered -> Draft Confirmation Gate
  session.readyForConfirmation = true
  const readiness = assessFtoReadiness(facts)

  const summary = [
    `### Freedom-to-Operate Assessment Readiness Summary`,
    `- **Product Assessed**: ${facts.product_name || 'Not specified'}`,
    `- **Product Version**: ${facts.product_version || 'Not specified'}`,
    `- **Target Jurisdiction**: ${facts.jurisdiction || 'Not specified'}`,
    `- **Commercial Activities**: ${facts.commercial_activities?.join(', ') || 'General commercialization'}`,
    `- **Product Features**: ${facts.product_features?.length || 0} features recorded`,
    `- **Known Patents**: ${facts.known_patents?.length ? facts.known_patents.join(', ') : 'None provided (search-driven)'}`,
    `- **Readiness Level**: \`${readiness}\``,
  ].join('\n')

  return {
    action: 'CONFIRMATION_REQUIRED',
    drafting_status: 'CONFIRMATION_REQUIRED',
    message: `${summary}\n\nI have enough information to begin the FTO assessment using the current evidence. Would you like me to proceed?`,
    facts,
    flags,
    session,
  }
}

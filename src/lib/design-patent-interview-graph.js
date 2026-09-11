/**
 * SALLYIP DESIGN PATENT APPLICATION INTERVIEW GRAPH ENGINE
 * Canonical Document #004: Design Patent Application (35 U.S.C. § 171; 37 C.F.R. § 1.152)
 *
 * Implements a dependency-aware question DAG with:
 * - One-question-at-a-time turn taking
 * - Matter context inspection (KNOWN, INFERRED, UNKNOWN)
 * - Design-type branching (Physical/Partial/Surface/GUI/Icon/Display)
 * - Whole-vs-partial design logic
 * - Drawing view and line-treatment inspection
 * - Colour/transparency handling
 * - Multiple embodiment detection
 * - GUI-specific questioning
 * - Inventorship contribution checks
 * - Functionality review (ornamental vs functional)
 * - Draft readiness states (NOT_READY, PARTIALLY_READY, READY_FOR_FIRST_DRAFT)
 * - Explicit permission gate before draft generation
 */

export const READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  READY_FOR_FIRST_DRAFT: 'READY_FOR_FIRST_DRAFT',
}

export const REVIEW_FLAGS = {
  DISCLOSURE_TIMING_REVIEW_REQUIRED: 'DISCLOSURE_TIMING_REVIEW_REQUIRED',
  INVENTORSHIP_REVIEW_REQUIRED: 'INVENTORSHIP_REVIEW_REQUIRED',
  FUNCTIONALITY_REVIEW_REQUIRED: 'FUNCTIONALITY_REVIEW_REQUIRED',
  CLAIM_BOUNDARY_REVIEW_REQUIRED: 'CLAIM_BOUNDARY_REVIEW_REQUIRED',
  DRAWING_INCONSISTENCY: 'DRAWING_INCONSISTENCY',
  UNITY_OR_MULTIPLE_DESIGN_REVIEW_REQUIRED: 'UNITY_OR_MULTIPLE_DESIGN_REVIEW_REQUIRED',
  CONFIDENTIAL_MATTER_UNPUBLISHED: 'CONFIDENTIAL_MATTER_UNPUBLISHED',
}

export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|can we decide later|don'?t have one|not yet|haven'?t decided|to be determined)\b/i.test(clean)
    || /^(pass|tbd|none|n\/a|no|nope)$/i.test(clean)
}

export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return /^(yes|proceed|draft|draft it|yes proceed|yes please|go ahead|start drafting|prepare the (draft|application)|generate|do it|ok proceed|sure proceed|yes that works|yes go ahead)$/i.test(clean)
    || /\b(proceed with (the )?(draft|application)|ready to draft|start drafting|please draft|prepare the first draft|prepare the application)\b/i.test(clean)
}

export function inferDesignType(description = '') {
  const desc = String(description || '').toLowerCase()
  if (/icon|symbol|logotype|favicon|small graphic/i.test(desc)) return 'ICON'
  if (/graphic|user interface|screen|display|ui\b|ux|mobile app|web app|application screen|cursor|animated|sequence|state/i.test(desc)) return 'GUI'
  if (/surface|pattern|decoration|ornamental finish|printed|embossed|textured/i.test(desc)) return 'SURFACE_ORNAMENTATION'
  if (/partial|portion|only the|front face|side|specific area|broken lines|unclaimed/i.test(desc)) return 'PARTIAL_PRODUCT'
  if (/packaging|box|bottle|container|wrap|label/i.test(desc)) return 'PACKAGING'
  if (/furniture|chair|table|sofa|desk|cabinet/i.test(desc)) return 'FURNITURE'
  if (/wearable|watch|jewelry|glasses|hat|clothing/i.test(desc)) return 'WEARABLE'
  return 'PHYSICAL_PRODUCT'
}

export function isFunctionalFeature(facts = {}) {
  const desc = String(facts.design_description || facts.ornamental_features || '').toLowerCase()
  if (/functional|function|purpose|technical|mechanical|operational|utility|works by|serves to|enables|configured to|perform|adaptive|structural|load-bearing|movable|adjustable|convert|transform/i.test(desc)) return true
  return false
}

export function assessReadiness(facts = {}) {
  const hasArticleName = Boolean(facts.article_name && facts.article_name !== 'UNKNOWN')
  const hasTitle = Boolean(facts.design_title && facts.design_title !== 'UNKNOWN')
  const hasDesignType = Boolean(facts.design_type && facts.design_type !== 'UNKNOWN')
  const hasClaimedPortion = Boolean(facts.claimed_portion && facts.claimed_portion !== 'UNKNOWN')
  const hasInventors = Boolean(facts.inventors && facts.inventors.length > 0 && facts.inventors[0] !== 'UNKNOWN')
  const hasDrawingViews = Boolean(facts.available_views && facts.available_views.length > 0)
  const hasFigureDescription = Boolean(facts.figure_description && facts.figure_description !== 'UNKNOWN' && facts.figure_description.length >= 10)
  const hasLineTreatment = Boolean(facts.line_treatment && facts.line_treatment !== 'UNKNOWN' && facts.line_treatment !== 'NOT_CONFIRMED')

  const requiredFields = [hasArticleName, hasTitle, hasDesignType, hasClaimedPortion, hasInventors]
  const recommendedFields = [hasDrawingViews, hasFigureDescription, hasLineTreatment]
  const allRequired = requiredFields.every(Boolean)
  const mostRecommended = recommendedFields.filter(Boolean).length >= 2

  if (allRequired && mostRecommended) return READINESS_STATES.READY_FOR_FIRST_DRAFT
  if (allRequired && recommendedFields.filter(Boolean).length >= 1) return READINESS_STATES.PARTIALLY_READY
  if (requiredFields.filter(Boolean).length >= 2) return READINESS_STATES.PARTIALLY_READY
  return READINESS_STATES.NOT_READY
}

export function extractMatterFacts(matterContext = {}) {
  const facts = {}
  const status = {}

  if (!matterContext || !matterContext.matter) return { facts, status }

  const matter = matterContext.matter
  const factsList = matterContext.facts || []
  const entities = matterContext.entities || []

  if (matter.client_name) { facts.applicant = matter.client_name; status.applicant = 'KNOWN' }
  if (matter.jurisdictions && matter.jurisdictions.length) { facts.jurisdiction = matter.jurisdictions['0']; status.jurisdiction = 'KNOWN' }

  for (const fact of factsList) {
    const factMap = {
      'article_name': 'article_name',
      'design_title': 'design_title',
      'design_type': 'design_type',
      'inventor': 'inventors',
      'applicant': 'applicant',
      'drawing': 'available_views',
      'product': 'article_name',
      'ornamental_features': 'ornamental_features',
      'design_description': 'design_description',
    }
    if (factMap[fact.fact_type]) {
      facts[factMap[fact.fact_type]] = fact.value?.label || fact.value || 'UNKNOWN'
      status[factMap[fact.fact_type]] = 'KNOWN'
    }
  }

  for (const entity of entities) {
    if (entity.entity_type === 'person' && !facts.inventors) {
      facts.inventors = [entity.name]
      status.inventors = 'KNOWN'
    }
    if (entity.entity_type === 'organization' && !facts.applicant) {
      facts.applicant = entity.name
      status.applicant = 'KNOWN'
    }
  }

  return { facts, status }
}

export const CANONICAL_QUESTIONS = [
  {
    question_id: 'q_article_name',
    field: 'article_name',
    question: 'First, what is the name of the article of manufacture that the design relates to? For example: "Smart Speaker", "Mobile Phone", "Dining Table".',
    reason: 'Required under 37 C.F.R. § 1.152 — the design must identify the article of manufacture it pertains to.',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.article_name && facts.article_name !== 'UNKNOWN'),
    follow_up_conditions: [
      { test: (ans) => ans.trim().split(/\s+/).length < 2, followUp: 'Could you provide a more specific name for the article? The USPTO requires identification of the article of manufacture.' },
    ],
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 2,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_design_title',
    field: 'design_title',
    question: 'What would you like to title this design patent application? USPTO prefers a neutral, descriptive article name (e.g., "Electronic Device", "Chair", "Container").',
    reason: 'Required under 37 C.F.R. § 1.152(a) — the title of the invention must be provided.',
    required: true,
    blocking: true,
    dependencies: ['article_name'],
    skip_if: (facts) => Boolean(facts.design_title && facts.design_title !== 'UNKNOWN'),
    follow_up_conditions: [
      { test: (ans) => /\b(best|revolutionary|world\'s|amazing|premium|ultimate)/i.test(ans), followUp: 'USPTO requires a neutral, descriptive title. What objective title would you prefer?' },
    ],
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 2,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_design_type',
    field: 'design_type',
    question: (facts) => {
      const inferred = inferDesignType(facts.design_description || facts.ornamental_features || '')
      if (inferred !== 'PHYSICAL_PRODUCT') return `Based on your description, this appears to be a ${inferred === 'GUI' ? 'graphical user interface (GUI)' : inferred === 'ICON' ? 'icon' : inferred === 'SURFACE_ORNAMENTATION' ? 'surface ornamentation' : inferred === 'PARTIAL_PRODUCT' ? 'partial product design' : inferred === 'PACKAGING' ? 'packaging' : 'furniture'} design. Does that sound correct, or should I adjust?`
      return 'What type of design is this? Please choose one: Physical Product, Partial Product Design, Surface Ornamentation, Graphical User Interface (GUI), Icon, Display Screen, Packaging, Furniture, Wearable, Container, or Other.'
    },
    reason: 'Design type determines the applicable claiming strategy, drawing requirements, and examination approach under 37 C.F.R. § 1.152.',
    required: true,
    blocking: true,
    dependencies: ['article_name'],
    skip_if: (facts) => Boolean(facts.design_type && facts.design_type !== 'UNKNOWN'),
    answer_type: 'select',
    validation: (ans) => String(ans || '').length > 0,
    source: 'matter_or_user',
    options: ['PHYSICAL_PRODUCT', 'PARTIAL_PRODUCT', 'SURFACE_ORNAMENTATION', 'GUI', 'ICON', 'DISPLAY_SCREEN', 'PACKAGING', 'FURNITURE', 'WEARABLE', 'CONTAINER', 'OTHER'],
  },
  {
    question_id: 'q_claimed_portion',
    field: 'claimed_portion',
    question: (facts) => {
      if (facts.design_type === 'PARTIAL_PRODUCT') return 'Since this is a partial product design, does the claim cover the entire article or only a specific portion? USPTO requires clear identification of what is claimed.'
      return 'Does the design cover the entire article, or only a specific portion of it? For partial designs, the ornamental portion must be clearly distinguished from unclaimed environmental features.'
    },
    reason: 'Required under 37 C.F.R. § 1.152 — must identify whether the claim is to the entire article or a portion thereof.',
    required: true,
    blocking: true,
    dependencies: ['design_type'],
    skip_if: (facts) => Boolean(facts.claimed_portion && facts.claimed_portion !== 'UNKNOWN'),
    answer_type: 'select',
    validation: (ans) => ['ENTIRE_ARTICLE', 'PORTION_OF_ARTICLE'].includes(ans),
    source: 'matter_or_user',
    options: ['ENTIRE_ARTICLE', 'PORTION_OF_ARTICLE'],
  },
  {
    question_id: 'q_ornamental_features',
    field: 'ornamental_features',
    question: 'Please describe the visually distinctive ornamental features of the design. What makes the appearance unique or novel?',
    reason: 'Required for the Design Description section under 37 C.F.R. § 1.152(c) — must describe the ornamental appearance.',
    required: true,
    blocking: true,
    dependencies: ['design_title'],
    skip_if: (facts) => Boolean(facts.ornamental_features && facts.ornamental_features.length >= 30),
    follow_up_conditions: [
      { test: (ans) => ans.trim().split(/\s+/).length < 6, followUp: 'Could you describe what is visually distinctive about the design? For example, its shape, configuration, surface ornamentation, or overall appearance.' },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 15,
    source: 'user',
  },
  {
    question_id: 'q_functionality_check',
    field: 'functionality_check',
    question: (facts) => {
      const isFunctional = isFunctionalFeature(facts)
      if (isFunctional) return 'It appears that the design may include functional features. Under USPTO rules, a design patent protects only ornamental design, not functional aspects. Are any of the features purely functional (e.g., the shape is dictated by the item\'s function)?'
      return 'Is the appearance of this design purely ornamental, or are any features dictated by the function of the article? A design patent cannot claim functional features.'
    },
    reason: 'Under 35 U.S.C. § 171 and MPEP § 1504 — design patents protect only ornamental appearance; functional features must be excluded.',
    required: true,
    blocking: true,
    dependencies: ['ornamental_features'],
    skip_if: (facts) => facts.functionality_check === true && facts.ornamental_only === true,
    answer_type: 'boolean',
    validation: (ans) => typeof ans === 'boolean',
    source: 'user',
    review_flag: REVIEW_FLAGS.FUNCTIONALITY_REVIEW_REQUIRED,
  },
  {
    question_id: 'q_drawing_views',
    field: 'available_views',
    question: 'Which drawing views are available or planned for this design? Typically these include: Perspective, Front, Rear, Left Side, Right Side, Top, Bottom views.',
    reason: 'Required under 37 C.F.R. § 1.152(b) — the design patent application must include adequate drawing views showing the claimed design.',
    required: true,
    blocking: true,
    dependencies: ['article_name'],
    skip_if: (facts) => Boolean(facts.available_views && facts.available_views.length >= 2),
    follow_up_conditions: [
      { test: (ans) => { const v = Array.isArray(ans) ? ans : [ans]; return v.length < 2; }, followUp: 'At least two views are typically needed (e.g., front and perspective). Which additional views can you provide?' },
    ],
    answer_type: 'array',
    validation: (ans) => Array.isArray(ans) && ans.length >= 1,
    source: 'user',
    options: ['PERSPECTIVE', 'FRONT', 'REAR', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM'],
  },
  {
    question_id: 'q_line_treatment',
    field: 'line_treatment',
    question: 'How are solid and broken lines handled in the drawings? Solid lines typically represent claimed portions of the design; broken lines represent unclaimed/environmental portions.',
    reason: 'Under 37 C.F.R. § 1.152(b) — line treatment must clearly distinguish claimed design portions from unclaimed portions.',
    required: true,
    blocking: true,
    dependencies: ['available_views'],
    skip_if: (facts) => Boolean(facts.line_treatment && facts.line_treatment !== 'NOT_CONFIRMED'),
    answer_type: 'select',
    validation: (ans) => ans === 'SOLID_CLAIMED_BROKEN_UNCLAIMED' || ans === 'NOT_CONFIRMED',
    source: 'matter_or_user',
    options: ['SOLID_CLAIMED_BROKEN_UNCLAIMED', 'NOT_CONFIRMED'],
  },
  {
    question_id: 'q_figure_description',
    field: 'figure_description',
    question: 'Please provide a brief description of each figure/drawing view included in the application. For example: "FIG. 1 is a perspective view of the smart speaker; FIG. 2 is a front view..."',
    reason: 'Required under 37 C.F.R. § 1.152(b) — each figure must be described in the specification.',
    required: true,
    blocking: true,
    dependencies: ['available_views'],
    skip_if: (facts) => Boolean(facts.figure_description && facts.figure_description.length >= 30),
    follow_up_conditions: [
      { test: (ans) => ans.trim().split(/\s+/).length < 4, followUp: 'Could you briefly describe what each figure shows? For example, the type of view (perspective, front, etc.) for each figure number.' },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 20,
    source: 'user',
  },
  {
    question_id: 'q_whole_vs_partial',
    field: 'whole_vs_partial',
    question: (facts) => {
      if (facts.claimed_portion === 'PORTION_OF_ARTICLE') return 'Since this is a partial design, please describe: (1) the claimed ornamental portion, and (2) the unclaimed/environmental portions shown in the drawings. This distinction is critical for proper claim boundary definition.'
      return 'Since this covers the entire article, are there any environmental portions or surrounding context that should be shown in the drawings but not claimed?'
    },
    reason: 'Under 37 C.F.R. § 1.152 — whole vs. partial designs require different treatment of unclaimed portions and broken lines.',
    required: false,
    blocking: false,
    dependencies: ['claimed_portion'],
    skip_if: (facts) => facts.claimed_portion !== 'PORTION_OF_ARTICLE' && !facts.whole_vs_partial,
    answer_type: 'textarea',
    validation: (ans) => true,
    source: 'user',
  },
  {
    question_id: 'q_colour_transparency',
    field: 'colour_significance',
    question: 'Is colour a significant feature of the design? And are there any transparent or translucent portions shown in the drawings?',
    reason: 'Under 37 C.F.R. § 1.152 — colour claims must be separately asserted; transparent portions require specific representation in drawings.',
    required: false,
    blocking: false,
    dependencies: ['available_views'],
    skip_if: (facts) => Boolean(facts.colour_significance && facts.colour_significance !== 'NOT_APPLICABLE'),
    answer_type: 'select',
    validation: (ans) => ['CLAIMED', 'ILLUSTRATIVE', 'NOT_APPLICABLE'].includes(ans),
    source: 'matter_or_user',
    options: ['CLAIMED', 'ILLUSTRATIVE', 'NOT_APPLICABLE'],
  },
  {
    question_id: 'q_transparency',
    field: 'transparency_translucency',
    question: 'Are there transparent or translucent portions in the design? If so, how are they represented in the drawings?',
    reason: 'Under 37 C.F.R. § 1.152 — transparent/translucent portions must be properly shown (e.g., by alternating long and short parallel lines).',
    required: false,
    blocking: false,
    dependencies: ['colour_transparency'],
    skip_if: (facts) => facts.transparency_translucency === false,
    answer_type: 'boolean',
    validation: (ans) => typeof ans === 'boolean',
    source: 'matter_or_user',
  },
  {
    question_id: 'q_multiple_embodiments',
    field: 'multiple_embodiments',
    question: 'Are there multiple embodiments or closely related design variants that should be included? If so, each embodiment may require its own claim set and drawing views.',
    reason: 'Under 35 U.S.C. § 171 and 37 C.F.R. § 1.152 — multiple designs in one application require proper unity/variety assessment and separate claims.',
    required: false,
    blocking: false,
    dependencies: ['figure_description'],
    skip_if: (facts) => facts.multiple_embodiments === false,
    answer_type: 'boolean',
    validation: (ans) => typeof ans === 'boolean',
    source: 'matter_or_user',
    review_flag: REVIEW_FLAGS.UNITY_OR_MULTIPLE_DESIGN_REVIEW_REQUIRED,
  },
  {
    question_id: 'q_embodiments_detail',
    field: 'embodiments_detail',
    question: 'Please describe each embodiment or variant: what distinguishes it visually from the others?',
    reason: 'Under 35 U.S.C. § 171 — if multiple designs are included, each must be separately described and claimed.',
    required: false,
    blocking: false,
    dependencies: ['multiple_embodiments'],
    skip_if: (facts) => !facts.multiple_embodiments,
    answer_type: 'textarea',
    validation: (ans) => true,
    source: 'user',
  },
  {
    question_id: 'q_gui_details',
    field: 'gui_details',
    question: (facts) => {
      if (facts.design_type === 'GUI') return 'For GUI designs, please describe: (1) What display/article does the GUI appear on? (e.g., "mobile phone screen", "vehicle dashboard"), (2) Is the design static, animated, or a sequence of states? (3) How many states/frames are shown?'
      return 'This question applies to GUI, icon, and display screen designs. What display article does the design appear on? Is it static, animated, or a sequence of states?'
    },
    reason: 'Under MPEP § 1504.02 — GUI designs require specific identification of the display article and state/animation details.',
    required: false,
    blocking: false,
    dependencies: ['design_type'],
    skip_if: (facts) => facts.design_type !== 'GUI' && facts.design_type !== 'ICON' && facts.design_type !== 'DISPLAY_SCREEN',
    answer_type: 'textarea',
    validation: (ans) => true,
    source: 'user',
  },
  {
    question_id: 'q_unclaimed_features',
    field: 'unclaimed_features',
    question: 'Are there any features shown in the drawings that are NOT claimed (i.e., environmental portions or unclaimed portions)? These should be shown with broken lines.',
    reason: 'Under 37 C.F.R. § 1.152(b) — unclaimed features must be shown with broken lines to distinguish them from claimed portions.',
    required: false,
    blocking: false,
    dependencies: ['line_treatment', 'available_views'],
    skip_if: (facts) => facts.claimed_portion === 'ENTIRE_ARTICLE' && !facts.unclaimed_features,
    answer_type: 'textarea',
    validation: (ans) => true,
    source: 'user',
  },
  {
    question_id: 'q_inventors',
    field: 'inventors',
    question: 'Who are the inventors of this design? All natural persons who contributed to the ornamental design conception must be listed.',
    reason: 'Required under 35 U.S.C. § 115 — all inventors must be named in the application. Inventorship must be verified.',
    required: true,
    blocking: true,
    dependencies: ['design_title'],
    skip_if: (facts) => Boolean(facts.inventors && facts.inventors.length > 0 && facts.inventors[0] !== 'UNKNOWN'),
    follow_up_conditions: [
      { test: (ans) => /(?:designed|created|made)/i.test(ans) && !/\b(name|names|john|jane|bob|alice|sam|mike)\b/i.test(ans), followUp: 'Could you provide the full name(s) of the inventor(s)? All persons who contributed to the ornamental design conception must be listed.' },
    ],
    answer_type: 'array',
    validation: (ans) => Array.isArray(ans) && ans.length >= 1,
    source: 'matter_or_user',
    review_flag: REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED,
  },
  {
    question_id: 'q_public_disclosures',
    field: 'public_disclosures',
    question: 'Have there been any public disclosures of this design (e.g., publications, public uses, sales, or exhibitions)?',
    reason: 'Critical for novelty analysis under 35 U.S.C. § 102 — public disclosures before filing may bar patentability. Attorney review recommended.',
    required: false,
    blocking: false,
    dependencies: ['design_title'],
    skip_if: (facts) => facts.public_disclosures === true && facts.public_disclosures_answered === true,
    answer_type: 'boolean',
    validation: (ans) => typeof ans === 'boolean',
    source: 'user',
    review_flag: REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED,
  },
  {
    question_id: 'q_priority_claims',
    field: 'priority_claims',
    question: 'Is this application claiming priority from an earlier application (e.g., a provisional application)? If so, please provide details.',
    reason: 'Under 35 U.S.C. § 120 and 37 C.F.R. § 1.77(b)(2) — proper priority claim documentation is required.',
    required: false,
    blocking: false,
    dependencies: ['design_title'],
    skip_if: (facts) => !facts.priority_claims || facts.priority_claims.length === 0,
    answer_type: 'array',
    validation: (ans) => true,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_applicant_assignee',
    field: 'applicant',
    question: 'Who is the applicant or assignee? If different from the inventor, please identify.',
    reason: 'Under 35 U.S.C. § 115 — the applicant/assignee must be identified in the application.',
    required: false,
    blocking: false,
    dependencies: ['inventors'],
    skip_if: (facts) => Boolean(facts.applicant && facts.applicant !== 'UNKNOWN'),
    answer_type: 'text',
    validation: (ans) => true,
    source: 'matter_or_user',
  },
]

export function evaluateDesignPatentInterviewStep({
  session = {},
  messages = [],
  latestMessage = '',
  matterContext = {},
}) {
  const facts = { ...(session.facts || {}) }
  const placeholders = { ...(session.placeholders || {}) }
  const flags = [...(session.flags || [])]
  const questionHistory = [...(session.questionHistory || [])]
  let currentQuestionId = session.currentQuestionId || null
  let awaitingConfirmation = session.awaitingConfirmation || false

  const { facts: matterFacts, status: matterStatus } = extractMatterFacts(matterContext)
  for (const [key, val] of Object.entries(matterFacts)) {
    if (!facts[key] && matterStatus[key] === 'KNOWN') {
      facts[key] = val
    }
  }

  const latestText = String(latestMessage || '').trim()

  const isDraftRequest = /(?:draft|prepare|write|file|help me patent)(?:.*)?\b(?:design\s+patent|design\s+application|us\s+design\s+patent|design\s+patent\s+application|my\s+design)(?:\s+application)?\b/i.test(latestText) ||
    /^(?:draft|prepare|write)\s+(?:a\s+)?(?:design\s+patent(?:\s+application)?|design\s+application|us\s+design\s+patent)$/i.test(latestText)

  if (awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        facts,
        placeholders,
        flags,
        readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
        message: 'Understood. Beginning first draft of the design patent application now.',
      }
    } else if (isSkipOrUnknown(latestText)) {
      awaitingConfirmation = false
    }
  }

  if (currentQuestionId && !isDraftRequest && latestText) {
    const correction = detectFactCorrection(latestText, facts)
    if (correction) {
      facts[correction.field] = correction.value
    } else {
      const qObj = CANONICAL_QUESTIONS.find((q) => q.question_id === currentQuestionId)
      if (qObj) {
        if (isSkipOrUnknown(latestText)) {
          if (qObj.blocking) {
            placeholders[qObj.field] = `[UNKNOWN / TO BE DETERMINED: ${qObj.field}]`
            facts[qObj.field] = 'UNKNOWN'
          } else {
            placeholders[qObj.field] = `[NOT PROVIDED: ${qObj.field}]`
            facts[qObj.field] = 'UNKNOWN'
          }
        } else {
          let triggeredFollowUp = null
          for (const condition of qObj.follow_up_conditions || []) {
            if (condition.test(latestText)) {
              triggeredFollowUp = condition.followUp
              break
            }
          }
          if (triggeredFollowUp && !session.inFollowUp) {
            return {
              action: 'ASK_QUESTION',
              drafting_status: 'INFORMATION_GATHERING',
              single_question: {
                question_id: `${qObj.question_id}_followup`,
                field: qObj.field,
                question: triggeredFollowUp,
                reason: 'Clarifying response for design patent disclosure sufficiency.',
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

          if (qObj.field === 'inventors') {
            const names = latestText.split(/[,;\n]|(?:\band\b)/i).map((s) => s.trim()).filter(Boolean)
            facts.inventors = names.length ? names : [latestText]
            if (names.length > 1) {
              if (!flags.includes(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)) {
                flags.push(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)
              }
            }
          } else if (qObj.field === 'public_disclosures') {
            facts.public_disclosures = latestText
            if (!/^(no|none|never|not disclosed)\b/i.test(latestText)) {
              if (!flags.includes(REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED)) {
                flags.push(REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED)
              }
            }
          } else {
            facts[qObj.field] = latestText
          }

          if (qObj.field === 'design_description' || qObj.field === 'ornamental_features') {
            if (!facts.design_type) {
              facts.design_type = inferDesignType(latestText)
            }
          }
        }
      }
    }
  }

  const readiness = assessReadiness(facts)

  if (readiness === READINESS_STATES.READY_FOR_FIRST_DRAFT && !session.confirmedReady) {
    const summaryItems = [
      `Article Name: "${facts.article_name || 'To be specified'}"`,
      `Design Title: "${facts.design_title || 'Working Title'}"`,
      `Design Type: ${facts.design_type || 'Not specified'}`,
      `Claimed Portion: ${facts.claimed_portion || 'Not specified'}`,
      `Inventors: ${Array.isArray(facts.inventors) ? facts.inventors.join(', ') : facts.inventors || 'To be specified'}`,
      `Drawing Views: ${Array.isArray(facts.available_views) ? facts.available_views.join(', ') : 'To be specified'}`,
    ]

    const flagNotes = []
    if (flags.includes(REVIEW_FLAGS.FUNCTIONALITY_REVIEW_REQUIRED)) {
      flagNotes.push('Functionality overlap identified — ornamental vs functional distinction requires confirmation (35 U.S.C. § 171).')
    }
    if (flags.includes(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)) {
      flagNotes.push('Inventorship contribution requires confirmation under 35 U.S.C. § 115.')
    }
    if (flags.includes(REVIEW_FLAGS.DISCLOSURE_TIMING_REVIEW_REQUIRED)) {
      flagNotes.push('Public disclosure event noted — attorney review recommended under 35 U.S.C. § 102.')
    }
    if (flags.includes(REVIEW_FLAGS.UNITY_OR_MULTIPLE_DESIGN_REVIEW_REQUIRED)) {
      flagNotes.push('Multiple embodiments identified — unity and variety assessment required under 35 U.S.C. § 171.')
    }

    const confirmationPrompt =
      `I have enough information to prepare the first draft of the design patent application.\n\n` +
      `**Summary of Established Information:**\n` +
      summaryItems.map((i) => `• ${i}`).join('\n') +
      (flagNotes.length ? `\n\n**Review Flags:**\n` + flagNotes.map((f) => `⚠️ ${f}`).join('\n') : '') +
      `\n\nWould you like me to proceed with drafting the design patent application?`

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

  let nextQ = null
  for (const q of CANONICAL_QUESTIONS) {
    const depsMet = q.dependencies.every((dep) => Boolean(facts[dep] && facts[dep] !== 'UNKNOWN'))
    if (!depsMet) continue
    if (q.skip_if(facts)) continue
    if (q.required && facts[q.field] === 'UNKNOWN') continue
    nextQ = q
    break
  }

  if (!nextQ) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness: assessReadiness(facts),
      message: 'I have gathered the necessary disclosure points. Would you like me to proceed with preparing the first draft?',
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
      `Absolutely. I can help you prepare the design patent application.\n\n` +
      `I'll ask you a few questions one at a time so I can understand the design properly before we begin drafting.\n\n`
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

export function detectFactCorrection(text = '', currentFacts = {}) {
  const clean = String(text || '').trim()
  const titleMatch = clean.match(/(?:actually|instead)\s+(?:call\s+it|name\s+it|the\s+title\s+is)\s+["“']?([^"”'.\n]+)["”']?/i)
  if (titleMatch) return { field: 'design_title', value: titleMatch[1].trim() }
  const articleMatch = clean.match(/(?:actually|instead)\s+it\s+(?:is|was|called)\s+(.+)$/i)
  if (articleMatch) return { field: 'article_name', value: articleMatch[1].trim() }
  return null
}
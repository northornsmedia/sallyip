/**
 * SALLYIP PATENT DRAWINGS INSTRUCTIONS INTERVIEW GRAPH — PART 1
 * Canonical Document #012: matter-first conditional one-question interview.
 */

import {
  DRAWING_WORKFLOW_MODES, DRAWING_INVENTION_TYPES, DRAWING_JURISDICTION_CONTEXTS,
  FIGURE_STATUSES, FIGURE_LOCKS, DRAWING_READINESS, DRAWING_REVIEW_FLAGS,
  DRAWING_PROVENANCE, splitList, normalizeTerm, extractTechnicalFacts, proposeFigurePlan,
  allocateReferenceNumerals, assignNumeralsToFigures, analyzeFigureGaps, buildClaimFigureMap,
  buildSpecificationFigureMap, detectNumeralConflicts, checkTerminologyConsistency,
  assessDrawingReadiness, applyFigureEdit, assembleDrawingInstructionPackage,
  isFormalDesignDrawingRequest, isPatentDrawingInstructionRequest, parseNumeralMentions,
} from './patent-drawings-model.js'
import { inferInventionType } from './patent-interview-graph.js'
import { assertChatAllowed } from './provider-policy.js'

export { DRAWING_READINESS, DRAWING_REVIEW_FLAGS, DRAWING_PROVENANCE, FIGURE_LOCKS }

export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').replace(/[’‘]/g, '\u0027').trim().toLowerCase()
  return /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|can we decide later|don'?t have one|not yet|haven'?t decided|to be determined)\b/i.test(clean)
    || /^(pass|tbd|none|n\/a|no|nope)$/i.test(clean)
}

export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').replace(/[’‘]/g, '\u0027').trim().toLowerCase()
  return /^(yes|proceed|draft|draft it|yes proceed|yes please|go ahead|start drafting|prepare the (draft|instructions)|generate|do it|ok proceed|sure proceed|confirmed|approved|yes, proceed\.?)$/i.test(clean)
    || /\b(proceed with (the )?(draft|instructions)|proceed\b.*\bdrawings? instructions\b|ready to draft|start drafting|please draft|prepare the first draft|prepare the instructions)\b/i.test(clean)
}

export function isActualDrawingGenerationRequest(text = '') {
  return /generate (the )?actual patent drawing|create (the )?patent (drawing|illustration|image)|render (the )?figure|draw it for me/i.test(String(text || ''))
}

export function detectWorkflowMode(text = '', matterContext = {}) {
  const value = String(text || '')
  if (/existing sketch|from (an? )?sketch|sketch/i.test(value) || (matterContext.attachments || []).some((a) => /sketch/i.test(a.kind || a.label || ''))) return 'DRAWINGS_FROM_EXISTING_SKETCHES'
  if (/product (photo|image|picture)|from (product )?images?|photograph/i.test(value)) return 'DRAWINGS_FROM_PRODUCT_IMAGES'
  if (/gap analysis|missing (feature|view|figure)|not shown/i.test(value)) return 'FIGURE_GAP_ANALYSIS'
  if (/reference numeral|numeral (review|conflict|registry)/i.test(value)) return 'REFERENCE_NUMERAL_REVIEW'
  if (/figure description|describe (the )?figures?/i.test(value)) return 'FIGURE_DESCRIPTION_GENERATION'
  if (/update (figure|drawing)|revise fig|change fig/i.test(value)) return 'DRAWING_UPDATE_INSTRUCTIONS'
  if (/jurisdiction|uspTO|pct|epo|formal/i.test(value)) return 'JURISDICTION_ADAPTATION'
  if (/review (the )?(drawing|figure) set|review existing/i.test(value)) return 'DRAWING_SET_REVIEW'
  if (/claim/i.test(value)) return 'DRAWINGS_FROM_CLAIMS'
  if (/specification/i.test(value)) return 'DRAWINGS_FROM_SPECIFICATION'
  if (/invention disclosure/i.test(value)) return 'DRAWINGS_FROM_INVENTION_DISCLOSURE'
  return 'NEW_DRAWING_INSTRUCTIONS'
}

export function extractDrawingMatterFacts(matterContext = {}) {
  const facts = {}
  const status = {}
  const matter = matterContext.matter || {}
  if (matter.title && matter.title !== 'Untitled Matter' && matter.title.trim().length > 3) {
    facts.invention_title = matter.title.trim()
    status.invention_title = 'KNOWN'
  }
  if (matter.client_name && String(matter.client_name).trim().length > 1) {
    facts.applicant = String(matter.client_name).trim()
    status.applicant = 'KNOWN'
  }
  const jurisdiction = matter.jurisdictions?.[0] || matterContext.jurisdiction
  if (jurisdiction) {
    const upper = String(jurisdiction).toUpperCase()
    facts.jurisdiction_context = DRAWING_JURISDICTION_CONTEXTS.includes(upper) ? upper : 'OTHER'
    status.jurisdiction_context = 'KNOWN'
  }
  const direct = {
    invention_title: matterContext.invention_title || matter.invention_title,
    invention_type: matterContext.invention_type || matter.invention_type,
    workflow_mode: matterContext.workflow_mode || matter.workflow_mode,
    jurisdiction_context: matterContext.jurisdiction_context || matter.jurisdiction_context,
    components: matterContext.components || matter.components,
    steps: matterContext.steps || matter.steps || matter.method_steps,
    relationships: matterContext.relationships || matter.relationships,
    claims_text: matterContext.claims_text || matter.claims_text,
    specification_text: matterContext.specification_text || matter.specification_text,
    existing_figures: matterContext.existing_figures || matter.existing_figures || matter.drawings,
    existing_numerals: matterContext.existing_numerals || matter.existing_numerals || matter.reference_numerals,
    reference_numerals_text: matterContext.reference_numerals_text || matter.reference_numerals_text,
    alternative_embodiments: matterContext.alternative_embodiments || matter.alternative_embodiments,
    internal_detail_supported: matterContext.internal_detail_supported ?? matter.internal_detail_supported,
  }
  for (const [key, value] of Object.entries(direct)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && !value.length) continue
    facts[key] = value
    status[key] = 'KNOWN'
  }
  const ctxFacts = matterContext.facts || []
  for (const item of ctxFacts) {
    const value = item.value?.label ?? item.value
    if (value === undefined || value === null || value === '') continue
    const map = {
      invention_title: 'invention_title', title: 'invention_title', specification: 'specification_text',
      claims: 'claims_text', drawing: 'existing_figures', figure: 'existing_figures', component: 'components',
      step: 'steps', relationship: 'relationships', reference_numeral: 'existing_numerals',
      invention_type: 'invention_type', workflow_mode: 'workflow_mode', jurisdiction: 'jurisdiction_context',
      alternative_embodiment: 'alternative_embodiments',
    }
    const field = map[item.fact_type]
    if (!field || facts[field] !== undefined) continue
    facts[field] = value
    status[field] = item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
  }
  if (Array.isArray(matterContext.attachments) && matterContext.attachments.length && !facts.source_assets) {
    facts.source_assets = matterContext.attachments
    status.source_assets = 'KNOWN'
  }
  if (!facts.invention_type && (facts.invention_title || facts.specification_text || facts.components)) {
    const inferred = inferInventionType([facts.invention_title, facts.specification_text, splitList(facts.components).join(' ')].join(' '))
    if (inferred && inferred !== 'SYSTEM') {
      facts.invention_type = inferred
      status.invention_type = 'INFERRED'
    }
  }
  return { facts, status }
}

const DRAWING_QUESTIONS = [
  {
    question_id: 'q_workflow_mode', field: 'workflow_mode',
    question: 'Should I prepare new drawing instructions, review an existing figure set, update one figure, or adapt instructions to a filing jurisdiction?',
    reason: 'Selects only the requested drawing-instruction workflow; a single-figure update must not force a full plan.',
    required: false, blocking: false, dependencies: [],
    skip_if: (facts) => Boolean(facts.workflow_mode && facts.workflow_mode !== 'UNKNOWN'),
    answer_type: 'select', source: 'matter_or_user',
  },
  {
    question_id: 'q_figure_one_focus', field: 'figure_one_focus',
    question: 'What is the main physical or functional arrangement that Figure 1 should communicate?',
    reason: 'Every figure needs a defined technical purpose; Figure 1 anchors the plan.',
    required: true, blocking: true, dependencies: [],
    skip_if: (facts) => Boolean(facts.figure_one_focus && facts.figure_one_focus !== 'UNKNOWN'),
    answer_type: 'textarea', source: 'user',
  },
  {
    question_id: 'q_invention_title', field: 'invention_title',
    question: 'What working title should I use for this invention so the figure terminology stays consistent?',
    reason: 'Keeps figure titles, components, and numerals aligned with the matter.',
    required: true, blocking: true, dependencies: [],
    skip_if: (facts) => Boolean(facts.invention_title && facts.invention_title !== 'UNKNOWN'),
    answer_type: 'text', source: 'matter_or_user',
  },
  {
    question_id: 'q_invention_type', field: 'invention_type',
    question: 'What type of invention is this—for example, system, software, mechanical device, method, electronics, chemical, biotech, or medical device?',
    reason: 'Selects only relevant figure classes for the invention type.',
    required: true, blocking: false, dependencies: ['invention_title'],
    skip_if: (facts) => Boolean(facts.invention_type && facts.invention_type !== 'UNKNOWN' && facts.invention_type !== 'OTHER'),
    answer_type: 'select', source: 'matter_or_user',
  },
  {
    question_id: 'q_components', field: 'components',
    question: (facts) => {
      const type = facts.invention_type || 'OTHER'
      if (type === 'METHOD' || type === 'PROCESS') return 'What are the supported method steps, in order, without adding steps that are not disclosed?'
      if (type === 'SOFTWARE' || type === 'AI_ML' || type === 'NETWORK') return 'What are the supported software/system components—no invented modules, datasets, layers, or data flows?'
      if (type === 'MECHANICAL' || type === 'DEVICE' || type === 'APPARATUS' || type === 'MEDICAL_DEVICE') return 'What are the supported physical components? Do not include hidden parts unless the source establishes them.'
      return 'What components, elements, or steps are actually supported by the specification, claims, sketches, or images?'
    },
    reason: 'Every material drawing element must map to source support.',
    required: true, blocking: true, dependencies: ['figure_one_focus'],
    skip_if: (facts) => splitList(facts.components).length > 0 || splitList(facts.steps).length > 0,
    answer_type: 'textarea', source: 'user',
  },
  {
    question_id: 'q_relationships', field: 'relationships',
    question: 'How do those components or steps relate—what connections, sequences, data/signal flows, movements, or control relationships should the figures show?',
    reason: 'Relationships determine arrows, sequence, assembly, and view derivation.',
    required: false, blocking: false, dependencies: ['components'],
    skip_if: (facts) => splitList(facts.relationships).length > 0 || splitList(facts.steps).length > 1,
    answer_type: 'textarea', source: 'user',
  },
  {
    question_id: 'q_existing_figures', field: 'existing_figures',
    question: 'Are there existing figures, sketches, CAD exports, diagrams, or product images I should preserve? If so, list each figure and only what is visibly shown.',
    reason: 'Existing figures must be preserved and must not gain invented hidden content.',
    required: false, blocking: false, dependencies: ['components'],
    skip_if: (facts) => facts.existing_figures !== undefined || (facts.source_assets || []).length > 0,
    answer_type: 'array', source: 'matter_or_user',
  },
  {
    question_id: 'q_reference_numerals', field: 'existing_numerals',
    question: 'What reference numerals already exist—for example, controller 120? I will preserve them and detect conflicts rather than renumbering silently.',
    reason: 'Maintains a deterministic numeral registry and preserves approved figures.',
    required: false, blocking: false, dependencies: ['components'],
    skip_if: (facts) => facts.existing_numerals !== undefined || facts.reference_numerals_text !== undefined,
    answer_type: 'textarea', source: 'matter_or_user',
  },
  {
    question_id: 'q_jurisdiction_context', field: 'jurisdiction_context',
    question: 'What filing context applies—US, PCT, EP, a specific national phase, another jurisdiction, or undecided?',
    reason: 'Jurisdiction context controls adaptation notes; formal rules still require verified authority.',
    required: false, blocking: false, dependencies: ['invention_title'],
    skip_if: (facts) => Boolean(facts.jurisdiction_context && facts.jurisdiction_context !== 'UNDECIDED' && facts.jurisdiction_context !== 'UNKNOWN'),
    answer_type: 'select', source: 'matter_or_user',
  },
]

function hasUsableFact(facts, field) {
  const value = facts[field]
  if (value === undefined || value === null || value === 'UNKNOWN') return false
  if (Array.isArray(value)) return value.length > 0
  return String(value).trim().length > 0
}

function coerceAnswer(field, text) {
  if (['components', 'steps', 'relationships', 'alternatives', 'alternative_embodiments', 'excluded_features'].includes(field)) return splitList(text)
  if (field === 'existing_figures') {
    if (/^(no|none|not yet|n\/a)\b/i.test(String(text).trim())) return []
    return splitList(text).map((label, index) => ({ figure_id: `user-figure-${index + 1}`, label, source: DRAWING_PROVENANCE.USER_PROVIDED }))
  }
  if (field === 'existing_numerals') {
    const mentions = parseNumeralMentions(text)
    return mentions.length ? mentions : splitList(text)
  }
  if (field === 'invention_type') {
    const upper = String(text).trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (DRAWING_INVENTION_TYPES.includes(upper)) return upper
    const inferred = inferInventionType(text)
    return DRAWING_INVENTION_TYPES.includes(inferred) ? inferred : 'UNKNOWN'
  }
  if (field === 'workflow_mode') {
    const upper = String(text).trim().toUpperCase().replace(/[\s-]+/g, '_')
    return DRAWING_WORKFLOW_MODES.includes(upper) ? upper : 'UNKNOWN'
  }
  if (field === 'jurisdiction_context') {
    const upper = String(text).trim().toUpperCase().replace(/[\s-]+/g, '_')
    return DRAWING_JURISDICTION_CONTEXTS.includes(upper) ? upper : 'UNKNOWN'
  }
  return String(text).trim()
}

export function assertDrawingConfidentiality({ engines = [], mode = 'CONFIDENTIAL_IP', env = {} } = {}) {
  try {
    return assertChatAllowed({ engines, mode, env })
  } catch (error) {
    error.drawing_flag = DRAWING_REVIEW_FLAGS.CONFIDENTIAL_PILOT_BLOCKED
    throw error
  }
}

function mergeMatterIntoFacts(sessionFacts = {}, matterFacts = {}, matterStatus = {}) {
  const merged = { ...(sessionFacts || {}) }
  for (const [key, value] of Object.entries(matterFacts)) {
    if (merged[key] !== undefined) continue
    if (matterStatus[key] === 'KNOWN' || (key === 'invention_type' && matterStatus[key] === 'INFERRED')) merged[key] = value
  }
  return merged
}

function preserveFigureState(previousFigures = [], nextFigures = []) {
  const previousById = new Map(previousFigures.map((figure) => [figure.figure_id, figure]))
  return nextFigures.map((figure) => {
    const previous = previousById.get(figure.figure_id)
    if (!previous) return figure
    if (previous.lock === FIGURE_LOCKS.USER_LOCKED || previous.lock === FIGURE_LOCKS.REVIEW_LOCKED) return previous
    return { ...figure, lock: previous.lock || figure.lock, version: previous.version || figure.version, history: previous.history || figure.history, status: previous.status === 'CONFIRMED' ? previous.status : figure.status }
  })
}

export function rebuildDrawingState(facts = {}, previousSession = {}) {
  const technical = extractTechnicalFacts(facts)
  const mergedFacts = { ...technical }
  for (const key of ['invention_title', 'invention_type', 'workflow_mode', 'jurisdiction_context', 'figure_one_focus', 'claims_text', 'specification_text', 'reference_numerals_text', 'internal_detail_supported', 'update_target_figure_id', 'applicant']) {
    if (facts[key] !== undefined) mergedFacts[key] = facts[key]
  }
  if (!mergedFacts.invention_type || mergedFacts.invention_type === 'OTHER') {
    const inferred = inferInventionType([mergedFacts.invention_title, mergedFacts.specification_text, mergedFacts.components.join(' ')].join(' '))
    if (inferred && inferred !== 'SYSTEM') mergedFacts.invention_type = inferred
  }
  const proposed = proposeFigurePlan(mergedFacts)
  let figures = preserveFigureState(previousSession.figurePlan || [], proposed.figures)
  if (mergedFacts.figure_one_focus && mergedFacts.figure_one_focus !== 'UNKNOWN') {
    const target = figures.find((figure) => figure.figure_id.startsWith('fig-') && figure.lock === FIGURE_LOCKS.UNLOCKED)
    if (target) {
      target.purpose = String(mergedFacts.figure_one_focus)
      if (!target.open_question) target.open_question = null
    }
  }
  const figureComponentTerms = []
  for (const figure of figures) for (const component of figure.components || []) figureComponentTerms.push(component.term)
  const allocation = allocateReferenceNumerals({ components: [...mergedFacts.components, ...figureComponentTerms], existingNumerals: mergedFacts.numeral_mentions || [] })
  figures = assignNumeralsToFigures(figures, allocation.registry)
  const claimFigureMap = buildClaimFigureMap({ claimsText: mergedFacts.claims_text || '', claimedFeatures: mergedFacts.claimed_features, figures })
  const specificationFigureMap = buildSpecificationFigureMap({ specificationText: mergedFacts.specification_text || '', specComponents: mergedFacts.spec_components, figures })
  const planGaps = analyzeFigureGaps({ claimedFeatures: mergedFacts.claimed_features, specComponents: mergedFacts.spec_components, relationships: mergedFacts.relationships, steps: mergedFacts.steps, figures })
  const numeralConflicts = [...allocation.conflicts, ...detectNumeralConflicts({ registry: allocation.registry, figures, specificationNumerals: parseNumeralMentions(mergedFacts.specification_text || '') })]
  const terminologyConflicts = checkTerminologyConsistency({ instructionTerms: figureComponentTerms, specificationTerms: mergedFacts.spec_components, claimTerms: mergedFacts.claimed_features })
  const readiness = assessDrawingReadiness({ facts: mergedFacts, figures, numeralConflicts, terminologyConflicts, gaps: [...proposed.gaps, ...planGaps] })
  const openQuestions = []
  if (figures.some((figure) => figure.status === FIGURE_STATUSES.MISSING_INFORMATION)) openQuestions.push('Supply the internal components, section location/direction, and purpose needed for any requested cross-section; otherwise remove that view.')
  if (!allocation.registry.length) openQuestions.push('Confirm whether any reference numerals already exist, or confirm that new deterministic numerals may be assigned.')
  return {
    facts: mergedFacts, figures, numeralRegistry: allocation.registry, claimFigureMap, specificationFigureMap,
    gaps: [...proposed.gaps, ...planGaps], numeralConflicts, terminologyConflicts, readiness,
    openQuestions, figureNecessity: proposed.necessity,
  }
}

function processFigureCommand(text = '', figures = []) {
  const value = String(text || '')
  const figureMatch = value.match(/fig\.?\s*(\d+[a-z]?)/i)
  if (!figureMatch) return null
  const targetNumber = figureMatch[1].toUpperCase()
  const target = figures.find((figure) => new RegExp(`^FIG\.?\\s*${targetNumber}$`, 'i').test(figure.display_number || ''))
  if (!target) return null
  if (/\block\b/i.test(value)) return { figure: { ...target, lock: FIGURE_LOCKS.USER_LOCKED, history: [...(target.history || []), { version: target.version || 1, change: 'User locked figure instruction.' }] }, note: `${target.display_number} is now USER_LOCKED and will not be silently changed.` }
  if (/\bunlock\b/i.test(value)) return { figure: { ...target, lock: FIGURE_LOCKS.UNLOCKED, history: [...(target.history || []), { version: target.version || 1, change: 'User unlocked figure instruction.' }] }, note: `${target.display_number} is now UNLOCKED.` }
  if (/\bremove\b|\bdelete\b|\bsupersede\b/i.test(value)) {
    if (target.lock !== FIGURE_LOCKS.UNLOCKED) return { figure: target, note: `${target.display_number} is locked and was preserved.` }
    return { figure: { ...target, status: FIGURE_STATUSES.SUPERSEDED, history: [...(target.history || []), { version: target.version || 1, change: 'User removed figure from active instruction set.' }] }, note: `${target.display_number} was marked SUPERSEDED; history was preserved.` }
  }
  return null
}

function summarizeForConfirmation(state) {
  const figureLines = state.figures.map((figure) => `• ${figure.display_number}: ${figure.purpose} [${figure.status}; ${figure.necessity}]`)
  const numeralLines = state.numeralRegistry.map((entry) => `${entry.preferred_term} ${entry.reference_numeral || 'UNASSIGNED'}`)
  const parts = [
    `I have enough information to prepare the patent drawing instructions.`,
    ``,
    `**Proposed figure set:**`,
    ...(figureLines.length ? figureLines : ['• No figures proposed yet.']),
    ``,
    `**Important components/reference numerals:**`,
    numeralLines.length ? numeralLines.map((line) => `• ${line}`).join('\n') : '• None assigned yet.',
    ``,
    `**Known gaps/conflicts/review flags:**`,
    state.gaps.length || state.numeralConflicts.length || state.terminologyConflicts.length
      ? [...state.gaps.map((gap) => `• ${gap.code}`), ...state.numeralConflicts.map((conflict) => `• ${conflict.code}`), ...state.terminologyConflicts.map((conflict) => `• ${conflict.code}`)].join('\n')
      : '• None recorded.',
    ``,
    `Would you like me to proceed?`,
  ]
  return parts.join('\n')
}

function selectNextQuestion(facts, state, questionHistory = []) {
  const depMet = (dep) => {
    if (dep === 'components') return hasUsableFact(facts, 'components') || hasUsableFact(facts, 'steps') || hasUsableFact(facts, 'relationships')
    return hasUsableFact(facts, dep)
  }
  for (const question of DRAWING_QUESTIONS) {
    if (!question.dependencies.every(depMet)) continue
    if (question.skip_if(facts)) continue
    const text = typeof question.question === 'function' ? question.question(facts) : question.question
    return { ...question, question: text, raw_question: text }
  }
  if (state.figures.some((figure) => figure.status === FIGURE_STATUSES.MISSING_INFORMATION) && !questionHistory.includes('q_cross_section_detail')) {
    return {
      question_id: 'q_cross_section_detail', field: 'internal_detail_supported',
      question: 'For the requested cross-section, what internal components are actually supported, and where is the section taken? If that detail is unavailable, I will flag CROSS_SECTION_DETAIL_REQUIRED instead of inventing geometry.',
      reason: 'Cross-sections require supported internal detail.', required: false, answer_type: 'textarea',
    }
  }
  return null
}

function sessionIds(session = {}, matterContext = {}, facts = {}) {
  return {
    draftSessionId: session.draftSessionId || matterContext.draftSessionId || 'drawing-session-pending',
    matterId: session.matterId || matterContext.matter?.id || matterContext.matterId || null,
    documentId: 'patent-drawings-instructions',
    drawingInstructionSetId: session.drawingInstructionSetId || `drawset-${String(session.matterId || matterContext.matter?.id || facts.invention_title || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pending'}`,
  }
}

export function evaluateDrawingInstructionsStep({ session = {}, messages = [], latestMessage = '', matterContext = {} } = {}) {
  const previousFacts = { ...(session.facts || {}) }
  const placeholders = { ...(session.placeholders || {}) }
  const flags = [...(session.flags || [])]
  const questionHistory = [...(session.questionHistory || [])]
  let currentQuestionId = session.currentQuestionId || null
  let awaitingConfirmation = session.awaitingConfirmation || false
  const latestText = String(latestMessage || '').trim()
  const matter = extractDrawingMatterFacts(matterContext)
  let facts = mergeMatterIntoFacts(previousFacts, matter.facts, matter.status)
  if (!facts.workflow_mode) {
    facts.workflow_mode = detectWorkflowMode(latestText, matterContext)
  }

  if (isFormalDesignDrawingRequest(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED', document_family: 'design-patent-application',
      message: 'This looks like a formal ornamental design-patent figure request. I am routing it to the Design Patent Application workflow rather than utility Patent Drawings Instructions.',
      flags: ['DESIGN_PATENT_DRAWING_ROUTE'], session: { ...session, facts },
    }
  }
  if (isActualDrawingGenerationRequest(latestText)) {
    return {
      action: 'CLARIFICATION_REQUIRED', document_family: 'patent-drawings-instructions',
      message: 'Actual patent-drawing rendering is a separate stage from drawing instructions. I can prepare the instruction package first; human/approved rendering and drawing review must follow.',
      flags: ['ACTUAL_IMAGE_GENERATION_SEPARATE'], session: { ...session, facts },
    }
  }

  const isInstructionRequest = isPatentDrawingInstructionRequest(latestText) || Boolean(currentQuestionId || Object.keys(previousFacts).length || Object.keys(matter.facts).length)
  let state = rebuildDrawingState(facts, session)
  facts = state.facts
  const ids = sessionIds(session, matterContext, facts)
  const baseSession = { ...session, ...ids, facts, placeholders, flags, questionHistory, currentQuestionId, awaitingConfirmation }

  if (awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      const confirmedFigures = state.figures.map((figure) => figure.status === FIGURE_STATUSES.PROPOSED
        ? { ...figure, status: FIGURE_STATUSES.READY_FOR_INSTRUCTIONS, history: [...(figure.history || []), { version: figure.version || 1, change: 'User confirmed instruction readiness.' }] }
        : figure)
      const instruction_package = assembleDrawingInstructionPackage({
        matter: { title: facts.invention_title }, facts, figures: confirmedFigures, numeralRegistry: state.numeralRegistry,
        claimFigureMap: state.claimFigureMap, specificationFigureMap: state.specificationFigureMap, gaps: state.gaps,
        numeralConflicts: state.numeralConflicts, terminologyConflicts: state.terminologyConflicts, imageConflicts: [],
        openQuestions: state.openQuestions, jurisdictionContext: facts.jurisdiction_context, workflowMode: facts.workflow_mode,
      })
      return {
        action: 'DRAFT', drafting_status: 'READY_TO_ASSEMBLE', document_family: 'patent-drawings-instructions',
        facts, figure_plan: confirmedFigures, numeral_registry: state.numeralRegistry, claim_map: state.claimFigureMap,
        specification_map: state.specificationFigureMap, gaps: state.gaps, conflicts: [...state.numeralConflicts, ...state.terminologyConflicts],
        jurisdiction: facts.jurisdiction_context, instruction_package,
        message: 'Understood. Assembling the illustrator-facing instruction package and attorney QA mapping now.',
        session: { ...baseSession, figurePlan: confirmedFigures, numeralRegistry: state.numeralRegistry, awaitingConfirmation: false, confirmedReady: true },
      }
    }
    if (isSkipOrUnknown(latestText)) awaitingConfirmation = false
  }

  const command = latestText && currentQuestionId ? processFigureCommand(latestText, state.figures) : null
  if (command) {
    const figures = state.figures.map((figure) => figure.figure_id === command.figure.figure_id ? command.figure : figure)
    state = { ...state, figures }
    const next = selectNextQuestion(facts, state, questionHistory)
    const updatedSession = { ...baseSession, figurePlan: figures, numeralRegistry: state.numeralRegistry, currentQuestionId: next?.question_id || null, awaitingConfirmation: false, commandResult: command.note, questionHistory: next ? [...questionHistory, next.question_id] : questionHistory }
    if (!next) {
      return { action: 'PROMPT_DRAFT_CONFIRMATION', drafting_status: 'CONFIRMATION_REQUIRED', document_family: 'patent-drawings-instructions', readiness: state.readiness.readiness, message: `${command.note}\n\n${summarizeForConfirmation(state)}`, session: { ...updatedSession, awaitingConfirmation: true, confirmedReady: true }, facts, flags }
    }
    return { action: 'ASK_QUESTION', drafting_status: 'INFORMATION_GATHERING', document_family: 'patent-drawings-instructions', readiness: state.readiness.readiness, single_question: next, question: next, questions: [next], message: command.note, session: updatedSession, known_facts: facts, jurisdiction: facts.jurisdiction_context }
  }

  if (currentQuestionId && latestText && !isPatentDrawingInstructionRequest(latestText)) {
    const question = DRAWING_QUESTIONS.find((item) => item.question_id === currentQuestionId)
    if (question) {
      if (isSkipOrUnknown(latestText)) {
        placeholders[question.field] = `[NOT PROVIDED: ${question.field}]`
        if (['components', 'steps', 'relationships'].includes(question.field)) facts[question.field] = []
        else facts[question.field] = 'UNKNOWN'
      } else {
        if ((question.field === 'components' || question.field === 'relationships') && latestText.trim().split(/\s+/).length < 4 && !session.inFollowUp) {
          return {
            action: 'ASK_QUESTION', drafting_status: 'INFORMATION_GATHERING', document_family: 'patent-drawings-instructions',
            readiness: state.readiness.readiness,
            single_question: { question_id: `${question.question_id}_followup`, field: question.field, question: 'Could you name the specific supported components/steps and their order, without adding anything undisclosed?', reason: 'Avoids decorative or invented drawing content.', is_follow_up: true },
            question: { question_id: `${question.question_id}_followup`, field: question.field, question: 'Could you name the specific supported components/steps and their order, without adding anything undisclosed?' },
            questions: [{ question_id: `${question.question_id}_followup`, field: question.field, question: 'Could you name the specific supported components/steps and their order, without adding anything undisclosed?' }],
            session: { ...baseSession, inFollowUp: true },
          }
        }
        facts[question.field] = coerceAnswer(question.field, latestText)
        if (question.field === 'components' && !facts.invention_type) {
          const inferred = inferInventionType(latestText)
          if (DRAWING_INVENTION_TYPES.includes(inferred)) facts.invention_type = inferred
        }
      }
      state = rebuildDrawingState(facts, { ...baseSession, figurePlan: state.figures })
      facts = state.facts
    }
  }

  const readiness = state.readiness.readiness
  if (readiness === DRAWING_READINESS.READY_FOR_INSTRUCTIONS && !session.confirmedReady) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION', drafting_status: 'CONFIRMATION_REQUIRED', document_family: 'patent-drawings-instructions',
      readiness, message: summarizeForConfirmation(state),
      session: { ...baseSession, figurePlan: state.figures, numeralRegistry: state.numeralRegistry, currentQuestionId: null, awaitingConfirmation: true, confirmedReady: true, questionHistory },
      facts, flags,
    }
  }

  const next = selectNextQuestion(facts, state, questionHistory)
  if (!next) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION', drafting_status: 'CONFIRMATION_REQUIRED', document_family: 'patent-drawings-instructions',
      readiness, message: summarizeForConfirmation(state),
      session: { ...baseSession, figurePlan: state.figures, numeralRegistry: state.numeralRegistry, currentQuestionId: null, awaitingConfirmation: true, questionHistory },
      facts, flags,
    }
  }

  let intro = ''
  if (!currentQuestionId && isInstructionRequest) {
    intro = `Absolutely. I can help prepare the drawing instructions.\n\nI’ll first use the specification, claims and any existing figures in this matter so I don’t ask you for information you’ve already provided.\n\n`
  }
  const single = { ...next, question: `${intro}${next.question}`, raw_question: next.question }
  return {
    action: 'ASK_QUESTION', drafting_status: 'INFORMATION_GATHERING', document_family: 'patent-drawings-instructions',
    readiness, single_question: single, question: single, questions: [single],
    session: { ...baseSession, figurePlan: state.figures, numeralRegistry: state.numeralRegistry, currentQuestionId: next.question_id, questionHistory: [...questionHistory, next.question_id], inFollowUp: false, awaitingConfirmation: false },
    known_facts: facts, jurisdiction: facts.jurisdiction_context,
  }
}







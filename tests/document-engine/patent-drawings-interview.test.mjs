import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  evaluateDrawingInstructionsStep,
  isAffirmativeConfirmation,
  isSkipOrUnknown,
  assertDrawingConfidentiality,
} from '../../src/lib/patent-drawings-interview-graph.js'

import {
  proposeFigurePlan,
  allocateReferenceNumerals,
  assignNumeralsToFigures,
  analyzeFigureGaps,
  checkTerminologyConsistency,
  detectImageSpecConflict,
  applyFigureEdit,
  analyzeDrawingChangeImpact,
  assembleDrawingInstructionPackage,
  getFormalDrawingRequirements,
  isFormalDesignDrawingRequest,
  isPatentDrawingInstructionRequest,
} from '../../src/lib/patent-drawings-model.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

test('routing patterns: drawing-instruction requests resolve to document #012', () => {
  const phrases = [
    'prepare patent drawing instructions',
    'write instructions for patent figures',
    'tell the illustrator what to draw',
    'prepare figure instructions',
    'what drawings do I need for this patent?',
  ]
  for (const phrase of phrases) {
    assert.equal(resolveDocumentFamily(phrase), 'patent-drawings-instructions', phrase)
  }
  assert.equal(isPatentDrawingInstructionRequest('generate the actual patent drawing'), false)
  assert.equal(isPatentDrawingInstructionRequest('draft the patent specification'), false)
  assert.equal(isFormalDesignDrawingRequest('I need seven formal views showing the ornamental design of a new bottle'), true)
})

test('profile: canonical document #012 metadata distinguishes instructions from drawings', async () => {
  const profile = await loadDocumentProfile('patent-drawings-instructions')
  assert.equal(profile.document_number, '012')
  assert.equal(profile.family, 'PATENT_DRAWINGS')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.match(profile.description, /not the final patent drawings/i)
})

test('interview-first: drawing request asks exactly one Figure 1 question', () => {
  const result = evaluateDrawingInstructionsStep({ session: {}, latestMessage: 'Prepare patent drawing instructions.', matterContext: {} })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
  assert.equal(result.single_question.field, 'figure_one_focus')
  assert.match(result.single_question.question, /Figure 1 should communicate/)
})

test('turn-taking: Figure 1 focus advances to the next single question', () => {
  const step1 = evaluateDrawingInstructionsStep({ session: {}, latestMessage: 'Prepare patent drawing instructions.', matterContext: {} })
  const step2 = evaluateDrawingInstructionsStep({ session: step1.session, latestMessage: 'Figure 1 should show the sensor, processor, and controller arrangement.', matterContext: {} })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.questions.length, 1)
  assert.equal(step2.session.facts.figure_one_focus.includes('sensor'), true)
})

test('matter-first: known title is reused and not asked again', () => {
  const result = evaluateDrawingInstructionsStep({
    session: {},
    latestMessage: 'Prepare drawing instructions.',
    matterContext: { matter: { title: 'Smart Valve Controller', jurisdictions: ['US'] } },
  })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.notEqual(result.single_question.field, 'invention_title')
  assert.ok(!/working title|invention called/i.test(result.single_question.question))
})

test('readiness gate: summary precedes final package and requires confirmation', () => {
  const completeFacts = {
    invention_title: 'Sensing Control Unit',
    invention_type: 'SYSTEM',
    workflow_mode: 'NEW_DRAWING_INSTRUCTIONS',
    jurisdiction_context: 'US',
    figure_one_focus: 'Overall sensing-to-control arrangement',
    components: ['sensing unit', 'processing module', 'output controller'],
    relationships: ['sensing unit communicates input data to processing module'],
  }
  const prompt = evaluateDrawingInstructionsStep({ session: { facts: completeFacts }, latestMessage: 'Additional context supplied.', matterContext: {} })
  assert.equal(prompt.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.match(prompt.message, /Would you like me to proceed/)
  const draft = evaluateDrawingInstructionsStep({ session: prompt.session, latestMessage: 'Yes, proceed.', matterContext: {} })
  assert.equal(draft.action, 'DRAFT')
  assert.match(draft.instruction_package, /PATENT_DRAWINGS_INSTRUCTIONS, not FINAL_DRAWINGS/)
  assert.match(draft.instruction_package, /Reference numeral index/)
  assert.equal(isAffirmativeConfirmation('Yes, proceed.'), true)
  assert.equal(isSkipOrUnknown('I don’t know yet'), true)
})

test('numerals: deterministic allocation preserves existing approved numbers', () => {
  const allocation = allocateReferenceNumerals({
    components: ['sensor', 'processor'],
    existingNumerals: [{ term: 'controller', numeral: '120' }],
  })
  const numerals = new Map(allocation.registry.map((entry) => [entry.preferred_term, entry.reference_numeral]))
  assert.equal(numerals.get('controller'), '120')
  assert.equal(numerals.get('sensor'), '130')
  assert.equal(numerals.get('processor'), '140')
})

test('figures: simple invention does not get decorative figures', () => {
  const plan = proposeFigurePlan({
    invention_title: 'Sensing Control Unit',
    invention_type: 'SYSTEM',
    components: ['sensing unit', 'processing module'],
    steps: ['receive input', 'generate control signal'],
  })
  assert.equal(plan.figures.length, 2)
  assert.ok(plan.figures.every((figure) => figure.necessity !== 'REDUNDANT'))
})

test('gaps: claimed actuator missing from FIG. 1 is identified without legal conclusions', () => {
  const figures = [{ display_number: 'FIG. 1', components: [{ term: 'sensor' }, { term: 'processor' }], relationships: [] }]
  const gaps = analyzeFigureGaps({ claimedFeatures: ['sensor', 'processor', 'actuator'], figures })
  assert.ok(gaps.some((gap) => gap.code === 'CLAIMED_FEATURE_NOT_SHOWN' && gap.feature === 'actuator'))
  assert.match(gaps.find((gap) => gap.feature === 'actuator').detail, /does not by itself establish/)
})

test('terminology: processor instruction conflicts with controller specification', () => {
  const conflicts = checkTerminologyConsistency({ instruction_terms: ['processor'], specification_terms: ['controller'], claim_terms: ['controller'] })
  assert.ok(conflicts.some((conflict) => conflict.code === 'TERM_CONFLICT'))
})

test('images: only visible sketch features are captured', () => {
  const plan = proposeFigurePlan({
    invention_title: 'Sketched Housing',
    invention_type: 'MECHANICAL',
    source_assets: [{ asset_id: 'sketch-1', kind: 'SKETCH', visible_features: ['housing', 'sensor', 'display'] }],
  })
  const pkg = assembleDrawingInstructionPackage({ facts: plan.facts, figures: plan.figures, numeralRegistry: [] })
  assert.ok(pkg.includes('housing') && pkg.includes('sensor') && pkg.includes('display'))
  assert.ok(!pkg.includes('battery') && !pkg.includes('wireless module'))
})

test('images: specification/image sensor-count mismatch is flagged, not resolved silently', () => {
  const conflicts = detectImageSpecConflict({ imageCounts: { sensor: 1 }, specificationCounts: { sensor: 2 } })
  assert.ok(conflicts.some((conflict) => conflict.code === 'IMAGE_SPEC_CONFLICT'))
})

test('locks: locked FIG. 1 is preserved while FIG. 4 is revised', () => {
  const locked = { figure_id: 'fig-1', display_number: 'FIG. 1', title: 'Locked system view', version: 2, lock: 'USER_LOCKED', history: [] }
  const unlocked = { figure_id: 'fig-4', display_number: 'FIG. 4', title: 'Detail view', version: 1, lock: 'UNLOCKED', history: [] }
  const lockedAttempt = applyFigureEdit(locked, { title: 'Changed' }, 'Attempt locked edit')
  const unlockedAttempt = applyFigureEdit(unlocked, { title: 'Updated detail view' }, 'Update FIG. 4')
  assert.equal(lockedAttempt.updated, false)
  assert.equal(unlockedAttempt.updated, true)
  assert.equal(locked.title, 'Locked system view')
  assert.equal(unlockedAttempt.figure.version, 2)
})

test('change impact: controller relocation flags affected figures and preserves locks', () => {
  const figures = [
    { display_number: 'FIG. 1', components: [{ term: 'housing' }, { term: 'controller' }], relationships: ['controller inside housing'], lock: 'USER_LOCKED' },
    { display_number: 'FIG. 2', components: [{ term: 'receive input' }], relationships: [], lock: 'UNLOCKED' },
  ]
  const impact = analyzeDrawingChangeImpact({ changedField: 'controller position', oldValue: 'controller inside housing', newValue: 'controller outside housing', figures })
  assert.equal(impact.review_flag, 'DRAWING_REVIEW_REQUIRED')
  assert.ok(impact.affected_figures.includes('FIG. 1'))
  assert.ok(impact.locked_figures_preserved.includes('FIG. 1'))
})

test('update mode: unknown update target raises an existing-figure conflict', () => {
  const plan = proposeFigurePlan({ invention_title: 'Update', invention_type: 'SYSTEM', components: ['sensor', 'processor'], update_target_figure_id: 'missing-fig' })
  assert.ok(plan.gaps.some((gap) => gap.code === 'EXISTING_FIGURE_CONFLICT'))
})

test('generation separation: actual rendering request is clarified, not rendered', () => {
  const result = evaluateDrawingInstructionsStep({ session: {}, latestMessage: 'Generate the actual patent drawing.', matterContext: {} })
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.ok((result.flags || []).includes('ACTUAL_IMAGE_GENERATION_SEPARATE'))
})

test('formal safety: undecided jurisdiction never asserts numeric sheet rules', () => {
  const formal = getFormalDrawingRequirements({ jurisdictionContext: 'UNDECIDED', verifiedAuthority: null })
  const pkg = assembleDrawingInstructionPackage({ facts: {}, figures: [], numeralRegistry: [], formalRequirements: formal })
  assert.equal(formal.status, 'UNVERIFIED')
  assert.ok(formal.review_flags.includes('FORMAL_RULE_VERIFICATION_REQUIRED'))
  assert.ok(!/\b\d+(\.\d+)?\s*(mm|cm|inch|inches)\b/i.test(pkg))
})

test('security: confidential drawing matter fails closed for free providers', () => {
  assert.throws(
    () => assertDrawingConfidentiality({ engines: [{ slug: 'contributor/free-drawing-model:free' }], mode: 'CONFIDENTIAL_IP', env: {} }),
    (error) => {
      assert.match(error.message, /fail-closed/i)
      assert.equal(error.drawing_flag, 'CONFIDENTIAL_PILOT_BLOCKED')
      return true
    }
  )
})

test('export: instruction package produces a clean markdown export payload', () => {
  const payload = buildExportPayload({ title: 'Patent Drawings Instructions', content: '# Patent Drawings Instructions\n\nBody.' }, 'md')
  assert.equal(payload.format, 'md')
  assert.equal(payload.title, 'Patent Drawings Instructions')
  assert.ok(payload.content.startsWith('# Patent Drawings Instructions'))
})

test('voice continuity: session, matter, document, and instruction-set IDs persist', () => {
  const step1 = evaluateDrawingInstructionsStep({
    session: { draftSessionId: 'draft-session-1' },
    latestMessage: 'Prepare patent drawing instructions.',
    matterContext: { matter: { id: 'matter-1' } },
  })
  const step2 = evaluateDrawingInstructionsStep({ session: step1.session, latestMessage: 'Figure 1 shows the valve and controller.', matterContext: { matter: { id: 'matter-1' } } })
  assert.equal(step2.session.draftSessionId, 'draft-session-1')
  assert.equal(step2.session.matterId, 'matter-1')
  assert.equal(step2.session.documentId, 'patent-drawings-instructions')
  assert.equal(step2.session.drawingInstructionSetId, step1.session.drawingInstructionSetId)
})

test('numeral registry: assigned figures record first-figure provenance', () => {
  const allocation = allocateReferenceNumerals({ components: ['sensor', 'processor'], existingNumerals: [] })
  const figures = assignNumeralsToFigures([{ display_number: 'FIG. 1', components: [{ term: 'sensor' }, { term: 'processor' }] }], allocation.registry)
  assert.equal(figures[0].reference_numerals.length, 2)
  assert.equal(allocation.registry[0].first_figure, 'FIG. 1')
})

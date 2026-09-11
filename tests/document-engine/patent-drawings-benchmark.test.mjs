import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  proposeFigurePlan,
  allocateReferenceNumerals,
  assignNumeralsToFigures,
  analyzeFigureGaps,
  buildClaimFigureMap,
  detectNumeralConflicts,
  checkTerminologyConsistency,
  assessDrawingReadiness,
  applyFigureEdit,
  analyzeDrawingChangeImpact,
  assembleDrawingInstructionPackage,
  getFormalDrawingRequirements,
} from '../../src/lib/patent-drawings-model.js'

import { evaluateDrawingInstructionsStep } from '../../src/lib/patent-drawings-interview-graph.js'

const benchmarkPath = path.resolve(
  process.cwd(),
  'benchmarks',
  'document-intelligence-v1',
  'patent-drawings-instructions',
  'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

function runPlan(inputs) {
  const plan = proposeFigurePlan(inputs)
  const componentTerms = [...plan.facts.components]
  for (const figure of plan.figures) for (const component of figure.components || []) componentTerms.push(component.term)
  const allocation = allocateReferenceNumerals({ components: componentTerms, existingNumerals: plan.facts.numeral_mentions || [] })
  const figures = assignNumeralsToFigures(plan.figures, allocation.registry)
  const pkg = assembleDrawingInstructionPackage({
    matter: { title: plan.facts.invention_title },
    facts: plan.facts,
    figures,
    numeralRegistry: allocation.registry,
    jurisdictionContext: plan.facts.jurisdiction_context,
    workflowMode: plan.facts.workflow_mode,
  })
  const readiness = assessDrawingReadiness({ facts: plan.facts, figures, numeralConflicts: allocation.conflicts, terminologyConflicts: [], gaps: plan.gaps })
  return { plan, figures, registry: allocation.registry, conflicts: allocation.conflicts, pkg, readiness: readiness.readiness }
}

function assertRequired(pkg, terms = []) {
  for (const term of terms) assert.ok(pkg.includes(term), `Expected package to include supported term "${term}"`)
}

function assertForbidden(pkg, terms = []) {
  for (const term of terms) assert.ok(!pkg.toLowerCase().includes(term.toLowerCase()), `Package must not invent "${term}"`)
}

test('benchmark: all patent drawing instruction cases pass', () => {
  assert.equal(benchmark.document_id, 'patent-drawings-instructions')
  for (const tc of benchmark.cases) {
    if (tc.harness === 'figure-plan') {
      const result = runPlan(tc.inputs)
      assert.equal(result.figures.length, tc.expected.figure_count)
      assert.equal(result.figures[0].purpose, tc.expected.first_purpose)
      assert.equal(result.readiness, tc.expected.readiness)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'method-flow') {
      const result = runPlan(tc.inputs)
      const flowchart = result.figures.find((figure) => figure.purpose === 'method flowchart')
      assert.ok(flowchart, 'Method flowchart must be proposed from supported steps')
      assert.deepEqual(flowchart.components.map((item) => item.term), tc.expected.flowchart_steps)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'mechanical-views') {
      const result = runPlan(tc.inputs)
      assert.ok(result.figures.some((figure) => figure.figure_type === 'perspective view') === tc.expected.has_perspective)
      assert.ok(result.figures.some((figure) => figure.figure_type === 'exploded view') === tc.expected.has_exploded)
      assert.equal(result.figures.some((figure) => /cross-section/.test(figure.figure_type)), tc.expected.has_cross_section)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'exploded-order') {
      const result = runPlan(tc.inputs)
      assert.ok(result.figures.some((figure) => figure.figure_type === 'exploded view'), 'Exploded view must be proposed')
      assertRequired(result.pkg, tc.expected.required_terms)
    }
    if (tc.harness === 'cross-section') {
      const pkg = assembleDrawingInstructionPackage({ facts: {}, figures: tc.inputs.figures, numeralRegistry: [] })
      assert.ok(pkg.includes(tc.expected.review_flag), 'Missing cross-section detail must be flagged, not invented')
      assertForbidden(pkg, tc.expected.forbidden_terms)
    }
    if (['software-architecture', 'ai-pipeline', 'electronics-block', 'medical-device'].includes(tc.harness)) {
      const result = runPlan(tc.inputs)
      assertRequired(result.pkg, tc.expected.required_terms)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'chemical-process') {
      const result = runPlan(tc.inputs)
      assert.ok(result.figures.some((figure) => (figure.review_flags || []).includes(tc.expected.review_flag)), 'Chemical apparatus needs specialist review')
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (['existing-sketch', 'product-photo'].includes(tc.harness)) {
      const result = runPlan(tc.inputs)
      assertRequired(result.pkg, tc.expected.required_terms)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'hidden-structure') {
      const result = runPlan(tc.inputs)
      assert.equal(result.figures.some((figure) => /cross-section/.test(figure.figure_type)), tc.expected.has_cross_section)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'numeral-conflict' || tc.harness === 'same-component-numerals') {
      const allocation = allocateReferenceNumerals({ components: [], existingNumerals: tc.inputs.existing_numerals })
      assert.ok(allocation.conflicts.some((conflict) => conflict.code === tc.expected.conflict), `Expected ${tc.expected.conflict}`)
    }
    if (tc.harness === 'missing-claimed-feature') {
      const gaps = analyzeFigureGaps({ claimedFeatures: tc.inputs.claimed_features, figures: tc.inputs.figures })
      const claimMap = buildClaimFigureMap({ claimedFeatures: tc.inputs.claimed_features, figures: tc.inputs.figures })
      assert.ok(gaps.some((gap) => gap.code === tc.expected.gap && gap.feature === tc.expected.missing_feature))
      assert.equal(claimMap.find((row) => row.limitation === tc.expected.missing_feature).status, tc.expected.claim_status)
    }
    if (tc.harness === 'alternative-embodiments') {
      const result = runPlan(tc.inputs)
      const alternative = result.figures.find((figure) => figure.figure_type === 'alternative embodiment')
      assert.ok(alternative, 'Supported alternatives need a separate embodiment view')
      assertRequired(result.pkg, tc.expected.required_terms)
      assertForbidden(result.pkg, tc.expected.forbidden_terms)
    }
    if (tc.harness === 'claim-change-impact') {
      const impact = analyzeDrawingChangeImpact({ changedField: tc.inputs.changed_field, oldValue: tc.inputs.old_value, newValue: tc.inputs.new_value, figures: tc.inputs.figures })
      assert.equal(impact.review_flag, tc.expected.review_flag)
      assert.ok(impact.affected_figures.includes(tc.expected.affected_figure))
      assert.ok(impact.locked_figures_preserved.includes(tc.expected.locked_preserved))
    }
    if (tc.harness === 'terminology') {
      const conflicts = checkTerminologyConsistency(tc.inputs)
      assert.ok(conflicts.some((conflict) => conflict.code === tc.expected.conflict))
    }
    if (tc.harness === 'figure-lock') {
      const lockedAttempt = applyFigureEdit(tc.inputs.locked_figure, { title: 'Changed locked title' }, 'Attempt locked edit')
      assert.equal(lockedAttempt.updated, false)
      assert.equal(lockedAttempt.reason, tc.expected.locked_reason)
      const unlockedAttempt = applyFigureEdit(tc.inputs.unlocked_figure, { title: 'Updated detail view' }, 'Update FIG. 4')
      assert.equal(unlockedAttempt.updated, tc.expected.unlocked_updated)
      assert.equal(tc.inputs.locked_figure.title, 'Locked system view')
    }
    if (tc.harness === 'design-misrouting') {
      const result = evaluateDrawingInstructionsStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action)
      assert.equal(result.document_family, tc.expected.document_family)
    }
    if (tc.harness === 'formal-rule-safety') {
      const formal = getFormalDrawingRequirements(tc.inputs)
      assert.equal(formal.status, tc.expected.status)
      assert.ok(formal.review_flags.includes(tc.expected.review_flag))
      const pkg = assembleDrawingInstructionPackage({ facts: {}, figures: [], numeralRegistry: [], formalRequirements: formal })
      assert.ok(pkg.includes('No verified jurisdiction-specific drawing authority was supplied'))
      assert.ok(!/\b\d+(\.\d+)?\s*(mm|cm|inch|inches)\b/i.test(pkg), 'Formal package must not assert numeric drawing-sheet values')
    }
    if (tc.harness === 'existing-matter') {
      const result = evaluateDrawingInstructionsStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: tc.inputs.matter_context })
      assert.equal(result.action, tc.expected.action)
      assert.equal(result.single_question.field, tc.expected.first_question_field)
      assert.ok(!/working title|invention called/i.test(result.single_question.question), 'Must not ask the user to redescribe known matter')
    }
    if (tc.harness === 'insufficient-context') {
      const result = evaluateDrawingInstructionsStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action)
      assert.equal(result.questions.length, tc.expected.question_count)
      assert.equal(result.single_question.field, tc.expected.first_question_field)
      assert.equal((result.session.figurePlan || []).length, tc.expected.invented_figures)
    }
  }
})

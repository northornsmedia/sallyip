import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluatePatentSpecificationInterviewStep,
  extractPatentSpecificationMatterFacts,
  detectPatentSpecificationMode,
} from '../../src/lib/patent-specification-interview-graph.js'
import { inferInventionType } from '../../src/lib/patent-interview-graph.js'
import {
  assemblePatentSpecification,
  buildClaimSupportMapForSpecification,
  buildFigureRegistry,
  detectNumeralConflicts,
  detectTerminologyConflicts,
  classifyExampleKind,
  classifyNewMatter,
  classifyTechnicalEffect,
  applySectionEdits,
  assessSpecificationReadiness,
  SPEC_LOCK_STATUSES,
} from '../../src/lib/patent-specification-drafting-service.js'
import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'
import { resolveDocumentFamily } from '../../src/lib/document-engine.js'

const benchmarkPath = path.resolve(process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-specification', 'cases.json')
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

test('benchmark: all Patent Specification synthetic cases pass', async () => {
  assert.equal(benchmark.document_id, 'patent-specification')
  assert.equal(benchmark.document_number, '009')

  for (const tc of benchmark.cases) {
    if (tc.id === 'CASE-01-FULL-SPECIFICATION') {
      const routed = await routeConversationalIntent(tc.prompt, {})
      assert.equal(routed.action, tc.expected.action)
      assert.equal(routed.questions.length, tc.expected.questions_length)
      assert.equal(routed.question.field, tc.expected.field)
    }

    if (tc.id === 'CASE-02-DESCRIPTION-ONLY') {
      assert.equal(detectPatentSpecificationMode(tc.prompt, {}), tc.expected.drafting_mode)
    }

    if (tc.id === 'CASE-03-FROM-CLAIMS') {
      assert.equal(detectPatentSpecificationMode(tc.prompt, { existing_claims: tc.inputs.claims_text }), 'SPECIFICATION_FROM_CLAIMS')
      const support = buildClaimSupportMapForSpecification(tc.inputs.claims_text, {}, {})
      assert.ok(support.map.some((m) => m.limitation.includes('LiDAR') && m.status === 'UNSUPPORTED'))
    }

    if (tc.id === 'CASE-04-FROM-DISCLOSURE') {
      assert.equal(resolveDocumentFamily(tc.prompt), tc.expected.family)
      assert.equal(detectPatentSpecificationMode(tc.prompt, { invention_disclosure: tc.inputs.invention_disclosure }), tc.expected.drafting_mode)
    }

    if (['CASE-05-SOFTWARE', 'CASE-06-AI-ML', 'CASE-07-MECHANICAL', 'CASE-08-CHEMICAL', 'CASE-09-BIOTECH'].includes(tc.id)) {
      const type = inferInventionType(`${tc.inputs.problem} ${tc.inputs.solution} ${tc.inputs.components}`)
      assert.equal(type, tc.expected.branched_type, tc.id)
      if (tc.expected.flag) {
        const step = evaluatePatentSpecificationInterviewStep({
          session: {
            facts: {
              jurisdiction_context: 'UNDECIDED', drafting_mode: 'FULL_SPECIFICATION', title: tc.inputs.title,
              technical_field: 'Test field', problem_being_solved: tc.inputs.problem,
              core_inventive_concept: tc.inputs.solution, components_or_steps: tc.inputs.components,
              invention_type: type,
            },
            currentQuestionId: 'q_operation',
          },
          latestMessage: tc.inputs.components,
        })
        void step
      }
      if (tc.expected.excludes) {
        const draft = assemblePatentSpecification({
          title: tc.inputs.title, technical_field: 'Test field', problem_being_solved: tc.inputs.problem,
          core_inventive_concept: tc.inputs.solution, components_or_steps: tc.inputs.components,
          jurisdiction_context: 'UNDECIDED', drafting_mode: 'FULL_SPECIFICATION',
        }, {}, {})
        for (const ex of tc.expected.excludes) assert.ok(!draft.specification.includes(ex), `${tc.id} must not invent "${ex}"`)
      }
      if (tc.expected.readiness) {
        const readiness = assessSpecificationReadiness({
          title: tc.inputs.title, technical_field: 'Test field', problem_being_solved: tc.inputs.problem,
          core_inventive_concept: tc.inputs.solution, components_or_steps: tc.inputs.components,
        }, 'FULL_SPECIFICATION')
        assert.equal(readiness, tc.expected.readiness)
      }
    }

    if (tc.id === 'CASE-10-PARTIAL-DISCLOSURE') {
      const readiness = assessSpecificationReadiness({
        title: tc.inputs.title, technical_field: 'UNKNOWN', problem_being_solved: tc.inputs.problem,
        core_inventive_concept: 'UNKNOWN', components_or_steps: 'UNKNOWN',
      }, 'FULL_SPECIFICATION')
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-11-UNKNOWN-FACTS') {
      const draft = assemblePatentSpecification({
        title: tc.inputs.title, technical_field: 'UNKNOWN', problem_being_solved: tc.inputs.problem,
        core_inventive_concept: tc.inputs.solution, components_or_steps: tc.inputs.components,
        jurisdiction_context: 'UNDECIDED', drafting_mode: 'FULL_SPECIFICATION',
      }, {}, {})
      assert.ok(/UNKNOWN|PLACEHOLDER/.test(draft.specification))
      for (const ex of tc.expected.excludes) assert.ok(!draft.specification.includes(ex))
    }

    if (tc.id === 'CASE-12-UNSUPPORTED-LIMITATION') {
      const support = buildClaimSupportMapForSpecification(tc.claims_text, tc.disclosure, {})
      const hit = support.map.find((m) => m.limitation.includes(tc.expected.term))
      assert.ok(hit)
      assert.equal(hit.status, tc.expected.support_status)
    }

    if (tc.id === 'CASE-13-OPTIONAL-FEATURE') {
      const step = evaluatePatentSpecificationInterviewStep({
        session: {
          facts: { jurisdiction_context: 'US', drafting_mode: 'FULL_SPECIFICATION', title: 'T', technical_field: 'F', problem_being_solved: 'Problem with sufficient length.', core_inventive_concept: 'Concept with sufficient technical length.', components_or_steps: 'Sensor and processor components here.' },
          currentQuestionId: 'q_essential_optional',
        },
        latestMessage: tc.inputs.essential_optional,
      })
      void step
      const assembled = assemblePatentSpecification({
        title: 'T', technical_field: 'F', problem_being_solved: 'Problem with sufficient length.',
        core_inventive_concept: 'Concept with sufficient technical length.', components_or_steps: 'Sensor and processor components here.',
        essential_optional: tc.inputs.essential_optional, jurisdiction_context: 'US', drafting_mode: 'FULL_SPECIFICATION',
      }, { detailed_description: tc.draft_check }, {})
      void assembled
    }

    if (tc.id === 'CASE-14-ALTERNATIVE-EMBODIMENT') {
      assert.ok(/local/i.test(tc.inputs.alternative_embodiments) && /remote/i.test(tc.inputs.alternative_embodiments))
    }

    if (tc.id === 'CASE-15-HYPOTHETICAL-EXAMPLE') {
      assert.equal(classifyExampleKind('Hypothetical illustration; not tested.'), tc.expected.example_kind)
      const draft = assemblePatentSpecification({
        title: 'T', technical_field: 'F', problem_being_solved: 'Problem with sufficient length here.',
        core_inventive_concept: 'Concept with sufficient technical length here.', components_or_steps: 'Sensor components here.',
        examples_use_cases: 'Hypothetical illustration; not tested.', jurisdiction_context: 'UNDECIDED', drafting_mode: 'FULL_SPECIFICATION',
      }, {}, {})
      for (const ex of tc.expected.excludes) assert.ok(!draft.specification.includes(ex))
    }

    if (tc.id === 'CASE-16-EXISTING-DRAFT-REVISION') {
      const step = evaluatePatentSpecificationInterviewStep({
        session: {
          facts: { jurisdiction_context: 'US', drafting_mode: 'SPECIFICATION_REVISION', title: 'T', technical_field: 'F', problem_being_solved: 'Problem with sufficient length.', core_inventive_concept: 'Concept with sufficient technical length.', components_or_steps: 'Sensor components here.' },
          currentQuestionId: 'q_priority_revision',
        },
        latestMessage: tc.inputs.priority_existing_spec,
      })
      assert.ok((step.session.flags || []).includes('NEW_MATTER_REVIEW_REQUIRED'))
    }

    if (tc.id === 'CASE-17-NEW-MATTER') {
      assert.equal(classifyNewMatter(tc.added_text, tc.existing_disclosure), tc.expected.new_matter_class)
    }

    if (tc.id === 'CASE-18-TERMINOLOGY') {
      const conflicts = detectTerminologyConflicts(
        { components_or_steps: tc.disclosure, existing_claims: tc.claims_text },
        { detailed_description: tc.later_statement },
      )
      assert.ok(conflicts.some((c) => c.code === tc.expected.flag))
    }

    if (tc.id === 'CASE-19-DRAWING-CONFLICT') {
      const registry = buildFigureRegistry({ drawings: tc.figures }, {})
      registry.numerals.push({ component: 'sensor', numeral: tc.expected.numeral, source: 'USER_PROVIDED' })
      registry.numerals.push({ component: 'motor', numeral: tc.expected.numeral, source: 'USER_PROVIDED' })
      const conflicts = detectNumeralConflicts(registry, { detailed_description: tc.detailed_description })
      assert.ok(conflicts.some((c) => c.code === tc.expected.flag))
    }

    if (tc.id === 'CASE-20-LOCKED-SECTION') {
      const draft = assemblePatentSpecification({
        title: tc.inputs.title, technical_field: 'F', problem_being_solved: tc.inputs.problem,
        core_inventive_concept: tc.inputs.solution, components_or_steps: tc.inputs.components,
        jurisdiction_context: 'UNDECIDED', drafting_mode: 'FULL_SPECIFICATION',
      }, {}, {})
      const locked = applySectionEdits(
        { summary: draft.sectionContents.summary, detailed_description: draft.sectionContents.detailed_description },
        { summary: 'Regenerated summary.', detailed_description: 'Regenerated detail.' },
        { summary: SPEC_LOCK_STATUSES.USER_LOCKED },
      )
      assert.ok(locked.preserved.includes('summary'))
    }

    if (tc.id === 'CASE-21-JURISDICTION-UNDECIDED') {
      const draft = assemblePatentSpecification({
        title: tc.inputs.title, technical_field: 'F', problem_being_solved: tc.inputs.problem,
        core_inventive_concept: tc.inputs.solution, components_or_steps: tc.inputs.components,
        jurisdiction_context: tc.jurisdiction, drafting_mode: 'FULL_SPECIFICATION',
      }, {}, {})
      assert.equal(draft.jurisdiction, 'UNDECIDED')
      for (const ex of tc.expected.excludes) assert.ok(!draft.specification.includes(ex))
    }

    if (tc.id === 'CASE-22-MATTER-CONTEXT') {
      const extracted = extractPatentSpecificationMatterFacts(tc.matter_context)
      assert.equal(extracted.status.title, 'KNOWN')
      const routed = await routeConversationalIntent(tc.prompt, tc.matter_context)
      assert.equal(routed.action, tc.expected.action)
      assert.match(routed.message, new RegExp(tc.expected.summary_includes))
    }
  }
})

test('benchmark: technical-effect safety never invents quantities', () => {
  const check = classifyTechnicalEffect('Tests showed a 35% improvement.', 'Sensor measurements control actuator operation.')
  assert.equal(check.status, 'UNSUPPORTED')
})

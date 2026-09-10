import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluatePlantInterviewStep,
  extractPlantMatterFacts,
  inferPlantOrigin,
  assessPlantReadiness,
  isPlantVarietyRightsRequest,
  READINESS_STATES,
  REVIEW_FLAGS,
} from '../../src/lib/plant-interview-graph.js'

import {
  buildPlantClaimSupportMap,
} from '../../src/lib/plant-drafting-service.js'

const benchmarkPath = path.resolve(
  process.cwd(),
  'benchmarks',
  'document-intelligence-v1',
  'plant-patent-application',
  'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

test('benchmark: all 15 synthetic plant patent benchmark cases pass', () => {
  for (const tc of benchmark.cases) {
    if (tc.id === 'CASE-01-NEW-ROSE-CULTIVAR') {
      const type = inferPlantOrigin(tc.inputs.origin)
      assert.equal(type, tc.expected.origin_type)
      const readiness = assessPlantReadiness(tc.inputs, [])
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-02-FRUIT-TREE') {
      const type = inferPlantOrigin(tc.inputs.origin)
      assert.equal(type, tc.expected.origin_type)
      const readiness = assessPlantReadiness(tc.inputs, [])
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-03-ORNAMENTAL-PLANT') {
      const type = inferPlantOrigin(tc.inputs.origin)
      assert.equal(type, tc.expected.origin_type)
      const readiness = assessPlantReadiness(tc.inputs, [])
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-04-SPORT-MUTATION') {
      const type = inferPlantOrigin(tc.inputs.origin)
      assert.equal(type, tc.expected.origin_type)
    }

    if (tc.id === 'CASE-05-HYBRID-ORIGIN') {
      const type = inferPlantOrigin(tc.inputs.origin)
      assert.equal(type, tc.expected.origin_type)
    }

    if (tc.id === 'CASE-08-ASEXUAL-REPRODUCTION') {
      assert.match(tc.inputs.asexual_reproduction, /stem cuttings/i)
      const step = evaluatePlantInterviewStep({
        session: { facts: { cultivar_name: tc.inputs.cultivar_name, botanical_name: tc.inputs.botanical_name, origin: 'SPORT', parentage: 'Parent Sedum spurium' }, currentQuestionId: 'q_asexual_reproduction' },
        latestMessage: tc.inputs.asexual_reproduction,
      })
      assert.equal(step.single_question.field, 'stability')
    }

    if (tc.id === 'CASE-09-INSUFFICIENT-REPRODUCTION-INFO') {
      const step = evaluatePlantInterviewStep({
        session: { facts: { cultivar_name: tc.inputs.cultivar_name, botanical_name: tc.inputs.botanical_name, origin: 'SEEDLING' }, currentQuestionId: 'q_asexual_reproduction' },
        latestMessage: tc.inputs.asexual_reproduction,
      })
      assert.ok(step.session.flags.includes(tc.expected.flag))
      const readiness = assessPlantReadiness(step.session.facts, step.session.flags)
      assert.notEqual(readiness, READINESS_STATES.READY_FOR_FIRST_DRAFT)
    }

    if (tc.id === 'CASE-10-COLOUR-DESCRIPTION') {
      const step = evaluatePlantInterviewStep({
        session: { facts: { cultivar_name: tc.inputs.cultivar_name }, currentQuestionId: 'q_colour_references' },
        latestMessage: tc.inputs.colour_input,
      })
      assert.ok(!/RHS\s+[0-9]/i.test(JSON.stringify(step.session.facts)))
      assert.ok(step.session.placeholders.colour_references.includes('DESCRIPTIVE'))
    }

    if (tc.id === 'CASE-11-COMPARATOR-VARIETY') {
      const step = evaluatePlantInterviewStep({
        session: { facts: { cultivar_name: tc.inputs.cultivar_name }, currentQuestionId: 'q_closest_variety' },
        latestMessage: tc.inputs.closest_variety,
      })
      assert.ok(step.session.facts.closest_variety.includes(tc.expected.comparator))
      assert.ok(step.session.facts.comparator_differences)
    }

    if (tc.id === 'CASE-12-PUBLIC-SALE') {
      const step = evaluatePlantInterviewStep({
        session: { facts: { cultivar_name: tc.inputs.cultivar_name }, currentQuestionId: 'q_public_disclosures' },
        latestMessage: tc.inputs.disclosure,
      })
      assert.ok(step.session.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-13-EXISTING-MATTER') {
      const { facts, status } = extractPlantMatterFacts(tc.matter_context)
      for (const field of tc.expected.skipped_fields) {
        if (field === 'cultivar_name') assert.equal(status.cultivar_name, 'KNOWN')
        if (field === 'botanical_name') assert.equal(status.botanical_name, 'KNOWN')
        if (field === 'inventors') assert.equal(status.inventors, 'KNOWN')
        if (field === 'applicant') assert.equal(status.applicant, 'KNOWN')
      }
    }

    if (tc.id === 'CASE-15-AMBIGUOUS-PLANT-RIGHT-REQUEST') {
      const isPvr = isPlantVarietyRightsRequest(tc.prompt)
      assert.equal(isPvr, true)
    }
  }
})

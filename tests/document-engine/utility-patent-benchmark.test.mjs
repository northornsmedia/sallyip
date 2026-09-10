import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluatePatentInterviewStep,
  extractMatterFacts,
  inferInventionType,
  assessReadiness,
  READINESS_STATES,
  REVIEW_FLAGS,
} from '../../src/lib/patent-interview-graph.js'

import {
  buildClaimSupportMap,
} from '../../src/lib/patent-drafting-service.js'

const benchmarkPath = path.resolve(
  process.cwd(),
  'benchmarks',
  'document-intelligence-v1',
  'utility-patent-application',
  'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

test('benchmark: all 10 synthetic benchmark cases pass', () => {
  for (const tc of benchmark.cases) {
    if (tc.id === 'CASE-01-SOFTWARE') {
      const type = inferInventionType(tc.inputs.description)
      assert.equal(type, tc.expected.branched_type)
      const readiness = assessReadiness({
        title: tc.inputs.title,
        plain_description: tc.inputs.description,
        technical_mechanism: tc.inputs.mechanism,
        components: tc.inputs.components,
      })
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-02-MECHANICAL') {
      const type = inferInventionType(tc.inputs.mechanism)
      assert.equal(type, tc.expected.branched_type)
      const readiness = assessReadiness({
        title: tc.inputs.title,
        plain_description: tc.inputs.description,
        technical_mechanism: tc.inputs.mechanism,
        components: tc.inputs.components,
      })
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-03-AI-ML') {
      const type = inferInventionType(tc.inputs.title)
      assert.equal(type, tc.expected.branched_type)
    }

    if (tc.id === 'CASE-04-EXISTING-MATTER') {
      const { facts, status } = extractMatterFacts(tc.matter_context)
      for (const f of tc.expected.skipped_fields) {
        assert.equal(status[f], 'KNOWN', `Expected ${f} to be known from matter`)
      }
      const step = evaluatePatentInterviewStep({
        session: {},
        latestMessage: tc.prompt,
        matterContext: tc.matter_context,
      })
      assert.equal(step.single_question.field, tc.expected.first_question_field)
    }

    if (tc.id === 'CASE-06-PUBLIC-DISCLOSURE') {
      const session = {
        facts: { title: tc.inputs.title, plain_description: tc.inputs.description },
        currentQuestionId: 'q_public_disclosures',
      }
      const res = evaluatePatentInterviewStep({ session, latestMessage: tc.inputs.disclosure })
      assert.ok(res.session.flags.includes(tc.expected.flag))
      // Verify no invalidity or rights lost conclusions
      assert.ok(!JSON.stringify(res).includes('rights lost'))
      assert.ok(!JSON.stringify(res).includes('patent is invalid'))
    }

    if (tc.id === 'CASE-07-MULTIPLE-INVENTORS') {
      const session = {
        facts: { title: tc.inputs.title },
        currentQuestionId: 'q_inventors',
      }
      const res = evaluatePatentInterviewStep({
        session,
        latestMessage: tc.inputs.inventors.join(', '),
      })
      assert.ok(res.session.flags.includes(tc.expected.flag))
      assert.equal(res.session.facts.inventors.length, tc.expected.inventor_count)
    }

    if (tc.id === 'CASE-09-MISSING-INFO-SKIP') {
      const session = {
        facts: { title: tc.inputs.title },
        currentQuestionId: 'q_drawings_plan',
      }
      const res = evaluatePatentInterviewStep({ session, latestMessage: tc.inputs.drawings_answer })
      assert.equal(res.action, 'ASK_QUESTION')
      assert.equal(res.session.facts.drawings, 'UNKNOWN')
      assert.ok(res.session.placeholders.drawings)
    }

    if (tc.id === 'CASE-10-UNSUPPORTED-CLAIM-LIMITATION') {
      const res = buildClaimSupportMap(tc.claims_text, tc.spec_text, {})
      assert.equal(res.hasUnsupportedLimitations, tc.expected.has_unsupported_limitations)
      const unsupp = res.supportMap.find((m) => m.limitation.includes('cryogenic cooling jacket'))
      assert.ok(unsupp)
      assert.equal(unsupp.status, 'UNSUPPORTED')
    }
  }
})

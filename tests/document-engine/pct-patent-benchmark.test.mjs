import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluatePctInterviewStep,
  inferPriorityStatus,
  inferInventionType,
  isGlobalPatentMisconception,
  isNationalPhaseRequest,
  calculatePctDeadline,
  assessPctReadiness,
  READINESS_STATES,
  REVIEW_FLAGS,
} from '../../src/lib/pct-interview-graph.js'

import {
  buildPctClaimSupportMap,
} from '../../src/lib/pct-drafting-service.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

test('benchmark: all 17 synthetic PCT benchmark cases pass', async () => {
  const benchmarkPath = path.resolve(
    process.cwd(),
    'benchmarks',
    'document-intelligence-v1',
    'pct-international-patent-application',
    'cases.json'
  )

  const content = fs.readFileSync(benchmarkPath, 'utf8')
  const data = JSON.parse(content)
  assert.equal(data.cases.length, 17, 'Benchmark must contain exactly 17 cases')

  for (const tc of data.cases) {
    if (tc.id === 'CASE-01-FIRST-FILING-PCT') {
      const status = inferPriorityStatus(tc.inputs.priority_status_input)
      assert.equal(status, tc.expected.priority_status)
      const readiness = assessPctReadiness({
        title: tc.inputs.title,
        priority_status: status,
        problem_solution: tc.inputs.problem_solution,
        technical_features: tc.inputs.technical_features,
      }, [])
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-02-SINGLE-US-PROVISIONAL-PRIORITY') {
      const status = inferPriorityStatus(tc.inputs.priority_status_input)
      assert.equal(status, tc.expected.priority_status)
      const readiness = assessPctReadiness({
        title: tc.inputs.title,
        priority_status: status,
        problem_solution: tc.inputs.problem_solution,
        technical_features: tc.inputs.technical_features,
      }, [])
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-03-MULTIPLE-PRIORITIES') {
      const status = inferPriorityStatus(tc.inputs.priority_status_input)
      assert.equal(status, tc.expected.priority_status)
      const step1 = evaluatePctInterviewStep({
        session: { facts: {}, currentQuestionId: 'q_priority_status' },
        latestMessage: tc.inputs.priority_status_input,
      })
      const step2 = evaluatePctInterviewStep({
        session: step1.session,
        latestMessage: tc.inputs.priority_1,
      })
      const step3 = evaluatePctInterviewStep({
        session: step2.session,
        latestMessage: tc.inputs.priority_2,
      })
      assert.equal(step3.session.facts.priorities.length, tc.expected.priority_count)
    }

    if (tc.id === 'CASE-04-FOREIGN-PRIORITY') {
      const status = inferPriorityStatus(tc.inputs.priority_status_input)
      assert.equal(status, tc.expected.priority_status)
    }

    if (tc.id === 'CASE-05-SOFTWARE-INVENTION') {
      const type = inferInventionType(tc.inputs.technical_features)
      assert.equal(type, tc.expected.invention_type)
    }

    if (tc.id === 'CASE-06-AI-INVENTION') {
      const type = inferInventionType(tc.inputs.technical_features)
      assert.equal(type, tc.expected.invention_type)
    }

    if (tc.id === 'CASE-07-MECHANICAL-INVENTION') {
      const type = inferInventionType(tc.inputs.technical_features)
      assert.equal(type, tc.expected.invention_type)
    }

    if (tc.id === 'CASE-08-BIOTECH-SPECIALIST-FLAG') {
      const step = evaluatePctInterviewStep({
        session: { facts: { title: tc.inputs.title, priority_status: 'CLAIMS_PRIORITY_TO_PROVISIONAL', problem_solution: tc.inputs.problem_solution }, currentQuestionId: 'q_technical_features' },
        latestMessage: tc.inputs.technical_features,
      })
      assert.ok(step.session.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-09-MULTIPLE-APPLICANTS') {
      const step = evaluatePctInterviewStep({
        session: { facts: { title: 'Test' }, currentQuestionId: 'q_applicants' },
        latestMessage: tc.inputs.applicants_input,
      })
      assert.ok(step.session.facts.applicants.length > 1)
    }

    if (tc.id === 'CASE-10-MULTIPLE-INVENTORS') {
      const step = evaluatePctInterviewStep({
        session: { facts: { title: 'Test', applicants: [{ name: 'Test Corp' }] }, currentQuestionId: 'q_inventors' },
        latestMessage: tc.inputs.inventors_input,
      })
      assert.equal(step.session.facts.inventors.length, tc.expected.inventor_count)
    }

    if (tc.id === 'CASE-11-UNKNOWN-BIBLIOGRAPHIC-DATA') {
      const step = evaluatePctInterviewStep({
        session: { facts: { title: 'Test' }, currentQuestionId: 'q_applicants' },
        latestMessage: tc.inputs.applicants_input,
      })
      assert.ok(step.session.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-12-PUBLIC-DISCLOSURE') {
      const step = evaluatePctInterviewStep({
        session: { facts: { title: 'Test' }, currentQuestionId: 'q_public_disclosures' },
        latestMessage: tc.inputs.public_disclosure_input,
      })
      assert.ok(step.session.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-13-NEW-MATTER-AFTER-PRIORITY') {
      const step = evaluatePctInterviewStep({
        session: {
          facts: {
            title: 'Test',
            priorities: [{ priority_id: 'p1', raw_input: tc.inputs.earlier_priority }],
            problem_solution: 'Defect inspection',
          },
          currentQuestionId: 'q_technical_features',
        },
        latestMessage: tc.inputs.updated_features,
      })
      assert.ok(step.session.flags.includes(tc.expected.flag))
      assert.equal(step.session.facts.priority_support_status, tc.expected.priority_support_status)
    }

    if (tc.id === 'CASE-14-NATIONAL-PHASE-MISROUTING') {
      const res = await routeConversationalIntent(tc.inputs.user_message, {})
      assert.equal(res.action, tc.expected.action)
      assert.ok(res.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-15-DEADLINE-QUESTION') {
      const calc = calculatePctDeadline(tc.inputs.priority_date)
      assert.equal(calc.pct_filing_deadline, tc.expected.calculated_deadline)
      assert.equal(calc.national_phase_deadline_30_months, tc.expected.national_30_months)
    }

    if (tc.id === 'CASE-16-GLOBAL-PATENT-MISCONCEPTION') {
      const res = await routeConversationalIntent(tc.inputs.user_message, {})
      assert.equal(res.action, tc.expected.action)
      assert.ok(res.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-17-UNSUPPORTED-CLAIM-LIMITATION') {
      const map = buildPctClaimSupportMap(tc.inputs.claim, tc.inputs.specification)
      const unsupported = map[0].limitations.find((l) => l.status === tc.expected.status)
      assert.ok(unsupported)
    }
  }
})

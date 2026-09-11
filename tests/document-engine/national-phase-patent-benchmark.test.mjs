import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluateNationalPhaseInterviewStep,
  calculateNationalPhaseDeadline,
  detectAddedSubjectMatter,
  detectMultiJurisdictionRequest,
  assessNationalPhaseReadiness,
  extractNationalPhaseMatterFacts,
  JURISDICTION_RULES,
  READINESS_STATES,
  REVIEW_FLAGS,
} from '../../src/lib/national-phase-interview-graph.js'

test('benchmark: all synthetic National Phase benchmark cases execute and pass', async () => {
  const benchmarkPath = path.resolve(
    process.cwd(),
    'benchmarks',
    'document-intelligence-v1',
    'national-phase-patent-application',
    'cases.json'
  )

  const content = fs.readFileSync(benchmarkPath, 'utf8')
  const data = JSON.parse(content)
  assert.ok(data.cases.length >= 18, 'Benchmark must contain at least 18 cases')

  for (const tc of data.cases) {
    if (tc.id === 'CASE-01-US-NATIONAL-PHASE') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.deadline_months, tc.expected.deadline_months)
      assert.equal(calc.legal_rule, tc.expected.deadline_rule)
      const readiness = assessNationalPhaseReadiness({
        target_jurisdiction: tc.inputs.target_jurisdiction,
        pct_number: tc.inputs.pct_application_number,
        priority_date: tc.inputs.priority_date,
        claim_set_source: tc.inputs.claim_set_source,
      }, [])
      assert.equal(readiness, tc.expected.readiness)
      const rules = JURISDICTION_RULES['US']
      assert.ok(rules.formalities.some((f) => f.includes('Oath/Declaration')))
    }

    if (tc.id === 'CASE-02-EPO-REGIONAL-PHASE') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.deadline_months, tc.expected.deadline_months)
      assert.equal(calc.legal_rule, tc.expected.deadline_rule)
      const readiness = assessNationalPhaseReadiness({
        target_jurisdiction: tc.inputs.target_jurisdiction,
        pct_number: tc.inputs.pct_application_number,
        priority_date: tc.inputs.priority_date,
        claim_set_source: tc.inputs.claim_set_source,
      }, [])
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-03-CA-NATIONAL-PHASE') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.deadline_months, tc.expected.deadline_months)
      assert.equal(calc.legal_rule, tc.expected.deadline_rule)
      assert.equal(JURISDICTION_RULES['CA'].late_reinstatement_available, true)
    }

    if (tc.id === 'CASE-04-AU-NATIONAL-PHASE') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.deadline_months, tc.expected.deadline_months)
      assert.equal(calc.legal_rule, tc.expected.deadline_rule)
    }

    if (tc.id === 'CASE-05-IN-NATIONAL-PHASE') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.deadline_months, tc.expected.deadline_months)
      assert.equal(calc.legal_rule, tc.expected.deadline_rule)
      assert.ok(JURISDICTION_RULES['IN'].formalities.some((f) => f.includes('Form 1')))
      assert.ok(JURISDICTION_RULES['IN'].formalities.some((f) => f.includes('Form 3')))
    }

    if (tc.id === 'CASE-06-MULTI-JURISDICTION') {
      const jurs = detectMultiJurisdictionRequest(tc.inputs.user_message)
      assert.deepEqual(jurs.sort(), tc.expected.jurisdictions.sort())
      const step = evaluateNationalPhaseInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.child_workflows['US'])
      assert.ok(step.child_workflows['EPO'])
      assert.ok(step.child_workflows['IN'])
    }

    if (tc.id === 'CASE-07-SINGLE-PRIORITY') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.priority_date, tc.expected.base_calculation_date)
    }

    if (tc.id === 'CASE-08-MULTIPLE-PRIORITIES') {
      const sortedPriorities = tc.inputs.priority_records.map((r) => r.date).sort()
      const earliest = sortedPriorities[0]
      assert.equal(earliest, tc.expected.earliest_priority_date)
      const calc = calculateNationalPhaseDeadline(earliest, tc.inputs.target_jurisdiction)
      assert.equal(calc.priority_date, tc.expected.base_calculation_date)
    }

    if (tc.id === 'CASE-09-UNKNOWN-DEADLINE-DATA') {
      const calc = calculateNationalPhaseDeadline(null, tc.inputs.target_jurisdiction)
      assert.equal(calc.status, tc.expected.deadline_status)
      assert.equal(calc.calculatedDeadline, null)
    }

    if (tc.id === 'CASE-10-ARTICLE-19-AMENDMENTS') {
      const step = evaluateNationalPhaseInterviewStep({
        session: { facts: { target_jurisdiction: 'US', pct_number: tc.inputs.pct_application_number } },
        latestMessage: 'Use Article 19 amendments',
      })
      assert.equal(step.session.facts.claim_set_source, tc.expected.selected_claim_source)
    }

    if (tc.id === 'CASE-11-ARTICLE-34-AMENDMENTS') {
      const step = evaluateNationalPhaseInterviewStep({
        session: { facts: { target_jurisdiction: 'EPO', pct_number: tc.inputs.pct_application_number } },
        latestMessage: 'Use Article 34 amended claim set from Chapter II',
      })
      assert.equal(step.session.facts.claim_set_source, tc.expected.selected_claim_source)
    }

    if (tc.id === 'CASE-12-TRANSLATION-REQUIRED') {
      const step = evaluateNationalPhaseInterviewStep({
        session: { facts: { target_jurisdiction: 'US', pct_number: tc.inputs.pct_application_number, pct_language: 'ja' } },
        latestMessage: 'Japanese PCT and we do not have a translation yet',
      })
      assert.equal(step.session.facts.translation_status, tc.expected.translation_status)
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-13-OWNERSHIP-CHANGE') {
      const step = evaluateNationalPhaseInterviewStep({
        session: { facts: { target_jurisdiction: 'US', pct_number: tc.inputs.pct_application_number, applicant_name: tc.inputs.pct_applicant } },
        latestMessage: `Applicant was ${tc.inputs.pct_applicant}, but assigned to ${tc.inputs.new_owner} after filing.`,
      })
      assert.ok(step.session.flags.includes(tc.expected.ownership_chain_flag))
      assert.equal(step.session.facts.original_applicant, tc.inputs.pct_applicant)
      assert.equal(step.session.facts.current_owner, tc.inputs.new_owner)
    }

    if (tc.id === 'CASE-14-NEW-MATTER-GATE') {
      const check = detectAddedSubjectMatter({
        pctDisclosure: tc.inputs.pct_disclosure,
        proposedChange: tc.inputs.proposed_addition,
      })
      assert.equal(check.supportStatus, tc.expected.support_status)
      assert.ok(check.flags.includes(tc.expected.review_flag))
      assert.equal(check.isSupported, false)
    }

    if (tc.id === 'CASE-15-ISR-WRITTEN-OPINION') {
      const step = evaluateNationalPhaseInterviewStep({
        session: { facts: { target_jurisdiction: 'EPO', pct_number: tc.inputs.pct_application_number } },
        latestMessage: tc.inputs.isr_written_opinion,
      })
      assert.ok(step.session.facts.isr_objections)
      assert.equal(step.session.facts.claim_invalid, undefined)
    }

    if (tc.id === 'CASE-16-UNSUPPORTED-JURISDICTION') {
      const step = evaluateNationalPhaseInterviewStep({
        session: {},
        latestMessage: `We want to enter ${tc.inputs.target_jurisdiction}`,
      })
      assert.equal(step.session.facts.jurisdiction_support_status, tc.expected.support_status)
    }

    if (tc.id === 'CASE-17-EXISTING-MATTER-PRESERVATION') {
      const extracted = extractNationalPhaseMatterFacts({ matter: tc.inputs.matter_facts })
      assert.equal(extracted.status.target_jurisdiction, 'KNOWN')
      assert.equal(extracted.status.pct_number, 'KNOWN')
    }

    if (tc.id === 'CASE-18-LATE-DEADLINE-WARNING') {
      const calc = calculateNationalPhaseDeadline(tc.inputs.priority_date, tc.inputs.target_jurisdiction)
      assert.equal(calc.warning_level, tc.expected.warning_level)
      assert.ok(calc.flags.includes(tc.expected.late_entry_flag))
    }
  }
})

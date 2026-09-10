import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluateEpInterviewStep,
  calculateEpFilingDeadline,
  isEpRegionalPhaseFromPctRequest,
  inferEpInventionType,
  detectEpAddedSubjectMatter,
  evaluateEpClaimSupport,
  evaluateEpMultipleIndependentClaims,
  evaluateEpTwoPartClaim,
  extractEpMatterFacts,
  assessEpReadiness,
  READINESS_STATES,
  EP_REVIEW_FLAGS,
} from '../../src/lib/european-patent-interview-graph.js'

test('benchmark: all 19 synthetic European Patent Application benchmark cases execute and pass', async () => {
  const benchmarkPath = path.resolve(
    process.cwd(),
    'benchmarks',
    'document-intelligence-v1',
    'european-patent-application',
    'cases.json'
  )

  const content = fs.readFileSync(benchmarkPath, 'utf8')
  const data = JSON.parse(content)
  assert.equal(data.cases.length, 19, 'Benchmark must contain exactly 19 cases')

  for (const tc of data.cases) {
    if (tc.id === 'CASE-01-DIRECT-EP-FIRST-FILING') {
      const step = evaluateEpInterviewStep({
        session: { facts: { filing_route: 'DIRECT_EP_FILING', has_priority: false, title: tc.inputs.title } },
        latestMessage: 'No earlier priority, this is a first filing in Europe',
      })
      assert.equal(step.session.facts.filing_route, 'DIRECT_EP_FILING')
      assert.equal(step.session.facts.has_priority, false)
      assert.equal(step.session.facts.priority_type, tc.expected.filing_type)
    }

    if (tc.id === 'CASE-02-PRIORITY-TO-US-PROVISIONAL') {
      const pRecord = tc.inputs.priority_records[0]
      const calc = calculateEpFilingDeadline(pRecord.filing_date)
      assert.equal(calc.deadline_months, tc.expected.deadline_months)
      assert.equal(calc.legal_rule, tc.expected.deadline_rule)
      assert.equal(calc.calculatedDeadline, tc.expected.calculated_deadline)
      const step = evaluateEpInterviewStep({
        session: { facts: { filing_route: 'DIRECT_EP_FILING', has_priority: true } },
        latestMessage: `Priority to US provisional ${pRecord.application_number} filed ${pRecord.filing_date}`,
      })
      assert.equal(step.session.facts.priority_type, tc.expected.priority_type)
      assert.equal(step.session.facts.priority_records[0].country_or_office, 'US')
    }

    if (tc.id === 'CASE-03-MULTIPLE-PRIORITIES') {
      const sortedDates = tc.inputs.priority_records.map((r) => r.filing_date).sort()
      const earliest = sortedDates[0]
      assert.equal(earliest, tc.expected.earliest_priority_date)
      const calc = calculateEpFilingDeadline(earliest)
      assert.equal(calc.calculatedDeadline, tc.expected.calculated_deadline)
      const step = evaluateEpInterviewStep({
        session: {
          facts: {
            filing_route: 'DIRECT_EP_FILING',
            priority_records: tc.inputs.priority_records,
          },
        },
        latestMessage: 'Here are our multiple priority filings',
      })
      assert.equal(step.session.facts.priority_type, 'CLAIMS_MULTIPLE_PRIORITIES')
      assert.equal(step.session.facts.priority_records.length, tc.expected.count)
    }

    if (tc.id === 'CASE-04-SOFTWARE-CII') {
      const invType = inferEpInventionType(tc.inputs.title, tc.inputs.technical_problem)
      assert.equal(invType, tc.expected.invention_type)
      const step = evaluateEpInterviewStep({
        session: { facts: { title: tc.inputs.title, technical_problem: tc.inputs.technical_problem } },
        latestMessage: 'This is distributed microservice software',
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-05-AI-ML') {
      const invType = inferEpInventionType(tc.inputs.title, tc.inputs.technical_solution)
      assert.equal(invType, tc.expected.invention_type)
      const step = evaluateEpInterviewStep({
        session: { facts: { title: tc.inputs.title, technical_solution: tc.inputs.technical_solution } },
        latestMessage: 'Convolutional neural network for seismic faults',
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-06-MECHANICAL-INVENTION') {
      const invType = inferEpInventionType(tc.inputs.title, tc.inputs.technical_solution)
      assert.equal(invType, tc.expected.invention_type)
      assert.equal(invType === 'SOFTWARE' || invType === 'AI_ML', tc.expected.cii_review_required)
    }

    if (tc.id === 'CASE-07-ELECTRONICS-INVENTION') {
      const invType = inferEpInventionType(tc.inputs.title, tc.inputs.technical_solution)
      assert.equal(invType, tc.expected.invention_type)
      assert.equal(invType === 'SOFTWARE' || invType === 'AI_ML', tc.expected.cii_review_required)
    }

    if (tc.id === 'CASE-08-CHEMICAL-INVENTION') {
      const invType = inferEpInventionType(tc.inputs.title, tc.inputs.technical_solution)
      assert.equal(invType, tc.expected.invention_type)
      const step = evaluateEpInterviewStep({
        session: { facts: { title: tc.inputs.title, invention_type: invType } },
        latestMessage: 'Polymer composition with organosilane',
      })
      assert.ok(step.session.facts.invention_type === 'CHEMICAL')
    }

    if (tc.id === 'CASE-09-BIOTECH-SPECIALIST-FLAG') {
      const invType = inferEpInventionType(tc.inputs.title, tc.inputs.technical_solution)
      assert.equal(invType, tc.expected.invention_type)
      const step = evaluateEpInterviewStep({
        session: { facts: { title: tc.inputs.title, invention_type: invType } },
        latestMessage: 'guide RNA CRISPR biological sequence',
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-10-UNKNOWN-PRIOR-ART') {
      const evaluation = evaluateEpTwoPartClaim({
        closestPriorArt: tc.inputs.closest_prior_art,
        distinguishingFeatures: [],
      })
      assert.equal(evaluation.twoPartAppropriate, tc.expected.two_part_appropriate)
      assert.equal(evaluation.preamble, null)
    }

    if (tc.id === 'CASE-11-TWO-PART-CLAIM-AMBIGUITY') {
      const evaluation = evaluateEpTwoPartClaim({
        closestPriorArt: tc.inputs.closest_prior_art,
        distinguishingFeatures: [tc.inputs.distinguishing_feature],
      })
      assert.equal(evaluation.twoPartAppropriate, tc.expected.two_part_appropriate)
      assert.ok(evaluation.characterisingPortion.includes(tc.inputs.distinguishing_feature))
    }

    if (tc.id === 'CASE-12-MULTIPLE-INDEPENDENT-CLAIMS') {
      const result = evaluateEpMultipleIndependentClaims(tc.inputs.claims)
      assert.equal(result.hasExcessIndependentClaims, tc.expected.multiple_independent_in_category)
      assert.ok(result.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-13-UNITY-CONCERN') {
      const step = evaluateEpInterviewStep({
        session: { facts: { concepts: tc.inputs.concepts } },
        latestMessage: 'We have two distinct inventions: hydraulic pump valve and cryptographic algorithm',
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-14-PUBLIC-DISCLOSURE') {
      const step = evaluateEpInterviewStep({
        session: { facts: {} },
        latestMessage: `We publicly presented the invention at ${tc.inputs.public_disclosure.event} on ${tc.inputs.public_disclosure.date}`,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
      assert.equal(step.session.facts.public_disclosure.disclosed, true)
    }

    if (tc.id === 'CASE-15-NEW-MATTER') {
      const check = detectEpAddedSubjectMatter({
        originalDisclosure: tc.inputs.original_disclosure,
        proposedContent: tc.inputs.proposed_addition,
      })
      assert.equal(check.isSupported, tc.expected.is_supported)
      assert.equal(check.supportStatus, tc.expected.support_status)
      assert.ok(check.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-16-EXISTING-MATTER') {
      const extracted = extractEpMatterFacts({ matter: tc.inputs.matter_facts })
      for (const field of tc.expected.known_fields) {
        assert.equal(extracted.status[field], 'KNOWN', `Field ${field} must be KNOWN`)
      }
    }

    if (tc.id === 'CASE-17-MISSING-DEADLINE-INFORMATION') {
      const calc = calculateEpFilingDeadline(tc.inputs.priority_date)
      assert.equal(calc.status, tc.expected.deadline_status)
      assert.equal(calc.calculatedDeadline, tc.expected.calculated_deadline)
    }

    if (tc.id === 'CASE-18-PCT-REGIONAL-PHASE-MISROUTING') {
      const isPct = isEpRegionalPhaseFromPctRequest(tc.inputs.user_message)
      assert.equal(isPct, tc.expected.is_pct_regional_phase)
    }

    if (tc.id === 'CASE-19-UNSUPPORTED-CLAIM-FEATURE') {
      const check = evaluateEpClaimSupport({
        specification: tc.inputs.disclosure,
        claimFeatures: tc.inputs.claim_features,
      })
      assert.equal(check.features[0].status, tc.expected.feature_1_status)
      assert.equal(check.features[1].status, tc.expected.feature_2_status)
      assert.equal(check.hasUnsupportedFeatures, tc.expected.has_unsupported_features)
      assert.ok(check.flags.includes(tc.expected.review_flag))
    }
  }
})

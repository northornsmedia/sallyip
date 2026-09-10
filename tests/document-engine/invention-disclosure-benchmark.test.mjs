import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluateInventionDisclosureInterviewStep,
  extractInventionMatterFacts,
  inferInventionDomain,
  detectSourceConflict,
  assessInventionCompleteness,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  READINESS_STATES,
  REVIEW_FLAGS,
  PROVENANCE_STATES,
  DEVELOPMENT_STATUSES,
  FEATURE_CLASSIFICATIONS,
} from '../../src/lib/invention-disclosure-interview-graph.js'

import {
  assembleInventionDisclosure,
  buildInventionFactGraph,
  exportInventionToDownstreamWorkflow,
  analyzeInventionChangeImpact,
  createInventionVersion,
} from '../../src/lib/invention-disclosure-service.js'

test('benchmark: all 34 synthetic Invention Disclosure Form benchmark cases execute and pass', async () => {
  const benchmarkPath = path.resolve(
    process.cwd(),
    'benchmarks',
    'document-intelligence-v1',
    'invention-disclosure-form',
    'cases.json'
  )

  const content = fs.readFileSync(benchmarkPath, 'utf8')
  const data = JSON.parse(content)
  assert.equal(data.cases.length, 34, 'Benchmark must contain exactly 34 cases')

  for (const tc of data.cases) {
    if (tc.id === 'CASE-01-NEW-INVENTION-DISCLOSURE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.equal(step.action, tc.expected.action)
      assert.equal(step.questions.length, tc.expected.question_count)
      assert.equal(step.single_question.field, tc.expected.first_field)
    }

    if (tc.id === 'CASE-02-EXISTING-MATTER-DISCLOSURE') {
      const extracted = extractInventionMatterFacts({ matter: tc.inputs.matter_facts })
      for (const field of tc.expected.known_fields) {
        assert.equal(extracted.status[field], 'KNOWN', `Field ${field} must be KNOWN from matter`)
      }
    }

    if (tc.id === 'CASE-03-VAGUE-IDEA') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.equal(step.action, tc.expected.action)
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
      assert.equal(step.session.facts.invention_type, tc.expected.domain)
    }

    if (tc.id === 'CASE-04-SOFTWARE-INVENTION') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
      const step = evaluateInventionDisclosureInterviewStep({
        session: { facts: { invention_title: tc.inputs.title } },
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-05-AI-INVENTION') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
      const step = evaluateInventionDisclosureInterviewStep({
        session: { facts: { invention_title: tc.inputs.title } },
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-06-MECHANICAL-INVENTION') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
    }

    if (tc.id === 'CASE-07-ELECTRONICS-INVENTION') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
    }

    if (tc.id === 'CASE-08-CHEMICAL-INVENTION') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
      const step = evaluateInventionDisclosureInterviewStep({
        session: { facts: { invention_title: tc.inputs.title } },
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-09-BIOTECH-INVENTION') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
      const step = evaluateInventionDisclosureInterviewStep({
        session: { facts: { invention_title: tc.inputs.title } },
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-10-MEDICAL-DEVICE') {
      const domain = inferInventionDomain(tc.inputs.title, tc.inputs.user_message)
      assert.equal(domain, tc.expected.domain)
    }

    if (tc.id === 'CASE-11-OPTIONAL-FEATURE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.facts.optional_features)
      assert.equal(step.session.facts.optional_features[0].classification, tc.expected.classification)
      assert.match(step.session.facts.optional_features[0].name.toLowerCase(), new RegExp(tc.expected.feature_name, 'i'))
    }

    if (tc.id === 'CASE-12-MULTIPLE-EMBODIMENTS') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.equal(step.session.facts.alternative_embodiments.length, tc.expected.embodiment_count)
      assert.ok(step.session.facts.alternative_embodiments.some((e) => /local/i.test(e.name)))
      assert.ok(step.session.facts.alternative_embodiments.some((e) => /remote/i.test(e.name)))
    }

    if (tc.id === 'CASE-13-NO-PROTOTYPE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.equal(step.session.facts.development_status, tc.expected.development_status)
    }

    if (tc.id === 'CASE-14-PROTOTYPE-AVAILABLE') {
      const extracted = extractInventionMatterFacts({ matter: tc.inputs.matter_facts })
      assert.equal(extracted.facts.development_status, tc.expected.development_status)
    }

    if (tc.id === 'CASE-15-EXPERIMENTAL-DATA') {
      const graph = buildInventionFactGraph({ examples_and_test_results: tc.inputs.test_results })
      assert.ok(graph.experimental_data.includes('Reduced peak latency'))
    }

    if (tc.id === 'CASE-16-NO-EXPERIMENTAL-DATA') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.equal(step.session.facts.experimental_data_status, tc.expected.experimental_data_status)
    }

    if (tc.id === 'CASE-17-SINGLE-INVENTOR') {
      const graph = buildInventionFactGraph({ potential_inventors: [tc.inputs.inventor] })
      assert.equal(graph.inventors.length, tc.expected.inventor_count)
    }

    if (tc.id === 'CASE-18-MULTIPLE-CONTRIBUTORS') {
      const graph = buildInventionFactGraph({ potential_inventors: tc.inputs.contributors })
      assert.equal(graph.inventors.length, tc.expected.contributor_count)
    }

    if (tc.id === 'CASE-19-MANAGEMENT-NON-INVENTIVE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      const ceoEntry = step.session.facts.contribution_matrix.find((c) => c.person === 'CEO')
      const engEntry = step.session.facts.contribution_matrix.find((c) => c.person === 'Lead Engineer')
      assert.equal(ceoEntry.inventive, tc.expected.ceo_inventive)
      assert.equal(engEntry.inventive, tc.expected.engineer_inventive)
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-20-CONTRACTOR-COLLABORATOR') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-21-PUBLIC-DISCLOSURE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.flags.includes(tc.expected.review_flag))
      assert.equal(step.session.facts.public_disclosure_history[0].confidential, tc.expected.confidential)
    }

    if (tc.id === 'CASE-22-NDA-DISCLOSURE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.equal(step.session.facts.public_disclosure_history[0].confidential, tc.expected.confidential)
      assert.equal(step.session.facts.public_disclosure_history[0].type, tc.expected.type)
    }

    if (tc.id === 'CASE-23-PRIOR-PATENT-FILING') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        latestMessage: tc.inputs.user_message,
      })
      assert.ok(step.session.facts.earlier_patent_filings.length > 0)
      assert.equal(step.session.facts.earlier_patent_filings[0].filing_type, tc.expected.filing_type)
    }

    if (tc.id === 'CASE-24-MULTIPLE-DISCLOSURE-EVENTS') {
      const graph = buildInventionFactGraph({ public_disclosure_history: tc.inputs.events })
      assert.equal(graph.public_disclosures.length, tc.expected.event_count)
    }

    if (tc.id === 'CASE-25-KNOWN-PRIOR-ART') {
      const graph = buildInventionFactGraph({ known_prior_art: tc.inputs.references })
      assert.equal(graph.prior_art.length, tc.expected.reference_count)
    }

    if (tc.id === 'CASE-26-SOURCE-CONFLICT') {
      const conflict = detectSourceConflict({ text: tc.inputs.statement, source: 'USER' }, { text: tc.inputs.document, source: 'DOCUMENT' })
      assert.equal(conflict.hasConflict, tc.expected.has_conflict)
      assert.equal(conflict.flag, tc.expected.review_flag)
    }

    if (tc.id === 'CASE-27-IMAGE-SUPPORTED-DISCLOSURE') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {},
        attachments: [{ name: tc.inputs.attachment }],
        latestMessage: 'Here is a photo of the external enclosure',
      })
      assert.equal(step.session.facts.image_evidence.internal_inferences_rejected, tc.expected.internal_inferences_rejected)
      assert.equal(step.session.facts.image_evidence.provenance, tc.expected.provenance)
    }

    if (tc.id === 'CASE-28-UNKNOWN-ANSWERS') {
      assert.equal(isSkipOrUnknown(tc.inputs.user_message), true)
    }

    if (tc.id === 'CASE-29-SKIP-BEHAVIOUR') {
      assert.equal(isSkipOrUnknown(tc.inputs.user_message), true)
    }

    if (tc.id === 'CASE-30-DOWNSTREAM-PROVISIONAL-HANDOFF') {
      const graph = buildInventionFactGraph({
        invention_title: 'Adaptive Neural Filter',
        problem_need: 'Noise artifacts in biosignals',
        core_inventive_concept: 'Kalman state tracking with adaptive neural weights',
      })
      const handoff = exportInventionToDownstreamWorkflow(graph, tc.inputs.target_workflow)
      assert.equal(handoff.target_workflow, tc.expected.target_workflow)
      assert.equal(handoff.document_number, tc.expected.document_number)
      assert.equal(handoff.readyForDrafting, tc.expected.ready_for_drafting)
      assert.equal(handoff.facts.title, 'Adaptive Neural Filter')
    }

    if (tc.id === 'CASE-31-DOWNSTREAM-CLAIMS-HANDOFF') {
      const graph = buildInventionFactGraph({
        invention_title: 'Robotic Gripper',
        essential_features: ['A pneumatic actuator', 'A compliant finger grip'],
        optional_features: ['An optical proximity sensor'],
      })
      const handoff = exportInventionToDownstreamWorkflow(graph, tc.inputs.target_workflow)
      assert.equal(handoff.target_workflow, tc.expected.target_workflow)
      assert.equal(handoff.document_number, tc.expected.document_number)
      assert.equal(handoff.readyForDrafting, tc.expected.ready_for_drafting)
      assert.equal(handoff.facts.independent_claim_features.length, 2)
    }

    if (tc.id === 'CASE-32-CHANGE-IMPACT') {
      const impact = analyzeInventionChangeImpact(tc.inputs.old_facts, tc.inputs.new_facts)
      assert.equal(impact.hasImpact, tc.expected.has_impact)
      assert.ok(impact.flags.includes(tc.expected.review_flag))
    }

    if (tc.id === 'CASE-33-VERSIONING') {
      const v = createInventionVersion({ title: 'Test Invention' }, [{ version: 'v1' }], tc.inputs.edit_note)
      assert.equal(v.newVersion.version, tc.expected.version)
      assert.equal(v.history.length, tc.expected.history_length)
    }

    if (tc.id === 'CASE-34-LOCKED-FIELDS') {
      const step = evaluateInventionDisclosureInterviewStep({
        session: {
          locks: tc.inputs.locked_fields,
          facts: { potential_inventors: [{ name: 'Alice' }] },
          currentQuestionId: 'q_inventors',
        },
        latestMessage: tc.inputs.new_inventor_message,
      })
      assert.equal(step.session.facts.potential_inventors.length, 1)
      assert.equal(step.session.facts.potential_inventors[0].name, 'Alice')
    }
  }
})

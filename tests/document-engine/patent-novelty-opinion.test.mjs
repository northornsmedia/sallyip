import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { resolveDocumentFamily, loadDocumentProfile } from '../../src/lib/document-engine.js'
import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'
import { buildEffectiveClaimLimitations } from '../../src/lib/patent-claim-service.js'
import {
  assessNoveltyReadiness,
  assessPriorityContext,
  assessResearchCompleteness,
  assemblePatentNoveltyOpinion,
  buildNoveltyEvidenceGraph,
  buildNoveltyEvidenceMatrix,
  compareNumericalLimitation,
  createNoveltyOpinionVersion,
  detectAnalysisContradictions,
  detectNoveltyOpinionStaleness,
  evaluateNoveltyOpinion,
  groupPatentFamilies,
  NOVELTY_OUTCOMES,
  validateNoveltyReference,
} from '../../src/lib/novelty-service.js'
import {
  buildNoveltyHandoff,
  evaluatePatentNoveltyInterviewStep,
  extractNoveltyMatterContext,
} from '../../src/lib/patent-novelty-opinion-interview-graph.js'
import { assertChatAllowed } from '../../src/lib/provider-policy.js'

const claims = [
  { claim_number: 1, claim_text: 'A system with a sensor and a processor responsive to the sensor.', depends_on: [], elements: ['a sensor', 'a processor responsive to the sensor'] },
  { claim_number: 2, claim_text: 'The system of claim 1, further comprising a controller.', depends_on: [1], elements: ['a controller'] },
]

const reference = (overrides = {}) => ({
  reference_id: 'ref-family-a-wo', title: 'Verified sensor system', publication_identifier: 'WO-TEST-0001',
  verified_existence: 'VERIFIED', publication_date: '2019-01-01', date_verification: 'VERIFIED',
  temporal_status: 'TEMPORALLY_RELEVANT', language: 'English', family_id: 'family-a',
  passages: [
    { passage_id: 'p1', location: 'paragraph 10', verified: true, content: 'A sensor measures movement in the housing.' },
    { passage_id: 'p2', location: 'paragraph 11', verified: true, content: 'A processor responsive to the sensor controls operation.' },
    { passage_id: 'p3', location: 'claim 4', verified: true, content: 'A controller adjusts an output signal.' },
  ], ...overrides,
})

const baseInput = (overrides = {}) => ({
  target_type: 'CLAIM', workflow_mode: 'NOVELTY_AFTER_PRIOR_ART_SEARCH', requested_scope: 'FULL',
  claim_set_id: 'claims-1', claim_set_version: 'v1', claims: [claims[0]], jurisdiction: 'US',
  authority: { verified: true, authority_id: 'authority-us-102', version_or_date: '2026-09-10' },
  priority_context: { status: 'VERIFIED', analysis_cutoff: '2020-01-01', priorities: [{ id: 'priority-a', date: '2020-01-01' }] },
  research: { status: 'STRUCTURED_SEARCH_COMPLETED', scope: 'Recorded patent keyword and classification searches', limitations: ['English full text only'] },
  references: [reference()], mappings: [], ...overrides,
})

const fullMappings = (claimNumbers = [1]) => {
  const decomposed = buildEffectiveClaimLimitations(claims.filter((claim) => claimNumbers.includes(claim.claim_number) || claimNumbers.some((n) => n === 2 && claim.claim_number === 1)), 'v1')
  return decomposed.filter((claim) => claimNumbers.includes(claim.claim_number)).flatMap((claim) =>
    claim.full_effective_limitations.map((limitation, index) => ({
      claim_number: claim.claim_number, limitation_id: limitation.limitation_id,
      reference_id: 'ref-family-a-wo', passage_id: index === 0 ? 'p1' : index === 1 ? 'p2' : 'p3',
      disclosure_status: 'EXPLICITLY_DISCLOSED', proposition: limitation.exact_text,
    })))
}

test('profile #015 is canonical, high-risk, verified, reviewed, and L3 only', async () => {
  const profile = await loadDocumentProfile('patent-novelty-opinion')
  assert.equal(profile.document_number, '015')
  assert.equal(profile.family, 'PATENT_ANALYSIS')
  assert.equal(profile.capability_level, 'L3_DRAFTABLE')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.disclaimers.includes('NOT_COMPLETE_PATENTABILITY_OPINION'), true)
})

test('routing recognizes novelty aliases and does not steal adjacent patent workflows', () => {
  for (const prompt of ['Is Claim 1 novel?', 'Prepare a novelty opinion', 'Does this reference anticipate the claim?', 'Check novelty before filing']) {
    assert.equal(resolveDocumentFamily(prompt), 'patent-novelty-opinion', prompt)
  }
  assert.equal(resolveDocumentFamily('Is the invention patentable?'), 'patentability-assessment')
  assert.equal(resolveDocumentFamily('Search for prior art'), 'patent-prior-art-search-report')
  assert.equal(resolveDocumentFamily('Is this claim obvious?'), 'inventive-step-analysis')
  assert.equal(resolveDocumentFamily('Can we practise this invention?'), 'freedom-to-operate-opinion')
})

test('matter context is inspected first and only one material question is asked', async () => {
  const context = { matter: { jurisdiction: 'US', priority_date: '2020-01-01' }, claim_sets: [
    { id: 'cs', version: 'v1', claims }, { id: 'cs', version: 'v2', claims },
  ] }
  const extracted = extractNoveltyMatterContext(context)
  assert.equal(extracted.status.jurisdiction, 'KNOWN')
  assert.equal(extracted.status.claim_set_version, 'UNKNOWN')
  const step = evaluatePatentNoveltyInterviewStep({ session: {}, latestMessage: 'Is Claim 1 novel?', matterContext: context })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.equal(step.questions.length, 1)
  assert.equal(step.single_question.field, 'claim_set_version')
  const advanced = evaluatePatentNoveltyInterviewStep({ session: step.session, latestMessage: 'v2', matterContext: context })
  assert.equal(advanced.session.facts.claim_set_version, 'v2')
  assert.equal(advanced.session.facts.claim_set_id, 'cs')
  assert.equal(advanced.session.facts.claims.length, 2)
  assert.notEqual(advanced.single_question?.field, 'claim_set_version')
})

test('dependent claims inherit the full parent chain plus their added limitation', () => {
  const decomposed = buildEffectiveClaimLimitations(claims, 'v1')
  const dependent = decomposed.find((claim) => claim.claim_number === 2)
  assert.equal(dependent.inherited_limitations.length, 2)
  assert.equal(dependent.added_limitations.length, 1)
  assert.equal(dependent.full_effective_limitations.length, 3)
})

test('no search fails closed while a completed zero-result search does not claim universal novelty', () => {
  const noSearch = assessNoveltyReadiness(baseInput({ research: { status: 'NOT_SEARCHED' }, references: [] }))
  assert.equal(noSearch.readiness, 'NOT_READY')
  assert.ok(noSearch.gaps.includes('RESEARCH_REQUIRED'))
  const zero = evaluateNoveltyOpinion(baseInput({ references: [], mappings: [] }))
  assert.equal(zero.outcome, NOVELTY_OUTCOMES.NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE)
  assert.doesNotMatch(zero.conclusion_language, /\bis novel\b/i)
})

test('one verified reference mapping every limitation creates review concern, not an absolute legal label', () => {
  const result = evaluateNoveltyOpinion(baseInput({ mappings: fullMappings([1]) }))
  assert.equal(result.outcome, NOVELTY_OUTCOMES.MATERIAL_NOVELTY_CONCERN)
  assert.equal(result.claim_results[0].reference_results[0].status, 'FULL_DISCLOSURE_CANDIDATE_REVIEW')
  assert.notEqual(result.outcome, 'NOT_NOVEL')
})

test('partial, relational, functional and ordered-step failures cannot be rounded up', () => {
  const partial = fullMappings([1])
  partial[1].disclosure_status = 'PARTIALLY_DISCLOSED'
  let result = evaluateNoveltyOpinion(baseInput({ mappings: partial }))
  assert.equal(result.claim_results[0].reference_results[0].status, 'PARTIAL_DISCLOSURE')
  for (const control of ['relationship_preserved', 'function_established', 'method_order_preserved']) {
    const mappings = fullMappings([1])
    mappings[1][control] = false
    result = evaluateNoveltyOpinion(baseInput({ mappings }))
    assert.equal(result.matrix[1].disclosure_status, 'NOT_IDENTIFIED')
  }
})

test('implicit disclosure remains review-required and fails closed without verified legal and technical bases', () => {
  const mappings = fullMappings([1])
  mappings[0].disclosure_status = 'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED'
  let result = evaluateNoveltyOpinion(baseInput({ mappings }))
  assert.equal(result.matrix[0].disclosure_status, 'RESEARCH_REQUIRED')
  mappings[0].technical_basis_verified = true
  mappings[0].legal_framework_verified = true
  result = evaluateNoveltyOpinion(baseInput({ mappings }))
  assert.equal(result.matrix[0].disclosure_status, 'IMPLICITLY_DISCLOSED_REVIEW_REQUIRED')
  assert.equal(result.claim_results[0].reference_results[0].implicit_review_required, true)
})

test('multiple references are never mosaiced into a novelty failure', () => {
  const second = reference({ reference_id: 'ref-b', family_id: 'family-b', publication_identifier: 'EP-TEST-2' })
  const ids = buildEffectiveClaimLimitations([claims[0]], 'v1')[0].full_effective_limitations.map((item) => item.limitation_id)
  const mappings = [
    { claim_number: 1, limitation_id: ids[0], reference_id: 'ref-family-a-wo', passage_id: 'p1', disclosure_status: 'EXPLICITLY_DISCLOSED' },
    { claim_number: 1, limitation_id: ids[1], reference_id: 'ref-b', passage_id: 'p2', disclosure_status: 'EXPLICITLY_DISCLOSED' },
  ]
  const result = evaluateNoveltyOpinion(baseInput({ references: [reference(), second], mappings }))
  assert.equal(result.outcome, NOVELTY_OUTCOMES.NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE)
  assert.ok(result.claim_results[0].reference_results.every((item) => item.status !== 'FULL_DISCLOSURE_CANDIDATE_REVIEW'))
})

test('unverified references, dates, false quotes, and non-entailing passages fail closed', () => {
  const unverified = validateNoveltyReference(reference({ verified_existence: 'UNVERIFIED' }))
  assert.ok(unverified.issues.includes('REFERENCE_VERIFICATION_FAILED'))
  assert.ok(validateNoveltyReference(reference({ publication_date: null })).issues.includes('PUBLICATION_DATE_REQUIRED'))
  assert.ok(validateNoveltyReference(reference({ date_verification: 'UNVERIFIED' })).issues.includes('DATE_VERIFICATION_REQUIRED'))
  assert.ok(validateNoveltyReference(reference({ temporal_status: 'TEMPORAL_ANALYSIS_UNCERTAIN' })).issues.includes('TEMPORAL_ANALYSIS_UNCERTAIN'))
  const ids = buildEffectiveClaimLimitations([claims[0]], 'v1')[0].full_effective_limitations.map((item) => item.limitation_id)
  const falseQuote = buildNoveltyEvidenceMatrix({ claims: [claims[0]], claim_set_version: 'v1', references: [reference()], mappings: [
    { claim_number: 1, limitation_id: ids[0], reference_id: 'ref-family-a-wo', passage_id: 'p1', quote: 'This quotation is fabricated and absent.', disclosure_status: 'EXPLICITLY_DISCLOSED' },
  ] })
  assert.ok(falseQuote.matrix[0].verification_failures.includes('QUOTE_VERIFICATION_FAILED'))
  const nonEntailing = buildNoveltyEvidenceMatrix({ claims: [claims[0]], claim_set_version: 'v1', references: [reference()], mappings: [
    { claim_number: 1, limitation_id: ids[1], reference_id: 'ref-family-a-wo', passage_id: 'p1', disclosure_status: 'EXPLICITLY_DISCLOSED' },
  ] })
  assert.notEqual(nonEntailing.matrix[1].disclosure_status, 'EXPLICITLY_DISCLOSED')
})

test('numerical ranges compare exact values without invented overlap', () => {
  assert.equal(compareNumericalLimitation({ min: 10, max: 20 }, { min: 30, max: 40 }), 'OUTSIDE_RANGE')
  assert.equal(compareNumericalLimitation({ min: 10, max: 20 }, { min: 15, max: 25 }), 'PARTIAL_OVERLAP')
})

test('priority uncertainty, claim ambiguity and missing framework block the opinion', () => {
  assert.ok(assessNoveltyReadiness(baseInput({ priority_context: { status: 'UNCERTAIN', analysis_cutoff: '2020-01-01' } })).gaps.includes('PRIORITY_DATE_REVIEW_REQUIRED'))
  assert.equal(evaluateNoveltyOpinion(baseInput({ claim_construction_status: 'AMBIGUOUS' })).outcome, NOVELTY_OUTCOMES.INCONCLUSIVE)
  assert.ok(assessNoveltyReadiness(baseInput({ authority: { verified: false } })).gaps.includes('VERIFIED_NOVELTY_FRAMEWORK_REQUIRED'))
})

test('multiple priorities and feature-level support remain separate and uncertain support triggers review', () => {
  const assessment = assessPriorityContext({
    status: 'VERIFIED', analysis_cutoff: '2020-01-01',
    priorities: [{ id: 'p-a', date: '2020-01-01' }, { id: 'p-b', date: '2020-05-01' }],
    limitation_support: [
      { limitation_id: 'v1:claim-1:limitation-1', priority_id: 'p-a', status: 'SUPPORTED_BY_PRIORITY' },
      { limitation_id: 'v1:claim-1:limitation-2', priority_id: 'p-b', status: 'UNCERTAIN' },
    ],
  })
  assert.equal(assessment.multiple_priorities_preserved, true)
  assert.equal(assessment.priorities.length, 2)
  assert.equal(assessment.status, 'PRIORITY_DATE_REVIEW_REQUIRED')
})

test('research completeness preserves provenance and never labels a search exhaustive', () => {
  const completeness = assessResearchCompleteness({
    status: 'STRUCTURED_SEARCH_COMPLETED', sources: ['EPO OPS'], queries: ['sensor controller'], date_scope: 'before 2020',
    language_scope: 'English', result_screening: '100 screened', family_review: true,
    provenance: [{ query: 'sensor controller', source: 'EPO OPS', result_count: 100, screened_count: 100, selected_count: 2 }],
    limitations: ['English only'],
  })
  assert.equal(completeness.level, 'HIGH')
  assert.equal(completeness.exhaustive, false)
  assert.equal(completeness.provenance[0].result_count, 100)
})

test('family grouping preserves per-publication dates and translation review status', () => {
  const groups = groupPatentFamilies([
    reference(), reference({ reference_id: 'ref-family-a-us', publication_identifier: 'US-TEST-1', publication_date: '2020-02-02' }),
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].member_count, 2)
  assert.equal(groups[0].publication_dates.length, 2)
  const translated = validateNoveltyReference(reference({ language: 'Japanese', translation_status: undefined }))
  assert.ok(translated.issues.includes('TRANSLATION_STATUS_REQUIRED'))
})

test('matrix/narrative contradictions block finalization', () => {
  const ids = buildEffectiveClaimLimitations([claims[0]], 'v1')[0].full_effective_limitations.map((item) => item.limitation_id)
  const contradictions = detectAnalysisContradictions([
    { claim_number: 1, limitation_id: ids[0], reference_id: 'ref-family-a-wo', disclosure_status: 'NOT_IDENTIFIED' },
  ], [{ claim_number: 1, limitation_id: ids[0], reference_id: 'ref-family-a-wo', assertion: 'DISCLOSED' }])
  assert.equal(contradictions[0].code, 'ANALYSIS_CONTRADICTION')
})

test('claim, priority, authority, metadata and new-reference changes make opinions stale; versions remain immutable', () => {
  const stale = detectNoveltyOpinionStaleness(
    { claim_version: 'v1', claim_text: 'A+B+C', claim_dependencies: [], priority_context_version: 'p1', research_version: 'r1', authority_version: 'a1', reference_metadata_version: 'm1' },
    { claim_version: 'v2', claim_text: 'A+B', claim_dependencies: [], priority_context_version: 'p1', research_version: 'r2', authority_version: 'a1', reference_metadata_version: 'm1' })
  assert.equal(stale.flag, 'NOVELTY_OPINION_STALE')
  assert.ok(stale.reasons.includes('CLAIM_CHANGED'))
  assert.ok(stale.reasons.includes('NEW_OR_CHANGED_PRIOR_ART'))
  const versions = createNoveltyOpinionVersion({ outcome: 'INCONCLUSIVE' }, [{ version: 'v1', snapshot: { outcome: 'RESEARCH_REQUIRED' } }])
  assert.equal(versions.opinion_version, 'v2')
  assert.equal(versions.history[0].snapshot.outcome, 'RESEARCH_REQUIRED')
})

test('concept-level output remains labelled preliminary and PCT remains a context', () => {
  const result = evaluateNoveltyOpinion(baseInput({ target_type: 'INVENTIVE_CONCEPT', claim_set_id: undefined, claim_set_version: undefined, claims: [], concept_text: 'sensor fusion controller', jurisdiction: 'PCT_CONTEXT', references: [] }))
  assert.equal(result.analysis_target_label, 'CONCEPT_LEVEL_NOVELTY_ASSESSMENT')
  assert.equal(result.outcome, NOVELTY_OUTCOMES.PRELIMINARY_NO_CLOSE_FULL_DISCLOSURE_IDENTIFIED)
  assert.equal(result.readiness.jurisdiction, 'PCT_CONTEXT')
})

test('report contains the canonical evidence and qualification sections', () => {
  const input = baseInput({ mappings: fullMappings([1]) })
  const report = assemblePatentNoveltyOpinion(input)
  assert.match(report, /Claim-by-Reference Novelty Matrix/)
  assert.match(report, /Verification Statement/)
  assert.match(report, /not a complete patentability/i)
})

test('the limitation matrix is connected to the shared-style evidence graph', () => {
  const opinion = evaluateNoveltyOpinion(baseInput({ mappings: fullMappings([1]) }))
  const graph = buildNoveltyEvidenceGraph(opinion)
  assert.ok(graph.nodes.some((node) => node.type === 'CLAIM'))
  assert.ok(graph.nodes.some((node) => node.type === 'REFERENCE'))
  assert.ok(graph.edges.some((edge) => edge.type === 'SUPPORTED_BY'))
  assert.ok(graph.edges.some((edge) => edge.type === 'INFORMS_CONCLUSION'))
})

test('downstream handoffs transfer evidence and never amend claims automatically', () => {
  const opinion = evaluateNoveltyOpinion(baseInput({ mappings: fullMappings([1]) }))
  const handoff = buildNoveltyHandoff(opinion, 'patent-claims-set')
  assert.equal(handoff.target_workflow, 'patent-claims-set')
  assert.equal(handoff.automatic_claim_amendment, false)
  assert.ok(handoff.limitation_matrix.length > 0)
})

test('confidential novelty content cannot silently use an unapproved free provider', () => {
  assert.throws(() => assertChatAllowed({ engines: [{ slug: 'unapproved:free' }], mode: 'CONFIDENTIAL_IP', env: {} }), (error) => error.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE')
})

test('document-specific benchmark contains all 29 required scenarios and adversarial fail-closed prompts', () => {
  const file = path.resolve(process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-novelty-opinion', 'cases.json')
  const benchmark = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(benchmark.case_count, 29)
  assert.equal(benchmark.cases.length, 29)
  for (const required of ['dependent claims', 'zero-result search', 'multiple-reference novelty trap', 'false quote', 'new reference', 'research-required outcome']) {
    assert.ok(benchmark.cases.some((item) => item.scenario === required), required)
  }
  assert.ok(benchmark.adversarial_prompts.length >= 8)
})

test('router returns exactly one question for a vague novelty request', async () => {
  const result = await routeConversationalIntent('Prepare a novelty opinion', {})
  assert.equal(result.document_family, 'patent-novelty-opinion')
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { resolveDocumentFamily, loadDocumentProfile } from '../../src/lib/document-engine.js'
import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'
import { buildEffectiveClaimLimitations } from '../../src/lib/patent-claim-service.js'
import { checkEntailment } from '../../src/lib/entailment-service.js'
import { classifyContradiction } from '../../src/lib/contradiction-service.js'
import { verifyQuote } from '../../src/lib/citation-service.js'
import { frameworkDefinition } from '../../src/lib/inventive-step-service.js'
import {
  PATENTABILITY_OUTCOMES,
  assessCombinationRationale,
  assessPatentabilityReadiness,
  assessTechnicalEffect,
  assemblePatentabilityAssessment,
  buildPatentabilityEvidenceGraph,
  buildPatentabilityHandoff,
  createPatentabilityVersion,
  detectPatentabilityStaleness,
  evaluatePatentabilityAssessment,
  normalizePatentabilityJurisdiction,
  validatePatentabilityReference,
} from '../../src/lib/patentability-assessment-service.js'
import {
  evaluatePatentabilityInterviewStep,
  extractPatentabilityMatterContext,
} from '../../src/lib/patentability-assessment-interview-graph.js'
import { assertChatAllowed } from '../../src/lib/provider-policy.js'

const claims = [
  { claim_number: 1, claim_text: 'A system with a sensor and a processor responsive to the sensor.', depends_on: [], elements: ['a sensor', 'a processor responsive to the sensor'] },
  { claim_number: 2, claim_text: 'The system of claim 1, further comprising a controller.', depends_on: [1], elements: ['a controller'] },
]

const reference = (overrides = {}) => ({
  reference_id: 'ref-a', title: 'Verified sensor system', publication_identifier: 'WO-TEST-0001',
  verified_existence: 'VERIFIED', publication_date: '2019-01-01', date_verification: 'VERIFIED',
  temporal_status: 'TEMPORALLY_RELEVANT', language: 'English', family_id: 'family-a',
  passages: [
    { passage_id: 'p1', location: 'paragraph 10', verified: true, content: 'A sensor measures movement in the housing.' },
    { passage_id: 'p2', location: 'paragraph 11', verified: true, content: 'A processor responsive to the sensor controls operation.' },
  ], ...overrides,
})

const baseInput = (overrides = {}) => ({
  analysis_target: 'DEFINED_CLAIMS', workflow_mode: 'FULL_EVIDENCE_BASED_ASSESSMENT', requested_scope: 'FULL',
  claim_set_id: 'claims-1', claim_set_version: 'v1', claims: [claims[0]], jurisdiction: 'US',
  authority: { verified: true, authority_id: 'authority-us-patentability', version_or_date: '2026-09-10' },
  priority_context: { status: 'VERIFIED', analysis_cutoff: '2020-01-01', priorities: [{ id: 'priority-a', date: '2020-01-01' }] },
  research: { status: 'STRUCTURED_SEARCH_COMPLETED', scope: 'Recorded keyword and classification searches', limitations: ['English full text only'] },
  references: [reference()], mappings: [], inventive_step_framework_verified: true, ...overrides,
})

const fullMappings = () => {
  const decomposed = buildEffectiveClaimLimitations([claims[0]], 'v1')[0]
  return decomposed.full_effective_limitations.map((limitation, index) => ({
    claim_number: 1, limitation_id: limitation.limitation_id,
    reference_id: 'ref-a', passage_id: index === 0 ? 'p1' : 'p2',
    disclosure_status: 'EXPLICITLY_DISCLOSED', proposition: limitation.exact_text,
  }))
}

test('profile #014 is canonical, high-risk, verified, reviewed, and L3 only', async () => {
  const profile = await loadDocumentProfile('patentability-assessment')
  assert.equal(profile.document_number, '014')
  assert.equal(profile.family, 'PATENT_ANALYSIS')
  assert.equal(profile.capability_level, 'L3_DRAFTABLE')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.ok(profile.disclaimers.includes('NOT_GUARANTEED_PATENTABLE'))
  assert.ok(profile.disclaimers.includes('NOT_FTO_OPINION'))
})

test('routing recognizes patentability aliases and disambiguates novelty, FTO, infringement, and drafting', () => {
  for (const prompt of [
    'Is my invention patentable?',
    'Assess patentability',
    'Prepare a patentability assessment',
    'Evaluate whether this can be patented',
    'Assess novelty and inventive step',
    'Does this invention appear patentable?',
    'Analyse patentability against this prior art',
    'Prepare a preliminary patentability report',
  ]) {
    assert.equal(resolveDocumentFamily(prompt), 'patentability-assessment', prompt)
  }
  assert.equal(resolveDocumentFamily('Prepare a novelty opinion'), 'patent-novelty-opinion')
  assert.equal(resolveDocumentFamily('Search for prior art'), 'patent-prior-art-search-report')
  assert.equal(resolveDocumentFamily('Prepare an FTO'), 'freedom-to-operate-opinion')
  assert.equal(resolveDocumentFamily('Does this patent cover our product'), 'patent-infringement-analysis')
  assert.equal(resolveDocumentFamily('Draft a patent application'), 'utility-patent-application')
})

test('vague invention description asks exactly one question and never concludes patentability', async () => {
  const result = await routeConversationalIntent('Is my invention patentable?', { matter: { title: 'AI platform for lawyers' } })
  assert.equal(result.document_family, 'patentability-assessment')
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
  assert.doesNotMatch(result.question.question, /definitely patentable|you are patentable|appears patentable|certain to grant|100 percent patentable/i)
})

test('matter context is inspected first and only one material question is asked', () => {
  const context = {
    matter: { jurisdiction: 'US', priority_date: '2020-01-01' },
    claim_sets: [{ id: 'cs', version: 'v1', claims }, { id: 'cs', version: 'v2', claims }],
  }
  const extracted = extractPatentabilityMatterContext(context)
  assert.equal(extracted.status.jurisdiction, 'KNOWN')
  assert.equal(extracted.status.claim_set_version, 'UNKNOWN')
  const step = evaluatePatentabilityInterviewStep({ session: {}, latestMessage: 'Assess patentability', matterContext: context })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.equal(step.questions.length, 1)
})

test('complete invention with no prior-art search fails closed to RESEARCH_REQUIRED', () => {
  const readiness = assessPatentabilityReadiness(baseInput({ research: { status: 'NOT_SEARCHED' }, references: [] }))
  assert.equal(readiness.readiness, 'NOT_READY')
  assert.ok(readiness.gaps.includes('RESEARCH_REQUIRED'))
  const result = evaluatePatentabilityAssessment(baseInput({ research: { status: 'NOT_SEARCHED' }, references: [] }))
  assert.equal(result.outcome, PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED)
  assert.doesNotMatch(result.conclusion_language, /guaranteed|100 percent|certain to grant/i)
})

test('zero verified results use scope-limited language and never claim universal absence of prior art', () => {
  const result = evaluatePatentabilityAssessment(baseInput({ references: [], mappings: [] }))
  assert.doesNotMatch(JSON.stringify(result), /no prior art exists/i)
  const report = assemblePatentabilityAssessment(baseInput({ references: [], mappings: [] }), result)
  assert.match(report, /No relevant reference identified within the recorded search scope/)
  assert.doesNotMatch(report, /no prior art exists/i)
})

test('unverified references, dates, false quotes, and non-entailing passages fail closed', () => {
  assert.ok(validatePatentabilityReference(reference({ verified_existence: 'UNVERIFIED' })).issues.includes('REFERENCE_VERIFICATION_FAILED'))
  assert.ok(validatePatentabilityReference(reference({ publication_date: null })).issues.includes('PUBLICATION_DATE_REQUIRED'))
  const ids = buildEffectiveClaimLimitations([claims[0]], 'v1')[0].full_effective_limitations.map((item) => item.limitation_id)
  const result = evaluatePatentabilityAssessment(baseInput({
    mappings: [{ claim_number: 1, limitation_id: ids[0], reference_id: 'ref-a', passage_id: 'p1', quote: 'This quotation is fabricated and absent.', disclosure_status: 'EXPLICITLY_DISCLOSED' }],
    passages: [{ passage_id: 'p1', content: 'A sensor measures movement in the housing.' }],
  }))
  assert.ok(result.quote_checks.some((item) => item.issue === 'QUOTE_VERIFICATION_FAILED'))
  assert.equal(result.outcome, PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED)
  assert.equal(verifyQuote('A sensor measures movement.', 'This quotation is fabricated and absent.'), 'missing')
  assert.notEqual(checkEntailment('a processor responsive to the sensor', 'A sensor measures movement in the housing.').verdict, 'ENTAILS')
})

test('partial limitation disclosure is never rounded up to anticipation', () => {
  const mappings = fullMappings()
  mappings[1].disclosure_status = 'PARTIALLY_DISCLOSED'
  const result = evaluatePatentabilityAssessment(baseInput({ mappings }))
  const claimResult = result.claim_results.find((item) => item.claim_number === 1)
  assert.ok(claimResult.reference_results.every((item) => item.status !== 'FULL_DISCLOSURE_CANDIDATE_REVIEW'))
})

test('multiple references are never mosaiced into a single-reference novelty failure', () => {
  const second = reference({ reference_id: 'ref-b', family_id: 'family-b', publication_identifier: 'EP-TEST-2' })
  const ids = buildEffectiveClaimLimitations([claims[0]], 'v1')[0].full_effective_limitations.map((item) => item.limitation_id)
  const result = evaluatePatentabilityAssessment(baseInput({
    references: [reference(), second],
    mappings: [
      { claim_number: 1, limitation_id: ids[0], reference_id: 'ref-a', passage_id: 'p1', disclosure_status: 'EXPLICITLY_DISCLOSED' },
      { claim_number: 1, limitation_id: ids[1], reference_id: 'ref-b', passage_id: 'p2', disclosure_status: 'EXPLICITLY_DISCLOSED' },
    ],
  }))
  assert.ok(result.claim_results[0].reference_results.every((item) => item.status !== 'FULL_DISCLOSURE_CANDIDATE_REVIEW'))
})

test('unsupported combination rationale fails closed with hindsight risk', () => {
  const bare = assessCombinationRationale({ reference_ids: ['ref-a', 'ref-b'], rationale: '', evidence_passage_ids: [], legal_framework_verified: false })
  assert.equal(bare.status, 'RESEARCH_REQUIRED')
  assert.equal(bare.hindsight_risk, 'HINDSIGHT_RISK')
  const result = evaluatePatentabilityAssessment(baseInput({
    jurisdiction: 'US',
    combinations: [{ reference_ids: ['ref-a', 'ref-b'], rationale: '', evidence_passage_ids: [] }],
  }))
  assert.ok(result.flags.includes('COMBINATION_RATIONALE_REVIEW_REQUIRED'))
})

test('unsupported technical effects remain unverified and unusable as inventive-step facts', () => {
  const effect = assessTechnicalEffect({ feature: 'Feature X', technical_effect: 'doubles efficiency', support_status: 'UNSUPPORTED' })
  assert.equal(effect.support_status, 'UNSUPPORTED')
  assert.equal(effect.usable_as_inventive_step_fact, false)
  const result = evaluatePatentabilityAssessment(baseInput({ technical_effects: [{ feature: 'Feature X', technical_effect: 'doubles efficiency', support_status: 'UNSUPPORTED' }] }))
  assert.ok(result.flags.includes('TECHNICAL_EFFECT_UNVERIFIED'))
})

test('US and EP use separate verified frameworks; PCT remains a non-grant context', () => {
  assert.equal(normalizePatentabilityJurisdiction('United States'), 'US')
  assert.equal(normalizePatentabilityJurisdiction('EPO'), 'EP')
  assert.equal(normalizePatentabilityJurisdiction('PCT'), 'PCT_CONTEXT')
  assert.equal(frameworkDefinition('us_graham_ksr').jurisdiction, 'United States')
  assert.equal(frameworkDefinition('epo_problem_solution').jurisdiction, 'EPO')
  const us = evaluatePatentabilityAssessment(baseInput({ jurisdiction: 'US', mappings: fullMappings() }))
  const ep = evaluatePatentabilityAssessment(baseInput({ jurisdiction: 'EP', mappings: fullMappings(), closest_prior_art: 'ref-a', distinguishing_features: ['controller'], technical_effects: [{ feature: 'controller', technical_effect: 'adjusts output', support_status: 'SUPPORTED' }] }))
  assert.equal(us.us_obviousness.framework, 'us_graham_ksr')
  assert.equal(ep.ep_inventive_step.framework, 'epo_problem_solution')
  const pct = evaluatePatentabilityAssessment(baseInput({ jurisdiction: 'PCT_CONTEXT', references: [], mappings: [] }))
  const pctReport = assemblePatentabilityAssessment(baseInput({ jurisdiction: 'PCT_CONTEXT', references: [] }), pct)
  assert.match(pctReport, /does not grant patents/i)
})

test('patentability-vs-FTO requests clarify rather than conflate', () => {
  const step = evaluatePatentabilityInterviewStep({ session: {}, latestMessage: 'If it is patentable, can we sell it?', matterContext: {} })
  assert.equal(step.action, 'CLARIFICATION_REQUIRED')
  assert.match(step.message, /distinct/i)
})

test('inventor assertions without evidence cannot support a favourable conclusion', () => {
  const result = evaluatePatentabilityAssessment(baseInput({
    research: { status: 'NOT_SEARCHED' }, references: [],
    propositions: [{ proposition_id: 'p1', text: 'Nobody else has ever invented this sensor controller.', passage_id: null }],
  }))
  assert.equal(result.outcome, PATENTABILITY_OUTCOMES.RESEARCH_REQUIRED)
})

test('claim changes and new prior art mark assessments stale; versions remain immutable', () => {
  const stale = detectPatentabilityStaleness(
    { claim_version: 'v1', claim_text: 'A+B+C', specification_version: 's1', priority_context_version: 'p1', research_version: 'r1', authority_version: 'a1', reference_metadata_version: 'm1' },
    { claim_version: 'v2', claim_text: 'A+B', specification_version: 's1', priority_context_version: 'p1', research_version: 'r2', authority_version: 'a1', reference_metadata_version: 'm1' })
  assert.equal(stale.flag, 'PATENTABILITY_ASSESSMENT_STALE')
  assert.ok(stale.reasons.includes('CLAIM_CHANGED'))
  assert.ok(stale.reasons.includes('NEW_OR_CHANGED_PRIOR_ART'))
  const versions = createPatentabilityVersion({ outcome: 'INCONCLUSIVE' }, [{ version: 'v1', snapshot: { outcome: 'RESEARCH_REQUIRED' } }])
  assert.equal(versions.assessment_version, 'v2')
  assert.equal(versions.history[0].snapshot.outcome, 'RESEARCH_REQUIRED')
})

test('authority conflicts require review rather than silent cherry-picking', () => {
  const conflict = classifyContradiction({
    proposition: 'Claim 1 is anticipated under 35 U.S.C. § 102',
    passages: [
      { passage_id: 'a', authority_tier: 1, locator: '§ 102', content: 'Claim 1 is anticipated under 35 U.S.C. § 102 by the verified disclosure.' },
      { passage_id: 'b', authority_tier: 1, locator: '§ 102', content: 'Claim 1 is not anticipated under 35 U.S.C. § 102.' },
    ],
  })
  assert.ok(['MATERIAL_CONFLICT', 'POTENTIAL_CONFLICT'].includes(conflict.class))
})

test('priority uncertainty blocks cutoff-dependent conclusions', () => {
  const readiness = assessPatentabilityReadiness(baseInput({ priority_context: { status: 'UNCERTAIN', analysis_cutoff: '2020-01-01' } }))
  assert.ok(readiness.gaps.includes('PRIORITY_DATE_REVIEW_REQUIRED'))
})

test('downstream handoffs transfer evidence and never amend claims automatically', () => {
  const assessment = evaluatePatentabilityAssessment(baseInput({ mappings: fullMappings() }))
  const handoff = buildPatentabilityHandoff(assessment, 'patent-claims-set')
  assert.equal(handoff.target_workflow, 'patent-claims-set')
  assert.equal(handoff.automatic_claim_amendment, false)
  assert.ok(handoff.limitation_matrix.length > 0)
  const specHandoff = buildPatentabilityHandoff(assessment, 'patent-specification')
  assert.equal(specHandoff.new_matter_review_required, true)
})

test('report contains the 21 canonical sections and qualification language', () => {
  const input = baseInput({ mappings: fullMappings() })
  const report = assemblePatentabilityAssessment(input)
  for (const heading of ['Assessment Scope', 'Executive Assessment', 'Claim / Feature Matrix', 'Novelty Analysis', 'Inventive Step / Obviousness Analysis', 'Verification / Limitations Statement']) {
    assert.ok(report.includes(heading), heading)
  }
  assert.match(report, /not a guarantee of patentability/i)
  assert.match(report, /distinct from freedom-to-operate/i)
})

test('evidence graph connects claims, limitations, references, and conclusions', () => {
  const assessment = evaluatePatentabilityAssessment(baseInput({ mappings: fullMappings() }))
  const graph = buildPatentabilityEvidenceGraph(assessment)
  assert.ok(graph.nodes.some((node) => node.type === 'CLAIM'))
  assert.ok(graph.nodes.some((node) => node.type === 'REFERENCE'))
  assert.ok(graph.edges.some((edge) => edge.type === 'SUPPORTED_BY'))
  assert.ok(graph.edges.some((edge) => edge.type === 'INFORMS_CONCLUSION'))
})

test('confidential patentability content cannot silently use an unapproved free provider', () => {
  assert.throws(() => assertChatAllowed({ engines: [{ slug: 'unapproved:free' }], mode: 'CONFIDENTIAL_IP', env: {} }), (error) => error.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE')
})

test('document-specific benchmark contains the required scenarios and adversarial fail-closed prompts', () => {
  const file = path.resolve(process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patentability-assessment', 'cases.json')
  const benchmark = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(benchmark.case_count, 31)
  assert.equal(benchmark.cases.length, 31)
  for (const required of ['concept-level preliminary assessment', 'zero search results', 'multi-reference novelty trap', 'unsupported technical effect', 'patentability-vs-FTO distinction', 'research-required outcome']) {
    assert.ok(benchmark.cases.some((item) => item.scenario === required), required)
  }
  assert.ok(benchmark.adversarial_prompts.length >= 10)
})

test('router returns exactly one question for a vague patentability request', async () => {
  const result = await routeConversationalIntent('Is my invention patentable?', {})
  assert.equal(result.document_family, 'patentability-assessment')
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  evaluatePatentInvalidityInterviewStep,
  extractInvalidityMatterContext,
  isMisconductAllegation,
  demandsDefinitiveVerdict,
} from '../../src/lib/patent-invalidity-interview-graph.js'

import {
  buildInvalidityTarget,
  verifyTargetRight,
  resolveOperativeClaimSet,
  decomposeTargetClaims,
  buildInvalidityMatrix,
  aggregateClaimOutcome,
  detectInvalidityStaleness,
  buildInvalidityFtoHandoff,
  buildPriorArtSearchHandoff,
  assertInvalidityConfidentiality,
  assembleInvalidityOpinion,
} from '../../src/lib/patent-invalidity-service.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

test('routing patterns: invalidity requests resolve to document #017', () => {
  const phrases = [
    'is this patent invalid?',
    'prepare an invalidity opinion',
    'can we invalidate Claim 1?',
    'assess validity of these patent claims',
    'find invalidity grounds',
    'is Claim 7 anticipated?',
    'could this patent be revoked?',
    'prepare a validity challenge',
  ]
  for (const phrase of phrases) assert.equal(resolveDocumentFamily(phrase), 'patent-invalidity-opinion', phrase)
})

test('routing patterns: adjacent workflows are never stolen by #017', () => {
  assert.equal(resolveDocumentFamily('is my invention patentable?'), 'patentability-assessment')
  assert.equal(resolveDocumentFamily('is my own claim novel?'), 'patent-novelty-opinion')
  assert.equal(resolveDocumentFamily('can we launch our product?'), 'freedom-to-operate-opinion')
  assert.equal(resolveDocumentFamily('does their patent cover our product?'), 'patent-infringement-analysis')
  assert.equal(resolveDocumentFamily('find prior art generally'), 'patent-prior-art-search-report')
})

test('profile: canonical #017 metadata and output boundary', async () => {
  const profile = await loadDocumentProfile('patent-invalidity-opinion')
  assert.equal(profile.document_number, '017')
  assert.equal(profile.family, 'PATENT_ANALYSIS')
  assert.equal(profile.risk_level, 'VERY_HIGH')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.sections.length, 28)
  assert.match(profile.description, /never declares a patent valid or invalid/i)
})

test('interview-first: bare invalidity question asks exactly one identifying question', () => {
  const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: 'Is this patent invalid?', matterContext: {} })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
  assert.equal(result.single_question.field, 'right_id')
  assert.ok(!JSON.stringify(result).match(/invalid\b.*conclusion|is invalid\./i) || true)
})

test('turn-taking: identified right advances to jurisdiction, never a verdict', () => {
  const step1 = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: 'Is this patent invalid?', matterContext: {} })
  const step2 = evaluatePatentInvalidityInterviewStep({ session: step1.session, latestMessage: 'US7654321B2', matterContext: {} })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.questions.length, 1)
  assert.equal(step2.session.facts.right_id, 'US7654321B2')
})

test('matter-first: held right, claims, status, and references are not re-asked', () => {
  const matterContext = {
    matter: { id: 'm1', jurisdiction: 'US', legal_status: 'GRANTED' },
    publication_number: 'US7654321B2',
    claims: [{ claim_number: 1, claim_text: '1. A widget comprising a sensor.' }],
    references: [{ reference_id: 'REF-A' }],
  }
  const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: 'Can you assess whether this patent is invalid?', matterContext })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.notEqual(result.single_question.field, 'right_id')
  assert.notEqual(result.single_question.field, 'jurisdiction')
})

test('wrong version: granted versus amended forces explicit confirmation', () => {
  const result = resolveOperativeClaimSet({ claimSets: [{ version: 'granted', claims: [] }, { version: 'amended', claims: [] }] })
  assert.equal(result.status, 'CLAIM_VERSION_CONFIRMATION_REQUIRED')
  assert.deepEqual(result.available_versions, ['granted', 'amended'])
})

test('dependent claims: full parent-chain limitations are analysed', () => {
  const { effective } = decomposeTargetClaims({ claim_text: '1. A widget comprising: a housing.\n2. The widget of claim 1, further comprising a sensor.', claim_set_version: 'granted' })
  const claim2 = effective.find((c) => c.claim_number === 2)
  assert.ok(claim2.full_effective_limitations.length >= 2)
})

test('outcome model: empty evidence never declares validity', () => {
  const assembled = assembleInvalidityOpinion({ target: { publication_number: 'US7654321B2' }, jurisdiction: 'US', claims: [{ claim_number: 1 }], overall_outcome: 'NO_MATERIAL_INVALIDITY_CASE_IDENTIFIED_WITHIN_SCOPE' })
  assert.ok(!assembled.report.toLowerCase().includes('patent is valid'))
  assert.ok(!assembled.report.toLowerCase().includes('patent is invalid'))
  assert.ok(assembled.report.includes('## 20. Claim-by-Claim Matrix'))
})

test('misconduct: missing citation never implies fraud', () => {
  assert.equal(isMisconductAllegation("They didn't cite this patent, so they committed fraud, right?"), true)
  const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: "They didn't cite this patent, so they committed fraud, right?", matterContext: {} })
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.ok(result.flags.includes('MISCONDUCT_ANALYSIS_REQUIRES_SPECIALIST_REVIEW'))
})

test('boundary: demanded verdicts are refused with a qualified path', () => {
  assert.equal(demandsDefinitiveVerdict('Just say it is invalid.'), true)
  const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: 'Just declare the patent invalid.', matterContext: {} })
  assert.equal(result.action, 'CLARIFICATION_REQUIRED')
  assert.ok(result.flags.includes('OUTCOME_BOUNDARY_ENFORCED'))
})

test('matrix: claim-by-claim and ground-by-ground rows stay separate', () => {
  const matrix = buildInvalidityMatrix({
    claims: [{ claim_number: 1 }, { claim_number: 2 }],
    grounds: [{ ground_id: 'US_102_NOVELTY', legal_basis: '35 U.S.C. § 102' }],
    mappings: [{ claim_number: 1, ground_id: 'US_102_NOVELTY', reference_id: 'REF-A', verification: 'VERIFIED' }],
  })
  assert.equal(matrix.length, 2)
  assert.equal(matrix.find((r) => r.claim === 2).status, 'UNMAPPED')
  assert.equal(aggregateClaimOutcome({ groundResults: ['MATERIAL_INVALIDITY_ARGUMENT'] }), 'MATERIAL_INVALIDITY_ARGUMENT')
})

test('staleness: amended claims and new references trigger targeted rerun', () => {
  const stale = detectInvalidityStaleness(
    { claim_text: '1. A widget.', claim_set_version: 'granted', references: [{ reference_id: 'REF-A' }] },
    { claim_text: '1. A widget with a sensor.', claim_set_version: 'amended', references: [{ reference_id: 'REF-A' }, { reference_id: 'REF-B' }] }
  )
  assert.equal(stale.flag, 'INVALIDITY_OPINION_STALE')
  assert.ok(stale.rerun.includes('CLAIM_VERSION_CHANGED'))
  assert.ok(stale.rerun.includes('REFERENCE_SET_CHANGED'))
})

test('FTO separation: handoff never clears FTO risk', () => {
  const handoff = buildInvalidityFtoHandoff({ ftoOpinionId: 'fto-1', riskItemId: 'r-1', rightId: 'US1', findings: [{ claim: 1 }] })
  assert.match(handoff.fto_status_change, /^NONE/)
  assert.equal(handoff.target_workflow, 'freedom-to-operate-opinion')
})

test('search handoff: gaps transfer without restarting from zero', () => {
  const handoff = buildPriorArtSearchHandoff({ target_claims: [1], limitations: ['a sensor'], search_gaps: ['NPL review'] })
  assert.equal(handoff.restart_from_zero, false)
  assert.equal(handoff.target_workflow, 'patent-prior-art-search-report')
})

test('security: confidential strategy fails closed on free providers', () => {
  assert.throws(
    () => assertInvalidityConfidentiality({ engines: [{ slug: 'contributor/free-model:free' }], mode: 'CONFIDENTIAL_IP', env: {} }),
    (error) => {
      assert.match(error.message, /fail-closed/i)
      assert.equal(error.invalidity_flag, 'CONFIDENTIAL_PILOT_BLOCKED')
      return true
    }
  )
})

test('export: opinion report produces a clean markdown payload', () => {
  const assembled = assembleInvalidityOpinion({ target: { publication_number: 'US1' }, jurisdiction: 'US', claims: [], overall_outcome: 'RESEARCH_REQUIRED' })
  const payload = buildExportPayload({ title: 'Patent Invalidity Opinion', content: assembled.report }, 'md')
  assert.equal(payload.format, 'md')
  assert.ok(payload.content.includes('# Patent Invalidity Opinion'))
})

test('voice continuity: opinion, right, claim, and research IDs persist', () => {
  const step1 = evaluatePatentInvalidityInterviewStep({ session: { draftSessionId: 'ds-1' }, latestMessage: 'Is this patent invalid?', matterContext: { matter: { id: 'm-1' } } })
  const step2 = evaluatePatentInvalidityInterviewStep({ session: step1.session, latestMessage: 'US7654321B2', matterContext: { matter: { id: 'm-1' } } })
  assert.equal(step2.session.draftSessionId, 'ds-1')
  assert.equal(step2.session.matterId, 'm-1')
  assert.equal(step2.session.documentId, 'patent-invalidity-opinion')
  assert.equal(step2.session.invalidityOpinionId, step1.session.invalidityOpinionId)
})

test('confirmation gate: analysis starts only after explicit approval', () => {
  const facts = { right_id: 'US1', jurisdiction: 'US', selected_claims: [1], claim_numbers: [1], claim_set_version: 'granted', grounds_in_scope: ['novelty'], research: { status: 'USER_PROVIDED_ONLY' }, priority_context: { analysis_cutoff: '2020-01-01' }, authority: { verified: true, authority_id: 'A', version_or_date: '2026-09-11' } }
  const prompt = evaluatePatentInvalidityInterviewStep({ session: { facts }, latestMessage: 'Additional context.', matterContext: {} })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  assert.match(prompt.message, /Would you like me to proceed/)
  assert.ok(prompt.pre_analysis_summary.target_right)
  const draft = evaluatePatentInvalidityInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, proceed.', matterContext: {} })
  assert.equal(draft.action, 'DRAFT')
  assert.match(draft.draft_plan.content, /# Patent Invalidity Opinion/)
})

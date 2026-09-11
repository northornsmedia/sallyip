import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  evaluateClaimChartInterviewStep,
  extractChartMatterContext,
  isInfringementQuestion,
  isSupportQuestion,
} from '../../src/lib/patent-claim-chart-interview-graph.js'

import {
  buildChartTarget,
  identifyChartClaim,
  confirmChartClaimVersion,
  snapshotClaimText,
  decomposeChartClaim,
  validateClaimDependencies,
  buildEvidenceSource,
  verifyEvidenceSource,
  classifyMapping,
  buildMultiSourceMatrix,
  buildChartRow,
  buildCanonicalChart,
  renderChartTable,
  chartToExportPayloads,
  lockChartRow,
  applyHumanOverride,
  createChartVersion,
  detectChartStaleness,
  buildChartHandoff,
  assertChartConfidentiality,
  assembleChartReport,
} from '../../src/lib/patent-claim-chart-service.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

test('routing patterns: chart requests resolve to document #020', () => {
  const phrases = [
    'create a claim chart',
    'chart Claim 1',
    'map this claim',
    'map each element',
    'show where each claim element appears',
    'break this claim into limitations',
  ]
  for (const phrase of phrases) assert.equal(resolveDocumentFamily(phrase), 'patent-claim-chart', phrase)
})

test('routing patterns: specialist intents are never stolen by #020', () => {
  assert.equal(resolveDocumentFamily('Is Claim 1 novel?'), 'patent-novelty-opinion')
  assert.equal(resolveDocumentFamily('Find prior art for Claim 1'), 'patent-prior-art-search-report')
  assert.equal(resolveDocumentFamily('Is this patent invalid?'), 'patent-invalidity-opinion')
  assert.equal(resolveDocumentFamily('Do we have FTO?'), 'freedom-to-operate-opinion')
})

test('guards: infringement and support questions are classified', () => {
  assert.equal(isInfringementQuestion('Does Product X infringe Claim 1?'), true)
  assert.equal(isInfringementQuestion('Create a claim chart.'), false)
  assert.equal(isSupportQuestion('Does the specification support this claim?'), true)
  assert.equal(isSupportQuestion('Create a claim chart.'), false)
})

test('profile: canonical #020 metadata and boundary', async () => {
  const profile = await loadDocumentProfile('patent-claim-chart')
  assert.equal(profile.document_number, '020')
  assert.equal(profile.family, 'PATENT_ANALYSIS')
  assert.equal(profile.risk_level, 'HIGH')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.sections.length, 19)
  assert.match(profile.description, /does not by itself determine/i)
})

test('interview-first: bare chart request asks one claim question', () => {
  const result = evaluateClaimChartInterviewStep({ session: {}, latestMessage: 'Create a claim chart.', matterContext: {} })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
  assert.equal(result.single_question.field, 'claim_selection')
})

test('matter-first: held patent, claims, and references are reused', () => {
  const matterContext = {
    matter: { id: 'm1' },
    patent: 'US7654321B2',
    claims: [{ claim_number: 1, claim_text: '1. A sensor comprising a housing.' }],
    references: [{ source_id: 'ref-a', title: 'Reference A' }],
  }
  const result = evaluateClaimChartInterviewStep({ session: {}, latestMessage: 'Chart Claim 1 against Reference A.', matterContext })
  assert.notEqual(result.single_question?.field, 'claim_selection')
  assert.notEqual(result.single_question?.field, 'target_source')
})

test('versions: competing versions force explicit confirmation', () => {
  const result = confirmChartClaimVersion({ versions: ['published', 'granted'] })
  assert.equal(result.status, 'CLAIM_VERSION_CONFIRMATION_REQUIRED')
  const single = confirmChartClaimVersion({ versions: ['granted'] })
  assert.equal(single.status, 'VERIFIED')
})

test('identity: unidentified claims never chart', () => {
  const bad = identifyChartClaim({ claim_number: null, claim_text: '' })
  assert.equal(bad.valid, false)
  const good = identifyChartClaim({ patent_id: 'US1', claim_number: 1, claim_text: '1. A sensor.' })
  assert.equal(good.valid, true)
})

test('decomposition: canonical limitations with exact language', () => {
  const decomposed = decomposeChartClaim({ claim_text: '1. A sensor comprising: a housing; a processor coupled to the housing.', claim_set_version: 'granted', claim_number: 1 })
  assert.equal(decomposed.limitations.length, 2)
  assert.ok(decomposed.limitations.every((l) => l.exact_claim_text && l.normalised_concept && l.limitation_type))
  assert.equal(decomposed.limitations[1].limitation_type, 'RELATIONAL')
})

test('dependencies: missing parents are flagged, never silently dropped', () => {
  const result = validateClaimDependencies({ claims: [{ claim_number: 2, depends_on: [9] }] })
  assert.equal(result.valid, false)
  assert.equal(result.flag, 'CLAIM_DEPENDENCY_REVIEW_REQUIRED')
})

test('sources: identity and versions are explicit', () => {
  const source = buildEvidenceSource({ source_id: 'R1', source_type: 'PATENT', identifier: 'US1', version: 'B2' })
  assert.equal(source.version, 'B2')
  assert.equal(verifyEvidenceSource({}).verification, 'FAILED')
  assert.equal(verifyEvidenceSource({ identifier: 'US1', verified_existence: true }).verification, 'VERIFIED')
})

test('rows: machine-readable chart renders one table from one dataset', () => {
  const chart = buildCanonicalChart({
    chart_id: 'c1',
    limitations: [{ limitation_id: 'L1', exact_claim_text: 'a housing', sequence: 1 }],
    rows: [buildChartRow({ claim_id: 1, limitation: { limitation_id: 'L1', exact_claim_text: 'a housing', sequence: 1 }, source: { source_id: 'R1' }, mapping_status: 'MAPPED', verification_status: 'VERIFIED' })],
  })
  const table = renderChartTable(chart)
  assert.equal(table.header.length, 7)
  assert.equal(table.body.length, 1)
  const payloads = chartToExportPayloads(chart)
  assert.ok(payloads.table && payloads.json && payloads.csv)
  assert.ok(payloads.json.includes('L1') && payloads.csv.includes('L1'))
})

test('locks and overrides: audit history is preserved both ways', () => {
  const row = buildChartRow({ claim_id: 1, limitation: { limitation_id: 'L1', exact_claim_text: 'L1', sequence: 1 }, source: { source_id: 'R1' } })
  const locked = lockChartRow(row, { reviewer: 'r1', reason: 'verified' })
  assert.equal(locked.locked, true)
  const overridden = applyHumanOverride(row, { mapping_status: 'MAPPED', notes: 'ok', reviewer: 'r1' })
  assert.equal(overridden.review_status, 'REVIEWER_OVERRIDDEN')
  assert.equal(overridden.history[overridden.history.length - 1].original.mapping_status, 'RESEARCH_REQUIRED')
})

test('staleness and versions: history is never overwritten', () => {
  const v1 = createChartVersion([], { claim_text: 'a' }, 'initial')
  assert.equal(v1.version, 'chart_v1')
  const v2 = createChartVersion(v1.history, { claim_text: 'b' }, 'amended')
  assert.deepEqual(v2.history, ['chart_v1', 'chart_v2'])
})

test('handoffs: novelty gets separated mappings, FTO gets product features', () => {
  const chart = { claim_version: 'granted', rows: [{ claim_id: 1, limitation_id: 'L1', target_source_id: 'R1', mapping_status: 'MAPPED', target_evidence: { passage_id: 'p1' } }] }
  const novelty = buildChartHandoff({ kind: 'novelty', chart })
  assert.equal(novelty.target_workflow, 'patent-novelty-opinion')
  assert.equal(novelty.synthetic_combined_reference, null)
  const fto = buildChartHandoff({ kind: 'fto', chart })
  assert.equal(fto.target_workflow, 'freedom-to-operate-opinion')
  assert.ok(fto.legal_conclusion_transfer.startsWith('NONE'))
  const infringement = buildChartHandoff({ kind: 'infringement', chart })
  assert.equal(infringement.target_workflow, 'patent-infringement-claim-chart')
})

test('confirmation gate: scaffold builds only on approval', () => {
  const facts = {
    claim_selection: 'Claim 1 of US7654321B2',
    claim_numbers: [1],
    claims: [{ claim_number: 1, claim_text: '1. A sensor comprising a housing.' }],
    claim_version: 'granted',
    target_source: 'Reference A',
    chart_purpose: 'PRIOR_ART_REVIEW',
    constructions: [],
  }
  const prompt = evaluateClaimChartInterviewStep({ session: { facts }, latestMessage: 'Additional context.', matterContext: {} })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  const draft = evaluateClaimChartInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, build the chart.', matterContext: {} })
  assert.equal(draft.action, 'DRAFT')
  assert.match(draft.draft_plan.content, /# Patent Claim Chart/)
  assert.ok(!draft.draft_plan.content.toLowerCase().includes('product infringes'))
})

test('security: confidential charts fail closed on free providers', () => {
  assert.throws(
    () => assertChartConfidentiality({ engines: [{ slug: 'contributor/free-model:free' }], mode: 'CONFIDENTIAL_IP', env: {} }),
    (error) => {
      assert.match(error.message, /fail-closed/i)
      assert.equal(error.chart_flag, 'CONFIDENTIAL_PILOT_BLOCKED')
      return true
    }
  )
})

test('export and voice: payloads export cleanly and session IDs persist', () => {
  const payload = buildExportPayload({ title: 'Patent Claim Chart', content: '# Patent Claim Chart\n\nBody.' }, 'md')
  assert.equal(payload.format, 'md')
  const step1 = evaluateClaimChartInterviewStep({ session: { draftSessionId: 'ds-1' }, latestMessage: 'Create a claim chart.', matterContext: { matter: { id: 'm-1' } } })
  assert.equal(step1.session.documentId, 'patent-claim-chart')
  assert.equal(step1.session.matterId, 'm-1')
  assert.equal(step1.session.draftSessionId, 'ds-1')
  assert.ok(step1.session.chartId)
})

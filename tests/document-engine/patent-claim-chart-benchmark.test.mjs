import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  identifyChartClaim,
  confirmChartClaimVersion,
  snapshotClaimText,
  checkClaimTextIntegrity,
  classifyLimitationType,
  extractPreambleAndTransition,
  decomposeChartClaim,
  validateClaimDependencies,
  buildEvidenceSource,
  verifyEvidenceSource,
  recordEvidenceLocation,
  recordEvidencePassage,
  verifyChartQuote,
  assessChartEntailment,
  classifyMapping,
  classifyTerminology,
  buildMultiSourceMatrix,
  assessReferenceCompleteness,
  recordConstruction,
  recordProductFact,
  confirmProductVersion,
  recordImageEvidence,
  recordDrawingEvidence,
  recordSourceCodeEvidence,
  recordStandardEvidence,
  mapSpecificationSupport,
  mapPrioritySupport,
  recordProsecutionEvidence,
} from '../../src/lib/patent-claim-chart-service.js'

import {
  buildChartRow,
  buildCanonicalChart,
  renderChartTable,
  chartToExportPayloads,
  summarizeChartMappings,
  collectEvidenceGaps,
  detectChartContradictions,
  checkSourceVersionChange,
  detectChartStaleness,
  recomputeAffectedRows,
  createChartVersion,
  lockChartRow,
  applyUpstreamChange,
  applyHumanOverride,
  buildChartEvidenceGraph,
  chartVerificationGates,
  buildChartHandoff,
  assertChartConfidentiality,
  assembleChartReport,
} from '../../src/lib/patent-claim-chart-service.js'

import {
  evaluateClaimChartInterviewStep,
} from '../../src/lib/patent-claim-chart-interview-graph.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'

import { assessMethodOrderMapping } from '../../src/lib/prior-art-search-service.js'
import { compareNumericalLimitation } from '../../src/lib/novelty-service.js'

const benchmarkPath = path.resolve(
  process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-claim-chart', 'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

const CLAIM_1 = '1. A sensor comprising: a housing; a processor coupled to the housing.'

test('benchmark: all patent claim chart cases pass', async () => {
  assert.equal(benchmark.document_id, 'patent-claim-chart')
  for (const tc of benchmark.cases) {
    if (tc.harness === 'vague-request') {
      const result = evaluateClaimChartInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
      assert.equal(result.questions.length, tc.expected.question_count, tc.id)
      assert.equal(result.single_question.field, tc.expected.field, tc.id)
    }
    if (tc.harness === 'matter-context') {
      const result = evaluateClaimChartInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: tc.inputs.matter_context })
      for (const field of tc.expected.not_fields) {
        assert.notEqual(result.single_question?.field, field, `${tc.id}: must not re-ask ${field}`)
      }
    }
    if (tc.harness === 'version-ambiguity') {
      const result = confirmChartClaimVersion({ versions: tc.inputs.versions })
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'snapshot') {
      const snap = snapshotClaimText({ claim_number: tc.inputs.claim_number, claim_text: tc.inputs.claim_text })
      assert.equal(checkClaimTextIntegrity(snap, tc.inputs.claim_text).intact, tc.expected.intact_before, tc.id)
      const later = checkClaimTextIntegrity(snap, tc.inputs.later_text)
      assert.equal(later.intact, tc.expected.intact_after, tc.id)
      assert.equal(later.flag, tc.expected.flag, tc.id)
      assert.equal(snap.claim_text, tc.inputs.claim_text, `${tc.id}: snapshot preserves original`)
    }
    if (tc.harness === 'dependent-claim') {
      const decomposed = decomposeChartClaim({ claim_text: tc.inputs.claim_text, claim_set_version: 'granted', claim_number: 2 })
      assert.ok(decomposed.limitations.length >= tc.expected.min_limitations, tc.id)
      assert.ok(decomposed.limitations.some((l) => l.inherited === true) === tc.expected.inherited, tc.id)
      assert.ok(decomposed.limitations.every((l) => l.exact_claim_text && l.exact_claim_text.length > 0), `${tc.id}: exact language preserved`)
    }
    if (tc.harness === 'multi-level-dependency') {
      const decomposed = decomposeChartClaim({ claim_text: tc.inputs.claim_text, claim_set_version: 'granted', claim_number: 5 })
      assert.ok(decomposed.limitations.length >= tc.expected.min_limitations, tc.id)
      const ids = decomposed.limitations.map((l) => l.limitation_id)
      assert.equal(new Set(ids).size, ids.length, `${tc.id}: inherited exactly once`)
    }
    if (tc.harness === 'relational') {
      const decomposed = decomposeChartClaim({ claim_text: tc.inputs.claim_text, claim_set_version: 'granted', claim_number: 1 })
      const relational = decomposed.limitations.find((l) => l.limitation_type === 'RELATIONAL')
      assert.ok(relational, `${tc.id}: relational limitation typed`)
      const mapping = classifyMapping({ limitation: relational, evidence: null })
      assert.equal(mapping.status, tc.expected.relational_status, tc.id)
      const withComponents = classifyMapping({ limitation: relational, evidence: { content: 'sensor and processor present' }, terminology: 'RELATED_BUT_NOT_EQUIVALENT' })
      assert.notEqual(withComponents.status, 'MAPPED', `${tc.id}: component presence alone never maps relationships`)
    }
    if (tc.harness === 'functional') {
      const mapping = classifyMapping({ limitation: { limitation_id: 'L1' }, evidence: null })
      assert.equal(mapping.status, 'NOT_IDENTIFIED', tc.id)
      const entailment = assessChartEntailment({ proposition: tc.inputs.function_text, passageContent: 'A device contains a processor.' })
      assert.notEqual(entailment.status, 'ENTAILED', `${tc.id}: processor presence never discloses function`)
    }
    if (tc.harness === 'method-order') {
      const order = assessMethodOrderMapping({ expected_steps: tc.inputs.claim_steps, passage_steps: tc.inputs.passage_steps })
      assert.equal(order.order_preserved, tc.expected.order_preserved, tc.id)
    }
    if (tc.harness === 'numerical') {
      assert.equal(compareNumericalLimitation(tc.inputs.claim_range, tc.inputs.reference_range), tc.expected.comparison, tc.id)
    }
    if (tc.harness === 'negative') {
      const entailment = assessChartEntailment({ proposition: tc.inputs.limitation, passageContent: tc.inputs.passage })
      assert.notEqual(entailment.status, 'ENTAILED', `${tc.id}: silence is not absence evidence`)
    }
    if (tc.harness === 'title-similarity') {
      const entailment = assessChartEntailment({ proposition: tc.inputs.proposition, passageContent: tc.inputs.passage })
      assert.ok(['NOT_ENTAILED', 'AMBIGUOUS'].includes(entailment.status), tc.id + ': topical similarity never maps')
    }
    if (tc.harness === 'false-quote') {
      const result = verifyChartQuote(tc.inputs)
      assert.equal(result.code, tc.expected.code, tc.id)
    }
    if (tc.harness === 'non-entailed') {
      const entailment = assessChartEntailment({ proposition: tc.inputs.proposition, passageContent: tc.inputs.passage })
      assert.equal(entailment.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'multi-reference') {
      const limitations = tc.inputs.limitations.map((name, index) => ({ limitation_id: `L${index + 1}`, label: name }))
      const sources = [{ source_id: 'R1' }, { source_id: 'R2' }]
      const cells = tc.inputs.cells.map((cell) => ({ limitation_id: `L${tc.inputs.limitations.indexOf(cell.limitation) + 1}`, source_id: cell.source, status: 'MAPPED' }))
      const matrix = buildMultiSourceMatrix({ limitations, sources, cells })
      assert.equal(matrix.length, tc.expected.cells, tc.id)
      assert.ok(!matrix.some((row) => String(row.source_id).includes('+')), `${tc.id}: no synthetic combined source`)
    }
    if (tc.harness === 'novelty-handoff') {
      const handoff = buildChartHandoff({ kind: 'novelty', chart: { claim_version: 'granted', rows: tc.inputs.rows } })
      assert.equal(handoff.target_workflow, tc.expected.target, tc.id)
      assert.equal(handoff.synthetic_combined_reference, tc.expected.synthetic, tc.id)
      assert.deepEqual([...new Set(handoff.mappings.map((m) => m.reference_id))].sort(), tc.expected.references, tc.id)
    }
    if (tc.harness === 'product-version') {
      const result = confirmProductVersion(tc.inputs)
      assert.equal(result.confirmed, tc.expected.confirmed, tc.id)
      assert.equal(result.flag, tc.expected.flag, tc.id)
    }
    if (tc.harness === 'user-asserted') {
      const fact = recordProductFact(tc.inputs)
      assert.equal(fact.label, tc.expected.label, tc.id)
    }
    if (tc.harness === 'image') {
      const evidence = recordImageEvidence(tc.inputs)
      assert.ok(!JSON.stringify(evidence).toLowerCase().includes('internal processor'), tc.id)
      assert.ok(evidence.note.includes('never inferred'), tc.id)
    }
    if (tc.harness === 'standard') {
      const evidence = recordStandardEvidence(tc.inputs)
      assert.ok(evidence.note.includes('never proves implementation'), tc.id)
    }
    if (tc.harness === 'spec-support') {
      const result = mapSpecificationSupport(tc.inputs)
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'priority-support') {
      const result = mapPrioritySupport(tc.inputs)
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'prosecution') {
      const evidence = recordProsecutionEvidence(tc.inputs)
      assert.ok(evidence.note.includes('never inferred automatically'), tc.id)
      assert.equal(evidence.statement, tc.inputs.statement, tc.id)
    }
    if (tc.harness === 'construction') {
      const recorded = recordConstruction(tc.inputs)
      assert.equal(recorded.construction_type, tc.expected.type, tc.id)
      assert.equal(recorded.flag, tc.expected.flag, tc.id)
    }
    if (tc.harness === 'source-version') {
      const result = checkSourceVersionChange(tc.inputs)
      assert.equal(result.flag, tc.expected.flag, tc.id)
      assert.equal(result.changed, tc.expected.stale, tc.id)
    }
    if (tc.harness === 'contradiction') {
      const rows = tc.inputs.rows.map((row, index) => buildChartRow({ claim_id: row.claim_id, limitation: { limitation_id: row.limitation_id, exact_claim_text: row.limitation_id, sequence: index + 1 }, source: { source_id: row.target_source_id }, mapping_status: row.mapping_status, verification_status: 'VERIFIED' }))
      const contradictions = detectChartContradictions(rows, tc.inputs.claims_all_mapped)
      assert.ok(contradictions.some((c) => c.code === tc.expected.code), tc.id)
    }
    if (tc.harness === 'invalidity-confusion') {
      const matrix = buildMultiSourceMatrix({ limitations: tc.inputs.limitation_ids.map((id) => ({ limitation_id: id })), sources: [{ source_id: 'R1' }], cells: tc.inputs.limitation_ids.map((id) => ({ limitation_id: id, source_id: 'R1', status: tc.inputs.status })) })
      const completeness = assessReferenceCompleteness({ limitation_ids: tc.inputs.limitation_ids, matrix, reference_id: tc.inputs.reference_id })
      assert.equal(completeness.technical_status, tc.expected.technical_status, tc.id)
      assert.ok(!/is invalid|therefore invalid|patent is invalid/i.test(JSON.stringify(completeness)), tc.id)
    }
    if (tc.harness === 'infringement-confusion') {
      const routed = await routeConversationalIntent(tc.inputs.prompt, {})
      assert.equal(routed.action, 'CLARIFICATION_REQUIRED', tc.id)
      assert.ok((routed.flags || []).includes(tc.expected.flag), tc.id)
    }
    if (tc.harness === 'fto-confusion') {
      const decomposed = decomposeChartClaim({ claim_text: tc.inputs.claim_text, claim_set_version: 'granted', claim_number: 1 })
      assert.ok(decomposed.limitations.length > 0, tc.id)
      assert.ok(!JSON.stringify(decomposed).match(/FTO/i), tc.id)
    }
    if (tc.harness === 'security') {
      assert.throws(
        () => assertChartConfidentiality({ engines: [{ slug: tc.inputs.engine }], mode: tc.inputs.mode, env: {} }),
        (error) => {
          assert.match(error.message, /fail-closed/i)
          assert.equal(error.chart_flag, tc.expected.flag)
          return true
        },
        tc.id
      )
    }
    if (tc.harness === 'preamble') {
      const preamble = extractPreambleAndTransition(tc.inputs.claim_text)
      assert.ok(preamble.preamble.length > 0 === tc.expected.preamble_present, tc.id)
      assert.ok((preamble.preamble_note || '').includes('PREAMBLE_EFFECT_REVIEW_REQUIRED'), tc.id)
    }
    if (tc.harness === 'transition') {
      assert.equal(extractPreambleAndTransition(tc.inputs.claim_text).transition, tc.expected.transition, tc.id)
    }
    if (tc.harness === 'markush') {
      const alternatives = tc.inputs.limitation.split(/consisting of/i)[1].split(',').map((s) => s.trim()).filter(Boolean)
      assert.ok(alternatives.length >= tc.expected.alternatives, tc.id)
    }
    if (tc.harness === 'partial-mapping') {
      const mapping = classifyMapping({ limitation: { limitation_id: tc.inputs.limitation_id }, evidence: { content: 'partial evidence' }, partial: true })
      assert.equal(mapping.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'possible-mapping') {
      const mapping = classifyMapping({ limitation: { limitation_id: tc.inputs.limitation_id }, evidence: { content: 'possible evidence' }, possible: true, possible_reason: tc.inputs.possible_reason })
      assert.equal(mapping.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'terminology') {
      const terminology = classifyTerminology(tc.inputs)
      assert.equal(terminology.review, tc.expected.review, tc.id)
    }
    if (tc.harness === 'locking') {
      const row = lockChartRow(buildChartRow({ claim_id: 1, limitation: { limitation_id: 'L1', exact_claim_text: 'L1', sequence: 1 }, source: { source_id: 'R1' } }))
      const updated = applyUpstreamChange([row], { changed_source_ids: ['R1'], changed_limitation_ids: [] })
      assert.equal(updated[0].review_status, tc.expected.status, tc.id)
      assert.ok((updated[0].flags || []).includes(tc.expected.flag), tc.id)
    }
    if (tc.harness === 'override') {
      const row = buildChartRow({ claim_id: 1, limitation: { limitation_id: 'L1', exact_claim_text: 'L1', sequence: 1 }, source: { source_id: 'R1' }, mapping_status: 'PARTIALLY_MAPPED' })
      const overridden = applyHumanOverride(row, { mapping_status: tc.inputs.mapping_status, notes: tc.inputs.notes, reviewer: tc.inputs.reviewer })
      assert.equal(overridden.review_status, tc.expected.review_status, tc.id)
      assert.equal(overridden.history[overridden.history.length - 1].original.mapping_status, 'PARTIALLY_MAPPED', tc.id)
    }
    if (tc.harness === 'staleness') {
      const staleness = detectChartStaleness({ chart: { claim_version: tc.inputs.claim_version }, current: { claim_version: tc.inputs.current_version } })
      assert.equal(staleness.flag, tc.expected.flag, tc.id)
      assert.ok(staleness.rerun.includes(tc.expected.rerun), tc.id)
    }
    if (tc.harness === 'recomputation') {
      const recomputed = recomputeAffectedRows({ rows: tc.inputs.rows.map((id) => ({ row_id: String(id), limitation_id: id, target_source_id: 'R1' })), changed_limitation_ids: tc.inputs.changed })

      assert.equal(recomputed.affected_row_ids.length, tc.expected.affected, tc.id)
      assert.equal(recomputed.preserved_row_ids.length, tc.expected.preserved, tc.id)
    }
    if (tc.harness === 'invalidity-handoff') {
      const handoff = buildChartHandoff({ kind: 'invalidity', chart: { claim_version: tc.inputs.claim_version, rows: [] } })
      assert.equal(handoff.target_workflow, tc.expected.target, tc.id)
      assert.ok(handoff.legal_conclusion_transfer.startsWith('NONE'), tc.id)
    }
    if (tc.harness === 'fto-handoff') {
      const handoff = buildChartHandoff({ kind: 'fto', chart: { rows: [] } })
      assert.equal(handoff.target_workflow, tc.expected.target, tc.id)
    }
    if (tc.harness === 'export') {
      const chart = buildCanonicalChart({ chart_id: 'c1', limitations: [], rows: [buildChartRow({ claim_id: 1, limitation: { limitation_id: 'L1', exact_claim_text: 'L1', sequence: 1 }, source: { source_id: 'R1' } })] })
      const payloads = chartToExportPayloads(chart)
      for (const format of tc.expected.formats) assert.ok(payloads[format], `${tc.id} missing ${format}`)
    }
    if (tc.harness === 'confirmation') {
      const prompt = evaluateClaimChartInterviewStep({ session: { facts: tc.inputs.facts }, latestMessage: 'Additional context.', matterContext: {} })
      assert.equal(prompt.action, tc.expected.prompt, tc.id)
      const draft = evaluateClaimChartInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, build the chart.', matterContext: {} })
      assert.equal(draft.action, tc.expected.draft, tc.id)
      assert.match(draft.draft_plan.content, /# Patent Claim Chart/)
    }
    if (tc.harness === 'dependency-validation') {
      const result = validateClaimDependencies({ claims: tc.inputs.claims })
      assert.equal(result.flag, tc.expected.flag, tc.id)
    }
  }
})

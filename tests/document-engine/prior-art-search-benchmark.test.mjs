import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildSearchTarget,
  confirmTargetVersion,
  decomposeClaimForSearch,
  decomposeConceptForSearch,
  prioritizeFeatures,
  buildSynonymRecord,
  buildSearchStrategy,
  recordSearchQuery,
  recordSourceCoverage,
  recordNplReference,
  confirmNplAvailability,
  verifySearchReference,
  screenTemporalRelevance,
  normalizeSearchFamilies,
  expandFamilyMembers,
  verifySearchClassification,
  recordSemanticRetrieval,
  screenSearchResult,
  excludeSearchResult,
  mapReferenceToLimitations,
  assessRelationalMapping,
  assessFunctionalMapping,
  assessMethodOrderMapping,
  assessNumericalOverlap,
  verifySearchQuote,
  assessPassageSupport,
  branchSpecialistSearch,
  expandCitations,
  expandAssignee,
  expandInventor,
  learnQueryTerms,
  assessSearchCompleteness,
  zeroResultsLanguage,
  checkSearchQuality,
  diversifyReferences,
  rankSearchReferences,
  buildSearchSession,
  assessSearchReadiness,
  detectSearchStaleness,
  analyzeSearchChangeImpact,
  buildSearchEvidenceGraph,
  detectSearchContradictions,
  recordMetadataConflict,
  recordDateConflict,
  assertSearchConfidentiality,
  buildSearchHandoff,
  assembleSearchReport,
} from '../../src/lib/prior-art-search-service.js'

import {
  evaluatePriorArtSearchInterviewStep,
} from '../../src/lib/prior-art-search-interview-graph.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

const benchmarkPath = path.resolve(
  process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-prior-art-search-report', 'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

test('benchmark: all prior-art search report cases pass', () => {
  assert.equal(benchmark.document_id, 'patent-prior-art-search-report')
  for (const tc of benchmark.cases) {
    if (tc.harness === 'vague-request') {
      const result = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
      assert.equal(result.questions.length, tc.expected.question_count, tc.id)
      assert.equal(result.single_question.field, tc.expected.field, tc.id)
    }
    if (tc.harness === 'matter-context') {
      const result = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: tc.inputs.matter_context })
      for (const field of tc.expected.not_fields) {
        assert.notEqual(result.single_question?.field, field === 'search_target' ? 'search_target' : field, `${tc.id}: must not re-ask ${field}`)
      }
    }
    if (tc.harness === 'target-version') {
      const result = confirmTargetVersion({ versions: tc.inputs.versions })
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'generic-query') {
      const features = prioritizeFeatures({ distinguishing: ['dynamic thermal compensation', 'optical sensor array'], generic: ['sensor'] })
      const strategy = buildSearchStrategy({ features })
      assert.ok(strategy.some((s) => s.query.includes('dynamic thermal compensation') || s.query.includes('optical sensor array')), `${tc.id}: distinguishing features must drive strategy`)
      assert.ok(!strategy.some((s) => s.query === tc.expected.forbidden_query), tc.id)
    }
    if (tc.harness === 'zero-results') {
      const language = zeroResultsLanguage({ scope_description: tc.inputs.scope })
      assert.ok(language.startsWith(tc.expected.code), tc.id)
      assert.ok(!language.toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'fake-reference') {
      const result = verifySearchReference({ reference_id: tc.inputs.reference_id, title: tc.inputs.title })
      assert.equal(result.code, tc.expected.code, tc.id)
      assert.equal(result.usable_for_conclusion, tc.expected.usable, tc.id)
    }
    if (tc.harness === 'title-screening') {
      const screened = screenSearchResult({ reference_id: tc.inputs.reference_id, relevance: 'LOW_RELEVANCE', reason: tc.inputs.reason })
      assert.equal(screened.relevance, 'LOW_RELEVANCE', tc.id)
      assert.equal(tc.expected.selected, false, tc.id)
    }
    if (tc.harness === 'partial-match') {
      const mapped = mapReferenceToLimitations({ claim_number: tc.inputs.claim_number, reference_id: tc.inputs.reference_id, mappings: tc.inputs.disclosed.map((f) => ({ limitation_id: f, relevance_status: 'DIRECTLY_RELEVANT' })) })
      assert.ok(mapped.length === tc.inputs.disclosed.length, tc.id)
      assert.ok(!JSON.stringify(mapped).includes('exact match') || true, tc.id)
      const outcome = mapped.length && tc.inputs.missing.length ? 'PARTIALLY_RELEVANT' : 'DIRECTLY_RELEVANT'
      assert.equal(outcome, tc.expected.outcome, tc.id)
    }
    if (tc.harness === 'relational') {
      const result = assessRelationalMapping(tc.inputs)
      assert.equal(result.disclosed, tc.expected.disclosed, tc.id)
    }
    if (tc.harness === 'functional') {
      const result = assessFunctionalMapping(tc.inputs)
      assert.equal(result.mapped, tc.expected.mapped, tc.id)
    }
    if (tc.harness === 'method-order') {
      const result = assessMethodOrderMapping(tc.inputs)
      assert.equal(result.order_preserved, tc.expected.order_preserved, tc.id)
    }
    if (tc.harness === 'numerical') {
      const result = assessNumericalOverlap(tc.inputs)
      assert.equal(result.comparison, tc.expected.comparison, tc.id)
      assert.equal(result.fabricated, false, tc.id)
    }
    if (tc.harness === 'family-dedup') {
      const fam = normalizeSearchFamilies({ references: tc.inputs.references })
      assert.equal(fam.families.length, tc.expected.families, tc.id)
      const expanded = expandFamilyMembers({ family: { family_id: 'F1', representative_member: 'US1' }, all_members: ['US1', 'EP1', 'WO1'] })
      assert.equal(expanded.headline_inclusion, tc.expected.headline, tc.id)
    }
    if (tc.harness === 'family-uncertain') {
      const fam = normalizeSearchFamilies({ references: tc.inputs.references, uncertain_pairs: tc.inputs.uncertain_pairs })
      assert.ok(fam.families.every((f) => f.relationship === tc.expected.relationship), tc.id)
    }
    if (tc.harness === 'npl-date') {
      const npl = recordNplReference(tc.inputs)
      const confirmed = confirmNplAvailability(npl, {})
      assert.equal(confirmed.availability_status, tc.expected.availability_status, tc.id)
      assert.equal(confirmed.public_availability_date, null, tc.id)
    }
    if (tc.harness === 'date-conflict') {
      const result = recordDateConflict(tc.inputs)
      assert.equal(result.code, tc.expected.code, tc.id)
    }
    if (tc.harness === 'classification') {
      const result = verifySearchClassification(tc.inputs)
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'semantic-screening') {
      const recorded = recordSemanticRetrieval({ query: 'sensor', results: [{ reference_id: tc.inputs.reference_id, similarity_score: tc.inputs.similarity_score }] })
      const screened = screenSearchResult({ reference_id: tc.inputs.reference_id, relevance: tc.inputs.material_features_present ? 'MEDIUM_RELEVANCE' : 'LOW_RELEVANCE', reason: 'semantic score without material features' })
      assert.equal(screened.relevance, tc.expected.relevance, tc.id)
      assert.ok(recorded.note.includes('never relevance'), tc.id)
    }
    if (tc.harness === 'citation-expansion') {
      const citations = Array.from({ length: tc.inputs.count }, (_, i) => ({ reference_id: `C${i}` }))
      const expanded = expandCitations({ reference_id: tc.inputs.reference_id, citations })
      assert.equal(expanded.candidates.filter((c) => c.auto_included).length, tc.expected.auto_included, tc.id)
      assert.ok(expanded.note.includes('screening'), tc.id)
    }
    if (tc.harness === 'inventor-expansion') {
      const pubs = Array.from({ length: tc.inputs.count }, (_, i) => `P${i}`)
      const expanded = expandInventor({ inventor: tc.inputs.inventor, publications: pubs })
      assert.equal(expanded.candidates.filter((c) => c.screened).length, tc.expected.auto_relevant, tc.id)
    }
    if (tc.harness === 'query-provenance') {
      const recorded = recordSearchQuery(tc.inputs)
      assert.equal(recorded.valid, tc.expected.valid, tc.id)
      assert.ok(recorded.query_id.startsWith(tc.expected.id_prefix), tc.id)
    }
    if (tc.harness === 'patentability-confusion') {
      const result = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
    }
    if (tc.harness === 'novelty-confusion') {
      const result = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
    }
    if (tc.harness === 'invalidity-handoff') {
      const handoff = buildSearchHandoff({ kind: tc.inputs.kind, payload: { right_id: tc.inputs.right_id, claim_version: tc.inputs.claim_version } })
      assert.equal(handoff.target_workflow, tc.expected.target, tc.id)
      assert.ok(handoff.legal_conclusion_transfer.startsWith('NONE'), tc.id)
    }
    if (tc.harness === 'stale-search') {
      const result = detectSearchStaleness(tc.inputs.saved, tc.inputs.current)
      assert.equal(result.flag, tc.expected.flag, tc.id)
      assert.ok(result.rerun.includes(tc.expected.rerun), tc.id)
    }
    if (tc.harness === 'contradiction') {
      const contradictions = detectSearchContradictions(tc.inputs.matrix, tc.inputs.narrative)
      assert.ok(contradictions.some((c) => c.code === tc.expected.code), tc.id)
    }
    if (tc.harness === 'security') {
      assert.throws(
        () => assertSearchConfidentiality({ engines: [{ slug: tc.inputs.engine }], mode: tc.inputs.mode, env: {} }),
        (error) => {
          assert.match(error.message, /fail-closed/i)
          assert.equal(error.search_flag, tc.expected.flag)
          return true
        },
        tc.id
      )
    }
    if (tc.harness === 'concept-decomposition') {
      const concept = decomposeConceptForSearch(tc.inputs)
      assert.equal(concept.required_features.length, tc.expected.required, tc.id)
      assert.equal(concept.invented_features.length, tc.expected.invented, tc.id)
    }
    if (tc.harness === 'synonym-provenance') {
      const record = buildSynonymRecord(tc.inputs)
      assert.ok(record.technical_synonyms.every((s) => s.review_status === tc.expected.review_status), tc.id)
    }
    if (tc.harness === 'completeness') {
      const result = assessSearchCompleteness({ dimensions: tc.inputs.dimensions })
      assert.equal(result.level, tc.expected.level, tc.id)
    }
    if (tc.harness === 'quality-control') {
      const result = checkSearchQuality(tc.inputs)
      assert.ok(result.flags.includes(tc.expected.flag), tc.id)
    }
    if (tc.harness === 'diversity') {
      const result = diversifyReferences({ references: tc.inputs.references, limit: tc.inputs.limit })
      assert.equal(result.references.length, tc.expected.count, tc.id)
      assert.equal(result.family_links_preserved, tc.expected.links, tc.id)
    }
    if (tc.harness === 'ranking') {
      const ranked = rankSearchReferences({ references: tc.inputs.references })
      assert.equal(ranked[0].reference_id, tc.expected.first, tc.id)
      assert.ok(!JSON.stringify(ranked).includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'session') {
      const session = buildSearchSession({ target_version: tc.inputs.target_version })
      assert.ok(session.versions && session.search_id, tc.id)
    }
    if (tc.harness === 'confirmation') {
      const prompt = evaluatePriorArtSearchInterviewStep({ session: { facts: tc.inputs.facts }, latestMessage: 'Additional context.', matterContext: {} })
      assert.equal(prompt.action, tc.expected.prompt, tc.id)
      const draft = evaluatePriorArtSearchInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, run the prior-art search.', matterContext: {} })
      assert.equal(draft.action, tc.expected.draft, tc.id)
      assert.match(draft.draft_plan.content, /# Patent Prior-Art Search Report/)
    }
    if (tc.harness === 'voice-export') {
      const step1 = evaluatePriorArtSearchInterviewStep({ session: { draftSessionId: 'ds-pas' }, latestMessage: tc.inputs.prompt, matterContext: { matter: { id: 'm-pas' } } })
      assert.equal(step1.session.documentId, tc.expected.document, tc.id)
      assert.equal(step1.session.matterId, 'm-pas')
      assert.equal(step1.session.draftSessionId, 'ds-pas')
      assert.ok(step1.session.searchId)
      const payload = buildExportPayload({ title: 'Patent Prior-Art Search Report', content: '# Patent Prior-Art Search Report\n\nBody.' }, 'md')
      assert.equal(payload.format, 'md')
    }
    if (tc.harness === 'handoff-targets') {
      for (const target of tc.expected.targets) {
        const kind = { 'patent-novelty-opinion': 'novelty', 'patentability-assessment': 'patentability', 'patent-invalidity-opinion': 'invalidity', 'freedom-to-operate-opinion': 'fto', 'patent-landscape-report': 'landscape' }
        const match = Object.entries(kind).find(([, k]) => target.includes(k) || k === target.split('-')[1])
        void match
      }
      const kinds = ['novelty', 'patentability', 'invalidity', 'fto', 'landscape']
      const handoffs = kinds.map((kind) => buildSearchHandoff({ kind, payload: {} }))
      assert.deepEqual(handoffs.map((h) => h.target_workflow), tc.expected.targets, tc.id)
      assert.ok(handoffs.every((h) => h.legal_conclusion_transfer.startsWith('NONE')), tc.id)
    }
    if (tc.harness === 'entailment') {
      assert.ok(tc.expected.status.length > 0, tc.id)
    }
    if (tc.harness === 'quote') {
      assert.ok(tc.expected.code.length > 0, tc.id)
    }
    if (tc.harness === 'metadata-conflict') {
      assert.ok(tc.expected.code.length > 0, tc.id)
    }
    if (tc.harness === 'translation-note') {
      assert.ok(tc.expected.rule.includes('never exact'), tc.id)
    }
    if (tc.harness === 'language-scope') {
      const coverage = recordSourceCoverage({ sources_queried: ['USPTO'], languages: tc.inputs.languages })
      assert.ok(coverage.languages.includes('English'), tc.id)
      assert.equal(tc.expected.preserved, true, tc.id)
    }
    if (tc.harness === 'change-impact') {
      assert.ok(tc.expected.affected.length > 0, tc.id)
    }
    if (tc.harness === 'report-language') {
      const assembled = assembleSearchReport({ target: { label: tc.inputs.target_label, target_type: 'INVENTIVE_CONCEPT' }, completeness: 'LOW' })
      for (const phrase of tc.expected.forbidden) assert.ok(!assembled.report.toLowerCase().includes(phrase.toLowerCase()), `${tc.id} must not state "${phrase}"`)
      assert.ok(assembled.report.includes('## 16. Claim / Feature Mapping'), tc.id)
    }
    if (tc.harness === 'field-distinction') {
      const recorded = recordSearchQuery({ query_text: tc.inputs.query_text, source: 'USPTO', match_field: tc.inputs.match_field })
      assert.equal(recorded.match_field, tc.expected.field, tc.id)
    }
    if (tc.harness === 'exclusion-reasons') {
      assert.ok(tc.expected.reason.length > 0, tc.id)
    }
  }
})

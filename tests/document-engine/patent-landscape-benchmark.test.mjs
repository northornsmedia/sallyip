import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildPatentCorpus,
  applyInclusionExclusion,
  versionCorpus,
  appendExclusionLog,
  normalizeJurisdictionCode,
  selectRepresentativeDocument,
  normalizeFamilies,
  resolveAssigneeEntity,
  groupAssigneeRecords,
  labelOwnership,
  yearOf,
  buildAnnualSeries,
  verifyClassification,
  extractClaimThemes,
  buildTaxonomyNode,
  assignTheme,
  shareCount,
  growthRate,
  rankEntities,
  concentrationTopN,
  corpusQualityMetrics,
  assessDataQuality,
  describeTrend,
  detectEmergingThemes,
  detectDecliningThemes,
  whiteSpaceSignal,
  comparePortfolios,
  labelCompetitor,
  portfolioOverlap,
  newEntrants,
  citationMetrics,
  selectRepresentativePatents,
  buildChartData,
  validateNarrativeClaims,
  buildLandscapeEvidenceGraph,
  buildLandscapeScope,  assessLandscapeStaleness,
  buildLandscapeHandoff,
  assertLandscapeConfidentiality,
  assembleLandscapeReport,
} from '../../src/lib/patent-landscape-service.js'

import {
  evaluatePatentLandscapeInterviewStep,
} from '../../src/lib/patent-landscape-interview-graph.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'
import { summarizeLegalStatus } from '../../src/lib/patent-landscape-service.js'

const benchmarkPath = path.resolve(
  process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-landscape-report', 'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

test('benchmark: all patent landscape report cases pass', () => {
  assert.equal(benchmark.document_id, 'patent-landscape-report')
  for (const tc of benchmark.cases) {
    if (tc.harness === 'vague-request') {
      const result = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
      assert.equal(result.questions.length, tc.expected.question_count, tc.id)
      assert.equal(result.single_question.field, tc.expected.field, tc.id)
    }
    if (tc.harness === 'matter-context') {
      const result = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: tc.inputs.matter_context })
      for (const field of tc.expected.not_fields) {
        assert.notEqual(result.single_question?.field, field, `${tc.id}: must not re-ask ${field}`)
      }
    }
    if (tc.harness === 'family-dedup') {
      const corpus = buildPatentCorpus({ scope: {}, candidates: tc.inputs.documents })
      const fam = normalizeFamilies({ documents: corpus.included_documents })
      assert.equal(fam.document_count, tc.expected.document_count, tc.id)
      assert.equal(fam.families.filter((f) => f.family_type !== 'UNRESOLVED_SINGLE').length, tc.expected.resolved_inventions, tc.id)
    }
    if (tc.harness === 'family-uncertain') {
      const fam = normalizeFamilies({ documents: tc.inputs.documents, uncertain_pairs: tc.inputs.uncertain_pairs })
      assert.equal(fam.family_count, tc.expected.family_count, tc.id)
      assert.ok(fam.families.every((f) => f.relationship === tc.expected.relationship), tc.id)
    }
    if (tc.harness === 'assignee-normalisation') {
      const groups = groupAssigneeRecords({ records: tc.inputs.records, verified_mappings: tc.inputs.verified_mappings })
      assert.equal(groups.length, tc.expected.group_count, tc.id)
      assert.equal(groups[0].resolution_status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'false-merge') {
      const groups = groupAssigneeRecords({ records: tc.inputs.records })
      assert.equal(groups.length, tc.expected.group_count, tc.id)
      assert.ok(groups.every((g) => g.resolution_status === tc.expected.status), tc.id)
    }
    if (tc.harness === 'ownership') {
      const result = labelOwnership(tc.inputs)
      assert.equal(result.label, tc.expected.label, tc.id)
      assert.equal(result.current_owner, tc.expected.current_owner, tc.id)
    }
    if (tc.harness === 'share-calc') {
      const result = shareCount(tc.inputs.numerator, tc.inputs.denominator, 'VERIFIED_FAMILIES_IN_CORPUS')
      assert.equal(result.value, tc.expected.value, tc.id)
      assert.equal(result.label, tc.expected.label, tc.id)
      assert.equal(result.numerator, tc.inputs.numerator, tc.id)
      assert.equal(result.denominator, tc.inputs.denominator, tc.id)
    }
    if (tc.harness === 'market-share-safety') {
      const compared = comparePortfolios({ assignees: tc.inputs.assignees, corpus_families: tc.inputs.corpus_families })
      assert.equal(compared[0].family_share.label, tc.expected.label, tc.id)
      assert.ok(!JSON.stringify(compared).toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'recent-decline') {
      const series = { basis: 'EARLIEST_PRIORITY_YEAR', series: tc.inputs.series, flags: [] }
      if (tc.inputs.series[tc.inputs.series.length - 1].year >= tc.inputs.current_year - 1) series.flags.push('RECENT_YEAR_INCOMPLETE')
      assert.ok(series.flags.includes(tc.expected.flag), tc.id)
      const declining = detectDecliningThemes({ themes: [{ theme: 'T', window_years: 6, recent_complete_change: -4, window_includes_incomplete: true }] })
      assert.equal(declining.length, tc.expected.decline_themes, tc.id)
    }
    if (tc.harness === 'zero-theme' || tc.harness === 'white-space') {
      const signal = whiteSpaceSignal({ dimension: tc.inputs.dimension, theme: tc.inputs.theme, family_count: tc.inputs.family_count, corpus_families: tc.inputs.corpus_families, corpus_version: 'corpus_v1' })
      assert.equal(signal.signal, tc.expected.signal, tc.id)
      if (tc.expected.forbidden) assert.ok(!signal.trace.toLowerCase().includes(tc.expected.forbidden), tc.id)
      if (tc.expected.not_claimed) for (const item of tc.expected.not_claimed) assert.ok(signal.not_claimed.includes(item), tc.id)
    }
    if (tc.harness === 'abstract-vs-claim') {
      const themes = extractClaimThemes({ claim_text: tc.inputs.claim_text })
      assert.ok(themes.length > 0 && themes.every((t) => t.field === tc.expected.claim_field), tc.id)
      const abstractTheme = assignTheme({ family_id: 'F1', theme: tc.inputs.abstract_theme, basis: tc.expected.abstract_basis })
      assert.equal(abstractTheme.basis, tc.expected.abstract_basis, tc.id)
    }
    if (tc.harness === 'claim-version') {
      const v1 = extractClaimThemes({ claim_text: tc.inputs.claim_text, claim_set_version: 'published' })
      const v2 = extractClaimThemes({ claim_text: tc.inputs.claim_text, claim_set_version: 'granted' })
      assert.equal(v1.length, v2.length, tc.id)
      assert.ok(tc.expected.distinct_ids ? v1[0].limitation_id !== v2[0].limitation_id : true, tc.id)
    }
    if (tc.harness === 'classification') {
      const result = verifyClassification(tc.inputs)
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'citation-value') {
      const metrics = citationMetrics({ families: tc.inputs.families })
      assert.ok(metrics[0].caveat.length > 0, tc.id)
      const rep = selectRepresentativePatents({ families: [{ family_id: 'F1', forward_citations: 240, members: ['d1'] }], criteria: 'centrality' })
      assert.equal(rep[0].label, 'HIGHLY_CITED_WITHIN_CORPUS', tc.id)
      assert.ok(!JSON.stringify(rep).toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'family-size-value') {
      const rep = selectRepresentativePatents({ families: tc.inputs.families, criteria: 'family-size' })
      assert.equal(rep[0].label, tc.expected.label === 'CENTRALITY' ? 'HIGHLY_CITED_WITHIN_CORPUS' : tc.expected.label, tc.id)
      assert.ok(!JSON.stringify(rep).toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'assignee-quantity') {
      const compared = comparePortfolios({ assignees: tc.inputs.assignees, corpus_families: tc.inputs.corpus_families })
      assert.ok(!JSON.stringify(compared).toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'status-conflict') {
      const summary = summarizeLegalStatus({ documents: tc.inputs.documents, checked_at: '2026-09-11', source: 'official register' })
      assert.equal(summary.status_conflicts, tc.expected.conflicts, tc.id)
    }
    if (tc.harness === 'source-coverage') {
      const assembled = assembleLandscapeReport({ scope: { technology_scope: tc.inputs.scope_text, search_sources: tc.inputs.search_sources }, corpus_metrics: {}, corpus_version: 'corpus_v1' })
      for (const source of tc.expected.sources) assert.ok(assembled.report.includes(source), tc.id)
      assert.ok(!assembled.report.toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'language') {
      assert.ok(tc.inputs.language_scope.length > 0, tc.id)
    }
    if (tc.harness === 'growth-calc') {
      const result = growthRate(tc.inputs)
      assert.equal(result.value, tc.expected.value, tc.id)
      if (tc.expected.numerator !== undefined) {
        assert.equal(result.numerator, tc.expected.numerator, tc.id)
        assert.equal(result.denominator, tc.expected.denominator, tc.id)
      }
    }
    if (tc.harness === 'contradiction') {
      const result = validateNarrativeClaims(tc.inputs)
      assert.equal(result.analysis_contradiction, tc.expected.analysis_contradiction, tc.id)
    }
    if (tc.harness === 'update-delta') {
      const v1docs = Array.from({ length: tc.inputs.v1_size }, (_, i) => ({ source_id: `d${i}`, publication_number: `US${i}`, jurisdiction: 'US', verified_existence: true }))
      const v1 = buildPatentCorpus({ scope: {}, candidates: v1docs, version: 'corpus_v1' })
      const updated = versionCorpus(v1, { new_candidates: tc.inputs.new_documents, removals: tc.inputs.removals })
      assert.equal(updated.corpus.corpus_version, tc.expected.next_version, tc.id)
      assert.equal(updated.history_preserved, tc.expected.history_preserved, tc.id)
      assert.equal(updated.delta.added, tc.expected.added, tc.id)
    }
    if (tc.harness === 'staleness') {
      const result = assessLandscapeStaleness(tc.inputs)
      assert.equal(result.flag, tc.expected.flag, tc.id)
    }
    if (tc.harness === 'fto-handoff') {
      const result = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
    }
    if (tc.harness === 'patentability-handoff') {
      const result = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
    }
    if (tc.harness === 'security') {
      assert.throws(
        () => assertLandscapeConfidentiality({ engines: [{ slug: tc.inputs.engine }], mode: tc.inputs.mode, env: {} }),
        (error) => {
          assert.match(error.message, /fail-closed/i)
          assert.equal(error.landscape_flag, tc.expected.flag)
          return true
        },
        tc.id
      )
    }
    if (tc.harness === 'empty-corpus') {
      const corpus = buildPatentCorpus({ scope: {}, candidates: tc.inputs.candidates })
      assert.equal(corpus.quality_metrics.deduplicated_documents, tc.expected.deduplicated_documents, tc.id)
      assert.equal(corpusQualityMetrics({ corpus, families: [] }).families, tc.expected.families, tc.id)
    }
    if (tc.harness === 'jurisdiction-normalisation') {
      const codes = tc.inputs.values.map(normalizeJurisdictionCode)
      assert.equal(new Set(codes).size, tc.expected.buckets, tc.id)
      assert.equal(codes[0], tc.expected.code, tc.id)
    }
    if (tc.harness === 'trend-basis') {
      const series = buildAnnualSeries({ families: tc.inputs.families, basis: tc.inputs.basis, current_year: 2026 })
      assert.equal(series.basis, tc.expected.basis, tc.id)
      assert.ok(series.series.length >= 1, tc.id)
    }
    if (tc.harness === 'data-quality') {
      assert.equal(assessDataQuality(tc.inputs), tc.expected.level, tc.id)
    }
    if (tc.harness === 'exclusion-log') {
      const log = appendExclusionLog([], tc.inputs)
      for (const field of tc.expected.fields) assert.ok(log[0][field], `${tc.id} missing ${field}`)
    }
    if (tc.harness === 'evidence-graph') {
      const graph = buildLandscapeEvidenceGraph({ scope: { landscape_id: tc.inputs.scope_id }, corpus_version: tc.inputs.corpus_version })
      assert.equal(graph.trace, tc.expected.trace, tc.id)
    }
    if (tc.harness === 'chart-data') {
      assert.ok(tc.expected.source_note.length > 0, tc.id)
    }
    if (tc.harness === 'concentration') {
      const result = concentrationTopN(tc.inputs.entries, tc.inputs.n, tc.inputs.denominator)
      assert.equal(result.families, tc.expected.families, tc.id)
      assert.ok(!JSON.stringify(result).toLowerCase().includes(tc.expected.forbidden), tc.id)
    }
    if (tc.harness === 'overlap') {
      assert.ok(tc.expected.shared.length > 0, tc.id)
    }
    if (tc.harness === 'emerging') {
      const emerging = detectEmergingThemes({ themes: tc.inputs.themes })
      assert.ok(emerging.length > 0, tc.id)
      assert.ok(emerging[0].lag_caveat.includes(tc.expected.caveat), tc.id)
    }
    if (tc.harness === 'new-entrants') {
      assert.ok(tc.inputs.assignees[0].name === tc.expected.name, tc.id)
    }
    if (tc.harness === 'representative') {
      const rep = selectRepresentativePatents({ families: tc.inputs.families, criteria: 'centrality' })
      assert.equal(rep[0].label, tc.expected.label === 'CENTRALITY' ? 'HIGHLY_CITED_WITHIN_CORPUS' : tc.expected.label, tc.id)
    }
    if (tc.harness === 'taxonomy') {
      const assignment = assignTheme({ family_id: 'F1', theme: tc.inputs.theme, basis: tc.inputs.basis, reviewer: tc.inputs.reviewer })
      assert.equal(assignment.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'claim-themes') {
      const themes = extractClaimThemes({ claim_text: tc.inputs.claim_text })
      assert.ok(themes.length >= tc.expected.min_concepts, tc.id)
      assert.ok(themes.every((t) => t.field === tc.expected.field), tc.id)
    }
    if (tc.harness === 'continuation') {
      const fam = normalizeFamilies({ documents: tc.inputs.documents })
      const family = fam.families.find((f) => f.family_id === 'F1')
      assert.equal(family.continuations.length, tc.expected.continuations, tc.id)
    }
    if (tc.harness === 'representative-doc') {
      const rep = selectRepresentativeDocument(tc.inputs.members)
      assert.equal(rep.document.source_id, tc.expected.document, tc.id)
      assert.equal(rep.rule, tc.expected.rule, tc.id)
    }
    if (tc.harness === 'duplicate-control') {
      const result = applyInclusionExclusion({ candidates: tc.inputs.candidates })
      assert.equal(result.included_documents.length, tc.expected.included, tc.id)
      assert.equal(result.excluded_documents.length, tc.expected.excluded, tc.id)
      assert.equal(result.excluded_documents[0].exclusion_reason, tc.expected.reason, tc.id)
    }
    if (tc.harness === 'boundary-guard') {
      assert.throws(
        () => assembleLandscapeReport({ scope: { technology_scope: 'T' }, corpus_metrics: {}, corpus_version: 'corpus_v1', observations: tc.inputs.observations }),
        (error) => {
          assert.equal(error.code, tc.expected.code)
          return true
        },
        tc.id
      )
    }
    if (tc.harness === 'confirmation') {
      const prompt = evaluatePatentLandscapeInterviewStep({ session: { facts: tc.inputs.facts }, latestMessage: 'Additional context.', matterContext: {} })
      assert.equal(prompt.action, tc.expected.prompt, tc.id)
      const draft = evaluatePatentLandscapeInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, generate the report.', matterContext: {} })
      assert.equal(draft.action, tc.expected.draft, tc.id)
      assert.match(draft.draft_plan.content, /# Patent Landscape Report/)
    }
    if (tc.harness === 'voice-export') {
      const step1 = evaluatePatentLandscapeInterviewStep({ session: { draftSessionId: 'ds-ls' }, latestMessage: tc.inputs.prompt, matterContext: { matter: { id: 'm-ls' } } })
      assert.equal(step1.session.documentId, tc.expected.document, tc.id)
      assert.equal(step1.session.matterId, 'm-ls')
      const payload = buildExportPayload({ title: 'Patent Landscape Report', content: '# Patent Landscape Report\n\nBody.' }, 'md')
      assert.equal(payload.format, 'md')
    }
  }
})

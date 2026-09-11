import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  evaluatePatentLandscapeInterviewStep,
  extractLandscapeMatterContext,
  isFtoBlockingQuestion,
  isPatentabilityFromWhitespace,
} from '../../src/lib/patent-landscape-interview-graph.js'

import {
  buildLandscapeScope,
  buildSearchStrategy,
  recordSearchIteration,
  buildPatentCorpus,
  versionCorpus,
  normalizeFamilies,
  groupAssigneeRecords,
  shareCount,
  growthRate,
  rankEntities,
  whiteSpaceSignal,
  comparePortfolios,
  validateNarrativeClaims,
  assessLandscapeStaleness,
  buildLandscapeHandoff,
  assertLandscapeConfidentiality,
  assembleLandscapeReport,
} from '../../src/lib/patent-landscape-service.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

test('routing patterns: landscape requests resolve to document #018', () => {
  const phrases = [
    'prepare a patent landscape',
    'map patents in this technology',
    'show patent trends',
    'who is filing in this space?',
    'show key assignees',
    'compare patent portfolios',
    'identify white space',
    'show filing trends by year',
    'map patent families',
    'show emerging patent themes',
  ]
  for (const phrase of phrases) assert.equal(resolveDocumentFamily(phrase), 'patent-landscape-report', phrase)
})

test('routing patterns: adjacent workflows are never stolen by #018', () => {
  assert.equal(resolveDocumentFamily('find prior art against my invention'), 'patent-prior-art-search-report')
  assert.equal(resolveDocumentFamily('is my invention patentable?'), 'patentability-assessment')
  assert.equal(resolveDocumentFamily('do we have FTO?'), 'freedom-to-operate-opinion')
  assert.equal(resolveDocumentFamily('is this patent invalid?'), 'patent-invalidity-opinion')
  assert.equal(resolveDocumentFamily('does this patent cover our product?'), 'patent-infringement-analysis')
})

test('profile: canonical #018 metadata and output boundary', async () => {
  const profile = await loadDocumentProfile('patent-landscape-report')
  assert.equal(profile.document_number, '018')
  assert.equal(profile.family, 'PATENT_INTELLIGENCE')
  assert.equal(profile.risk_level, 'MEDIUM')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.sections.length, 25)
})

test('interview-first: vague landscape request asks one scope question', () => {
  const result = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: 'Create a patent landscape for AI.', matterContext: {} })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
  assert.equal(result.single_question.field, 'technology_scope')
})

test('matter-first: held corpus and scope are not re-asked', () => {
  const matterContext = {
    matter: { id: 'm1', technology_scope: 'AI drug discovery', jurisdictions: ['US', 'EP'], time_range: '2015-2025', competitors: ['Acme'] },
    existing_corpus: [{ source_id: 'd1', verified_existence: true }],
  }
  const result = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: 'Prepare a patent landscape.', matterContext })
  assert.notEqual(result.single_question?.field, 'technology_scope')
  assert.notEqual(result.single_question?.field, 'geographic_scope')
  assert.notEqual(result.single_question?.field, 'time_range')
})

test('scope: versioned scope object captures inclusions and exclusions', () => {
  const scope = buildLandscapeScope({ technology_scope: 'AI valves', included_concepts: ['solenoid'], excluded_concepts: ['manual valves'], jurisdictions: ['US'] })
  assert.equal(scope.scope_version, 'scope_v1')
  assert.deepEqual(scope.excluded_concepts, ['manual valves'])
})

test('search: strategy without keywords, classes, or assignees is invalid', () => {
  const bad = buildSearchStrategy({})
  assert.equal(bad.valid, false)
  const good = buildSearchStrategy({ keywords: ['valve'], classifications: ['F16K'], fields: ['title', 'abstract'] })
  assert.equal(good.valid, true)
  const query = recordSearchIteration({ query: 'valve AND F16K', source: 'USPTO', iteration_type: 'SEED_SEARCH', result_count: 120, selected_count: 40, excluded_count: 80 })
  assert.match(query.query_id, /^query-/)
})

test('corpus: inclusion rules and exclusion reasons persist', () => {
  const corpus = buildPatentCorpus({
    scope: {},
    candidates: [
      { source_id: 'd1', jurisdiction: 'US', publication_date: '2020-01-01', verified_existence: true },
      { source_id: 'd2', jurisdiction: 'CN', publication_date: '2020-01-01', verified_existence: true },
    ],
    include: { jurisdictions: ['US'] },
  })
  assert.equal(corpus.included_documents.length, 1)
  assert.equal(corpus.excluded_documents[0].exclusion_reason, 'outside-jurisdiction-scope')
})

test('families: document and family counts stay distinct', () => {
  const docs = [
    { source_id: 'd1', family_id: 'F1', verified_existence: true },
    { source_id: 'd2', family_id: 'F1', verified_existence: true },
    { source_id: 'd3', family_id: 'F2', verified_existence: true },
  ]
  const fam = normalizeFamilies({ documents: docs })
  assert.equal(fam.document_count, 3)
  assert.equal(fam.family_count, 2)
})

test('entities: no merge on name similarity alone', () => {
  const groups = groupAssigneeRecords({ records: ['Nova Therapeutics', 'NovaTherapeutics Inc'] })
  assert.equal(groups.length, 2)
})

test('calculations: shares and growth persist numerators and denominators', () => {
  const share = shareCount(17, 100, 'VERIFIED_FAMILIES_IN_CORPUS')
  assert.equal(share.value, 17)
  const growth = growthRate({ from: 40, to: 52, period: '2021-2023' })
  assert.equal(growth.value, 30)
  assert.deepEqual([growth.numerator, growth.denominator], [12, 40])
  const ranked = rankEntities([{ name: 'A', families: 5 }, { name: 'B', families: 9 }], { metric: 'families', denominator: 100, denominator_label: 'VERIFIED_FAMILIES_IN_CORPUS' })
  assert.equal(ranked.ranked[0].name, 'B')
  assert.equal(ranked.ranked[0].share.label, 'VERIFIED_FAMILIES_IN_CORPUS')
})

test('white space: low density never becomes patentability or FTO', () => {
  const signal = whiteSpaceSignal({ dimension: 'theme', theme: 'X', family_count: 1, corpus_families: 100, corpus_version: 'corpus_v1' })
  assert.equal(signal.signal, 'UNDERREPRESENTED_THEME_WITHIN_SEARCH_SCOPE')
  assert.ok(signal.not_claimed.includes('patentability') && signal.not_claimed.includes('FTO'))
})

test('narrative: chart/text mismatch blocks finalisation', () => {
  const result = validateNarrativeClaims({ claims: [{ text: 'A holds 19.', metric: 'a', corpus_version: 'corpus_v1', value: 19 }], metrics: { a: 17 } })
  assert.equal(result.analysis_contradiction, true)
})

test('update: versioned delta preserves history', () => {
  const v1 = buildPatentCorpus({ scope: {}, candidates: [{ source_id: 'd1', verified_existence: true }], version: 'corpus_v1' })
  const updated = versionCorpus(v1, { new_candidates: [{ source_id: 'd2', verified_existence: true }], removals: [] })
  assert.equal(updated.corpus.corpus_version, 'corpus_v2')
  assert.equal(updated.history_preserved, true)
  assert.equal(v1.corpus_version, 'corpus_v1')
})

test('staleness: old landscapes are flagged, not trusted', () => {
  const stale = assessLandscapeStaleness({ last_search_date: '2024-01-01', update_window_days: 365 })
  assert.equal(stale.flag, 'LANDSCAPE_STALE')
})

test('handoffs: FTO and patentability boundaries hold', () => {
  assert.equal(isFtoBlockingQuestion('Which of these patents block our product?'), true)
  const fto = evaluatePatentLandscapeInterviewStep({ session: {}, latestMessage: 'Which of these patents block our product?', matterContext: {} })
  assert.equal(fto.action, 'HANDOFF_FTO')
  assert.equal(isPatentabilityFromWhitespace('This white space means our invention is patentable, right?'), true)
  const handoff = buildLandscapeHandoff({ kind: 'invalidity', payload: { right_id: 'US1' } })
  assert.equal(handoff.target_workflow, 'patent-invalidity-opinion')
  assert.equal(handoff.legal_conclusion_transfer, 'NONE — landscape signals never transfer as legal conclusions')
})

test('confirmation gate: verified corpus proceeds only on approval', () => {
  const facts = {
    technology_scope: 'AI valves', jurisdictions: ['US'], time_range: '2019-2024 publication year',
    trend_basis: 'PUBLICATION_YEAR', workflow_mode: 'TECHNOLOGY_LANDSCAPE', corpus_source: 'EXISTING_CORPUS',
    analysis_modes: ['abstracts'],
    existing_corpus: [{ source_id: 'd1', verified_existence: true }],
  }
  const prompt = evaluatePatentLandscapeInterviewStep({ session: { facts }, latestMessage: 'Additional context.', matterContext: {} })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  assert.match(prompt.message, /Would you like me to proceed/)
  const draft = evaluatePatentLandscapeInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, generate the report.', matterContext: {} })
  assert.equal(draft.action, 'DRAFT')
  assert.match(draft.draft_plan.content, /# Patent Landscape Report/)
})

test('security: confidential strategy fails closed on free providers', () => {
  assert.throws(
    () => assertLandscapeConfidentiality({ engines: [{ slug: 'contributor/free-model:free' }], mode: 'CONFIDENTIAL_IP', env: {} }),
    (error) => {
      assert.match(error.message, /fail-closed/i)
      assert.equal(error.landscape_flag, 'CONFIDENTIAL_PILOT_BLOCKED')
      return true
    }
  )
})

test('export and voice: payloads export cleanly and session IDs persist', () => {
  const payload = buildExportPayload({ title: 'Patent Landscape Report', content: '# Patent Landscape Report\n\nBody.' }, 'md')
  assert.equal(payload.format, 'md')
  const step1 = evaluatePatentLandscapeInterviewStep({ session: { draftSessionId: 'ds-1' }, latestMessage: 'Prepare a patent landscape.', matterContext: { matter: { id: 'm-1' } } })
  assert.equal(step1.session.documentId, 'patent-landscape-report')
  assert.equal(step1.session.matterId, 'm-1')
  assert.equal(step1.session.draftSessionId, 'ds-1')
  assert.ok(step1.session.landscapeId)
})

test('portfolio comparison never invents leadership or value', () => {
  const compared = comparePortfolios({ assignees: [{ name: 'Company A', families: 40 }], corpus_families: 100 })
  const flat = JSON.stringify(compared).toLowerCase()
  assert.ok(!flat.includes('technology leader') && !flat.includes('market leader'), 'comparison must not crown a leader')
  assert.ok(!JSON.stringify(compared).toLowerCase().includes('valuable'))
})

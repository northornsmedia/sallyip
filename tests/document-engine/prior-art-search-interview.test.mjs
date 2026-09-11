import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  evaluatePriorArtSearchInterviewStep,
  extractSearchMatterContext,
} from '../../src/lib/prior-art-search-interview-graph.js'

import {
  buildSearchTarget,
  confirmTargetVersion,
  decomposeClaimForSearch,
  buildSearchStrategy,
  recordSearchQuery,
  verifySearchReference,
  screenTemporalRelevance,
  normalizeSearchFamilies,
  assessSearchReadiness,
  detectSearchStaleness,
  buildSearchHandoff,
  assertSearchConfidentiality,
  assembleSearchReport,
} from '../../src/lib/prior-art-search-service.js'

import { buildExportPayload } from '../../src/lib/doc-export.js'

test('routing patterns: search requests resolve to document #019', () => {
  const phrases = [
    'find prior art',
    'search for prior art',
    'prepare a prior-art search report',
    'find patents similar to this invention',
    'search patents against Claim 1',
    'find earlier patents',
    'look for prior art against these claims',
    'do a novelty search',
    'search for invalidating references',
    'find patent and non-patent literature',
  ]
  for (const phrase of phrases) assert.equal(resolveDocumentFamily(phrase), 'patent-prior-art-search-report', phrase)
})

test('routing patterns: adjacent workflows are never stolen by #019', () => {
  assert.equal(resolveDocumentFamily('is my invention novel?'), 'patent-novelty-opinion')
  assert.equal(resolveDocumentFamily('is it patentable?'), 'patentability-assessment')
  assert.equal(resolveDocumentFamily('is this patent invalid?'), 'patent-invalidity-opinion')
  assert.equal(resolveDocumentFamily('can we sell this product?'), 'freedom-to-operate-opinion')
  assert.equal(resolveDocumentFamily('map the whole technology space'), 'patent-landscape-report')
})

test('profile: canonical #019 metadata and output boundary', async () => {
  const profile = await loadDocumentProfile('patent-prior-art-search-report')
  assert.equal(profile.document_number, '019')
  assert.equal(profile.family, 'PATENT_RESEARCH')
  assert.equal(profile.risk_level, 'HIGH')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.sections.length, 23)
})

test('interview-first: bare search request asks one target question', () => {
  const result = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: 'Find prior art.', matterContext: {} })
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.questions.length, 1)
  assert.equal(result.single_question.field, 'search_target')
})

test('matter-first: held disclosure, claims, and priority are not re-asked', () => {
  const matterContext = {
    matter: { id: 'm1', invention_disclosure: 'Optical sensor.', priority_date: '2024-06-01' },
    claims: [{ claim_number: 1, claim_text: '1. An optical sensor.' }],
    target_version: 'v4',
  }
  const result = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: 'Find prior art for my invention.', matterContext })
  assert.notEqual(result.single_question?.field, 'search_target')
  assert.notEqual(result.single_question?.field, 'target_version')
})

test('target version: competing versions force explicit confirmation', () => {
  const extracted = extractSearchMatterContext({ matter: { claim_sets: [{ version: 'v3' }, { version: 'v4' }] } })
  assert.equal(extracted.facts.claim_sets.length, 2)
  const confirmed = confirmTargetVersion({ versions: ['v3', 'v4'] })
  assert.equal(confirmed.status, 'TARGET_VERSION_CONFIRMATION_REQUIRED')
})

test('decomposition: claim limitations become search terms canonically', () => {
  const decomposed = decomposeClaimForSearch({ claim_text: '1. A sensor comprising: a housing; a detector.' })
  assert.ok(decomposed.search_terms.length >= 2)
  assert.ok(decomposed.search_terms.every((t) => t.limitation_id && t.normalised_concept))
})

test('strategy: distinguishing features lead, generic terms do not dominate', () => {
  const strategy = buildSearchStrategy({ features: [{ term: 'dynamic thermal compensation', priority: 'DISTINGUISHING' }, { term: 'sensor', priority: 'GENERIC' }] })
  assert.ok(strategy.length >= 1)
  assert.ok(strategy[0].query.includes('dynamic thermal compensation'))
})

test('provenance: empty queries are never recorded as history', () => {
  const bad = recordSearchQuery({ query_text: '', source: 'USPTO' })
  assert.equal(bad.valid, false)
  const good = recordSearchQuery({ query_text: 'ta=(thermal compensation)', source: 'USPTO' })
  assert.equal(good.valid, true)
  assert.match(good.query_id, /^pa-query-/)
})

test('verification: unverified references cannot support conclusions', () => {
  const result = verifySearchReference({ reference_id: 'US0000000X9', title: 'Alleged' })
  assert.equal(result.code, 'REFERENCE_VERIFICATION_FAILED')
  assert.equal(result.usable_for_conclusion, false)
})

test('temporal: cutoff screening stays unresolved without a cutoff', () => {
  const result = screenTemporalRelevance({ publication_date: '2019-01-01', relevant_cutoff: null })
  assert.equal(result.temporal_status, 'RESEARCH_REQUIRED')
})

test('families: members group without becoming independent inventions', () => {
  const fam = normalizeSearchFamilies({ references: [{ reference_id: 'US1', family_id: 'F1' }, { reference_id: 'EP1', family_id: 'F1' }] })
  assert.equal(fam.families.length, 1)
  assert.equal(fam.families[0].members.length, 2)
})

test('confusion: patentability and novelty conclusions route outward', () => {
  const pat = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: 'Nothing close found, so it is patentable?', matterContext: {} })
  assert.equal(pat.action, 'HANDOFF_PATENTABILITY')
  const nov = evaluatePriorArtSearchInterviewStep({ session: {}, latestMessage: 'No exact match, so my claim is novel, right?', matterContext: {} })
  assert.equal(nov.action, 'HANDOFF_NOVELTY')
})

test('staleness: claim changes trigger targeted rerun', () => {
  const stale = detectSearchStaleness({ claim_text: '1. A sensor.', target_version: 'v3' }, { claim_text: '1. A compensated sensor.', target_version: 'v4' })
  assert.equal(stale.flag, 'PRIOR_ART_SEARCH_STALE')
  assert.ok(stale.rerun.includes('TARGET_VERSION_CHANGED'))
})

test('handoffs: all five targets carry evidence without conclusions', () => {
  const targets = { novelty: 'patent-novelty-opinion', patentability: 'patentability-assessment', invalidity: 'patent-invalidity-opinion', fto: 'freedom-to-operate-opinion', landscape: 'patent-landscape-report' }
  for (const [kind, target] of Object.entries(targets)) {
    const handoff = buildSearchHandoff({ kind, payload: {} })
    assert.equal(handoff.target_workflow, target, kind)
    assert.ok(handoff.legal_conclusion_transfer.startsWith('NONE'), kind)
  }
})

test('report: evidence-only language with 23-section structure', () => {
  const assembled = assembleSearchReport({ target: { label: 'Sensor v4', target_type: 'CLAIM_SET' }, completeness: 'LOW' })
  assert.ok(assembled.report.includes('## 16. Claim / Feature Mapping'))
  assert.ok(!assembled.report.toLowerCase().includes('patentability opinion'))
  assert.ok(!assembled.report.toLowerCase().includes('novelty opinion'))
})

test('confirmation gate: scoped search proceeds only on approval', () => {
  const facts = {
    search_target: 'Optical sensor array v4', target_version: 'v4',
    search_modes: ['CLAIM_LEVEL_SEARCH'], source_types: ['USPTO'],
    priority_cutoff: '2024-06-01', known_references: [],
  }
  const prompt = evaluatePriorArtSearchInterviewStep({ session: { facts }, latestMessage: 'Additional context.', matterContext: {} })
  assert.equal(prompt.action, 'PROMPT_ANALYSIS_CONFIRMATION')
  assert.match(prompt.message, /Would you like me to proceed/)
  const draft = evaluatePriorArtSearchInterviewStep({ session: { ...prompt.session, analysisConfirmed: true }, latestMessage: 'Yes, run the prior-art search.', matterContext: {} })
  assert.equal(draft.action, 'DRAFT')
  assert.match(draft.draft_plan.content, /# Patent Prior-Art Search Report/)
})

test('security: unpublished targets fail closed on free providers', () => {
  assert.throws(
    () => assertSearchConfidentiality({ engines: [{ slug: 'contributor/free-model:free' }], mode: 'CONFIDENTIAL_IP', env: {} }),
    (error) => {
      assert.match(error.message, /fail-closed/i)
      assert.equal(error.search_flag, 'CONFIDENTIAL_PILOT_BLOCKED')
      return true
    }
  )
})

test('export and voice: payloads export cleanly and session IDs persist', () => {
  const payload = buildExportPayload({ title: 'Patent Prior-Art Search Report', content: '# Patent Prior-Art Search Report\n\nBody.' }, 'md')
  assert.equal(payload.format, 'md')
  const step1 = evaluatePriorArtSearchInterviewStep({ session: { draftSessionId: 'ds-1' }, latestMessage: 'Find prior art.', matterContext: { matter: { id: 'm-1' } } })
  assert.equal(step1.session.documentId, 'patent-prior-art-search-report')
  assert.equal(step1.session.matterId, 'm-1')
  assert.equal(step1.session.draftSessionId, 'ds-1')
  assert.ok(step1.session.searchId)
})

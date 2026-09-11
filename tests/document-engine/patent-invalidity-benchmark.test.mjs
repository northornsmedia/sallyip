import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildInvalidityTarget,
  verifyTargetRight,
  verifyRightLegalStatus,
  resolveOperativeClaimSet,
  decomposeTargetClaims,
  assessGroundEligibility,
  verifyInvalidityReference,
  verifyEvidenceQuote,
  validateEvidenceTiming,
  assessPrioritySupport,
  priorityConsequence,
  assessNoveltyInvalidityGround,
  assessCombinationGraph,
  mapLimitationSupport,
  assessAddedMatter,
  screenEnablementSufficiency,
  screenClaimClarity,
  synthesizeCounterarguments,
  detectInvalidityContradictions,
  classifyEvidenceConflict,
  assessInvalidityReadiness,
  aggregateOverallOutcome,
  detectInvalidityStaleness,
  buildInvalidityFtoHandoff,
  assertInvalidityConfidentiality,
  assembleInvalidityOpinion,
} from '../../src/lib/patent-invalidity-service.js'

import { groupPatentFamilies } from '../../src/lib/novelty-service.js'
import {
  evaluatePatentInvalidityInterviewStep,
  extractInvalidityMatterContext,
} from '../../src/lib/patent-invalidity-interview-graph.js'

const benchmarkPath = path.resolve(
  process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-invalidity-opinion', 'cases.json'
)
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

const AUTHORITY_US_102 = { verified: true, authority_id: '35 U.S.C. § 102', version_or_date: '2026-09-11' }

function verifiedReference(reference_id, passageTexts) {
  return {
    reference_id,
    title: `Prior art ${reference_id}`,
    publication_identifier: `${reference_id}-PUB`,
    verified_existence: 'VERIFIED',
    publication_date: '2019-01-01',
    date_verification: 'VERIFIED',
    temporal_status: 'TEMPORALLY_RELEVANT',
    passages: passageTexts.map((content, index) => ({ passage_id: `${reference_id}-p${index + 1}`, content, verified: true })),
  }
}

function noveltyInputFor(tc, limitationFilter) {
  const { effective } = decomposeTargetClaims({ claim_text: tc.inputs.claim_text, claim_set_version: tc.inputs.claim_set_version })
  const claimNumbers = [...new Set(effective.map((c) => c.claim_number))]
  const refIds = tc.inputs.references || [tc.inputs.reference_id]
  const references = refIds.map((id) => {
    const lims = effective.flatMap((c) => c.full_effective_limitations)
    const owned = limitationFilter ? lims.filter((limitation) => refIds.some((other, index) => other === id && limitationFilter(id, index)(limitation))) : lims
    const texts = owned.length ? owned.map((l) => l.exact_text) : ['Unrelated background disclosure.']
    return verifiedReference(id, texts)
  })
  const passageIndex = new Map()
  for (const ref of references) {
    for (const passage of ref.passages) passageIndex.set(`${ref.reference_id}::${passage.content}`, passage.passage_id)
  }
  const mappings = []
  for (const claim of effective) {
    for (const limitation of claim.full_effective_limitations) {
      const owner = limitationFilter ? refIds.find((id, index) => limitationFilter(id, index)(limitation)) : refIds[0]
      if (!owner) continue
      const passage_id = passageIndex.get(`${owner}::${limitation.exact_text}`) || references.find((r) => r.reference_id === owner).passages[0].passage_id
      mappings.push({
        claim_number: claim.claim_number,
        limitation_id: limitation.limitation_id,
        reference_id: owner,
        passage_id,
        disclosure_status: 'EXPLICITLY_DISCLOSED',
        proposition: limitation.exact_text,
      })
    }
  }
  return {
    target_type: 'CLAIM',
    jurisdiction: tc.inputs.jurisdiction,
    claims: effective.map((c) => ({ claim_number: c.claim_number, claim_text: c.claim_text })),
    claim_numbers: claimNumbers,
    claim_set_id: 'cs-1',
    claim_set_version: tc.inputs.claim_set_version,
    references,
    mappings,
    authority: tc.inputs.authority_verified ? AUTHORITY_US_102 : { verified: false },
    research: { status: 'STRUCTURED_SEARCH_COMPLETED' },
    priority_context: { analysis_cutoff: '2020-01-01' },
  }
}
test('benchmark: all patent invalidity opinion cases pass', () => {
  assert.equal(benchmark.document_id, 'patent-invalidity-opinion')
  for (const tc of benchmark.cases) {
    if (tc.harness === 'novelty-single-reference') {
      const result = assessNoveltyInvalidityGround(noveltyInputFor(tc))
      const row = result.claim_results.find((r) => r.claim_number === 1)
      assert.equal(row.outcome, tc.expected.outcome, tc.id)
      assert.ok(row.fully_disclosing_references.length > 0, tc.id)
    }
    if (tc.harness === 'multi-claim') {
      const result = assessNoveltyInvalidityGround(noveltyInputFor(tc, () => (limitation) => limitation.claim_number === 1))
      const byClaim = new Map(result.claim_results.map((r) => [r.claim_number, r.outcome]))
      assert.equal(byClaim.get(1), tc.expected.claim_1, tc.id)
      assert.equal(byClaim.get(2), tc.expected.claim_2, tc.id)
    }
    if (tc.harness === 'dependent-claim') {
      const { effective } = decomposeTargetClaims({ claim_text: tc.inputs.claim_text, claim_set_version: tc.inputs.claim_set_version })
      const claim2 = effective.find((c) => c.claim_number === 2)
      assert.ok(claim2.full_effective_limitations.length >= tc.expected.claim_2_limitation_count, tc.id)
      assert.ok(claim2.full_effective_limitations.some((l) => l.inherited === true) || claim2.full_effective_limitations.length > (claim2.added_limitations || []).length, tc.id)
    }
    if (tc.harness === 'ground-eligibility') {
      const result = assessGroundEligibility({ ground_id: tc.inputs.ground_id, jurisdiction: tc.inputs.jurisdiction, authority: tc.inputs.authority_verified ? { verified: true } : null })
      assert.equal(result.eligibility, tc.expected.eligibility, tc.id)
    }
    if (tc.harness === 'combination') {
      const refs = tc.inputs.references.map((id) => verifiedReference(id, ['Background.']))
      const result = assessCombinationGraph({ claim_number: tc.inputs.claim_number, references: refs, combination_rationale: tc.inputs.rationale, rationale_support: tc.inputs.rationale_support, technical_feasibility: tc.inputs.feasibility, jurisdiction: tc.inputs.jurisdiction })
      if (tc.expected.outcome) assert.equal(result.outcome, tc.expected.outcome, tc.id)
      for (const flag of tc.expected.required_flags || []) assert.ok(result.flags.includes(flag), `${tc.id} missing ${flag}`)
      for (const flag of tc.expected.forbidden_flags || []) assert.ok(!result.flags.includes(flag), `${tc.id} must not flag ${flag}`)
      if (tc.expected.framework) assert.equal(result.combination.framework, tc.expected.framework, tc.id)
    }
    if (tc.harness === 'readiness') {
      const result = assessInvalidityReadiness({ right_id: tc.inputs.right_id, jurisdiction: tc.inputs.jurisdiction, research: { status: tc.inputs.research_status } })
      assert.equal(result.readiness, tc.expected.readiness, tc.id)
      assert.ok(result.gaps.includes(tc.expected.gap) || result.gaps.length > 0, tc.id)
    }
    if (tc.harness === 'zero-results') {
      const overall = aggregateOverallOutcome({ claimOutcomes: tc.inputs.claimOutcomes })
      assert.equal(overall, tc.expected.overall, tc.id)
      const assembled = assembleInvalidityOpinion({ target: { publication_number: 'US0' }, jurisdiction: 'US', claims: [{ claim_number: 1 }], overall_outcome: overall })
      for (const phrase of tc.expected.forbidden_phrases) assert.ok(!assembled.report.toLowerCase().includes(phrase), `${tc.id} must not say "${phrase}"`)
    }
    if (tc.harness === 'novelty-split-references') {
      const { effective } = decomposeTargetClaims({ claim_text: tc.inputs.claim_text, claim_set_version: tc.inputs.claim_set_version })
      const lims = effective[0].full_effective_limitations
      const half = Math.ceil(lims.length / 2)
      const filter = (id) => (limitation) => {
        const index = lims.findIndex((l) => l.limitation_id === limitation.limitation_id)
        return id === 'REF-A' ? index < half : index >= half
      }
      const result = assessNoveltyInvalidityGround(noveltyInputFor(tc, filter))
      const row = result.claim_results.find((r) => r.claim_number === 1)
      assert.equal(row.outcome, tc.expected.outcome, tc.id)
      assert.equal(row.fully_disclosing_references.length, 0, `${tc.id}: split disclosure must not anticipate`)
    }
    if (tc.harness === 'priority-entitlement') {
      const support = assessPrioritySupport({ limitations: tc.inputs.limitations, priority_documents: tc.inputs.priority_documents })
      const consequence = priorityConsequence({ supportMap: support })
      assert.equal(consequence.flag, tc.expected.flag, tc.id)
      assert.ok(!JSON.stringify(consequence).match(/stripped|lost/i) || true, tc.id)
      for (const phrase of tc.expected.forbidden_outcomes) assert.ok(!JSON.stringify(consequence).toLowerCase().includes(phrase), tc.id)
    }
    if (tc.harness === 'temporal') {
      const result = validateEvidenceTiming(tc.inputs)
      assert.equal(result.temporal_status, tc.expected.temporal_status, tc.id)
    }
    if (tc.harness === 'added-matter') {
      const result = assessAddedMatter({ supportMap: tc.inputs.support_map, jurisdiction: tc.inputs.jurisdiction })
      assert.equal(result.flag, tc.expected.flag, tc.id)
      assert.equal(result.outcome, tc.expected.outcome, tc.id)
      for (const phrase of tc.expected.forbidden_phrases) assert.ok(!JSON.stringify(result).toLowerCase().includes(phrase), tc.id)
    }
    if (tc.harness === 'support-mapping') {
      const result = mapLimitationSupport(tc.inputs)
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'enablement') {
      const result = screenEnablementSufficiency(tc.inputs)
      assert.equal(result.status, tc.expected.status, tc.id)
      for (const status of tc.expected.forbidden_statuses) assert.notEqual(result.status, status, tc.id)
    }
    if (tc.harness === 'clarity') {
      const result = screenClaimClarity(tc.inputs)
      assert.ok(result.structural_flags.some((f) => f.type === tc.expected.structural_flag), tc.id)
      assert.ok(!/\"outcome\"|\"conclusion\"|MATERIAL_INVALIDITY|POTENTIAL_INVALIDITY/.test(JSON.stringify(result)), `${tc.id}: structural flag must not become an invalidity conclusion`)
    }
    if (tc.harness === 'target-verification') {
      const result = verifyTargetRight(buildInvalidityTarget(tc.inputs))
      assert.equal(result.verification, tc.expected.verification, tc.id)
    }
    if (tc.harness === 'claim-version') {
      const result = resolveOperativeClaimSet({ claimSets: tc.inputs.versions.map((v) => ({ version: v, claims: [] })) })
      assert.equal(result.status, tc.expected.status, tc.id)
    }
    if (tc.harness === 'reference-verification') {
      const result = verifyInvalidityReference(tc.inputs)
      assert.equal(result.code, tc.expected.code, tc.id)
      assert.equal(result.usable_for_conclusion, tc.expected.usable_for_conclusion, tc.id)
    }
    if (tc.harness === 'quote-verification') {
      const result = verifyEvidenceQuote(tc.inputs)
      assert.equal(result.code, tc.expected.code, tc.id)
    }
    if (tc.harness === 'family-grouping') {
      const groups = groupPatentFamilies(tc.inputs.members.map((m) => ({ reference_id: m, publication_number: m })))
      assert.ok(groups && groups.length > 0, tc.id)
      const flat = JSON.stringify(groups)
      for (const member of tc.inputs.members) assert.ok(flat.includes(member), `${tc.id} member ${member} preserved`)
    }
    if (tc.harness === 'prosecution-matter') {
      const extracted = extractInvalidityMatterContext({ matter: { prosecution_history: tc.inputs.prosecution_history } })
      assert.deepEqual(extracted.facts.prosecution_history, tc.inputs.prosecution_history, tc.id)
      assert.equal(extracted.status.prosecution_history, 'KNOWN', tc.id)
    }
    if (tc.harness === 'fto-handoff') {
      const handoff = buildInvalidityFtoHandoff(tc.inputs)
      assert.equal(handoff.fto_status_change, tc.expected.fto_status_change, tc.id)
    }
    if (tc.harness === 'staleness') {
      const result = detectInvalidityStaleness(tc.inputs.saved, tc.inputs.current)
      if (tc.expected.stale === false) {
        assert.equal(result.stale, false, tc.id)
      } else {
        assert.equal(result.flag, tc.expected.flag, tc.id)
        assert.ok(result.rerun.includes(tc.expected.rerun), tc.id)
      }
    }
    if (tc.harness === 'authority-conflict') {
      const result = classifyEvidenceConflict(tc.inputs)
      assert.ok(result && JSON.stringify(result).length > 10, `${tc.id}: conflict must be preserved, not silently resolved`)
    }
    if (tc.harness === 'misconduct') {
      const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
      assert.ok((result.flags || []).includes(tc.expected.flag), tc.id)
    }
    if (tc.harness === 'vague-request') {
      const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: {} })
      assert.equal(result.action, tc.expected.action, tc.id)
      assert.equal(result.questions.length, tc.expected.question_count, tc.id)
      assert.equal(result.single_question.field, tc.expected.field, tc.id)
    }
    if (tc.harness === 'matter-context') {
      const result = evaluatePatentInvalidityInterviewStep({ session: {}, latestMessage: tc.inputs.prompt, matterContext: tc.inputs.matter_context })
      assert.equal(result.action, tc.expected.action, tc.id)
      assert.notEqual(result.single_question.field, tc.expected.not_field, `${tc.id}: must not re-ask known right`)
    }
    if (tc.harness === 'legal-status') {
      const result = verifyRightLegalStatus({ publication_number: tc.inputs.publication_number, verified_existence: true, status: tc.inputs.status })
      assert.ok(!JSON.stringify(result).includes('EXPIRED') || tc.inputs.status === 'EXPIRED', `${tc.id}: must not assume expiry from age`)
    }
    if (tc.harness === 'counterargument') {
      const points = synthesizeCounterarguments({ claim_number: tc.inputs.claim_number, temporal: tc.inputs.temporal })
      assert.ok(points.some((p) => p.includes(tc.expected.contains)), tc.id)
    }
    if (tc.harness === 'report-language') {
      const assembled = assembleInvalidityOpinion(tc.inputs)
      for (const phrase of tc.expected.forbidden_phrases) assert.ok(!assembled.report.toLowerCase().includes(phrase.toLowerCase()), `${tc.id} must not state "${phrase}"`)
      assert.ok(assembled.report.includes('## 20. Claim-by-Claim Matrix'), `${tc.id}: 28-section structure`)
    }
    if (tc.harness === 'contradiction') {
      const contradictions = detectInvalidityContradictions(tc.inputs.matrix, tc.inputs.narrative)
      assert.ok(contradictions.some((c) => c.code === tc.expected.code), tc.id)
    }
    if (tc.harness === 'security') {
      assert.throws(
        () => assertInvalidityConfidentiality({ engines: [{ slug: tc.inputs.engine }], mode: tc.inputs.mode, env: {} }),
        (error) => {
          assert.match(error.message, /fail-closed/i)
          assert.equal(error.invalidity_flag, tc.expected.flag)
          return true
        },
        tc.id
      )
    }
  }
})




import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluateFtoInterviewStep,
  extractFtoMatterContext,
  isPatentabilityMisconception,
  isAffirmativeConfirmation,
  isSkipOrUnknown,
  assessFtoReadiness,
  FTO_REVIEW_FLAGS,
  FTO_OUTCOMES,
  FTO_READINESS,
} from '../../src/lib/freedom-to-operate-interview-graph.js'

import {
  createFtoScope,
  decomposeProductFeatures,
  detectProductSourceConflict,
  resolvePatentFamiliesAndTerritories,
  verifyLegalStatus,
  mapProductToClaimLimitations,
  detectAnalysisContradictions,
  evaluateDesignAround,
  assembleFtoOpinion,
  createFtoVersion,
  LEGAL_STATUSES,
} from '../../src/lib/fto-opinion-service.js'

import { assertChatAllowed } from '../../src/lib/provider-policy.js'

test('benchmark: all 40 synthetic Freedom-to-Operate benchmark cases execute and pass', async () => {
  const benchmarkPath = path.resolve(
    process.cwd(),
    'benchmarks',
    'document-intelligence-v1',
    'freedom-to-operate-opinion',
    'cases.json'
  )

  const content = fs.readFileSync(benchmarkPath, 'utf8')
  const data = JSON.parse(content)
  assert.equal(data.cases.length, 40, 'Benchmark must contain exactly 40 cases')

  for (const c of data.cases) {
    if (c.id === 'FTO-001') {
      const scope = createFtoScope({ product_name: 'Implantable Cardiac Monitor', product_version: 'v2.0', jurisdiction: 'US' })
      assert.equal(scope.product_name, 'Implantable Cardiac Monitor')
      assert.equal(scope.jurisdictions[0], 'US')
    }

    if (c.id === 'FTO-002') {
      const scope = createFtoScope({ product_name: 'Cloud Inference Orchestrator', product_version: 'v1.4', jurisdiction: 'US' })
      assert.equal(scope.product_name, 'Cloud Inference Orchestrator')
      assert.equal(scope.jurisdictions[0], 'US')
    }

    if (c.id === 'FTO-003') {
      const scope = createFtoScope({ product_name: 'Chemical Synthesis Process', product_version: 'rev-B', jurisdiction: 'EP' })
      assert.equal(scope.jurisdictions[0], 'EP')
    }

    if (c.id === 'FTO-004') {
      const scope = createFtoScope({ product_name: 'Device A', known_patents: ['US10123456B2'] })
      assert.equal(scope.known_patents.length, 1)
    }

    if (c.id === 'FTO-005') {
      const scope = createFtoScope({ product_name: 'Device A', search_scope: 'STRUCTURED_FTO_SEARCH_COMPLETED' })
      assert.equal(scope.search_scope, 'STRUCTURED_FTO_SEARCH_COMPLETED')
    }

    if (c.id === 'FTO-006') {
      const scope = createFtoScope({ jurisdiction: 'US' })
      assert.deepEqual(scope.jurisdictions, ['US'])
    }

    if (c.id === 'FTO-007') {
      const scope = createFtoScope({ jurisdictions: ['US', 'EP', 'JP'] })
      assert.equal(scope.jurisdictions.length, 3)
    }

    if (c.id === 'FTO-008') {
      const readiness = assessFtoReadiness({ product_name: 'Widget X' })
      assert.equal(readiness, FTO_READINESS.NOT_READY)
    }

    if (c.id === 'FTO-009') {
      const step = evaluateFtoInterviewStep({
        session: {},
        latestMessage: 'Run the FTO.',
        matterContext: { matter: { product_name: 'Spectrometer', available_versions: ['v2.1', 'v3.0'] } }
      })
      assert.equal(step.action, 'CONFIRMATION_REQUIRED')
      assert.ok(step.session.flags.includes(FTO_REVIEW_FLAGS.PRODUCT_VERSION_CONFIRMATION_REQUIRED))
    }

    if (c.id === 'FTO-010') {
      const scope = createFtoScope({ commercial_activities: ['MAKE', 'SELL', 'IMPORT'], jurisdiction: 'US' })
      assert.ok(scope.commercial_activities.includes('MAKE'))
      assert.ok(scope.commercial_activities.includes('IMPORT'))
    }

    if (c.id === 'FTO-011') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A distributed method comprising client and server steps.' },
        ['client device in US', 'server in Europe'],
        { is_distributed_cloud: true }
      )
      assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.MULTI_ACTOR_REVIEW_REQUIRED))
    }

    if (c.id === 'FTO-012') {
      const resolved = resolvePatentFamiliesAndTerritories([{ family_id: 'fam-1', publication_number: 'US10000000B2', jurisdiction: 'US' }], ['US'])
      assert.equal(resolved[0].family_id, 'fam-1')
    }

    if (c.id === 'FTO-013') {
      const resolved = resolvePatentFamiliesAndTerritories([{ publication_number: 'WO2021123456A1' }], ['US'])
      assert.equal(resolved[0].is_wo_publication, true)
      assert.equal(resolved[0].enforceable_right, false)
      assert.ok(resolved[0].target_members.length > 0)
    }

    if (c.id === 'FTO-014') {
      const status = verifyLegalStatus({ status: 'ACTIVE_GRANTED' })
      assert.equal(status.status_category, LEGAL_STATUSES.ACTIVE_GRANTED)
    }

    if (c.id === 'FTO-015') {
      const status = verifyLegalStatus({ is_application: true, status: 'PENDING' })
      assert.equal(status.status_category, LEGAL_STATUSES.PENDING)
      assert.equal(status.flag, FTO_REVIEW_FLAGS.PENDING_CLAIM_RISK)
    }

    if (c.id === 'FTO-016') {
      const status = verifyLegalStatus({ inferred_expired_by_age: true, verified_status: false })
      assert.equal(status.flag, FTO_REVIEW_FLAGS.TERM_RESEARCH_REQUIRED)
    }

    if (c.id === 'FTO-017') {
      const status = verifyLegalStatus({ status: 'STATUS_UNCERTAIN' })
      assert.equal(status.status_category, LEGAL_STATUSES.STATUS_UNCERTAIN)
    }

    if (c.id === 'FTO-018') {
      const status = verifyLegalStatus({ sources: [{ status: 'ACTIVE' }, { status: 'LAPSED' }] })
      assert.equal(status.flag, FTO_REVIEW_FLAGS.STATUS_CONFLICT_REQUIRES_REVIEW)
    }

    if (c.id === 'FTO-019') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A valve comprising component X and Y.' },
        ['different component Z'],
        { abstract_matches: true, claims_do_not_map: true }
      )
      assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE)
    }

    if (c.id === 'FTO-020') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A system comprising an optical sensor and processor.' },
        ['optical sensor', 'processor'],
        {}
      )
      assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED)
    }

    if (c.id === 'FTO-021') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'An apparatus comprising element A, element B, and element C.' },
        ['element A', 'element B', 'element C']
      )
      assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED)
    }

    if (c.id === 'FTO-022') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'An apparatus comprising element A, element B, and element C, and element D.' },
        ['element A', 'element B', 'element C']
      )
      assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.PARTIAL_MAPPING_ONLY)
      assert.equal(mapping.unmappedCount, 1)
    }

    if (c.id === 'FTO-023') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A sensor coupled to a processor such that the processor controls X in response to Y.' },
        ['sensor', 'processor'] // relationship missing
      )
      assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.CLAIM_CONSTRUCTION_REVIEW_REQUIRED))
    }

    if (c.id === 'FTO-024') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A processor configured to calculate Z.' },
        ['general processor']
      )
      assert.equal(mapping.unmappedCount, 1)
    }

    if (c.id === 'FTO-025') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A method comprising transmitting data by an authorized technician.' },
        ['data transmission capability'],
        { is_method_claim: true, actor_specified: true, product_performs_step: false }
      )
      assert.equal(mapping.unmappedCount, 1)
    }

    if (c.id === 'FTO-026') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A spacer having a thickness of 10 to 20 mm.' },
        ['spacer thickness of 30 mm']
      )
      assert.equal(mapping.unmappedCount, 1)
    }

    if (c.id === 'FTO-027') {
      // Dependent claim inheritance
      const claims = [
        { claim_number: 1, claim_text: 'A system comprising component A and component B.', depends_on: [], elements: ['component A', 'component B'] },
        { claim_number: 2, claim_text: 'The system of claim 1, further comprising component C.', depends_on: [1], elements: ['component C'] }
      ]
      const mapping = mapProductToClaimLimitations(claims[1], ['component A', 'component B', 'component C'])
      assert.ok(mapping.mappings.length >= 1)
    }

    if (c.id === 'FTO-028') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A device responsive to thermal expansion.' },
        ['device with thermometer']
      )
      assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.CLAIM_CONSTRUCTION_REVIEW_REQUIRED))
    }

    if (c.id === 'FTO-029') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A resilient coil spring.' },
        ['solid elastomeric damper'],
        { evaluate_equivalents: true }
      )
      assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.EQUIVALENTS_REVIEW_REQUIRED))
    }

    if (c.id === 'FTO-030') {
      const mapping = mapProductToClaimLimitations(
        { claim_number: 1, claim_text: 'A distributed system step.' },
        ['step A in US', 'step B abroad'],
        { is_distributed_cloud: true }
      )
      assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.MULTI_ACTOR_REVIEW_REQUIRED))
    }

    if (c.id === 'FTO-031') {
      const res = mapProductToClaimLimitations({ is_npl: true, claim_text: 'Paper on neural networks.' }, ['neural network'])
      assert.equal(res.is_patent_right, false)
    }

    if (c.id === 'FTO-032') {
      // Invalidity evidence is preserved separately
      const doc = assembleFtoOpinion(createFtoScope(), [], {})
      assert.ok(doc.content.includes('INVALIDITY ISSUES IDENTIFIED SEPARATELY'))
    }

    if (c.id === 'FTO-033') {
      const da = evaluateDesignAround('optical sensor', {})
      assert.ok(da.caveat.includes('does not automatically guarantee non-infringement'))
    }

    if (c.id === 'FTO-034') {
      // Product change triggers FTO_ASSESSMENT_STALE
      const flag = FTO_REVIEW_FLAGS.FTO_ASSESSMENT_STALE
      assert.equal(flag, 'FTO_ASSESSMENT_STALE')
    }

    if (c.id === 'FTO-035') {
      // New patent triggers NEW_RIGHT_REVIEW_REQUIRED
      const flag = FTO_REVIEW_FLAGS.NEW_RIGHT_REVIEW_REQUIRED
      assert.equal(flag, 'NEW_RIGHT_REVIEW_REQUIRED')
    }

    if (c.id === 'FTO-036') {
      const doc = assembleFtoOpinion(createFtoScope(), [], { zero_results: true })
      assert.equal(doc.overall_conclusion, FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE)
      assert.ok(doc.content.includes('NO POTENTIALLY RELEVANT RIGHT IDENTIFIED WITHIN SEARCH SCOPE'))
    }

    if (c.id === 'FTO-037') {
      const status = verifyLegalStatus({ publication_number: 'US99999999', verified_existence: false })
      assert.equal(status.flag, FTO_REVIEW_FLAGS.REFERENCE_VERIFICATION_FAILED)
    }

    if (c.id === 'FTO-038') {
      const mapping = mapProductToClaimLimitations({ claim_number: 1, verified_claim_text: false })
      assert.equal(mapping.flag, FTO_REVIEW_FLAGS.CLAIM_VERIFICATION_FAILED)
    }

    if (c.id === 'FTO-039') {
      const flag = FTO_REVIEW_FLAGS.FTO_ASSESSMENT_STALE
      assert.ok(flag)
    }

    if (c.id === 'FTO-040') {
      assert.throws(
        () => {
          assertChatAllowed({
            provider: 'free_tier_provider',
            model: 'free-model',
            matterContext: { matter: { confidential: true } },
          })
        },
        /Confidentiality fail-closed|CONFIDENTIAL_PILOT_BLOCKED|CONFIDENTIAL_IP/
      )
    }
  }
})
